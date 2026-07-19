"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? supabase : null;
}

// Approving a submission: reuse the supplier (matched by email) or create it,
// create the product, create the supplier's offer, then mark the submission.
export async function approveSubmission(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id"));
  const { data: sub } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();
  if (!sub || sub.status !== "pending") return;

  let supplierId = sub.supplier_id;
  if (!supplierId) {
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .ilike("email", sub.supplier_email)
      .maybeSingle();

    if (existing) {
      supplierId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("suppliers")
        .insert({
          name: sub.supplier_name,
          country: sub.supplier_country,
          email: sub.supplier_email,
        })
        .select("id")
        .single();
      supplierId = created?.id;
    }
  }
  if (!supplierId) return;

  const { data: product } = await supabase
    .from("products")
    .insert({
      name: sub.raw_name,
      description: sub.raw_description,
      category_slug: sub.category_slug,
      unit: sub.raw_unit,
    })
    .select("id")
    .single();
  if (!product) return;

  await supabase.from("offers").insert({
    product_id: product.id,
    supplier_id: supplierId,
    unit_price: sub.raw_unit_price,
    wholesale_price: sub.raw_wholesale_price,
    min_wholesale_qty: sub.raw_min_wholesale_qty,
    transport_small: sub.raw_transport_small ?? 0,
    transport_bulk: sub.raw_transport_bulk ?? 0,
  });

  await supabase
    .from("submissions")
    .update({ status: "approved", supplier_id: supplierId })
    .eq("id", id);

  revalidatePath("/", "layout");
}

export async function rejectSubmission(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id"));
  await supabase
    .from("submissions")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");

  revalidatePath("/", "layout");
}

export async function markRegistrationDone(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  await supabase
    .from("registrations")
    .update({ status: "done" })
    .eq("id", String(formData.get("id")));

  revalidatePath("/", "layout");
}

export async function markMessageRead(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  await supabase
    .from("messages")
    .update({ read: true })
    .eq("id", String(formData.get("id")));

  revalidatePath("/", "layout");
}

// Approving a price change request writes the new price onto the offer.
export async function approvePriceChange(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id"));
  const { data: req } = await supabase
    .from("price_change_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (!req || req.status !== "pending") return;

  const { error } = await supabase
    .from("offers")
    .update({
      unit_price: req.new_unit_price,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.offer_id);
  if (error) return;

  await supabase
    .from("price_change_requests")
    .update({ status: "approved" })
    .eq("id", id);

  revalidatePath("/", "layout");
}

export async function rejectPriceChange(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  await supabase
    .from("price_change_requests")
    .update({ status: "rejected" })
    .eq("id", String(formData.get("id")))
    .eq("status", "pending");

  revalidatePath("/", "layout");
}
