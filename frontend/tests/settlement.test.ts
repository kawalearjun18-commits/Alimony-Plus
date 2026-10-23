import { describe, it, expect } from "vitest";
import { calculateMaintenance, calculateSettlement, RULE_SETS } from "../src/lib/settlement/engine";
import { alimonySchema, type AlimonyInput } from "../src/lib/settlement/schema";
import { sha256, shortId, canonicalise } from "../src/lib/settlement/watermark";

const base: AlimonyInput = {
  payerIncome: 100000, payeeIncome: 20000, marriageYears: 10,
  dependentChildren: 1, totalAssets: 5000000, totalDebts: 1000000,
  assetSplitPct: 50, ruleSetId: "central-default",
};

/* ── calculateMaintenance ─────────────────────────────────────────── */

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

  /* Each rule set individually */
  it("central-default: exact value", () => {
    // gap=80000, base=80000*33/100=26400, child=100000*4*1/100=4000, sum=30400, cap=40000 → 30400
    expect(calculateMaintenance({ ...base, ruleSetId: "central-default" })).toBe(30400);
  });
  it("state-conservative: exact value", () => {
    // gap=80000, base=80000*25/100=20000, child=100000*3*1/100=3000, sum=23000, cap=30000 → 23000
    expect(calculateMaintenance({ ...base, ruleSetId: "state-conservative" })).toBe(23000);
  });
  it("state-progressive: exact value", () => {
    // gap=80000, base=80000*40/100=32000, child=100000*5*1/100=5000, sum=37000, cap=45000 → 37000
    expect(calculateMaintenance({ ...base, ruleSetId: "state-progressive" })).toBe(37000);
  });

  /* Cap boundary: at exactly cap */
  it("returns cap when uncapped sum equals cap", () => {
    // central-default: cap = payerIncome * 40/100. Choose children so sum >= cap.
    // With 10 children: base=26400, child=4000*10=40000, sum=66400, cap=40000 → 40000
    expect(calculateMaintenance({ ...base, dependentChildren: 10 })).toBe(40000);
  });
});

/* ── calculateSettlement ──────────────────────────────────────────── */

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
  it("propagates negative net assets into shares", () => {
    const r = calculateSettlement({ ...base, totalAssets: 0, totalDebts: 1000 });
    expect(r.netAssets).toBe(-1000);
    expect(r.payeeAssetShare).toBe(-500);
    expect(r.payerAssetShare).toBe(-500);
  });
  it("conservative: shorter duration", () => {
    const r = calculateSettlement({ ...base, ruleSetId: "state-conservative" });
    expect(r.durationMonths).toBe(40); // 10 * 12 * 0.33 ≈ 40
  });
  it("progressive: longer duration", () => {
    const r = calculateSettlement({ ...base, ruleSetId: "state-progressive" });
    expect(r.durationMonths).toBe(79); // 10 * 12 * 0.66 ≈ 79
  });
});

/* ── alimonySchema ────────────────────────────────────────────────── */

describe("alimonySchema", () => {
  it("accepts valid input", () => {
    expect(alimonySchema.safeParse(base).success).toBe(true);
  });
  it("rejects negative payee income", () => {
    const r = alimonySchema.safeParse({ ...base, payeeIncome: -1 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes("cannot be negative"))).toBe(true);
    }
  });
  it("rejects split above 100", () => {
    const r = alimonySchema.safeParse({ ...base, assetSplitPct: 120 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes("cannot exceed 100%"))).toBe(true);
    }
  });
  it("rejects non-integer marriage years", () => {
    const r = alimonySchema.safeParse({ ...base, marriageYears: 5.5 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes("whole number"))).toBe(true);
    }
  });
  it("rejects children above 10", () => {
    const r = alimonySchema.safeParse({ ...base, dependentChildren: 11 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes("cannot exceed 10"))).toBe(true);
    }
  });
  it("rejects invalid rule set", () => {
    const r = alimonySchema.safeParse({ ...base, ruleSetId: "invalid" });
    expect(r.success).toBe(false);
  });
  it("rejects unrealistically high assets", () => {
    const r = alimonySchema.safeParse({ ...base, totalAssets: 1e11 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes("unrealistically high"))).toBe(true);
    }
  });
});

/* ── watermark ────────────────────────────────────────────────────── */

describe("watermark", () => {
  it("sha256 returns 64-char hex", async () => {
    const hash = await sha256("hello");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("sha256 is deterministic", async () => {
    expect(await sha256("test")).toBe(await sha256("test"));
  });
  it("shortId returns first 8 chars", () => {
    expect(shortId("abcdef1234567890")).toBe("abcdef12");
  });
  it("canonicalise sorts keys", () => {
    const a = canonicalise({ z: 1, a: 2 });
    const b = canonicalise({ a: 2, z: 1 });
    expect(a).toBe(b);
    expect(JSON.parse(a)).toEqual({ a: 2, z: 1 });
  });
});

