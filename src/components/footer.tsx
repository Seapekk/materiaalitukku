import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  return (
    <footer className="mt-12 border-t-2 border-black bg-white font-sans text-stone-600">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 md:grid-cols-2 md:px-10 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-6">
          <div className="flex items-center gap-2">
            <span className="border border-black bg-black px-2 py-0.5 font-mono text-xs font-black uppercase tracking-wider text-white">
              Materiaalitukku.com B2B
            </span>
          </div>
          <p className="text-xs leading-relaxed text-stone-500">
            {t("description")}
          </p>
          <div className="font-mono text-[10px] text-gray-400">
            © {new Date().getFullYear()} MateriaaliTukku. {t("rights")} ·{" "}
            {tc("vatNote")}
          </div>
        </div>

        <div className="space-y-3 text-xs lg:col-span-3">
          <h4 className="font-mono text-xs font-extrabold uppercase tracking-wider text-stone-900">
            {t("contactTitle")}
          </h4>
          <div className="space-y-1.5 font-sans text-stone-500">
            <p>
              ✉️{" "}
              <Link href="/yhteystiedot" className="hover:underline">
                {tn("contact")}
              </Link>
            </p>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-3">
          <h4 className="font-mono text-xs font-extrabold uppercase tracking-wider text-stone-900">
            {t("quickLinks")}
          </h4>
          <ul className="space-y-1.5 font-mono text-xs font-bold text-[#1450A3]">
            <li>
              <Link
                href="/yhteystiedot"
                className="flex items-center gap-1 hover:underline"
              >
                <span>🔗 {t("linkContact")}</span>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </Link>
            </li>
            <li>
              <Link
                href="/hinnoittelu"
                className="flex items-center gap-1 hover:underline"
              >
                <span>🔗 {t("linkAddProducts")}</span>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </Link>
            </li>
            <li>
              <Link
                href="/addbusiness"
                className="flex items-center gap-1 hover:underline"
              >
                <span>🔗 {t("linkAddBusiness")}</span>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </Link>
            </li>
            <li>
              <a
                href="https://50eur.com"
                className="flex items-center gap-1 hover:underline"
              >
                <span>🔗 50eur.com</span>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </a>
            </li>
            <li>
              <a
                href="https://estbe.com"
                className="flex items-center gap-1 hover:underline"
              >
                <span>🔗 estbe.com</span>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
