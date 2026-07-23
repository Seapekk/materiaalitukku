import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { AdminNote } from "@/lib/types";
import { NotesDashboard } from "@/components/notes-dashboard";

export const metadata: Metadata = { title: "Admin — Notes" };
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("admin_notes")
    .select("*")
    .order("created_at", { ascending: false });
  const notes = (data ?? []) as AdminNote[];

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Notes</h1>
        <p className="admin-sub">
          Internal notes for admins — not shown on the public site.
        </p>
      </header>

      <NotesDashboard notes={notes} />
    </div>
  );
}
