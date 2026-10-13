"use client";

import { useState, type FormEvent } from "react";
import {
  Scale,
  Building2,
  Calendar,
  History,
  ShieldCheck,
  Plus,
  Info,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Empty, Field, Modal, PageHeading } from "./ui";
import { dateLabel } from "@/lib/ledger";
import type { BenchAssignment, BenchType, BenchStatus } from "@/lib/types";
import {
  getCurrentBenchAssignment,
  getHistoricalBenchAssignments,
  filterBenchAssignmentsByCase,
} from "@/lib/timeline-diary";

export function BenchHistory({
  caseId: propCaseId,
  standalone = false,
}: {
  caseId?: number;
  standalone?: boolean;
}) {
  const {
    data,
    demo,
    asOf,
    selectedCase,
    setSelectedCase,
    addBenchAssignment,
  } = useWorkspace();

  const activeCaseId = propCaseId !== undefined ? propCaseId : selectedCase;
  const activeCase = data.cases.find((c) => c.id === activeCaseId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const allCaseAssignments = filterBenchAssignmentsByCase(
    data.benchAssignments,
    activeCaseId,
  );
  const currentBench = getCurrentBenchAssignment(
    data.benchAssignments,
    activeCaseId,
  );
  const historicalBenches = getHistoricalBenchAssignments(
    data.benchAssignments,
    activeCaseId,
  );

  function handleAddBench(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);
    const judgeName = String(form.get("judgeName") || "").trim();
    const courtName = String(form.get("courtName") || "").trim();
    const courtroom = String(form.get("courtroom") || "").trim();
    const benchType = String(
      form.get("benchType") || "Single Bench",
    ) as BenchType;
    const assignedDate = String(form.get("assignedDate") || "").trim();
    const status = String(form.get("status") || "Active") as BenchStatus;
    const presidingNotes = String(form.get("presidingNotes") || "").trim();
    const targetCaseId = Number(
      form.get("caseId") || activeCaseId || data.cases[0]?.id || 1,
    );

    if (!judgeName) {
      setFormError("Judge name is required.");
      return;
    }
    if (!courtName) {
      setFormError("Court name is required.");
      return;
    }
    if (!assignedDate) {
      setFormError("Assignment date is required.");
      return;
    }

    addBenchAssignment({
      caseId: targetCaseId,
      judgeName,
      courtName,
      courtroom: courtroom || "Courtroom not specified",
      benchType,
      assignedDate,
      status,
      presidingNotes: presidingNotes || undefined,
    });

    setDialogOpen(false);
  }

  return (
    <div className="bench-history-section" aria-label="Judge and Bench History">
      {standalone && (
        <PageHeading
          eyebrow="JUDICIAL ROSTER"
          title="Judge & Bench History"
          description="Track the presiding judge, courtroom roster changes, and bench transfers over the lifetime of your case."
        >
          <button
            type="button"
            className="button primary"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={16} />
            Record bench
          </button>
        </PageHeading>
      )}

      {/* Demo / Live Status Banner */}
      <div className="callout mb-5">
        <Info size={16} />
        <div>
          {demo ? (
            <span>
              <strong>Demonstration Judicial Roster</strong>: Presiding officers
              and courtroom allocations are synthetic demonstration data.
            </span>
          ) : (
            <span>
              <strong>Session In-Memory Records</strong>: Bench assignments are
              maintained in-memory. Live case service roster synchronization is
              not yet connected.
            </span>
          )}
        </div>
      </div>

      {/* Case filter toolbar if multiple cases exist and no specific case pinned */}
      {propCaseId === undefined && data.cases.length > 1 && (
        <div className="table-toolbar mb-5">
          <div className="case-selector">
            <label htmlFor="bench-case-filter">Filter by case:</label>
            <select
              id="bench-case-filter"
              value={selectedCase}
              onChange={(e) => setSelectedCase(Number(e.target.value))}
            >
              <option value={0}>
                All cases ({data.benchAssignments.length} records)
              </option>
              {data.cases.map((c) => (
                <option key={c.id} value={c.id}>
                  Case #{c.id} · {c.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="button secondary compact"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={14} />
            Add bench record
          </button>
        </div>
      )}

      {allCaseAssignments.length === 0 ? (
        <Empty
          title="No bench assignments recorded"
          action={
            <button
              type="button"
              className="button secondary"
              onClick={() => setDialogOpen(true)}
            >
              <Plus size={15} />
              Record bench assignment
            </button>
          }
        >
          {activeCase
            ? `No presiding judge or court roster has been recorded for ${activeCase.title}.`
            : "No presiding judge or court roster assignments are currently recorded."}
        </Empty>
      ) : (
        <div className="bench-cards-container">
          {/* Current Presiding Bench */}
          {currentBench ? (
            <div className="panel current-bench-card mb-6">
              <div className="panel-heading">
                <div className="flex items-center gap-2">
                  <span className="current-bench-icon">
                    <Scale size={20} />
                  </span>
                  <div>
                    <p className="eyebrow">CURRENT PRESIDING ROSTER</p>
                    <h2>{currentBench.judgeName}</h2>
                  </div>
                </div>
                <Badge tone="positive">
                  <CheckCircle2 size={13} className="inline mr-1" />
                  Active Bench
                </Badge>
              </div>

              <div className="bench-meta-grid">
                <div className="bench-meta-item">
                  <span className="bench-meta-label">Court & Forum</span>
                  <span className="bench-meta-value">
                    <Building2 size={14} className="inline mr-1 text-muted" />
                    {currentBench.courtName || "Not specified"}
                  </span>
                </div>

                <div className="bench-meta-item">
                  <span className="bench-meta-label">Courtroom</span>
                  <span className="bench-meta-value">
                    {currentBench.courtroom || "Courtroom not specified"}
                  </span>
                </div>

                <div className="bench-meta-item">
                  <span className="bench-meta-label">Bench Composition</span>
                  <span className="bench-meta-value">
                    {currentBench.benchType}
                  </span>
                </div>

                <div className="bench-meta-item">
                  <span className="bench-meta-label">Assigned Date</span>
                  <span className="bench-meta-value">
                    <Calendar size={14} className="inline mr-1 text-muted" />
                    {dateLabel(currentBench.assignedDate)}
                  </span>
                </div>
              </div>

              {currentBench.presidingNotes && (
                <div className="bench-notes-box mt-4">
                  <p className="muted small">
                    <strong>Notes:</strong> {currentBench.presidingNotes}
                  </p>
                </div>
              )}

              {demo && (
                <div className="synthetic-badge-pill mt-3">
                  <ShieldCheck size={12} />
                  <span>Synthetic demo assignment</span>
                </div>
              )}
            </div>
          ) : (
            <div className="callout warning mb-6">
              <span>
                No actively designated presiding bench assignment. Review
                historical roster below.
              </span>
            </div>
          )}

          {/* Historical Assignments */}
          <div className="panel historical-bench-panel">
            <div className="panel-heading">
              <div className="flex items-center gap-2">
                <History size={18} className="text-muted" />
                <h3>Historical Judicial Assignments & Transfers</h3>
              </div>
              <span className="small muted">
                {historicalBenches.length}{" "}
                {historicalBenches.length === 1
                  ? "past assignment"
                  : "past assignments"}
              </span>
            </div>

            {historicalBenches.length === 0 ? (
              <p className="muted small p-4">
                No past bench transfers recorded. The current bench has presided
                since institution.
              </p>
            ) : (
              <div className="historical-bench-list">
                {historicalBenches.map((b) => (
                  <div key={b.id} className="historical-bench-row">
                    <div className="historical-bench-header">
                      <div>
                        <h4>{b.judgeName}</h4>
                        <p className="small muted">
                          {b.courtName} ·{" "}
                          {b.courtroom || "Courtroom not specified"}
                        </p>
                      </div>
                      <Badge tone="neutral">
                        {b.status === "Transferred" ? "Transferred" : b.status}
                      </Badge>
                    </div>

                    <div className="historical-bench-details">
                      <span className="small">
                        <strong>Bench:</strong> {b.benchType}
                      </span>
                      <span className="small">
                        <strong>Tenure:</strong> {dateLabel(b.assignedDate)}{" "}
                        {b.transferredDate
                          ? `— ${dateLabel(b.transferredDate)}`
                          : "(Transferred)"}
                      </span>
                    </div>

                    {b.presidingNotes && (
                      <p className="historical-bench-notes small muted">
                        {b.presidingNotes}
                      </p>
                    )}

                    {demo && (
                      <span className="synthetic-mini-label">
                        [Synthetic demo record]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Bench Assignment Modal */}
      {dialogOpen && (
        <Modal
          title="Record Bench Assignment"
          description="Log the presiding judge, courtroom, and bench type for your case records."
          onClose={() => setDialogOpen(false)}
        >
          <form onSubmit={handleAddBench}>
            {formError && (
              <div className="callout warning mb-4" role="alert">
                {formError}
              </div>
            )}

            <Field
              label="Case"
              hint="Select the case associated with this judicial assignment."
            >
              <select
                name="caseId"
                defaultValue={activeCaseId || data.cases[0]?.id}
              >
                {data.cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    Case #{c.id}: {c.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Presiding Judge Name"
              hint="Full title and name of presiding judicial officer."
            >
              <input
                name="judgeName"
                placeholder="e.g. Judge A. K. Sen (Principal Family Judge)"
                required
              />
            </Field>

            <div className="grid-2 gap-4">
              <Field label="Court Name" hint="Name of the court or forum.">
                <input
                  name="courtName"
                  defaultValue="Family Court, New Delhi"
                  required
                />
              </Field>

              <Field label="Courtroom" hint="Courtroom number or division.">
                <input name="courtroom" defaultValue="Courtroom 3" />
              </Field>
            </div>

            <div className="grid-2 gap-4">
              <Field label="Bench Composition">
                <select name="benchType" defaultValue="Single Bench">
                  <option value="Single Bench">Single Bench</option>
                  <option value="Division Bench">Division Bench</option>
                </select>
              </Field>

              <Field label="Status">
                <select name="status" defaultValue="Active">
                  <option value="Active">Active (Current Presiding)</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Retired">Retired</option>
                </select>
              </Field>
            </div>

            <Field
              label="Assignment Date"
              hint="Date when the bench assumed jurisdiction."
            >
              <input
                type="date"
                name="assignedDate"
                defaultValue={demo ? "2026-05-01" : asOf}
                required
              />
            </Field>

            <Field
              label="Presiding Notes (Optional)"
              hint="Any administrative roster notes or roster transfer details."
            >
              <textarea
                name="presidingNotes"
                rows={3}
                placeholder="Notes on judicial bench assignment, transfer notifications, etc."
              />
            </Field>

            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                Save bench record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
