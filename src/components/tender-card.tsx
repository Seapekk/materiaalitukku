import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryName, type Category, type Tender } from "@/lib/types";

export async function TenderCard({
  tender,
  category,
}: {
  tender: Tender;
  category?: Category;
}) {
  const t = await getTranslations("tenders");
  const locale = await getLocale();

  return (
    <Link
      href={`/tenders/${tender.id}`}
      className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-emerald-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{tender.title}</h3>
        {tender.budget != null && (
          <span className="shrink-0 text-emerald-700 font-semibold">
            {tender.budget} €
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600 line-clamp-2">
        {tender.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        {category && (
          <span className="bg-slate-100 rounded-full px-2 py-1">
            {categoryName(category, locale)}
          </span>
        )}
        <span className="bg-slate-100 rounded-full px-2 py-1">
          {tender.city}, {tender.country}
        </span>
        <span className="rounded-full px-2 py-1">
          {t("postedOn")}{" "}
          {new Date(tender.created_at).toLocaleDateString(locale)}
        </span>
      </div>
    </Link>
  );
}
