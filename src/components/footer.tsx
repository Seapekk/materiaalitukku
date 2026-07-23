import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FooterConfig } from "@/lib/types";

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  const supabase = await createClient();
  const { data: cfgRaw } = await supabase
    .from("footer_config")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  const cfg = cfgRaw as FooterConfig | null;
  const extraLinks = cfg?.links.filter((l) => l.title.trim() && l.url.trim()) ?? [];

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white font-sans text-stone-600">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 md:grid-cols-2 md:px-10 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-6">
          <div className="flex items-center gap-2">
            <span className="border border-slate-200 bg-brand px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-white">
              {cfg?.company_name.trim() || "Materiaalitukku.com B2B"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-stone-500">
            {cfg?.description.trim() || t("description")}
          </p>
          <div className="font-mono text-[10px] text-gray-400">
            © {new Date().getFullYear()} MateriaaliTukku. {cfg?.copyright.trim() || t("rights")} ·{" "}
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
            {cfg?.email.trim() && <p>✉️ {cfg.email}</p>}
            {cfg?.phone.trim() && <p>☎️ {cfg.phone}</p>}
            {cfg?.address.trim() && <p>📍 {cfg.address}</p>}
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
                href="/addproducts"
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
            {extraLinks.map((link, i) => (
              <li key={i}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
                >
                  <span>🔗 {link.title}</span>
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
