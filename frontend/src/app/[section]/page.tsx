import { notFound } from "next/navigation";
import { WorkspaceApp } from "@/components/workspace-app";

export const dynamic = "force-dynamic";

const sections = [
  "dashboard",
  "intake",
  "navigator",
  "cases",
  "orders",
  "payments",
  "documents",
  "calculator",
  "assistant",
  "cnr",
  "settlement",
  "data-review",
  "help",
  "legal-aid",
  "settings",
  "login",
  "cooling-period",
  "waiver-application",
  "settlement-checklist",
  "joint-petition",
];

export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!sections.includes(section)) {
    notFound();
  }

  return <WorkspaceApp section={section} />;
}
