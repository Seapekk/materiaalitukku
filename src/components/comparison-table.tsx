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
    return (
      <p className="border-2 border-black bg-white p-6 text-center font-mono text-sm font-bold uppercase text-gray-500">
        ⚠️ {t("noOffers")}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="label-mono" htmlFor="qty">
          {t("quantity")} ({product.unit})
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value) || 1)}
          className="input-brutal w-28 font-mono font-bold"
        />
      </div>

      {comparison.savings > 0 && (
        <p className="mb-4 inline-block border-2 border-green-300 bg-green-100 px-3 py-2 font-mono text-xs font-bold uppercase text-green-800">
          🟢{" "}
          {t("savings", {
            amount: comparison.savings.toFixed(2),
            pct: comparison.savingsPct,
          })}
        </p>
      )}

      <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-[#1450A3] text-white">
            <tr>
              <th className="border-b-4 border-r-2 border-black p-3 font-mono text-[11px] font-bold uppercase tracking-wider">
                {t("supplier")}
              </th>
              <th className="border-b-4 border-r-2 border-black p-3 text-right font-mono text-[11px] font-bold uppercase tracking-wider">
                {t("unitPrice")}
              </th>
              <th className="border-b-4 border-r-2 border-black p-3 text-right font-mono text-[11px] font-bold uppercase tracking-wider">
                {t("wholesalePrice")}
              </th>
              <th className="border-b-4 border-r-2 border-black p-3 text-right font-mono text-[11px] font-bold uppercase tracking-wider">
                {t("freight")}
              </th>
              <th className="border-b-4 border-r-2 border-black p-3 text-right font-mono text-[11px] font-bold uppercase tracking-wider">
                {t("landedTotal")}
              </th>
              <th className="border-b-4 border-black p-3 text-right font-mono text-[11px] font-bold uppercase tracking-wider">
                {t("landedPerUnit")}
              </th>
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
                  className={`border-b-2 border-black transition-colors last:border-b-0 hover:bg-[#E8F0FE] ${
                    isBest
                      ? "bg-yellow-100"
                      : i % 2 === 0
                        ? "bg-white"
                        : "bg-slate-50"
                  }`}
                >
                  <td className="border-r-2 border-black p-3 align-middle">
                    <span className="block font-mono text-xs font-extrabold uppercase text-black">
                      {getCountryFlag(row.supplier?.country ?? "")}{" "}
                      {getCountryName(row.supplier?.country ?? "", locale)}
                      {isBest && (
                        <span className="ml-2 border border-yellow-500 bg-yellow-300 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-yellow-900">
                          {t("best")}
                        </span>
                      )}
                      {isBestFi && (
                        <span className="ml-2 border border-slate-300 bg-slate-200 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-600">
                          {t("bestFi")}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-stone-700">
                      <strong className="text-[#1450A3]">
                        {row.supplier?.name ?? "—"}
                      </strong>
                    </span>
                  </td>
                  <td className="border-r-2 border-black p-3 text-right align-middle font-mono">
                    {row.offer.unit_price.toFixed(2)} €
                  </td>
                  <td className="border-r-2 border-black p-3 text-right align-middle font-mono">
                    {row.offer.wholesale_price != null ? (
                      <>
                        {row.offer.wholesale_price.toFixed(2)} €
                        {row.offer.min_wholesale_qty != null && (
                          <span className="block text-[10px] font-bold uppercase text-gray-500">
                            {t("minQty", { qty: row.offer.min_wholesale_qty })}
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border-r-2 border-black p-3 text-right align-middle font-mono">
                    {row.calc.freight.toFixed(2)} €
                  </td>
                  <td className="border-r-2 border-black p-3 text-right align-middle font-mono font-bold">
                    {row.calc.landedTotal.toFixed(2)} €
                  </td>
                  <td
                    className={`p-3 text-right align-middle font-mono text-base font-black ${
                      isBest ? "text-yellow-900" : "text-[#1450A3]"
                    }`}
                  >
                    {row.calc.landedPerUnit.toFixed(2)} €
                    <span className="block text-[10px] font-bold uppercase text-gray-500">
                      / {product.unit}
                    </span>
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
