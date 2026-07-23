import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";
import { MessagesDashboard } from "@/components/messages-dashboard";

export const metadata: Metadata = { title: "Admin — Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });
  const messages = (data ?? []) as Message[];

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Messages</h1>
        <p className="admin-sub">Messages sent through the contact form.</p>
      </header>

      <MessagesDashboard messages={messages} />
    </div>
  );
}
