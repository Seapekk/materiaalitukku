import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Kuljetus } from "@/components/kuljetus";
import type { TransportCompany } from "@/lib/types";

export const metadata: Metadata = { title: "Kuljetusyritykset" };
export const dynamic = "force-dynamic";

export default async function TransportPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transport_companies")
    .select("*")
    .order("featured", { ascending: false })
    .order("name");

  return <Kuljetus initialCompanies={(data as TransportCompany[]) ?? []} />;
}
