"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getCountryFlag, getVatRate } from "@/lib/country";
import { EU_COUNTRY_CODES, REG_UNITS } from "@/lib/eu-countries";
import { regionName } from "@/lib/kuljetus-constants";
import { registerProduct, type PortalState } from "@/app/[locale]/(portal)/actions";
import { categoryName, type Category } from "@/lib/types";

export function AddProducts() {
  const locale = useLocale();
  const [cats, setCats] = useState<Category[]>([]);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemCat, setItemCat] = useState("");
  const [itemUnit, setItemUnit] = useState("kpl");
  const [productCountry, setProductCountry] = useState("fi");
  const [productPrice, setProductPrice] = useState<number | "">("");
  const [transportCostBase, setTransportCostBase] = useState<number | "">("");
  const [tier1Qty, setTier1Qty] = useState<number | "">("");
  const [tier1Price, setTier1Price] = useState<number | "">("");
  const [tier1TransportCost, setTier1TransportCost] = useState<number | "">("");
  const [tier2Qty, setTier2Qty] = useState<number | "">("");
  const [tier2Price, setTier2Price] = useState<number | "">("");
  const [tier2TransportCost, setTier2TransportCost] = useState<number | "">("");
  const [notice, setNotice] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("categories")
        .select("*")
        .is("parent_slug", null)
        .order("sort_order");
      const list = (data as Category[]) ?? [];
      setCats(list);
      if (list.length > 0) setItemCat((cur) => cur || list[0].slug);
    })();
  }, []);

  const inputCls =
    "w-full h-10 border border-slate-200 px-3 text-xs bg-white focus:outline-none";
  const labelCls =
    "block text-[10px] font-mono font-bold uppercase text-gray-500";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-10">
      <div className="space-y-8 border border-slate-200 bg-white p-6 md:p-8">
        {/* 1. HEADER SECTION */}
        <div className="flex flex-col justify-center space-y-2 border border-slate-200 bg-slate-50 p-8 text-slate-800">
          <h1 className="font-mono text-3xl font-semibold uppercase">
            Mainosta tuotteitasi
          </h1>
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-amber-600">
              lisää tuotteita hintavertailuun
            </span>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <p className="max-w-xl text-sm font-semibold leading-snug text-slate-600">
                Materiaalitukku.com on Suomen johtava ammattimaisten
                B2B-ostajien hintavertailualusta. Emme ota välistä provisiota —
                saat kaikki kaupat ja asiakkuuden suoraan yrityksellesi ilman
                välikäsiä.
              </p>
            </div>
          </div>
        </div>

        {/* 3. DETAILS & REGISTRATION */}
        <div className="pt-2">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            <div className="space-y-2 border border-slate-200/10 bg-stone-50 p-5">
              <h3 className="font-mono text-sm font-semibold uppercase text-stone-900">
                Rekisteröi Tuote Alustalle
              </h3>
              <p className="font-sans text-xs leading-relaxed text-gray-600">
                Täytä tietosi alle ja paina &quot;Julkaise Tuote&quot;.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setNotice(null);
                if (!isEmailVerified) {
                  setNotice(
                    "⚠️ Sähköpostia ei ole vielä vahvistettu! Lähetä vahvistuslinkki ja klikkaa sitä."
                  );
                  return;
                }
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("companyName", companyName);
                  fd.set("email", email);
                  fd.set("country", productCountry);
                  fd.set("itemName", itemName);
                  fd.set("itemCat", itemCat);
                  fd.set("itemUnit", itemUnit);
                  fd.set("price", String(productPrice));
                  fd.set("freight", String(transportCostBase));
                  fd.set("tier1Qty", String(tier1Qty));
                  fd.set("tier1Price", String(tier1Price));
                  fd.set("tier1Freight", String(tier1TransportCost));
                  fd.set("tier2Qty", String(tier2Qty));
                  fd.set("tier2Price", String(tier2Price));
                  const res: PortalState = await registerProduct(fd);
                  if (res.error) {
                    setNotice("⚠️ Tarkista kentät ja yritä uudelleen.");
                  } else {
                    setRegSuccess(
                      "Tuote on nyt linkitetty ja tallennettu tietokantaan. Ylläpito vahvistaa julkaisun, minkä jälkeen näet sen live-listalla."
                    );
                  }
                });
              }}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
                {/* Company Name */}
                <div className="space-y-1">
                  <label className={labelCls}>Yrityksen nimi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Esim. FinnPlast Oy"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Email with Verification */}
                <div className="space-y-1">
                  <label className={labelCls}>Yhteys sähköposti *</label>
                  <input
                    type="email"
                    required
                    placeholder="Esim. myynti@klas1.fi"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIsEmailVerified(false);
                      setEmailCodeSent(false);
                    }}
                    className={inputCls}
                  />
                  <div className="pt-1.5 font-mono text-[10.5px]">
                    {isEmailVerified ? (
                      <span className="block font-bold text-emerald-700">
                        ✓ Sähköposti vahvistettu
                      </span>
                    ) : (
                      <div className="mt-1 space-y-2 border border-stone-200 bg-white p-2">
                        {!emailCodeSent ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!email) {
                                setNotice("Syötä sähköpostiosoite ensin!");
                                return;
                              }
                              setNotice(null);
                              setEmailCodeSent(true);
                            }}
                            className="w-full cursor-pointer border border-slate-200 bg-white py-1 text-center text-[9.5px] font-bold uppercase text-stone-900 hover:bg-stone-50"
                          >
                            📧 Lähetä sähköpostivahvistus-linkki
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsEmailVerified(true)}
                            className="w-full animate-pulse cursor-pointer border border-emerald-900 bg-emerald-700 py-2 text-[10px] font-bold uppercase text-white shadow-sm transition-colors hover:bg-emerald-800"
                          >
                            🔗 Klikkaa tästä vahvistaaksesi sähköpostisi livenä
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Name */}
                <div className="space-y-1">
                  <label className={labelCls}>Uuden Tuotteen nimi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Esim. Havuvaneri 21mm"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Category select */}
                <div className="space-y-1">
                  <label className={labelCls}>Kategoria *</label>
                  <select
                    value={itemCat}
                    onChange={(e) => setItemCat(e.target.value)}
                    className="h-10 w-full cursor-pointer border border-slate-200 bg-white px-2 font-mono text-xs font-bold focus:outline-none"
                  >
                    {cats.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {categoryName(c, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sales Unit */}
                <div className="space-y-1">
                  <label className={labelCls}>Myyntiyksikkö *</label>
                  <select
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="h-10 w-full cursor-pointer border border-slate-200 bg-white px-2 font-mono text-xs font-bold focus:outline-none"
                  >
                    {REG_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sales Country */}
                <div className="space-y-1">
                  <label className={labelCls}>Myyntimaa *</label>
                  <select
                    value={productCountry}
                    onChange={(e) => setProductCountry(e.target.value)}
                    className="h-10 w-full cursor-pointer border border-slate-200 bg-white px-2 font-mono text-xs font-bold focus:outline-none"
                  >
                    {EU_COUNTRY_CODES.map((c) => (
                      <option key={c} value={c}>
                        {getCountryFlag(c)} {regionName(c, locale).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Details */}
                <div className="space-y-4 border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <div className="border-b border-slate-200/10 pb-2 font-mono text-sm font-semibold uppercase text-[#1450A3]">
                    Hinnasto &amp; Rahti
                  </div>

                  {/* BASE PRICE */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className={labelCls}>
                        Perushinta (€ / yksikkö) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={productPrice}
                        onChange={(e) =>
                          setProductPrice(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className={`${inputCls} font-mono`}
                        placeholder="Esim. 20.00"
                      />
                      <div className="font-mono text-[10px] font-bold text-emerald-700">
                        + ALV {getVatRate(productCountry)}% ={" "}
                        {((Number(productPrice) || 0) *
                          (1 + getVatRate(productCountry) / 100)).toFixed(2)}{" "}
                        €
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] font-bold uppercase text-[#1450A3]">
                        Arvioitu Rahtikulu (€ / yksikkö)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={transportCostBase}
                        onChange={(e) =>
                          setTransportCostBase(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="h-10 w-full border-2 border-[#1450A3] bg-white px-3 font-mono text-xs focus:outline-none"
                        placeholder="Esim. 1.50"
                      />
                    </div>
                  </div>

                  {/* TIER 1 */}
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-200/20 pt-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className={labelCls}>Määrä (Taso 1)</label>
                      <input
                        type="number"
                        value={tier1Qty}
                        onChange={(e) =>
                          setTier1Qty(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className={`${inputCls} font-mono`}
                        placeholder="Esim. 100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] font-bold uppercase text-[#8B5CF6]">
                        Hinta (€ / yksikkö)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier1Price}
                        onChange={(e) =>
                          setTier1Price(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="h-10 w-full border-2 border-[#8B5CF6] bg-white px-3 font-mono text-xs focus:outline-none"
                        placeholder="Esim. 14.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] font-bold uppercase text-[#1450A3]">
                        Rahtikulu (€ / yksikkö)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier1TransportCost}
                        onChange={(e) =>
                          setTier1TransportCost(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="h-10 w-full border-2 border-[#1450A3] bg-white px-3 font-mono text-xs focus:outline-none"
                        placeholder="Esim. 1.00"
                      />
                    </div>
                  </div>

                  {/* TIER 2 */}
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-200/20 pt-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className={labelCls}>Määrä (Taso 2)</label>
                      <input
                        type="number"
                        value={tier2Qty}
                        onChange={(e) =>
                          setTier2Qty(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className={`${inputCls} font-mono`}
                        placeholder="Esim. 1000"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] font-bold uppercase text-[#8B5CF6]">
                        Hinta (€ / yksikkö)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier2Price}
                        onChange={(e) =>
                          setTier2Price(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="h-10 w-full border-2 border-[#8B5CF6] bg-white px-3 font-mono text-xs focus:outline-none"
                        placeholder="Esim. 12.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] font-bold uppercase text-[#1450A3]">
                        Rahtikulu (€ / yksikkö)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier2TransportCost}
                        onChange={(e) =>
                          setTier2TransportCost(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="h-10 w-full border-2 border-[#1450A3] bg-white px-3 font-mono text-xs focus:outline-none"
                        placeholder="Esim. 0.80"
                      />
                    </div>
                  </div>
                </div>

                {notice && (
                  <p className="border-2 border-red-300 bg-red-100 px-3 py-2 font-mono text-xs font-bold uppercase text-red-700 md:col-span-2">
                    {notice}
                  </p>
                )}

                <div className="pt-2 md:col-span-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full cursor-pointer border border-slate-200 bg-[#1450A3] py-3 font-mono text-sm font-semibold uppercase text-white transition-all hover:bg-brand-mid disabled:opacity-50"
                  >
                    Julkaise Tuote
                  </button>
                </div>
            </form>

            {regSuccess && (
              <div className="mt-4 flex items-start gap-3 border-2 border-emerald-500 bg-emerald-50 p-5 text-emerald-900">
                <div>
                  <p className="text-xs font-bold uppercase">
                    Tuotteen lisäys onnistui!
                  </p>
                  <p className="mt-1 text-xs text-emerald-800">{regSuccess}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
