import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCountryFlag } from "@/lib/country";
import type { Submission } from "@/lib/types";
import { approveSubmission, rejectSubmission } from "./actions";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    redirect({ href: "/", locale });
    return null;
  }

  const { data: pending } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-sm text-slate-500 mb-6">{t("approveNote")}</p>

      {pending && pending.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold mb-3">
            {t("pendingSubmissions")} ({pending.length})
          </h2>
          <ul className="space-y-3">
            {pending.map((sub: Submission) => (
              <li key={sub.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{sub.raw_name}</p>
                    <p className="text-sm text-slate-500">
                      {t("supplier")}: {getCountryFlag(sub.supplier_country)}{" "}
                      {sub.supplier_name} ({sub.supplier_email})
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {t("price")}: {sub.raw_unit_price.toFixed(2)} €/{sub.raw_unit}
                      {sub.raw_wholesale_price != null && (
                        <> · {sub.raw_wholesale_price.toFixed(2)} € ≥ {sub.raw_min_wholesale_qty ?? "?"}</>
                      )}
                      {sub.raw_transport_small != null && (
                        <> · 🚚 {sub.raw_transport_small.toFixed(2)} €</>
                      )}
                      {sub.raw_transport_bulk != null && (
                        <> / {sub.raw_transport_bulk.toFixed(2)} €</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={approveSubmission}>
                      <input type="hidden" name="id" value={sub.id} />
                      <button className="bg-emerald-700 text-white rounded px-3 py-1.5 text-sm hover:bg-emerald-800 cursor-pointer">
                        {t("approve")}
                      </button>
                    </form>
                    <form action={rejectSubmission}>
                      <input type="hidden" name="id" value={sub.id} />
                      <button className="bg-red-600 text-white rounded px-3 py-1.5 text-sm hover:bg-red-700 cursor-pointer">
                        {t("reject")}
                      </button>
                    </form>
                  </div>
                </div>
                {sub.raw_description && (
                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                    {sub.raw_description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-slate-500">{t("empty")}</p>
      )}
    </div>
  );
}
