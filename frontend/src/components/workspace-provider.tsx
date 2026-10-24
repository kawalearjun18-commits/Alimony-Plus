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
import { demoWorkspace, DEMO_DATE, defaultPreferences } from "@/lib/demo";
import { today } from "@/lib/ledger";
import type {
  Workspace,
  CaseRecord,
  Proceeding,
  Order,
  Payment,
  DocumentRecord,
  NotificationPreferences,
} from "@/lib/types";
const empty = (): Workspace => ({
  cases: [],
  proceedings: [],
  orders: [],
  payments: [],
  hearings: [],
  documents: [],
  sources: [],
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
  caseNotes: Record<number, string>;
  setCaseNote: (caseId: number, value: string) => void;
  setData: React.Dispatch<React.SetStateAction<Workspace>>;
  refresh: () => Promise<void>;
  enterLive: (name: string) => Promise<void>;
  resetDemo: () => void;
  logout: () => Promise<void>;
  create: (
    kind: "cases" | "proceedings" | "orders" | "payments",
    body: Record<string, unknown>,
  ) => Promise<void>;
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
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
  const [caseNotes, setCaseNotes] = useState<Record<number, string>>({});
  const router = useRouter();
  const setCaseNote = useCallback((caseId: number, note: string) => {
    if (!caseId || typeof caseId !== "number") {
      throw new Error("Invalid case ID");
    }
    setCaseNotes((prev) => ({
      ...prev,
      [caseId]: note,
    }));
  }, []);
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
      const documents = (
        await Promise.all(
          cases.map((c) =>
            api<{ documents: DocumentRecord[] }>(`documents/case/${c.id}`),
          ),
        )
      ).flatMap((r) => r.documents);
      if (generation === requestGeneration.current)
        setData((prev) => ({
          ...prev,
          cases,
          proceedings,
          orders,
          payments,
          documents,
        }));
    } catch (err) {
      if (generation === requestGeneration.current)
        setError((err as Error).message);
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, []);
  async function enterLive(userName: string) {
    setDemo(false);
    setName(userName);
    setData(empty());
    setSelectedCase(0);
    setCaseNotes({});
    await loadLive();
  }
  function resetDemo() {
    requestGeneration.current++;
    setLoading(false);
    setDemo(true);
    setName("Meera");
    setData(demoWorkspace());
    setSelectedCase(0);
    setCaseNotes({});
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
          setCaseNotes({});
          setDemo(true);
          setName("Guest");
          setNotice("Your session was cleared after inactivity.");
          void api("auth/logout", {}).catch(() => {});
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
        caseNotes,
        setCaseNote,
        setData,
        refresh: loadLive,
        enterLive,
        resetDemo,
        logout,
        create,
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
