import { z } from "zod";

const money = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(1e10, `${label} is unrealistically high`);

export const alimonySchema = z
  .object({
    payerIncome: money("Payer income"),
    payeeIncome: money("Payee income"),
    marriageYears: z
      .number({ error: "Years married must be a number" })
      .int("Years married must be a whole number")
      .min(0, "Years married cannot be negative")
      .max(80, "Years married cannot exceed 80"),
    dependentChildren: z
      .number({ error: "Children must be a number" })
      .int("Children must be a whole number")
      .min(0, "Children cannot be negative")
      .max(10, "Children cannot exceed 10"),
    totalAssets: money("Total assets"),
    totalDebts: money("Total debts"),
    assetSplitPct: z
      .number({ error: "Split must be a number" })
      .min(0, "Split cannot be below 0%")
      .max(100, "Split cannot exceed 100%"),
    ruleSetId: z.enum(
      ["central-default", "state-conservative", "state-progressive"],
      { error: "Choose a valid rule set" },
    ),
  })
  .refine((v) => v.payerIncome > 0 || v.payeeIncome === 0, {
    error: "Payer income must be positive when payee has income",
    path: ["payerIncome"],
  });

export type AlimonyInput = z.infer<typeof alimonySchema>;
