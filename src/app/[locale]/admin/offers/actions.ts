"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";
import type { PriceTier } from "@/lib/types";

export type OfferActionState = { success?: string; error?: string };

export type OfferInput = {
  productId: string;
  supplierId: string;
  unitPrice: number;
  wholesalePrice: number | null;
  minWholesaleQty: number | null;
  priceTiers: PriceTier[];
  transportSmall: number;
  transportBulk: number;
  status: "active" | "pending" | "rejected";
  source: "user" | "admin" | "scraped";
};

// Keep only valid tiers (qty>1, price>0), ordered by quantity.
function cleanTiers(tiers: PriceTier[]): PriceTier[] {
  return (tiers ?? [])
    .filter((t) => Number.isFinite(t.qty) && t.qty > 1 && Number.isFinite(t.price) && t.price > 0)
    .map((t) => ({ qty: Math.round(t.qty), price: t.price }))
    .sort((a, b) => a.qty - b.qty);
}

export async function createOffer(data: OfferInput): Promise<OfferActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.productId || !data.supplierId) return { error: "genericError" };
  if (!Number.isFinite(data.unitPrice) || data.unitPrice <= 0)
    return { error: "invalidPrice" };

  const { error } = await supabase.from("offers").insert({
    product_id: data.productId,
    supplier_id: data.supplierId,
    unit_price: data.unitPrice,
    wholesale_price: data.wholesalePrice,
    min_wholesale_qty: data.minWholesaleQty,
    transport_small: data.transportSmall,
    transport_bulk: data.transportBulk,
    price_tiers: cleanTiers(data.priceTiers),
    status: data.status,
    source: data.source ?? "admin",
  });
  if (error) {
    return { error: error.code === "23505" ? "duplicateOffer" : "genericError" };
  }

  await logActivity(supabase, user, "offers", `Created offer (product ${data.productId} × supplier ${data.supplierId})`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function updateOffer(id: string, data: OfferInput): Promise<OfferActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!Number.isFinite(data.unitPrice) || data.unitPrice <= 0)
    return { error: "invalidPrice" };

  const { error } = await supabase
    .from("offers")
    .update({
      unit_price: data.unitPrice,
      wholesale_price: data.wholesalePrice,
      min_wholesale_qty: data.minWholesaleQty,
      transport_small: data.transportSmall,
      transport_bulk: data.transportBulk,
      price_tiers: cleanTiers(data.priceTiers),
      status: data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "offers", `Updated offer ${id}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

// Per-row status actions on the Products table (spec §1.2: approve / reject).
export async function setOfferStatus(
  id: string,
  status: "active" | "pending" | "rejected"
): Promise<OfferActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "offers", `Set offer ${id} status → ${status}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

// Per-row "add note": creates an admin note referencing this product entry.
export async function addOfferNote(
  offerId: string,
  title: string,
  content: string
): Promise<OfferActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;
  if (!content.trim()) return { error: "genericError" };

  const { error } = await supabase.from("admin_notes").insert({
    title: title.slice(0, 200) || "Product note",
    content: content.trim(),
    category: "PRODUCTS",
    color: "bg-blue-50",
  });
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "offers", `Added note on offer ${offerId}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function deleteOffer(id: string): Promise<OfferActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "offers", `Deleted offer ${id}`);
  revalidatePath("/", "layout");
  return { success: "deleted" };
}
