import type {
  NotificationItem,
  NotificationPreferences,
  CalendarEvent,
  LegalSubmission,
  ActionItem,
} from "./types";

// ==========================================
// NOTIFICATION HELPERS
// ==========================================

/** Count unread notifications */
export function countUnread(notifications: NotificationItem[]): number {
  return notifications.filter((n) => !n.read).length;
}

/** Sort notifications by timestamp descending (newest first) */
export function sortNotifications(
  notifications: NotificationItem[],
): NotificationItem[] {
  return [...notifications].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );
}

/** Filter notifications by category */
export function filterNotificationsByCategory(
  notifications: NotificationItem[],
  category: "All" | NotificationItem["category"],
): NotificationItem[] {
  if (category === "All") return notifications;
  return notifications.filter((n) => n.category === category);
}

// ==========================================
// REMINDER GENERATION FROM WORKSPACE DATA
// ==========================================

/**
 * Generate reminder notifications from calendar events and submissions.
 *
 * Reminders are generated from existing workspace data. This function
 * does not make API calls or start background services.
 */
export function generateReminders(
  calendarEvents: CalendarEvent[],
  submissions: LegalSubmission[],
  actionItems: ActionItem[],
  preferences: NotificationPreferences,
  asOf: string,
  existingNotificationIds: Set<number>,
): NotificationItem[] {
  const reminders: NotificationItem[] = [];
  const leadMs = preferences.leadDays * 24 * 60 * 60 * 1000;
  const today = new Date(asOf + "T00:00:00Z").getTime();

  // Hearing reminders
  if (preferences.hearingReminders) {
    for (const ev of calendarEvents) {
      if (ev.eventType !== "Hearing" || ev.status !== "Scheduled") continue;

      const eventDate = new Date(ev.date + "T00:00:00Z").getTime();
      const diff = eventDate - today;

      if (diff >= 0 && diff <= leadMs) {
        const reminderId = 100000 + ev.id;

        if (existingNotificationIds.has(reminderId)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: reminderId,
          caseId: ev.caseId,
          title: `Hearing in ${daysUntil === 0
            ? "today"
            : `${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
            }`,
          message: `${ev.title} is scheduled for ${formatDateLabel(ev.date)}${ev.location ? ` at ${ev.location}` : ""
            }.`,
          discreetMessage: `Alimony+ Reminder: Calendar item on ${formatDateLabel(ev.date)}.`,
          timestamp: asOf,
          category: "Hearing",
          read: false,
          linkSection: "cases",
          isGeneratedReminder: true,
        });
      }
    }
  }

  // Summons return date reminders
  if (preferences.summonsAlerts) {
    for (const ev of calendarEvents) {
      if (ev.eventType !== "Summons return" || ev.status !== "Scheduled") {
        continue;
      }

      const eventDate = new Date(ev.date + "T00:00:00Z").getTime();
      const diff = eventDate - today;

      if (diff >= 0 && diff <= leadMs) {
        const reminderId = 200000 + ev.id;

        if (existingNotificationIds.has(reminderId)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: reminderId,
          caseId: ev.caseId,
          title: `Summons return ${daysUntil === 0
            ? "today"
            : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
            }`,
          message: `${ev.title} — returnable date is ${formatDateLabel(ev.date)}.`,
          discreetMessage: `Alimony+ Reminder: Court deadline on ${formatDateLabel(ev.date)}.`,
          timestamp: asOf,
          category: "Summons",
          read: false,
          linkSection: "cases",
          isGeneratedReminder: true,
        });
      }
    }
  }

  // Order deadline reminders
  if (preferences.deadlineAlerts) {
    for (const ev of calendarEvents) {
      if (ev.eventType !== "Order deadline" || ev.status !== "Scheduled") {
        continue;
      }

      const eventDate = new Date(ev.date + "T00:00:00Z").getTime();
      const diff = eventDate - today;

      if (diff >= 0 && diff <= leadMs) {
        const reminderId = 300000 + ev.id;

        if (existingNotificationIds.has(reminderId)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: reminderId,
          caseId: ev.caseId,
          title: `Deadline ${daysUntil === 0
            ? "today"
            : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
            }`,
          message: `${ev.title} — deadline is ${formatDateLabel(ev.date)}.`,
          discreetMessage: `Alimony+ Reminder: Filing deadline on ${formatDateLabel(ev.date)}.`,
          timestamp: asOf,
          category: "Deadline",
          read: false,
          linkSection: "documents",
          isGeneratedReminder: true,
        });
      }
    }
  }

  // Submission response deadline reminders
  if (preferences.deadlineAlerts) {
    for (const sub of submissions) {
      if (!sub.responseDeadline || sub.status === "Taken on record") {
        continue;
      }

      const deadlineDate = new Date(
        sub.responseDeadline + "T00:00:00Z",
      ).getTime();

      const diff = deadlineDate - today;

      if (diff >= 0 && diff <= leadMs) {
        const reminderId = 400000 + sub.id;

        if (existingNotificationIds.has(reminderId)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: reminderId,
          caseId: sub.caseId,
          title: `Submission deadline ${daysUntil === 0
            ? "today"
            : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
            }`,
          message: `Response deadline for "${sub.title}" is ${formatDateLabel(sub.responseDeadline)}.`,
          discreetMessage: `Alimony+ Reminder: Legal task deadline on ${formatDateLabel(sub.responseDeadline)}.`,
          timestamp: asOf,
          category: "Compliance",
          read: false,
          linkSection: "cases",
          isGeneratedReminder: true,
        });
      }
    }
  }

  // Action items are supplied by the workspace but do not currently
  // generate notifications. Preserve existing behavior until a separate
  // action-item reminder rule is defined.
  void actionItems;

  return reminders;
}

// ==========================================
// DESKTOP NOTIFICATION HELPERS
// ==========================================

export type DesktopPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

/** Get current desktop notification permission state */
export function getDesktopPermission(): DesktopPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    return Notification.permission as DesktopPermissionState;
  } catch {
    return "unsupported";
  }
}

/** Request notification permission from an explicit user action */
export async function requestDesktopPermission(): Promise<DesktopPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const result = await Notification.requestPermission();
    return result as DesktopPermissionState;
  } catch {
    return "unsupported";
  }
}

/**
 * Show a desktop notification.
 *
 * When discreet mode is enabled, avoid exposing legal case details
 * in the desktop notification.
 *
 * Returns false if notifications are unavailable, permission is not
 * granted, or the browser fails to create the notification.
 */
export function showDesktopNotification(
  notification: NotificationItem,
  discreetMode: boolean,
): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    if (Notification.permission !== "granted") {
      return false;
    }

    const title = discreetMode ? "Alimony+" : notification.title;

    const body = discreetMode
      ? notification.discreetMessage || "You have a new reminder."
      : notification.message;

    new Notification(title, {
      body,
      tag: `alimony-plus-${notification.id}`,
    });

    return true;
  } catch {
    // Browser restrictions or platform errors should not crash the app.
    return false;
  }
}

/**
 * Send a test desktop notification.
 *
 * Returns false if permission is not granted, the API is unsupported,
 * or the browser fails to create the notification.
 */
export function sendTestNotification(discreetMode: boolean): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    if (Notification.permission !== "granted") {
      return false;
    }

    const title = discreetMode ? "Alimony+" : "Test Notification";

    const body = discreetMode
      ? "Alimony+ Reminder: This is a test notification."
      : "Desktop notifications are working. You will receive reminders for upcoming events.";

    new Notification(title, {
      body,
      tag: "alimony-plus-test",
    });

    return true;
  } catch {
    return false;
  }
}

// ==========================================
// INTERNAL HELPERS
// ==========================================

function formatDateLabel(dateStr: string | undefined): string {
  if (!dateStr) return "Unknown date";

  const d = new Date(dateStr + "T12:00:00Z");

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}