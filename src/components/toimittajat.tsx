"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getCountryFlag, getCountryName } from "@/lib/country";
import {
  categoryName,
  type Category,
  type Offer,
  type Product,
  type Supplier,
} from "@/lib/types";

const OTHER = "__other__";

export function Toimittajat({
  initialSuppliers,
  initialOffers,
  initialProducts,
  initialCategories,
}: {
  initialSuppliers: Supplier[];
  initialOffers: Offer[];
  initialProducts: Product[];
  initialCategories: Category[];
}) {
  const t = useTranslations("toimittajat");
  const tk = useTranslations("kuljetus");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const [suppliers] = useState<Supplier[]>(initialSuppliers);
  const [offers] = useState<Offer[]>(initialOffers);
  const [products] = useState<Product[]>(initialProducts);
  const [categories] = useState<Category[]>(initialCategories);

  const [catFilter, setCatFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isHoveringAdd, setIsHoveringAdd] = useState(false);

  const catBySlug = useMemo(
    () => new Map(categories.map((c) => [c.slug, c])),
    [categories]
  );
  const topCats = useMemo(
    () => categories.filter((c) => !c.parent_slug),
    [categories]
  );

  // Supplier → offered product names + top-level categories, derived
  // from their active offers (the original stored these on the supplier).
  const supplierInfo = useMemo(() => {
    const productById = new Map(products.map((p) => [p.id, p]));
    const info = new Map<string, { categories: Set<string>; names: string[] }>();
    for (const offer of offers) {
      const product = productById.get(offer.product_id);
      if (!product) continue;
      const entry =
        info.get(offer.supplier_id) ??
        info.set(offer.supplier_id, { categories: new Set(), names: [] }).get(offer.supplier_id)!;
      const cat = product.category_slug ? catBySlug.get(product.category_slug) : null;
      entry.categories.add(cat ? (cat.parent_slug ?? cat.slug) : OTHER);
      if (!entry.names.includes(product.name)) entry.names.push(product.name);
    }
    return info;
  }, [offers, products, catBySlug]);

  const supplierCountries = useMemo(
    () => [...new Set(suppliers.map((s) => s.country))],
    [suppliers]
  );

  const matchesFilters = (s: Supplier, catKey: string): boolean => {
    const info = supplierInfo.get(s.id);
    const cats = info?.categories ?? new Set([OTHER]);
    if (!cats.has(catKey)) return false;
    if (countryFilter !== "all" && s.country !== countryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchDesc = (info?.names.join(", ") ?? "")
        .toLowerCase()
        .includes(q) || (s.description ?? "").toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  };

  const groups: { key: string; label: string }[] = [
    ...topCats.map((c) => ({ key: c.slug, label: categoryName(c, locale) })),
    { key: OTHER, label: "—" },
  ];

  const visibleGroups = groups
    .filter((g) => catFilter === "all" || catFilter === g.key)
    .map((g) => ({
      ...g,
      suppliers: suppliers.filter((s) => matchesFilters(s, g.key)),
    }))
    .filter((g) => g.suppliers.length > 0);

  const scrollToList = () =>
    setTimeout(() => {
      document
        .getElementById("toimittajat-list-start")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-10">
      {/* Custom Language Selector inside /toimittajat */}
      <div className="flex select-none flex-col items-center justify-between gap-4 border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌐</span>
          <p className="font-mono text-xs font-bold text-gray-700">{tk("langBar")}</p>
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

      {/* Hero + advertisement + add-business button */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="flex flex-col justify-center space-y-2 border border-slate-200 bg-slate-50 p-8 text-slate-800 lg:col-span-3">
          <h1 className="font-mono text-3xl font-semibold uppercase">
            {t("heroTitle")}
          </h1>
          <p className="max-w-xl text-sm font-semibold leading-snug text-slate-600">
            {t("heroText")}
          </p>
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-amber-600">
              {tk("advertise")}
            </span>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-fit shrink-0 border border-amber-400 bg-yellow-400 px-4 py-1.5 font-mono text-xl font-semibold uppercase tracking-tight text-black">
                50 € / {tk("perYear")}
              </div>
              <p className="max-w-xl text-sm font-semibold leading-snug text-slate-600">
                {t("adText")}
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/addbusiness?type=supplier"
          onMouseEnter={() => setIsHoveringAdd(true)}
          onMouseLeave={() => setIsHoveringAdd(false)}
          className="group flex flex-col items-center justify-center gap-3 border border-slate-200 p-6 text-center transition-all lg:col-span-1"
          style={{
            backgroundImage: isHoveringAdd
              ? "repeating-linear-gradient(45deg, #BFDBFE, #BFDBFE 10px, #FFFFFF 10px, #FFFFFF 20px)"
              : "repeating-linear-gradient(45deg, #FEE2E2, #FEE2E2 10px, #FFFFFF 10px, #FFFFFF 20px)",
          }}
        >
          <div className="border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm font-semibold uppercase leading-tight text-black">
            {t("addBusiness")}
          </div>
        </Link>
      </div>

      {/* Country & Category Filters Toolbar */}
      <div
        id="toimittajat-list-start"
        className="grid scroll-mt-24 grid-cols-1 gap-4 border border-slate-200 bg-white p-4 font-mono text-xs md:grid-cols-3"
      >
        <div className="space-y-1">
          <label className="block font-bold uppercase text-gray-500">
            {t("filterCategory")}
          </label>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="h-10 w-full cursor-pointer border border-slate-200 bg-white px-2 font-bold focus:outline-none"
          >
            <option value="all">{t("allCategories")}</option>
            {topCats.map((c) => (
              <option key={c.slug} value={c.slug}>
                {categoryName(c, locale).toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-bold uppercase text-gray-500">
            {t("filterCountry")}
          </label>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-10 w-full cursor-pointer border border-slate-200 bg-white px-2 font-bold focus:outline-none"
          >
            <option value="all">{t("allCountries")}</option>
            {supplierCountries.map((c) => (
              <option key={c} value={c}>
                {getCountryName(c, locale).toUpperCase()} {getCountryFlag(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block font-bold uppercase text-gray-500">
            {t("searchLabel")}
          </label>
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full border border-slate-200 bg-white px-3 font-sans focus:outline-none"
          />
        </div>
      </div>

      {/* Country Quick-Select Flag Badges under the Filter Toolbar */}
      <div className="-mt-6 flex flex-wrap items-center gap-2 border-x-2 border-b border-slate-200 bg-neutral-50 p-4 font-mono text-xs">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-tight text-gray-500">
          {t("quickByCountry")}
        </span>
        <button
          type="button"
          onClick={() => {
            setCountryFilter("all");
            scrollToList();
          }}
          className={`flex h-8 cursor-pointer items-center gap-1.5 border border-slate-200 px-3 text-xs font-bold uppercase transition-all hover:bg-slate-100 ${
            countryFilter === "all"
              ? "bg-brand text-white"
              : "bg-white text-black"
          }`}
        >
          🇪🇺 {t("all")}
        </button>
        {supplierCountries.map((c) => {
          const isActive = countryFilter === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCountryFilter(isActive ? "all" : c);
                scrollToList();
              }}
              className={`flex h-8 cursor-pointer items-center gap-1.5 border border-slate-200 px-3 text-xs font-bold uppercase transition-all hover:bg-slate-100 ${
                isActive
                  ? "bg-brand text-white"
                  : "bg-white text-black"
              }`}
            >
              <span className="shrink-0 text-sm">{getCountryFlag(c)}</span>
              <span>{getCountryName(c, locale).toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      {/* Supplier Listing Cards grouped by categories */}
      {visibleGroups.length === 0 && (
        <p className="border border-slate-200 bg-white p-16 text-center font-mono text-sm font-bold uppercase text-gray-500">
          ⚠️ {t("noResults")}
        </p>
      )}
      {visibleGroups.map((group) => (
        <div key={group.key} className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 pt-3">
            <h2 className="border border-[#1450A3]/25 bg-blue-50 px-2 py-0.5 font-mono text-xs font-extrabold uppercase tracking-wider text-[#1450A3]">
              {group.label}
            </h2>
            <span className="font-mono text-[10px] font-bold text-gray-400">
              ({t("factories", { count: group.suppliers.length })})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {group.suppliers.map((s) => {
              const info = supplierInfo.get(s.id);
              return (
                <div
                  key={s.id}
                  className="flex flex-col justify-between border border-slate-200 bg-white p-5 transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold uppercase tracking-tight text-stone-900">
                          {s.name}
                        </h3>
                        <span className="border border-slate-200/10 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                          {getCountryFlag(s.country)} {getCountryName(s.country, locale)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {info && info.names.length > 0 && (
                        <p className="text-gray-600">
                          <strong className="font-semibold text-stone-800">
                            {t("mainProducts")}
                          </strong>{" "}
                          {info.names.slice(0, 6).join(", ")}
                        </p>
                      )}
                      {s.lead_time && (
                        <p className="text-gray-600">
                          <strong className="font-semibold text-stone-800">
                            {t("leadTime")}
                          </strong>{" "}
                          {s.lead_time}
                        </p>
                      )}

                      {s.description && (
                        <div className="mt-2.5 border border-slate-200/5 border-t-dashed bg-neutral-50 p-2 pt-2 text-[11.5px] italic leading-relaxed text-stone-600">
                          <p>&quot;{s.description}&quot;</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        className="flex-1 border border-slate-200 bg-brand px-4 py-2.5 text-center font-mono text-xs font-extrabold uppercase text-white transition-colors hover:bg-brand-mid md:text-sm"
                      >
                        {t("askDirectPrice")}
                      </a>
                    )}
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        className="flex shrink-0 items-center justify-center border border-slate-200 px-4 py-2.5 font-mono text-xs font-extrabold uppercase transition-colors hover:bg-slate-50 md:text-sm"
                      >
                        {s.phone}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
