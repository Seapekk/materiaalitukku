"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createSubmission, type SubmitState } from "@/app/[locale]/submit/actions";
import { categoryName, UNITS, type Category } from "@/lib/types";
import { getCountryFlag, getCountryName, SUPPLIER_COUNTRIES } from "@/lib/country";

export function SubmissionForm({ categories }: { categories: Category[] }) {
  const t = useTranslations("submitForm");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    createSubmission,
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
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">{t("supplierName")}</span>
          <input name="supplierName" required maxLength={120} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("supplierEmail")}</span>
          <input name="supplierEmail" type="email" required className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("supplierCountry")}</span>
          <select name="supplierCountry" className={inputCls}>
            {SUPPLIER_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {getCountryFlag(c)} {getCountryName(c, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <hr className="border-slate-200" />

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">{t("productName")}</span>
          <input name="productName" required maxLength={160} className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">{t("description")}</span>
          <textarea name="description" rows={3} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("category")}</span>
          <select name="category" className={inputCls}>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.parent_slug ? "— " : ""}
                {categoryName(c, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("unit")}</span>
          <select name="unit" className={inputCls}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("unitPrice")}</span>
          <input name="unitPrice" type="number" step="0.01" min="0" required className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("wholesalePrice")}</span>
          <input name="wholesalePrice" type="number" step="0.01" min="0" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("minWholesaleQty")}</span>
          <input name="minWholesaleQty" type="number" step="1" min="0" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("transportSmall")}</span>
          <input name="transportSmall" type="number" step="0.01" min="0" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("transportBulk")}</span>
          <input name="transportBulk" type="number" step="0.01" min="0" className={inputCls} />
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
