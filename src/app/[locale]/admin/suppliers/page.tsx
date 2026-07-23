import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Registration, Supplier } from "@/lib/types";
import { SuppliersDashboard } from "@/components/suppliers-dashboard";

export const metadata: Metadata = { title: "Admin — Businesses" };
export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const supabase = await createClient();

  const { data: suppliersRaw } = await supabase
    .from("suppliers")
    .select("*, offers(count)")
    .order("created_at", { ascending: false });
  const suppliers = (suppliersRaw ?? []) as (Supplier & {
    offers: { count: number }[];
  })[];

  const { data: registrationsRaw } = await supabase
    .from("registrations")
    .select("*")
    .eq("reg_type", "supplier")
    .eq("status", "pending")
    .order("created_at");
  const registrations = (registrationsRaw ?? []) as Registration[];

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Businesses</h1>
        <p className="admin-sub">
          Companies in the directory: approve new registrations, edit details,
          renew or reject membership.
        </p>
      </header>

      <SuppliersDashboard
        suppliers={suppliers.map((s) => ({
          ...s,
          offerCount: s.offers?.[0]?.count ?? 0,
        }))}
        registrations={registrations}
      />
    </div>
  );
}
