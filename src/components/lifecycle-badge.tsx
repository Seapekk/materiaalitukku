import { getCountdownDays, getLifecycleStatus, type LifecycleRow } from "@/lib/lifecycle";

const STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  expired: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-600",
};

const LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  rejected: "Rejected",
};

export function LifecycleBadge({
  row,
  rejectionReason,
}: {
  row: LifecycleRow;
  rejectionReason?: string | null;
}) {
  const status = getLifecycleStatus(row);
  const days = status === "active" ? getCountdownDays(row.expires_at) : null;

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={`admin-pill w-fit ${STYLES[status]}`}>
        {LABELS[status]}
        {days != null && days <= 30 && ` · ${days}d`}
      </span>
      {status === "rejected" && rejectionReason && (
        <span className="max-w-[16rem] text-[11px] text-slate-400">
          {rejectionReason}
        </span>
      )}
    </span>
  );
}
