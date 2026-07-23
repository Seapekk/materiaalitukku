"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";
import type { FooterLink } from "@/lib/types";

export type FooterActionState = { success?: string; error?: string };

export type FooterConfigInput = {
  companyName: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  copyright: string;
  links: FooterLink[];
};

export async function saveFooterConfig(data: FooterConfigInput): Promise<FooterActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const links = data.links
    .filter((l) => l.title.trim() && l.url.trim())
    .slice(0, 3);

  const { error } = await supabase
    .from("footer_config")
    .update({
      company_name: data.companyName.trim(),
      description: data.description.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      copyright: data.copyright.trim(),
      links,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "footer", "Updated footer config");
  revalidatePath("/", "layout");
  return { success: "saved" };
}
