import { describe, it, expect } from "vitest";
import { calculateMaintenance, calculateSettlement } from "../src/lib/settlement/engine";
import { alimonySchema, type AlimonyInput } from "../src/lib/settlement/schema";

const base: AlimonyInput = {
  payerIncome: 100000, payeeIncome: 20000, marriageYears: 10,
  dependentChildren: 1, totalAssets: 5000000, totalDebts: 1000000,
  assetSplitPct: 50, ruleSetId: "central-default",
};

describe("calculateMaintenance", () => {
  it("adds income-gap share and child uplift", () => {
    expect(calculateMaintenance(base)).toBe(30400);
  });
  it("applies the cap", () => {
    expect(calculateMaintenance({ ...base, dependentChildren: 10 })).toBe(40000);
  });
  it("is 0 when payee earns more and no children", () => {
    expect(calculateMaintenance({ ...base, payeeIncome: 200000, dependentChildren: 0 })).toBe(0);
  });
  it("conservative is lower than progressive", () => {
    expect(calculateMaintenance({ ...base, ruleSetId: "state-conservative" })).toBeLessThan(
      calculateMaintenance({ ...base, ruleSetId: "state-progressive" }),
    );
  });
});

describe("calculateSettlement", () => {
  it("computes duration and totals", () => {
    const r = calculateSettlement(base);
    expect(r.durationMonths).toBe(60);
    expect(r.totalMaintenance).toBe(1824000);
    expect(r.payeeTotal).toBe(3824000);
  });
  it("splits net assets 50/50", () => {
    const r = calculateSettlement(base);
    expect(r.netAssets).toBe(4000000);
    expect(r.payeeAssetShare).toBe(2000000);
    expect(r.payerAssetShare).toBe(2000000);
  });
  it("allows negative net assets", () => {
    expect(calculateSettlement({ ...base, totalAssets: 100, totalDebts: 500 }).netAssets).toBe(-400);
  });
});

describe("alimonySchema", () => {
  it("accepts valid input", () => {
    expect(alimonySchema.safeParse(base).success).toBe(true);
  });
  it("rejects negative payee income", () => {
    expect(alimonySchema.safeParse({ ...base, payeeIncome: -1 }).success).toBe(false);
  });
  it("rejects split above 100", () => {
    expect(alimonySchema.safeParse({ ...base, assetSplitPct: 120 }).success).toBe(false);
  });
});
