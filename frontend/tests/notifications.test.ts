import { afterEach, describe, expect, it, vi } from "vitest";
import {
    countUnread,
    sortNotifications,
    filterNotificationsByCategory,
    generateReminders,
    getDesktopPermission,
    requestDesktopPermission,
    showDesktopNotification,
    sendTestNotification,
} from "../src/lib/notifications";

import type {
    NotificationItem,
    NotificationPreferences,
    CalendarEvent,
    LegalSubmission,
} from "../src/lib/types";

const preferences: NotificationPreferences = {
    hearingReminders: true,
    summonsAlerts: true,
    deadlineAlerts: true,
    leadDays: 3,
    desktopPushEnabled: true,
    discreetMode: true,
};

const hearing: CalendarEvent = {
    id: 1,
    caseId: 10,
    date: "2026-10-14",
    title: "Family Court Hearing",
    eventType: "Hearing",
    status: "Scheduled",
    location: "Courtroom 2",
};

const submission: LegalSubmission = {
    id: 5,
    caseId: 10,
    title: "Affidavit submission",
    submissionType: "Affidavit of assets",
    filingDate: "2026-10-10",
    filedBy: "Applicant",
    status: "Filed",
    responseDeadline: "2026-10-15",
};

const notification: NotificationItem = {
    id: 1,
    title: "Test reminder",
    message: "Detailed reminder message",
    discreetMessage: "You have a reminder",
    timestamp: "2026-10-13",
    category: "Hearing",
    read: false,
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("Notification helpers", () => {
    it("counts unread notifications", () => {
        expect(
            countUnread([
                notification,
                { ...notification, id: 2, read: true },
            ]),
        ).toBe(1);
    });

    it("sorts notifications newest first without mutating input", () => {
        const input = [
            { ...notification, id: 1, timestamp: "2026-10-11" },
            { ...notification, id: 2, timestamp: "2026-10-13" },
        ];

        const sorted = sortNotifications(input);

        expect(sorted.map((item) => item.id)).toEqual([2, 1]);
        expect(input.map((item) => item.id)).toEqual([1, 2]);
    });

    it("filters notifications by category", () => {
        const items = [
            notification,
            { ...notification, id: 2, category: "Deadline" as const },
        ];

        expect(filterNotificationsByCategory(items, "Hearing")).toHaveLength(1);
        expect(filterNotificationsByCategory(items, "All")).toHaveLength(2);
    });
});

describe("Reminder generation", () => {
    const asOf = "2026-10-13";

    it("generates a hearing reminder within the configured lead days", () => {
        const reminders = generateReminders(
            [hearing],
            [],
            [],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
        expect(reminders[0].category).toBe("Hearing");
        expect(reminders[0].isGeneratedReminder).toBe(true);
    });

    it("does not generate reminders when the event is outside the lead window", () => {
        const farFuture = {
            ...hearing,
            date: "2026-10-20",
        };

        expect(
            generateReminders(
                [farFuture],
                [],
                [],
                preferences,
                asOf,
                new Set(),
            ),
        ).toHaveLength(0);
    });

    it("does not generate reminders for completed events", () => {
        const completed = {
            ...hearing,
            status: "Completed" as const,
        };

        expect(
            generateReminders(
                [completed],
                [],
                [],
                preferences,
                asOf,
                new Set(),
            ),
        ).toHaveLength(0);
    });

    it("respects hearing reminder preferences", () => {
        expect(
            generateReminders(
                [hearing],
                [],
                [],
                { ...preferences, hearingReminders: false },
                asOf,
                new Set(),
            ),
        ).toHaveLength(0);
    });

    it("does not generate a reminder when its ID already exists", () => {
        expect(
            generateReminders(
                [hearing],
                [],
                [],
                preferences,
                asOf,
                new Set([100001]),
            ),
        ).toHaveLength(0);
    });

    it("generates a submission response deadline reminder", () => {
        const reminders = generateReminders(
            [],
            [submission],
            [],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
        expect(reminders[0].category).toBe("Compliance");
        expect(reminders[0].isGeneratedReminder).toBe(true);
    });

    it("skips submissions already taken on record", () => {
        const recorded = {
            ...submission,
            status: "Taken on record" as const,
        };

        expect(
            generateReminders(
                [],
                [recorded],
                [],
                preferences,
                asOf,
                new Set(),
            ),
        ).toHaveLength(0);
    });
});

describe("Desktop notification helpers", () => {
    it("reports unsupported when the Notification API is unavailable", () => {
        vi.stubGlobal("window", {});

        expect(getDesktopPermission()).toBe("unsupported");
    });

    it("returns false when desktop notifications are unsupported", () => {
        vi.stubGlobal("window", {});

        expect(showDesktopNotification(notification, true)).toBe(false);
        expect(sendTestNotification(true)).toBe(false);
    });

    it("uses discreet content when discreet mode is enabled", () => {
        class MockNotification {
            static permission: NotificationPermission = "granted";
            static lastTitle = "";
            static lastOptions: NotificationOptions | undefined;

            constructor(title: string, options?: NotificationOptions) {
                MockNotification.lastTitle = title;
                MockNotification.lastOptions = options;
            }

            static requestPermission = vi.fn(
                async (): Promise<NotificationPermission> => "granted",
            );
        }

        vi.stubGlobal("Notification", MockNotification);
        vi.stubGlobal("window", { Notification: MockNotification });

        expect(showDesktopNotification(notification, true)).toBe(true);
        expect(MockNotification.lastTitle).toBe("Alimony+");
        expect(MockNotification.lastOptions?.body).toBe("You have a reminder");
    });

    it("returns false when permission is denied", () => {
        class MockNotification {
            static permission: NotificationPermission = "denied";

            constructor() { }
        }

        vi.stubGlobal("Notification", MockNotification);
        vi.stubGlobal("window", { Notification: MockNotification });

        expect(showDesktopNotification(notification, false)).toBe(false);
    });

    it("requests permission through the browser API", async () => {
        class MockNotification {
            static permission: NotificationPermission = "default";

            static requestPermission = vi.fn(
                async (): Promise<NotificationPermission> => "granted",
            );

            constructor() { }
        }

        vi.stubGlobal("Notification", MockNotification);
        vi.stubGlobal("window", { Notification: MockNotification });

        await expect(requestDesktopPermission()).resolves.toBe("granted");
        expect(MockNotification.requestPermission).toHaveBeenCalledOnce();
    });

    it("returns false if the browser notification constructor throws", () => {
        class MockNotification {
            static permission: NotificationPermission = "granted";

            constructor() {
                throw new Error("Notification unavailable");
            }
        }

        vi.stubGlobal("Notification", MockNotification);
        vi.stubGlobal("window", { Notification: MockNotification });

        expect(showDesktopNotification(notification, false)).toBe(false);
    });
});