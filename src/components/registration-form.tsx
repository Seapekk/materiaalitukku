"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  registerPartner,
  type PortalState,
} from "@/app/[locale]/(portal)/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegType = "product" | "supplier" | "transport";

export function RegistrationSection({
  initialType = "product",
}: {
  initialType?: RegType;
}) {
  const t = useTranslations("hinnoittelu");
  const [regType, setRegType] = useState<RegType>(initialType);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const pickType = (type: RegType) => {
    setRegType(type);
    setSuccess(false);
    setNotice(null);
  };

  const typeButtons: { id: RegType; label: string; active: string }[] = [
    { id: "product", label: t("typeProduct"), active: "bg-[#10B981] text-white" },
    { id: "supplier", label: t("typeSupplier"), active: "bg-[#EAB308] text-black" },
    { id: "transport", label: t("typeTransport"), active: "bg-[#3B82F6] text-white" },
  ];

  return (
    <div id="rekisteroidy" className="space-y-8">
      {/* Pricing cards */}
      <div className="grid select-none grid-cols-1 gap-6 md:grid-cols-3">
        {(
          [
            { key: "A", color: "text-[#1450A3]", btnCls: "bg-black hover:bg-[#1450A3]", type: "product" },
            { key: "B", color: "text-green-700", btnCls: "bg-[#1450A3] hover:bg-black", type: "supplier" },
            { key: "C", color: "text-orange-700", btnCls: "bg-black hover:bg-[#1450A3]", type: "transport" },
          ] as const
        ).map((card) => (
          <div
            key={card.key}
            className="relative flex flex-col justify-between space-y-6 border-2 border-black bg-white p-6"
          >
            <div className="space-y-4">
              <div className={`font-mono text-xs font-bold uppercase ${card.color}`}>
                {t(`card${card.key}Type`)}
              </div>
              <h3 className="font-mono text-lg font-bold uppercase">
                {t(`card${card.key}Title`)}
              </h3>
              <div className="border-b border-black/10 pb-4">
                <span className="font-mono text-3xl font-black">
                  {t(`card${card.key}Price`)}
                </span>
                <span className="font-mono text-xs text-gray-400">
                  {" "}
                  {t(`card${card.key}Unit`)}
                </span>
              </div>
              <ul className="block space-y-2 text-xs text-stone-600">
                <li>{t(`card${card.key}1`)}</li>
                <li>{t(`card${card.key}2`)}</li>
                <li>{t(`card${card.key}3`)}</li>
                <li>{t(`card${card.key}4`)}</li>
              </ul>
            </div>
            <button
              onClick={() => pickType(card.type)}
              className={`w-full cursor-pointer border-2 border-black p-3 font-mono text-xs font-extrabold uppercase text-white transition-colors ${card.btnCls}`}
            >
              {t(`card${card.key}Btn`)}
            </button>
          </div>
        ))}
      </div>

      {/* Sub-selector buttons for registration types */}
      <div className="flex select-none flex-wrap justify-center gap-4 border-2 border-black bg-white p-4">
        <span className="mb-1 w-full text-center font-mono text-xs font-black uppercase text-stone-900">
          {t("selectorTitle")}
        </span>
        {typeButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => pickType(btn.id)}
            className={`flex shrink-0 cursor-pointer select-none items-center gap-2 rounded-none border-2 border-black px-6 py-3 text-xs font-black uppercase transition-all active:translate-x-[1px] active:translate-y-[1px] ${
              regType === btn.id
                ? `${btn.active} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
                : "bg-stone-50 text-stone-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            }`}
          >
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* THE LIVE REGISTRATION REGISTRY FORM */}
      <div className="grid grid-cols-1 gap-8 border-2 border-black bg-white p-8 lg:grid-cols-12">
        {/* Left explanation info panel */}
        <div className="space-y-4 lg:col-span-4">
          <h3 className="font-mono text-base font-bold uppercase tracking-tight text-stone-900">
            {t("formTitle")}
          </h3>
          <p className="text-xs leading-relaxed text-gray-600">{t("formIntro")}</p>
          <div className="select-none space-y-1 border-2 border-dashed border-gray-300 bg-slate-50 p-4 font-mono text-[11px]">
            <div className="font-bold text-[#1450A3]">{t("selectedPlan")}</div>
            <div className="font-bold uppercase">
              {regType === "product"
                ? t("planProduct")
                : regType === "supplier"
                  ? t("planSupplier")
                  : t("planTransport")}
            </div>
            <div className="mt-2 font-black text-stone-800">{t("yearlyTotal")}</div>
          </div>
          {regType === "product" && (
            <p className="text-xs text-gray-600">
              {t("submitProductHint")}{" "}
              <Link
                href="/submit"
                className="font-mono font-bold text-[#1450A3] hover:underline"
              >
                {t("submitProductLink")}
              </Link>
            </p>
          )}
        </div>

        {/* Right Form panel */}
        {success ? (
          <div className="lg:col-span-8">
            <div className="border-2 border-emerald-500 bg-emerald-50 p-6">
              <p className="font-mono text-xs font-bold uppercase text-emerald-900">
                🟢 {t("success")}
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setNotice(null);
              if (!isEmailVerified) {
                setNotice(t("emailNotVerified"));
                return;
              }
              startTransition(async () => {
                const fd = new FormData();
                fd.set("regType", regType);
                fd.set("companyName", companyName);
                fd.set("email", email);
                fd.set("phone", phone);
                fd.set("details", details);
                const res: PortalState = await registerPartner(fd);
                if (res.error) {
                  setNotice(t("emailNotVerified"));
                } else {
                  setSuccess(true);
                }
              });
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-8"
          >
            <div className="space-y-1">
              <label className="label-mono">{t("companyName")} *</label>
              <input
                type="text"
                required
                placeholder="Esim. FinnPlast Oy"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-10 w-full border-2 border-black bg-white px-3 text-xs focus:outline-none"
              />
            </div>

            {/* Email and Email Verification */}
            <div className="space-y-1">
              <label className="label-mono">{t("email")} *</label>
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
                className="h-10 w-full border-2 border-black bg-white px-3 text-xs focus:outline-none"
              />
              <div className="pt-1.5 font-mono text-[10.5px]">
                {isEmailVerified ? (
                  <span className="block font-bold text-emerald-700">
                    {t("emailVerified")}
                  </span>
                ) : (
                  <div className="mt-1 space-y-2 border border-stone-200 bg-stone-50 p-2">
                    {!emailCodeSent ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!EMAIL_RE.test(email.trim())) {
                            setNotice(t("emailNotVerified"));
                            return;
                          }
                          setNotice(null);
                          setEmailCodeSent(true);
                        }}
                        className="w-full cursor-pointer border-2 border-black bg-white px-2 py-1.5 font-bold uppercase hover:bg-stone-100"
                      >
                        {t("sendVerification")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEmailVerified(true)}
                        className="w-full cursor-pointer border-2 border-black bg-emerald-600 px-2 py-1.5 font-bold uppercase text-white hover:bg-emerald-700"
                      >
                        {t("confirmVerification")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="label-mono">{t("phone")}</label>
              <input
                type="tel"
                placeholder="+358 40 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 w-full border-2 border-black bg-white px-3 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="label-mono">{t("details")}</label>
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full border-2 border-black bg-white p-3 text-xs focus:outline-none"
              />
            </div>

            {notice && (
              <p className="border-2 border-red-300 bg-red-100 px-3 py-2 font-mono text-xs font-bold uppercase text-red-700 md:col-span-2">
                {notice}
              </p>
            )}

            <div className="md:col-span-2">
              <button
                disabled={pending}
                className="btn-brutal w-full bg-[#10B981] py-3 text-white hover:bg-[#059669]"
              >
                💳 {t("submitBtn")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
