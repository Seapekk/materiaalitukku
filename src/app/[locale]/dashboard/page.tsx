import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business, Tender } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tn = await getTranslations("nav");
  const tb = await getTranslations("businesses");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [{ data: tenders }, { data: businesses }] = await Promise.all([
    supabase
      .from("tenders")
      .select("*")
      .eq("owner_id", user.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false }),
    supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .neq("status", "deleted"),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{t("myTenders")}</h2>
          <Link
            href="/tenders/new"
            className="bg-emerald-700 text-white rounded px-4 py-2 text-sm hover:bg-emerald-800"
          >
            {tn("postTender")}
          </Link>
        </div>
        {tenders && tenders.length > 0 ? (
          <ul className="space-y-2">
            {tenders.map((tender: Tender) => (
              <li
                key={tender.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-3"
              >
                <Link href={`/tenders/${tender.id}`} className="font-medium hover:underline">
                  {tender.title}
                </Link>
                <StatusBadge status={tender.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">{t("noTenders")}</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{t("myBusiness")}</h2>
          {(!businesses || businesses.length === 0) && (
            <Link
              href="/businesses/new"
              className="bg-emerald-700 text-white rounded px-4 py-2 text-sm hover:bg-emerald-800"
            >
              {tb("addBusiness")}
            </Link>
          )}
        </div>
        {businesses && businesses.length > 0 ? (
          <ul className="space-y-2">
            {businesses.map((b: Business) => (
              <li
                key={b.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-3"
              >
                <Link href={`/businesses/${b.id}`} className="font-medium hover:underline">
                  {b.name}
                </Link>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">{t("noBusiness")}</p>
        )}
      </section>
    </div>
  );
}
