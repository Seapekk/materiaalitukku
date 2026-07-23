import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Hinta } from "@/components/hinta";
import type { Category, Offer, Product, Supplier } from "@/lib/types";

export const dynamic = "force-dynamic";

// The front page IS the price comparison, exactly like the original app.
// Data is fetched here on the server so the comparison renders on first paint
// (no client-side fetch + loading spinner on every visit).
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const [p, o, s, c] = await Promise.all([
    supabase.from("products").select("*").eq("status", "active").order("name"),
    supabase.from("offers").select("*").eq("status", "active"),
    supabase.from("suppliers").select("*"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  return (
    <Hinta
      initialProducts={(p.data as Product[]) ?? []}
      initialOffers={(o.data as Offer[]) ?? []}
      initialSuppliers={(s.data as Supplier[]) ?? []}
      initialCategories={(c.data as Category[]) ?? []}
    />
  );
}
