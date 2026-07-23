// Shared by Suppliers and Transport Companies: both use the same 2-stored-
// state ("active"/"rejected") + computed-"expired" lifecycle.

export type LifecycleRow = {
  status: "active" | "rejected";
  expires_at: string | null;
};

export type LifecycleStatus = "active" | "expired" | "rejected";

export function getLifecycleStatus(row: LifecycleRow): LifecycleStatus {
  if (row.status === "rejected") return "rejected";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
    return "expired";
  return "active";
}

// Days remaining until expiry, or null if already expired/no date.
export function getCountdownDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
