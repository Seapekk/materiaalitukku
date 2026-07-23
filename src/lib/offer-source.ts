import type { OfferSource, OfferStatus } from "./types";

// 1.2 Products colour coding, straight from the spec:
//   a) user-entered   -> light green
//   b) admin-added    -> light blue
//   c) scraped        -> light yellow
//   d) not approved   -> light red   (status 'pending', overrides source)
//   e) rejected       -> light grey  (status 'rejected', overrides source)
export type OfferVisual = {
  label: string;
  // Row background tint (admin table + public per-offer rows).
  row: string;
  // Small badge (bg + text).
  badge: string;
};

export function offerVisual(o: {
  status: OfferStatus;
  source: OfferSource;
}): OfferVisual {
  if (o.status === "pending")
    return { label: "Not approved", row: "bg-red-50", badge: "bg-red-100 text-red-700" };
  if (o.status === "rejected")
    return { label: "Rejected", row: "bg-slate-100", badge: "bg-slate-200 text-slate-500" };
  switch (o.source) {
    case "user":
      return { label: "User", row: "bg-green-50", badge: "bg-green-100 text-green-700" };
    case "scraped":
      return { label: "Scraped", row: "bg-amber-50", badge: "bg-amber-100 text-amber-700" };
    case "admin":
    default:
      return { label: "Admin", row: "bg-blue-50", badge: "bg-blue-100 text-blue-700" };
  }
}

// Spec: don't provide supplier information to public users for admin-added or
// scraped offers. Only genuinely user-submitted offers expose the business.
export function offerShowsSupplier(source: OfferSource): boolean {
  return source === "user";
}
