"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";

export type MsgActionState = { success?: string; error?: string };

export async function setMessageRead(id: string, read: boolean): Promise<MsgActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  const { error } = await supabase.from("messages").update({ read }).eq("id", id);
  if (error) return { error: "genericError" };

  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function deleteMessage(id: string): Promise<MsgActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "messages", `Deleted message ${id}`);
  revalidatePath("/", "layout");
  return { success: "deleted" };
}
