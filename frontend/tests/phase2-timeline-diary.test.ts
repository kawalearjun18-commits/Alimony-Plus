import { describe, expect, it } from "vitest";
import { demoWorkspace } from "../src/lib/demo";
import type {
  MilestoneEvent,
  MilestoneStage,
  MilestoneStatus,
  CaseDiaryEntry,
  BenchAssignment,
} from "../src/lib/types";
import {
  sortMilestonesChronologically,
  filterMilestones,
  sortDiaryEntries,
  searchAndFilterDiary,
  extractUniqueTags,
  normalizeTag,
  parseTagString,
  validateDiaryInput,
  addDiaryEntryRecord,
  updateDiaryEntryRecord,
  deleteDiaryEntryRecord,
  sortBenchAssignments,
  filterBenchAssignmentsByCase,
  getCurrentBenchAssignment,
  getHistoricalBenchAssignments,
} from "../src/lib/timeline-diary";

describe("Phase 2: Interactive Court Timeline & Case Diary UI Logic", () => {
  const { milestones, diaryEntries, benchAssignments } = demoWorkspace();

  // ==========================================
  // MODULE A: TIMELINE UNIT TESTS
  // ==========================================
  describe("Module A: Timeline Chronological Ordering & Filtering", () => {
    it("sorts milestones in chronological order (earliest first)", () => {
      const unsorted: MilestoneEvent[] = [
        {
          id: 3,
          caseId: 1,
          date: "2026-10-16",
          title: "Hearing 2",
          stage: "Arguments",
          status: "Scheduled",
        },
        {
          id: 1,
          caseId: 1,
          date: "2026-04-12",
          title: "Initial Petition",
          stage: "Filing",
          status: "Completed",
        },
        {
          id: 2,
          caseId: 1,
          date: "2026-05-18",
          title: "Affidavit Submission",
          stage: "Pleadings",
          status: "Completed",
        },
      ];

      const sortedAsc = sortMilestonesChronologically(unsorted, "asc");
      expect(sortedAsc.map((m) => m.id)).toEqual([1, 2, 3]);
      expect(sortedAsc[0].date).toBe("2026-04-12");
      expect(sortedAsc[2].date).toBe("2026-10-16");
    });

    it("sorts milestones in reverse chronological order (latest first)", () => {
      const sortedDesc = sortMilestonesChronologically(milestones, "desc");
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        expect(sortedDesc[i].date >= sortedDesc[i + 1].date).toBe(true);
      }
    });

    it("breaks ties deterministically when dates are identical", () => {
      const sameDateItems: MilestoneEvent[] = [
        {
          id: 20,
          caseId: 1,
          date: "2026-05-22",
          title: "Later ID Event",
          stage: "Interim Application",
          status: "Completed",
        },
        {
          id: 10,
          caseId: 1,
          date: "2026-05-22",
          title: "Earlier ID Event",
          stage: "Interim Application",
          status: "Completed",
        },
      ];

      const sortedAsc = sortMilestonesChronologically(sameDateItems, "asc");
      expect(sortedAsc[0].id).toBe(10);
      expect(sortedAsc[1].id).toBe(20);
    });

    it("filters milestones by procedural stage", () => {
      const filingOnly = filterMilestones(milestones, { stage: "Filing" });
      expect(filingOnly.length).toBeGreaterThan(0);
      expect(filingOnly.every((m) => m.stage === "Filing")).toBe(true);

      const allStages = filterMilestones(milestones, { stage: "All" });
      expect(allStages.length).toBe(milestones.length);

      const nonExistent = filterMilestones(milestones, {
        stage: "Final Order",
      });
      expect(nonExistent.length).toBe(0);
    });

    it("filters milestones by status (Completed, Scheduled, In progress, Adjourned)", () => {
      const completed = filterMilestones(milestones, { status: "Completed" });
      expect(completed.length).toBeGreaterThan(0);
      expect(completed.every((m) => m.status === "Completed")).toBe(true);

      const scheduled = filterMilestones(milestones, { status: "Scheduled" });
      expect(scheduled.length).toBeGreaterThan(0);
      expect(scheduled.every((m) => m.status === "Scheduled")).toBe(true);
    });

    it("combines stage, status, case, and keyword search filters", () => {
      const combined = filterMilestones(milestones, {
        caseId: 1,
        stage: "Filing",
        status: "Completed",
        searchQuery: "Petition",
      });

      expect(combined.length).toBe(1);
      expect(combined[0].title).toContain("Petition");
    });
  });

  // ==========================================
  // MODULE B: CASE DIARY UNIT TESTS
  // ==========================================
  describe("Module B: Case Diary Searching, Tag Filtering & CRUD State", () => {
    it("sorts diary entries chronologically", () => {
      const sortedDesc = sortDiaryEntries(diaryEntries, "desc");
      for (let i = 0; i < sortedDesc.length - 1; i++) {
        expect(sortedDesc[i].entryDate >= sortedDesc[i + 1].entryDate).toBe(
          true,
        );
      }

      const sortedAsc = sortDiaryEntries(diaryEntries, "asc");
      expect(
        sortedAsc[0].entryDate <= sortedAsc[sortedAsc.length - 1].entryDate,
      ).toBe(true);
    });

    it("searches diary entries by title and content (case-insensitive)", () => {
      const byTitle = searchAndFilterDiary(diaryEntries, {
        query: "Shortfall",
      });
      expect(byTitle.length).toBe(1);
      expect(byTitle[0].title).toContain("Shortfall");

      const byContent = searchAndFilterDiary(diaryEntries, {
        query: "tuition fees",
      });
      expect(byContent.length).toBe(1);
      expect(byContent[0].content).toContain("tuition fees");
    });

    it("filters diary entries by category and tags", () => {
      const counselNotes = searchAndFilterDiary(diaryEntries, {
        category: "Counsel meeting",
      });
      expect(counselNotes.length).toBeGreaterThan(0);
      expect(counselNotes.every((n) => n.category === "Counsel meeting")).toBe(
        true,
      );

      const tagFiltered = searchAndFilterDiary(diaryEntries, {
        tag: "#InterimOrder",
      });
      expect(tagFiltered.length).toBe(1);
      expect(tagFiltered[0].tags).toContain("#InterimOrder");

      // Works with or without leading hash
      const tagWithoutHash = searchAndFilterDiary(diaryEntries, {
        tag: "InterimOrder",
      });
      expect(tagWithoutHash.length).toBe(1);
    });

    it("extracts unique normalized hashtags across diary entries", () => {
      const tags = extractUniqueTags(diaryEntries);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.every((t) => t.startsWith("#"))).toBe(true);
      expect(new Set(tags).size).toBe(tags.length);
      expect(tags).toContain("#InterimOrder");
      expect(tags).toContain("#ChildSupport");
    });

    it("parses user-entered tag strings into clean hashtag arrays", () => {
      expect(parseTagString("InterimOrder, Arrears, #PaymentReceipt")).toEqual([
        "#InterimOrder",
        "#Arrears",
        "#PaymentReceipt",
      ]);
      expect(parseTagString("   ")).toEqual([]);
    });

    it("validates required fields for diary entries", () => {
      const emptyCheck = validateDiaryInput({});
      expect(emptyCheck.valid).toBe(false);
      expect(emptyCheck.errors.title).toBeDefined();
      expect(emptyCheck.errors.entryDate).toBeDefined();
      expect(emptyCheck.errors.content).toBeDefined();
      expect(emptyCheck.errors.category).toBeDefined();

      const invalidDate = validateDiaryInput({
        title: "Valid Title",
        entryDate: "not-a-date",
        content: "Valid Content",
        category: "Personal diary",
      });
      expect(invalidDate.valid).toBe(false);
      expect(invalidDate.errors.entryDate).toContain("YYYY-MM-DD");

      const validCheck = validateDiaryInput({
        title: "Valid Consultation",
        entryDate: "2026-10-10",
        content: "Detailed conference notes.",
        category: "Counsel meeting",
      });
      expect(validCheck.valid).toBe(true);
      expect(Object.keys(validCheck.errors).length).toBe(0);
    });

    it("adds a diary entry immutably with generated ID and timestamp", () => {
      const initialCount = diaryEntries.length;
      const { updated, newEntry } = addDiaryEntryRecord(
        diaryEntries,
        {
          caseId: 1,
          entryDate: "2026-10-10",
          title: "New Session Observation",
          content: "Observation regarding counter-affidavit filing.",
          category: "Court proceeding",
          tags: ["#Pleadings", "#Review"],
        },
        "2026-10-10",
      );

      expect(updated.length).toBe(initialCount + 1);
      expect(updated[0].id).toBe(newEntry.id);
      expect(updated[0].title).toBe("New Session Observation");
      expect(updated[0].updatedAt).toBe("2026-10-10");
      expect(diaryEntries.length).toBe(initialCount); // Original unmodified
    });

    it("updates an existing diary entry immutably", () => {
      const targetId = diaryEntries[0].id;
      const updated = updateDiaryEntryRecord(
        diaryEntries,
        targetId,
        {
          title: "Updated Note Title",
          content: "Updated content text.",
          tags: ["#UpdatedTag"],
        },
        "2026-10-11",
      );

      const modified = updated.find((e) => e.id === targetId);
      expect(modified?.title).toBe("Updated Note Title");
      expect(modified?.content).toBe("Updated content text.");
      expect(modified?.tags).toEqual(["#UpdatedTag"]);
      expect(modified?.updatedAt).toBe("2026-10-11");

      // Verify original is untouched
      expect(diaryEntries[0].title).not.toBe("Updated Note Title");
    });

    it("deletes a diary entry immutably", () => {
      const targetId = diaryEntries[0].id;
      const updated = deleteDiaryEntryRecord(diaryEntries, targetId);

      expect(updated.length).toBe(diaryEntries.length - 1);
      expect(updated.some((e) => e.id === targetId)).toBe(false);
      expect(diaryEntries.some((e) => e.id === targetId)).toBe(true);
    });
  });

  // ==========================================
  // MODULE C: BENCH HISTORY UNIT TESTS
  // ==========================================
  describe("Module C: Judge & Bench History Sorting & Assignment Display", () => {
    it("identifies the active presiding bench assignment", () => {
      const current = getCurrentBenchAssignment(benchAssignments, 1);
      expect(current).toBeDefined();
      expect(current?.status).toBe("Active");
      expect(current?.judgeName).toContain("Judge A. K. Sen");
      expect(current?.courtroom).toBe("Courtroom 3");
    });

    it("extracts historical past bench assignments chronologically", () => {
      const past = getHistoricalBenchAssignments(benchAssignments, 1);
      expect(past.length).toBeGreaterThan(0);
      expect(past.every((b) => b.status !== "Active")).toBe(true);
      expect(past[0].status).toBe("Transferred");
      expect(past[0].judgeName).toContain("Judge S. M. Varma");
      expect(past[0].transferredDate).toBe("2026-04-30");
    });

    it("sorts bench assignments chronologically by assigned date", () => {
      const sortedAsc = sortBenchAssignments(benchAssignments, "asc");
      expect(sortedAsc[0].assignedDate).toBe("2026-04-12");
      expect(sortedAsc[1].assignedDate).toBe("2026-05-01");

      const sortedDesc = sortBenchAssignments(benchAssignments, "desc");
      expect(sortedDesc[0].assignedDate).toBe("2026-05-01");
      expect(sortedDesc[1].assignedDate).toBe("2026-04-12");
    });

    it("filters bench assignments by case ID", () => {
      const case1Benches = filterBenchAssignmentsByCase(benchAssignments, 1);
      expect(case1Benches.length).toBe(2);
      expect(case1Benches.every((b) => b.caseId === 1)).toBe(true);

      const nonExistentCase = filterBenchAssignmentsByCase(
        benchAssignments,
        999,
      );
      expect(nonExistentCase).toEqual([]);
    });

    it("handles missing courtroom, transfer date, and notes gracefully without inventing data", () => {
      const assignmentWithMissingFields: BenchAssignment = {
        id: 99,
        caseId: 2,
        courtName: "Family Court, Rohini",
        courtroom: "",
        judgeName: "Judge R. K. Gupta",
        benchType: "Single Bench",
        assignedDate: "2026-06-01",
        status: "Active",
      };

      const result = getCurrentBenchAssignment(
        [assignmentWithMissingFields],
        2,
      );
      expect(result).toBeDefined();
      expect(result?.courtroom).toBe("");
      expect(result?.presidingNotes).toBeUndefined();
      expect(result?.transferredDate).toBeUndefined();
    });
  });
});
