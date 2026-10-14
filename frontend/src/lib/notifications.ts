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
// STABLE REMINDER IDENTITY
// ==========================================

/**
 * Compose a stable string key for a generated reminder.
 *
 * Format: `{type}:{caseId}:{sourceId}:{date}`
 *
 * This key uniquely identifies a reminder by its logical combination of
 * category, owning case, source record ID, and the relevant due/event date.
 * If a record is rescheduled the date component changes, causing a new key
 * to be produced — the old key becomes inactive and does not match any live
 * source, so it naturally stops being generated.
 *
 * Types used:
 *   hearing              - CalendarEvent of type "Hearing"
 *   summons              - CalendarEvent of type "Summons return"
 *   order-deadline       - CalendarEvent of type "Order deadline"
 *   submission-deadline  - LegalSubmission responseDeadline
 *   action-upcoming      - ActionItem due within lead window
 *   action-today         - ActionItem due today
 *   action-overdue       - ActionItem past due date, not yet completed
 */
function makeReminderKey(
  type: string,
  caseId: number,
  sourceId: number,
  date: string,
): string {
  return `${type}:${caseId}:${sourceId}:${date}`;
}

/**
 * Convert a reminderKey string into a stable 32-bit integer.
 *
 * The numeric id is used only for compatibility with existing components
 * that accept NotificationItem.id as a number (e.g. the badge counter,
 * read-state tracking in readReminderIds, desktop notification tag).
 * Deduplication is primarily driven by reminderKey; the numeric id is
 * derived deterministically from that key so it never changes across
 * re-renders for the same source record.
 *
 * djb2 variant hash — fast, no dependencies, low collision rate for
 * short descriptive strings.
 */
function keyToNumericId(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  // Ensure non-zero so id===0 is not produced.
  return h === 0 ? 1 : h;
}

// ==========================================
// DATE VALIDATION HELPERS
// ==========================================

/**
 * Parse a YYYY-MM-DD date string to a UTC midnight timestamp.
 * Returns NaN if the string is absent, malformed, or produces an
 * impossible calendar date (e.g. "2026-02-30").
 *
 * We deliberately append T00:00:00Z so that all date arithmetic is done
 * in UTC and is not affected by the runtime's local timezone offset.
 */
function parseDateUTC(dateStr: string | undefined): number {
  if (!dateStr) return NaN;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return NaN;
  const ts = Date.parse(dateStr + "T00:00:00Z");
  if (Number.isNaN(ts)) return NaN;
  // Verify the date round-trips — catches impossible dates like Feb 30.
  const rebuilt = new Date(ts).toISOString().slice(0, 10);
  if (rebuilt !== dateStr) return NaN;
  return ts;
}

// ==========================================
// PER-EVENT REMINDER WINDOW
// ==========================================

/**
 * Resolve the effective reminder window (in milliseconds) for a calendar event.
 *
 * Precedence (highest to lowest):
 *   1. event.reminderDays  — per-event override, if present and valid
 *   2. preferences.leadDays — global fallback
 *
 * Validation rules:
 *   - reminderDays must be a finite, non-negative integer.
 *   - reminderDays > 365 is clamped to 365 to prevent absurd lead times.
 *   - A zero value is valid and means "only remind on the day itself".
 *   - Invalid (NaN, Infinity, negative) values fall through to leadDays.
 *
 * leadDays is assumed to be a valid non-negative integer (set by the
 * application preference form which validates the input).
 */
function resolveLeadMs(
  ev: CalendarEvent,
  preferences: NotificationPreferences,
): number {
  const MAX_REMINDER_DAYS = 365;
  if (
    ev.reminderDays !== undefined &&
    Number.isFinite(ev.reminderDays) &&
    ev.reminderDays >= 0
  ) {
    const clamped = Math.min(Math.floor(ev.reminderDays), MAX_REMINDER_DAYS);
    return clamped * 24 * 60 * 60 * 1000;
  }
  const global = Math.max(0, Math.floor(preferences.leadDays));
  return global * 24 * 60 * 60 * 1000;
}

// ==========================================
// REMINDER GENERATION FROM WORKSPACE DATA
// ==========================================

