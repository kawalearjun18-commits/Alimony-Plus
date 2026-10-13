"use client";

import { useState, useId, type FormEvent } from "react";
import {
  BookOpen,
  Calendar,
  Lock,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Tag,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  RotateCcw,
  ShieldCheck,
  Info,
  Scale,
  Users,
  FileCheck2,
  FileText,
  X,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Empty, Field, Modal, PageHeading } from "./ui";
import { dateLabel } from "@/lib/ledger";
import type { CaseDiaryEntry, DiaryCategory } from "@/lib/types";
import {
  sortDiaryEntries,
  searchAndFilterDiary,
  extractUniqueTags,
  parseTagString,
  validateDiaryInput,
} from "@/lib/timeline-diary";

const CATEGORIES: ("All" | DiaryCategory)[] = [
  "All",
  "Court proceeding",
  "Counsel meeting",
  "Evidence note",
  "Personal diary",
];

export function CaseDiary() {
  const {
    data,
    demo,
    asOf,
    selectedCase,
    setSelectedCase,
    addDiaryEntry,
    updateDiaryEntry,
    deleteDiaryEntry,
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CaseDiaryEntry | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const availableTags = extractUniqueTags(data.diaryEntries);

  const filteredEntries = searchAndFilterDiary(data.diaryEntries, {
    query: searchQuery,
    category: selectedCategory,
    tag: selectedTag,
    caseId: selectedCase,
  });

  const sortedEntries = sortDiaryEntries(filteredEntries, sortDirection);

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExpandAll() {
    setExpandedIds(new Set(sortedEntries.map((e) => e.id)));
  }

  function handleCollapseAll() {
    setExpandedIds(new Set());
  }

  function resetFilters() {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedTag("All");
  }

  function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErrors({});
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim();
    const entryDate = String(form.get("entryDate") || "").trim();
    const category = String(
      form.get("category") || "Court proceeding",
    ) as DiaryCategory;
    const content = String(form.get("content") || "").trim();
    const rawTags = String(form.get("tags") || "").trim();
    const isPrivate = form.get("isPrivate") === "on";
    const targetCaseId = Number(
      form.get("caseId") || selectedCase || data.cases[0]?.id || 1,
    );

    const validation = validateDiaryInput({
      title,
      entryDate,
      content,
      category,
    });
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    const tags = parseTagString(rawTags);

    addDiaryEntry({
      caseId: targetCaseId,
      title,
      entryDate,
      category,
      content,
      tags,
      isPrivate,
      author: demo ? "Meera (Demo)" : "Personal Note",
    });

    setCreateModalOpen(false);
  }

  function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingEntry) return;
    setFormErrors({});
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") || "").trim();
    const entryDate = String(form.get("entryDate") || "").trim();
    const category = String(
      form.get("category") || "Court proceeding",
    ) as DiaryCategory;
    const content = String(form.get("content") || "").trim();
    const rawTags = String(form.get("tags") || "").trim();
    const isPrivate = form.get("isPrivate") === "on";

    const validation = validateDiaryInput({
      title,
      entryDate,
      content,
      category,
    });
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    const tags = parseTagString(rawTags);

    updateDiaryEntry(editingEntry.id, {
      title,
      entryDate,
      category,
      content,
      tags,
      isPrivate,
    });

    setEditingEntry(null);
  }

  function handleDeleteConfirm() {
    if (deletingId !== null) {
      deleteDiaryEntry(deletingId);
      setDeletingId(null);
    }
  }

  function getCategoryIcon(cat: DiaryCategory) {
    switch (cat) {
      case "Court proceeding":
        return <Scale size={13} className="inline mr-1" />;
      case "Counsel meeting":
        return <Users size={13} className="inline mr-1" />;
      case "Evidence note":
        return <FileCheck2 size={13} className="inline mr-1" />;
      case "Personal diary":
        return <BookOpen size={13} className="inline mr-1" />;
      default:
        return null;
    }
  }

  return (
    <div className="case-diary-view" aria-label="Case Diary and Journal">
      <PageHeading
        eyebrow="CONFIDENTIAL CASE JOURNAL"
        title="Case Diary & Notes"
        description="A secure chronological record of court proceedings, legal counsel conferences, evidence collection, and personal observations."
      >
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
          }
          aria-label={`Sort ${sortDirection === "asc" ? "newest first" : "oldest first"}`}
        >
          <ArrowUpDown size={15} />
          {sortDirection === "desc" ? "Newest First" : "Oldest First"}
        </button>
        <button
          type="button"
          className="button primary"
          onClick={() => {
            setFormErrors({});
            setCreateModalOpen(true);
          }}
        >
          <Plus size={16} />
          New diary note
        </button>
      </PageHeading>

      {/* Privacy Guarantee & Demo Banner */}
      <div className="callout mb-5">
        <Info size={16} />
        <div>
          {demo ? (
            <span>
              <strong>Demonstration Case Diary</strong>: Notes below are sample
              records illustrating chronological diary management and tag
              categorization.
            </span>
          ) : (
            <span>
              <strong>In-Memory Privacy Mode</strong>: Diary notes are stored
              safely in-memory during this active session. Confidential
              reflections are never saved to browser persistent storage.
            </span>
          )}
        </div>
      </div>

      {/* Controls & Search Toolbar */}
      <div className="panel diary-toolbar-panel mb-6">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search note titles, content, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search diary notes"
            />
          </div>

          {data.cases.length > 1 && (
            <div className="case-selector">
              <label htmlFor="diary-case-select">Case:</label>
              <select
                id="diary-case-select"
                value={selectedCase}
                onChange={(e) => setSelectedCase(Number(e.target.value))}
              >
                <option value={0}>
                  All cases ({data.diaryEntries.length} notes)
                </option>
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

        {/* Category Tabs */}
        <div className="filter-group mt-3">
          <span className="filter-group-label">Category:</span>
          <div
            className="filter-tabs"
            role="group"
            aria-label="Filter by diary category"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={selectedCategory === cat ? "selected" : ""}
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selectedCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Filters */}
        {availableTags.length > 0 && (
          <div className="filter-group mt-2">
            <span className="filter-group-label">Tags:</span>
            <div className="tag-chips-feed">
              <button
                type="button"
                className={`tag-chip-btn ${selectedTag === "All" ? "selected" : ""}`}
                onClick={() => setSelectedTag("All")}
              >
                All tags
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip-btn ${selectedTag === tag ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedTag((prev) => (prev === tag ? "All" : tag))
                  }
                  aria-pressed={selectedTag === tag}
                >
                  <Tag size={11} className="inline mr-1" />
                  {tag}
                </button>
              ))}
              {selectedTag !== "All" && (
                <button
                  type="button"
                  className="tag-clear-btn"
                  onClick={() => setSelectedTag("All")}
                  aria-label="Clear tag filter"
                >
                  <X size={12} />
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Diary Entries List */}
      {sortedEntries.length === 0 ? (
        <Empty
          title="No diary entries match your criteria"
          action={
            <button
              type="button"
              className="button secondary"
              onClick={resetFilters}
            >
              <RotateCcw size={15} />
              Reset search & filters
            </button>
          }
        >
          {data.diaryEntries.length === 0
            ? "Your case diary is currently empty. Record your first hearing notes or counsel discussion."
            : "No notes match the current search keyword, category, or tag filter."}
        </Empty>
      ) : (
        <div
          className="diary-entries-feed"
          role="feed"
          aria-label="Chronological diary entries"
        >
          {sortedEntries.map((entry) => {
            const isExpanded = expandedIds.has(entry.id);
            const caseRecord = data.cases.find((c) => c.id === entry.caseId);

            return (
              <article
                key={entry.id}
                className="panel diary-entry-card"
                aria-expanded={isExpanded}
              >
                <div className="diary-card-header">
                  <div className="diary-card-meta">
                    <span className="diary-date-label">
                      <Calendar size={13} className="inline mr-1 text-muted" />
                      {dateLabel(entry.entryDate)}
                    </span>
                    <Badge>
                      {getCategoryIcon(entry.category)}
                      {entry.category}
                    </Badge>
                    {entry.isPrivate && (
                      <Badge tone="neutral">
                        <Lock size={11} className="inline mr-1" />
                        Private note
                      </Badge>
                    )}
                    {caseRecord && !selectedCase && (
                      <span className="small muted">Case #{caseRecord.id}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="icon-button compact-btn"
                      onClick={() => {
                        setFormErrors({});
                        setEditingEntry(entry);
                      }}
                      aria-label={`Edit ${entry.title}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button compact-btn"
                      onClick={() => setDeletingId(entry.id)}
                      aria-label={`Delete ${entry.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button compact-btn"
                      onClick={() => toggleExpand(entry.id)}
                      aria-label={isExpanded ? "Collapse note" : "Expand note"}
                      aria-controls={`diary-content-${entry.id}`}
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <h3
                  className="diary-entry-title"
                  onClick={() => toggleExpand(entry.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(entry.id);
                    }
                  }}
                >
                  {entry.title}
                </h3>

                {/* Content snippet or full content */}
                <div
                  id={`diary-content-${entry.id}`}
                  className="diary-entry-body"
                >
                  <p
                    className={`diary-content-text ${isExpanded ? "expanded" : "collapsed"}`}
                  >
                    {entry.content}
                  </p>
                </div>

                {/* Tags Feed */}
                {entry.tags.length > 0 && (
                  <div className="diary-entry-tags mt-3">
                    {entry.tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`tag-chip ${selectedTag === t ? "active" : ""}`}
                        onClick={() =>
                          setSelectedTag((prev) => (prev === t ? "All" : t))
                        }
                        title={`Filter by ${t}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {/* Expanded footer info */}
                {isExpanded && (
                  <div className="diary-entry-footer mt-4">
                    <span className="small muted">
                      Author: {entry.author || "Personal note"}
                    </span>
                    {entry.updatedAt && (
                      <span className="small muted">
                        Last saved: {dateLabel(entry.updatedAt)}
                      </span>
                    )}
                    {demo && (
                      <span className="synthetic-badge-pill">
                        <ShieldCheck size={12} />
                        Synthetic demo note
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Create Note Modal */}
      {createModalOpen && (
        <Modal
          title="New Case Diary Entry"
          description="Record private procedural notes, hearing observations, or conference summaries."
          onClose={() => setCreateModalOpen(false)}
        >
          <form onSubmit={handleCreateSubmit}>
            <Field label="Case" hint="Case record linked to this diary entry.">
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
              label="Note Title"
              hint="Brief summary of the discussion or event."
            >
              <input
                name="title"
                placeholder="e.g. Consultation on Rajnesh v Neha income disclosure"
                required
              />
              {formErrors.title && (
                <span className="form-error-msg">{formErrors.title}</span>
              )}
            </Field>

            <div className="grid-2 gap-4">
              <Field
                label="Date"
                hint="Date of the proceeding or conversation."
              >
                <input
                  type="date"
                  name="entryDate"
                  defaultValue={demo ? "2026-10-09" : asOf}
                  required
                />
                {formErrors.entryDate && (
                  <span className="form-error-msg">{formErrors.entryDate}</span>
                )}
              </Field>

              <Field label="Category">
                <select name="category" defaultValue="Court proceeding">
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <span className="form-error-msg">{formErrors.category}</span>
                )}
              </Field>
            </div>

            <Field
              label="Custom Tags (Multiple)"
              hint="Enter tags separated by commas or spaces (e.g. InterimOrder, Arrears, Evidence)."
            >
              <input
                name="tags"
                placeholder="e.g. InterimOrder, PaymentReceipt, Arrears"
              />
            </Field>

            <Field
              label="Diary Content & Notes"
              hint="Confidential observations, action steps, or notes."
            >
              <textarea
                name="content"
                rows={5}
                placeholder="Write detailed notes regarding courtroom discussions, counsel instructions, or questions..."
                required
              />
              {formErrors.content && (
                <span className="form-error-msg">{formErrors.content}</span>
              )}
            </Field>

            <div className="diary-privacy-toggle mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isPrivate" defaultChecked />
                <span>Mark as confidential personal reflection</span>
              </label>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                Save diary note
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Note Modal */}
      {editingEntry && (
        <Modal
          title="Edit Diary Note"
          description="Update details or tags for this diary entry."
          onClose={() => setEditingEntry(null)}
        >
          <form onSubmit={handleEditSubmit}>
            <Field label="Note Title">
              <input name="title" defaultValue={editingEntry.title} required />
              {formErrors.title && (
                <span className="form-error-msg">{formErrors.title}</span>
              )}
            </Field>

            <div className="grid-2 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  name="entryDate"
                  defaultValue={editingEntry.entryDate}
                  required
                />
                {formErrors.entryDate && (
                  <span className="form-error-msg">{formErrors.entryDate}</span>
                )}
              </Field>

              <Field label="Category">
                <select name="category" defaultValue={editingEntry.category}>
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <span className="form-error-msg">{formErrors.category}</span>
                )}
              </Field>
            </div>

            <Field
              label="Custom Tags"
              hint="Enter tags separated by commas or spaces."
            >
              <input name="tags" defaultValue={editingEntry.tags.join(", ")} />
            </Field>

            <Field label="Diary Content & Notes">
              <textarea
                name="content"
                rows={5}
                defaultValue={editingEntry.content}
                required
              />
              {formErrors.content && (
                <span className="form-error-msg">{formErrors.content}</span>
              )}
            </Field>

            <div className="diary-privacy-toggle mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPrivate"
                  defaultChecked={editingEntry.isPrivate}
                />
                <span>Mark as confidential personal reflection</span>
              </label>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditingEntry(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                Update note
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <Modal
          title="Delete Diary Entry"
          description="Are you sure you want to remove this diary note from your session?"
          onClose={() => setDeletingId(null)}
        >
          <div className="delete-confirm-box">
            <p className="mb-4">
              This note will be permanently removed from memory.
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleDeleteConfirm}
              >
                Yes, delete note
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
