import type {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
  LegalSubmission,
  SubmissionType,
  SubmissionStatus,
  ActionItem,
  ActionItemPriority,
  ActionItemCategory,
} from "./types";

// ==========================================
// COURT CALENDAR LOGIC & HELPERS
// ==========================================

export const CALENDAR_EVENT_TYPES: CalendarEventType[] = [
  "Hearing",
  "Summons return",
  "Order deadline",
];

export const CALENDAR_EVENT_STATUSES: CalendarEventStatus[] = [
  "Scheduled",
  "Completed",
  "Adjourned",
  "Pending",
];

export function sortCalendarEvents(
  events: CalendarEvent[],
  direction: "asc" | "desc" = "asc",
): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) {
      return direction === "asc" ? cmp : -cmp;
    }
    const timeA = a.time || "";
    const timeB = b.time || "";
    const timeCmp = timeA.localeCompare(timeB);
    if (timeCmp !== 0) {
      return direction === "asc" ? timeCmp : -timeCmp;
    }
    return direction === "asc" ? a.id - b.id : b.id - a.id;
  });
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  options: {
    eventType?: string;
    status?: string;
    caseId?: number;
    searchQuery?: string;
    month?: string; // YYYY-MM
    date?: string; // YYYY-MM-DD
  } = {},
): CalendarEvent[] {
  const { eventType, status, caseId, searchQuery, month, date } = options;
  const q = searchQuery?.toLowerCase().trim();

  return events.filter((ev) => {
    if (caseId && caseId > 0 && ev.caseId !== caseId) {
      return false;
    }
    if (eventType && eventType !== "All" && ev.eventType !== eventType) {
      return false;
    }
    if (status && status !== "All" && ev.status !== status) {
      return false;
    }
    if (month && !ev.date.startsWith(month)) {
      return false;
    }
    if (date && ev.date !== date) {
      return false;
    }
    if (q) {
      const matchTitle = ev.title.toLowerCase().includes(q);
      const matchLoc = ev.location?.toLowerCase().includes(q) ?? false;
      const matchDesc = ev.description?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchLoc && !matchDesc) {
        return false;
      }
    }
    return true;
  });
}

export type CalendarGridCell = {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
};

export function getCalendarGrid(year: number, month: number): CalendarGridCell[] {
  // month is 1-indexed (1 = January, 10 = October)
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startingDayOfWeek = firstDay.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const cells: CalendarGridCell[] = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevDate = new Date(Date.UTC(year, month - 2, day));
    const y = prevDate.getUTCFullYear();
    const m = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    cells.push({
      date: `${y}-${m}-${d}`,
      dayNumber: day,
      isCurrentMonth: false,
    });
  }

  // Current month days
  const mStr = String(month).padStart(2, "0");
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = String(day).padStart(2, "0");
    cells.push({
      date: `${year}-${mStr}-${dStr}`,
      dayNumber: day,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to fill grid to multiple of 7 (at least 35, up to 42)
  const totalSlots = cells.length > 35 ? 42 : 35;
  const remaining = totalSlots - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const nextDate = new Date(Date.UTC(year, month, day));
    const y = nextDate.getUTCFullYear();
    const m = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    cells.push({
      date: `${y}-${m}-${d}`,
      dayNumber: day,
      isCurrentMonth: false,
    });
  }

  return cells;
}

export function groupEventsByDate(
  events: CalendarEvent[],
): { date: string; events: CalendarEvent[] }[] {
  const sorted = sortCalendarEvents(events, "asc");
  const groups: Map<string, CalendarEvent[]> = new Map();

  for (const ev of sorted) {
    const existing = groups.get(ev.date) || [];
    existing.push(ev);
    groups.set(ev.date, existing);
  }

  return Array.from(groups.entries()).map(([date, groupEvents]) => ({
    date,
    events: groupEvents,
  }));
}

export function validateCalendarEventInput(input: Partial<CalendarEvent>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push("Event title is required.");
  } else if (input.title.trim().length < 3) {
    errors.push("Event title must be at least 3 characters.");
  }

  if (!input.date) {
    errors.push("Event date is required.");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.push("Event date must follow YYYY-MM-DD format.");
  }

  if (
    input.eventType &&
    !CALENDAR_EVENT_TYPES.includes(input.eventType as CalendarEventType)
  ) {
    errors.push("Invalid calendar event type.");
  }

  if (
    input.status &&
    !CALENDAR_EVENT_STATUSES.includes(input.status as CalendarEventStatus)
  ) {
    errors.push("Invalid calendar event status.");
  }

  if (input.caseId !== undefined && input.caseId <= 0) {
    errors.push("A valid case must be selected.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function addCalendarEventRecord(
  events: CalendarEvent[],
  input: Omit<CalendarEvent, "id">,
): CalendarEvent[] {
  const newRecord: CalendarEvent = {
    ...input,
    id: Date.now(),
  };
  return [...events, newRecord];
}

export function updateCalendarEventRecord(
  events: CalendarEvent[],
  id: number,
  patch: Partial<CalendarEvent>,
): CalendarEvent[] {
  return events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev));
}

