import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { TenderCard } from "@/components/tender-card";
import type { Category, Tender } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  const supabase = await createClient();
  const [{ data: tenders }, { data: categories }] = await Promise.all([
    supabase
      .from("tenders")
      .select("*")
      .eq("status", "approved")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("categories").select("*"),
  ]);
  const catById = new Map((categories ?? []).map((c: Category) => [c.id, c]));

  return (
    <div>
      <section className="bg-emerald-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold max-w-3xl mx-auto">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-lg text-emerald-100 max-w-2xl mx-auto">
            {t("heroText")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/tenders/new"
              className="bg-white text-emerald-800 font-semibold rounded px-6 py-3 hover:bg-emerald-50"
            >
              {t("ctaPost")}
            </Link>
            <Link
              href="/tenders"
              className="border border-emerald-300 text-white rounded px-6 py-3 hover:bg-emerald-700"
            >
              {t("ctaBrowse")}
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">{t("howTitle")}</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {([1, 2, 3] as const).map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-6 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                {i}
              </div>
              <h3 className="mt-4 font-semibold">{t(`step${i}Title`)}</h3>
              <p className="mt-2 text-sm text-slate-600">{t(`step${i}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {tenders && tenders.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{t("latestTenders")}</h2>
            <Link href="/tenders" className="text-emerald-700 underline text-sm">
              {t("browseAll")}
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {tenders.map((tender: Tender) => (
              <TenderCard
                key={tender.id}
                tender={tender}
                category={tender.category_id != null ? catById.get(tender.category_id) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      <section className="bg-slate-100 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl font-bold">{t("bizTitle")}</h2>
          <p className="mt-2 text-slate-600 max-w-xl mx-auto">{t("bizText")}</p>
          <Link
            href="/businesses/new"
            className="mt-6 inline-block bg-emerald-700 text-white rounded px-6 py-3 font-medium hover:bg-emerald-800"
          >
            {t("bizCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
