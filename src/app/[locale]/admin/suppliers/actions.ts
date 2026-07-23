"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";

export type SupActionState = { success?: string; error?: string };

export type SupplierInput = {
  name: string;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  social: string | null;
  leadTime: string | null;
  description: string | null;
};

export async function createSupplier(data: SupplierInput): Promise<SupActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.name.trim()) return { error: "genericError" };

  const { error } = await supabase.from("suppliers").insert({
    name: data.name.trim(),
    country: data.country || "fi",
    email: data.email,
    phone: data.phone,
    website: data.website,
    address: data.address,
    social: data.social,
    lead_time: data.leadTime,
    description: data.description,
  });
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "suppliers", `Created supplier "${data.name}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function updateSupplier(
  id: string,
  data: SupplierInput
): Promise<SupActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.name.trim()) return { error: "genericError" };

  const { error } = await supabase
    .from("suppliers")
    .update({
      name: data.name.trim(),
      country: data.country || "fi",
      email: data.email,
      phone: data.phone,
      website: data.website,
      address: data.address,
      social: data.social,
      lead_time: data.leadTime,
      description: data.description,
    })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "suppliers", `Updated supplier "${data.name}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function rejectSupplier(id: string, reason: string): Promise<SupActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("suppliers")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "suppliers", `Rejected supplier ${id}: ${reason}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function reactivateSupplier(id: string): Promise<SupActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("suppliers")
    .update({ status: "active", rejected_at: null, rejection_reason: null })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "suppliers", `Reactivated supplier ${id}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

// Renew: bump expiry 365 days from today, regardless of current status.
export async function renewSupplier(id: string): Promise<SupActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  const { error } = await supabase
    .from("suppliers")
    .update({ status: "active", expires_at: expiresAt.toISOString() })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "suppliers", `Renewed supplier ${id} for 365 days`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function deleteSupplier(id: string): Promise<SupActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "suppliers", `Deleted supplier ${id}`);
  revalidatePath("/", "layout");
  return { success: "deleted" };
}

// Registrations (reg_type = 'supplier') submitted via /addbusiness.
export async function approveSupplierRegistration(id: string): Promise<SupActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();
  if (!reg || reg.status !== "pending" || reg.reg_type !== "supplier")
    return { error: "genericError" };

  const payload = (reg.payload ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

  const { error } = await supabase.from("suppliers").insert({
    name: reg.company_name,
    country: str(payload.country) ?? "fi",
    email: reg.email,
    phone: reg.phone,
    website: str(payload.website),
    description: str(payload.details) ?? str(payload.productsDesc),
  });
  if (error) return { error: "genericError" };

  await supabase.from("registrations").update({ status: "done" }).eq("id", id);
  await logActivity(
    supabase,
    user,
    "suppliers",
    `Approved supplier registration "${reg.company_name}"`
  );
  revalidatePath("/", "layout");
  return { success: "approved" };
}

export async function rejectSupplierRegistration(id: string): Promise<SupActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  await supabase
    .from("registrations")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");

  await logActivity(supabase, user, "suppliers", `Rejected supplier registration ${id}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}
