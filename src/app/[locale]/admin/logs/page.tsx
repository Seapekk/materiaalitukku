import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLog } from "@/lib/types";
import { LogsDashboard } from "@/components/logs-dashboard";

export const metadata: Metadata = { title: "Admin — Logs" };
export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const logs = (data ?? []) as ActivityLog[];

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Logs</h1>
        <p className="admin-sub">Admin activity log — the latest 200 events.</p>
      </header>

      <LogsDashboard logs={logs} />
    </div>
  );
}
