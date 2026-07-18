import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TenderCard } from "@/components/tender-card";
import { categoryName, type Category, type Tender } from "@/lib/types";

export const metadata: Metadata = { title: "Tenders" };
export const dynamic = "force-dynamic";

export default async function TendersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; country?: string }>;
}) {
  const { q, category, country } = await searchParams;
  const t = await getTranslations("tenders");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  let query = supabase
    .from("tenders")
    .select("*")
    .eq("status", "approved")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) {
    query = query.textSearch("search", q, { type: "websearch", config: "simple" });
  }
  if (category) {
    query = query.eq("category_id", Number(category));
  }
  if (country) {
    query = query.eq("country", country);
  }

  const { data: tenders } = await query;
  const catById = new Map((categories ?? []).map((c: Category) => [c.id, c]));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>

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
          <option value="">{t("country")}: {tc("all")}</option>
          <option value="EE">EE</option>
          <option value="FI">FI</option>
        </select>
        <button className="bg-emerald-700 text-white rounded px-4 py-2 hover:bg-emerald-800 cursor-pointer">
          {tc("search")}
        </button>
      </form>

      {tenders && tenders.length > 0 ? (
        <div className="grid gap-3">
          {tenders.map((tender: Tender) => (
            <TenderCard
              key={tender.id}
              tender={tender}
              category={tender.category_id != null ? catById.get(tender.category_id) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-slate-500 py-12 text-center">{t("noResults")}</p>
      )}
    </div>
  );
}
