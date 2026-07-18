import { getTranslations } from "next-intl/server";

const STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  deleted: "bg-slate-100 text-slate-500",
  banned: "bg-red-100 text-red-800",
};

const KEYS: Record<string, string> = {
  pending: "statusPending",
  approved: "statusApproved",
  rejected: "statusRejected",
  deleted: "statusRejected",
  banned: "statusRejected",
};

export async function StatusBadge({ status }: { status: string }) {
  const t = await getTranslations("common");
  return (
    <span
      className={`shrink-0 text-xs rounded-full px-2 py-1 ${STYLES[status] ?? STYLES.pending}`}
    >
      {t(KEYS[status] ?? "statusPending")}
    </span>
  );
}
