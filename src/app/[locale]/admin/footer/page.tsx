import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { FooterConfig } from "@/lib/types";
import { FooterDashboard } from "@/components/footer-dashboard";

export const metadata: Metadata = { title: "Admin — Footer" };
export const dynamic = "force-dynamic";

export default async function FooterAdminPage() {
  const supabase = await createClient();

  const { data } = await supabase.from("footer_config").select("*").eq("id", true).single();
  const config = data as FooterConfig;

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Footer</h1>
        <p className="admin-sub">
          Company details and extra links shown in the site footer. Empty fields
          fall back to the default text.
        </p>
      </header>

      <FooterDashboard config={config} />
    </div>
  );
}
