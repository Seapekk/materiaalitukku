"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getProductComparison } from "@/lib/pricing";
import { getCountryFlag, getCountryName } from "@/lib/country";
import type { Offer, Product, Supplier } from "@/lib/types";

export function ComparisonTable({
  product,
  offers,
  suppliers,
}: {
  product: Product;
  offers: Offer[];
  suppliers: Supplier[];
}) {
  const t = useTranslations("product");
  const locale = useLocale();
  const [qty, setQty] = useState(1);

  const comparison = getProductComparison(offers, suppliers, Math.max(1, qty));
  if (!comparison) {
    return <p className="text-slate-500">{t("noOffers")}</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium" htmlFor="qty">
          {t("quantity")} ({product.unit})
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value) || 1)}
          className="w-28 border border-slate-300 rounded px-3 py-2 bg-white"
        />
      </div>

      {comparison.savings > 0 && (
        <p className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
          {t("savings", {
            amount: comparison.savings.toFixed(2),
            pct: comparison.savingsPct,
          })}
        </p>
      )}

      <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">{t("supplier")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("unitPrice")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("wholesalePrice")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("freight")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("landedTotal")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("landedPerUnit")}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.results.map((row, i) => {
              const isBest = row === comparison.bestOffer;
              const isBestFi =
                row === comparison.bestFi && row !== comparison.bestOffer;
              return (
                <tr
                  key={row.offer.id}
                  className={`border-b border-slate-100 last:border-0 ${
                    isBest ? "bg-emerald-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="mr-1">
                      {getCountryFlag(row.supplier?.country ?? "")}
                    </span>
                    <span className="font-medium">{row.supplier?.name ?? "—"}</span>
                    <span className="text-slate-400 text-xs ml-1">
                      {getCountryName(row.supplier?.country ?? "", locale)}
                    </span>
                    {isBest && (
                      <span className="ml-2 text-xs bg-emerald-700 text-white rounded-full px-2 py-0.5">
                        {t("best")}
                      </span>
                    )}
                    {isBestFi && (
                      <span className="ml-2 text-xs bg-slate-200 text-slate-700 rounded-full px-2 py-0.5">
                        {t("bestFi")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.offer.unit_price.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.offer.wholesale_price != null ? (
                      <>
                        {row.offer.wholesale_price.toFixed(2)} €{" "}
                        <span className="text-xs text-slate-400">
                          {row.offer.min_wholesale_qty != null &&
                            t("minQty", { qty: row.offer.min_wholesale_qty })}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.calc.freight.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {row.calc.landedTotal.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {row.calc.landedPerUnit.toFixed(2)} €
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
