
"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Search,
  CalendarDays,

  ShieldCheck,
  ClipboardList,
  ArrowRightLeft,
  Bell,
  Download,
  Plus,
  Save,
} from "lucide-react";
import { formatCourtDate } from "@/lib/cnr";

const STAGES = [
  "Summons",
  "Written Statement",
  "Issues",
  "Evidence",
  "Final Arguments",
] as const;

type TransferRecord = {
  id: string;
  bench: string;
  date: string;
  reason: string;
};

type AdjournmentRecord = {
  id: string;
  date: string;
  reason: string;
};

type DiaryData = {
  caseTitle: string;
  courtName: string;
  caseStatus: string;
  currentStage: string;
  nextHearingDate: string;
  courtHall: string;
  advocateInstructions: string;
  courtroomNotes: string;
  reminderEnabled: boolean;
  transfers: TransferRecord[];
  adjournments: AdjournmentRecord[];
};

const EMPTY_DIARY: DiaryData = {
  caseTitle: "",
  courtName: "",
  caseStatus: "Not verified",
  currentStage: "",
  nextHearingDate: "",
  courtHall: "",
  advocateInstructions: "",
  courtroomNotes: "",
  reminderEnabled: false,
  transfers: [],
  adjournments: [],
};

const STORAGE_KEY = "alimony-plus-cnr-diary-v1";
const EMPTY_DIARY_JSON = JSON.stringify(EMPTY_DIARY);

export function CnrLookup() {
  const [cnrNumber, setCnrNumber] = useState("");
  const [diary, setDiary] = useState<DiaryData>(EMPTY_DIARY);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [transferBench, setTransferBench] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [adjournmentDate, setAdjournmentDate] = useState("");
  const [adjournmentReason, setAdjournmentReason] = useState("");

  useEffect(() => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved) as Partial<DiaryData>;
      setDiary({ ...EMPTY_DIARY, ...parsed });
    }
  } catch {
    setMessage("Saved browser data could not be loaded.");
  } finally {
    setLoaded(true);
  }
}, []);

