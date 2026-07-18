import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCountryFlag, getCountryName } from "@/lib/country";
import type { Supplier } from "@/lib/types";

export const metadata: Metadata = { title: "Toimittajat" };
export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const t = await getTranslations("suppliers");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>

      {suppliers && suppliers.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suppliers.map((s: Supplier) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold">
                {getCountryFlag(s.country)} {s.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {getCountryName(s.country, locale)}
                {s.lead_time && (
                  <>
                    {" · "}
                    {t("leadTime")}: {s.lead_time}
                  </>
                )}
              </p>
              {s.description && (
                <p className="mt-2 text-sm text-slate-600 line-clamp-3">{s.description}</p>
              )}
              <ul className="mt-3 text-sm text-slate-700 space-y-1">
                {s.email && <li>✉️ {s.email}</li>}
                {s.phone && <li>📞 {s.phone}</li>}
                {s.website && (
                  <li>
                    🌐{" "}
                    <a
                      href={s.website}
                      target="_blank"
                      rel="nofollow noopener"
                      className="text-emerald-700 underline"
                    >
                      {t("website")}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 py-12 text-center">{t("noResults")}</p>
      )}
    </div>
  );
}
