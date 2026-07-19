"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Search,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getCountryFlag, getCountryName, getVatRate } from "@/lib/country";
import { calculateOfferLanded } from "@/lib/pricing";
import {
  DEST_SURCHARGE,
  ITEMS_PER_PAGE,
  TRANSPORT_BASE,
} from "@/lib/hinta-constants";
import {
  categoryName,
  type Category,
  type Offer,
  type Product,
  type Supplier,
} from "@/lib/types";

type CountryOption = {
  country: string;
  offer: Offer;
  supplier: Supplier | undefined;
};

type Comp = {
  fi: CountryOption | null;
  fiUnitPrice: number | null;
  bestEu: (CountryOption & { landedUnit: number; unitFreight: number }) | null;
  savings: number | null;
  savingsPct: number | null;
  countries: CountryOption[];
};

type ProductRow = Product & { comp: Comp; topCat: string | null };

// Per-unit freight exactly like the original: (FTL base + surcharge) / 1000.
function unitFreight(country: string, destination: string): number {
  if (country === "fi") return 0;
  const base = TRANSPORT_BASE[country] ?? 1200;
  const surcharge = DEST_SURCHARGE[destination] ?? 0;
  return (base + surcharge) / 1000;
}

function supplierWebsite(s: Supplier | undefined): string {
  if (!s) return "#";
  if (s.website) return s.website;
  const domain = s.email?.split("@")[1];
  return domain ? `https://www.${domain}` : "#";
}