/**
 * Generate reminder notifications from calendar events, submissions and
 * action items.
 *
 * Reminders are generated from existing workspace data held in React state.
 * This function does NOT make API calls, write to storage, or start
 * background services.
 *
 * Identity contract
 * -----------------
 * Each generated reminder receives a `reminderKey` (stable string composite
 * key) AND a numeric `id` derived from that key via djb2 hash.
 *
 * reminderKey — primary deduplication key across re-renders. Passed as
 *   `existingReminderKeys` by callers to prevent duplicates.
 *
 * id (numeric) — kept for compatibility with existing components
 *   (NotificationBell badge counter, readReminderIds Set in
 *   workspace-provider, desktop notification tag). The hash is deterministic
 *   so the same key always produces the same id across renders.
 *
 * Per-event reminderDays precedence
 * ----------------------------------
 * If a CalendarEvent carries `reminderDays`, it takes precedence over the
 * global `preferences.leadDays` for that event. See resolveLeadMs().
 *
 * Action-item overdue cadence
 * ----------------------------
 * An overdue action item generates exactly one reminder whose key encodes
 * the dueDate. Re-evaluating the same asOf date always produces the same
 * key, so no duplicates are created on re-render. The reminder persists
 * until the item is marked completed. There is no repeat-each-day cadence
 * because that would require persistent backend storage to avoid flooding
 * the user on every page load.
 *
 * @param calendarEvents  - CalendarEvent[] from workspace state
 * @param submissions     - LegalSubmission[] from workspace state
 * @param actionItems     - ActionItem[] from workspace state
 * @param preferences     - current NotificationPreferences
 * @param asOf            - reference date in YYYY-MM-DD format (UTC)
 * @param existingReminderKeys - Set of reminderKey strings already present;
 *   reminders whose key appears in this set are skipped.
 */
