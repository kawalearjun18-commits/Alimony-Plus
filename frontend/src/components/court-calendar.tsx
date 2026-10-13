"use client";

import { useState, useId, type FormEvent } from "react";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Scale,
  Send,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  Bell,
  CheckSquare,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Info,
  ListFilter,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Empty, Field, Modal, PageHeading } from "./ui";
import { dateLabel } from "@/lib/ledger";
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
} from "@/lib/types";
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_STATUSES,
  filterCalendarEvents,
  sortCalendarEvents,
  getCalendarGrid,
  groupEventsByDate,
  validateCalendarEventInput,
  getDaysUntilDue,
} from "@/lib/calendar-submissions-actions";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CourtCalendar() {
  const {
    data,
    demo,
    asOf,
    selectedCase,
    setSelectedCase,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    toggleActionItem,
  } = useWorkspace();

  // Calendar navigation state: default to year and month of asOf (demo: 2026-10-09)
  const initialYear = parseInt(asOf.split("-")[0] || "2026", 10);
  const initialMonth = parseInt(asOf.split("-")[1] || "10", 10);

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth); // 1-12
  const [selectedDate, setSelectedDate] = useState<string>(asOf);
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");

  // Filters
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog & Details state
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [detailEventId, setDetailEventId] = useState<number | null>(null);

  // Month navigation
  function prevMonth() {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function jumpToToday() {
    const y = parseInt(asOf.split("-")[0] || "2026", 10);
    const m = parseInt(asOf.split("-")[1] || "10", 10);
    setCurrentYear(y);
    setCurrentMonth(m);
    setSelectedDate(asOf);
  }

  // Filtered events
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const allFilteredEvents = filterCalendarEvents(data.calendarEvents, {
    caseId: selectedCase,
    eventType: selectedType,
    status: selectedStatus,
    searchQuery,
  });

  const monthGridEvents = filterCalendarEvents(data.calendarEvents, {
    caseId: selectedCase,
    eventType: selectedType,
    status: selectedStatus,
    searchQuery,
    month: currentMonthStr,
  });

  const selectedDateEvents = allFilteredEvents.filter(
    (ev) => ev.date === selectedDate,
  );

  const gridCells = getCalendarGrid(currentYear, currentMonth);

  // Detail event inspection
  const inspectedEvent =
    detailEventId !== null
      ? data.calendarEvents.find((e) => e.id === detailEventId)
      : null;

  // Add event handler
  function handleAddEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim();
    const eventType = String(
      form.get("eventType") || "Hearing",
    ) as CalendarEventType;
    const date = String(form.get("date") || selectedDate).trim();
    const time = String(form.get("time") || "").trim();
    const location = String(form.get("location") || "").trim();
    const description = String(form.get("description") || "").trim();
    const status = String(
      form.get("status") || "Scheduled",
    ) as CalendarEventStatus;
    const reminderDays = Number(form.get("reminderDays") || 3);
    const targetCaseId = Number(
      form.get("caseId") || selectedCase || data.cases[0]?.id || 1,
    );

    const validation = validateCalendarEventInput({
      title,
      eventType,
      date,
      status,
      caseId: targetCaseId,
    });

    if (!validation.valid) {
      setFormError(validation.errors[0] || "Please check the form inputs.");
      return;
    }

    addCalendarEvent({
      caseId: targetCaseId,
      title,
      eventType,
      date,
      time: time || undefined,
      location: location || undefined,
      description:
        description ||
        (demo
          ? `[Synthetic demo] ${title} recorded for hearing preparations.`
          : undefined),
      status,
      reminderDays: reminderDays > 0 ? reminderDays : undefined,
    });

    setSelectedDate(date);
    setModalOpen(false);
  }

  function getEventTypeTone(type: CalendarEventType) {
    switch (type) {
      case "Hearing":
        return "badge-hearing";
      case "Summons return":
        return "badge-summons";
      case "Order deadline":
        return "badge-deadline";
      default:
        return "";
    }
  }

  function getStatusTone(status: CalendarEventStatus) {
    switch (status) {
      case "Completed":
        return "neutral";
      case "Adjourned":
        return "amber";
      case "Pending":
        return "amber";
      default:
        return "";
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="SCHEDULE & COMPLIANCE"
        title="Court Calendar & Deadlines"
        description="Track hearing appearances, summons returnable dates, and filing deadlines in one place."
      >
        <button
          className="button secondary"
          onClick={jumpToToday}
          title="Jump to current workspace date"
        >
          <CalendarIcon size={16} />
          Current date
        </button>
        <button
          className="button primary"
          onClick={() => {
            setFormError("");
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          Add calendar event
        </button>
      </PageHeading>

      {/* Top Filter and View Switcher Toolbar */}
      <div className="calendar-toolbar">
        <div className="view-mode-toggle" role="group" aria-label="Calendar view">
          <button
            type="button"
            className={`pill-btn ${viewMode === "month" ? "active" : ""}`}
            onClick={() => setViewMode("month")}
          >
            <CalendarDays size={15} />
            Month view
          </button>
          <button
            type="button"
            className={`pill-btn ${viewMode === "agenda" ? "active" : ""}`}
            onClick={() => setViewMode("agenda")}
          >
            <Clock size={15} />
            Agenda view ({allFilteredEvents.length})
          </button>
        </div>

        <div className="filter-group">
          <span className="filter-group-label">Category:</span>
          <div className="filter-chips">
            {["All", ...CALENDAR_EVENT_TYPES].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip ${selectedType === cat ? "active" : ""}`}
                onClick={() => setSelectedType(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
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

        <div className="filter-group">
          <span className="filter-group-label">Status:</span>
          <select
            className="select compact"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by event status"
          >
            <option value="All">All statuses</option>
            {CALENDAR_EVENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="search-wrap compact">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search dates, rooms, titles…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search calendar events"
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

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <div className="calendar-layout-grid">
          {/* Calendar Grid Container */}
          <div className="panel calendar-month-panel">
            {/* Header: Month / Year with arrows */}
            <div className="month-header">
              <div className="month-heading">
                <h2>
                  {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </h2>
                <span className="month-meta-pill">
                  {monthGridEvents.length} event
                  {monthGridEvents.length === 1 ? "" : "s"} this month
                </span>
              </div>
              <div className="month-nav-controls">
                <button
                  type="button"
                  className="icon-button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="button secondary compact"
                  onClick={jumpToToday}
                >
                  Oct 2026
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={nextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Weekday Names Header */}
            <div className="weekdays-grid">
              {WEEKDAY_NAMES.map((wd) => (
                <div key={wd} className="weekday-cell">
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="days-grid">
              {gridCells.map((cell) => {
                const dayEvents = allFilteredEvents.filter(
                  (e) => e.date === cell.date,
                );
                const isSelected = selectedDate === cell.date;
                const isCurrentToday = asOf === cell.date;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={`day-cell ${
                      !cell.isCurrentMonth ? "other-month" : ""
                    } ${isSelected ? "selected" : ""} ${
                      isCurrentToday ? "is-today" : ""
                    }`}
                    onClick={() => {
                      setSelectedDate(cell.date);
                      if (dayEvents.length > 0) {
                        setDetailEventId(dayEvents[0].id);
                      } else {
                        setDetailEventId(null);
                      }
                    }}
                    aria-label={`${cell.date}, ${dayEvents.length} events`}
                  >
                    <div className="day-number-row">
                      <span className="day-number">{cell.dayNumber}</span>
                      {isCurrentToday && (
                        <span className="today-badge" title="Workspace date">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Events indicators inside cell */}
                    <div className="day-events-list">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={`day-event-chip ${getEventTypeTone(
                            ev.eventType,
                          )}`}
                          title={`${ev.time ? ev.time + " · " : ""}${ev.title}`}
                        >
                          <span className="chip-dot" />
                          <span className="chip-text">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="day-more-pill">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Details Pane */}
          <div className="panel calendar-details-pane">
            <div className="pane-header">
              <div>
                <p className="eyebrow">SELECTED DATE</p>
                <h3>{dateLabel(selectedDate)}</h3>
                <small className="muted">
                  {selectedDateEvents.length} scheduled event
                  {selectedDateEvents.length === 1 ? "" : "s"}
                </small>
              </div>
              <button
                type="button"
                className="button secondary compact"
                onClick={() => {
                  setFormError("");
                  setModalOpen(true);
                }}
              >
                <Plus size={14} /> Add for date
              </button>
            </div>

            {selectedDateEvents.length > 0 ? (
              <div className="selected-date-events-list">
                {selectedDateEvents.map((ev) => {
                  const linkedTasks = data.actionItems.filter(
                    (task) => task.linkedCalendarEventId === ev.id,
                  );
                  const caseObj = data.cases.find((c) => c.id === ev.caseId);

                  return (
                    <div
                      key={ev.id}
                      className={`event-detail-card ${
                        detailEventId === ev.id ? "inspected" : ""
                      }`}
                      onClick={() => setDetailEventId(ev.id)}
                    >
                      <div className="event-detail-header">
                        <Badge tone={getEventTypeTone(ev.eventType)}>
                          {ev.eventType}
                        </Badge>
                        <Badge tone={getStatusTone(ev.status)}>
                          {ev.status}
                        </Badge>
                      </div>

                      <h4 className="event-detail-title">{ev.title}</h4>

                      <div className="event-detail-meta">
                        {ev.time && (
                          <span>
                            <Clock size={13} className="inline mr-1 text-muted" />
                            {ev.time}
                          </span>
                        )}
                        {ev.location && (
                          <span>
                            <MapPin
                              size={13}
                              className="inline mr-1 text-muted"
                            />
                            {ev.location}
                          </span>
                        )}
                        {caseObj && (
                          <span className="case-name">
                            <Scale size={13} className="inline mr-1 text-muted" />
                            {caseObj.title}
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="event-detail-desc">{ev.description}</p>
                      )}

                      {/* Reminder Setting */}
                      {ev.reminderDays !== undefined && (
                        <div className="reminder-pill">
                          <Bell size={13} />
                          <span>
                            Reminder active: {ev.reminderDays} days in advance
                          </span>
                        </div>
                      )}

                      {/* Linked Action Items / Tasks */}
                      {linkedTasks.length > 0 && (
                        <div className="linked-tasks-box">
                          <div className="linked-tasks-title">
                            <CheckSquare size={13} />
                            <span>Linked Action Items ({linkedTasks.length})</span>
                          </div>
                          <div className="linked-tasks-list">
                            {linkedTasks.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                className={`linked-task-row ${
                                  task.completed ? "completed" : ""
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleActionItem(task.id);
                                }}
                                title="Click to toggle completion"
                              >
                                <span className="task-checkbox">
                                  {task.completed && <CheckCircle2 size={12} />}
                                </span>
                                <span className="task-title">{task.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Card Action Footer */}
                      <div className="event-card-actions">
                        <select
                          className="select micro"
                          value={ev.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateCalendarEvent(ev.id, {
                              status: e.target.value as CalendarEventStatus,
                            });
                          }}
                          aria-label="Change event status"
                        >
                          {CALENDAR_EVENT_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              Mark: {st}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="icon-button compact-btn text-danger"
                          title="Delete calendar event"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCalendarEvent(ev.id);
                            if (detailEventId === ev.id) setDetailEventId(null);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty
                title="No events on this day"
                action={
                  <button
                    type="button"
                    className="button secondary compact"
                    onClick={() => {
                      setFormError("");
                      setModalOpen(true);
                    }}
                  >
                    Add event for {dateLabel(selectedDate)}
                  </button>
                }
              >
                No hearings, summons returns, or deadlines recorded on this
                date.
              </Empty>
            )}
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {viewMode === "agenda" && (
        <div className="panel agenda-panel">
          <div className="agenda-header">
            <div>
              <h3>Agenda & Upcoming Schedule</h3>
              <p className="muted">
                Chronological list of all proceedings and deadlines.
              </p>
            </div>
            <span className="agenda-count-badge">
              {allFilteredEvents.length} events
            </span>
          </div>

          {allFilteredEvents.length > 0 ? (
            <div className="agenda-groups-list">
              {groupEventsByDate(allFilteredEvents).map((group) => {
                const daysDiff = getDaysUntilDue(group.date, asOf);
                let relativeLabel = "";
                if (daysDiff < 0) {
                  relativeLabel = `${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? "" : "s"} ago`;
                } else if (daysDiff === 0) {
                  relativeLabel = "Today";
                } else if (daysDiff === 1) {
                  relativeLabel = "Tomorrow";
                } else {
                  relativeLabel = `In ${daysDiff} days`;
                }

                return (
                  <div key={group.date} className="agenda-date-group">
                    <div className="agenda-date-sticky">
                      <div className="agenda-date-display">
                        <span className="agenda-day-big">
                          {group.date.split("-")[2]}
                        </span>
                        <div className="agenda-month-year">
                          <strong>
                            {
                              MONTH_NAMES[
                                parseInt(group.date.split("-")[1], 10) - 1
                              ]
                            }
                          </strong>
                          <small>{group.date.split("-")[0]}</small>
                        </div>
                      </div>
                      <span
                        className={`relative-time-pill ${
                          daysDiff === 0
                            ? "today"
                            : daysDiff < 0
                              ? "past"
                              : "upcoming"
                        }`}
                      >
                        {relativeLabel}
                      </span>
                    </div>

                    <div className="agenda-events-col">
                      {group.events.map((ev) => {
                        const linkedTasks = data.actionItems.filter(
                          (task) => task.linkedCalendarEventId === ev.id,
                        );
                        const caseObj = data.cases.find(
                          (c) => c.id === ev.caseId,
                        );

                        return (
                          <div key={ev.id} className="agenda-event-card">
                            <div className="agenda-event-top">
                              <div className="agenda-badges">
                                <Badge tone={getEventTypeTone(ev.eventType)}>
                                  {ev.eventType}
                                </Badge>
                                <Badge tone={getStatusTone(ev.status)}>
                                  {ev.status}
                                </Badge>
                              </div>
                              <div className="agenda-card-actions">
                                <select
                                  className="select micro"
                                  value={ev.status}
                                  onChange={(e) =>
                                    updateCalendarEvent(ev.id, {
                                      status: e.target
                                        .value as CalendarEventStatus,
                                    })
                                  }
                                  aria-label="Update event status"
                                >
                                  {CALENDAR_EVENT_STATUSES.map((st) => (
                                    <option key={st} value={st}>
                                      Status: {st}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="icon-button compact-btn text-danger"
                                  title="Delete event"
                                  onClick={() => deleteCalendarEvent(ev.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            <h4 className="agenda-event-title">{ev.title}</h4>

                            <div className="agenda-meta-row">
                              {ev.time && (
                                <span>
                                  <Clock
                                    size={13}
                                    className="inline mr-1 text-muted"
                                  />
                                  {ev.time}
                                </span>
                              )}
                              {ev.location && (
                                <span>
                                  <MapPin
                                    size={13}
                                    className="inline mr-1 text-muted"
                                  />
                                  {ev.location}
                                </span>
                              )}
                              {caseObj && (
                                <span>
                                  <Scale
                                    size={13}
                                    className="inline mr-1 text-muted"
                                  />
                                  {caseObj.title}
                                </span>
                              )}
                              {ev.reminderDays !== undefined && (
                                <span>
                                  <Bell
                                    size={13}
                                    className="inline mr-1 text-muted"
                                  />
                                  Alert: {ev.reminderDays}d before
                                </span>
                              )}
                            </div>

                            {ev.description && (
                              <p className="agenda-desc">{ev.description}</p>
                            )}

                            {linkedTasks.length > 0 && (
                              <div className="agenda-linked-tasks">
                                <span className="linked-label">
                                  <CheckSquare size={13} /> Linked Tasks:
                                </span>
                                <div className="linked-pills">
                                  {linkedTasks.map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      className={`agenda-task-chip ${
                                        t.completed ? "done" : ""
                                      }`}
                                      onClick={() => toggleActionItem(t.id)}
                                      title="Toggle task completion"
                                    >
                                      {t.completed ? "✓ " : "○ "}
                                      {t.title}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty
              title="No events found"
              action={
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setSelectedType("All");
                    setSelectedStatus("All");
                    setSearchQuery("");
                  }}
                >
                  <RotateCcw size={15} /> Clear filters
                </button>
              }
            >
              No calendar events match the current search or filters.
            </Empty>
          )}
        </div>
      )}

      {/* EVENT CREATION MODAL */}
      {modalOpen && (
        <Modal
          title="Add Court Calendar Event"
          description={
            demo
              ? "[Synthetic demo] Record a hearing, summons returnable date, or filing deadline."
              : "Record an upcoming court date in your private workspace."
          }
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleAddEvent}>
            {formError && (
              <div className="callout warning mb-4" role="alert">
                <AlertCircle size={15} className="inline mr-2" />
                {formError}
              </div>
            )}

            <Field label="Case" hint="Associate this event with a case record">
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

            <Field label="Event Title" hint="e.g. Interim maintenance review hearing">
              <input
                type="text"
                name="title"
                required
                placeholder="Enter title of the court event"
                autoFocus
              />
            </Field>

            <div className="grid-2-cols">
              <Field label="Event Category">
                <select name="eventType" defaultValue="Hearing">
                  {CALENDAR_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select name="status" defaultValue="Scheduled">
                  {CALENDAR_EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid-2-cols">
              <Field label="Date" hint="YYYY-MM-DD">
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={selectedDate || asOf}
                />
              </Field>

              <Field label="Time (Optional)" hint="e.g. 10:30 AM">
                <input
                  type="text"
                  name="time"
                  placeholder="10:30 AM"
                  defaultValue="10:30 AM"
                />
              </Field>
            </div>

            <Field label="Location / Courtroom" hint="e.g. Family Court, New Delhi · Courtroom 3">
              <input
                type="text"
                name="location"
                placeholder="Courtroom number, registry counter, or DSLSA office"
                defaultValue="Family Court, New Delhi · Courtroom 3"
              />
            </Field>

            <Field label="Reminder Alert">
              <select name="reminderDays" defaultValue="3">
                <option value="0">No reminder</option>
                <option value="1">1 day before</option>
                <option value="2">2 days before</option>
                <option value="3">3 days before</option>
                <option value="5">5 days before</option>
                <option value="7">1 week before</option>
              </select>
            </Field>

            <Field label="Description & Preparation Notes" hint="Optional summary">
              <textarea
                name="description"
                rows={3}
                placeholder="Notes for arguments, required documents, or counsel check-in"
              />
            </Field>

            {demo && (
              <div className="callout info mb-4">
                <ShieldCheck size={15} className="inline mr-2" />
                This event will be added to your in-memory demo workspace.
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
                Save Event
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