useEffect(() => {
  if (!loaded) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(diary));
  } catch {
    setMessage("Could not save diary in this browser.");
  }
}, [diary, loaded]);

  function updateDiary<K extends keyof DiaryData>(
    key: K,
    value: DiaryData[K],
  ) {
    setDiary((previous) => ({ ...previous, [key]: value }));
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const normalized = cnrNumber.trim().toUpperCase();

    if (!/^[A-Z0-9]{16}$/.test(normalized)) {
      setMessage("Enter a CNR number containing 16 letters or digits.");
      return;
    }

    setCnrNumber(normalized);
    setSearching(true);

    // No verified eCourts endpoint is configured in this frontend yet.
    // Do not present locally entered information as official court data.
    setMessage(
      "CNR format accepted. Live eCourts lookup is not connected, so no official case details were fetched.",
    );
    setSearching(false);
  }

  function addTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!transferBench.trim() || !transferDate) {
      setMessage("Enter the new bench and transfer date.");
      return;
    }

    updateDiary("transfers", [
      ...diary.transfers,
      {
        id: crypto.randomUUID(),
        bench: transferBench.trim(),
        date: transferDate,
        reason: transferReason.trim(),
      },
    ]);

    setTransferBench("");
    setTransferDate("");
    setTransferReason("");
    setMessage("Transfer note saved in this browser.");
  }

  function addAdjournment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!adjournmentDate || !adjournmentReason.trim()) {
      setMessage("Enter the adjournment date and reason.");
      return;
    }

    updateDiary("adjournments", [
      ...diary.adjournments,
      {
        id: crypto.randomUUID(),
        date: adjournmentDate,
        reason: adjournmentReason.trim(),
      },
    ]);

    setAdjournmentDate("");
    setAdjournmentReason("");
    setMessage("Adjournment note saved in this browser.");
  }

  function exportCalendar() {
    if (!diary.nextHearingDate) {
      setMessage("Add the next hearing date before exporting the calendar.");
      return;
    }

    const date = diary.nextHearingDate.replaceAll("-", "");
    const title = (diary.caseTitle || "Court hearing")
      .replace(/[\r\n]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");

    const location = (diary.courtHall || diary.courtName || "")
      .replace(/[\r\n]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");

    const escapeText = (value: string) =>
      value
        .replace(/\\/g, "\\\\")
        .replace(/[\r\n]/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");

    const event = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Alimony Plus//Case Diary//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@alimony-plus`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${date}`,
      `SUMMARY:${escapeText(title)}`,
      `LOCATION:${escapeText(location)}`,
      `DESCRIPTION:${escapeText(`CNR: ${cnrNumber || "Not entered"}. Verify hearing details with the official court source.`)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([event], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "alimony-plus-hearing.ics";
    anchor.click();

    URL.revokeObjectURL(url);
    setMessage("Calendar file downloaded. Verify the hearing details before relying on it.");
  }

  const currentStageIndex = STAGES.indexOf(
    diary.currentStage as (typeof STAGES)[number],
  );

  return (
    <div className="cnr-page">
      <header className="cnr-header">
        <div>
          <p className="cnr-eyebrow">CASE MANAGEMENT</p>
          <h1>CNR Lookup & Case Diary</h1>
          <p className="cnr-subtitle">
            Organise case progression, hearing notes and next steps in one place.
          </p>
        </div>
        <span className="cnr-status">
          <ShieldCheck size={16} />
          <span>Lookup integration pending</span>
        </span>
      </header>

      <section className="cnr-panel">
        <div className="cnr-section-heading">
          <div>
            <h2>Find a case</h2>
            <p>Enter the 16-character CNR number.</p>
          </div>
          <Search size={22} />
        </div>

        <form onSubmit={handleSearch} className="cnr-search-form">
          <label htmlFor="cnr-number">CNR number</label>
          <div className="cnr-input-row">
            <input
              id="cnr-number"
              value={cnrNumber}
              onChange={(event) => setCnrNumber(event.target.value.toUpperCase())}
              maxLength={16}
              autoComplete="off"
              placeholder="Enter CNR number"
              required
            />
            <button className="cnr-button primary" type="submit" disabled={searching}>
              <Search size={16} />
              {searching ? "Searching..." : "Lookup"}
            </button>
          </div>
        </form>

        <p className="cnr-disclaimer">
          Format validation only: this page is not connected to a verified live
          eCourts endpoint. No official case status is fetched or confirmed.
        </p>

        {message && (
          <p className="cnr-message" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="cnr-panel">
        <div className="cnr-section-heading">
          <div>
            <h2>Case details</h2>
            <p>Enter details only after verifying them from an official source.</p>
          </div>
          <ClipboardList size={22} />
        </div>

        <div className="cnr-form-grid">
          <label>
            Case title
            <input
              value={diary.caseTitle}
              onChange={(event) => updateDiary("caseTitle", event.target.value)}
              placeholder="Case title"
            />
          </label>
          <label>
            Case status
            <select
              value={diary.caseStatus}
              onChange={(event) => updateDiary("caseStatus", event.target.value)}
            >
              <option>Not verified</option>
              <option>Pending</option>
              <option>Disposed</option>
              <option>Transferred</option>
            </select>
          </label>
          <label>
            Court name
            <input
              value={diary.courtName}
              onChange={(event) => updateDiary("courtName", event.target.value)}
              placeholder="Court name"
            />
          </label>
          <label>
            Court hall / room
            <input
              value={diary.courtHall}
              onChange={(event) => updateDiary("courtHall", event.target.value)}
              placeholder="Court hall"
            />
          </label>
          <label>
            Next hearing date
            <input
              type="date"
              value={diary.nextHearingDate}
              onChange={(event) => updateDiary("nextHearingDate", event.target.value)}
            />
          </label>
          <label>
            Current stage
            <select
              value={diary.currentStage}
              onChange={(event) => updateDiary("currentStage", event.target.value)}
            >
              <option value="">Select stage</option>
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="cnr-save-note">
          <Save size={16} />
          <span>
            {loaded
              ? "Changes save in this browser only."
              : "Loading saved browser notes..."}
          </span>
        </div>
      </section>

      <section className="cnr-panel">
        <div className="cnr-section-heading">
          <div>
            <h2>Case progression diary</h2>
            <p>Use the stages as an organiser; confirm actual progress with court records.</p>
          </div>
          <CalendarDays size={22} />
        </div>

        <div className="cnr-timeline">
          {STAGES.map((stage, index) => {
            const complete = currentStageIndex >= 0 && index < currentStageIndex;
            const current = stage === diary.currentStage;

            return (
              <button
                type="button"
                key={stage}
                className={`cnr-stage ${complete ? "complete" : ""} ${current ? "current" : ""}`}
                onClick={() => updateDiary("currentStage", stage)}
                aria-pressed={current}
              >
                <span className="cnr-stage-number">{index + 1}</span>
                <span className="cnr-stage-text">
                  <strong>{stage}</strong>
                  <small>
                    {complete ? "Before selected stage" : current ? "Selected stage" : "Select to mark current stage"}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="cnr-two-column">
        <article className="cnr-panel">
          <h2>Advocate instructions</h2>
          <p className="cnr-muted">Record preparation tasks or follow-up points.</p>
          <textarea
            rows={5}
            value={diary.advocateInstructions}
            onChange={(event) => updateDiary("advocateInstructions", event.target.value)}
            placeholder="Instructions, documents to prepare, questions to ask..."
          />
        </article>

        <article className="cnr-panel">
          <h2>Courtroom notes</h2>
          <p className="cnr-muted">Keep factual notes. Avoid entering unnecessary sensitive details.</p>
          <textarea
            rows={5}
            value={diary.courtroomNotes}
            onChange={(event) => updateDiary("courtroomNotes", event.target.value)}
            placeholder="Proceedings summary, next steps, directions..."
          />
        </article>
      </section>

      <section className="cnr-panel">
        <div className="cnr-section-heading">
          <div>
            <h2>Bench / judge transfer history</h2>
            <p>Track manually verified transfers.</p>
          </div>
          <ArrowRightLeft size={22} />
        </div>

        <form className="cnr-form-grid" onSubmit={addTransfer}>
          <label>
            New bench / court
            <input
              value={transferBench}
              onChange={(event) => setTransferBench(event.target.value)}
              placeholder="Bench or court name"
              required
            />
          </label>
          <label>
            Transfer date
            <input
              type="date"
              value={transferDate}
              onChange={(event) => setTransferDate(event.target.value)}
              required
            />
          </label>
          <label className="cnr-full-width">
            Transfer reason / reference
            <input
              value={transferReason}
              onChange={(event) => setTransferReason(event.target.value)}
              placeholder="Reason or official reference, if known"
            />
          </label>
          <button className="cnr-button primary" type="submit">
            <Plus size={16} /> Add transfer
          </button>
        </form>

        {diary.transfers.length === 0 ? (
          <p className="cnr-empty">No transfer notes recorded.</p>
        ) : (
          <div className="cnr-record-list">
            {[...diary.transfers]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((item) => (
                <article className="cnr-record" key={item.id}>
                  <strong>{item.bench}</strong>
                  <span>{formatCourtDate(item.date)}</span>
                  {item.reason && <p>{item.reason}</p>}
                </article>
              ))}
          </div>
        )}
      </section>

      <section className="cnr-panel">
        <div className="cnr-section-heading">
          <div>
            <h2>Adjournment history</h2>
            <p>Record reasons as noted in verified court records or orders.</p>
          </div>
          <ClipboardList size={22} />
        </div>

        <form className="cnr-form-grid" onSubmit={addAdjournment}>
          <label>
            Adjournment date
            <input
              type="date"
              value={adjournmentDate}
              onChange={(event) => setAdjournmentDate(event.target.value)}
              required
            />
          </label>
          <label>
            Reason
            <input
              value={adjournmentReason}
              onChange={(event) => setAdjournmentReason(event.target.value)}
              placeholder="Reason from court record"
              required
            />
          </label>
          <button className="cnr-button primary" type="submit">
            <Plus size={16} /> Add adjournment
          </button>
        </form>

        <div className="cnr-analytics">
          <div>
            <strong>{diary.adjournments.length}</strong>
            <span>Recorded adjournments</span>
          </div>
          <div>
            <strong>{diary.transfers.length}</strong>
            <span>Recorded transfers</span>
          </div>
        </div>

        {diary.adjournments.length === 0 ? (
          <p className="cnr-empty">No adjournment notes recorded.</p>
        ) : (
          <div className="cnr-record-list">
            {[...diary.adjournments]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((item) => (
                <article className="cnr-record" key={item.id}>
                  <strong>{formatCourtDate(item.date)}</strong>
                  <p>{item.reason}</p>
                </article>
              ))}
          </div>
        )}
      </section>

      <section className="cnr-panel cnr-reminder-panel">
        <div className="cnr-section-heading">
          <div>
            <h2>Hearing reminder & calendar</h2>
            <p>Export the manually entered hearing date to your calendar.</p>
          </div>
          <Bell size={22} />
        </div>

        <label className="cnr-reminder-toggle">
          <input
            type="checkbox"
            checked={diary.reminderEnabled}
            onChange={(event) => updateDiary("reminderEnabled", event.target.checked)}
          />
          <span>Mark this case for reminder follow-up</span>
        </label>

        <p className="cnr-muted">
          {diary.nextHearingDate
            ? `Next hearing entered: ${formatCourtDate(diary.nextHearingDate)}`
            : "Add a next hearing date in Case details to export a calendar event."}
        </p>

        <button className="cnr-button primary" type="button" onClick={exportCalendar}>
          <Download size={16} /> Export .ics calendar
        </button>
        <p className="cnr-disclaimer">
          This checkbox does not schedule a notification by itself. Calendar export
          creates an event for the selected date; it does not verify the hearing.
        </p>
      </section>
    </div>
  );
}
