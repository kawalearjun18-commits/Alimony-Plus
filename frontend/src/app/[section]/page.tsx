
import { notFound } from "next/navigation";
import { WorkspaceApp } from "@/components/workspace-app";

export const dynamic = "force-dynamic";

const sections = [
  "dashboard",
  "cases",
  "cnr",
  "orders",
  "payments",
  "documents",
  "calculator",
  "data-review",
  "help",
  "settings",
  "login",
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