export function deleteCalendarEventRecord(
  events: CalendarEvent[],
  id: number,
): CalendarEvent[] {
  return events.filter((ev) => ev.id !== id);
}

// ==========================================
// LEGAL SUBMISSION TRACKER LOGIC & HELPERS
// ==========================================

export const SUBMISSION_TYPES: SubmissionType[] = [
  "Petition",
  "Interim application",
  "Affidavit of assets",
  "Written statement",
  "Rejoinder",
  "Evidence affidavit",
  "Written arguments",
];

export const SUBMISSION_STATUS_ORDER: SubmissionStatus[] = [
  "Drafted",
  "Filed",
  "Served",
  "Taken on record",
];

export const ALL_SUBMISSION_STATUSES: SubmissionStatus[] = [
  "Drafted",
  "Filed",
  "Served",
  "Objected",
  "Taken on record",
];

export function getNextSubmissionStatus(
  current: SubmissionStatus,
): SubmissionStatus | null {
  switch (current) {
    case "Drafted":
      return "Filed";
    case "Filed":
      return "Served";
    case "Served":
      return "Taken on record";
    case "Objected":
      return "Filed"; // Re-filing after curing objections
    case "Taken on record":
      return null;
    default:
      return null;
  }
}

export function filterLegalSubmissions(
  submissions: LegalSubmission[],
  options: {
    submissionType?: string;
    status?: string;
    filedBy?: string;
    caseId?: number;
    searchQuery?: string;
  } = {},
): LegalSubmission[] {
  const { submissionType, status, filedBy, caseId, searchQuery } = options;
  const q = searchQuery?.toLowerCase().trim();

  return submissions.filter((sub) => {
    if (caseId && caseId > 0 && sub.caseId !== caseId) {
      return false;
    }
    if (
      submissionType &&
      submissionType !== "All" &&
      sub.submissionType !== submissionType
    ) {
      return false;
    }
    if (status && status !== "All" && sub.status !== status) {
      return false;
    }
    if (filedBy && filedBy !== "All" && sub.filedBy !== filedBy) {
      return false;
    }
    if (q) {
      const matchTitle = sub.title.toLowerCase().includes(q);
      const matchNumber =
        sub.courtFilingNumber?.toLowerCase().includes(q) ?? false;
      const matchNotes = sub.notes?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchNumber && !matchNotes) {
        return false;
      }
    }
    return true;
  });
}

export function sortLegalSubmissions(
  submissions: LegalSubmission[],
  sortBy: "filingDate" | "title" | "status" = "filingDate",
  direction: "asc" | "desc" = "desc",
): LegalSubmission[] {
  return [...submissions].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "filingDate") {
      cmp = a.filingDate.localeCompare(b.filingDate);
    } else if (sortBy === "title") {
      cmp = a.title.localeCompare(b.title);
    } else if (sortBy === "status") {
      cmp = a.status.localeCompare(b.status);
    }
    if (cmp !== 0) {
      return direction === "asc" ? cmp : -cmp;
    }
    return direction === "asc" ? a.id - b.id : b.id - a.id;
  });
}

