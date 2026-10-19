"use client";

import { useMemo, useState } from "react";

/* ---------- DATA ---------- */
// DEMO centres: no phone/address on purpose. Verify at nalsa.gov.in.
const CENTRES = [
  { id: 1, level: "NALSA", name: "National Legal Services Authority", state: "Delhi", district: "New Delhi", services: ["Legal advice", "Mediation"] },
  { id: 2, level: "SLSA", name: "Maharashtra State Legal Services Authority", state: "Maharashtra", district: "Mumbai", services: ["Legal advice", "Lok Adalat"] },
  { id: 3, level: "DLSA", name: "District Legal Services Authority", state: "Maharashtra", district: "Pune", services: ["Legal advice", "Free lawyer", "Lok Adalat"] },
  { id: 4, level: "DLSA", name: "District Legal Services Authority", state: "Delhi", district: "South Delhi", services: ["Legal advice", "Free lawyer"] },
  { id: 5, level: "SLSA", name: "Karnataka State Legal Services Authority", state: "Karnataka", district: "Bengaluru", services: ["Legal advice", "Mediation"] },
  { id: 6, level: "DLSA", name: "District Legal Services Authority", state: "Karnataka", district: "Bengaluru Urban", services: ["Free lawyer", "Lok Adalat"] },
];

// Real national numbers. Click-to-call only for these.
const HELPLINES = [
  { name: "NALSA Legal Aid Helpline", number: "15100", info: "Free legal aid guidance (national)." },
  { name: "Women Helpline", number: "181", info: "Support for women in distress (national)." },
  { name: "Emergency Response", number: "112", info: "Police, fire and medical emergencies." },
  { name: "National Commission for Women", number: "7827170170", info: "Complaints and support for women." },
];

const QUESTIONS = [
  "Are you a woman or a child?",
  "Do you belong to a Scheduled Caste or Scheduled Tribe?",
  "Are you a person with a disability?",
  "Are you a victim of trafficking, a disaster, or violence?",
  "Is your annual income below your state's legal-aid limit?",
  "Are you in custody or a protective home?",
];

const SERVICE_TYPES = ["All", "Legal advice", "Free lawyer", "Lok Adalat", "Mediation"];

const field =
  "mt-1 w-full rounded-md border border-gray-400 bg-white p-2 text-black";
const btn =
  "rounded-md bg-blue-800 px-4 py-2 font-medium text-white hover:bg-blue-900 focus:outline-2 focus:outline-offset-2 focus:outline-blue-800";
const card = "rounded-lg border border-gray-300 bg-white p-4 text-black";

