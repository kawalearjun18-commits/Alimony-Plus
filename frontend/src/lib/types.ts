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
};
export type Hearing = {
  id: number;
  caseId: number;
  date: string;
  title: string;
  location: string;
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
export type MilestoneStage =
  | "Filing"
  | "Summons & Notice"
  | "Interim Application"
  | "Pleadings"
  | "Evidence"
  | "Arguments"
  | "Final Order";
export type MilestoneStatus =
  | "Completed"
  | "In progress"
  | "Scheduled"
  | "Adjourned";
export type MilestoneEvent = {
  id: number;
  caseId: number;
  date: string;
  title: string;
  stage: MilestoneStage;
  status: MilestoneStatus;
  description?: string;
  courtroom?: string;
  orderId?: number;
  documentId?: number;
  notes?: string;
};
export type CalendarEventType =
  | "Hearing"
  | "Summons return"
  | "Order deadline";
export type CalendarEventStatus =
  | "Scheduled"
  | "Completed"
  | "Adjourned"
  | "Pending";
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
export type BenchType = "Single Bench" | "Division Bench";
export type BenchStatus = "Active" | "Transferred" | "Retired";
export type BenchAssignment = {
  id: number;
  caseId: number;
  proceedingId?: number;
  courtName: string;
  courtroom: string;
  judgeName: string;
  benchType: BenchType;
  assignedDate: string;
  transferredDate?: string;
  status: BenchStatus;
  presidingNotes?: string;
};
export type DiaryCategory =
  | "Court proceeding"
  | "Counsel meeting"
  | "Evidence note"
  | "Personal diary";
export type CaseDiaryEntry = {
  id: number;
  caseId: number;
  entryDate: string;
  title: string;
  content: string;
  tags: string[];
  category: DiaryCategory;
  isPrivate?: boolean;
  author?: string;
  updatedAt?: string;
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
};
export type NotificationPreferences = {
  hearingReminders: boolean;
  summonsAlerts: boolean;
  deadlineAlerts: boolean;
  leadDays: number;
  desktopPushEnabled: boolean;
  discreetMode: boolean;
};
export type Workspace = {
  cases: CaseRecord[];
  proceedings: Proceeding[];
  orders: Order[];
  payments: Payment[];
  hearings: Hearing[];
  documents: DocumentRecord[];
  sources: SourceRecord[];
  milestones: MilestoneEvent[];
  calendarEvents: CalendarEvent[];
  benchAssignments: BenchAssignment[];
  diaryEntries: CaseDiaryEntry[];
  submissions: LegalSubmission[];
  actionItems: ActionItem[];
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
