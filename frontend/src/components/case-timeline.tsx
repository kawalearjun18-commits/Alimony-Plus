"use client";

import { useState, useId, type FormEvent } from "react";
import {
  Clock3,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  Scale,
  Building2,
  FileText,
  Search,
  ArrowUpDown,
  RotateCcw,
  ShieldCheck,
  Info,
  Layers,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Empty, Field, Modal, PageHeading } from "./ui";
import { dateLabel } from "@/lib/ledger";
import type {
  MilestoneEvent,
  MilestoneStage,
  MilestoneStatus,
} from "@/lib/types";
import {
  sortMilestonesChronologically,
  filterMilestones,
} from "@/lib/timeline-diary";
import { BenchHistory } from "./bench-history";

const STAGES: ("All" | MilestoneStage)[] = [
  "All",
  "Filing",
  "Summons & Notice",
  "Interim Application",
  "Pleadings",
  "Evidence",
  "Arguments",
  "Final Order",
];

const STATUSES: ("All" | MilestoneStatus)[] = [
  "All",
  "Completed",
  "In progress",
  "Scheduled",
  "Adjourned",
];

export function CaseTimeline() {
  const { data, demo, asOf, selectedCase, setSelectedCase, addMilestone } =
    useWorkspace();

  const [activeTab, setActiveTab] = useState<"timeline" | "bench">("timeline");
  const [selectedStage, setSelectedStage] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const filteredMilestones = filterMilestones(data.milestones, {
    stage: selectedStage,
    status: selectedStatus,
    caseId: selectedCase,
    searchQuery,
  });

  const sortedMilestones = sortMilestonesChronologically(
    filteredMilestones,
    sortDirection,
  );

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleExpandAll() {
    setExpandedIds(new Set(sortedMilestones.map((m) => m.id)));
  }

  function handleCollapseAll() {
    setExpandedIds(new Set());
  }

  function resetFilters() {
    setSelectedStage("All");
    setSelectedStatus("All");
    setSearchQuery("");
  }

  function handleAddMilestone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim();
    const date = String(form.get("date") || "").trim();
    const stage = String(form.get("stage") || "Filing") as MilestoneStage;
    const status = String(form.get("status") || "Scheduled") as MilestoneStatus;
    const courtroom = String(form.get("courtroom") || "").trim();
    const description = String(form.get("description") || "").trim();
    const notes = String(form.get("notes") || "").trim();
    const targetCaseId = Number(
      form.get("caseId") || selectedCase || data.cases[0]?.id || 1,
    );

    if (!title) {
      setFormError("Milestone title is required.");
      return;
    }
    if (!date) {
      setFormError("Milestone date is required.");
      return;
    }

    addMilestone({
      caseId: targetCaseId,
      title,
      date,
      stage,
      status,
      courtroom: courtroom || undefined,
      description: description || undefined,
      notes: notes || undefined,
    });

    setModalOpen(false);
  }

  function renderStatusBadge(status: MilestoneStatus) {
    switch (status) {
      case "Completed":
        return (
          <Badge tone="positive">
            <CheckCircle2 size={12} className="inline mr-1" />
            Completed
          </Badge>
        );
      case "In progress":
        return (
          <Badge tone="amber">
            <Clock size={12} className="inline mr-1" />
            In progress
          </Badge>
        );
      case "Scheduled":
        return (
          <Badge tone="neutral">
            <Calendar size={12} className="inline mr-1" />
            Scheduled
          </Badge>
        );
      case "Adjourned":
        return (
          <Badge tone="warning">
            <AlertCircle size={12} className="inline mr-1" />
            Adjourned
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <div className="case-timeline-view" aria-label="Interactive Court Timeline">
      <PageHeading
        eyebrow="LEGAL PROGRESSION"
        title="Interactive Court Timeline"
        description="Track procedural stages, hearings, evidence filing, and judicial roster changes chronologically."
      >
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
          }
          aria-label={`Sort ${sortDirection === "asc" ? "latest first" : "earliest first"}`}
        >
          <ArrowUpDown size={15} />
          {sortDirection === "asc" ? "Oldest First" : "Newest First"}
        </button>
        <button
          type="button"
          className="button primary"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={16} />
          New milestone
        </button>
      </PageHeading>

      {/* View Switcher: Timeline vs Bench History */}
      <div
        className="timeline-view-switcher mb-5"
        role="tablist"
        aria-label="Timeline navigation"
      >
        <button
          role="tab"
          aria-selected={activeTab === "timeline"}
          className={`view-switch-btn ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          <Clock3 size={15} />
          <span>Procedural Timeline ({data.milestones.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "bench"}
          className={`view-switch-btn ${activeTab === "bench" ? "active" : ""}`}
          onClick={() => setActiveTab("bench")}
        >
          <Scale size={15} />
          <span>Bench & Judicial Roster ({data.benchAssignments.length})</span>
        </button>
      </div>

      {activeTab === "bench" ? (
        <BenchHistory standalone={false} />
      ) : (
        <>
          {/* Demo / Privacy Notice */}
          <div className="callout mb-5">
            <Info size={16} />
            <div>
              {demo ? (
                <span>
                  <strong>Demonstration Timeline</strong>: Milestones and dates
                  are synthetic legal records formatted for review. Changes are
                  maintained in-memory.
                </span>
              ) : (
                <span>
                  <strong>Session In-Memory Records</strong>: Timeline
                  milestones are stored in-memory during this session. Case
                  service backend persistence is not yet connected.
                </span>
              )}
            </div>
          </div>

          {/* Filtering and Controls Toolbar */}
          <div className="panel timeline-toolbar-panel mb-6">
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search milestone title, notes, court..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search milestones"
                />
              </div>

              {data.cases.length > 1 && (
                <div className="case-selector">
                  <label htmlFor="timeline-case-select">Case:</label>
                  <select
                    id="timeline-case-select"
                    value={selectedCase}
                    onChange={(e) => setSelectedCase(Number(e.target.value))}
                  >
                    <option value={0}>All cases</option>
                    {data.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        Case #{c.id}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={handleExpandAll}
                >
                  Expand all
                </button>
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={handleCollapseAll}
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* Stage Filter Tabs */}
            <div className="filter-group mt-3">
              <span className="filter-group-label">Stage:</span>
              <div
                className="filter-tabs"
                role="group"
                aria-label="Filter by milestone stage"
              >
                {STAGES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={selectedStage === st ? "selected" : ""}
                    onClick={() => setSelectedStage(st)}
                    aria-pressed={selectedStage === st}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="filter-group mt-2">
              <span className="filter-group-label">Status:</span>
              <div
                className="filter-tabs"
                role="group"
                aria-label="Filter by milestone status"
              >
                {STATUSES.map((stat) => (
                  <button
                    key={stat}
                    type="button"
                    className={selectedStatus === stat ? "selected" : ""}
                    onClick={() => setSelectedStatus(stat)}
                    aria-pressed={selectedStatus === stat}
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline Feed */}
          {sortedMilestones.length === 0 ? (
            <Empty
              title="No milestones match your filters"
              action={
                <button
                  type="button"
                  className="button secondary"
                  onClick={resetFilters}
                >
                  <RotateCcw size={15} />
                  Reset all filters
                </button>
              }
            >
              Try choosing different stages or statuses, or clear the search
              query.
            </Empty>
          ) : (
            <div
              className="timeline-interactive-feed"
              role="feed"
              aria-label="Milestones timeline feed"
            >
              {sortedMilestones.map((m, index) => {
                const isExpanded = expandedIds.has(m.id);
                const isUpcoming = m.date >= asOf;
                const caseRecord = data.cases.find((c) => c.id === m.caseId);

                return (
                  <article
                    key={m.id}
                    className={`timeline-milestone-card ${m.status.toLowerCase().replace(/\s+/g, "-")} ${isUpcoming ? "is-upcoming" : "is-past"}`}
                    aria-expanded={isExpanded}
                  >
                    {/* Visual Connector Dot */}
                    <div className="timeline-rail">
                      <span
                        className={`milestone-status-pin ${m.status.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      {index < sortedMilestones.length - 1 && (
                        <span className="milestone-rail-line" />
                      )}
                    </div>

                    <div className="milestone-card-body">
                      <div className="milestone-header">
                        <div className="milestone-badges">
                          <span className="milestone-date-label">
                            <Calendar
                              size={13}
                              className="inline mr-1 text-muted"
                            />
                            {dateLabel(m.date)}
                          </span>
                          <span className="milestone-stage-tag">{m.stage}</span>
                          {renderStatusBadge(m.status)}
                          {caseRecord && !selectedCase && (
                            <span className="milestone-case-tag">
                              Case #{caseRecord.id}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="icon-button compact-expand-btn"
                          onClick={() => toggleExpand(m.id)}
                          aria-label={
                            isExpanded
                              ? `Collapse details for ${m.title}`
                              : `Expand details for ${m.title}`
                          }
                          aria-controls={`details-${m.id}`}
                        >
                          {isExpanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      </div>

                      <h3
                        className="milestone-title"
                        onClick={() => toggleExpand(m.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleExpand(m.id);
                          }
                        }}
                      >
                        {m.title}
                      </h3>

                      {m.courtroom && (
                        <p className="milestone-courtroom small muted">
                          <Building2 size={13} className="inline mr-1" />
                          {m.courtroom}
                        </p>
                      )}

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div
                          id={`details-${m.id}`}
                          className="milestone-expanded-details mt-3"
                        >
                          {m.description && (
                            <p className="milestone-desc small mb-3">
                              {m.description}
                            </p>
                          )}

                          {m.notes && (
                            <div className="milestone-notes-callout mb-3">
                              <span className="font-semibold block mb-1">
                                Procedural Notes:
                              </span>
                              <p className="small muted">{m.notes}</p>
                            </div>
                          )}

                          <div className="milestone-linked-records flex flex-wrap gap-2">
                            {m.orderId && (
                              <span className="linked-record-chip">
                                <Scale size={12} />
                                Court Order #{m.orderId}
                              </span>
                            )}
                            {m.documentId && (
                              <span className="linked-record-chip">
                                <FileText size={12} />
                                Document #{m.documentId}
                              </span>
                            )}
                          </div>

                          {demo && (
                            <div className="synthetic-badge-pill mt-3">
                              <ShieldCheck size={12} />
                              <span>Synthetic demonstration milestone</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Milestone Modal */}
      {modalOpen && (
        <Modal
          title="Record Court Milestone"
          description="Log procedural stages, hearings, orders, or arguments in your timeline."
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleAddMilestone}>
            {formError && (
              <div className="callout warning mb-4" role="alert">
                {formError}
              </div>
            )}

            <Field label="Case" hint="Case record linked to this milestone.">
              <select
                name="caseId"
                defaultValue={selectedCase || data.cases[0]?.id}
              >
                {data.cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    Case #{c.id}: {c.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Milestone Title"
              hint="Clear descriptive title of the court event."
            >
              <input
                name="title"
                placeholder="e.g. Interim Maintenance Hearing or Cross-Examination"
                required
              />
            </Field>

            <div className="grid-2 gap-4">
              <Field
                label="Milestone Date"
                hint="Date of milestone occurrence or scheduled date."
              >
                <input
                  type="date"
                  name="date"
                  defaultValue={demo ? "2026-10-16" : asOf}
                  required
                />
              </Field>

              <Field label="Procedural Stage">
                <select name="stage" defaultValue="Filing">
                  {STAGES.filter((s) => s !== "All").map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid-2 gap-4">
              <Field label="Status">
                <select name="status" defaultValue="Scheduled">
                  {STATUSES.filter((s) => s !== "All").map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Courtroom (Optional)">
                <input name="courtroom" defaultValue="Courtroom 3" />
              </Field>
            </div>

            <Field
              label="Description (Optional)"
              hint="Detailed procedural summary."
            >
              <textarea
                name="description"
                rows={3}
                placeholder="Details of arguments, filings, notices, or court proceedings..."
              />
            </Field>

            <Field
              label="Notes (Optional)"
              hint="Personal or counsel reminders."
            >
              <textarea
                name="notes"
                rows={2}
                placeholder="Counsel advised compiling certified bank statements..."
              />
            </Field>

            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                Save milestone
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