/* ---------- 1 + 5: DIRECTORY & DLSA LOCATOR ---------- */
function Directory() {
  const [query, setQuery] = useState("");
  const [service, setService] = useState("All");
  const [level, setLevel] = useState("All");

  const results = useMemo(
    () =>
      CENTRES.filter((c) => {
        const text = `${c.state} ${c.district} ${c.name}`.toLowerCase();
        return (
          text.includes(query.trim().toLowerCase()) &&
          (service === "All" || c.services.includes(service)) &&
          (level === "All" || c.level === level)
        );
      }),
    [query, service, level],
  );

  return (
    <section aria-labelledby="dir-title" className="space-y-3">
      <h2 id="dir-title" className="text-xl font-semibold">
        1. Legal aid directory &amp; DLSA locator
      </h2>
      <p role="note" className="rounded bg-yellow-100 p-2 text-sm text-black">
        Demo data. Centre phone numbers and addresses are not shown here. Confirm
        your local office at{" "}
        <a className="underline" href="https://nalsa.gov.in" target="_blank" rel="noreferrer">
          nalsa.gov.in
        </a>
        .
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          Search state or district
          <input className={field} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Pune" />
        </label>
        <label className="block text-sm">
          Service type
          <select className={field} value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          Authority level
          <select className={field} value={level} onChange={(e) => setLevel(e.target.value)}>
            {["All", "NALSA", "SLSA", "DLSA"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <p aria-live="polite" className="text-sm">{results.length} centre(s) found</p>
      {results.length === 0 && <p className={card}>No centres match. Try clearing a filter.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {results.map((c) => (
          <li key={c.id} className={card}>
            <p className="text-xs font-bold text-blue-800">{c.level} (demo)</p>
            <h3 className="font-semibold">{c.name}</h3>
            <p className="text-sm">{c.district}, {c.state}</p>
            <p className="text-sm">Services: {c.services.join(", ")}</p>
            <a
              className="mt-2 inline-block text-sm text-blue-800 underline"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.level} legal services authority ${c.district} ${c.state}`)}`}
            >
              Get directions (opens Google Maps)
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- 3: HELPLINES ---------- */
function Helplines() {
  return (
    <section aria-labelledby="help-title" className="space-y-3">
      <h2 id="help-title" className="text-xl font-semibold">3. Women protection &amp; helplines</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {HELPLINES.map((h) => (
          <li key={h.number} className={card}>
            <h3 className="font-semibold">{h.name}</h3>
            <p className="text-sm">{h.info}</p>
            <a className={`${btn} mt-2 inline-block`} href={`tel:${h.number}`}>
              Call {h.number}
            </a>
          </li>
        ))}
      </ul>
      <p className="text-sm">Please re-check these numbers on official websites before relying on them.</p>
    </section>
  );
}

/* ---------- 2: ELIGIBILITY ---------- */
function Eligibility() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const yes = Object.values(answers).filter((a) => a === "yes").length;
  const complete = Object.keys(answers).length === QUESTIONS.length;

  return (
    <section aria-labelledby="elig-title" className="space-y-3">
      <h2 id="elig-title" className="text-xl font-semibold">2. Free legal aid eligibility check</h2>
      <p role="note" className="rounded bg-yellow-100 p-2 text-sm text-black">
        This is a preliminary check only. It does not guarantee eligibility. The
        final decision is made by the legal services authority, and income limits
        differ by state.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); if (complete) setDone(true); }}
      >
        {QUESTIONS.map((q, i) => (
          <fieldset key={q} className={card}>
            <legend className="font-medium">{q}</legend>
            {["yes", "no"].map((v) => (
              <label key={v} className="mr-6 inline-flex items-center gap-2">
                <input
                  type="radio"
                  name={`q${i}`}
                  checked={answers[i] === v}
                  onChange={() => { setAnswers({ ...answers, [i]: v }); setDone(false); }}
                />
                {v === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </fieldset>
        ))}
        <button className={btn} type="submit" disabled={!complete}>See result</button>
        {!complete && <p className="text-sm">Please answer all questions.</p>}
      </form>
      {done && (
        <p role="status" className={card}>
          {yes > 0
            ? "You may qualify for free legal aid. Contact your DLSA to confirm."
            : "Based on these answers you may not qualify under these categories, but you can still ask your DLSA, as rules vary by state."}
        </p>
      )}
    </section>
  );
}

/* ---------- 4: APPLICATION FORM ---------- */
function Application() {
  const [v, setV] = useState({ name: "", phone: "", state: "", district: "", caseType: "Family", details: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (v.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^[6-9]\d{9}$/.test(v.phone)) e.phone = "Enter a valid 10-digit mobile number.";
    if (!v.state.trim()) e.state = "Enter your state.";
    if (!v.district.trim()) e.district = "Enter your district.";
    if (v.details.trim().length < 20) e.details = "Describe your matter in at least 20 characters.";
    return e;
  }

  const input = (key: keyof typeof v, label: string, type = "text") => (
    <label className="block text-sm">
      {label}
      <input
        className={field}
        type={type}
        value={v[key]}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${key}-err` : undefined}
        onChange={(e) => setV({ ...v, [key]: e.target.value })}
      />
      {errors[key] && <span id={`${key}-err`} className="text-sm text-red-700">{errors[key]}</span>}
    </label>
  );

  return (
    <section aria-labelledby="app-title" className="space-y-3">
      <h2 id="app-title" className="text-xl font-semibold">4. Apply for free legal representation</h2>
      <p role="note" className="rounded bg-yellow-100 p-2 text-sm text-black">
        Demo form. Nothing is sent anywhere. Do not enter sensitive details such as Aadhaar numbers.
      </p>
      <form
        noValidate
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const er = validate();
          setErrors(er);
          setSent(Object.keys(er).length === 0);
        }}
      >
        {input("name", "Full name")}
        {input("phone", "Mobile number", "tel")}
        {input("state", "State")}
        {input("district", "District")}
        <label className="block text-sm sm:col-span-2">
          Type of matter
          <select className={field} value={v.caseType} onChange={(e) => setV({ ...v, caseType: e.target.value })}>
            {["Family", "Maintenance", "Domestic violence", "Property", "Other"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          Brief description
          <textarea
            className={field}
            rows={4}
            value={v.details}
            aria-invalid={!!errors.details}
            onChange={(e) => setV({ ...v, details: e.target.value })}
          />
          {errors.details && <span className="text-sm text-red-700">{errors.details}</span>}
        </label>
        <div className="sm:col-span-2">
          <button className={btn} type="submit">Submit application (demo)</button>
        </div>
      </form>
      {sent && <p role="status" className={card}>Form is valid. In this demo nothing was sent. Contact your DLSA to apply.</p>}
    </section>
  );
}

/* ---------- 5b: GRIEVANCE ---------- */
function Grievance() {
  const [district, setDistrict] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <section aria-labelledby="gr-title" className="space-y-3">
      <h2 id="gr-title" className="text-xl font-semibold">5. Grievance form</h2>
      <form
        noValidate
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!district.trim() || text.trim().length < 20) {
            setErr("Enter your district and a grievance of at least 20 characters.");
            setSent(false);
          } else { setErr(""); setSent(true); }
        }}
      >
        <label className="block text-sm">
          District
          <input className={field} value={district} onChange={(e) => setDistrict(e.target.value)} />
        </label>
        <label className="block text-sm">
          Your grievance
          <textarea className={field} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
        <button className={btn} type="submit">Submit grievance (demo)</button>
      </form>
      {sent && <p role="status" className={card}>Demo only. Nothing was sent.</p>}
    </section>
  );
}

/* ---------- PAGE ---------- */
export function LegalAidHub() {
  return (
    <div className="space-y-10 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Legal Aid &amp; Pro-Bono Hub</h1>
        <p className="text-sm">General information only, not legal advice.</p>
      </header>
      <Directory />
      <Eligibility />
      <Helplines />
      <Application />
      <Grievance />
    </div>
  );
}