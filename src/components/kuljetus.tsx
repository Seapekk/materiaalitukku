"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getCountryFlag } from "@/lib/country";
import { KULJETUS_ROUTES, regionName } from "@/lib/kuljetus-constants";
import { categoryName, formatRoute, type Category, type TransportCompany } from "@/lib/types";

const SHOWN = 6;

// One-line Finnish explanation per transport service type (slug), shown in the
// "explain every transportation type" block at the bottom of the page.
const TYPE_EXPLANATIONS: Record<string, string> = {
  ftl: "Koko kuorma-auto varataan yhdelle tilaajalle (n. 24 t / 33 lavapaikkaa).",
  ltl: "Osakuorma — kuormatila jaetaan muiden lähetysten kanssa, maksat vain lavapaikoista.",
  pikakuljetus: "Nopea suora toimitus ilman väliterminaaleja tai tyhjäkäyntejä.",
  yleisrahti: "Vakiomuotoinen paketti- ja kuorma-autorahti.",
  reefer: "Lämpösäädellyt autot elintarvikkeille, lääkkeille yms.",
  adr: "Vaarallisten aineiden kuljetus (kemikaalit, polttoaineet) erikoisvaatimuksin.",
  sailio: "Nestemäisen/irtotavaran säiliökuljetus (polttoaine, maito, kemikaalit).",
  bulk: "Irtotavara kuten hiekka, sora ja vilja.",
  kontti: "Merikonttien maantiekuljetus.",
  lavetti: "Matalalava rakennuskoneille ja raskaalle kalustolle.",
  erikoiskuljetus: "Ylisuuret/raskaat kuormat, jotka vaativat erikoisluvat.",
  hiab: "Kuorma-auto omalla nosturilla lastaukseen ja purkuun.",
  hinaus: "Rikkoutuneiden tai kolaroituneiden ajoneuvojen kuljetus.",
  peralauta: "Perälautanostimella varustetut autot.",
  autonkuljetus: "Ajoneuvojen kuljetus (esim. uusien autojen toimitus).",
  kallurauto: "Kippiauto irtotavaran (sora, maa) kuljetukseen ja purkuun.",
  trukki: "Nostotrukki lastaukseen ja purkuun työmaalla.",
};

// Legacy carrier "services" were stored as free text ("FTL", "Express", …); new
// registrations store transport-category slugs. Match tolerantly across both.
const norm = (s: string) => s.toLowerCase().replace(/[^a-zäöå0-9]+/g, "");

