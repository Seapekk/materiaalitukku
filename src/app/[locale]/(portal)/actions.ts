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
// transport package). Stored for admin follow-up. The optional `payload`
// field carries the full July-form details as JSON.
export async function registerPartner(
  formData: FormData
): Promise<PortalState> {
  const regType = String(formData.get("regType") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const payloadRaw = String(formData.get("payload") ?? "");

  if (!["product", "supplier", "transport"].includes(regType))
    return { error: "genericError" };
  if (!companyName) return { error: "genericError" };
  if (!EMAIL_RE.test(email)) return { error: "invalidEmail" };

  let payload: Record<string, unknown> = { details: details.slice(0, 5000) };
  if (payloadRaw) {
    try {
      payload = { ...JSON.parse(payloadRaw.slice(0, 20000)), ...payload };
    } catch {
      // keep the plain details payload
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("registrations").insert({
    reg_type: regType,
    company_name: companyName.slice(0, 200),
    email,
    phone: phone.slice(0, 50) || null,
    payload,
  });
  if (error) return { error: "genericError" };
  return { success: true };
}

// Product registration from the Addproducts page → submissions queue.
// Tier 1 maps to the wholesale fields; tier 2 is preserved in the description.
export async function registerProduct(
  formData: FormData
): Promise<PortalState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const country = String(formData.get("country") ?? "fi").trim().toLowerCase();
  const itemName = String(formData.get("itemName") ?? "").trim();
  const itemCat = String(formData.get("itemCat") ?? "").trim();
  const itemUnit = String(formData.get("itemUnit") ?? "kpl").trim();
  const price = Number(formData.get("price"));
  const freight = Number(formData.get("freight"));
  const tier1Qty = Number(formData.get("tier1Qty"));
  const tier1Price = Number(formData.get("tier1Price"));
  const tier1Freight = Number(formData.get("tier1Freight"));
  const tier2Qty = Number(formData.get("tier2Qty"));
  const tier2Price = Number(formData.get("tier2Price"));

  if (!companyName || !itemName) return { error: "genericError" };
  if (!EMAIL_RE.test(email)) return { error: "invalidEmail" };
  if (!Number.isFinite(price) || price <= 0) return { error: "invalidPrice" };

  // Structured quantity tiers (both user-entered breaks), ordered by quantity.
  const rawTiers = [
    { qty: tier1Qty, price: tier1Price },
    { qty: tier2Qty, price: tier2Price },
  ]
    .filter(
      (t) =>
        Number.isFinite(t.qty) && t.qty > 1 && Number.isFinite(t.price) && t.price > 0
    )
    .map((t) => ({ qty: Math.round(t.qty), price: t.price }))
    .sort((a, b) => a.qty - b.qty);

  const supabase = await createClient();
  const { error } = await supabase.from("submissions").insert({
    supplier_name: companyName.slice(0, 200),
    supplier_email: email,
    supplier_country: country.slice(0, 2),
    raw_name: itemName.slice(0, 200),
    raw_description: "",
    raw_unit: itemUnit.slice(0, 10),
    raw_unit_price: price,
    // Keep tier 1 in the legacy wholesale fields for back-compat; the full set
    // of breaks lives in raw_price_tiers.
    raw_wholesale_price:
      Number.isFinite(tier1Price) && tier1Price > 0 ? tier1Price : null,
    raw_min_wholesale_qty:
      Number.isFinite(tier1Qty) && tier1Qty > 0 ? Math.round(tier1Qty) : null,
    raw_price_tiers: rawTiers,
    raw_transport_small: Number.isFinite(freight) && freight > 0 ? freight : 0,
    raw_transport_bulk:
      Number.isFinite(tier1Freight) && tier1Freight > 0 ? tier1Freight : 0,
    category_slug: itemCat || null,
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