export function generateReminders(
  calendarEvents: CalendarEvent[],
  submissions: LegalSubmission[],
  actionItems: ActionItem[],
  preferences: NotificationPreferences,
  asOf: string,
  existingReminderKeys: Set<string>,
): NotificationItem[] {
  const reminders: NotificationItem[] = [];

  const today = parseDateUTC(asOf);
  if (Number.isNaN(today)) {
    // asOf is invalid — cannot produce reliable reminders.
    return reminders;
  }

  const globalLeadMs = Math.max(0, Math.floor(preferences.leadDays)) * 24 * 60 * 60 * 1000;

  // ----------------------------------------
  // Hearing reminders
  // ----------------------------------------
  if (preferences.hearingReminders) {
    for (const ev of calendarEvents) {
      if (ev.eventType !== "Hearing") continue;
      // Lifecycle: only Scheduled events generate upcoming reminders.
      if (ev.status !== "Scheduled") continue;

      const eventDate = parseDateUTC(ev.date);
      if (Number.isNaN(eventDate)) continue;

      const diff = eventDate - today;
      const leadMs = resolveLeadMs(ev, preferences);

      if (diff >= 0 && diff <= leadMs) {
        const key = makeReminderKey("hearing", ev.caseId, ev.id, ev.date);
        if (existingReminderKeys.has(key)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: keyToNumericId(key),
          reminderKey: key,
          caseId: ev.caseId,
          title: `Hearing ${daysUntil === 0
            ? "today"
            : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
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

  // ----------------------------------------
  // Summons return date reminders
  // ----------------------------------------
  if (preferences.summonsAlerts) {
    for (const ev of calendarEvents) {
      if (ev.eventType !== "Summons return") continue;
      if (ev.status !== "Scheduled") continue;

      const eventDate = parseDateUTC(ev.date);
      if (Number.isNaN(eventDate)) continue;

      const diff = eventDate - today;
      const leadMs = resolveLeadMs(ev, preferences);

      if (diff >= 0 && diff <= leadMs) {
        const key = makeReminderKey("summons", ev.caseId, ev.id, ev.date);
        if (existingReminderKeys.has(key)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: keyToNumericId(key),
          reminderKey: key,
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

  // ----------------------------------------
  // Order deadline reminders
  // ----------------------------------------
  if (preferences.deadlineAlerts) {
    for (const ev of calendarEvents) {
      if (ev.eventType !== "Order deadline") continue;
      if (ev.status !== "Scheduled") continue;

      const eventDate = parseDateUTC(ev.date);
      if (Number.isNaN(eventDate)) continue;

      const diff = eventDate - today;
      const leadMs = resolveLeadMs(ev, preferences);

      if (diff >= 0 && diff <= leadMs) {
        const key = makeReminderKey("order-deadline", ev.caseId, ev.id, ev.date);
        if (existingReminderKeys.has(key)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: keyToNumericId(key),
          reminderKey: key,
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

  // ----------------------------------------
  // Submission response deadline reminders
  // ----------------------------------------
  if (preferences.deadlineAlerts) {
    for (const sub of submissions) {
      if (!sub.responseDeadline) continue;
      if (sub.status === "Taken on record") continue;

      const deadlineDate = parseDateUTC(sub.responseDeadline);
      if (Number.isNaN(deadlineDate)) continue;

      const diff = deadlineDate - today;

      if (diff >= 0 && diff <= globalLeadMs) {
        const key = makeReminderKey(
          "submission-deadline",
          sub.caseId,
          sub.id,
          sub.responseDeadline,
        );
        if (existingReminderKeys.has(key)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: keyToNumericId(key),
          reminderKey: key,
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

  // ----------------------------------------
  // Action-item reminders
  //
  // Rules:
  //   1. Skip completed items — never generate a reminder.
  //   2. Upcoming: dueDate is in the future and within the global lead window.
  //   3. Due today: dueDate === asOf exactly.
  //   4. Overdue: dueDate is strictly before asOf.
  //
  // Overdue cadence: one reminder per overdue item, keyed by dueDate.
  // Evaluating the same asOf date always produces the same key, so no
  // duplicates accumulate across re-renders. The reminder disappears once
  // the item is marked completed. No periodic repeat is implemented because
  // doing so without backend storage would generate a new reminder on every
  // page load.
  //
  // The global leadDays is used as the upcoming window. There is no
  // per-action-item reminderDays because ActionItem does not carry that field.
  // ----------------------------------------
  if (preferences.deadlineAlerts) {
    for (const item of actionItems) {
      // Rule 1: skip completed tasks.
      if (item.completed) continue;

      const dueDate = parseDateUTC(item.dueDate);
      if (Number.isNaN(dueDate)) continue;

      const diff = dueDate - today; // positive = future, 0 = today, negative = overdue

      if (diff < 0) {
        // Overdue
        const key = makeReminderKey(
          "action-overdue",
          item.caseId,
          item.id,
          item.dueDate,
        );
        if (existingReminderKeys.has(key)) continue;

        const daysOverdue = Math.round(-diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: keyToNumericId(key),
          reminderKey: key,
          caseId: item.caseId,
          title: `Overdue task — ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} late`,
          message: `"${item.title}" was due ${formatDateLabel(item.dueDate)} and has not been completed.`,
          discreetMessage: `Alimony+ Reminder: An action item is overdue.`,
          timestamp: asOf,
          category: "Compliance",
          read: false,
          linkSection: "cases",
          isGeneratedReminder: true,
        });
      } else if (diff === 0) {
        // Due today
        const key = makeReminderKey(
          "action-today",
          item.caseId,
          item.id,
          item.dueDate,
        );
        if (existingReminderKeys.has(key)) continue;

        reminders.push({
          id: keyToNumericId(key),
          reminderKey: key,
          caseId: item.caseId,
          title: "Task due today",
          message: `"${item.title}" is due today — ${formatDateLabel(item.dueDate)}.`,
          discreetMessage: `Alimony+ Reminder: Action item due today.`,
          timestamp: asOf,
          category: "Compliance",
          read: false,
          linkSection: "cases",
          isGeneratedReminder: true,
        });
      } else if (diff <= globalLeadMs) {
        // Upcoming within lead window
        const key = makeReminderKey(
          "action-upcoming",
          item.caseId,
          item.id,
          item.dueDate,
        );
        if (existingReminderKeys.has(key)) continue;

        const daysUntil = Math.round(diff / (24 * 60 * 60 * 1000));

        reminders.push({
          id: keyToNumericId(key),
          reminderKey: key,
          caseId: item.caseId,
          title: `Task due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          message: `"${item.title}" is due ${formatDateLabel(item.dueDate)}.`,
          discreetMessage: `Alimony+ Reminder: Action item due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}.`,
          timestamp: asOf,
          category: "Compliance",
          read: false,
          linkSection: "cases",
          isGeneratedReminder: true,
        });
      }
    }
  }

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
 * in the desktop notification — use discreetMessage or a generic fallback.
 * When discreet mode is disabled, the full title and message are used.
 *
 * The notification `tag` is set to the reminderKey when available (for
 * better per-browser deduplication), otherwise falls back to the numeric id.
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

    // Use reminderKey as the browser deduplication tag when available.
    const tag = notification.reminderKey
      ? `alimony-plus-${notification.reminderKey}`
      : `alimony-plus-${notification.id}`;

    new Notification(title, {
      body,
      tag,
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