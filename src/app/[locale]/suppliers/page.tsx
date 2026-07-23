import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Toimittajat } from "@/components/toimittajat";
import type { Category, Offer, Product, Supplier } from "@/lib/types";

export const metadata: Metadata = { title: "Toimittajat" };
export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const [s, o, p, c] = await Promise.all([
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("offers").select("*").eq("status", "active"),
    supabase.from("products").select("*").eq("status", "active"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  return (
    <Toimittajat
      initialSuppliers={(s.data as Supplier[]) ?? []}
      initialOffers={(o.data as Offer[]) ?? []}
      initialProducts={(p.data as Product[]) ?? []}
      initialCategories={(c.data as Category[]) ?? []}
    />
  );
}
