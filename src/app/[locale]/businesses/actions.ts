"use server";

import { createClient } from "@/lib/supabase/server";

export type BusinessFormState = { error?: string; success?: boolean };

export async function createBusiness(
  _prev: BusinessFormState,
  formData: FormData
): Promise<BusinessFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "loginRequired" };
  }

  const categoryIds = formData
    .getAll("categories")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name: String(formData.get("name") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim(),
    category_ids: categoryIds,
    country: String(formData.get("country") ?? "EE"),
    city: String(formData.get("city") ?? "").trim(),
    website: String(formData.get("website") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
  });

  if (error) {
    return { error: "genericError" };
  }

  return { success: true };
}
