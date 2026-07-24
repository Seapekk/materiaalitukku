import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Kuljetus } from "@/components/kuljetus";
import type { Category, TransportCompany } from "@/lib/types";

export const metadata: Metadata = { title: "Kuljetusyritykset" };
export const dynamic = "force-dynamic";

export default async function TransportPage() {
  const supabase = await createClient();

  const [{ data: companies }, { data: cats }] = await Promise.all([
    supabase
      .from("transport_companies")
      .select("*")
      .order("featured", { ascending: false })
      .order("name"),
    supabase
      .from("categories")
      .select("*")
      .eq("type", "transport")
      .order("sort_order"),
  ]);

  return (
    <Kuljetus
      initialCompanies={(companies as TransportCompany[]) ?? []}
      transportCategories={(cats as Category[]) ?? []}
    />
  );
}
