// Shared types for case alerts surfaced in the workspace (orders & maintenance).
export type CaseAlert = {
  id: number | string;
  category: "Court order" | "Maintenance";
  status: string;
  title: string;
  description: string;
  date: string;
};
