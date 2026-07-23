import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product, ScrapedPrice } from "@/lib/types";
import { ProductsDashboard } from "@/components/products-dashboard";
import { ProductNamesTranslator } from "@/components/product-names-translator";

export const metadata: Metadata = { title: "Admin — Product Names" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: productsRaw } = await supabase
    .from("products")
    .select("*, offers(count)")
    .order("created_at", { ascending: false });
  const products = (productsRaw ?? []) as (Product & { offers: { count: number }[] })[];

  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  const categories = (categoriesRaw ?? []) as Category[];

  const { data: scrapedRaw } = await supabase
    .from("scraped_prices")
    .select("*")
    .order("created_at", { ascending: false });
  const scrapedPrices = (scrapedRaw ?? []) as ScrapedPrice[];

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Product Names</h1>
        <p className="admin-sub">
          The master listing catalogue (name, description, category, image). Each
          name groups the businesses that sell it. Prices and businesses are
          managed on the Products tab.
        </p>
      </header>

      <ProductsDashboard
        products={products.map((p) => ({ ...p, offerCount: p.offers?.[0]?.count ?? 0 }))}
        categories={categories}
        scrapedPrices={scrapedPrices}
      />

      <section className="mt-10 border-t border-slate-200 pt-8">
        <header className="mb-6">
          <h2 className="admin-h1">Name translations</h2>
          <p className="admin-sub">
            Translate the Finnish product names into English, Swedish and any other
            EU language. Progress streams in the terminal and every chunk is saved
            as it completes, so a failure never loses prior work. Download/upload
            the English column on its own, or all languages at once.
          </p>
        </header>
        <ProductNamesTranslator
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            name_translations: p.name_translations ?? {},
          }))}
        />
      </section>
    </div>
  );
}
