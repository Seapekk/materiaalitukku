import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { TransportCompany } from "@/lib/types";

export const metadata: Metadata = { title: "Kuljetus" };
export const dynamic = "force-dynamic";

export default async function TransportPage() {
  const t = await getTranslations("transport");
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("transport_companies")
    .select("*")
    .order("featured", { ascending: false })
    .order("name");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-slate-600 mb-6">{t("intro")}</p>

      {companies && companies.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {companies.map((c: TransportCompany) => (
            <div
              key={c.id}
              className={`bg-white border rounded-lg p-4 ${
                c.featured ? "border-emerald-600" : "border-slate-200"
              }`}
            >
              <h3 className="font-semibold">🚚 {c.name}</h3>
              <p className="text-sm text-slate-600 mt-1">
                {t("route")}: {c.route}
                {c.days && (
                  <>
                    {" · "}
                    {t("days")}: {c.days}
                  </>
                )}
              </p>
              {c.services.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.services.map((s) => (
                    <span
                      key={s}
                      className="text-xs bg-slate-100 rounded-full px-2 py-1"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {c.capacity && (
                <p className="text-xs text-slate-500 mt-2">
                  {t("capacity")}: {c.capacity}
                </p>
              )}
              <ul className="mt-3 text-sm text-slate-700 space-y-1">
                {c.email && <li>✉️ {c.email}</li>}
                {c.phone && <li>📞 {c.phone}</li>}
                {c.website && (
                  <li>
                    🌐{" "}
                    <a
                      href={c.website}
                      target="_blank"
                      rel="nofollow noopener"
                      className="text-emerald-700 underline"
                    >
                      {c.website}
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
