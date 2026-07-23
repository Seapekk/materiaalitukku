import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Registration, TransportCompany } from "@/lib/types";
import { TransportDashboard } from "@/components/transport-dashboard";

export const metadata: Metadata = { title: "Admin — Transport Companies" };
export const dynamic = "force-dynamic";

export default async function TransportPage() {
  const supabase = await createClient();

  const { data: companiesRaw } = await supabase
    .from("transport_companies")
    .select("*")
    .order("created_at", { ascending: false });
  const companies = (companiesRaw ?? []) as TransportCompany[];

  const { data: registrationsRaw } = await supabase
    .from("registrations")
    .select("*")
    .eq("reg_type", "transport")
    .eq("status", "pending")
    .order("created_at");
  const registrations = (registrationsRaw ?? []) as Registration[];

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Transport Companies</h1>
        <p className="admin-sub">
          Freight-route partners: approve new registrations, edit route and
          prices, renew or reject membership.
        </p>
      </header>

      <TransportDashboard companies={companies} registrations={registrations} />
    </div>
  );
}