export function validateSubmissionInput(input: Partial<LegalSubmission>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push("Submission title is required.");
  } else if (input.title.trim().length < 3) {
    errors.push("Submission title must be at least 3 characters.");
  }

  if (!input.filingDate) {
    errors.push("Filing date is required.");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.filingDate)) {
    errors.push("Filing date must follow YYYY-MM-DD format.");
  }

  if (
    input.submissionType &&
    !SUBMISSION_TYPES.includes(input.submissionType as SubmissionType)
  ) {
    errors.push("Invalid submission type.");
  }

  if (
    input.status &&
    !ALL_SUBMISSION_STATUSES.includes(input.status as SubmissionStatus)
  ) {
    errors.push("Invalid submission status.");
  }

  if (
    input.filedBy &&
    !["Applicant", "Respondent", "Court"].includes(input.filedBy)
  ) {
    errors.push("Invalid filedBy value.");
  }

  if (input.caseId !== undefined && input.caseId <= 0) {
    errors.push("A valid case must be selected.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function addSubmissionRecord(
  submissions: LegalSubmission[],
  input: Omit<LegalSubmission, "id">,
): LegalSubmission[] {
  const newRecord: LegalSubmission = {
    ...input,
    id: Date.now(),
  };
  return [...submissions, newRecord];
}

export function updateSubmissionStatusRecord(
  submissions: LegalSubmission[],
  id: number,
  status: SubmissionStatus,
): LegalSubmission[] {
  return submissions.map((s) => (s.id === id ? { ...s, status } : s));
}

export function updateSubmissionRecord(
  submissions: LegalSubmission[],
  id: number,
  patch: Partial<LegalSubmission>,
): LegalSubmission[] {
  return submissions.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export function deleteSubmissionRecord(
  submissions: LegalSubmission[],
  id: number,
): LegalSubmission[] {
  return submissions.filter((s) => s.id !== id);
}

// ==========================================
// ACTION ITEMS LOGIC & HELPERS
// ==========================================

export const ACTION_CATEGORIES: ActionItemCategory[] = [
  "Document prep",
  "Affidavit filing",
  "Court appearance",
  "Compliance",
  "Other",
];

export const ACTION_PRIORITIES: ActionItemPriority[] = [
  "High",
  "Medium",
  "Normal",
];

export function filterActionItems(
  items: ActionItem[],
  options: {
    status?: "All" | "Pending" | "Completed";
    priority?: string;
    category?: string;
    caseId?: number;
    searchQuery?: string;
  } = {},
): ActionItem[] {
  const { status, priority, category, caseId, searchQuery } = options;
  const q = searchQuery?.toLowerCase().trim();

  return items.filter((item) => {
    if (caseId && caseId > 0 && item.caseId !== caseId) {
      return false;
    }
    if (status === "Pending" && item.completed) {
      return false;
    }
    if (status === "Completed" && !item.completed) {
      return false;
    }
    if (priority && priority !== "All" && item.priority !== priority) {
      return false;
    }
    if (category && category !== "All" && item.category !== category) {
      return false;
    }
    if (q) {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchDesc) {
        return false;
      }
    }
    return true;
  });
}

export function sortActionItems(
  items: ActionItem[],
  sortBy: "dueDate" | "priority" | "title" = "dueDate",
  direction: "asc" | "desc" = "asc",
): ActionItem[] {
  const priorityRank: Record<ActionItemPriority, number> = {
    High: 1,
    Medium: 2,
    Normal: 3,
  };

  return [...items].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "dueDate") {
      cmp = a.dueDate.localeCompare(b.dueDate);
    } else if (sortBy === "priority") {
      cmp = priorityRank[a.priority] - priorityRank[b.priority];
    } else if (sortBy === "title") {
      cmp = a.title.localeCompare(b.title);
    }
    if (cmp !== 0) {
      return direction === "asc" ? cmp : -cmp;
    }
    return direction === "asc" ? a.id - b.id : b.id - a.id;
  });
}

export function getDaysUntilDue(dueDate: string, asOfDate: string): number {
  const due = new Date(dueDate + "T00:00:00Z").getTime();
  const asOf = new Date(asOfDate + "T00:00:00Z").getTime();
  const diffMs = due - asOf;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function getActionItemUrgency(
  item: ActionItem,
  asOfDate: string,
): "overdue" | "due-today" | "upcoming" | "completed" {
  if (item.completed) {
    return "completed";
  }
  if (item.dueDate < asOfDate) {
    return "overdue";
  }
  if (item.dueDate === asOfDate) {
    return "due-today";
  }
  return "upcoming";
}

export function validateActionItemInput(input: Partial<ActionItem>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push("Task title is required.");
  } else if (input.title.trim().length < 3) {
    errors.push("Task title must be at least 3 characters.");
  }

  if (!input.dueDate) {
    errors.push("Due date is required.");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    errors.push("Due date must follow YYYY-MM-DD format.");
  }

  if (
    input.priority &&
    !ACTION_PRIORITIES.includes(input.priority as ActionItemPriority)
  ) {
    errors.push("Invalid task priority.");
  }

  if (
    input.category &&
    !ACTION_CATEGORIES.includes(input.category as ActionItemCategory)
  ) {
    errors.push("Invalid task category.");
  }

  if (input.caseId !== undefined && input.caseId <= 0) {
    errors.push("A valid case must be selected.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function addActionItemRecord(
  items: ActionItem[],
  input: Omit<ActionItem, "id">,
): ActionItem[] {
  const newRecord: ActionItem = {
    ...input,
    id: Date.now(),
  };
  return [...items, newRecord];
}

export function toggleActionItemRecord(
  items: ActionItem[],
  id: number,
  completedAtDate: string = new Date().toISOString().split("T")[0],
): ActionItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    const newCompleted = !item.completed;
    return {
      ...item,
      completed: newCompleted,
      completedAt: newCompleted ? completedAtDate : undefined,
    };
  });
}

export function updateActionItemRecord(
  items: ActionItem[],
  id: number,
  patch: Partial<ActionItem>,
): ActionItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function deleteActionItemRecord(
  items: ActionItem[],
  id: number,
): ActionItem[] {
  return items.filter((item) => item.id !== id);
}
