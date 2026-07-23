"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import type { AdminNote } from "@/lib/types";

export type NoteActionState = { success?: string; error?: string };

export type NoteInput = {
  title: string;
  content: string;
  category: AdminNote["category"];
  color: string;
};

export async function createNote(data: NoteInput): Promise<NoteActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  if (!data.title.trim()) return { error: "genericError" };

  const { error } = await supabase.from("admin_notes").insert({
    title: data.title.trim(),
    content: data.content.trim(),
    category: data.category,
    color: data.color,
  });
  if (error) return { error: "genericError" };

  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function updateNote(id: string, data: NoteInput): Promise<NoteActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  if (!data.title.trim()) return { error: "genericError" };

  const { error } = await supabase
    .from("admin_notes")
    .update({
      title: data.title.trim(),
      content: data.content.trim(),
      category: data.category,
      color: data.color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "genericError" };

  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function deleteNote(id: string): Promise<NoteActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  const { error } = await supabase.from("admin_notes").delete().eq("id", id);
  if (error) return { error: "genericError" };

  revalidatePath("/", "layout");
  return { success: "deleted" };
}
