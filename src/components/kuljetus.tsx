"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCountryFlag } from "@/lib/country";
import { KULJETUS_ROUTES, regionName } from "@/lib/kuljetus-constants";
import type { TransportCompany } from "@/lib/types";

const SERVICES = [
  "all",
  "FTL",
  "LTL",
  "Pikakuljetus",
  "Lämpösäädelty",
  "Nosturikuljetus",
  "Erikoiskuljetus",
] as const;

export function Kuljetus() {
  const t = useTranslations("kuljetus");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const [companies, setCompanies] = useState<TransportCompany[]>([]);
  const [routeTab, setRouteTab] = useState("ee");
  const [serviceFilter, setServiceFilter] =
    useState<(typeof SERVICES)[number]>("all");
  const [sortOrder, setSortOrder] = useState<"cheapest" | "expensive">(
    "cheapest"
  );
  const [isHoveringAdd, setIsHoveringAdd] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("transport_companies")
        .select("*")
        .order("featured", { ascending: false })
        .order("name");
      setCompanies((data as TransportCompany[]) ?? []);
    })();
  }, []);

  const serviceLabel = (service: string): string => {
    switch (service) {
      case "all":
        return t("serviceAll");
      case "FTL":
        return t("serviceFtl");
      case "LTL":
        return t("serviceLtl");
      case "Pikakuljetus":
        return t("serviceExpress");
      case "Lämpösäädelty":
        return t("serviceThermo");
      case "Nosturikuljetus":
        return t("serviceCrane");
      case "Erikoiskuljetus":
        return t("serviceSpecial");
      default:
        return service;
    }
  };

  const routeName = (code: string) =>
    `${regionName(code, locale)} ${getCountryFlag(code)}`;

  const activeRoute =
    KULJETUS_ROUTES.find((r) => r.code === routeTab) ?? KULJETUS_ROUTES[0];

  const filtered = companies.filter(
    (tc) =>
      serviceFilter === "all" ||
      tc.services.some((s) =>
        s.toLowerCase().includes(serviceFilter.toLowerCase())
      )
  );

  const withPrices = filtered.map((company, index) => {
    const multipliers = [1.0, 1.15, 0.95, 1.25, 1.05];
    const mult = multipliers[index % multipliers.length];
    const calculatedRouteFtl = Math.round(activeRoute.price * mult);

    let activePrice = calculatedRouteFtl;
    let priceLabel = t("priceFtl");

    const isLtl = serviceFilter === "LTL";
    const isExpress = serviceFilter === "Pikakuljetus";
    const isAskForPrice = ["Lämpösäädelty", "Nosturikuljetus", "Erikoiskuljetus"].includes(
      serviceFilter
    );

    if (isLtl) {
      activePrice = Math.round(calculatedRouteFtl * 0.45);
      priceLabel = t("priceLtl");
    } else if (isExpress) {
      activePrice = Math.round(calculatedRouteFtl * 1.45);
      priceLabel = t("priceExpress");
    } else if (isAskForPrice) {
      priceLabel = serviceLabel(serviceFilter);
    }

    return { company, activePrice, priceLabel, isAskForPrice, isExpress };
  });

  const sorted = [...withPrices].sort((a, b) => {
    if (a.isAskForPrice && !b.isAskForPrice) return 1;
    if (!a.isAskForPrice && b.isAskForPrice) return -1;
    if (a.isAskForPrice && b.isAskForPrice) return 0;
    return sortOrder === "cheapest"
      ? a.activePrice - b.activePrice
      : b.activePrice - a.activePrice;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-10">
      {/* Custom Language Selector inside /kuljetusyritykset */}
      <div className="flex select-none flex-col items-center justify-between gap-4 border-2 border-black bg-white p-4 sm:flex-row">
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
                  ? "scale-105 border-black bg-[#1450A3] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "border-gray-400 bg-stone-50 text-gray-800 hover:border-black hover:bg-slate-100"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero + advertisement + add-transport button */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="flex flex-col justify-center space-y-2 border-2 border-black bg-black p-8 text-white lg:col-span-3">
          <h1 className="font-mono text-3xl font-black uppercase">
            {t("heroTitle")}
          </h1>
          <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-yellow-400">
              {t("advertise")}
            </span>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-fit shrink-0 border border-white bg-yellow-400 px-4 py-1.5 font-mono text-xl font-black uppercase tracking-tight text-black">
                50 € / {t("perYear")}
              </div>
              <p className="max-w-xl text-sm font-semibold leading-snug text-zinc-100">
                {t("adText")}
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/addbusiness?type=transport"
          onMouseEnter={() => setIsHoveringAdd(true)}
          onMouseLeave={() => setIsHoveringAdd(false)}
          className="group flex flex-col items-center justify-center gap-3 border-2 border-black p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] lg:col-span-1"
          style={{
            backgroundImage: isHoveringAdd
              ? "repeating-linear-gradient(45deg, #BFDBFE, #BFDBFE 10px, #FFFFFF 10px, #FFFFFF 20px)"
              : "repeating-linear-gradient(45deg, #FEF08A, #FEF08A 10px, #FFFFFF 10px, #FFFFFF 20px)",
          }}
        >
          <div className="border-2 border-black bg-white px-3 py-1.5 font-mono text-sm font-black uppercase leading-tight text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {t("addTransport")}
          </div>
        </Link>
      </div>

      {/* Kuljetustyypit Selitettynä (FTL / LTL / Pikakuljetus) */}
      <div className="space-y-4 border-2 border-black bg-white p-6">
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
              className="flex flex-col justify-between space-y-2 border-2 border-black bg-slate-50 p-4"
            >
              <div>
                <strong
                  className={`block border-b border-black/10 pb-1 font-mono text-[13px] font-black uppercase ${c.titleCls}`}
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
      </div>

      {/* 1. Select origin country */}
      <div
        id="kuljetus-list-start"
        className="scroll-mt-24 space-y-4 border-2 border-black bg-white p-6"
      >
        <h2 className="pb-2 font-mono text-lg font-black uppercase">
          {t("step1")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {KULJETUS_ROUTES.map((c) => {
            const isSelected = routeTab === c.code;
            return (
              <button
                key={c.code}
                onClick={() => {
                  setRouteTab(c.code);
                  setTimeout(() => {
                    document
                      .getElementById("kuljetus-list-start")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }, 50);
                }}
                className={`flex cursor-pointer items-center gap-2 border-2 px-3 py-1.5 font-mono text-xs transition-colors ${
                  isSelected
                    ? "border-black bg-[#1450A3] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "border-black bg-white text-gray-700 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:bg-slate-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                }`}
              >
                <span className="font-bold">{routeName(c.code)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Select carrier */}
      <div className="scroll-mt-32 space-y-4">
        <h2 className="border-b-2 border-black pb-2 font-mono text-lg font-black uppercase">
          {t("step2")} ({routeName(activeRoute.code)} → {t("finland")})
        </h2>

        {/* Service type filters + sort order switch */}
        <div className="flex select-none flex-col justify-between gap-4 border-2 border-black bg-white p-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pl-1 font-mono text-xs font-extrabold uppercase text-gray-500">
              {t("selectedService")}
            </span>
            {SERVICES.map((service) => (
              <button
                key={service}
                onClick={() => setServiceFilter(service)}
                className={`cursor-pointer border px-4 py-2 text-xs font-bold uppercase transition-colors md:text-sm ${
                  serviceFilter === service
                    ? "border-black bg-black text-white"
                    : "border-transparent text-gray-700 hover:bg-slate-100"
                }`}
              >
                {serviceLabel(service)}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-black/15 pt-2 lg:border-l-2 lg:border-t-0 lg:pl-4 lg:pt-0">
            <span className="font-mono text-xs font-extrabold uppercase text-gray-500">
              {t("sortLabel")}
            </span>
            <button
              onClick={() => setSortOrder("cheapest")}
              className={`cursor-pointer border px-3.5 py-2 text-xs font-extrabold uppercase transition-colors md:text-sm ${
                sortOrder === "cheapest"
                  ? "border-black bg-emerald-800 font-black text-white"
                  : "border-transparent text-gray-700 hover:bg-slate-100"
              }`}
            >
              {t("cheapestFirst")}
            </button>
            <button
              onClick={() => setSortOrder("expensive")}
              className={`cursor-pointer border px-3.5 py-2 text-xs font-extrabold uppercase transition-colors md:text-sm ${
                sortOrder === "expensive"
                  ? "border-black bg-[#1450A3] font-black text-white"
                  : "border-transparent text-gray-700 hover:bg-slate-100"
              }`}
            >
              {t("expensiveFirst")}
            </button>
          </div>
        </div>

        {/* Grid of companies */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {sorted.length === 0 && (
            <p className="border-2 border-black bg-white p-10 text-center font-mono text-sm font-bold uppercase text-gray-500 md:col-span-2">
              ⚠️ {t("noCompanies")}
            </p>
          )}
          {sorted.map(({ company, activePrice, priceLabel, isAskForPrice, isExpress }) => (
            <div
              key={company.id}
              className="flex flex-col justify-between space-y-4 border-2 border-black bg-white p-6 transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-mono text-lg font-bold uppercase leading-tight text-stone-900">
                    {company.name}
                  </h3>
                  <span className="mt-1.5 inline-block border border-black/15 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#1450A3]">
                    {t("route")} {routeName(activeRoute.code)} → {t("finland")}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block font-mono text-[9px] font-black uppercase tracking-wider text-gray-400">
                    {priceLabel}
                  </span>
                  {isAskForPrice ? (
                    <span className="mt-1.5 inline-block select-none border-2 border-black bg-amber-100 px-2.5 py-1.5 font-mono text-[11px] font-extrabold uppercase text-amber-900 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                      {t("askPrice")}
                    </span>
                  ) : (
                    <span className="font-mono text-2xl font-black text-emerald-800">
                      {activePrice} €
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                {company.capacity && (
                  <div className="flex items-center gap-1.5 font-sans text-gray-600">
                    <span>{t("capacity")}</span>
                    <strong className="text-stone-800">{company.capacity}</strong>
                  </div>
                )}
                <div className="flex items-center gap-1.5 font-sans text-gray-600">
                  <span>{t("deliveryTime")}</span>
                  <strong className="text-stone-800">
                    {isExpress
                      ? t("expressDay")
                      : `${activeRoute.days} ${t("businessDays")}`}
                  </strong>
                </div>
                {company.email && (
                  <div className="flex items-center gap-1.5 font-sans text-gray-600">
                    <span>Email:</span>
                    <strong className="font-mono text-stone-800">
                      {company.email}
                    </strong>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-1.5 font-sans text-gray-600">
                    <span>Puh:</span>
                    <strong className="font-mono text-stone-800">
                      {company.phone}
                    </strong>
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

                <div className="mt-1 flex flex-wrap gap-1">
                  {company.services.map((srv, i) => {
                    const isMatch =
                      serviceFilter !== "all" &&
                      srv.toLowerCase().includes(serviceFilter.toLowerCase());
                    return (
                      <span
                        key={i}
                        className={`border px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-tight ${
                          isMatch
                            ? "border-black bg-[#1450A3] text-white"
                            : "border-gray-300 bg-slate-100 text-gray-700"
                        }`}
                      >
                        {srv}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 border-t border-gray-200 pt-4">
                <a
                  href={`mailto:${company.email ?? ""}`}
                  className="flex-1 cursor-pointer border-2 border-black bg-black px-4 py-2.5 text-center font-mono text-xs font-extrabold uppercase tracking-tight text-white transition-colors hover:bg-[#1450A3] md:text-sm"
                >
                  {t("sendEmail")}
                </a>
                <a
                  href={`tel:${company.phone ?? ""}`}
                  className="flex shrink-0 cursor-pointer items-center justify-center border-2 border-black bg-slate-50 px-4 py-2.5 font-mono text-xs font-extrabold uppercase transition-colors hover:bg-slate-100 md:text-sm"
                  title={t("call")}
                >
                  {t("call")}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Back to top button */}
        <div className="flex justify-center pb-4 pt-8">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 border-2 border-black bg-white px-6 py-2 font-mono text-xs font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:bg-slate-100"
          >
            ↑ {t("backToTop")}
          </button>
        </div>
      </div>
    </div>
  );
}
