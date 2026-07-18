import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryName, type Business, type Category } from "@/lib/types";

export const metadata: Metadata = { title: "Businesses" };
export const dynamic = "force-dynamic";

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; country?: string }>;
}) {
  const { q, category, country } = await searchParams;
  const t = await getTranslations("businesses");
  const tc = await getTranslations("common");
  const tt = await getTranslations("tenders");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  let query = supabase
    .from("businesses")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) {
    query = query.textSearch("search", q, { type: "websearch", config: "simple" });
  }
  if (category) {
    query = query.contains("category_ids", [Number(category)]);
  }
  if (country) {
    query = query.eq("country", country);
  }

  const { data: businesses } = await query;
  const catById = new Map((categories ?? []).map((c: Category) => [c.id, c]));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Link
          href="/businesses/new"
          className="shrink-0 bg-emerald-700 text-white rounded px-4 py-2 text-sm hover:bg-emerald-800"
        >
          {t("addBusiness")}
        </Link>
      </div>

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
          <option value="">{tt("category")}: {tc("all")}</option>
          {(categories ?? []).map((c: Category) => (
            <option key={c.id} value={c.id}>
              {categoryName(c, locale)}
            </option>
          ))}
        </select>
        <select
          name="country"
          defaultValue={country ?? ""}
          className="border border-slate-300 rounded px-3 py-2 bg-white"
        >
          <option value="">{tt("country")}: {tc("all")}</option>
          <option value="EE">EE</option>
          <option value="FI">FI</option>
        </select>
        <button className="bg-emerald-700 text-white rounded px-4 py-2 hover:bg-emerald-800 cursor-pointer">
          {tc("search")}
        </button>
      </form>

      {businesses && businesses.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {businesses.map((b: Business) => (
            <Link
              key={b.id}
              href={`/businesses/${b.id}`}
              className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-emerald-600 transition-colors"
            >
              <h3 className="font-semibold">{b.name}</h3>
              {b.tagline && (
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{b.tagline}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="bg-slate-100 rounded-full px-2 py-1">
                  {b.city}, {b.country}
                </span>
                {b.category_ids.slice(0, 2).map((id) => {
                  const c = catById.get(id);
                  return c ? (
                    <span key={id} className="bg-slate-100 rounded-full px-2 py-1">
                      {categoryName(c, locale)}
                    </span>
                  ) : null;
                })}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 py-12 text-center">{t("noResults")}</p>
      )}
    </div>
  );
}
