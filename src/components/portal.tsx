"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  requestPriceChange,
  sendMessage,
  type PortalState,
} from "@/app/[locale]/(portal)/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OfferOption = {
  id: string;
  unit_price: number;
  product: { name: string; unit: string } | null;
};

function ContactCard() {
  const t = useTranslations("portal");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (step === "done") {
    return (
      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-2 border-emerald-500 bg-emerald-50 p-4">
          <p className="font-mono text-xs font-bold uppercase text-emerald-900">
            🟢 {t("contactDone")}
          </p>
          <p className="mt-1 text-xs text-emerald-900">{t("contactDoneText")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="border-b border-stone-200 pb-3">
        <h3 className="font-mono text-sm font-bold uppercase text-stone-900">
          ✉️ {t("contactTitle")}
        </h3>
        <p className="mt-1 text-xs text-stone-500">{t("contactIntro")}</p>
      </div>

      {error && (
        <p className="border-2 border-red-300 bg-red-100 px-3 py-2 font-mono text-xs font-bold uppercase text-red-700">
          {t(error)}
        </p>
      )}

      <div className="space-y-1">
        <label className="label-mono">{t("supplierEmail")} *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="esim. vertrieb@rockwool.de"
          className="input-brutal"
        />
      </div>

      <div className="space-y-1">
        <label className="label-mono">{t("message")} *</label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
          className="input-brutal"
        />
      </div>

      {step === "form" ? (
        <button
          onClick={() => {
            setError(null);
            if (!EMAIL_RE.test(email.trim())) return setError("invalidEmail");
            if (!message.trim()) return setError("emptyMessage");
            setStep("confirm");
          }}
          className="btn-brutal w-full bg-stone-900 py-3 text-white hover:bg-black"
        >
          {t("getVerification")} →
        </button>
      ) : (
        <div className="space-y-3 border-2 border-blue-200 bg-blue-50 p-4">
          <p className="font-mono text-xs font-bold uppercase text-blue-900">
            {t("verificationSentTitle")}
          </p>
          <p className="text-xs text-blue-950">{t("verificationSentText")}</p>
          <div className="border border-stone-200 bg-white p-3.5 text-center">
            <p className="mb-2 text-[10px] text-stone-600">
              <code className="bg-stone-50 px-1 font-mono">{email}</code>
            </p>
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("email", email);
                  fd.set("message", message);
                  const res: PortalState = await sendMessage(fd);
                  if (res.error) {
                    setError(res.error);
                    setStep("form");
                  } else {
                    setStep("done");
                  }
                })
              }
              className="btn-brutal w-full bg-emerald-600 py-2.5 text-white hover:bg-emerald-700"
            >
              {t("confirmSend")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceChangeCard() {
  const t = useTranslations("portal");
  const [email, setEmail] = useState("");
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [offerId, setOfferId] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Look up this supplier's offers as soon as a plausible email is typed.
  useEffect(() => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setOffers([]);
      setOfferId("");
      return;
    }
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("offers")
        .select(
          "id, unit_price, product:products(name, unit), supplier:suppliers!inner(email)"
        )
        .eq("status", "active")
        .ilike("supplier.email", trimmed);
      setOffers(
        (data ?? []).map((o) => ({
          id: o.id,
          unit_price: o.unit_price,
          product: Array.isArray(o.product) ? o.product[0] : o.product,
        }))
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  if (step === "done") {
    return (
      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-2 border-emerald-500 bg-emerald-50 p-4">
          <p className="font-mono text-xs font-bold uppercase text-emerald-900">
            🟢 {t("priceDone")}
          </p>
          <p className="mt-1 text-xs text-emerald-900">{t("priceDoneText")}</p>
        </div>
      </div>
    );
  }

  const selected = offers.find((o) => o.id === offerId);

  return (
    <div className="space-y-4 border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="border-b border-stone-200 pb-3">
        <h3 className="font-mono text-sm font-bold uppercase text-stone-900">
          💶 {t("priceTitle")}
        </h3>
        <p className="mt-1 text-xs text-stone-500">{t("priceIntro")}</p>
      </div>

      {error && (
        <p className="border-2 border-red-300 bg-red-100 px-3 py-2 font-mono text-xs font-bold uppercase text-red-700">
          {t(error)}
        </p>
      )}

      <div className="space-y-1">
        <label className="label-mono">{t("supplierEmail")} *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setOfferId("");
          }}
          placeholder="esim. vertrieb@rockwool.de"
          className="input-brutal"
        />
      </div>

      {EMAIL_RE.test(email.trim()) && (
        <div className="space-y-1">
          <label className="label-mono">{t("chooseProduct")} *</label>
          {offers.length > 0 ? (
            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="input-brutal cursor-pointer"
            >
              <option value="">
                {t("chooseProductOption", { count: offers.length })}
              </option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.product?.name ?? o.id} ({t("currentPrice")}:{" "}
                  {o.unit_price.toFixed(2)} €/{o.product?.unit ?? ""})
                </option>
              ))}
            </select>
          ) : (
            <p className="border border-stone-200 bg-stone-50 p-3 text-xs font-bold text-red-700">
              {t("noProductsForEmail")}
            </p>
          )}
        </div>
      )}

      {selected && (
        <>
          <div className="space-y-1">
            <label className="label-mono">{t("newPrice")} *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-mono text-sm font-bold text-gray-500">
                €
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="esim. 42.50"
                className="input-brutal pl-8 font-mono"
              />
            </div>
          </div>

          {step === "form" ? (
            <button
              onClick={() => {
                setError(null);
                const price = Number(newPrice);
                if (!Number.isFinite(price) || price <= 0)
                  return setError("invalidPrice");
                setStep("confirm");
              }}
              className="btn-brutal w-full bg-[#1450A3] py-3 text-white hover:bg-black"
            >
              {t("getVerification")} →
            </button>
          ) : (
            <div className="space-y-3 border-2 border-blue-200 bg-blue-50 p-4">
              <p className="font-mono text-xs font-bold uppercase text-blue-900">
                {t("verificationSentTitle")}
              </p>
              <p className="text-xs text-blue-950">{t("verificationSentText")}</p>
              <div className="border border-stone-200 bg-white p-3.5 text-center">
                <p className="mb-2 text-[10px] text-stone-600">
                  <code className="bg-stone-50 px-1 font-mono">{email}</code>
                </p>
                <button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const fd = new FormData();
                      fd.set("email", email);
                      fd.set("offerId", offerId);
                      fd.set("newPrice", newPrice);
                      const res: PortalState = await requestPriceChange(fd);
                      if (res.error) {
                        setError(res.error);
                        setStep("form");
                      } else {
                        setStep("done");
                      }
                    })
                  }
                  className="btn-brutal w-full bg-emerald-600 py-2.5 text-white hover:bg-emerald-700"
                >
                  {t("submitPrice")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function Portal({ priceFirst = false }: { priceFirst?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {priceFirst ? (
        <>
          <PriceChangeCard />
          <ContactCard />
        </>
      ) : (
        <>
          <ContactCard />
          <PriceChangeCard />
        </>
      )}
    </div>
  );
}
