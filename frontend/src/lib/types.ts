export type CaseRecord = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  legalRoute?: string;
  description?: string;
};
export type Proceeding = {
  id: number;
  caseId: number;
  courtName?: string;
  caseNumber?: string;
  proceedingType?: string;
  filedAt?: string;
  status: string;
};
export type Order = {
  id: number;
  proceedingId: number;
  orderType?: string;
  orderDate?: string;
  amount: number;
  description?: string;
  effectiveDate?: string;
  dueDay?: number;
  endDate?: string;
};
export type Payment = {
  id: number;
  orderId: number;
  amount: number;
  paymentDate: string;
  status: "RECEIVED" | "PENDING" | "FAILED";
  period?: string;
  reference?: string;
  notes?: string;
  proof?: ProofInfo;
  proofFile?: File;
};
export type ProofInfo = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
};
export type HearingEventType = "hearing" | "summons" | "milestone";
export type Hearing = {
  id: number;
  caseId: number;
  date: string;
  title: string;
  location: string;
  eventType?: HearingEventType;
  milestone?: string;
};
export type DocumentRecord = {
  id: number;
  caseId: number;
  originalName: string;
  documentType: string;
  fileSize: number;
  createdAt: string;
  file?: File;
};
export type SourceRecord = {
  id: number;
  title: string;
  kind: "Legal source" | "Financial fact";
  url: string;
  section: string;
  reviewedOn: string;
  effectiveFrom: string;
  status: "Needs review" | "Reviewed";
  value: string;
  frequency: "Monthly" | "Annual" | "One-time" | "Not applicable";
  certainty: "Known" | "Estimated" | "Unknown";
};
export type Workspace = {
  cases: CaseRecord[];
  proceedings: Proceeding[];
  orders: Order[];
  payments: Payment[];
  hearings: Hearing[];
  documents: DocumentRecord[];
  sources: SourceRecord[];
  notifications: NotificationItem[];
  notificationPreferences: NotificationPreferences;
};
export type LedgerRow = {
  orderId: number;
  period: string;
  dueDate: string;
  expected: number;
  received: number;
  outstanding: number;
  status: "Paid" | "Overdue" | "Partially paid" | "Upcoming";
  credit: number;
};
export type CalendarEventType =
  | "Hearing"
  | "Summons return"
  | "Order deadline";

export type CalendarEventStatus =
  | "Scheduled"
  | "Completed"
  | "Adjourned"
  | "Pending"
  | "Cancelled";

export type CalendarEvent = {
  id: number;
  caseId: number;
  date: string;
  time?: string;
  title: string;
  eventType: CalendarEventType;
  location?: string;
  description?: string;
  status: CalendarEventStatus;
  reminderDays?: number;
};

export type SubmissionType =
  | "Petition"
  | "Interim application"
  | "Affidavit of assets"
  | "Written statement"
  | "Rejoinder"
  | "Evidence affidavit"
  | "Written arguments";

export type SubmissionStatus =
  | "Drafted"
  | "Filed"
  | "Served"
  | "Objected"
  | "Taken on record";

export type LegalSubmission = {
  id: number;
  caseId: number;
  proceedingId?: number;
  title: string;
  submissionType: SubmissionType;
  filingDate: string;
  filedBy: "Applicant" | "Respondent" | "Court";
  courtFilingNumber?: string;
  status: SubmissionStatus;
  documentId?: number;
  responseDeadline?: string;
  notes?: string;
};

export type ActionItemPriority = "High" | "Medium" | "Normal";

export type ActionItemCategory =
  | "Document prep"
  | "Affidavit filing"
  | "Court appearance"
  | "Compliance"
  | "Other";

export type ActionItem = {
  id: number;
  caseId: number;
  title: string;
  description?: string;
  category: ActionItemCategory;
  dueDate: string;
  priority: ActionItemPriority;
  completed: boolean;
  completedAt?: string;
  linkedCalendarEventId?: number;
};

export type NotificationCategory =
  | "Hearing"
  | "Summons"
  | "Deadline"
  | "Compliance"
  | "System";

export type NotificationItem = {
  id: number;
  caseId?: number;
  title: string;
  message: string;
  discreetMessage?: string;
  timestamp: string;
  category: NotificationCategory;
  read: boolean;
  linkSection?: string;

  /**
   * Identifies reminders generated dynamically from calendar events,
   * submissions, and action items. Used to distinguish them from
   * regular notifications without relying on numeric ID ranges.
   */
  isGeneratedReminder?: boolean;

  /**
   * Stable, human-readable composite key for generated reminders.
   * Format: `{type}:{caseId}:{sourceId}:{date}`
   * Examples:
   *   "hearing:10:1:2026-10-14"
   *   "summons:10:2:2026-10-20"
   *   "order-deadline:10:3:2026-10-18"
   *   "submission-deadline:10:5:2026-10-15"
   *   "action-upcoming:10:7:2026-10-16"
   *   "action-today:10:8:2026-10-14"
   *   "action-overdue:10:9:2026-10-10"
   *
   * Role: deduplication and read-state tracking across re-renders.
   * The numeric `id` is a hash of this key so that existing components
   * that expect a numeric id remain compatible.
   */
  reminderKey?: string;
};

export type NotificationPreferences = {
  hearingReminders: boolean;
  summonsAlerts: boolean;
  deadlineAlerts: boolean;
  leadDays: number;
  desktopPushEnabled: boolean;
  discreetMode: boolean;
};

