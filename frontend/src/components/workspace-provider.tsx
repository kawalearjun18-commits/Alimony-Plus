"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { demoWorkspace, DEMO_DATE } from "@/lib/demo";
import { today } from "@/lib/ledger";
import type {
  Workspace,
  CaseRecord,
  Proceeding,
  Order,
  Payment,
  MilestoneEvent,
  CalendarEvent,
  BenchAssignment,
  CaseDiaryEntry,
  LegalSubmission,
  ActionItem,
  NotificationPreferences,
} from "@/lib/types";

export const defaultPreferences: NotificationPreferences = {
  hearingReminders: true,
  summonsAlerts: true,
  deadlineAlerts: true,
  leadDays: 3,
  desktopPushEnabled: false,
  discreetMode: true,
};

const empty = (): Workspace => ({
  cases: [],
  proceedings: [],
  orders: [],
  payments: [],
  hearings: [],
  documents: [],
  sources: [],
  milestones: [],
  calendarEvents: [],
  benchAssignments: [],
  diaryEntries: [],
  submissions: [],
  actionItems: [],
  notifications: [],
  notificationPreferences: defaultPreferences,
});

type Context = {
  data: Workspace;
  demo: boolean;
  asOf: string;
  name: string;
  loading: boolean;
  error: string;
  notice: string;
  setNotice: (v: string) => void;
  selectedCase: number;
  setSelectedCase: (v: number) => void;
  setData: React.Dispatch<React.SetStateAction<Workspace>>;
  refresh: () => Promise<void>;
  enterLive: (name: string) => Promise<void>;
  resetDemo: () => void;
  logout: () => Promise<void>;
  create: (
    kind: "cases" | "proceedings" | "orders" | "payments",
    body: Record<string, unknown>,
  ) => Promise<void>;
  addMilestone: (milestone: Omit<MilestoneEvent, "id">) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, "id">) => void;
  updateCalendarEvent: (id: number, patch: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: number) => void;
  addBenchAssignment: (bench: Omit<BenchAssignment, "id">) => void;
  addDiaryEntry: (entry: Omit<CaseDiaryEntry, "id" | "updatedAt">) => void;
  updateDiaryEntry: (id: number, patch: Partial<CaseDiaryEntry>) => void;
  deleteDiaryEntry: (id: number) => void;
  addSubmission: (submission: Omit<LegalSubmission, "id">) => void;
  updateSubmissionStatus: (
    id: number,
    status: LegalSubmission["status"],
  ) => void;
  updateSubmission: (id: number, patch: Partial<LegalSubmission>) => void;
  deleteSubmission: (id: number) => void;
  addActionItem: (item: Omit<ActionItem, "id">) => void;
  toggleActionItem: (id: number) => void;
  updateActionItem: (id: number, patch: Partial<ActionItem>) => void;
  deleteActionItem: (id: number) => void;
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
  /**
   * Set of reminderKey strings for reminders the user has marked read.
   * Keyed by reminderKey (stable string composite key) rather than numeric id
   * to survive re-renders where ids may be recomputed from the hash.
   * This Set lives in React state only — it is lost on page reload.
   */
  readReminderIds: Set<string>;
  markReminderRead: (key: string) => void;
  markAllRemindersRead: (keys: string[]) => void;
  updateNotificationPreferences: (
    patch: Partial<NotificationPreferences>,
  ) => void;
};

