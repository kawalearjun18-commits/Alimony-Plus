"use client";

import { useState, type FormEvent } from "react";
import {
  FileText,
  FileCheck,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Scale,
  Building2,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  FileCode,
  Tag,
  Paperclip,
  Calendar,
  RotateCcw,
  Trash2,
  Check,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Empty, Field, Modal, PageHeading } from "./ui";
import { dateLabel } from "@/lib/ledger";
import type {
  LegalSubmission,
  SubmissionType,
  SubmissionStatus,
} from "@/lib/types";
import {
  SUBMISSION_TYPES,
  ALL_SUBMISSION_STATUSES,
  SUBMISSION_STATUS_ORDER,
  filterLegalSubmissions,
  sortLegalSubmissions,
  getNextSubmissionStatus,
  validateSubmissionInput,
} from "@/lib/calendar-submissions-actions";

export function LegalSubmissions() {
  const {
    data,
    demo,
    asOf,
    selectedCase,
    setSelectedCase,
    addSubmission,
    updateSubmissionStatus,
    deleteSubmission,
  } = useWorkspace();

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedFiledBy, setSelectedFiledBy] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"filingDate" | "title" | "status">(
    "filingDate",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const filteredSubmissions = filterLegalSubmissions(data.submissions, {
    caseId: selectedCase,
    status: selectedStatus,
    submissionType: selectedType,
    filedBy: selectedFiledBy,
    searchQuery,
  });

  const sortedSubmissions = sortLegalSubmissions(
    filteredSubmissions,
    sortBy,
    sortDirection,
  );

  // Summary counts
  const totalCount = data.submissions.length;
  const draftedCount = data.submissions.filter((s) => s.status === "Drafted").length;
  const inProgressCount = data.submissions.filter(
    (s) => s.status === "Filed" || s.status === "Served",
  ).length;
  const onRecordCount = data.submissions.filter(
    (s) => s.status === "Taken on record",
  ).length;

  function handleAddSubmission(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim();
    const submissionType = String(
      form.get("submissionType") || "Petition",
    ) as SubmissionType;
    const filingDate = String(form.get("filingDate") || asOf).trim();
    const filedBy = String(form.get("filedBy") || "Applicant") as
      | "Applicant"
      | "Respondent"
      | "Court";
    const courtFilingNumber = String(
      form.get("courtFilingNumber") || "",
    ).trim();
    const status = String(
      form.get("status") || "Drafted",
    ) as SubmissionStatus;
    const responseDeadline = String(
      form.get("responseDeadline") || "",
    ).trim();
    const notes = String(form.get("notes") || "").trim();
    const documentIdVal = form.get("documentId");
    const documentId = documentIdVal ? Number(documentIdVal) : undefined;
    const targetCaseId = Number(
      form.get("caseId") || selectedCase || data.cases[0]?.id || 1,
    );

    const validation = validateSubmissionInput({
      title,
      filingDate,
      submissionType,
      status,
      filedBy,
      caseId: targetCaseId,
    });

    if (!validation.valid) {
      setFormError(validation.errors[0] || "Please check the form inputs.");
      return;
    }

    addSubmission({
      caseId: targetCaseId,
      title,
      submissionType,
      filingDate,
      filedBy,
      courtFilingNumber:
        courtFilingNumber ||
        (demo
          ? `DEMO/FC/ND/2026/0142-${title.slice(0, 3).toUpperCase()}`
          : undefined),
      status,
      responseDeadline: responseDeadline || undefined,
      notes:
        notes ||
        (demo ? `[Synthetic demo record] Filed before the Family Court.` : undefined),
      documentId: documentId && documentId > 0 ? documentId : undefined,
    });

    setModalOpen(false);
  }

  function getStatusBadgeTone(status: SubmissionStatus) {
    switch (status) {
      case "Taken on record":
        return "badge-record";
      case "Filed":
        return "badge-filed";
      case "Served":
        return "badge-served";
      case "Objected":
        return "badge-objected";
      case "Drafted":
      default:
        return "badge-draft";
    }
  }

  function getFiledByTone(filedBy: "Applicant" | "Respondent" | "Court") {
    switch (filedBy) {
      case "Applicant":
        return "badge-applicant";
      case "Respondent":
        return "badge-respondent";
      case "Court":
        return "badge-court";
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="PROCEDURAL PLEADINGS"
        title="Legal Submission Tracker"
        description="Monitor drafted petitions, filed statements, summons service, and filings taken on court record."
      >
        <button
          className="button primary"
          onClick={() => {
            setFormError("");
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          New submission
        </button>
      </PageHeading>

      {/* Metrics Row */}
      <div className="submissions-metrics-grid">
        <div className="metric-box">
          <span className="metric-num">{totalCount}</span>
          <span className="metric-label">Total Submissions</span>
          <small className="metric-sub">Pleadings on record</small>
        </div>
        <div className="metric-box">
          <span className="metric-num text-amber">{draftedCount}</span>
          <span className="metric-label">Drafted</span>
          <small className="metric-sub">In counsel preparation</small>
        </div>
        <div className="metric-box">
          <span className="metric-num text-blue">{inProgressCount}</span>
          <span className="metric-label">Filed & Served</span>
          <small className="metric-sub">Pending formal admission</small>
        </div>
        <div className="metric-box">
          <span className="metric-num text-green">{onRecordCount}</span>
          <span className="metric-label">Taken on Record</span>
          <small className="metric-sub">Admitted by the Bench</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="submissions-toolbar">
        <div className="filter-group">
          <span className="filter-group-label">Status:</span>
          <div className="filter-chips">
            {["All", ...ALL_SUBMISSION_STATUSES].map((st) => (
              <button
                key={st}
                type="button"
                className={`chip ${selectedStatus === st ? "active" : ""}`}
                onClick={() => setSelectedStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Type:</span>
          <select
            className="select compact"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Filter by submission type"
          >
            <option value="All">All types</option>
            {SUBMISSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Filed By:</span>
          <select
            className="select compact"
            value={selectedFiledBy}
            onChange={(e) => setSelectedFiledBy(e.target.value)}
            aria-label="Filter by filing party"
          >
            <option value="All">All parties</option>
            <option value="Applicant">Applicant</option>
            <option value="Respondent">Respondent</option>
            <option value="Court">Court</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Case:</span>
          <select
            className="select compact"
            value={selectedCase}
            onChange={(e) => setSelectedCase(Number(e.target.value))}
            aria-label="Filter by case"
          >
            <option value={0}>All cases</option>
            {data.cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="search-wrap compact">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search title, reference number, notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search submissions"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Submissions List */}
      <div className="submissions-list-container">
        {sortedSubmissions.length > 0 ? (
          sortedSubmissions.map((sub) => {
            const caseObj = data.cases.find((c) => c.id === sub.caseId);
            const docObj = sub.documentId
              ? data.documents.find((d) => d.id === sub.documentId)
              : null;
            const nextStatus = getNextSubmissionStatus(sub.status);

            return (
              <div key={sub.id} className="panel submission-card">
                {/* Header row */}
                <div className="submission-card-header">
                  <div className="submission-title-area">
                    <span className="submission-icon">
                      <FileText size={20} />
                    </span>
                    <div>
                      <div className="submission-pill-row">
                        <span
                          className={`sub-tag-badge ${getFiledByTone(
                            sub.filedBy,
                          )}`}
                        >
                          Filed by {sub.filedBy}
                        </span>
                        <span className="sub-type-badge">
                          {sub.submissionType}
                        </span>
                        <Badge tone={getStatusBadgeTone(sub.status)}>
                          {sub.status}
                        </Badge>
                      </div>
                      <h3 className="submission-card-title">{sub.title}</h3>
                    </div>
                  </div>

                  <div className="submission-card-top-actions">
                    <button
                      type="button"
                      className="icon-button compact-btn text-danger"
                      title="Remove submission"
                      onClick={() => deleteSubmission(sub.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Status Progression Stepper */}
                <div className="submission-stepper">
                  <p className="stepper-label">PROGRESSION PIPELINE</p>
                  <div className="stepper-track">
                    {SUBMISSION_STATUS_ORDER.map((stepStatus, idx) => {
                      const isObjected = sub.status === "Objected";
                      const currentIdx = SUBMISSION_STATUS_ORDER.indexOf(
                        sub.status as (typeof SUBMISSION_STATUS_ORDER)[number],
                      );
                      const isPassed = !isObjected && currentIdx >= idx;
                      const isCurrent = !isObjected && sub.status === stepStatus;

                      return (
                        <div
                          key={stepStatus}
                          className={`stepper-node ${isPassed ? "passed" : ""} ${
                            isCurrent ? "current" : ""
                          }`}
                        >
                          <div className="stepper-dot">
                            {isPassed && !isCurrent ? (
                              <Check size={12} />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                          <span className="stepper-text">{stepStatus}</span>
                          {idx < SUBMISSION_STATUS_ORDER.length - 1 && (
                            <div
                              className={`stepper-line ${
                                isPassed && !isCurrent ? "passed" : ""
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                    {sub.status === "Objected" && (
                      <div className="stepper-objected-badge">
                        <AlertCircle size={13} />
                        <span>Objections Noted · Requires Compliance</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Meta Row */}
                <div className="submission-meta-grid">
                  <div className="meta-item">
                    <span className="meta-item-label">Filing Date</span>
                    <span className="meta-item-value">
                      <Calendar size={13} className="inline mr-1 text-muted" />
                      {dateLabel(sub.filingDate)}
                    </span>
                  </div>

                  <div className="meta-item">
                    <span className="meta-item-label">Court Filing Reference</span>
                    <span className="meta-item-value filing-ref">
                      {sub.courtFilingNumber || "Unassigned / Pending Diary #"}
                    </span>
                  </div>

                  {caseObj && (
                    <div className="meta-item">
                      <span className="meta-item-label">Associated Case</span>
                      <span className="meta-item-value">
                        <Scale size={13} className="inline mr-1 text-muted" />
                        {caseObj.title}
                      </span>
                    </div>
                  )}

                  {sub.responseDeadline && (
                    <div className="meta-item">
                      <span className="meta-item-label">Response Deadline</span>
                      <span className="meta-item-value text-amber">
                        <Clock size={13} className="inline mr-1" />
                        {dateLabel(sub.responseDeadline)}
                      </span>
                    </div>
                  )}

                  {docObj && (
                    <div className="meta-item">
                      <span className="meta-item-label">Vault Document</span>
                      <span className="meta-item-value text-link">
                        <Paperclip size={13} className="inline mr-1" />
                        {docObj.originalName}
                      </span>
                    </div>
                  )}
                </div>

                {sub.notes && (
                  <p className="submission-notes-box">{sub.notes}</p>
                )}

                {/* Progression Action Controls */}
                <div className="submission-action-footer">
                  <div className="status-advance-actions">
                    {nextStatus && (
                      <button
                        type="button"
                        className="button secondary compact"
                        onClick={() => updateSubmissionStatus(sub.id, nextStatus)}
                      >
                        Advance to {nextStatus} <ArrowRight size={13} />
                      </button>
                    )}

                    {sub.status !== "Taken on record" && (
                      <button
                        type="button"
                        className="button light compact"
                        onClick={() =>
                          updateSubmissionStatus(sub.id, "Taken on record")
                        }
                      >
                        <CheckCircle2 size={13} /> Mark Taken on record
                      </button>
                    )}

                    {sub.status !== "Objected" && (
                      <button
                        type="button"
                        className="button light compact text-danger"
                        onClick={() =>
                          updateSubmissionStatus(sub.id, "Objected")
                        }
                      >
                        <AlertCircle size={13} /> Flag Objections
                      </button>
                    )}
                  </div>

                  <div className="manual-status-selector">
                    <span className="status-sel-label">Set status:</span>
                    <select
                      className="select micro"
                      value={sub.status}
                      onChange={(e) =>
                        updateSubmissionStatus(
                          sub.id,
                          e.target.value as SubmissionStatus,
                        )
                      }
                      aria-label="Change status manually"
                    >
                      {ALL_SUBMISSION_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <Empty
            title="No legal submissions match your criteria"
            action={
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setSelectedStatus("All");
                  setSelectedType("All");
                  setSelectedFiledBy("All");
                  setSearchQuery("");
                }}
              >
                <RotateCcw size={15} /> Reset filters
              </button>
            }
          >
            Try adjusting your search query, status, or submission type filter.
          </Empty>
        )}
      </div>

      {/* ADD SUBMISSION MODAL */}
      {modalOpen && (
        <Modal
          title="Record Legal Submission"
          description={
            demo
              ? "[Synthetic demo] Log a drafted petition, affidavit, or court filing."
              : "Track a legal filing in your personal workspace."
          }
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleAddSubmission}>
            {formError && (
              <div className="callout warning mb-4" role="alert">
                <AlertCircle size={15} className="inline mr-2" />
                {formError}
              </div>
            )}

            <Field label="Case" hint="Select the case proceeding">
              <select
                name="caseId"
                defaultValue={selectedCase || data.cases[0]?.id || 1}
              >
                {data.cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Title / Pleading Name" hint="e.g. Affidavit of Assets & Liabilities">
              <input
                type="text"
                name="title"
                required
                placeholder="Formal name of the application or pleading"
                autoFocus
              />
            </Field>

            <div className="grid-2-cols">
              <Field label="Submission Type">
                <select name="submissionType" defaultValue="Petition">
                  {SUBMISSION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Filed By">
                <select name="filedBy" defaultValue="Applicant">
                  <option value="Applicant">Applicant (Self)</option>
                  <option value="Respondent">Respondent (Opposite Party)</option>
                  <option value="Court">Court / Registry</option>
                </select>
              </Field>
            </div>

            <div className="grid-2-cols">
              <Field label="Filing Date" hint="YYYY-MM-DD">
                <input
                  type="date"
                  name="filingDate"
                  required
                  defaultValue={asOf}
                />
              </Field>

              <Field label="Initial Status">
                <select name="status" defaultValue="Drafted">
                  {ALL_SUBMISSION_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid-2-cols">
              <Field label="Court Filing Number (Optional)" hint="e.g. DEMO/FC/ND/2026/0142-P">
                <input
                  type="text"
                  name="courtFilingNumber"
                  placeholder="Registry diary # or CNR reference"
                />
              </Field>

              <Field label="Response Deadline (Optional)" hint="YYYY-MM-DD">
                <input type="date" name="responseDeadline" />
              </Field>
            </div>

            <Field label="Link Document Vault File (Optional)">
              <select name="documentId" defaultValue="">
                <option value="">None / Not linked</option>
                {data.documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.originalName} ({d.documentType})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes & Context" hint="Summary of relief prayed or registry remarks">
              <textarea
                name="notes"
                rows={3}
                placeholder="Include prayer details, annexure count, or court directions"
              />
            </Field>

            {demo && (
              <div className="callout info mb-4">
                <ShieldCheck size={15} className="inline mr-2" />
                This submission will be added in-memory to your demo session.
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                Save Submission
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
