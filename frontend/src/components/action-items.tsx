"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Square,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Plus,
  Flame,
  Scale,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Tag,
  Trash2,
  RotateCcw,
  CalendarDays,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Empty, Field, Modal, PageHeading } from "./ui";
import { dateLabel } from "@/lib/ledger";
import type {
  ActionItem,
  ActionItemPriority,
  ActionItemCategory,
  CalendarEvent,
} from "@/lib/types";
import {
  ACTION_CATEGORIES,
  ACTION_PRIORITIES,
  filterActionItems,
  sortActionItems,
  getActionItemUrgency,
  getDaysUntilDue,
  validateActionItemInput,
} from "@/lib/calendar-submissions-actions";

export function ActionItems() {
  const {
    data,
    demo,
    asOf,
    selectedCase,
    setSelectedCase,
    addActionItem,
    toggleActionItem,
    deleteActionItem,
  } = useWorkspace();

  const router = useRouter();

  // Filters
  const [statusTab, setStatusTab] = useState<"All" | "Pending" | "Completed">(
    "All",
  );
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "title">(
    "dueDate",
  );

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const filteredItems = filterActionItems(data.actionItems, {
    caseId: selectedCase,
    status: statusTab,
    priority: selectedPriority,
    category: selectedCategory,
    searchQuery,
  });

  const sortedItems = sortActionItems(filteredItems, sortBy, "asc");

  // Summary counts
  const totalTasks = data.actionItems.length;
  const pendingTasks = data.actionItems.filter((i) => !i.completed).length;
  const completedTasks = data.actionItems.filter((i) => i.completed).length;
  const highPriorityPending = data.actionItems.filter(
    (i) => !i.completed && i.priority === "High",
  ).length;

  function handleAddTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim();
    const dueDate = String(form.get("dueDate") || asOf).trim();
    const priority = String(
      form.get("priority") || "Normal",
    ) as ActionItemPriority;
    const category = String(
      form.get("category") || "Compliance",
    ) as ActionItemCategory;
    const description = String(form.get("description") || "").trim();
    const linkedEventVal = form.get("linkedCalendarEventId");
    const linkedCalendarEventId = linkedEventVal
      ? Number(linkedEventVal)
      : undefined;
    const targetCaseId = Number(
      form.get("caseId") || selectedCase || data.cases[0]?.id || 1,
    );

    const validation = validateActionItemInput({
      title,
      dueDate,
      priority,
      category,
      caseId: targetCaseId,
    });

    if (!validation.valid) {
      setFormError(validation.errors[0] || "Please check the form inputs.");
      return;
    }

    addActionItem({
      caseId: targetCaseId,
      title,
      dueDate,
      priority,
      category,
      description:
        description ||
        (demo
          ? `[Synthetic demo task] Action checklist item for case preparation.`
          : undefined),
      completed: false,
      linkedCalendarEventId:
        linkedCalendarEventId && linkedCalendarEventId > 0
          ? linkedCalendarEventId
          : undefined,
    });

    setModalOpen(false);
  }

  function getPriorityBadge(priority: ActionItemPriority) {
    switch (priority) {
      case "High":
        return (
          <span className="priority-badge high">
            <Flame size={12} /> High Priority
          </span>
        );
      case "Medium":
        return (
          <span className="priority-badge medium">
            <Clock size={12} /> Medium
          </span>
        );
      case "Normal":
      default:
        return (
          <span className="priority-badge normal">
            <Tag size={12} /> Normal
          </span>
        );
    }
  }

  function getUrgencyBadge(item: ActionItem) {
    const urgency = getActionItemUrgency(item, asOf);
    const days = getDaysUntilDue(item.dueDate, asOf);

    if (item.completed) {
      return (
        <span className="urgency-pill completed">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    }

    switch (urgency) {
      case "overdue":
        return (
          <span className="urgency-pill overdue">
            <AlertCircle size={12} /> Overdue by {Math.abs(days)}d
          </span>
        );
      case "due-today":
        return (
          <span className="urgency-pill due-today">
            <Clock size={12} /> Due Today
          </span>
        );
      case "upcoming":
      default:
        return (
          <span className="urgency-pill upcoming">
            <Calendar size={12} /> Due in {days}d
          </span>
        );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="CASE COMPLIANCE"
        title="Action Items & Tasks"
        description="Stay on top of document filings, certified copy applications, and court appearance steps."
      >
        <button
          className="button primary"
          onClick={() => {
            setFormError("");
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          Add action item
        </button>
      </PageHeading>

      {/* Summary Metrics */}
      <div className="tasks-metrics-grid">
        <div className="metric-box">
          <span className="metric-num">{totalTasks}</span>
          <span className="metric-label">Total Tasks</span>
          <small className="metric-sub">Across all cases</small>
        </div>
        <div className="metric-box">
          <span className="metric-num text-amber">{pendingTasks}</span>
          <span className="metric-label">Pending</span>
          <small className="metric-sub">Requires action</small>
        </div>
        <div className="metric-box">
          <span className="metric-num text-red">{highPriorityPending}</span>
          <span className="metric-label">High Priority</span>
          <small className="metric-sub">Urgent attention needed</small>
        </div>
        <div className="metric-box">
          <span className="metric-num text-green">{completedTasks}</span>
          <span className="metric-label">Completed</span>
          <small className="metric-sub">Successfully done</small>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="tasks-toolbar">
        {/* Status Tabs */}
        <div className="view-mode-toggle" role="group" aria-label="Task status tabs">
          {(["All", "Pending", "Completed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`pill-btn ${statusTab === tab ? "active" : ""}`}
              onClick={() => setStatusTab(tab)}
            >
              {tab === "All" && `All (${totalTasks})`}
              {tab === "Pending" && `Pending (${pendingTasks})`}
              {tab === "Completed" && `Completed (${completedTasks})`}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="filter-group">
          <span className="filter-group-label">Priority:</span>
          <select
            className="select compact"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="All">All priorities</option>
            {ACTION_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="filter-group">
          <span className="filter-group-label">Category:</span>
          <select
            className="select compact"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="All">All categories</option>
            {ACTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Case Filter */}
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

        {/* Search */}
        <div className="search-wrap compact">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search tasks & steps…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search action items"
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

      {/* Task Checklist Panel */}
      <div className="panel tasks-panel">
        <div className="tasks-panel-header">
          <div>
            <h3>Your Action Checklist</h3>
            <p className="muted">
              Tick items off as you gather records and attend hearings.
            </p>
          </div>
          <div className="sort-control">
            <span className="sort-label">Sort:</span>
            <select
              className="select micro"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "dueDate" | "priority" | "title")
              }
              aria-label="Sort action items"
            >
              <option value="dueDate">Due Date (Earliest)</option>
              <option value="priority">Priority (High first)</option>
              <option value="title">Alphabetical Title</option>
            </select>
          </div>
        </div>

        {sortedItems.length > 0 ? (
          <div className="tasks-checklist-list" role="list">
            {sortedItems.map((item) => {
              const caseObj = data.cases.find((c) => c.id === item.caseId);
              const linkedEvent = item.linkedCalendarEventId
                ? data.calendarEvents.find(
                    (e) => e.id === item.linkedCalendarEventId,
                  )
                : null;

              return (
                <div
                  key={item.id}
                  role="listitem"
                  className={`task-row ${item.completed ? "is-completed" : ""}`}
                >
                  {/* Accessible Checkbox Button */}
                  <button
                    type="button"
                    className={`task-checkbox-btn ${
                      item.completed ? "checked" : ""
                    }`}
                    onClick={() => toggleActionItem(item.id)}
                    aria-label={`Mark "${item.title}" as ${
                      item.completed ? "pending" : "completed"
                    }`}
                    aria-checked={item.completed}
                    role="checkbox"
                  >
                    {item.completed ? (
                      <CheckCircle2 size={20} className="check-icon" />
                    ) : (
                      <Square size={20} className="uncheck-icon" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="task-content">
                    <div className="task-top-badges">
                      {getPriorityBadge(item.priority)}
                      <span className="task-category-tag">{item.category}</span>
                      {getUrgencyBadge(item)}
                    </div>

                    <h4
                      className={`task-title ${
                        item.completed ? "strikethrough" : ""
                      }`}
                      onClick={() => toggleActionItem(item.id)}
                    >
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="task-desc">{item.description}</p>
                    )}

                    <div className="task-meta-bar">
                      <span className="task-meta-item">
                        <Calendar size={13} className="inline mr-1 text-muted" />
                        Due: {dateLabel(item.dueDate)}
                      </span>

                      {item.completed && item.completedAt && (
                        <span className="task-meta-item text-green">
                          <CheckCircle2
                            size={13}
                            className="inline mr-1 text-green"
                          />
                          Done on {dateLabel(item.completedAt)}
                        </span>
                      )}

                      {caseObj && (
                        <span className="task-meta-item">
                          <Scale size={13} className="inline mr-1 text-muted" />
                          {caseObj.title}
                        </span>
                      )}

                      {/* Linked Calendar Event Link */}
                      {linkedEvent && (
                        <button
                          type="button"
                          className="linked-calendar-chip"
                          onClick={() => {
                            setSelectedCase(linkedEvent.caseId);
                            router.push("/calendar");
                          }}
                          title="Open in Court Calendar"
                        >
                          <CalendarDays size={13} />
                          <span>
                            Linked event: {linkedEvent.title} (
                            {dateLabel(linkedEvent.date)})
                          </span>
                          <ExternalLink size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delete action */}
                  <div className="task-actions-col">
                    <button
                      type="button"
                      className="icon-button compact-btn text-danger"
                      title="Remove task"
                      onClick={() => deleteActionItem(item.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="No action items found"
            action={
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setStatusTab("All");
                  setSelectedPriority("All");
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
              >
                <RotateCcw size={15} /> Clear filters
              </button>
            }
          >
            All clear! No tasks match the selected status or filter criteria.
          </Empty>
        )}
      </div>

      {/* ADD ACTION ITEM MODAL */}
      {modalOpen && (
        <Modal
          title="Add Action Item"
          description={
            demo
              ? "[Synthetic demo] Create a compliance or preparation task."
              : "Record a task in your private workspace checklist."
          }
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleAddTask}>
            {formError && (
              <div className="callout warning mb-4" role="alert">
                <AlertCircle size={15} className="inline mr-2" />
                {formError}
              </div>
            )}

            <Field label="Case" hint="Associate task with a case">
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

            <Field label="Task Description / Title" hint="e.g. Obtain certified copy of order">
              <input
                type="text"
                name="title"
                required
                placeholder="What needs to be done?"
                autoFocus
              />
            </Field>

            <div className="grid-2-cols">
              <Field label="Due Date" hint="YYYY-MM-DD">
                <input
                  type="date"
                  name="dueDate"
                  required
                  defaultValue={asOf}
                />
              </Field>

              <Field label="Priority Level">
                <select name="priority" defaultValue="High">
                  <option value="High">High Priority (Urgent)</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Normal">Normal</option>
                </select>
              </Field>
            </div>

            <Field label="Task Category">
              <select name="category" defaultValue="Document prep">
                {ACTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Link to Calendar Event (Optional)" hint="Associate with a scheduled appearance or deadline">
              <select name="linkedCalendarEventId" defaultValue="">
                <option value="">None / Not linked</option>
                {data.calendarEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.date} · {ev.title} ({ev.eventType})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes / Preparation Details (Optional)">
              <textarea
                name="description"
                rows={2}
                placeholder="Checklist reminders, office counter instructions, or fee details"
              />
            </Field>

            {demo && (
              <div className="callout info mb-4">
                <ShieldCheck size={15} className="inline mr-2" />
                Task will be saved in-memory to your demo workspace.
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
                Save Task
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
