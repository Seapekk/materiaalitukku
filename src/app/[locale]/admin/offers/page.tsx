import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Offer, Product, Supplier } from "@/lib/types";
import { OffersDashboard } from "@/components/offers-dashboard";

export const metadata: Metadata = { title: "Admin — Products" };
export const dynamic = "force-dynamic";

type OfferRow = Offer & {
  product: Pick<Product, "id" | "name" | "unit"> | null;
  supplier: Pick<
    Supplier,
    "id" | "name" | "country" | "email" | "phone" | "website" | "address" | "social"
  > | null;
};

export default async function OffersPage() {
  const supabase = await createClient();

  const { data: offersRaw } = await supabase
    .from("offers")
    .select(
      "*, product:products(id,name,unit), supplier:suppliers(id,name,country,email,phone,website,address,social)"
    )
    .order("created_at", { ascending: false });
  const offers = (offersRaw ?? []) as unknown as OfferRow[];

  const { data: productsRaw } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("name");
  const products = (productsRaw ?? []) as Product[];

  const { data: suppliersRaw } = await supabase
    .from("suppliers")
    .select("*")
    .eq("status", "active")
    .order("name");
  const suppliers = (suppliersRaw ?? []) as Supplier[];

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Products</h1>
        <p className="admin-sub">
          Each business&apos;s price for a product name. Add a new product name or
          business on its own tab first.
        </p>
      </header>

      <OffersDashboard offers={offers} products={products} suppliers={suppliers} />
    </div>
  );
}
