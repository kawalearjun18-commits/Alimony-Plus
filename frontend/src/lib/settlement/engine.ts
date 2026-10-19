import type { AlimonyInput } from "./schema";

// ILLUSTRATIVE placeholder values, NOT statutory figures.
// Replace after legal review before any real or court use.
export const RULE_SETS = {
  "central-default": { label: "Central guideline (illustrative)", incomeSharePct: 33, perChildPct: 4, durationFactor: 0.5, capPctOfPayer: 40 },
  "state-conservative": { label: "State - conservative (illustrative)", incomeSharePct: 25, perChildPct: 3, durationFactor: 0.33, capPctOfPayer: 30 },
  "state-progressive": { label: "State - progressive (illustrative)", incomeSharePct: 40, perChildPct: 5, durationFactor: 0.66, capPctOfPayer: 45 },
} as const;

export interface SettlementResult {
  monthlyMaintenance: number;
  durationMonths: number;
  totalMaintenance: number;
  netAssets: number;
  payeeAssetShare: number;
  payerAssetShare: number;
  payeeTotal: number;
  payerTotal: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateMaintenance(i: AlimonyInput): number {
  const r = RULE_SETS[i.ruleSetId];
  const gap = Math.max(0, i.payerIncome - i.payeeIncome);
  const base = (gap * r.incomeSharePct) / 100;
  const children = (i.payerIncome * r.perChildPct * i.dependentChildren) / 100;
  const cap = (i.payerIncome * r.capPctOfPayer) / 100;
  return round2(Math.min(base + children, cap));
}

export function calculateSettlement(i: AlimonyInput): SettlementResult {
  const r = RULE_SETS[i.ruleSetId];
  const monthlyMaintenance = calculateMaintenance(i);
  const durationMonths = Math.round(i.marriageYears * 12 * r.durationFactor);
  const totalMaintenance = round2(monthlyMaintenance * durationMonths);
  const netAssets = round2(i.totalAssets - i.totalDebts);
  const payeeAssetShare = round2((netAssets * i.assetSplitPct) / 100);
  const payerAssetShare = round2(netAssets - payeeAssetShare);
  return {
    monthlyMaintenance,
    durationMonths,
    totalMaintenance,
    netAssets,
    payeeAssetShare,
    payerAssetShare,
    payeeTotal: round2(payeeAssetShare + totalMaintenance),
    payerTotal: round2(payerAssetShare - totalMaintenance),
  };
}
