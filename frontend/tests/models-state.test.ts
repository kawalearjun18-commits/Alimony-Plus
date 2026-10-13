import { describe, expect, it } from "vitest";
import { demoWorkspace, DEMO_DATE } from "../src/lib/demo";
import type {
  MilestoneEvent,
  CalendarEvent,
  BenchAssignment,
  CaseDiaryEntry,
  LegalSubmission,
  ActionItem,
  NotificationItem,
  NotificationPreferences,
} from "../src/lib/types";

describe("Phase 1: Legal Timeline & Case Diary data models", () => {
  it("initializes demo workspace with all foundational collections", () => {
    const workspace = demoWorkspace();

    expect(Array.isArray(workspace.milestones)).toBe(true);
    expect(Array.isArray(workspace.calendarEvents)).toBe(true);
    expect(Array.isArray(workspace.benchAssignments)).toBe(true);
    expect(Array.isArray(workspace.diaryEntries)).toBe(true);
    expect(Array.isArray(workspace.submissions)).toBe(true);
    expect(Array.isArray(workspace.actionItems)).toBe(true);
    expect(Array.isArray(workspace.notifications)).toBe(true);
    expect(workspace.notificationPreferences).toBeDefined();
  });

  describe("MilestoneEvent", () => {
    it("contains valid procedural stages and chronological dates", () => {
      const { milestones } = demoWorkspace();
      expect(milestones.length).toBeGreaterThanOrEqual(4);

      const validStages: MilestoneEvent["stage"][] = [
        "Filing",
        "Summons & Notice",
        "Interim Application",
        "Pleadings",
        "Evidence",
        "Arguments",
        "Final Order",
      ];

      for (const m of milestones) {
        expect(validStages).toContain(m.stage);
        expect(m.title).toBeTruthy();
        expect(m.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(m.description).toContain("[Synthetic demo");
      }

      // Check sorting capability
      const sorted = [...milestones].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      expect(sorted[0].stage).toBe("Filing");
    });
  });

  describe("CalendarEvent", () => {
    it("covers hearing dates, summons return dates, and order deadlines", () => {
      const { calendarEvents } = demoWorkspace();
      const eventTypes = calendarEvents.map((e) => e.eventType);

      expect(eventTypes).toContain("Hearing");
      expect(eventTypes).toContain("Summons return");
      expect(eventTypes).toContain("Order deadline");

      for (const ev of calendarEvents) {
        expect(ev.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(ev.title).toBeTruthy();
        expect(["Scheduled", "Completed", "Adjourned", "Pending"]).toContain(
          ev.status,
        );
      }
    });

    it("filters calendar events by event category", () => {
      const { calendarEvents } = demoWorkspace();
      const hearings = calendarEvents.filter((e) => e.eventType === "Hearing");
      const summons = calendarEvents.filter(
        (e) => e.eventType === "Summons return",
      );
      const deadlines = calendarEvents.filter(
        (e) => e.eventType === "Order deadline",
      );

      expect(hearings.length).toBeGreaterThan(0);
      expect(summons.length).toBeGreaterThan(0);
      expect(deadlines.length).toBeGreaterThan(0);
    });
  });

  describe("BenchAssignment", () => {
    it("tracks active and transferred judicial assignments with court details", () => {
      const { benchAssignments } = demoWorkspace();
      expect(benchAssignments.length).toBeGreaterThanOrEqual(2);

      const active = benchAssignments.find((b) => b.status === "Active");
      const transferred = benchAssignments.find(
        (b) => b.status === "Transferred",
      );

      expect(active).toBeDefined();
      expect(active?.judgeName).toContain("Judge");
      expect(active?.courtroom).toBeTruthy();
      expect(transferred).toBeDefined();
      expect(transferred?.transferredDate).toBeDefined();
    });
  });

  describe("CaseDiaryEntry", () => {
    it("contains structured entries with hashtags and categories", () => {
      const { diaryEntries } = demoWorkspace();
      expect(diaryEntries.length).toBeGreaterThan(0);

      for (const entry of diaryEntries) {
        expect(entry.title).toBeTruthy();
        expect(entry.content).toBeTruthy();
        expect(Array.isArray(entry.tags)).toBe(true);
        expect(entry.tags.length).toBeGreaterThan(0);
        expect(entry.tags.every((t) => t.startsWith("#"))).toBe(true);
        expect([
          "Court proceeding",
          "Counsel meeting",
          "Evidence note",
          "Personal diary",
        ]).toContain(entry.category);
      }
    });

    it("supports tag filtering across entries", () => {
      const { diaryEntries } = demoWorkspace();
      const filtered = diaryEntries.filter((e) =>
        e.tags.includes("#InterimOrder"),
      );
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].tags).toContain("#InterimOrder");
    });
  });

  describe("LegalSubmission", () => {
    it("tracks filings with procedural status and court filing references", () => {
      const { submissions } = demoWorkspace();
      expect(submissions.length).toBeGreaterThanOrEqual(3);

      for (const s of submissions) {
        expect(s.title).toBeTruthy();
        expect(s.filingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect([
          "Drafted",
          "Filed",
          "Served",
          "Objected",
          "Taken on record",
        ]).toContain(s.status);
        expect(["Applicant", "Respondent", "Court"]).toContain(s.filedBy);
      }

      const rajneshAffidavit = submissions.find(
        (s) => s.submissionType === "Affidavit of assets",
      );
      expect(rajneshAffidavit).toBeDefined();
      expect(rajneshAffidavit?.status).toBe("Taken on record");
    });
  });

  describe("ActionItem", () => {
    it("tracks task priorities and toggleable completion states", () => {
      const { actionItems } = demoWorkspace();
      expect(actionItems.length).toBeGreaterThanOrEqual(3);

      const highPriority = actionItems.filter((i) => i.priority === "High");
      expect(highPriority.length).toBeGreaterThan(0);

      const completed = actionItems.filter((i) => i.completed);
      const pending = actionItems.filter((i) => !i.completed);
      expect(completed.length).toBeGreaterThan(0);
      expect(pending.length).toBeGreaterThan(0);
    });

    it("simulates action item completion toggle", () => {
      const { actionItems } = demoWorkspace();
      const item = actionItems.find((i) => !i.completed)!;

      const toggled = {
        ...item,
        completed: true,
        completedAt: DEMO_DATE,
      };

      expect(toggled.completed).toBe(true);
      expect(toggled.completedAt).toBe(DEMO_DATE);
    });
  });

  describe("NotificationItem & NotificationPreferences", () => {
    it("provides privacy-first discreet notification messages", () => {
      const { notifications } = demoWorkspace();
      expect(notifications.length).toBeGreaterThan(0);

      for (const n of notifications) {
        expect(n.title).toBeTruthy();
        expect(n.message).toBeTruthy();
        expect(n.discreetMessage).toBeDefined();
        // Discreet message must not reveal sensitive marital dispute details
        expect(n.discreetMessage).toMatch(/^Alimony\+ Reminder:/);
      }
    });

    it("defaults to discreet mode and lead days in preferences for safety", () => {
      const { notificationPreferences } = demoWorkspace();

      expect(notificationPreferences.hearingReminders).toBe(true);
      expect(notificationPreferences.summonsAlerts).toBe(true);
      expect(notificationPreferences.deadlineAlerts).toBe(true);
      expect(notificationPreferences.leadDays).toBe(3);
      expect(notificationPreferences.desktopPushEnabled).toBe(false);
      expect(notificationPreferences.discreetMode).toBe(true);
    });
  });

  describe("Workspace Reset & Immutability", () => {
    it("returns fresh, independent fixtures on subsequent demoWorkspace calls", () => {
      const ws1 = demoWorkspace();
      const ws2 = demoWorkspace();

      expect(ws1.milestones).not.toBe(ws2.milestones);
      expect(ws1.diaryEntries).not.toBe(ws2.diaryEntries);
      expect(ws1.actionItems).not.toBe(ws2.actionItems);

      // Mutating ws1 should not affect ws2
      ws1.diaryEntries.push({
        id: 999,
        caseId: 1,
        entryDate: "2026-10-10",
        title: "Temporary mutated entry",
        content: "Mutated content",
        tags: ["#Test"],
        category: "Personal diary",
      });

      expect(ws2.diaryEntries.some((e) => e.id === 999)).toBe(false);
    });
  });
});
