import { notFound } from "next/navigation";
import { WorkspaceApp } from "@/components/workspace-app";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "dashboard",
      "intake",
      "navigator",
      "cases",
      "orders",
      "payments",
      "documents",
      "calculator",
      "assistant",
      "data-review",
      "help",
      "settings",
      "login",
      "cooling-period",
      "calculator",
      "waiver-application",
      "settlement-checklist",
      "joint-petition"

    ].includes(section)
  )
    notFound();
  return <WorkspaceApp section={section} />;
}
