import { describe, expect, it } from "vitest";
import { demoWorkspace, DEMO_DATE } from "../src/lib/demo";
import type {
  CalendarEvent,
  LegalSubmission,
  ActionItem,
} from "../src/lib/types";
import {
  sortCalendarEvents,
  filterCalendarEvents,
  getCalendarGrid,
  groupEventsByDate,
  validateCalendarEventInput,
  addCalendarEventRecord,
  updateCalendarEventRecord,
  deleteCalendarEventRecord,
  getNextSubmissionStatus,
  filterLegalSubmissions,
  sortLegalSubmissions,
  validateSubmissionInput,
  addSubmissionRecord,
  updateSubmissionStatusRecord,
  updateSubmissionRecord,
  deleteSubmissionRecord,
  filterActionItems,
  sortActionItems,
  getDaysUntilDue,
  getActionItemUrgency,
  validateActionItemInput,
  addActionItemRecord,
  toggleActionItemRecord,
  updateActionItemRecord,
  deleteActionItemRecord,
} from "../src/lib/calendar-submissions-actions";

describe("Phase 3: Court Calendar, Legal Submissions & Action Items UI Logic", () => {
  const { calendarEvents, submissions, actionItems } = demoWorkspace();

  // ==========================================
  // MODULE A: COURT CALENDAR TESTS
  // ==========================================
  describe("Module A: Court Calendar", () => {
    it("sorts calendar events chronologically by date and time", () => {
      const unsorted: CalendarEvent[] = [
        {
          id: 3,
          caseId: 1,
          date: "2026-10-28",
          time: "04:00 PM",
          title: "Order deadline event",
          eventType: "Order deadline",
          status: "Scheduled",
        },
        {
          id: 1,
          caseId: 1,
          date: "2026-10-16",
          time: "10:30 AM",
          title: "Hearing event",
          eventType: "Hearing",
          status: "Scheduled",
        },
        {
          id: 2,
          caseId: 1,
          date: "2026-10-20",
          time: "11:00 AM",
          title: "Summons event",
          eventType: "Summons return",
          status: "Scheduled",
        },
      ];

      const sortedAsc = sortCalendarEvents(unsorted, "asc");
      expect(sortedAsc.map((e) => e.id)).toEqual([1, 2, 3]);

      const sortedDesc = sortCalendarEvents(unsorted, "desc");
      expect(sortedDesc.map((e) => e.id)).toEqual([3, 2, 1]);
    });

    it("filters calendar events by event type (Hearing, Summons return, Order deadline)", () => {
      const hearings = filterCalendarEvents(calendarEvents, {
        eventType: "Hearing",
      });
      expect(hearings.length).toBeGreaterThan(0);
      expect(hearings.every((h) => h.eventType === "Hearing")).toBe(true);

      const summons = filterCalendarEvents(calendarEvents, {
        eventType: "Summons return",
      });
      expect(summons.length).toBeGreaterThan(0);
      expect(summons.every((s) => s.eventType === "Summons return")).toBe(true);

      const deadlines = filterCalendarEvents(calendarEvents, {
        eventType: "Order deadline",
      });
      expect(deadlines.length).toBeGreaterThan(0);
      expect(deadlines.every((d) => d.eventType === "Order deadline")).toBe(
        true,
      );
    });

    it("filters calendar events by case ID and status", () => {
      const case1Events = filterCalendarEvents(calendarEvents, { caseId: 1 });
      expect(case1Events.every((e) => e.caseId === 1)).toBe(true);

      const scheduledOnly = filterCalendarEvents(calendarEvents, {
        status: "Scheduled",
      });
      expect(scheduledOnly.every((e) => e.status === "Scheduled")).toBe(true);
    });

    it("filters calendar events by month and exact date", () => {
      const octEvents = filterCalendarEvents(calendarEvents, {
        month: "2026-10",
      });
      expect(octEvents.length).toBe(calendarEvents.length);

      const singleDayEvents = filterCalendarEvents(calendarEvents, {
        date: "2026-10-16",
      });
      expect(singleDayEvents.length).toBe(1);
      expect(singleDayEvents[0].title).toContain("Maintenance review hearing");
    });

    it("searches calendar events across title, location and description", () => {
      const searchHearing = filterCalendarEvents(calendarEvents, {
        searchQuery: "Courtroom 3",
      });
      expect(searchHearing.length).toBeGreaterThan(0);

      const searchNonExistent = filterCalendarEvents(calendarEvents, {
        searchQuery: "xyzunknownterm123",
      });
      expect(searchNonExistent.length).toBe(0);
    });

    it("generates a structured month calendar grid for October 2026", () => {
      const grid = getCalendarGrid(2026, 10);
      // October 2026: 1st is Thursday. Previous month has 4 days (Sun 27, Mon 28, Tue 29, Wed 30)
      expect(grid.length).toBe(35); // 5 weeks x 7 days
      expect(grid[0].date).toBe("2026-09-27");
      expect(grid[0].isCurrentMonth).toBe(false);

      const oct1 = grid.find((c) => c.date === "2026-10-01");
      expect(oct1).toBeDefined();
      expect(oct1?.isCurrentMonth).toBe(true);
      expect(oct1?.dayNumber).toBe(1);

      const oct31 = grid.find((c) => c.date === "2026-10-31");
      expect(oct31).toBeDefined();
      expect(oct31?.isCurrentMonth).toBe(true);
      expect(oct31?.dayNumber).toBe(31);
    });

    it("groups calendar events chronologically by date for agenda view", () => {
      const groups = groupEventsByDate(calendarEvents);
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].date).toBe("2026-10-16");
      expect(groups[0].events.length).toBeGreaterThanOrEqual(1);

      for (let i = 0; i < groups.length - 1; i++) {
        expect(groups[i].date <= groups[i + 1].date).toBe(true);
      }
    });

    it("validates calendar event creation input", () => {
      const invalidEmpty = validateCalendarEventInput({});
      expect(invalidEmpty.valid).toBe(false);
      expect(invalidEmpty.errors).toContain("Event title is required.");
      expect(invalidEmpty.errors).toContain("Event date is required.");

      const invalidDate = validateCalendarEventInput({
        title: "Test event",
        date: "invalid-date",
      });
      expect(invalidDate.valid).toBe(false);
      expect(invalidDate.errors).toContain(
        "Event date must follow YYYY-MM-DD format.",
      );

      const valid = validateCalendarEventInput({
        title: "Valid Hearing Date",
        date: "2026-11-05",
        eventType: "Hearing",
        caseId: 1,
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors.length).toBe(0);
    });

    it("manages calendar event records immutably", () => {
      const initial = [...calendarEvents];
      const added = addCalendarEventRecord(initial, {
        caseId: 1,
        title: "New Adjourned Hearing",
        date: "2026-11-12",
        eventType: "Hearing",
        status: "Scheduled",
      });
      expect(added.length).toBe(initial.length + 1);

      const newId = added[added.length - 1].id;
      const updated = updateCalendarEventRecord(added, newId, {
        status: "Adjourned",
      });
      expect(updated.find((e) => e.id === newId)?.status).toBe("Adjourned");

      const deleted = deleteCalendarEventRecord(updated, newId);
      expect(deleted.length).toBe(initial.length);
    });
  });

  // ==========================================
  // MODULE B: LEGAL SUBMISSIONS TRACKER TESTS
  // ==========================================
  describe("Module B: Legal Submissions Tracker", () => {
    it("filters submissions by status and submission type", () => {
      const petitions = filterLegalSubmissions(submissions, {
        submissionType: "Petition",
      });
      expect(petitions.length).toBeGreaterThan(0);
      expect(petitions.every((s) => s.submissionType === "Petition")).toBe(
        true,
      );

      const takenOnRecord = filterLegalSubmissions(submissions, {
        status: "Taken on record",
      });
      expect(takenOnRecord.length).toBeGreaterThan(0);
      expect(
        takenOnRecord.every((s) => s.status === "Taken on record"),
      ).toBe(true);

      const drafted = filterLegalSubmissions(submissions, {
        status: "Drafted",
      });
      expect(drafted.length).toBe(1);
      expect(drafted[0].title).toContain("Maintenance Arrears");
    });

    it("filters submissions by filing party (Applicant / Respondent / Court)", () => {
      const applicantOnly = filterLegalSubmissions(submissions, {
        filedBy: "Applicant",
      });
      expect(applicantOnly.every((s) => s.filedBy === "Applicant")).toBe(true);

      const respondentOnly = filterLegalSubmissions(submissions, {
        filedBy: "Respondent",
      });
      expect(respondentOnly.length).toBe(1);
      expect(respondentOnly[0].filedBy).toBe("Respondent");
    });

    it("searches submissions by title, filing reference number, and notes", () => {
      const matchByRef = filterLegalSubmissions(submissions, {
        searchQuery: "0142-AFF",
      });
      expect(matchByRef.length).toBe(1);
      expect(matchByRef[0].submissionType).toBe("Affidavit of assets");

      const matchByNotes = filterLegalSubmissions(submissions, {
        searchQuery: "Rajnesh",
      });
      expect(matchByNotes.length).toBe(1);
    });

    it("sorts submissions by filing date and title", () => {
      const sortedByDateDesc = sortLegalSubmissions(
        submissions,
        "filingDate",
        "desc",
      );
      for (let i = 0; i < sortedByDateDesc.length - 1; i++) {
        expect(
          sortedByDateDesc[i].filingDate >= sortedByDateDesc[i + 1].filingDate,
        ).toBe(true);
      }

      const sortedByDateAsc = sortLegalSubmissions(
        submissions,
        "filingDate",
        "asc",
      );
      expect(sortedByDateAsc[0].filingDate).toBe("2026-04-12");
    });

    it("implements procedural status progression pipeline", () => {
      expect(getNextSubmissionStatus("Drafted")).toBe("Filed");
      expect(getNextSubmissionStatus("Filed")).toBe("Served");
      expect(getNextSubmissionStatus("Served")).toBe("Taken on record");
      expect(getNextSubmissionStatus("Taken on record")).toBeNull();
      expect(getNextSubmissionStatus("Objected")).toBe("Filed");
    });

    it("validates submission creation inputs", () => {
      const invalid = validateSubmissionInput({
        title: "",
        filingDate: "not-a-date",
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain("Submission title is required.");
      expect(invalid.errors).toContain(
        "Filing date must follow YYYY-MM-DD format.",
      );

      const valid = validateSubmissionInput({
        title: "Rejoinder to Reply",
        filingDate: "2026-10-14",
        submissionType: "Rejoinder",
        status: "Drafted",
        filedBy: "Applicant",
        caseId: 1,
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors.length).toBe(0);
    });

    it("manages submission records immutably with status transitions", () => {
      const initial = [...submissions];
      const added = addSubmissionRecord(initial, {
        caseId: 1,
        title: "Rejoinder Affidavit",
        submissionType: "Rejoinder",
        filingDate: "2026-10-15",
        filedBy: "Applicant",
        status: "Drafted",
      });
      expect(added.length).toBe(initial.length + 1);

      const newId = added[added.length - 1].id;
      const movedToFiled = updateSubmissionStatusRecord(added, newId, "Filed");
      expect(movedToFiled.find((s) => s.id === newId)?.status).toBe("Filed");

      const movedToServed = updateSubmissionStatusRecord(
        movedToFiled,
        newId,
        "Served",
      );
      expect(movedToServed.find((s) => s.id === newId)?.status).toBe("Served");

      const deleted = deleteSubmissionRecord(movedToServed, newId);
      expect(deleted.length).toBe(initial.length);
    });
  });

  // ==========================================
  // MODULE C: ACTION ITEMS TESTS
  // ==========================================
  describe("Module C: Action Items Checklist", () => {
    it("filters action items by completion status (Pending, Completed, All)", () => {
      const pending = filterActionItems(actionItems, { status: "Pending" });
      expect(pending.every((i) => !i.completed)).toBe(true);

      const completed = filterActionItems(actionItems, {
        status: "Completed",
      });
      expect(completed.every((i) => i.completed)).toBe(true);

      const all = filterActionItems(actionItems, { status: "All" });
      expect(all.length).toBe(actionItems.length);
    });

    it("filters action items by priority and category", () => {
      const highPriority = filterActionItems(actionItems, { priority: "High" });
      expect(highPriority.every((i) => i.priority === "High")).toBe(true);

      const docPrep = filterActionItems(actionItems, {
        category: "Document prep",
      });
      expect(docPrep.every((i) => i.category === "Document prep")).toBe(true);
    });

    it("sorts action items by priority (High -> Medium -> Normal) and due date", () => {
      const sortedPriority = sortActionItems(actionItems, "priority", "asc");
      const priorities = sortedPriority.map((i) => i.priority);
      const highIndex = priorities.lastIndexOf("High");
      const normalIndex = priorities.indexOf("Normal");
      if (highIndex !== -1 && normalIndex !== -1) {
        expect(highIndex).toBeLessThan(normalIndex);
      }

      const sortedDueDate = sortActionItems(actionItems, "dueDate", "asc");
      for (let i = 0; i < sortedDueDate.length - 1; i++) {
        expect(sortedDueDate[i].dueDate <= sortedDueDate[i + 1].dueDate).toBe(
          true,
        );
      }
    });

    it("calculates urgency correctly relative to DEMO_DATE (2026-10-09)", () => {
      const overdueItem: ActionItem = {
        id: 91,
        caseId: 1,
        title: "Past task",
        category: "Other",
        dueDate: "2026-10-05",
        priority: "High",
        completed: false,
      };
      expect(getActionItemUrgency(overdueItem, DEMO_DATE)).toBe("overdue");
      expect(getDaysUntilDue(overdueItem.dueDate, DEMO_DATE)).toBe(-4);

      const dueTodayItem: ActionItem = {
        id: 92,
        caseId: 1,
        title: "Today task",
        category: "Other",
        dueDate: "2026-10-09",
        priority: "High",
        completed: false,
      };
      expect(getActionItemUrgency(dueTodayItem, DEMO_DATE)).toBe("due-today");
      expect(getDaysUntilDue(dueTodayItem.dueDate, DEMO_DATE)).toBe(0);

      const upcomingItem: ActionItem = {
        id: 93,
        caseId: 1,
        title: "Upcoming task",
        category: "Other",
        dueDate: "2026-10-15",
        priority: "High",
        completed: false,
      };
      expect(getActionItemUrgency(upcomingItem, DEMO_DATE)).toBe("upcoming");
      expect(getDaysUntilDue(upcomingItem.dueDate, DEMO_DATE)).toBe(6);

      const completedItem: ActionItem = {
        ...overdueItem,
        completed: true,
      };
      expect(getActionItemUrgency(completedItem, DEMO_DATE)).toBe("completed");
    });

    it("links action items to calendar events", () => {
      const linked = actionItems.find((i) => i.linkedCalendarEventId);
      expect(linked).toBeDefined();
      expect(linked?.linkedCalendarEventId).toBe(1);

      const targetEvent = calendarEvents.find(
        (e) => e.id === linked?.linkedCalendarEventId,
      );
      expect(targetEvent).toBeDefined();
      expect(targetEvent?.title).toBe("Maintenance review hearing");
    });

    it("toggles action item completion state back and forth cleanly", () => {
      const initial = [...actionItems];
      const pendingItem = initial.find((i) => !i.completed)!;

      const toggledOn = toggleActionItemRecord(
        initial,
        pendingItem.id,
        DEMO_DATE,
      );
      const afterOn = toggledOn.find((i) => i.id === pendingItem.id)!;
      expect(afterOn.completed).toBe(true);
      expect(afterOn.completedAt).toBe(DEMO_DATE);

      const toggledOff = toggleActionItemRecord(toggledOn, pendingItem.id);
      const afterOff = toggledOff.find((i) => i.id === pendingItem.id)!;
      expect(afterOff.completed).toBe(false);
      expect(afterOff.completedAt).toBeUndefined();
    });

    it("validates action item input fields", () => {
      const invalid = validateActionItemInput({});
      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain("Task title is required.");
      expect(invalid.errors).toContain("Due date is required.");

      const valid = validateActionItemInput({
        title: "Submit bank statement copy",
        dueDate: "2026-10-20",
        priority: "High",
        category: "Document prep",
        caseId: 1,
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors.length).toBe(0);
    });

    it("manages action item records immutably", () => {
      const initial = [...actionItems];
      const added = addActionItemRecord(initial, {
        caseId: 1,
        title: "Prepare court outfit & file folder",
        dueDate: "2026-10-15",
        priority: "Normal",
        category: "Other",
        completed: false,
      });
      expect(added.length).toBe(initial.length + 1);

      const newId = added[added.length - 1].id;
      const updated = updateActionItemRecord(added, newId, {
        priority: "High",
      });
      expect(updated.find((i) => i.id === newId)?.priority).toBe("High");

      const deleted = deleteActionItemRecord(updated, newId);
      expect(deleted.length).toBe(initial.length);
    });
  });
});
