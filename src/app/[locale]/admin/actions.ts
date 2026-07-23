"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";
import { sendEmail, emailTemplates } from "@/lib/email";
import { setSetting, IMAGE_VERIFICATION_KEY } from "@/lib/settings";

// Approving a submission: reuse the supplier (matched by email) or create it,
// link to an existing product (if the admin matched one) or create a new
// product name, upsert the supplier's offer, then mark the submission.
export async function approveSubmission(formData: FormData) {
  const ctx = await requireAdminAction();
  if (!ctx) return;
  const { supabase, user } = ctx;

  const id = String(formData.get("id"));
  const matchedProductId = String(formData.get("productId") ?? "").trim() || null;
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

  let productId = matchedProductId;
  if (productId) {
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();
    if (!existingProduct) return;
  } else {
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
    productId = product.id;
  }

  await supabase.from("offers").upsert(
    {
      product_id: productId,
      supplier_id: supplierId,
      unit_price: sub.raw_unit_price,
      wholesale_price: sub.raw_wholesale_price,
      min_wholesale_qty: sub.raw_min_wholesale_qty,
      transport_small: sub.raw_transport_small ?? 0,
      transport_bulk: sub.raw_transport_bulk ?? 0,
      price_tiers: sub.raw_price_tiers ?? [],
      source: "user",
    },
    { onConflict: "product_id,supplier_id" }
  );

  await supabase
    .from("submissions")
    .update({ status: "approved", supplier_id: supplierId })
    .eq("id", id);

  await logActivity(
    supabase,
    user,
    "submissions",
    matchedProductId
      ? `Approved submission "${sub.raw_name}" → linked to existing product`
      : `Approved submission "${sub.raw_name}" → created new product`
  );

  // Notify the submitter (best-effort).
  const approvedMail = emailTemplates.submissionApproved(sub.raw_name);
  await sendEmail({ to: sub.supplier_email, ...approvedMail });

  revalidatePath("/", "layout");
}

export async function rejectSubmission(formData: FormData) {
  const ctx = await requireAdminAction();
  if (!ctx) return;
  const { supabase, user } = ctx;

  const id = String(formData.get("id"));
  const { data: sub } = await supabase
    .from("submissions")
    .select("supplier_email, raw_name")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("submissions")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");

  await logActivity(supabase, user, "submissions", `Rejected submission ${id}`);

  if (sub?.supplier_email) {
    const mail = emailTemplates.submissionRejected(sub.raw_name);
    await sendEmail({ to: sub.supplier_email, ...mail });
  }

  revalidatePath("/", "layout");
}

export async function markRegistrationDone(formData: FormData) {
  const ctx = await requireAdminAction();
  if (!ctx) return;
  const { supabase, user } = ctx;

  const id = String(formData.get("id"));
  const { data: reg } = await supabase
    .from("registrations")
    .select("email, company_name")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("registrations").update({ status: "done" }).eq("id", id);

  await logActivity(supabase, user, "registrations", `Marked registration ${id} done`);

  if (reg?.email) {
    const mail = emailTemplates.registrationReceived(reg.company_name ?? "");
    await sendEmail({ to: reg.email, ...mail });
  }

  revalidatePath("/", "layout");
}

// Approving a price change request writes the new price onto the offer.
export async function approvePriceChange(formData: FormData) {
  const ctx = await requireAdminAction();
  if (!ctx) return;
  const { supabase, user } = ctx;

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

  await logActivity(
    supabase,
    user,
    "offers",
    `Approved price change on offer ${req.offer_id} → ${req.new_unit_price} €`
  );

  if (req.supplier_email) {
    const mail = emailTemplates.priceChangeApproved(Number(req.new_unit_price));
    await sendEmail({ to: req.supplier_email, ...mail });
  }

  revalidatePath("/", "layout");
}

// Dashboard image-verification toggle.
export async function setImageVerification(enabled: boolean) {
  const ctx = await requireAdminAction();
  if (!ctx) return;
  const { supabase, user } = ctx;
  await setSetting(supabase, IMAGE_VERIFICATION_KEY, enabled ? "true" : "false");
  await logActivity(
    supabase,
    user,
    "settings",
    `Image verification ${enabled ? "enabled" : "disabled"}`
  );
  revalidatePath("/", "layout");
}

export async function rejectPriceChange(formData: FormData) {
  const ctx = await requireAdminAction();
  if (!ctx) return;
  const { supabase, user } = ctx;

  const id = String(formData.get("id"));
  await supabase
    .from("price_change_requests")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");

  await logActivity(supabase, user, "offers", `Rejected price change request ${id}`);
  revalidatePath("/", "layout");
}

// Full-catalog backup: dumps the core marketplace tables as one JSON object
// for the admin to download. Read-only, no revalidation needed.
const BACKUP_TABLES = [
  "products",
  "offers",
  "suppliers",
  "transport_companies",
  "categories",
] as const;

export async function exportBackup(): Promise<{ error?: string; json?: string }> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const tables: Record<string, unknown> = {};
  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) return { error: "genericError" };
    tables[table] = data ?? [];
  }

  await logActivity(supabase, user, "backup", "Exported full backup");
  return {
    json: JSON.stringify(
      { exportedAt: new Date().toISOString(), tables },
      null,
      2
    ),
  };
}
