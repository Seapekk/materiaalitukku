"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";
import type { RouteDirection } from "@/lib/types";

export type TransportActionState = { success?: string; error?: string };

export type TransportInput = {
  name: string;
  originCountry: string;
  direction: RouteDirection;
  services: string[];
  ftlPrice: number | null;
  ltlPrice: number | null;
  expressPrice: number | null;
  capacity: string | null;
  days: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
};

export async function createTransport(data: TransportInput): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.name.trim()) return { error: "genericError" };
  if (data.services.length === 0) return { error: "noServices" };

  const { error } = await supabase.from("transport_companies").insert({
    name: data.name.trim(),
    origin_country: data.originCountry,
    direction: data.direction,
    services: data.services,
    ftl_price: data.ftlPrice,
    ltl_price: data.ltlPrice,
    express_price: data.expressPrice,
    capacity: data.capacity,
    days: data.days,
    email: data.email,
    phone: data.phone,
    website: data.website,
    description: data.description,
  });
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Created transport company "${data.name}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function updateTransport(
  id: string,
  data: TransportInput
): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.name.trim()) return { error: "genericError" };
  if (data.services.length === 0) return { error: "noServices" };

  const { error } = await supabase
    .from("transport_companies")
    .update({
      name: data.name.trim(),
      origin_country: data.originCountry,
      direction: data.direction,
      services: data.services,
      ftl_price: data.ftlPrice,
      ltl_price: data.ltlPrice,
      express_price: data.expressPrice,
      capacity: data.capacity,
      days: data.days,
      email: data.email,
      phone: data.phone,
      website: data.website,
      description: data.description,
    })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Updated transport company "${data.name}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function rejectTransport(id: string, reason: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("transport_companies")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Rejected transport company ${id}: ${reason}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function reactivateTransport(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("transport_companies")
    .update({ status: "active", rejected_at: null, rejection_reason: null })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Reactivated transport company ${id}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function renewTransport(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  const { error } = await supabase
    .from("transport_companies")
    .update({ status: "active", expires_at: expiresAt.toISOString() })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Renewed transport company ${id} for 365 days`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function deleteTransport(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase.from("transport_companies").delete().eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "transport", `Deleted transport company ${id}`);
  revalidatePath("/", "layout");
  return { success: "deleted" };
}

// Registrations (reg_type = 'transport') submitted via /addbusiness.
export async function approveTransportRegistration(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();
  if (!reg || reg.status !== "pending" || reg.reg_type !== "transport")
    return { error: "genericError" };

  const payload = (reg.payload ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown): number | null => (typeof v === "number" && v > 0 ? v : null);
  const direction: RouteDirection =
    payload.routeDirection === "outbound" || payload.routeDirection === "roundtrip"
      ? payload.routeDirection
      : "inbound";
  const services = Array.isArray(payload.services)
    ? payload.services.filter((s): s is string => typeof s === "string")
    : [];

  const { error } = await supabase.from("transport_companies").insert({
    name: reg.company_name,
    origin_country: str(payload.routeCountry) ?? "ee",
    direction,
    services,
    ftl_price: num(payload.ftlPrice),
    ltl_price: num(payload.ltlPrice),
    express_price: num(payload.expressPrice),
    capacity: str(payload.capacity),
    days: str(payload.days) ?? "",
    email: reg.email,
    phone: reg.phone,
    website: str(payload.website),
    description: str(payload.details),
  });
  if (error) return { error: "genericError" };

  await supabase.from("registrations").update({ status: "done" }).eq("id", id);
  await logActivity(
    supabase,
    user,
    "transport",
    `Approved transport registration "${reg.company_name}"`
  );
  revalidatePath("/", "layout");
  return { success: "approved" };
}

export async function rejectTransportRegistration(id: string): Promise<TransportActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  await supabase
    .from("registrations")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");

  await logActivity(supabase, user, "transport", `Rejected transport registration ${id}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}
