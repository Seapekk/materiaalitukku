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

export async function moderateTender(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id"));
  const status = formData.get("action") === "approve" ? "approved" : "rejected";
  await supabase.from("tenders").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function moderateBusiness(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id"));
  const status = formData.get("action") === "approve" ? "approved" : "rejected";
  await supabase.from("businesses").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}
