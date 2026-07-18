"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createBusiness, type BusinessFormState } from "@/app/[locale]/businesses/actions";
import { categoryName, type Category } from "@/lib/types";

export function BusinessForm({ categories }: { categories: Category[] }) {
  const t = useTranslations("businesses.form");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<BusinessFormState, FormData>(
    createBusiness,
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
        <span className="text-sm font-medium">{t("name")}</span>
        <input name="name" required maxLength={120} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">{t("tagline")}</span>
        <input name="tagline" maxLength={160} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">{t("description")}</span>
        <textarea name="description" required rows={6} className={inputCls} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">{t("categories")}</legend>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="categories" value={c.id} />
              {categoryName(c, locale)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">{t("country")}</span>
          <select name="country" className={inputCls}>
            <option value="EE">EE</option>
            <option value="FI">FI</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("city")}</span>
          <input name="city" required className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("website")}</span>
          <input name="website" type="url" placeholder="https://" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("email")}</span>
          <input name="email" type="email" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("phone")}</span>
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