export function Hinta() {
  const t = useTranslations("hinta");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters — same set as the original hinta view.
  const [globalSearch, setGlobalSearch] = useState("");
  const [sortBy, setSortBy] = useState("savings");
  const [destination, setDestination] = useState("Helsinki");
  const [cat, setCat] = useState("all");
  const [includeTransport, setIncludeTransport] = useState(true);
  const [savingsOnly, setSavingsOnly] = useState(false);
  const [tablePage, setTablePage] = useState(1);

  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null
  );
  const [modalIncludeTransport, setModalIncludeTransport] = useState(true);
  const [modalQuantity, setModalQuantity] = useState(1000);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [p, o, s, c] = await Promise.all([
        supabase.from("products").select("*").eq("status", "active").order("name"),
        supabase.from("offers").select("*").eq("status", "active"),
        supabase.from("suppliers").select("*"),
        supabase.from("categories").select("*").order("sort_order"),
      ]);
      setProducts((p.data as Product[]) ?? []);
      setOffers((o.data as Offer[]) ?? []);
      setSuppliers((s.data as Supplier[]) ?? []);
      setCategories((c.data as Category[]) ?? []);
      setIsLoading(false);
    })();
  }, []);

  const supplierById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers]
  );
  const catBySlug = useMemo(
    () => new Map(categories.map((c) => [c.slug, c])),
    [categories]
  );
  const topCats = useMemo(
    () => categories.filter((c) => !c.parent_slug),
    [categories]
  );

  const toTopCat = (slug: string | null): string | null => {
    if (!slug) return null;
    const c = catBySlug.get(slug);
    return c?.parent_slug ?? c?.slug ?? null;
  };

  // Evaluation details for each product on the list — ported 1:1.
  const processedProducts: ProductRow[] = useMemo(() => {
    const offersByProduct = new Map<string, Offer[]>();
    for (const o of offers) {
      (offersByProduct.get(o.product_id) ??
        offersByProduct.set(o.product_id, []).get(o.product_id))!.push(o);
    }

    return products.map((p) => {
      // Cheapest offer per supplier country.
      const byCountry = new Map<string, CountryOption>();
      for (const offer of offersByProduct.get(p.id) ?? []) {
        const supplier = supplierById.get(offer.supplier_id);
        const country = (supplier?.country ?? "fi").toLowerCase();
        const cur = byCountry.get(country);
        if (!cur || offer.unit_price < cur.offer.unit_price) {
          byCountry.set(country, { country, offer, supplier });
        }
      }

      const fi = byCountry.get("fi") ?? null;
      const fiUnitPrice = fi ? fi.offer.unit_price : null;

      let bestEu: Comp["bestEu"] = null;
      for (const [country, opt] of byCountry) {
        if (country === "fi") continue;
        const freight = includeTransport ? unitFreight(country, destination) : 0;
        const landedUnit = opt.offer.unit_price + freight;
        if (!bestEu || landedUnit < bestEu.landedUnit) {
          bestEu = { ...opt, landedUnit, unitFreight: freight };
        }
      }

      const savings =
        fiUnitPrice != null && bestEu ? fiUnitPrice - bestEu.landedUnit : null;
      const savingsPct =
        savings != null && fiUnitPrice ? Math.round((savings / fiUnitPrice) * 100) : null;

      const order = ["fi", "ee", "pl", "de", "se", "lv", "lt"];
      const countries = [...byCountry.values()].sort(
        (a, b) => order.indexOf(a.country) - order.indexOf(b.country)
      );

      return {
        ...p,
        topCat: toTopCat(p.category_slug),
        comp: { fi, fiUnitPrice, bestEu, savings, savingsPct, countries },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, offers, supplierById, includeTransport, destination, catBySlug]);

  // Apply search/filtering logic of hintavertailu — ported 1:1.
  const filteredProducts = processedProducts.filter((item) => {
    if (cat !== "all" && item.topCat !== cat) return false;
    if (
      globalSearch &&
      !item.name.toLowerCase().includes(globalSearch.toLowerCase())
    )
      return false;
    if (savingsOnly && (item.comp.savings ?? 0) <= 0) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const price = (x: ProductRow) =>
      x.comp.bestEu?.landedUnit ?? x.comp.fiUnitPrice ?? Number.MAX_VALUE;
    if (sortBy === "savings") return (b.comp.savingsPct ?? -999) - (a.comp.savingsPct ?? -999);
    if (sortBy === "price-asc") return price(a) - price(b);
    if (sortBy === "price-desc") return price(b) - price(a);
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE));
  const page = Math.min(tablePage, totalPages);
  const paginatedProducts = sortedProducts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const activeTags: { label: string; remove: () => void }[] = [];
  if (cat !== "all")
    activeTags.push({
      label: `${t("filterCategory")}: ${categoryName(catBySlug.get(cat), locale)}`,
      remove: () => setCat("all"),
    });
  if (globalSearch)
    activeTags.push({
      label: `${t("filterSearch")}: "${globalSearch}"`,
      remove: () => setGlobalSearch(""),
    });
  if (savingsOnly)
    activeTags.push({ label: t("filterSavingsOnly"), remove: () => setSavingsOnly(false) });
  if (includeTransport)
    activeTags.push({ label: t("filterFreight"), remove: () => setIncludeTransport(false) });

  const resetFilters = () => {
    setCat("all");
    setGlobalSearch("");
    setSavingsOnly(false);
    setIncludeTransport(true);
    setTablePage(1);
  };

  return (
    <div className="w-full space-y-6 bg-[#F3F4F6] p-[24px] px-4 selection:bg-[#1450A3] selection:text-white md:px-10 lg:p-[40px]">
      {/* STICKY CONTROL PANEL (FULL WIDTH) */}
      <div className="sticky top-[85px] z-20 space-y-3 bg-[#F3F4F6] pb-3 pt-1">
        {/* MASTER SEARCH & FILTER CARD */}
        <div className="space-y-4 border-2 border-black bg-white p-5 font-sans shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search, Sort, Location, Category */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                {globalSearch && (
                  <button
                    onClick={() => setGlobalSearch("")}
                    className="absolute right-3 top-3 z-10 cursor-pointer text-[10px] font-bold text-red-500 hover:underline"
                  >
                    {t("clear")}
                  </button>
                )}
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setTablePage(1);
                  }}
                  className="h-11 w-full border-2 border-black pl-10 pr-16 font-sans text-xs placeholder:text-gray-400 focus:outline-none md:text-sm"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-11 cursor-pointer border-2 border-black bg-slate-50 px-3 font-mono text-xs font-bold focus:outline-none"
              >
                <option value="savings">{t("sortSavings")}</option>
                <option value="price-asc">{t("sortPriceAsc")}</option>
                <option value="price-desc">{t("sortPriceDesc")}</option>
                <option value="name-asc">{t("sortName")}</option>
              </select>

              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-11 cursor-pointer border-2 border-black bg-white px-3 font-mono text-xs font-bold focus:outline-none"
              >
                {Object.keys(DEST_SURCHARGE).map((city) => (
                  <option key={city} value={city}>
                    {t("destOption", { city })}
                  </option>
                ))}
              </select>

              <select
                value={cat}
                onChange={(e) => {
                  setCat(e.target.value);
                  setTablePage(1);
                }}
                className="h-11 cursor-pointer border-2 border-black bg-white px-3 font-mono text-xs font-bold focus:outline-none"
              >
                <option value="all">{t("allCategories")}</option>
                {topCats.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {categoryName(c, locale)}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 2: Checkboxes */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="group flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeTransport}
                  onChange={(e) => setIncludeTransport(e.target.checked)}
                  className="h-5 w-5 cursor-pointer border-2 border-black accent-[#1450A3] focus:ring-0"
                />
                <span className="text-xs font-extrabold uppercase tracking-tight transition-colors group-hover:text-[#1450A3]">
                  {t("freightIncluded")}
                </span>
              </label>

              <label className="group flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={savingsOnly}
                  onChange={(e) => {
                    setSavingsOnly(e.target.checked);
                    setTablePage(1);
                  }}
                  className="h-5 w-5 cursor-pointer border-2 border-black accent-[#1450A3] focus:ring-0"
                />
                <span className="text-xs font-extrabold uppercase tracking-tight transition-colors group-hover:text-[#1450A3]">
                  {t("savingsOnly")}
                </span>
              </label>
            </div>
          </div>

          {/* Block 4: Easy-to-select Categories Bar */}
          <div className="border-t border-dashed border-gray-200 pt-3">
            {cat !== "all" && (
              <div className="mb-2 flex justify-end">
                <button
                  onClick={() => setCat("all")}
                  className="cursor-pointer text-[10px] font-bold text-[#1450A3] hover:underline"
                >
                  {t("clearQuickLinks")}
                </button>
              </div>
            )}
            <div className="flex w-full flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setCat("all");
                  setTablePage(1);
                }}
                className={`cursor-pointer border-2 px-3 py-1.5 text-xs font-extrabold uppercase tracking-tight transition-all ${
                  cat === "all"
                    ? "-translate-x-0.5 -translate-y-0.5 border-black bg-[#1450A3] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "border-stone-200 bg-[#FAF8F5] text-stone-800 hover:border-black hover:bg-stone-50"
                }`}
              >
                {t("allProducts")} ({processedProducts.length})
              </button>
              {topCats.map((c) => {
                const count = processedProducts.filter(
                  (p) => p.topCat === c.slug
                ).length;
                const isSelected = cat === c.slug;
                return (
                  <button
                    key={c.slug}
                    onClick={() => {
                      setCat(c.slug);
                      setTablePage(1);
                    }}
                    className={`cursor-pointer border-2 px-3 py-1.5 text-xs font-extrabold uppercase tracking-tight transition-all ${
                      isSelected
                        ? "-translate-x-0.5 -translate-y-0.5 border-black bg-[#1450A3] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "border-stone-200 bg-[#FAF8F5] text-stone-800 hover:border-black hover:bg-stone-50"
                    }`}
                  >
                    {categoryName(c, locale)} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ACTIVE FILTERS CHIP BAR */}
        {activeTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-2 border-black bg-yellow-50 p-3 text-xs font-semibold">
            <span className="py-1 font-mono text-[10px] font-bold uppercase text-gray-500">
              {t("activeFilters")}
            </span>
            {activeTags.map((tag, i) => (
              <div
                key={i}
                className="flex select-none items-center gap-1.5 border border-black bg-white px-2 py-1 font-sans"
              >
                <span>{tag.label}</span>
                <button
                  onClick={tag.remove}
                  className="cursor-pointer font-bold text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={resetFilters}
              className="ml-auto cursor-pointer text-[11px] font-bold text-[#1450A3] underline"
            >
              {t("resetAll")}
            </button>
          </div>
        )}
      </div>

      {/* MAIN TABLE */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {/* Table Header */}
        <div className="grid select-none grid-cols-12 border-b-2 border-black bg-black p-3 text-left font-mono text-xs font-bold uppercase tracking-wide text-white">
          <div className="col-span-4 p-2 lg:col-span-5">{t("colProduct")}</div>
          <div className="col-span-2 border-l border-gray-800 p-2 text-right lg:col-span-2">
            {t("colFi")}
          </div>
          <div className="col-span-3 border-l border-gray-800 p-2 text-right lg:col-span-3">
            {t("colBestEu")}
          </div>
          <div className="col-span-3 border-l border-gray-800 p-2 text-center lg:col-span-2">
            {t("colSavings")}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 bg-white p-16 text-center font-mono text-sm text-gray-500">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#1450A3]" />
            <p>{t("loading")}</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="select-none space-y-4 bg-white p-16 text-center font-mono">
            <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500" />
            <p className="font-bold uppercase text-stone-800">{t("noMatches")}</p>
            <p className="mx-auto max-w-md text-xs text-gray-400">
              {t("noMatchesHint")}
            </p>
            <button
              onClick={resetFilters}
              className="cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-extrabold uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              {t("resetFilters")}
            </button>
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {paginatedProducts.map((p, index) => {
              const { comp } = p;
              const savingsPct = comp.savingsPct;

              let badgeBg = "bg-slate-100 text-slate-500 border-slate-300";
              let badgeText = "—";
              if (savingsPct != null) {
                if (savingsPct > 5) {
                  badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  badgeText = t("savingsBadge", { pct: Math.round(savingsPct) });
                } else if (savingsPct >= 0) {
                  badgeBg = "bg-amber-100 text-amber-800 border-amber-300";
                  badgeText = t("almostSame", { pct: Math.round(savingsPct) });
                } else {
                  badgeBg = "bg-red-100 text-red-800 border-red-300";
                  badgeText = t("moreExpensive", { pct: Math.abs(Math.round(savingsPct)) });
                }
              }

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(p);
                    setModalQuantity(1000);
                    setModalIncludeTransport(includeTransport);
                  }}
                  className={`grid cursor-pointer select-none grid-cols-12 items-center border-l-4 p-3 transition-colors hover:border-[#1450A3] hover:bg-[#E8F0FE] ${
                    index % 2 === 0
                      ? "border-transparent bg-white"
                      : "border-transparent bg-slate-50"
                  }`}
                >
                  <div className="col-span-4 flex gap-4 p-2 lg:col-span-5">
                    {p.image_url && (
                      <div className="h-16 w-16 shrink-0 border-2 border-black bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="block text-sm font-bold uppercase tracking-tight text-gray-950">
                        {p.name}
                      </span>
                      {p.description && (
                        <p className="line-clamp-2 font-sans text-[10px] text-gray-600">
                          {p.description}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="border border-blue-400 bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-tight text-blue-800 shadow-sm">
                          {categoryName(catBySlug.get(p.topCat ?? ""), locale) || "—"}
                        </span>
                        <span className="font-mono text-xs font-bold text-gray-500">
                          {t("unit")}: <span className="text-gray-900">{p.unit}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FI Base Price */}
                  <div className="col-span-2 border-l border-gray-100 p-2 text-right font-mono text-stone-800 lg:col-span-2">
                    {comp.fiUnitPrice != null ? (
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {comp.fiUnitPrice.toFixed(2)} € ({t("vat0")})
                        </div>
                        <div className="mt-0.5 text-[11px] font-extrabold text-emerald-800">
                          {(comp.fiUnitPrice * (1 + getVatRate("fi") / 100)).toFixed(2)} € (
                          {t("vatIncl", { rate: getVatRate("fi") })})
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">—</span>
                    )}
                  </div>

                  {/* Best EU Landed Price (Dual View) */}
                  <div className="col-span-3 border-l border-gray-100 p-2 text-right lg:col-span-3">
                    {comp.bestEu ? (
                      <div className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5 font-mono">
                          <span className="select-none border border-black/10 bg-slate-100 px-1 py-0.5 text-xs font-bold uppercase">
                            {getCountryFlag(comp.bestEu.country)}{" "}
                            {comp.bestEu.country.toUpperCase()}
                          </span>
                          <span className="text-sm font-bold text-[#1450A3]">
                            {comp.bestEu.landedUnit.toFixed(2)} € ({t("vat0")})
                          </span>
                        </div>
                        <div className="mt-0.5 block font-mono text-[11px] font-extrabold text-emerald-800">
                          {(comp.bestEu.landedUnit * (1 + getVatRate(comp.bestEu.country) / 100)).toFixed(2)} € (
                          {t("vatIncl", { rate: getVatRate(comp.bestEu.country) })}){" "}
                          {includeTransport ? t("inclFreight") : t("exclFreight")}
                        </div>
                        <span className="mt-1 block border-t border-gray-100 pt-1 font-mono text-[10px] font-medium text-gray-500">
                          <span className="font-bold">
                            {comp.bestEu.country.toUpperCase()} {t("pickup")}:
                          </span>{" "}
                          {comp.bestEu.offer.unit_price.toFixed(2)} € ({t("vat0")})
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-bold text-gray-400">
                        {t("noOffers")}
                      </span>
                    )}
                  </div>

                  {/* Savings Indicator Column */}
                  <div className="col-span-3 flex flex-col items-center justify-center border-l border-gray-100 p-2 text-right lg:col-span-2">
                    <div
                      className={`w-full border-2 px-2.5 py-1 text-center font-mono text-[10.5px] font-bold uppercase tracking-tight ${badgeBg}`}
                    >
                      {badgeText}
                    </div>
                    <span className="mt-0.5 font-mono text-xs font-bold tracking-tight text-gray-500">
                      {comp.savings != null && comp.savings > 0
                        ? t("savingsAmount", {
                            amount: comp.savings.toFixed(2),
                            unit: p.unit,
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table Footer */}
        <div className="flex select-none flex-col items-center justify-between gap-4 border-t-2 border-black bg-slate-50 p-4 font-mono text-xs text-gray-500 md:flex-row">
          <div className="space-y-1">
            <div>
              {t("showing", {
                from: sortedProducts.length > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0,
                to: Math.min(sortedProducts.length, page * ITEMS_PER_PAGE),
                total: sortedProducts.length,
              })}
            </div>
            <div className="text-[10px] text-gray-400">
              {t("totalDb", { count: products.length })}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 font-sans">
              <button
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`cursor-pointer border-2 border-black px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-tight transition-all ${
                  page === 1
                    ? "cursor-not-allowed border-stone-300 bg-gray-200 text-stone-400 opacity-40"
                    : "bg-white text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 active:translate-x-[1px] active:translate-y-[1px]"
                }`}
              >
                {t("prev")}
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pagNum = idx + 1;
                const isCurrent = pagNum === page;
                return (
                  <button
                    key={pagNum}
                    onClick={() => setTablePage(pagNum)}
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center border-2 border-black text-xs font-extrabold transition-all ${
                      isCurrent
                        ? "bg-[#1450A3] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-white text-stone-900 hover:bg-stone-50"
                    }`}
                  >
                    {pagNum}
                  </button>
                );
              })}

              <button
                onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`cursor-pointer border-2 border-black px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-tight transition-all ${
                  page === totalPages
                    ? "cursor-not-allowed border-stone-300 bg-gray-200 text-stone-400 opacity-40"
                    : "bg-white text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 active:translate-x-[1px] active:translate-y-[1px]"
                }`}
              >
                {t("next")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex cursor-default items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="flex w-full max-w-6xl cursor-default flex-col overflow-hidden border-4 border-black bg-white text-stone-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="flex flex-col justify-between gap-4 border-b-4 border-black bg-slate-50 p-6 md:flex-row md:items-center md:px-8">
              <div>
                <div
                  className="mb-3 inline-flex items-center gap-4 border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, #FFEDD5, #FFEDD5 10px, #FEE2E2 10px, #FEE2E2 20px)",
                  }}
                >
                  <span className="border-2 border-black bg-blue-100 px-3 py-1 font-mono text-sm font-black uppercase text-[#1450A3]">
                    {categoryName(
                      catBySlug.get(selectedProduct.topCat ?? ""),
                      locale
                    ) || "—"}
                  </span>
                  <span className="border-2 border-black bg-white px-3 py-1 font-mono text-sm font-black uppercase text-black">
                    {t("unit")}: {selectedProduct.unit}
                  </span>
                </div>
                <h2 className="font-mono text-xl font-black uppercase leading-tight tracking-tight text-black md:text-3xl">
                  {selectedProduct.name}
                </h2>
                {(selectedProduct.image_url || selectedProduct.description) && (
                  <div className="mt-4 flex gap-4">
                    {selectedProduct.image_url && (
                      <div className="h-24 w-24 shrink-0 border-2 border-black bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedProduct.image_url}
                          alt={selectedProduct.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    {selectedProduct.description && (
                      <p className="max-w-xl font-sans text-sm text-gray-700">
                        {selectedProduct.description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-shrink-0 flex-col items-end gap-3">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="cursor-pointer border-2 border-black bg-white px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#0D1117] transition-colors hover:bg-black hover:text-white"
                >
                  {t("closeView")}
                </button>
                <div
                  className="flex items-center gap-4 border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, #FFEDD5, #FFEDD5 10px, #FEE2E2 10px, #FEE2E2 20px)",
                  }}
                >
                  <div className="flex h-[36px] items-center border-2 border-black bg-white">
                    <span className="flex h-full items-center border-r-2 border-black bg-slate-100 px-3 font-mono text-[11px] font-bold uppercase text-gray-500">
                      {t("quantity")}
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={modalQuantity}
                      onChange={(e) =>
                        setModalQuantity(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="h-full w-24 px-3 font-mono text-sm font-black focus:outline-none"
                    />
                  </div>
                  <label className="group flex h-[36px] cursor-pointer select-none items-center gap-2 border-2 border-black bg-white px-3 transition-colors hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={modalIncludeTransport}
                      onChange={(e) => setModalIncludeTransport(e.target.checked)}
                      className="h-4 w-4 cursor-pointer border-2 border-black accent-[#1450A3] focus:ring-0"
                    />
                    <span className="text-[11px] font-bold uppercase text-stone-800 group-hover:text-[#1450A3]">
                      {t("inclFreightEstimate", { dest: destination })}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* TABLE CONTENT */}
            <div className="overflow-x-auto bg-white">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead className="bg-[#1450A3] text-white">
                  <tr>
                    <th className="w-[35%] border-b-4 border-r-2 border-black p-4 font-mono text-[11px] font-bold uppercase tracking-wider">
                      {t("colSupplierCountry")}
                    </th>
                    <th className="w-[25%] border-b-4 border-r-2 border-black p-4 font-mono text-[11px] font-bold uppercase tracking-wider">
                      {t("colPricePerUnit")}
                    </th>
                    <th className="w-[20%] border-b-4 border-r-2 border-black p-4 font-mono text-[11px] font-bold uppercase tracking-wider">
                      {t("colSaving")}
                    </th>
                    <th className="w-[20%] border-b-4 border-black p-4 text-center font-mono text-[11px] font-bold uppercase tracking-wider">
                      {t("colAction")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const itemOffers = offers.filter(
                      (o) => o.product_id === selectedProduct.id
                    );
                    const rowsData = itemOffers.map((offer) => {
                      const supplier = supplierById.get(offer.supplier_id);
                      const country = (supplier?.country ?? "ee").toLowerCase();
                      const calc = calculateOfferLanded(offer, modalQuantity);
                      const landedPerUnit = modalIncludeTransport
                        ? calc.landedPerUnit
                        : calc.unitPrice;
                      const isWholesale = offer.min_wholesale_qty
                        ? modalQuantity >= offer.min_wholesale_qty
                        : false;
                      return {
                        offer,
                        supplier,
                        country,
                        label: supplier
                          ? `${supplier.name} (${country.toUpperCase()})`
                          : `(${country.toUpperCase()})`,
                        landedPerUnit,
                        unitFreight: calc.freight / modalQuantity,
                        isBenchmark: country === "fi",
                        tier: isWholesale ? "wholesale" : "single",
                      };
                    });

                    rowsData.sort((a, b) => a.landedPerUnit - b.landedPerUnit);
                    const fiLandedPerUnit =
                      rowsData.find((r) => r.country === "fi")?.landedPerUnit ??
                      null;
                    const positive = rowsData.filter((r) => r.landedPerUnit > 0);
                    const minPrice = positive.length
                      ? Math.min(...positive.map((r) => r.landedPerUnit))
                      : 0;

                    return rowsData.map((row, idx) => {
                      const diff =
                        !row.isBenchmark && fiLandedPerUnit != null
                          ? fiLandedPerUnit - row.landedPerUnit
                          : null;
                      const diffPct =
                        diff != null && fiLandedPerUnit
                          ? Math.round((diff / fiLandedPerUnit) * 100)
                          : 0;

                      let diffString: string;
                      let diffColorClass: string;
                      if (row.isBenchmark) {
                        diffString = t("domesticRef");
                        diffColorClass =
                          "text-slate-500 font-bold bg-slate-200 px-2 py-0.5 inline-block border border-slate-300";
                      } else if (diff == null) {
                        diffString = "—";
                        diffColorClass = "text-gray-500";
                      } else if (diff > 0) {
                        diffString = `${diff.toFixed(2)} € (${diffPct}%)`;
                        diffColorClass =
                          "text-green-700 font-bold bg-green-100 px-2 py-0.5 inline-block border border-green-300";
                      } else if (diff < 0) {
                        diffString = `+${Math.abs(diff).toFixed(2)} € (${Math.abs(diffPct)}%)`;
                        diffColorClass =
                          "text-red-700 font-bold bg-red-100 px-2 py-0.5 inline-block border border-red-300";
                      } else {
                        diffString = t("samePrice");
                        diffColorClass = "text-gray-500";
                      }

                      const isCheapest =
                        row.landedPerUnit === minPrice && row.landedPerUnit > 0;
                      const bgClass = isCheapest
                        ? "bg-yellow-100"
                        : idx % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50";
                      const vatRate = getVatRate(row.country);

                      return (
                        <tr
                          key={`${row.country}-${idx}`}
                          className={`${bgClass} border-b-2 border-black transition-colors hover:bg-[#E8F0FE]`}
                        >
                          <td className="border-r-2 border-black p-4 align-middle">
                            <span className="mb-1 flex flex-wrap items-center gap-2 font-mono text-xs font-extrabold uppercase text-black">
                              {getCountryFlag(row.country)} {row.label}
                              {isCheapest && (
                                <span className="border border-yellow-500 bg-yellow-300 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-yellow-900">
                                  {t("cheapest")}
                                </span>
                              )}
                              {row.tier === "wholesale" && (
                                <span className="bg-[#8B5CF6] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white shadow-sm">
                                  {t("wholesale")}
                                </span>
                              )}
                            </span>
                            {row.supplier && (
                              <div className="mt-1 flex flex-col gap-0.5">
                                <span className="font-sans text-sm text-stone-700">
                                  {t("supplierLabel")}:{" "}
                                  <strong className="text-[#1450A3]">
                                    {row.supplier.name}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="border-r-2 border-black p-4 align-middle">
                            <div className="flex flex-col">
                              <span
                                className={`block font-mono text-lg font-black ${
                                  isCheapest ? "text-yellow-900" : "text-stone-900"
                                }`}
                              >
                                {row.landedPerUnit.toFixed(2)} € ({t("vat0")})
                              </span>
                              <span className="mt-0.5 block font-mono text-[12.5px] font-extrabold text-emerald-800">
                                {(row.landedPerUnit * (1 + vatRate / 100)).toFixed(2)} € (
                                {t("vatIncl", { rate: vatRate })})
                              </span>
                              <span className="mt-1 block font-mono text-[10px] font-bold uppercase text-gray-500">
                                / {selectedProduct.unit}{" "}
                                {!row.isBenchmark && modalIncludeTransport
                                  ? `(${t("inclFreight")})`
                                  : t("factoryNet")}
                              </span>
                              {!row.isBenchmark && modalIncludeTransport && (
                                <span className="mt-1 block w-max border-t border-gray-200 pt-1 font-sans text-[9.5px] text-gray-500">
                                  {t("freightEstimate", {
                                    amount: row.unitFreight.toFixed(2),
                                    unit: selectedProduct.unit,
                                  })}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="border-r-2 border-black p-4 align-middle">
                            <span className={`font-mono text-[11px] ${diffColorClass}`}>
                              {diffString}
                            </span>
                          </td>
                          <td className="p-4 text-center align-middle">
                            {row.supplier ? (
                              <a
                                href={supplierWebsite(row.supplier)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-black bg-[#1450A3] px-3 py-2.5 font-mono text-[10px] font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-black hover:shadow-none"
                              >
                                <span>{t("goSite")}</span>
                                <ExternalLink className="h-3 w-3 shrink-0 text-white" />
                              </a>
                            ) : (
                              <span className="font-mono text-[10px] font-bold uppercase text-gray-400">
                                {t("notAvailable")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
