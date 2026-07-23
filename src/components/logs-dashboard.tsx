"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActivityLog } from "@/lib/types";
import { purgeLogs } from "@/app/[locale]/admin/logs/actions";

const CATEGORY_COLORS: Record<string, string> = {
  products: "bg-blue-50 text-blue-700",
  offers: "bg-emerald-50 text-emerald-700",
  suppliers: "bg-purple-50 text-purple-700",
  transport: "bg-amber-50 text-amber-700",
  categories: "bg-pink-50 text-pink-700",
  submissions: "bg-cyan-50 text-cyan-700",
  registrations: "bg-indigo-50 text-indigo-700",
  footer: "bg-stone-100 text-stone-700",
  messages: "bg-sky-50 text-sky-700",
  errors: "bg-red-50 text-red-600",
  backup: "bg-teal-50 text-teal-700",
};
const DEFAULT_COLOR = "bg-slate-100 text-slate-600";

export function LogsDashboard({ logs }: { logs: ActivityLog[] }) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = useMemo(
    () => [...new Set(logs.map((l) => l.category))].sort(),
    [logs]
  );
  const filtered = useMemo(
    () => (categoryFilter ? logs.filter((l) => l.category === categoryFilter) : logs),
    [logs, categoryFilter]
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePurge = () => {
    if (!confirm("Permanently delete the entire activity log?")) return;
    startTransition(async () => {
      const res = await purgeLogs();
      if (res.error) setNotice("Something went wrong. Please try again.");
      else {
        setNotice("Log cleared.");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-medium text-slate-500">
          {logs.length} event{logs.length === 1 ? "" : "s"}
        </span>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="admin-input h-9 w-48 cursor-pointer"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          disabled={pending || logs.length === 0}
          onClick={handlePurge}
          className="admin-btn admin-btn-danger ml-auto"
        >
          Clear log
        </button>
      </div>

      {notice && (
        <p className="admin-card border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      <div className="admin-card divide-y divide-slate-100">
        {filtered.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-400">
            No log events yet.
          </p>
        )}
        {filtered.map((log) => {
          const isOpen = expanded.has(log.id);
          return (
            <div key={log.id} className="p-3">
              <button
                onClick={() => toggle(log.id)}
                className="flex w-full flex-wrap items-center gap-2 text-left"
              >
                <span className="text-[11px] text-slate-400">
                  {new Date(log.created_at).toLocaleString("en-GB")}
                </span>
                <span
                  className={`admin-pill ${CATEGORY_COLORS[log.category] ?? DEFAULT_COLOR}`}
                >
                  {log.category}
                </span>
                <span className="flex-1 text-sm text-slate-700">{log.action}</span>
                <span className="text-[11px] text-slate-400">
                  {log.actor_email ?? ""}
                </span>
                {log.details && (
                  <span className="text-xs text-slate-400">{isOpen ? "▾" : "▸"}</span>
                )}
              </button>
              {isOpen && log.details && (
                <pre className="mt-2 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-600">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