const Store = createContext<Context | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const requestGeneration = useRef(0);
  const [data, setData] = useState<Workspace>(demoWorkspace);
  const [readReminderIds, setReadReminderIds] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const [demo, setDemo] = useState(true);
  const [name, setName] = useState("Meera");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedCase, setSelectedCase] = useState(0);
  const router = useRouter();

  const loadLive = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setError("");
    try {
      const { cases } = await api<{ cases: CaseRecord[] }>("cases");
      const proceedings = (
        await Promise.all(
          cases.map((c) =>
            api<{ proceedings: Proceeding[] }>(`proceedings/case/${c.id}`),
          ),
        )
      ).flatMap((r) => r.proceedings);
      const orders = (
        await Promise.all(
          proceedings.map((p) =>
            api<{ orders: Order[] }>(`orders/proceeding/${p.id}`),
          ),
        )
      )
        .flatMap((r) => r.orders)
        .map((o) => ({ ...o, amount: Number(o.amount || 0) }));
      const payments = (
        await Promise.all(
          orders.map((o) =>
            api<{ payments: Payment[] }>(`payments/order/${o.id}`),
          ),
        )
      )
        .flatMap((r) => r.payments)
        .map((p) => ({ ...p, amount: Number(p.amount) }));
      if (generation === requestGeneration.current) {
        setData((prev) => ({ ...prev, cases, proceedings, orders, payments }));
      }
    } catch (err) {
      if (generation === requestGeneration.current) {
        setError((err as Error).message);
      }
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, []);

  async function enterLive(userName: string) {
    setDemo(false);
    setName(userName);
    setData(empty());
    setReadReminderIds(new Set<string>());
    setSelectedCase(0);
    await loadLive();
  }

  function resetDemo() {
    requestGeneration.current++;
    setLoading(false);
    setDemo(true);
    setName("Meera");
    setData(demoWorkspace());
    setReadReminderIds(new Set<string>());
    setSelectedCase(0);
    setError("");
    setNotice("Demo reset. All records are synthetic.");
  }

  async function logout() {
    if (!demo) await api("auth/logout", {});
    resetDemo();
    router.push("/login");
  }

  // Live records remain in memory only. Clear them after 15 minutes without activity.
  useEffect(() => {
    if (demo) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          requestGeneration.current++;
          setLoading(false);
          setData(empty());
          setReadReminderIds(new Set<string>());
          setDemo(true);
          setName("Guest");
          setNotice("Your session was cleared after inactivity.");
          void api("auth/logout", {}).catch(() => { });
          router.push("/login");
        },
        15 * 60 * 1000,
      );
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [demo, router]);

  async function create(
    kind: "cases" | "proceedings" | "orders" | "payments",
    body: Record<string, unknown>,
  ) {
    if (demo) {
      const record = {
        ...body,
        id: Date.now(),
        createdAt: DEMO_DATE,
        status: body.status || (kind === "cases" ? "ACTIVE" : "ONGOING"),
      };
      setData((prev) => ({ ...prev, [kind]: [...prev[kind], record] }));
    } else {
      await api(kind, body);
      await loadLive();
    }
    setNotice(
      demo
        ? "Saved in this demo session. Refreshing clears demo changes."
        : "Record saved.",
    );
  }

  function addMilestone(milestone: Omit<MilestoneEvent, "id">) {
    const record: MilestoneEvent = { ...milestone, id: Date.now() };
    setData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, record],
    }));
    setNotice(
      demo
        ? "Milestone saved in this demo session."
        : "Milestone added in-memory. Case service backend persistence is not yet available.",
    );
  }

  function addCalendarEvent(event: Omit<CalendarEvent, "id">) {
    const record: CalendarEvent = { ...event, id: Date.now() };
    setData((prev) => ({
      ...prev,
      calendarEvents: [...prev.calendarEvents, record],
    }));
    setNotice(
      demo
        ? "Calendar event saved in this demo session."
        : "Calendar event added in-memory. Case service backend persistence is not yet available.",
    );
  }

  function updateCalendarEvent(id: number, patch: Partial<CalendarEvent>) {
    setData((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    }));
    setNotice("Calendar event updated.");
  }

  function deleteCalendarEvent(id: number) {
    setData((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.filter((e) => e.id !== id),
    }));
    setNotice("Calendar event removed.");
  }

  function addBenchAssignment(bench: Omit<BenchAssignment, "id">) {
    const record: BenchAssignment = { ...bench, id: Date.now() };
    setData((prev) => ({
      ...prev,
      benchAssignments: [...prev.benchAssignments, record],
    }));
    setNotice(
      demo
        ? "Bench assignment recorded in this demo session."
        : "Bench assignment added in-memory. Case service backend persistence is not yet available.",
    );
  }

  function addDiaryEntry(entry: Omit<CaseDiaryEntry, "id" | "updatedAt">) {
    const record: CaseDiaryEntry = {
      ...entry,
      id: Date.now(),
      updatedAt: demo ? DEMO_DATE : today(),
    };
    setData((prev) => ({
      ...prev,
      diaryEntries: [record, ...prev.diaryEntries],
    }));
    setNotice(
      demo
        ? "Diary note saved in this demo session."
        : "Diary note added in-memory. Case service backend persistence is not yet available.",
    );
  }

  function updateDiaryEntry(id: number, patch: Partial<CaseDiaryEntry>) {
    setData((prev) => ({
      ...prev,
      diaryEntries: prev.diaryEntries.map((e) =>
        e.id === id
          ? { ...e, ...patch, updatedAt: demo ? DEMO_DATE : today() }
          : e,
      ),
    }));
    setNotice(
      demo
        ? "Diary note updated."
        : "Diary note updated in-memory. Case service backend persistence is not yet available.",
    );
  }

  function deleteDiaryEntry(id: number) {
    setData((prev) => ({
      ...prev,
      diaryEntries: prev.diaryEntries.filter((e) => e.id !== id),
    }));
    setNotice("Diary note removed.");
  }

  function addSubmission(submission: Omit<LegalSubmission, "id">) {
    const record: LegalSubmission = { ...submission, id: Date.now() };
    setData((prev) => ({
      ...prev,
      submissions: [...prev.submissions, record],
    }));
    setNotice(
      demo
        ? "Legal submission recorded in this demo session."
        : "Submission added in-memory. Case service backend persistence is not yet available.",
    );
  }

  function updateSubmissionStatus(
    id: number,
    status: LegalSubmission["status"],
  ) {
    setData((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === id ? { ...s, status } : s,
      ),
    }));
    setNotice("Submission status updated.");
  }

  function updateSubmission(id: number, patch: Partial<LegalSubmission>) {
    setData((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    }));
    setNotice("Legal submission updated.");
  }

  function deleteSubmission(id: number) {
    setData((prev) => ({
      ...prev,
      submissions: prev.submissions.filter((s) => s.id !== id),
    }));
    setNotice("Submission removed.");
  }

  function addActionItem(item: Omit<ActionItem, "id">) {
    const record: ActionItem = { ...item, id: Date.now() };
    setData((prev) => ({
      ...prev,
      actionItems: [...prev.actionItems, record],
    }));
    setNotice(
      demo
        ? "Action item saved in this demo session."
        : "Action item added in-memory. Case service backend persistence is not yet available.",
    );
  }

  function toggleActionItem(id: number) {
    const curDate = demo ? DEMO_DATE : today();
    setData((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id
          ? {
            ...item,
            completed: !item.completed,
            completedAt: !item.completed ? curDate : undefined,
          }
          : item,
      ),
    }));
  }

  function updateActionItem(id: number, patch: Partial<ActionItem>) {
    setData((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
    setNotice("Action item updated.");
  }

  function deleteActionItem(id: number) {
    setData((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((item) => item.id !== id),
    }));
    setNotice("Action item removed.");
  }

  function markNotificationRead(id: number) {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification,
      ),
    }));
  }

  function markAllNotificationsRead() {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }));
  }

  function markReminderRead(key: string) {
    setReadReminderIds((previous) => {
      const next = new Set(previous);
      next.add(key);
      return next;
    });
  }

  function markAllRemindersRead(keys: string[]) {
    setReadReminderIds((previous) => {
      const next = new Set(previous);
      for (const key of keys) {
        next.add(key);
      }
      return next;
    });
  }

  function updateNotificationPreferences(
    patch: Partial<NotificationPreferences>,
  ) {
    setData((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        ...patch,
      },
    }));
    setNotice("Notification preferences updated.");
  }

  return (
    <Store.Provider
      value={{
        data,
        demo,
        asOf: demo ? DEMO_DATE : today(),
        name,
        loading,
        error,
        notice,
        setNotice,
        selectedCase,
        setSelectedCase,
        setData,
        refresh: loadLive,
        enterLive,
        resetDemo,
        logout,
        create,
        addMilestone,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        addBenchAssignment,
        addDiaryEntry,
        updateDiaryEntry,
        deleteDiaryEntry,
        addSubmission,
        updateSubmissionStatus,
        updateSubmission,
        deleteSubmission,
        addActionItem,
        toggleActionItem,
        updateActionItem,
        deleteActionItem,
        markNotificationRead,
        markAllNotificationsRead,
        readReminderIds,
        markReminderRead,
        markAllRemindersRead,
        updateNotificationPreferences,
      }}
    >
      {children}
    </Store.Provider>
  );
}

export function useWorkspace() {
  const store = useContext(Store);
  if (!store) throw new Error("WorkspaceProvider is required");
  return store;
}