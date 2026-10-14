"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
} from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  X,
  Check,
  CheckCheck,
  CalendarDays,
  Scale,
  FileText,
  AlertTriangle,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import {
  countUnread,
  sortNotifications,
  filterNotificationsByCategory,
  generateReminders,
  showDesktopNotification,
} from "@/lib/notifications";
import type {
  NotificationItem,
  NotificationCategory,
} from "@/lib/types";

const categoryIcons: Record<NotificationCategory, typeof Bell> = {
  Hearing: CalendarDays,
  Summons: Scale,
  Deadline: FileText,
  Compliance: AlertTriangle,
  System: Settings,
};

const categoryLabels: Record<NotificationCategory, string> = {
  Hearing: "Hearing",
  Summons: "Summons",
  Deadline: "Deadline",
  Compliance: "Compliance",
  System: "System",
};

const filterOptions: Array<"All" | NotificationCategory> = [
  "All",
  "Hearing",
  "Summons",
  "Deadline",
  "Compliance",
];

export function NotificationBell() {
  const { data, asOf, readReminderIds } = useWorkspace();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Track reminder keys already attempted during this mounted session.
  // Using reminderKey (string) instead of numeric id provides better
  // deduplication — remounted components that share the same reminderKey
  // will not fire a duplicate desktop notification if the key was already
  // sent in this page session.
  const sentDesktopReminderKeys = useRef<Set<string>>(new Set());

  const allNotifications = useMemo(() => {
    // Build the exclusion set from reminderKeys of already-stored notifications.
    // Any generated reminder whose key matches an existing key is skipped.
    const existingKeys = new Set(
      data.notifications
        .filter((n) => n.reminderKey)
        .map((n) => n.reminderKey as string),
    );

    const reminders = generateReminders(
      data.calendarEvents,
      data.submissions,
      data.actionItems,
      data.notificationPreferences,
      asOf,
      existingKeys,
    );

    return [
      ...data.notifications,
      ...reminders.map((reminder) => ({
        ...reminder,
        // Merge read state: check by reminderKey when available, else numeric id.
        read:
          reminder.read ||
          (reminder.reminderKey
            ? readReminderIds.has(reminder.reminderKey)
            : readReminderIds.has(String(reminder.id))),
      })),
    ];
  }, [
    data.notifications,
    data.calendarEvents,
    data.submissions,
    data.actionItems,
    data.notificationPreferences,
    asOf,
    readReminderIds,
  ]);

  const unreadCount = countUnread(allNotifications);
  // Automatically show eligible reminders while the app is open.
  useEffect(() => {
    const preferences = data.notificationPreferences;

    if (!preferences.desktopPushEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const eligibleReminders = allNotifications.filter(
      (notification) =>
        notification.isGeneratedReminder === true &&
        !notification.read &&
        !(notification.reminderKey
          ? readReminderIds.has(notification.reminderKey)
          : readReminderIds.has(String(notification.id))),
    );

    for (const notification of eligibleReminders) {
      // Use reminderKey as the deduplication handle when available.
      const dedupeKey = notification.reminderKey ?? String(notification.id);
      if (sentDesktopReminderKeys.current.has(dedupeKey)) continue;

      // Prevent repeated attempts during React effect reruns.
      sentDesktopReminderKeys.current.add(dedupeKey);

      showDesktopNotification(
        notification,
        preferences.discreetMode,
      );
    }
  }, [
    allNotifications,
    data.notificationPreferences,
    readReminderIds,
  ]);

  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handleClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="notification-bell-wrapper"
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="icon-button notification-bell-button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((previous) => !previous)}
      >
        <Bell size={19} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          ref={panelRef}
          notifications={allNotifications}
          discreetMode={data.notificationPreferences.discreetMode}
          onClose={() => {
            setOpen(false);
            buttonRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
type PanelProps = {
  notifications: NotificationItem[];
  onClose: () => void;
  discreetMode: boolean;
};
const NotificationPanel = forwardRef<HTMLDivElement, PanelProps>(
  function NotificationPanel(
    { notifications, onClose, discreetMode },
    ref,
  ) {
    const {
      markNotificationRead,
      markAllNotificationsRead,
      markReminderRead,
      markAllRemindersRead,
    } = useWorkspace();

    const [filter, setFilter] = useState<"All" | NotificationCategory>("All");
    const sorted = sortNotifications(notifications);
    const filtered = filterNotificationsByCategory(sorted, filter);
    const unreadCount = countUnread(notifications);

    function handleMarkAllRead() {
      markAllNotificationsRead();

      // Collect reminderKey strings (primary) or fall back to String(id)
      // for any generated reminder that may not carry a key.
      const generatedReminderKeys = notifications
        .filter(
          (notification) => notification.isGeneratedReminder === true,
        )
        .map((notification) =>
          notification.reminderKey ?? String(notification.id),
        );

      markAllRemindersRead(generatedReminderKeys);
    }

    function handleMarkRead(notification: NotificationItem) {
      const isGeneratedReminder =
        notification.isGeneratedReminder === true;

      if (isGeneratedReminder) {
        // Prefer reminderKey for stable identity; fall back to String(id).
        markReminderRead(notification.reminderKey ?? String(notification.id));
      } else {
        markNotificationRead(notification.id);
      }
    }

    return (
      <div
        ref={ref}
        className="notification-panel"
        role="dialog"
        aria-label="Notifications"
        style={{
          position: "absolute",
          top: "calc(100% + 12px)",
          right: 0,
          zIndex: 1000,
          width: "min(420px, calc(100vw - 24px))",
          maxWidth: "calc(100vw - 24px)",
          maxHeight: "min(640px, calc(100vh - 100px))",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--surface, #fff)",
          border: "1px solid var(--border, #e3e7df)",
          borderRadius: "14px",
          boxShadow: "0 18px 48px rgba(24, 44, 35, 0.18)",
        }}
      >
        <div className="notification-panel-header" style={{ flexShrink: 0 }}>
          <div>
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <span className="notification-panel-count">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="notification-panel-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-link compact"
                onClick={handleMarkAllRead}
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={15} />
                Mark all read
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="notification-filter-tabs"
          style={{ flexShrink: 0, overflowX: "auto" }}
        >
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={filter === option ? "selected" : ""}
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <div
          className="notification-list"
          style={{ minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}
        >
          {filtered.length > 0 ? (
            filtered.map((notification) => (
              <NotificationRow
                key={
                  notification.isGeneratedReminder && notification.reminderKey
                    ? `reminder:${notification.reminderKey}`
                    : `notification:${notification.category}:${notification.id}`
                }
                notification={notification}
                discreetMode={discreetMode}
                onMarkRead={() => handleMarkRead(notification)}
                onClose={onClose}
              />
            ))
          ) : (
            <div className="notification-empty">
              <BellOff size={28} strokeWidth={1.3} />
              <p>
                {filter === "All"
                  ? "You're all caught up. No notifications right now."
                  : `No ${filter.toLowerCase()} notifications.`}
              </p>
            </div>
          )}
        </div>

        <div className="notification-panel-footer" style={{ flexShrink: 0 }}>
          <Link href="/settings" className="text-link" onClick={onClose}>
            <Settings size={14} />
            Notification settings
          </Link>
        </div>
      </div>
    );
  },
);

NotificationPanel.displayName = "NotificationPanel";

function NotificationRow({
  notification,
  onMarkRead,
  onClose,
  discreetMode,
}: {
  notification: NotificationItem;
  onMarkRead: () => void;
  onClose: () => void;
  discreetMode: boolean;
}) {
  const Icon = categoryIcons[notification.category] || Bell;
  const label = discreetMode
    ? "Notification"
    : categoryLabels[notification.category] || "Notification";

  return (
    <div
      className={`notification-row ${notification.read ? "read" : "unread"}`}
    >
      <span className={`notification-icon ${notification.category.toLowerCase()}`}>
        <Icon size={16} />
      </span>

      <div className="notification-content">
        <div className="notification-row-header">
          <span className="notification-category-label">{label}</span>
          <span className="notification-timestamp">
            {formatRelativeDate(notification.timestamp)}
          </span>
        </div>

        <strong>
          {discreetMode ? "Notification" : notification.title}
        </strong>
        <p>
          {discreetMode
            ? "You have a new notification."
            : notification.message}
        </p>

        <div className="notification-row-actions">
          {notification.linkSection && (
            <Link
              href={`/${notification.linkSection}`}
              className="text-link compact"
              onClick={onClose}
            >
              View details <ChevronRight size={13} />
            </Link>
          )}

          {!notification.read && (
            <button
              type="button"
              className="text-link compact"
              onClick={onMarkRead}
              aria-label={
                discreetMode
                  ? "Mark notification as read"
                  : `Mark "${notification.title}" as read`
              }
            >
              <Check size={13} />
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
