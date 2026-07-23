"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import type { DashboardStats as Stats } from "@/lib/dashboard-stats";

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="admin-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

export function DashboardStats({
  stats,
  exportBackup,
  setImageVerification,
}: {
  stats: Stats;
  exportBackup: () => Promise<{ error?: string; json?: string }>;
  setImageVerification: (enabled: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [imgOn, setImgOn] = useState(stats.imageVerificationEnabled);
  const [imgPending, startImgTransition] = useTransition();

  const toggleImageVerification = () => {
    const next = !imgOn;
    setImgOn(next);
    startImgTransition(async () => {
      await setImageVerification(next);
    });
  };

  const handleBackup = () => {
    startTransition(async () => {
      const res = await exportBackup();
      if (res.error || !res.json) {
        setNotice("Backup export failed.");
        return;
      }
      const blob = new Blob([res.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `materiaalitukku-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice(null);
    });
  };

  return (
    <section className="mb-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Products" value={`${stats.productsTotal}`} />
        <Tile
          label="Active"
          value={`${stats.productsActive}`}
          accent="text-emerald-600"
        />
        <Tile
          label="Hidden"
          value={`${stats.productsHidden}`}
          accent="text-slate-400"
        />
        <Tile
          label="Duplicates"
          value={`${stats.duplicateGroups.length}`}
          accent={stats.duplicateGroups.length > 0 ? "text-amber-600" : undefined}
        />
        <Link href="/admin/logs" className="block">
          <Tile
            label="Errors"
            value={`${stats.errorCount}`}
            accent={stats.errorCount > 0 ? "text-red-600" : undefined}
          />
        </Link>
        <Link href="/admin/translations" className="block">
          <Tile
            label="Languages complete"
            value={`${stats.translationsLanguagesComplete}/${stats.translationsLanguagesTotal}`}
          />
        </Link>
        <Tile label="Translation keys" value={`${stats.translationsTotalKeys}`} />
        <Tile
          label="Images blocked"
          value={`${stats.imagesBlocked}`}
          accent={stats.imagesBlocked > 0 ? "text-red-600" : undefined}
        />
      </div>

      {stats.duplicateGroups.length > 0 && (
        <div className="admin-card mt-3 border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-xs font-semibold text-amber-700">
            These product names appear more than once — merge submissions onto one
            of them instead of approving as new:
          </p>
          <ul className="space-y-0.5">
            {stats.duplicateGroups.slice(0, 10).map((d) => (
              <li key={d.name} className="text-xs text-slate-700">
                “{d.name}” × {d.count}
              </li>
            ))}
          </ul>
          {stats.duplicateGroups.length > 10 && (
            <p className="mt-1 text-[11px] text-amber-600">
              +{stats.duplicateGroups.length - 10} more
            </p>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="admin-card p-3">
          <p className="mb-2 text-xs font-semibold text-slate-600">API keys</p>
          <ul className="space-y-1">
            {stats.apiKeys.map((k) => (
              <li
                key={k.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-500">{k.name}</span>
                <span
                  className={
                    k.configured
                      ? "admin-pill bg-emerald-50 text-emerald-700"
                      : "admin-pill bg-red-50 text-red-600"
                  }
                >
                  {k.configured ? "Configured" : "Missing"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-card p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">
              Image verification
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={imgOn}
              onClick={toggleImageVerification}
              disabled={imgPending}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                imgOn ? "bg-brand" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  imgOn ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            When on, new product images require AI moderation before showing to
            users. {stats.imagesPending} pending · {stats.imagesBlocked} blocked.
          </p>
        </div>

        <div className="admin-card p-3">
          <p className="mb-1 text-xs font-semibold text-slate-600">Backup</p>
          <p className="mb-3 text-[11px] text-slate-500">
            Downloads products, offers, businesses, transport companies and
            categories as one JSON file.
          </p>
          <button
            onClick={handleBackup}
            disabled={pending}
            className="admin-btn"
          >
            {pending ? "Exporting…" : "Download backup"}
          </button>
          {notice && <p className="mt-2 text-[11px] text-red-600">{notice}</p>}
        </div>
      </div>
    </section>
  );
}
