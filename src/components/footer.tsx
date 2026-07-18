import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  const tc = await getTranslations("common");

  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <p>
          © {new Date().getFullYear()} Materiaalitukku. {t("rights")}
        </p>
        <p>{tc("vatNote")}</p>
        <nav className="flex gap-4">
          <Link href="/products" className="hover:text-slate-800">
            {t("products")}
          </Link>
          <Link href="/suppliers" className="hover:text-slate-800">
            {t("suppliers")}
          </Link>
          <Link href="/transport" className="hover:text-slate-800">
            {t("transport")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
