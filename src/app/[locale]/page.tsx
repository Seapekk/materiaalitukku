import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryName, type Category } from "@/lib/types";

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
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .is("parent_slug", null)
    .order("sort_order");

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
              href="/products"
              className="bg-white text-emerald-800 font-semibold rounded px-6 py-3 hover:bg-emerald-50"
            >
              {t("ctaBrowse")}
            </Link>
            <Link
              href="/submit"
              className="border border-emerald-300 text-white rounded px-6 py-3 hover:bg-emerald-700"
            >
              {t("ctaSubmit")}
            </Link>
          </div>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t("categoriesTitle")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.map((c: Category) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="bg-white border border-slate-200 rounded-lg p-4 text-center font-medium hover:border-emerald-600 transition-colors"
              >
                {categoryName(c, locale)}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-slate-100 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
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
        </div>
      </section>
    </div>
  );
}
