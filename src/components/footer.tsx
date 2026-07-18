import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <p>
          © {new Date().getFullYear()} Materiaalitukku. {t("rights")}
        </p>
        <nav className="flex gap-4">
          <Link href="/tenders" className="hover:text-slate-800">
            {t("tenders")}
          </Link>
          <Link href="/businesses" className="hover:text-slate-800">
            {t("businesses")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
