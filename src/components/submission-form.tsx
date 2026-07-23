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
      <p className="border border-slate-200 bg-green-100 p-4 font-mono text-sm font-bold uppercase text-green-800">
        🟢 {t("submitted")}
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 border border-slate-200 bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label-mono">{t("supplierName")}</span>
          <input name="supplierName" required maxLength={120} className="input-brutal mt-1" />
        </label>
        <label className="block">
          <span className="label-mono">{t("supplierEmail")}</span>
          <input name="supplierEmail" type="email" required className="input-brutal mt-1" />
        </label>
        <label className="block">
          <span className="label-mono">{t("supplierCountry")}</span>
          <select name="supplierCountry" className="input-brutal mt-1 cursor-pointer font-mono text-xs font-bold">
            {SUPPLIER_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {getCountryFlag(c)} {getCountryName(c, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <hr className="border-t-2 border-dashed border-gray-300" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label-mono">{t("productName")}</span>
          <input name="productName" required maxLength={160} className="input-brutal mt-1" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label-mono">{t("description")}</span>
          <textarea name="description" rows={3} className="input-brutal mt-1" />
        </label>
        <label className="block">
          <span className="label-mono">{t("category")}</span>
          <select name="category" className="input-brutal mt-1 cursor-pointer font-mono text-xs font-bold">
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.parent_slug ? "— " : ""}
                {categoryName(c, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-mono">{t("unit")}</span>
          <select name="unit" className="input-brutal mt-1 cursor-pointer font-mono text-xs font-bold">
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-mono">{t("unitPrice")}</span>
          <input name="unitPrice" type="number" step="0.01" min="0" required className="input-brutal mt-1 font-mono font-bold" />
        </label>
        <label className="block">
          <span className="label-mono">{t("wholesalePrice")}</span>
          <input name="wholesalePrice" type="number" step="0.01" min="0" className="input-brutal mt-1 font-mono font-bold" />
        </label>
        <label className="block">
          <span className="label-mono">{t("minWholesaleQty")}</span>
          <input name="minWholesaleQty" type="number" step="1" min="0" className="input-brutal mt-1 font-mono font-bold" />
        </label>
        <label className="block">
          <span className="label-mono">{t("transportSmall")}</span>
          <input name="transportSmall" type="number" step="0.01" min="0" className="input-brutal mt-1 font-mono font-bold" />
        </label>
        <label className="block">
          <span className="label-mono">{t("transportBulk")}</span>
          <input name="transportBulk" type="number" step="0.01" min="0" className="input-brutal mt-1 font-mono font-bold" />
        </label>
      </div>

      {state.error && (
        <p className="border-2 border-red-300 bg-red-100 px-3 py-2 font-mono text-xs font-bold uppercase text-red-700">
          {t(state.error)}
        </p>
      )}
      <button
        disabled={pending}
        className="btn-brutal bg-[#10B981] px-6 py-2.5 text-white hover:bg-[#059669]"
      >
        {t("submit")} →
      </button>
    </form>
  );
}
