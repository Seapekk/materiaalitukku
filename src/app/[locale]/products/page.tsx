import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryName, type Category, type Product } from "@/lib/types";

export const metadata: Metadata = { title: "Hintavertailu" };
export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const t = await getTranslations("products");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  const cats: Category[] = categories ?? [];
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));

  let query = supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("name")
    .limit(100);

  if (q) {
    query = query.textSearch("search", q, { type: "websearch", config: "simple" });
  }
  if (category) {
    // A top-level category also includes its subcategories.
    const subSlugs = cats
      .filter((c) => c.parent_slug === category)
      .map((c) => c.slug);
    query = query.in("category_slug", [category, ...subSlugs]);
  }

  const { data: products } = await query;

  // Cheapest unit price + offer count per product for the list view.
  const ids = (products ?? []).map((p: Product) => p.id);
  const offerInfo = new Map<string, { count: number; min: number }>();
  if (ids.length > 0) {
    const { data: offers } = await supabase
      .from("offers")
      .select("product_id, unit_price")
      .eq("status", "active")
      .in("product_id", ids);
    for (const o of offers ?? []) {
      const cur = offerInfo.get(o.product_id);
      if (!cur) {
        offerInfo.set(o.product_id, { count: 1, min: o.unit_price });
      } else {
        cur.count += 1;
        cur.min = Math.min(cur.min, o.unit_price);
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-sm text-slate-500 mb-6">{tc("vatNote")}</p>

      <form className="flex flex-wrap gap-2 mb-6" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="flex-1 min-w-48 border border-slate-300 rounded px-3 py-2 bg-white"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="border border-slate-300 rounded px-3 py-2 bg-white"
        >
          <option value="">{t("category")}: {tc("all")}</option>
          {cats
            .filter((c) => !c.parent_slug)
            .map((c) => (
              <option key={c.slug} value={c.slug}>
                {categoryName(c, locale)}
              </option>
            ))}
        </select>
        <button className="bg-emerald-700 text-white rounded px-4 py-2 hover:bg-emerald-800 cursor-pointer">
          {tc("search")}
        </button>
      </form>

      {products && products.length > 0 ? (
        <div className="grid gap-2">
          {products.map((p: Product) => {
            const info = offerInfo.get(p.id);
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-emerald-600 transition-colors"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {categoryName(catBySlug.get(p.category_slug ?? ""), locale)}
                    {" · "}
                    {t("offerCount", { count: info?.count ?? 0 })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {info && (
                    <span className="text-emerald-700 font-semibold">
                      {t("from")} {info.min.toFixed(2)} €/{p.unit}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-500 py-12 text-center">{t("noResults")}</p>
      )}
    </div>
  );
}
