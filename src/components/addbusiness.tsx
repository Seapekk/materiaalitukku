"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { getCountryFlag } from "@/lib/country";
import { EU_COUNTRY_CODES, PHONE_PREFIXES } from "@/lib/eu-countries";
import { regionName } from "@/lib/kuljetus-constants";
import { registerPartner, type PortalState } from "@/app/[locale]/(portal)/actions";
import { categoryName, type Category } from "@/lib/types";

type Social = { platform: string; url: string };

const SOCIAL_PLACEHOLDERS: Record<string, string> = {
  facebook: "facebook.com/kayttaja",
  insta: "@kayttaja",
  x: "x.com/kayttaja",
  threads: "threads.net/@kayttaja",
  linkedin: "linkedin.com/company/yritys",
};

export function AddBusiness({
  initialType = "supplier",
}: {
  initialType?: "supplier" | "transport";
}) {
  const locale = useLocale();
  const [cats, setCats] = useState<Category[]>([]);

  const [regType, setRegType] = useState<"supplier" | "transport">(initialType);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("+358");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [socials, setSocials] = useState<Social[]>([]);
  // Supplier fields
  const [country, setCountry] = useState("ee");
  const [productsDesc, setProductsDesc] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  // Transport fields
  const [routeCountry, setRouteCountry] = useState("EE");
  const [routeDirection, setRouteDirection] = useState<
    "inbound" | "outbound" | "roundtrip"
  >("inbound");
  const [servicesFTL, setServicesFTL] = useState(false);
  const [servicesLTL, setServicesLTL] = useState(false);
  const [servicesExpress, setServicesExpress] = useState(false);
  const [servicesThermo, setServicesThermo] = useState(false);
  const [servicesCrane, setServicesCrane] = useState(false);
  const [servicesSpecial, setServicesSpecial] = useState(false);
  const [ftlPrice, setFtlPrice] = useState<number | "">("");
  const [ltlPrice, setLtlPrice] = useState<number | "">("");
  const [expressPrice, setExpressPrice] = useState<number | "">("");
  const [capacity, setCapacity] = useState("");
  const [days, setDays] = useState("");

  const [businessDesc, setBusinessDesc] = useState("");
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
      setCats((data as Category[]) ?? []);
    })();
  }, []);

  const pickType = (type: "supplier" | "transport") => {
    setRegType(type);
    setRegSuccess(null);
    setNotice(null);
  };

  const inputCls =
    "w-full h-10 border border-slate-200 px-3 text-xs bg-white focus:outline-none";
  const labelCls =
    "block text-[10px] font-mono font-bold uppercase text-gray-500";

  const stripe = (active: boolean) =>
    active
      ? "repeating-linear-gradient(45deg, #BFDBFE, #BFDBFE 10px, #FFFFFF 10px, #FFFFFF 20px)"
      : "repeating-linear-gradient(45deg, #FEE2E2, #FEE2E2 10px, #FFFFFF 10px, #FFFFFF 20px)";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-10">
      <div className="space-y-8 border border-slate-200 bg-white p-6 md:p-8">
        {/* 1. HEADER SECTION */}
        <div className="flex flex-col justify-center space-y-2 border border-slate-200 bg-slate-50 p-8 text-slate-800">
          <h1 className="font-mono text-3xl font-semibold uppercase">
            Mainosta yritystäsi
          </h1>
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-amber-600">
              mainosta palvelujasi
            </span>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="w-fit shrink-0 border border-amber-400 bg-yellow-400 px-4 py-1.5 font-mono text-xl font-semibold uppercase tracking-tight text-black">
                50 € / vuosi
              </div>
              <p className="max-w-xl text-sm font-semibold leading-snug text-slate-600">
                Tämä on tarkoitettu yrityksille, jotka haluavat mainostaa
                palveluitaan Suomen markkinoille!
              </p>
            </div>
          </div>
        </div>

        {/* Sub-selector buttons for registration types */}
        <div className="grid select-none grid-cols-1 gap-4 border border-slate-200 bg-stone-50 p-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => pickType("supplier")}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-slate-200 py-3.5 font-mono text-xs font-semibold uppercase text-black transition-all ${
              regType === "supplier"
                ? ""
                : ""
            }`}
            style={{ backgroundImage: stripe(regType === "supplier") }}
          >
            <span className="border border-slate-200 bg-white px-2 py-0.5 text-sm">
              TOIMITTAJA / TEHDAS
            </span>
            <span className="bg-white px-1 font-sans text-[10px] font-semibold text-black">
              Toimittajahakemisto
            </span>
          </button>

          <button
            type="button"
            onClick={() => pickType("transport")}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-slate-200 py-3.5 font-mono text-xs font-semibold uppercase text-black transition-all ${
              regType === "transport"
                ? ""
                : ""
            }`}
            style={{ backgroundImage: stripe(regType === "transport") }}
          >
            <span className="border border-slate-200 bg-white px-2 py-0.5 text-sm">
              KULJETUSYRITYS / RAHTI
            </span>
            <span className="bg-white px-1 font-sans text-[10px] font-semibold text-black">
              Kiinteät rahtireitit
            </span>
          </button>
        </div>

        {/* 3. REGISTRATION FORM */}
        <div className="pt-2">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            <div
              className={
                regType === "transport"
                  ? "space-y-2 rounded-lg border border-slate-200 bg-yellow-50/50 p-5"
                  : "space-y-2 rounded-lg border border-slate-200 bg-red-50/50 p-5"
              }
            >
              <h3 className="font-mono text-sm font-semibold uppercase text-stone-900">
                {regType === "supplier"
                  ? "Rekisteröi Toimittaja"
                  : "Rekisteröi Kuljetusyritys"}
              </h3>
              <p className="font-sans text-xs font-medium leading-relaxed text-gray-600">
                Täytä yrityksesi tiedot alle rekisteröityäksesi kumppaniksi.
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
                  if (
                    regType === "transport" &&
                    !servicesFTL &&
                    !servicesLTL &&
                    !servicesExpress &&
                    !servicesThermo &&
                    !servicesCrane &&
                    !servicesSpecial
                  ) {
                    setNotice(
                      "⚠️ Valitse vähintään yksi palvelutyyppi kuljetusyrityksellesi!"
                    );
                    return;
                  }
                  startTransition(async () => {
                    const payload =
                      regType === "supplier"
                        ? {
                            country,
                            productsDesc,
                            categories: selectedCats,
                            website,
                            socials,
                          }
                        : {
                            routeCountry: routeCountry.toLowerCase(),
                            routeDirection,
                            services: [
                              servicesFTL && "FTL (Täysikuorma)",
                              servicesLTL && "LTL (Osakuorma)",
                              servicesExpress && "Pikakuljetus",
                              servicesThermo && "Lämpösäädelty",
                              servicesCrane && "Nosturikuljetus",
                              servicesSpecial && "Erikoiskuljetus",
                            ].filter(Boolean),
                            ftlPrice: ftlPrice || null,
                            ltlPrice: ltlPrice || null,
                            expressPrice: expressPrice || null,
                            capacity,
                            days,
                            website,
                            socials,
                          };
                    const fd = new FormData();
                    fd.set("regType", regType);
                    fd.set("companyName", companyName);
                    fd.set("email", email);
                    fd.set("phone", `${phonePrefix} ${phone}`.trim());
                    fd.set("details", businessDesc);
                    fd.set("payload", JSON.stringify(payload));
                    const res: PortalState = await registerPartner(fd);
                    if (res.error) {
                      setNotice("⚠️ Tarkista kentät ja yritä uudelleen.");
                    } else {
                      setRegSuccess(
                        regType === "supplier"
                          ? "Toimittaja on tallennettu tietokantaan. Ylläpito julkaisee sen hakemistoon."
                          : "Kuljetusliike ja rahtireitti on tallennettu. Ylläpito integroi sen hakuun."
                      );
                    }
                  });
                }}
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
              >
                {/* Company Name */}
                <div className="space-y-1 md:col-span-2">
                  <label className={labelCls}>Yrityksen nimi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Esim. Baltic Logistics AS"
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
                    placeholder="Esim. myynti@balticlogistics.ee"
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
                          <div className="space-y-2 py-1 text-center">
                            <span className="block text-[9.5px] font-bold text-orange-700">
                              Vahvistuslinkki lähetetty sähköpostiin!
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsEmailVerified(true)}
                              className="w-full animate-pulse cursor-pointer border border-emerald-900 bg-emerald-700 py-2 text-[10px] font-bold uppercase text-white shadow-sm transition-colors hover:bg-emerald-800"
                            >
                              🔗 Klikkaa tästä vahvistaaksesi sähköpostisi livenä
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone Connection */}
                <div className="space-y-1">
                  <label className={labelCls}>Puhelinnumero *</label>
                  <div className="flex gap-1.5">
                    <select
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      className="h-10 border border-slate-200 bg-white px-1 font-mono text-xs focus:outline-none"
                    >
                      {PHONE_PREFIXES.map((p) => (
                        <option key={p.prefix} value={p.prefix}>
                          {p.flag} {p.prefix}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="40 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 flex-1 border border-slate-200 bg-white px-3 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-1 md:col-span-2">
                  <label className={labelCls}>Kotisivut / Website *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Social Media Links */}
                <div className="space-y-2 border-2 border-dashed border-slate-200 bg-stone-50 p-4 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className={labelCls}>
                        Sosiaaliset mediat / Social Media Profiles
                      </label>
                      <p className="font-sans text-[10px] text-gray-400">
                        Valitse alusta ja syötä profiilin linkki tai
                        käyttäjätunnus.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSocials([...socials, { platform: "facebook", url: "" }])
                      }
                      className="flex cursor-pointer items-center gap-1 border border-slate-200 bg-brand px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-white transition-all hover:bg-brand-mid"
                    >
                      <span>➕ Lisää uusi / Add New</span>
                    </button>
                  </div>

                  {socials.length > 0 ? (
                    <div className="space-y-2 pt-2">
                      {socials.map((social, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <select
                            value={social.platform}
                            onChange={(e) => {
                              const updated = [...socials];
                              updated[index] = {
                                ...updated[index],
                                platform: e.target.value,
                              };
                              setSocials(updated);
                            }}
                            className="h-9 cursor-pointer border border-slate-200 bg-white px-2 font-mono text-xs font-bold focus:outline-none"
                          >
                            <option value="facebook">Facebook</option>
                            <option value="insta">Instagram</option>
                            <option value="x">X (Twitter)</option>
                            <option value="threads">Threads</option>
                            <option value="linkedin">LinkedIn</option>
                          </select>
                          <input
                            type="text"
                            required
                            placeholder={SOCIAL_PLACEHOLDERS[social.platform]}
                            value={social.url}
                            onChange={(e) => {
                              const updated = [...socials];
                              updated[index] = {
                                ...updated[index],
                                url: e.target.value,
                              };
                              setSocials(updated);
                            }}
                            className="h-9 flex-1 border border-slate-200 bg-white px-3 text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSocials(socials.filter((_, i) => i !== index))
                            }
                            className="h-9 cursor-pointer border border-slate-200 bg-rose-600 px-2.5 font-mono text-xs font-bold uppercase text-white transition-colors hover:bg-rose-700"
                          >
                            Poista
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-2 text-center text-[10px] italic text-gray-400">
                      Ei lisättyjä sosiaalisen median linkkejä.
                    </p>
                  )}
                </div>

                {/* SUPPLIER FORM ONLY FIELDS */}
                {regType === "supplier" && (
                  <>
                    <div className="space-y-1">
                      <label className={labelCls}>Toimittajan maa *</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-10 w-full cursor-pointer border border-slate-200 bg-white px-2 font-mono text-xs font-bold focus:outline-none"
                      >
                        {EU_COUNTRY_CODES.map((c) => (
                          <option key={c} value={c}>
                            {getCountryFlag(c)}{" "}
                            {regionName(c, locale).toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className={labelCls}>
                        Päätuotteet (Avainsanat) *
                      </label>
                      <input
                        type="text"
                        required
                        value={productsDesc}
                        onChange={(e) => setProductsDesc(e.target.value)}
                        className={inputCls}
                        placeholder="Esim. Kertopuu, OSB, Kipsilevyt"
                      />
                    </div>

                    <div className="space-y-2 rounded-lg border border-slate-200 bg-red-50/50 p-5 md:col-span-2">
                      <label className="block font-mono text-[10px] font-bold uppercase text-stone-900">
                        Valitse Toimittaja-Kategoriat *
                      </label>
                      <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto border border-slate-200 bg-white p-3 sm:grid-cols-3">
                        {cats.map((c) => (
                          <label
                            key={c.slug}
                            className="flex cursor-pointer select-none items-center gap-2 font-mono text-xs font-bold"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCats.includes(c.slug)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCats([...selectedCats, c.slug]);
                                } else {
                                  setSelectedCats(
                                    selectedCats.filter((k) => k !== c.slug)
                                  );
                                }
                              }}
                              className="h-4 w-4 border border-slate-200 accent-[#8B5CF6]"
                            />
                            <span>{categoryName(c, locale)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* TRANSPORT FORM ONLY FIELDS */}
                {regType === "transport" && (
                  <>
                    <div className="space-y-4 rounded-lg border border-slate-200 bg-yellow-50/50 p-4 md:col-span-2">
                      <div className="space-y-1">
                        <label className={labelCls}>
                          1. Valitse Maa / Select Country *
                        </label>
                        <select
                          value={routeCountry}
                          onChange={(e) => setRouteCountry(e.target.value)}
                          className="h-10 w-full cursor-pointer border border-slate-200 bg-white px-2 font-mono text-xs font-bold focus:outline-none"
                        >
                          {EU_COUNTRY_CODES.filter((c) => c !== "fi")
                            .slice()
                            .sort((a, b) =>
                              regionName(a, locale).localeCompare(
                                regionName(b, locale),
                                locale
                              )
                            )
                            .map((c) => (
                              <option key={c} value={c.toUpperCase()}>
                                {getCountryFlag(c)} {c.toUpperCase()} (
                                {regionName(c, locale)})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className={labelCls}>
                          2. Valitse Suunta (Määritä Reittityyppi) / Select
                          Direction (Set Route Type) *
                        </label>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          {(
                            [
                              {
                                id: "inbound",
                                title: "Tuonti Suomeen (Inbound)",
                                path: [routeCountry, "➔", "FI"],
                              },
                              {
                                id: "outbound",
                                title: "Vienti Suomesta (Outbound)",
                                path: ["FI", "➔", routeCountry],
                              },
                              {
                                id: "roundtrip",
                                title: "Molemmat suunnat (Round-trip)",
                                path: [routeCountry, "➔", "FI", "➔", routeCountry],
                              },
                            ] as const
                          ).map((dir) => (
                            <label
                              key={dir.id}
                              className={`flex cursor-pointer select-none items-start gap-3 border border-slate-200 bg-white p-3 transition-all hover:bg-slate-50 ${
                                routeDirection === dir.id
                                  ? "ring-2 ring-black"
                                  : "opacity-80"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={routeDirection === dir.id}
                                onChange={() => setRouteDirection(dir.id)}
                                className="mt-0.5 h-4 w-4 cursor-pointer border border-slate-200 accent-black"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-mono text-xs font-semibold">
                                  {dir.title}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[10px] text-gray-500">
                                  {dir.path.map((part, i) => (
                                    <span key={i}>{part}</span>
                                  ))}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-slate-200 bg-white p-2.5 text-center">
                        <span className="block font-mono text-[9px] font-bold uppercase text-gray-400">
                          Määritetty Reitti / Configured Route
                        </span>
                        <span className="mt-1 flex items-center justify-center gap-1.5 font-mono text-xs font-semibold text-black">
                          {getCountryFlag(routeCountry)} {routeCountry} ➔ 🇫🇮 FI
                          {routeDirection === "roundtrip" && (
                            <>
                              {" "}
                              ➔ {getCountryFlag(routeCountry)} {routeCountry}
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Service Classes Checkboxes */}
                    <div className="space-y-1 md:col-span-2">
                      <label className={labelCls}>
                        Tarjotut palveluluokat *
                      </label>
                      <div className="grid grid-cols-2 gap-3 border border-slate-200 bg-white p-3 md:grid-cols-3">
                        {(
                          [
                            { label: "FTL", value: servicesFTL, set: setServicesFTL, amber: false },
                            { label: "LTL", value: servicesLTL, set: setServicesLTL, amber: false },
                            { label: "Express", value: servicesExpress, set: setServicesExpress, amber: false },
                            { label: "Lämpösäädelty", value: servicesThermo, set: setServicesThermo, amber: true },
                            { label: "Nosturikuljetus", value: servicesCrane, set: setServicesCrane, amber: true },
                            { label: "Erikoiskuljetus", value: servicesSpecial, set: setServicesSpecial, amber: true },
                          ] as const
                        ).map((s) => (
                          <label
                            key={s.label}
                            className={`flex cursor-pointer items-center gap-1.5 font-mono text-xs font-bold ${
                              s.amber ? "text-amber-800" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={s.value}
                              onChange={(e) => s.set(e.target.checked)}
                              className={`h-4 w-4 border border-slate-200 ${
                                s.amber ? "accent-amber-600" : ""
                              }`}
                            />
                            <span>{s.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Service Prices (Dynamic) */}
                    {servicesFTL && (
                      <div className="space-y-1">
                        <label className={labelCls}>
                          FTL Täyskuormahinta (€)
                        </label>
                        <input
                          type="number"
                          value={ftlPrice}
                          onChange={(e) =>
                            setFtlPrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className={`${inputCls} font-mono`}
                          placeholder="Esim. 420"
                        />
                      </div>
                    )}
                    {servicesLTL && (
                      <div className="space-y-1">
                        <label className={labelCls}>LTL Alkaen Hinta (€)</label>
                        <input
                          type="number"
                          value={ltlPrice}
                          onChange={(e) =>
                            setLtlPrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className={`${inputCls} font-mono`}
                          placeholder="Esim. 210"
                        />
                      </div>
                    )}
                    {servicesExpress && (
                      <div className="space-y-1">
                        <label className={labelCls}>
                          Express Pikarahtihinta (€)
                        </label>
                        <input
                          type="number"
                          value={expressPrice}
                          onChange={(e) =>
                            setExpressPrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className={`${inputCls} font-mono`}
                          placeholder="Esim. 630"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className={labelCls}>Kapasiteetti</label>
                      <input
                        type="text"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className={`${inputCls} font-mono`}
                        placeholder="Esim. Erittäin korkea tai 24 t / 33 lavapaikkaa"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={labelCls}>Toimitusaika</label>
                      <input
                        type="text"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className={`${inputCls} font-mono`}
                        placeholder="Esim. 1–2 Business days tai 3–5 pv"
                      />
                    </div>
                  </>
                )}

                {/* Detailed Description */}
                <div className="space-y-1 md:col-span-2">
                  <label className={labelCls}>Esittely</label>
                  <textarea
                    rows={4}
                    value={businessDesc}
                    onChange={(e) => setBusinessDesc(e.target.value)}
                    className="w-full border border-slate-200 bg-white p-3 text-xs focus:outline-none"
                    placeholder={
                      regType === "supplier"
                        ? "Esim. Valmistamme sertifioituja puutuotteita ja paneeleita..."
                        : "Esim. Kalustomme koostuu 33 lavapaikan pressukapelli-yhdistelmistä..."
                    }
                  />
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
                    className="w-full cursor-pointer border border-slate-200 bg-[#8B5CF6] py-3 font-mono text-sm font-semibold uppercase text-white transition-all hover:bg-[#7c3aed] disabled:opacity-50"
                  >
                    Tallenna tiedot ja Julkaise
                  </button>
                </div>
            </form>

            {regSuccess && (
              <div className="mt-4 flex gap-3 border-2 border-emerald-600 bg-emerald-50 p-4 font-mono text-emerald-950">
                <span className="text-xl">🎉</span>
                <div>
                  <p className="text-xs font-bold uppercase">
                    Rekisteröinti onnistui!
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
