"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createTender, type TenderFormState } from "@/app/[locale]/tenders/actions";
import { categoryName, type Category } from "@/lib/types";

export function TenderForm({ categories }: { categories: Category[] }) {
  const t = useTranslations("tenderForm");
  const tt = useTranslations("tenders");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<TenderFormState, FormData>(
    createTender,
    {}
  );

  if (state.success) {
    return (
      <p className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4">
        {t("submitted")}
      </p>
    );
  }

  const inputCls = "mt-1 w-full border border-slate-300 rounded px-3 py-2 bg-white";

  return (
    <form action={formAction} className="space-y-4 bg-white p-6 rounded-lg border border-slate-200">
      <label className="block">
        <span className="text-sm font-medium">{t("fieldTitle")}</span>
        <input name="title" required maxLength={120} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">{t("fieldDescription")}</span>
        <textarea name="description" required rows={6} className={inputCls} />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">{t("fieldCategory")}</span>
          <select name="category" required className={inputCls}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("fieldType")}</span>
          <select name="type" className={inputCls}>
            <option value="services">{tt("typeServices")}</option>
            <option value="goods">{tt("typeGoods")}</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("fieldCountry")}</span>
          <select name="country" className={inputCls}>
            <option value="EE">EE</option>
            <option value="FI">FI</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("fieldCity")}</span>
          <input name="city" required className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("fieldBudget")}</span>
          <input name="budget" type="number" min="0" step="1" className={inputCls} />
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
        <label className="block">
          <span className="text-sm font-medium">{t("fieldEmail")}</span>
          <input name="email" type="email" required className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("fieldPhone")}</span>
          <input name="phone" type="tel" className={inputCls} />
        </label>
      </div>
      {state.error && <p className="text-sm text-red-600">{t(state.error)}</p>}
      <button
        disabled={pending}
        className="bg-emerald-700 text-white rounded px-6 py-2 font-medium hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
      >
        {t("submit")}
      </button>
    </form>
  );
}
