import type { AlimonyInput } from "./schema";
import type { SettlementResult } from "./engine";
import { RULE_SETS } from "./engine";
import { buildPdf, wrap, type PdfLine } from "../pdf";
import { sha256, shortId, canonicalise } from "./watermark";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export async function buildSettlementPdf(
  input: AlimonyInput,
  result: SettlementResult,
): Promise<{ bytes: Uint8Array; hash: string; sid: string }> {
  const canonical = canonicalise(input);
  const hash = await sha256(canonical);
  const sid = shortId(hash);

  const rule = RULE_SETS[input.ruleSetId];
  const lines: PdfLine[] = [];

  lines.push({ text: "Settlement Report", bold: true, size: 16 });
  lines.push({ text: "" });
  lines.push({ text: `Integrity ID: ${sid}`, bold: true, size: 10 });
  lines.push({ text: `Full hash: ${hash}`, size: 8 });
  lines.push({ text: `Generated: ${new Date().toISOString().slice(0, 19)}Z`, size: 8 });
  lines.push({ text: "" });
  lines.push({ text: "Inputs", bold: true, size: 12 });
  lines.push({ text: `  Payer income:       ${inr(input.payerIncome)}/month` });
  lines.push({ text: `  Payee income:       ${inr(input.payeeIncome)}/month` });
  lines.push({ text: `  Marriage duration:  ${input.marriageYears} years` });
  lines.push({ text: `  Dependent children: ${input.dependentChildren}` });
  lines.push({ text: `  Total assets:       ${inr(input.totalAssets)}` });
  lines.push({ text: `  Total debts:        ${inr(input.totalDebts)}` });
  lines.push({ text: `  Asset split payee:  ${input.assetSplitPct}%` });
  lines.push({ text: `  Rule set:           ${rule.label}` });
  lines.push({ text: "" });
  lines.push({ text: "Results", bold: true, size: 12 });
  lines.push({ text: `  Monthly maintenance: ${inr(result.monthlyMaintenance)}` });
  lines.push({ text: `  Duration:            ${result.durationMonths} months` });
  lines.push({ text: `  Total maintenance:   ${inr(result.totalMaintenance)}` });
  lines.push({ text: `  Net assets:          ${inr(result.netAssets)}` });
  lines.push({ text: `  Payee asset share:   ${inr(result.payeeAssetShare)}` });
  lines.push({ text: `  Payer asset share:   ${inr(result.payerAssetShare)}` });
  lines.push({ text: `  Payee total:         ${inr(result.payeeTotal)}` });
  lines.push({ text: `  Payer total:         ${inr(result.payerTotal)}` });
  lines.push({ text: "" });
  lines.push({ text: "Disclaimer", bold: true, size: 10 });
  for (const l of wrap(
    "This report is generated using illustrative rule-set percentages that are " +
      "NOT statutory figures. The projections are for informational and budgeting " +
      "purposes only and do not constitute legal advice. Consult a qualified " +
      "legal professional before relying on any figure in this report.",
  )) {
    lines.push({ text: l, size: 8 });
  }

  const bytes = buildPdf(lines, `Alimony+ settlement ${sid}`);
  return { bytes, hash, sid };
}
