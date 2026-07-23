"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";

export type LogActionState = { success?: string; error?: string };

export async function purgeLogs(): Promise<LogActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  // No row ever has this id — deletes everything without a WHERE-less delete.
  const { error } = await supabase
    .from("activity_logs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return { error: "genericError" };

  revalidatePath("/", "layout");
  return { success: "purged" };
}
