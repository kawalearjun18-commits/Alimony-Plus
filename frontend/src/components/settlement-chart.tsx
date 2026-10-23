"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import type { SettlementResult } from "@/lib/settlement/engine";

const COLORS = { payee: "#4f46e5", payer: "#06b6d4" };

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function SettlementChart({ result }: { result: SettlementResult }) {
  const data = [
    { name: "Asset share", payee: result.payeeAssetShare, payer: result.payerAssetShare },
    { name: "Maintenance", payee: result.totalMaintenance, payer: -result.totalMaintenance },
    { name: "Net total", payee: result.payeeTotal, payer: result.payerTotal },
  ];

  return (
    <div className="mt-6" aria-label="Settlement breakdown chart">
      <h3 className="text-sm font-medium text-slate-600 mb-2">Breakdown</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <XAxis type="number" tickFormatter={(v: number) => inr(v)} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => inr(Number(v))} />
          <Legend />
          <Bar dataKey="payee" name="Payee" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS.payee} />
            ))}
          </Bar>
          <Bar dataKey="payer" name="Payer" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS.payer} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
