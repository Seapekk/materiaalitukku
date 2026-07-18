import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryName } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tender } = await supabase
    .from("tenders")
    .select("title, description")
    .eq("id", id)
    .single();
  if (!tender) return {};
  return {
    title: tender.title,
    description: tender.description.slice(0, 160),
  };
}

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("tenders");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: tender } = await supabase
    .from("tenders")
    .select("*, categories(*)")
    .eq("id", id)
    .single();

  if (!tender) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS only returns the contact row to the tender owner or an admin.
  const { data: contact } = await supabase
    .from("tender_contacts")
    .select("email, phone")
    .eq("tender_id", id)
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <article className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{tender.title}</h1>
          {tender.budget != null && (
            <span className="shrink-0 text-xl text-emerald-700 font-bold">
              {tender.budget} €
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {tender.categories && (
            <span className="bg-slate-100 rounded-full px-2 py-1">
              {categoryName(tender.categories, locale)}
            </span>
          )}
          <span className="bg-slate-100 rounded-full px-2 py-1">
            {tender.city}, {tender.country}
          </span>
          <span className="bg-slate-100 rounded-full px-2 py-1">
            {tender.type === "goods" ? t("typeGoods") : t("typeServices")}
          </span>
          <span className="rounded-full px-2 py-1">
            {t("postedOn")} {new Date(tender.created_at).toLocaleDateString(locale)}
          </span>
          <span className="rounded-full px-2 py-1">
            {t("expiresOn")} {new Date(tender.expires_at).toLocaleDateString(locale)}
          </span>
        </div>

        <p className="mt-6 whitespace-pre-wrap text-slate-700">
          {tender.description}
        </p>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="font-semibold mb-2">{t("contactTitle")}</h2>
          {contact ? (
            <ul className="text-slate-700 space-y-1">
              {contact.email && <li>✉️ {contact.email}</li>}
              {contact.phone && <li>📞 {contact.phone}</li>}
            </ul>
          ) : user ? (
            <p className="text-slate-500 text-sm">{t("contactHidden")}</p>
          ) : (
            <Link href="/login" className="text-emerald-700 underline text-sm">
              {t("loginToSee")}
            </Link>
          )}
        </section>
      </article>
    </div>
  );
}
