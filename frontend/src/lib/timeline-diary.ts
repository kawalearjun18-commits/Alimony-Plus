import type {
  MilestoneEvent,
  MilestoneStage,
  MilestoneStatus,
  CaseDiaryEntry,
  DiaryCategory,
  BenchAssignment,
  BenchStatus,
} from "./types";

// --- Milestone Helpers ---

export function sortMilestonesChronologically(
  milestones: MilestoneEvent[],
  direction: "asc" | "desc" = "asc",
): MilestoneEvent[] {
  return [...milestones].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) {
      return direction === "asc" ? cmp : -cmp;
    }
    return direction === "asc" ? a.id - b.id : b.id - a.id;
  });
}

export function filterMilestones(
  milestones: MilestoneEvent[],
  options: {
    stage?: string;
    status?: string;
    caseId?: number;
    searchQuery?: string;
  } = {},
): MilestoneEvent[] {
  const { stage, status, caseId, searchQuery } = options;
  const q = searchQuery?.toLowerCase().trim();

  return milestones.filter((m) => {
    if (caseId && caseId > 0 && m.caseId !== caseId) {
      return false;
    }
    if (stage && stage !== "All" && m.stage !== stage) {
      return false;
    }
    if (status && status !== "All" && m.status !== status) {
      return false;
    }
    if (q) {
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q) ?? false;
      const matchCourt = m.courtroom?.toLowerCase().includes(q) ?? false;
      const matchNotes = m.notes?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchDesc && !matchCourt && !matchNotes) {
        return false;
      }
    }
    return true;
  });
}

// --- Case Diary Helpers ---

export function sortDiaryEntries(
  entries: CaseDiaryEntry[],
  direction: "asc" | "desc" = "desc",
): CaseDiaryEntry[] {
  return [...entries].sort((a, b) => {
    const cmp = a.entryDate.localeCompare(b.entryDate);
    if (cmp !== 0) {
      return direction === "asc" ? cmp : -cmp;
    }
    return direction === "asc" ? a.id - b.id : b.id - a.id;
  });
}

export function searchAndFilterDiary(
  entries: CaseDiaryEntry[],
  options: {
    query?: string;
    category?: string;
    tag?: string;
    caseId?: number;
  } = {},
): CaseDiaryEntry[] {
  const { query, category, tag, caseId } = options;
  const q = query?.toLowerCase().trim();
  const normalizedTag = tag && tag !== "All" ? normalizeTag(tag) : null;

  return entries.filter((e) => {
    if (caseId && caseId > 0 && e.caseId !== caseId) {
      return false;
    }
    if (category && category !== "All" && e.category !== category) {
      return false;
    }
    if (normalizedTag) {
      const hasTag = e.tags.some(
        (t) => normalizeTag(t).toLowerCase() === normalizedTag.toLowerCase(),
      );
      if (!hasTag) {
        return false;
      }
    }
    if (q) {
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchContent = e.content.toLowerCase().includes(q);
      const matchTags = e.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) {
        return false;
      }
    }
    return true;
  });
}

export function normalizeTag(tag: string): string {
  const trimmed = tag.trim().replace(/^#+/, "");
  return trimmed ? `#${trimmed}` : "";
}

export function parseTagString(tagsStr: string): string[] {
  if (!tagsStr.trim()) return [];
  const parts = tagsStr
    .split(/[,\s]+/)
    .map((t) => normalizeTag(t))
    .filter(Boolean);
  return Array.from(new Set(parts));
}

export function extractUniqueTags(entries: CaseDiaryEntry[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      const norm = normalizeTag(tag);
      if (norm) {
        set.add(norm);
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function validateDiaryInput(input: {
  title?: string;
  entryDate?: string;
  content?: string;
  category?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.title || !input.title.trim()) {
    errors.title = "Diary note title is required.";
  }

  if (!input.entryDate || !input.entryDate.trim()) {
    errors.entryDate = "Entry date is required.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate.trim())) {
    errors.entryDate = "Entry date must be in YYYY-MM-DD format.";
  }

  if (!input.content || !input.content.trim()) {
    errors.content = "Diary content/notes cannot be empty.";
  }

  const validCategories: DiaryCategory[] = [
    "Court proceeding",
    "Counsel meeting",
    "Evidence note",
    "Personal diary",
  ];
  if (
    !input.category ||
    !validCategories.includes(input.category as DiaryCategory)
  ) {
    errors.category = "Please select a valid diary category.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function addDiaryEntryRecord(
  entries: CaseDiaryEntry[],
  input: Omit<CaseDiaryEntry, "id" | "updatedAt">,
  asOf: string,
): { updated: CaseDiaryEntry[]; newEntry: CaseDiaryEntry } {
  const newEntry: CaseDiaryEntry = {
    ...input,
    id: Date.now(),
    updatedAt: asOf,
  };
  return {
    updated: [newEntry, ...entries],
    newEntry,
  };
}

export function updateDiaryEntryRecord(
  entries: CaseDiaryEntry[],
  id: number,
  patch: Partial<CaseDiaryEntry>,
  asOf: string,
): CaseDiaryEntry[] {
  return entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          ...patch,
          updatedAt: asOf,
        }
      : entry,
  );
}

export function deleteDiaryEntryRecord(
  entries: CaseDiaryEntry[],
  id: number,
): CaseDiaryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

// --- Bench Assignment Helpers ---

export function sortBenchAssignments(
  assignments: BenchAssignment[],
  direction: "asc" | "desc" = "desc",
): BenchAssignment[] {
  return [...assignments].sort((a, b) => {
    const cmp = a.assignedDate.localeCompare(b.assignedDate);
    if (cmp !== 0) {
      return direction === "asc" ? cmp : -cmp;
    }
    return direction === "asc" ? a.id - b.id : b.id - a.id;
  });
}

export function filterBenchAssignmentsByCase(
  assignments: BenchAssignment[],
  caseId?: number,
): BenchAssignment[] {
  if (!caseId || caseId <= 0) {
    return assignments;
  }
  return assignments.filter((b) => b.caseId === caseId);
}

export function getCurrentBenchAssignment(
  assignments: BenchAssignment[],
  caseId?: number,
): BenchAssignment | undefined {
  const filtered = filterBenchAssignmentsByCase(assignments, caseId);
  return (
    filtered.find((b) => b.status === "Active") ??
    filtered.sort((a, b) => b.assignedDate.localeCompare(a.assignedDate))[0]
  );
}

export function getHistoricalBenchAssignments(
  assignments: BenchAssignment[],
  caseId?: number,
): BenchAssignment[] {
  const filtered = filterBenchAssignmentsByCase(assignments, caseId);
  const current = getCurrentBenchAssignment(filtered, caseId);
  return filtered
    .filter((b) => (current ? b.id !== current.id : b.status !== "Active"))
    .sort((a, b) => b.assignedDate.localeCompare(a.assignedDate));
}
