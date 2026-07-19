"use server";

import { createClient } from "@/lib/supabase/server";

export type PortalState = { success?: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMessage(formData: FormData): Promise<PortalState> {
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!EMAIL_RE.test(email)) return { error: "invalidEmail" };
  if (!message) return { error: "emptyMessage" };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    sender_email: email,
    message: message.slice(0, 5000),
  });
  if (error) return { error: "genericError" };
  return { success: true };
}

// Partner registration from the Hinnoittelu page (product / supplier /
// transport package). Stored for admin follow-up.
export async function registerPartner(
  formData: FormData
): Promise<PortalState> {
  const regType = String(formData.get("regType") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();

  if (!["product", "supplier", "transport"].includes(regType))
    return { error: "genericError" };
  if (!companyName) return { error: "genericError" };
  if (!EMAIL_RE.test(email)) return { error: "invalidEmail" };

  const supabase = await createClient();
  const { error } = await supabase.from("registrations").insert({
    reg_type: regType,
    company_name: companyName.slice(0, 200),
    email,
    phone: phone.slice(0, 50) || null,
    payload: { details: details.slice(0, 5000) },
  });
  if (error) return { error: "genericError" };
  return { success: true };
}

export async function requestPriceChange(
  formData: FormData
): Promise<PortalState> {
  const email = String(formData.get("email") ?? "").trim();
  const offerId = String(formData.get("offerId") ?? "");
  const price = Number(formData.get("newPrice"));

  if (!EMAIL_RE.test(email)) return { error: "invalidEmail" };
  if (!offerId) return { error: "genericError" };
  if (!Number.isFinite(price) || price <= 0) return { error: "invalidPrice" };

  const supabase = await createClient();
  const { error } = await supabase.from("price_change_requests").insert({
    supplier_email: email,
    offer_id: offerId,
    new_unit_price: price,
  });
  if (error) return { error: "genericError" };
  return { success: true };
}
