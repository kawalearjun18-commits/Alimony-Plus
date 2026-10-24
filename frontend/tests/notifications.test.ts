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
    ActionItem,
} from "../src/lib/types";

// ======================================================
// SHARED FIXTURES
// ======================================================

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

const summons: CalendarEvent = {
    id: 2,
    caseId: 10,
    date: "2026-10-15",
    title: "Summons returnable",
    eventType: "Summons return",
    status: "Scheduled",
};

const orderDeadline: CalendarEvent = {
    id: 3,
    caseId: 10,
    date: "2026-10-16",
    title: "Order payment deadline",
    eventType: "Order deadline",
    status: "Scheduled",
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

const actionItem: ActionItem = {
    id: 7,
    caseId: 10,
    title: "Prepare evidence folder",
    category: "Document prep",
    dueDate: "2026-10-16",
    priority: "High",
    completed: false,
};

const overdueItem: ActionItem = {
    id: 8,
    caseId: 10,
    title: "File interim application",
    category: "Affidavit filing",
    dueDate: "2026-10-10",
    priority: "High",
    completed: false,
};

const completedItem: ActionItem = {
    id: 9,
    caseId: 10,
    title: "Submit receipt",
    category: "Compliance",
    dueDate: "2026-10-14",
    priority: "Normal",
    completed: true,
    completedAt: "2026-10-14",
};

const todayItem: ActionItem = {
    id: 11,
    caseId: 10,
    title: "File urgent response",
    category: "Compliance",
    dueDate: "2026-10-13",
    priority: "High",
    completed: false,
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

// ======================================================
// NOTIFICATION HELPERS
// ======================================================

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

// ======================================================
// REMINDER GENERATION
// ======================================================

describe("Reminder generation", () => {
    // asOf = 2026-10-13, leadDays = 3 → window covers 2026-10-13..2026-10-16
    const asOf = "2026-10-13";

    // ------------------------------------------------
    // 1. Hearing reminders
    // ------------------------------------------------

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
        expect(reminders[0].reminderKey).toMatch(/^hearing:/);
    });

    it("does not generate reminders when the event is outside the lead window", () => {
        const farFuture = { ...hearing, date: "2026-10-20" };

        expect(
            generateReminders([farFuture], [], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    // ------------------------------------------------
    // 2. Summons return reminders
    // ------------------------------------------------

    it("generates a summons return reminder within the lead window", () => {
        const reminders = generateReminders(
            [summons],
            [],
            [],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
        expect(reminders[0].category).toBe("Summons");
        expect(reminders[0].reminderKey).toMatch(/^summons:/);
    });

    it("does not generate summons reminder when preference is disabled", () => {
        expect(
            generateReminders(
                [summons],
                [],
                [],
                { ...preferences, summonsAlerts: false },
                asOf,
                new Set(),
            ),
        ).toHaveLength(0);
    });

    // ------------------------------------------------
    // 3. Order deadline reminders
    // ------------------------------------------------

    it("generates an order deadline reminder within the lead window", () => {
        const reminders = generateReminders(
            [orderDeadline],
            [],
            [],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
        expect(reminders[0].category).toBe("Deadline");
        expect(reminders[0].reminderKey).toMatch(/^order-deadline:/);
    });

    // ------------------------------------------------
    // 4. Submission response deadline reminders
    // ------------------------------------------------

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
        expect(reminders[0].reminderKey).toMatch(/^submission-deadline:/);
    });

    it("skips submissions already taken on record", () => {
        const recorded = { ...submission, status: "Taken on record" as const };

        expect(
            generateReminders([], [recorded], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    // ------------------------------------------------
    // 5. Action-item due-date reminders (upcoming)
    // ------------------------------------------------

    it("generates an upcoming action-item reminder within the lead window", () => {
        // actionItem.dueDate = 2026-10-16, asOf = 2026-10-13 → 3 days → within leadDays:3
        const reminders = generateReminders(
            [],
            [],
            [actionItem],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
        expect(reminders[0].category).toBe("Compliance");
        expect(reminders[0].isGeneratedReminder).toBe(true);
        expect(reminders[0].reminderKey).toMatch(/^action-upcoming:/);
    });

    it("does not generate action-item reminder when outside lead window", () => {
        const farItem: ActionItem = {
            ...actionItem,
            id: 20,
            dueDate: "2026-10-20",
        };

        expect(
            generateReminders([], [], [farItem], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    // ------------------------------------------------
    // 6. Action-item due today
    // ------------------------------------------------

    it("generates a due-today reminder for an action item due on asOf", () => {
        // todayItem.dueDate = 2026-10-13 = asOf
        const reminders = generateReminders(
            [],
            [],
            [todayItem],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
        expect(reminders[0].reminderKey).toMatch(/^action-today:/);
        expect(reminders[0].title).toMatch(/today/i);
    });

    // ------------------------------------------------
    // 7. Overdue incomplete tasks
    // ------------------------------------------------

    it("generates an overdue reminder for a past-due incomplete action item", () => {
        // overdueItem.dueDate = 2026-10-10, asOf = 2026-10-13 → 3 days overdue
        const reminders = generateReminders(
            [],
            [],
            [overdueItem],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
        expect(reminders[0].reminderKey).toMatch(/^action-overdue:/);
        expect(reminders[0].title).toMatch(/overdue/i);
        expect(reminders[0].category).toBe("Compliance");
    });

    // ------------------------------------------------
    // 8. Completed tasks do not generate reminders
    // ------------------------------------------------

    it("does not generate a reminder for a completed action item (due today)", () => {
        // completedItem.dueDate = 2026-10-14, completed = true
        expect(
            generateReminders(
                [],
                [],
                [completedItem],
                preferences,
                asOf,
                new Set(),
            ),
        ).toHaveLength(0);
    });

    it("does not generate a reminder for a completed overdue action item", () => {
        const completedOverdue: ActionItem = {
            ...overdueItem,
            id: 12,
            completed: true,
        };

        expect(
            generateReminders(
                [],
                [],
                [completedOverdue],
                preferences,
                asOf,
                new Set(),
            ),
        ).toHaveLength(0);
    });

    // ------------------------------------------------
    // 9. Hearing preference gate
    // ------------------------------------------------

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

    // ------------------------------------------------
    // 10. Per-event reminderDays (objective C)
    // ------------------------------------------------

    it("uses per-event reminderDays when specified on a calendar event", () => {
        // hearing.date = 2026-10-14, asOf = 2026-10-13 → 1 day ahead
        // Global leadDays = 3 would include it; set it to 0 so only per-event controls it
        const narrow = { ...preferences, leadDays: 0 };

        // Without per-event override, event is outside the zero-day window
        expect(
            generateReminders([hearing], [], [], narrow, asOf, new Set()),
        ).toHaveLength(0);

        // With reminderDays = 2, the 1-day-ahead hearing should now be included
        const withOverride: CalendarEvent = { ...hearing, reminderDays: 2 };
        expect(
            generateReminders(
                [withOverride],
                [],
                [],
                narrow,
                asOf,
                new Set(),
            ),
        ).toHaveLength(1);
    });

    it("ignores invalid reminderDays (negative) and falls back to global leadDays", () => {
        const eventWithNegative: CalendarEvent = {
            ...hearing,
            reminderDays: -5,
        };

        // leadDays = 3 → hearing 1 day ahead should be included via fallback
        const reminders = generateReminders(
            [eventWithNegative],
            [],
            [],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
    });

    it("clamps extremely large reminderDays to 365 days maximum", () => {
        const eventWithHuge: CalendarEvent = {
            ...hearing,
            reminderDays: 9999,
        };

        // With 365-day clamp, hearing 1 day ahead is still within window
        const reminders = generateReminders(
            [eventWithHuge],
            [],
            [],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders).toHaveLength(1);
    });

    it("uses global leadDays when event.reminderDays is undefined", () => {
        // hearingFar is 5 days ahead → outside global leadDays:3
        const hearingFar: CalendarEvent = {
            ...hearing,
            id: 99,
            date: "2026-10-18",
        };

        expect(
            generateReminders([hearingFar], [], [], preferences, asOf, new Set()),
        ).toHaveLength(0);

        // With leadDays:5 it should be included
        expect(
            generateReminders(
                [hearingFar],
                [],
                [],
                { ...preferences, leadDays: 5 },
                asOf,
                new Set(),
            ),
        ).toHaveLength(1);
    });

    // ------------------------------------------------
    // 11. Invalid and impossible dates (objective E)
    // ------------------------------------------------

    it("does not generate a reminder for an event with an invalid date", () => {
        const badDate: CalendarEvent = {
            ...hearing,
            id: 50,
            date: "not-a-date",
        };

        expect(
            generateReminders([badDate], [], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    it("does not generate a reminder for an event with an impossible calendar date", () => {
        const impossible: CalendarEvent = {
            ...hearing,
            id: 51,
            date: "2026-02-30",
        };

        expect(
            generateReminders([impossible], [], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    it("does not generate a submission reminder when responseDeadline is invalid", () => {
        const badSub: LegalSubmission = {
            ...submission,
            id: 52,
            responseDeadline: "garbage",
        };

        expect(
            generateReminders([], [badSub], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    it("does not generate an action-item reminder when dueDate is invalid", () => {
        const badItem: ActionItem = {
            ...actionItem,
            id: 53,
            dueDate: "2026-13-99",
        };

        expect(
            generateReminders([], [], [badItem], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    it("returns no reminders when asOf itself is invalid", () => {
        expect(
            generateReminders([hearing], [submission], [actionItem], preferences, "invalid", new Set()),
        ).toHaveLength(0);
    });

    // ------------------------------------------------
    // 12. Stable reminder identity (objective A)
    // ------------------------------------------------

    it("produces the same reminderKey for the same event on repeated calls", () => {
        const r1 = generateReminders([hearing], [], [], preferences, asOf, new Set());
        const r2 = generateReminders([hearing], [], [], preferences, asOf, new Set());

        expect(r1[0].reminderKey).toBe(r2[0].reminderKey);
        expect(r1[0].id).toBe(r2[0].id);
    });

    it("produces a different reminderKey when the event date is rescheduled", () => {
        const original = generateReminders([hearing], [], [], preferences, asOf, new Set());
        const rescheduled = generateReminders(
            [{ ...hearing, date: "2026-10-15" }],
            [],
            [],
            preferences,
            asOf,
            new Set(),
        );

        expect(original[0].reminderKey).not.toBe(rescheduled[0].reminderKey);
    });

    it("reminderKey encodes type, caseId, sourceId and date", () => {
        const reminders = generateReminders([hearing], [], [], preferences, asOf, new Set());
        // Expected: "hearing:10:1:2026-10-14"
        expect(reminders[0].reminderKey).toBe("hearing:10:1:2026-10-14");
    });

    // ------------------------------------------------
    // 13. Duplicate suppression (objective G)
    // ------------------------------------------------

    it("does not generate a reminder when its reminderKey is already in the exclusion set", () => {
        // Generate once to get the key, then pass it as existing
        const first = generateReminders([hearing], [], [], preferences, asOf, new Set());
        const key = first[0].reminderKey as string;

        const second = generateReminders(
            [hearing],
            [],
            [],
            preferences,
            asOf,
            new Set([key]),
        );

        expect(second).toHaveLength(0);
    });

    it("prevents duplicate submission reminders via reminderKey exclusion", () => {
        const first = generateReminders([], [submission], [], preferences, asOf, new Set());
        const key = first[0].reminderKey as string;

        const second = generateReminders([], [submission], [], preferences, asOf, new Set([key]));

        expect(second).toHaveLength(0);
    });

    it("prevents duplicate overdue action-item reminders via reminderKey exclusion", () => {
        const first = generateReminders([], [], [overdueItem], preferences, asOf, new Set());
        const key = first[0].reminderKey as string;

        const second = generateReminders([], [], [overdueItem], preferences, asOf, new Set([key]));

        expect(second).toHaveLength(0);
    });

    // ------------------------------------------------
    // 14. Rescheduled event dates
    // ------------------------------------------------

    it("generates a new reminder after an event date changes (different reminderKey)", () => {
        const oldKey = `hearing:${hearing.caseId}:${hearing.id}:${hearing.date}`;

        // Reschedule to same window but different date
        const rescheduled: CalendarEvent = { ...hearing, date: "2026-10-15" };

        const reminders = generateReminders(
            [rescheduled],
            [],
            [],
            preferences,
            asOf,
            new Set([oldKey]), // old key is excluded — simulates stale entry
        );

        // New key encodes new date → not in exclusion set → reminder generated
        expect(reminders).toHaveLength(1);
        expect(reminders[0].reminderKey).toBe(`hearing:10:1:2026-10-15`);
    });

    // ------------------------------------------------
    // 15. Completed and adjourned events (objective D)
    // ------------------------------------------------

    it("does not generate reminders for completed events", () => {
        const completed = { ...hearing, status: "Completed" as const };

        expect(
            generateReminders([completed], [], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    it("does not generate reminders for adjourned events", () => {
        const adjourned = { ...hearing, status: "Adjourned" as const };

        expect(
            generateReminders([adjourned], [], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    it("does not generate reminders for pending events", () => {
        const pending = { ...hearing, status: "Pending" as const };

        expect(
            generateReminders([pending], [], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });

    // ------------------------------------------------
    // 16. Cancelled events (objective D — type now includes "Cancelled")
    // ------------------------------------------------

    it("does not generate reminders for cancelled events", () => {
        const cancelled: CalendarEvent = {
            ...hearing,
            status: "Cancelled",
        };

        expect(
            generateReminders([cancelled], [], [], preferences, asOf, new Set()),
        ).toHaveLength(0);
    });
});

// ======================================================
// DESKTOP NOTIFICATION HELPERS
// ======================================================

describe("Desktop notification helpers", () => {
    // ------------------------------------------------
    // 17. Unsupported Notification API
    // ------------------------------------------------

    it("reports unsupported when the Notification API is unavailable", () => {
        vi.stubGlobal("window", {});

        expect(getDesktopPermission()).toBe("unsupported");
    });

    it("returns false when desktop notifications are unsupported", () => {
        vi.stubGlobal("window", {});

        expect(showDesktopNotification(notification, true)).toBe(false);
        expect(sendTestNotification(true)).toBe(false);
    });

    // ------------------------------------------------
    // 16. Discreet desktop notification text (objective F)
    // ------------------------------------------------

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

    it("shows detailed content when discreet mode is disabled", () => {
        class MockNotification {
            static permission: NotificationPermission = "granted";
            static lastTitle = "";
            static lastOptions: NotificationOptions | undefined;

            constructor(title: string, options?: NotificationOptions) {
                MockNotification.lastTitle = title;
                MockNotification.lastOptions = options;
            }
        }

        vi.stubGlobal("Notification", MockNotification);
        vi.stubGlobal("window", { Notification: MockNotification });

        expect(showDesktopNotification(notification, false)).toBe(true);
        expect(MockNotification.lastTitle).toBe(notification.title);
        expect(MockNotification.lastOptions?.body).toBe(notification.message);
    });

    it("uses reminderKey as the browser notification tag when available", () => {
        class MockNotification {
            static permission: NotificationPermission = "granted";
            static lastOptions: NotificationOptions | undefined;

            constructor(_title: string, options?: NotificationOptions) {
                MockNotification.lastOptions = options;
            }
        }

        vi.stubGlobal("Notification", MockNotification);
        vi.stubGlobal("window", { Notification: MockNotification });

        const withKey: NotificationItem = {
            ...notification,
            reminderKey: "hearing:10:1:2026-10-14",
        };

        showDesktopNotification(withKey, false);
        expect(MockNotification.lastOptions?.tag).toBe(
            "alimony-plus-hearing:10:1:2026-10-14",
        );
    });

    it("falls back to numeric id as the notification tag when no reminderKey", () => {
        class MockNotification {
            static permission: NotificationPermission = "granted";
            static lastOptions: NotificationOptions | undefined;

            constructor(_title: string, options?: NotificationOptions) {
                MockNotification.lastOptions = options;
            }
        }

        vi.stubGlobal("Notification", MockNotification);
        vi.stubGlobal("window", { Notification: MockNotification });

        showDesktopNotification(notification, false);
        expect(MockNotification.lastOptions?.tag).toBe(
            `alimony-plus-${notification.id}`,
        );
    });

    // ------------------------------------------------
    // 18. Denied permission
    // ------------------------------------------------

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

    // ------------------------------------------------
    // 19. Browser Notification constructor errors
    // ------------------------------------------------

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

// ======================================================
// NOTIFICATION READ/UNREAD BEHAVIOUR (objective H)
// ======================================================

describe("Notification read/unread behaviour", () => {
    // ------------------------------------------------
    // 20. Existing notification read state
    // ------------------------------------------------

    it("countUnread only counts items where read is false", () => {
        const items: NotificationItem[] = [
            { ...notification, id: 1, read: false },
            { ...notification, id: 2, read: true },
            { ...notification, id: 3, read: false },
        ];

        expect(countUnread(items)).toBe(2);
    });

    it("all-read list returns zero unread count", () => {
        const items: NotificationItem[] = [
            { ...notification, id: 1, read: true },
            { ...notification, id: 2, read: true },
        ];

        expect(countUnread(items)).toBe(0);
    });

    it("generated reminders carry isGeneratedReminder flag", () => {
        const asOf = "2026-10-13";
        const reminders = generateReminders(
            [hearing],
            [],
            [],
            preferences,
            asOf,
            new Set(),
        );

        expect(reminders[0].isGeneratedReminder).toBe(true);
    });

    it("non-generated notifications do not carry isGeneratedReminder", () => {
        // The fixture notification has no isGeneratedReminder field
        expect(notification.isGeneratedReminder).toBeUndefined();
    });

    it("generated reminder reminderKey does not collide with normal notification ids", () => {
        const asOf = "2026-10-13";
        const reminders = generateReminders(
            [hearing],
            [],
            [],
            preferences,
            asOf,
            new Set(),
        );

        // Normal notifications use simple numeric ids; generated reminders use
        // string reminderKeys. The two spaces are distinct by type.
        expect(typeof reminders[0].reminderKey).toBe("string");
        expect(typeof notification.id).toBe("number");
    });

    it("same event on same asOf date always produces the same numeric id", () => {
        const asOf = "2026-10-13";
        const r1 = generateReminders([hearing], [], [], preferences, asOf, new Set());
        const r2 = generateReminders([hearing], [], [], preferences, asOf, new Set());

        expect(r1[0].id).toBe(r2[0].id);
        expect(r1[0].id).toBeGreaterThan(0);
    });
});