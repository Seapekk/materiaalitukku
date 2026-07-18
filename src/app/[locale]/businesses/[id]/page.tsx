import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { categoryName, type Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name, tagline, description")
    .eq("id", id)
    .single();
  if (!business) return {};
  return {
    title: business.name,
    description: (business.tagline ?? business.description).slice(0, 160),
  };
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("businesses");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .single();

  if (!business) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .in("id", business.category_ids.length ? business.category_ids : [-1]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <article className="bg-white border border-slate-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold">{business.name}</h1>
        {business.tagline && (
          <p className="mt-1 text-slate-600">{business.tagline}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="bg-slate-100 rounded-full px-2 py-1">
            {business.city}, {business.country}
          </span>
          {(categories ?? []).map((c: Category) => (
            <span key={c.id} className="bg-slate-100 rounded-full px-2 py-1">
              {categoryName(c, locale)}
            </span>
          ))}
        </div>

        <p className="mt-6 whitespace-pre-wrap text-slate-700">
          {business.description}
        </p>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="font-semibold mb-2">{t("contactTitle")}</h2>
          <ul className="text-slate-700 space-y-1 text-sm">
            {business.email && <li>✉️ {business.email}</li>}
            {business.phone && <li>📞 {business.phone}</li>}
            {business.website && (
              <li>
                🌐{" "}
                <a
                  href={business.website}
                  rel="nofollow noopener"
                  target="_blank"
                  className="text-emerald-700 underline"
                >
                  {business.website}
                </a>
              </li>
            )}
          </ul>
        </section>
      </article>
    </div>
  );
}
