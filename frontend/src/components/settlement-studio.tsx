"use client";

import { useMemo, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import * as Select from "@radix-ui/react-select";
import { alimonySchema, type AlimonyInput } from "@/lib/settlement/schema";
import { calculateSettlement, RULE_SETS, type SettlementResult } from "@/lib/settlement/engine";
import { SettlementChart } from "@/components/settlement-chart";
import { buildSettlementPdf } from "@/lib/settlement/pdf-export";
import { downloadPdf } from "@/lib/pdf";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const initial: AlimonyInput = {
  payerIncome: 100000,
  payeeIncome: 20000,
  marriageYears: 10,
  dependentChildren: 1,
  totalAssets: 5000000,
  totalDebts: 1000000,
  assetSplitPct: 50,
  ruleSetId: "central-default",
};

type NumKey = Exclude<keyof AlimonyInput, "ruleSetId">;

function Field(props: {
  id: NumKey;
  label: string;
  value: number;
  error?: string;
  onChange: (n: number) => void;
}) {
  const { id, label, value, error, onChange } = props;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isNaN(value) ? "" : value}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className={`w-full min-w-0 rounded-md border px-3 py-2 ${error ? "border-red-600" : "border-slate-300"}`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}

/* ── Scenario A/B comparison ─────────────────────────────────────────── */

type Scenario = { label: string; input: AlimonyInput; result: SettlementResult };

function ScenarioTable({ a, b }: { a: Scenario; b: Scenario }) {
  const rows: { label: string; aVal: string; bVal: string }[] = [
    { label: "Rule set", aVal: RULE_SETS[a.input.ruleSetId].label, bVal: RULE_SETS[b.input.ruleSetId].label },
    { label: "Monthly maintenance", aVal: inr(a.result.monthlyMaintenance), bVal: inr(b.result.monthlyMaintenance) },
    { label: "Duration", aVal: `${a.result.durationMonths} mo`, bVal: `${b.result.durationMonths} mo` },
    { label: "Total maintenance", aVal: inr(a.result.totalMaintenance), bVal: inr(b.result.totalMaintenance) },
    { label: "Net assets", aVal: inr(a.result.netAssets), bVal: inr(b.result.netAssets) },
    { label: "Payee asset share", aVal: inr(a.result.payeeAssetShare), bVal: inr(b.result.payeeAssetShare) },
    { label: "Payee total", aVal: inr(a.result.payeeTotal), bVal: inr(b.result.payeeTotal) },
    { label: "Payer total", aVal: inr(a.result.payerTotal), bVal: inr(b.result.payerTotal) },
  ];

  return (
    <div className="mt-6 overflow-x-auto -mx-6 px-6">
      <h3 className="text-sm font-medium text-slate-600 mb-2">Scenario comparison</h3>
      <table className="w-full min-w-[320px] text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-1.5 pr-3 font-medium"></th>
            <th className="text-right py-1.5 px-3 font-medium text-indigo-700">A – {a.label}</th>
            <th className="text-right py-1.5 pl-3 font-medium text-cyan-700">B – {b.label}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-slate-100">
              <td className="py-1.5 pr-3 text-slate-600 whitespace-nowrap">{r.label}</td>
              <td className="py-1.5 px-3 text-right tabular-nums">{r.aVal}</td>
              <td className="py-1.5 pl-3 text-right tabular-nums">{r.bVal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main studio ─────────────────────────────────────────────────────── */

export function SettlementStudio() {
  const [input, setInput] = useState<AlimonyInput>(initial);
  const [scenarioB, setScenarioB] = useState<Scenario | null>(null);
  const [exporting, setExporting] = useState(false);

  const update = <K extends keyof AlimonyInput>(key: K, value: AlimonyInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const parsed = useMemo(() => alimonySchema.safeParse(input), [input]);
  const errors = useMemo(() => {
    const out: Partial<Record<keyof AlimonyInput, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AlimonyInput;
        out[key] ??= issue.message;
      }
    }
    return out;
  }, [parsed]);
  const result = useMemo(() => (parsed.success ? calculateSettlement(parsed.data) : null), [parsed]);

  /* Scenario A is always derived from current valid inputs */
  const scenarioA: Scenario | null = useMemo(
    () => (parsed.success && result ? { label: "Current", input: parsed.data, result } : null),
    [parsed, result],
  );

  function saveAsScenarioB() {
    if (scenarioA) setScenarioB(scenarioA);
  }

  function clearScenarioB() {
    setScenarioB(null);
  }

  async function handleExportPdf() {
    if (!parsed.success || !result) return;
    setExporting(true);
    try {
      const { bytes, sid } = await buildSettlementPdf(parsed.data, result);
      downloadPdf(`settlement-report-${sid}.pdf`, bytes);
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 p-4 sm:p-6 lg:grid-cols-[1fr_1.2fr]">
      <section aria-labelledby="inputs-heading" className="grid gap-4">
        <h1 id="inputs-heading" className="text-2xl font-semibold">Settlement studio</h1>
        <Field id="payerIncome" label="Payer monthly income (INR)" value={input.payerIncome} error={errors.payerIncome} onChange={(v) => update("payerIncome", v)} />
        <Field id="payeeIncome" label="Payee monthly income (INR)" value={input.payeeIncome} error={errors.payeeIncome} onChange={(v) => update("payeeIncome", v)} />
        <Field id="marriageYears" label="Years married" value={input.marriageYears} error={errors.marriageYears} onChange={(v) => update("marriageYears", v)} />
        <Field id="dependentChildren" label="Dependent children" value={input.dependentChildren} error={errors.dependentChildren} onChange={(v) => update("dependentChildren", v)} />
        <Field id="totalAssets" label="Total assets (INR)" value={input.totalAssets} error={errors.totalAssets} onChange={(v) => update("totalAssets", v)} />
        <Field id="totalDebts" label="Total debts (INR)" value={input.totalDebts} error={errors.totalDebts} onChange={(v) => update("totalDebts", v)} />

        <div>
          <label id="split-label" className="text-sm font-medium">
            Net assets to payee: {Number.isNaN(input.assetSplitPct) ? 0 : input.assetSplitPct}%
          </label>
          <Slider.Root
            aria-labelledby="split-label"
            className="relative mt-2 flex h-5 w-full items-center"
            min={0}
            max={100}
            step={1}
            value={[input.assetSplitPct]}
            onValueChange={([v]) => update("assetSplitPct", v)}
          >
            <Slider.Track className="relative h-1.5 grow rounded bg-slate-200">
              <Slider.Range className="absolute h-full rounded bg-indigo-600" />
            </Slider.Track>
            <Slider.Thumb aria-label="Asset split to payee" className="block h-5 w-5 rounded-full border-2 border-indigo-600 bg-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2" />
          </Slider.Root>
          {errors.assetSplitPct && <p role="alert" className="text-sm text-red-700">{errors.assetSplitPct}</p>}
        </div>

        <div>
          <span id="rule-label" className="text-sm font-medium">Rule set</span>
          <Select.Root value={input.ruleSetId} onValueChange={(v) => update("ruleSetId", v as AlimonyInput["ruleSetId"])}>
            <Select.Trigger aria-labelledby="rule-label" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
              <Select.Value />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content position="popper" className="z-50 rounded-md border bg-white shadow">
                <Select.Viewport>
                  {Object.entries(RULE_SETS).map(([id, rule]) => (
                    <Select.Item key={id} value={id} className="cursor-pointer px-3 py-2 data-[highlighted]:bg-indigo-50">
                      <Select.ItemText>{rule.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Scenario controls */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={!result}
            onClick={saveAsScenarioB}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200 disabled:opacity-40"
          >
            Save as scenario B
          </button>
          {scenarioB && (
            <button
              type="button"
              onClick={clearScenarioB}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200"
            >
              Clear scenario B
            </button>
          )}
        </div>
      </section>

      <section aria-live="polite" aria-labelledby="results-heading" className="rounded-lg border border-slate-200 p-4 sm:p-6 overflow-hidden">
        <h2 id="results-heading" className="text-lg font-semibold">Projection</h2>
        {!result ? (
          <p className="mt-3 text-slate-600">Fix the highlighted fields to see the projection.</p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><dt className="text-sm text-slate-600">Monthly maintenance</dt><dd className="text-2xl font-semibold">{inr(result.monthlyMaintenance)}</dd></div>
              <div><dt className="text-sm text-slate-600">Duration</dt><dd className="text-2xl font-semibold">{result.durationMonths} months</dd></div>
              <div><dt className="text-sm text-slate-600">Payee asset share</dt><dd>{inr(result.payeeAssetShare)}</dd></div>
              <div><dt className="text-sm text-slate-600">Payer asset share</dt><dd>{inr(result.payerAssetShare)}</dd></div>
              <div><dt className="text-sm text-slate-600">Payee total</dt><dd className="font-medium">{inr(result.payeeTotal)}</dd></div>
              <div><dt className="text-sm text-slate-600">Payer total</dt><dd className="font-medium">{inr(result.payerTotal)}</dd></div>
            </dl>

            <SettlementChart result={result} />

            {scenarioA && scenarioB && (
              <ScenarioTable a={scenarioA} b={scenarioB} />
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={exporting}
                onClick={handleExportPdf}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "Export PDF report"}
              </button>
            </div>
          </>
        )}
        <p className="mt-6 text-xs text-slate-500">Illustrative rules only. Not legal advice.</p>
      </section>
    </main>
  );
}