function companyOffers(company: TransportCompany, cat: Category): boolean {
  const targets = [
    cat.slug,
    norm((cat.name.en ?? "").split(/[ /(]/)[0]),
    norm((cat.name.fi ?? "").split(/[ /(]/)[0]),
  ].filter(Boolean);
  return company.services.some((s) => {
    const n = norm(s);
    return targets.some((t) => t.length > 1 && (n.includes(t) || t.includes(n)));
  });
}

// Deterministic (seeded) Fisher–Yates so SSR and first client render agree;
// a mount/filter effect then re-seeds to genuinely randomize.
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  const rnd = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Kuljetus({
  initialCompanies,
  transportCategories,
}: {
  initialCompanies: TransportCompany[];
  transportCategories: Category[];
}) {
  const t = useTranslations("kuljetus");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const companies = initialCompanies;
  const [country, setCountry] = useState("all");
  const [serviceSlug, setServiceSlug] = useState("all");
  const [nonce, setNonce] = useState(1);
  const [isHoveringAdd, setIsHoveringAdd] = useState(false);

  // Re-randomize on mount and whenever a filter changes.
  useEffect(() => {
    setNonce(Math.floor(Math.random() * 1_000_000_000) + 1);
  }, [country, serviceSlug]);

  const catBySlug = useMemo(
    () => new Map(transportCategories.map((c) => [c.slug, c])),
    [transportCategories]
  );
  const selectedCat = serviceSlug === "all" ? null : catBySlug.get(serviceSlug);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (country !== "all" && c.origin_country !== country) return false;
      if (selectedCat && !companyOffers(c, selectedCat)) return false;
      return true;
    });
  }, [companies, country, selectedCat]);

  const shown = useMemo(
    () => shuffle(filtered, nonce).slice(0, SHOWN),
    [filtered, nonce]
  );

  const routeFor = (code: string) =>
    KULJETUS_ROUTES.find((r) => r.code === code);

  // Price shown on a card for the currently-selected service (or FTL headline
  // when "all"): explicit per-type "from" price → legacy column → route estimate.
  const priceInfo = (company: TransportCompany) => {
    const slug = serviceSlug === "all" ? "ftl" : serviceSlug;
    const explicit = company.service_prices?.[slug];
    const legacy =
      slug === "ftl"
        ? company.ftl_price
        : slug === "ltl"
          ? company.ltl_price
          : slug === "pikakuljetus"
            ? company.express_price
            : null;

    let price: number | null =
      explicit != null ? explicit : legacy != null ? legacy : null;
    let isEstimate = false;
    const isFrom = explicit != null;

    if (price == null && ["ftl", "ltl", "pikakuljetus"].includes(slug)) {
      const route = routeFor(company.origin_country);
      if (route) {
        const base = route.price;
        price = Math.round(
          slug === "ltl" ? base * 0.45 : slug === "pikakuljetus" ? base * 1.45 : base
        );
        isEstimate = true;
      }
    }

    const label =
      serviceSlug === "all"
        ? t("priceFtl")
        : selectedCat
          ? categoryName(selectedCat, locale)
          : slug;

    return { price, isEstimate, isFrom, label, askPrice: price == null };
  };

  const serviceName = (raw: string) => {
    const cat = transportCategories.find((c) => companyOffers({ services: [raw] } as TransportCompany, c));
    return cat ? categoryName(cat, locale) : raw;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-10">
      {/* Language selector */}
      <div className="flex select-none flex-col items-center justify-between gap-4 border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌐</span>
          <p className="font-mono text-xs font-bold text-gray-700">{t("langBar")}</p>
        </div>
        <div className="flex gap-4">
          {[
            { code: "fi", label: "Suomi", flag: "🇫🇮" },
            { code: "sv", label: "Svenska", flag: "🇸🇪" },
            { code: "en", label: "English", flag: "🇬🇧" },
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => {
                localStorage.setItem("materiaalitukku_lang", l.code);
                router.replace(pathname, { locale: l.code });
              }}
              className={`flex cursor-pointer items-center gap-2 border-2 px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                locale === l.code
                  ? "scale-105 border-slate-200 bg-[#1450A3] text-white"
                  : "border-gray-400 bg-stone-50 text-gray-800 hover:border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. Hero + advertisement + add-transport button */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="flex flex-col justify-center space-y-2 border border-slate-200 bg-slate-50 p-8 text-slate-800 lg:col-span-3">
          <h1 className="font-mono text-3xl font-semibold uppercase">
            {t("heroTitle")}
          </h1>
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-amber-600">
              {t("advertise")}
            </span>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-fit shrink-0 border border-amber-400 bg-yellow-400 px-4 py-1.5 font-mono text-xl font-semibold uppercase tracking-tight text-black">
                50 € / {t("perYear")}
              </div>
              <p className="max-w-xl text-sm font-semibold leading-snug text-slate-600">
                {t("adText")}
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/addbusiness?type=transport"
          onMouseEnter={() => setIsHoveringAdd(true)}
          onMouseLeave={() => setIsHoveringAdd(false)}
          className="group flex flex-col items-center justify-center gap-3 border border-slate-200 p-6 text-center transition-all lg:col-span-1"
          style={{
            backgroundImage: isHoveringAdd
              ? "repeating-linear-gradient(45deg, #BFDBFE, #BFDBFE 10px, #FFFFFF 10px, #FFFFFF 20px)"
              : "repeating-linear-gradient(45deg, #FEF08A, #FEF08A 10px, #FFFFFF 10px, #FFFFFF 20px)",
          }}
        >
          <div className="border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm font-semibold uppercase leading-tight text-black">
            {t("addTransport")}
          </div>
        </Link>
      </div>

      {/* 2. Select origin country */}
      <div
        id="kuljetus-list-start"
        className="scroll-mt-24 space-y-4 border border-slate-200 bg-white p-6"
      >
        <h2 className="pb-2 font-mono text-lg font-semibold uppercase">
          {t("step1")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCountry("all")}
            className={`cursor-pointer border-2 px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
              country === "all"
                ? "border-slate-200 bg-[#1450A3] text-white"
                : "border-slate-200 bg-white text-gray-700 hover:bg-slate-100"
            }`}
          >
            🌍 {t("allCountries")}
          </button>
          {KULJETUS_ROUTES.map((c) => {
            const isSelected = country === c.code;
            return (
              <button
                key={c.code}
                onClick={() => {
                  setCountry(c.code);
                  setTimeout(() => {
                    document
                      .getElementById("kuljetus-list-start")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }, 50);
                }}
                className={`flex cursor-pointer items-center gap-2 border-2 px-3 py-1.5 font-mono text-xs transition-colors ${
                  isSelected
                    ? "border-slate-200 bg-[#1450A3] text-white"
                    : "border-slate-200 bg-white text-gray-700 hover:bg-slate-100"
                }`}
              >
                <span className="font-bold">
                  {regionName(c.code, locale)} {getCountryFlag(c.code)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Select carrier type (transport categories from admin) */}
      <div className="scroll-mt-32 space-y-4 border border-slate-200 bg-white p-6">
        <h2 className="pb-2 font-mono text-lg font-semibold uppercase">
          {t("step2")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setServiceSlug("all")}
            className={`cursor-pointer border px-4 py-2 text-xs font-bold uppercase transition-colors md:text-sm ${
              serviceSlug === "all"
                ? "border-slate-200 bg-brand text-white"
                : "border-transparent text-gray-700 hover:bg-slate-100"
            }`}
          >
            {t("serviceAll")}
          </button>
          {transportCategories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setServiceSlug(cat.slug)}
              className={`cursor-pointer border px-4 py-2 text-xs font-bold uppercase transition-colors md:text-sm ${
                serviceSlug === cat.slug
                  ? "border-slate-200 bg-brand text-white"
                  : "border-transparent text-gray-700 hover:bg-slate-100"
              }`}
            >
              {categoryName(cat, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Carrier grid (6 random) */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {shown.length === 0 && (
            <p className="border border-slate-200 bg-white p-10 text-center font-mono text-sm font-bold uppercase text-gray-500 md:col-span-2">
              ⚠️ {t("noCompanies")}
            </p>
          )}
          {shown.map((company) => {
            const { price, isEstimate, isFrom, label, askPrice } = priceInfo(company);
            return (
              <div
                key={company.id}
                className="flex flex-col justify-between space-y-4 border border-slate-200 bg-white p-6 transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-mono text-lg font-bold uppercase leading-tight text-stone-900">
                      {company.name}
                    </h3>
                    <span className="mt-1.5 inline-block border border-slate-200/15 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#1450A3]">
                      {getCountryFlag(company.origin_country)}{" "}
                      {formatRoute(company.origin_country, company.direction)}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                      {label}
                    </span>
                    {askPrice ? (
                      <span className="mt-1.5 inline-block select-none border border-slate-200 bg-amber-100 px-2.5 py-1.5 font-mono text-[11px] font-extrabold uppercase text-amber-900">
                        {t("askPrice")}
                      </span>
                    ) : (
                      <span className="font-mono text-2xl font-semibold text-emerald-800">
                        {isFrom && (
                          <span className="mr-1 text-[10px] font-bold uppercase text-gray-400">
                            {t("priceFrom")}
                          </span>
                        )}
                        {isEstimate && "~"}
                        {price} €
                      </span>
                    )}
                    {!askPrice && isEstimate && (
                      <span className="block font-mono text-[8px] uppercase text-gray-400">
                        {t("priceEstimate")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  {(() => {
                    const desc =
                      company.description_translations?.[locale] ?? company.description;
                    return desc ? (
                      <p className="font-sans text-xs leading-relaxed text-stone-600">
                        {desc}
                      </p>
                    ) : null;
                  })()}
                  {company.address && (
                    <div className="flex items-center gap-1.5 font-sans text-gray-600">
                      <span>Osoite:</span>
                      <strong className="text-stone-800">{company.address}</strong>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-1.5 font-sans text-gray-600">
                      <span>Email:</span>
                      <strong className="font-mono text-stone-800">{company.email}</strong>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-1.5 font-sans text-gray-600">
                      <span>Puh:</span>
                      <strong className="font-mono text-stone-800">{company.phone}</strong>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-1.5 font-sans text-gray-600">
                      <span>Website:</span>
                      <a
                        href={
                          company.website.startsWith("http")
                            ? company.website
                            : `https://${company.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-bold text-[#1450A3] hover:underline"
                      >
                        {company.website}
                      </a>
                    </div>
                  )}

                  {company.socials?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {company.socials.map((s, i) => (
                        <a
                          key={i}
                          href={s.url.startsWith("http") ? s.url : `https://${s.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-[#1450A3] hover:bg-slate-100"
                        >
                          {s.platform}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 flex flex-wrap gap-1">
                    {company.services.map((srv, i) => {
                      const isMatch =
                        !!selectedCat && companyOffers(company, selectedCat) &&
                        norm(serviceName(srv)) === norm(categoryName(selectedCat, locale));
                      return (
                        <span
                          key={i}
                          className={`border px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-tight ${
                            isMatch
                              ? "border-slate-200 bg-[#1450A3] text-white"
                              : "border-gray-300 bg-slate-100 text-gray-700"
                          }`}
                        >
                          {serviceName(srv)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-gray-200 pt-4">
                  <a
                    href={`mailto:${company.email ?? ""}`}
                    className="flex-1 cursor-pointer border border-slate-200 bg-brand px-4 py-2.5 text-center font-mono text-xs font-extrabold uppercase tracking-tight text-white transition-colors hover:bg-brand-mid md:text-sm"
                  >
                    {t("sendEmail")}
                  </a>
                  <a
                    href={`tel:${company.phone ?? ""}`}
                    className="flex shrink-0 cursor-pointer items-center justify-center border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xs font-extrabold uppercase transition-colors hover:bg-slate-100 md:text-sm"
                    title={t("call")}
                  >
                    {t("call")}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Transport-type explanations */}
      <div className="space-y-4 border border-slate-200 bg-white p-6">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1450A3]">
          {t("categoriesTitle")}
        </h3>
        <div className="grid grid-cols-1 gap-4 font-sans text-xs leading-relaxed text-stone-700 md:grid-cols-3">
          {(
            [
              { key: "ftl", titleCls: "text-stone-900" },
              { key: "ltl", titleCls: "text-orange-700" },
              { key: "express", titleCls: "text-purple-800" },
            ] as const
          ).map((c) => (
            <div
              key={c.key}
              className="flex flex-col justify-between space-y-2 border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <strong
                  className={`block border-b border-slate-200/10 pb-1 font-mono text-[13px] font-semibold uppercase ${c.titleCls}`}
                >
                  {t(`${c.key}Title`)}
                </strong>
                <p className="mt-2 text-stone-600">{t(`${c.key}Text`)}</p>
              </div>
              <span className="block pt-2 font-mono text-[10px] font-bold uppercase text-gray-400">
                {t(`${c.key}Optimal`)}
              </span>
            </div>
          ))}
        </div>

        {/* Every transport type explained */}
        {transportCategories.length > 0 && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            {transportCategories.map((cat) => (
              <div
                key={cat.slug}
                className="space-y-1 border border-slate-200 bg-slate-50 p-3"
              >
                <strong className="block font-mono text-[11px] font-semibold uppercase text-stone-900">
                  {categoryName(cat, locale)}
                </strong>
                <p className="font-sans text-[11px] leading-relaxed text-stone-600">
                  {TYPE_EXPLANATIONS[cat.slug] ?? ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back to top */}
      <div className="flex justify-center pb-4 pt-4">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 border border-slate-200 bg-white px-6 py-2 font-mono text-xs font-bold uppercase transition-all hover:-translate-y-1 hover:bg-slate-100"
        >
          ↑ {t("backToTop")}
        </button>
      </div>
    </div>
  );
}
