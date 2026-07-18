"use server";

import { createClient } from "@/lib/supabase/server";

export type TenderFormState = { error?: string; success?: boolean };

export async function createTender(
  _prev: TenderFormState,
  formData: FormData
): Promise<TenderFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "loginRequired" };
  }

  const budgetRaw = String(formData.get("budget") ?? "").trim();

  const { data: tender, error } = await supabase
    .from("tenders")
    .insert({
      owner_id: user.id,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      category_id: formData.get("category") ? Number(formData.get("category")) : null,
      type: formData.get("type") === "goods" ? "goods" : "services",
      budget: budgetRaw ? Number(budgetRaw) : null,
      country: String(formData.get("country") ?? "EE"),
      city: String(formData.get("city") ?? "").trim(),
    })
    .select("id")
    .single();

  if (error || !tender) {
    return { error: "genericError" };
  }

  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (email || phone) {
    await supabase.from("tender_contacts").insert({
      tender_id: tender.id,
      email: email || null,
      phone: phone || null,
    });
  }

  return { success: true };
}
