"use server";

import { createClient } from "@/lib/supabase/server";

export type SubmitState = { error?: string; success?: boolean };

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function createSubmission(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const supabase = await createClient();

  const unitPrice = num(formData, "unitPrice");
  if (unitPrice == null || unitPrice < 0) {
    return { error: "genericError" };
  }

  const { error } = await supabase.from("submissions").insert({
    supplier_name: String(formData.get("supplierName") ?? "").trim(),
    supplier_email: String(formData.get("supplierEmail") ?? "").trim(),
    supplier_country: String(formData.get("supplierCountry") ?? "fi"),
    raw_name: String(formData.get("productName") ?? "").trim(),
    raw_description: String(formData.get("description") ?? "").trim(),
    raw_unit: String(formData.get("unit") ?? "kpl"),
    raw_unit_price: unitPrice,
    raw_wholesale_price: num(formData, "wholesalePrice"),
    raw_min_wholesale_qty: num(formData, "minWholesaleQty"),
    raw_transport_small: num(formData, "transportSmall"),
    raw_transport_bulk: num(formData, "transportBulk"),
    category_slug: String(formData.get("category") ?? "") || null,
  });

  if (error) {
    return { error: "genericError" };
  }

  return { success: true };
}
