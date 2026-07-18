import type { Offer, Supplier } from "./types";

// Ported from the old app's utils/pricing.ts. Prices are € / unit, VAT 0%.

export type LandedCalc = {
  unitPrice: number;
  freight: number;
  landedTotal: number;
  landedPerUnit: number;
};

export function calculateOfferLanded(offer: Offer, qty: number): LandedCalc {
  const isBulk = offer.min_wholesale_qty ? qty >= offer.min_wholesale_qty : false;
  const unitPrice =
    isBulk && offer.wholesale_price != null ? offer.wholesale_price : offer.unit_price;
  const productTotal = unitPrice * qty;
  const freight =
    qty > 10 && offer.transport_bulk ? offer.transport_bulk : offer.transport_small;
  const landedTotal = productTotal + freight;

  return {
    unitPrice,
    freight,
    landedTotal,
    landedPerUnit: Number((landedTotal / qty).toFixed(2)),
  };
}

export type ComparisonRow = {
  supplier: Supplier | undefined;
  offer: Offer;
  calc: LandedCalc;
};

export function getProductComparison(
  offers: Offer[],
  suppliers: Supplier[],
  qty: number
) {
  if (offers.length === 0) return null;

  const results: ComparisonRow[] = offers.map((offer) => ({
    supplier: suppliers.find((s) => s.id === offer.supplier_id),
    offer,
    calc: calculateOfferLanded(offer, qty),
  }));

  results.sort((a, b) => a.calc.landedPerUnit - b.calc.landedPerUnit);

  const bestOffer = results[0] ?? null;
  const fiResults = results.filter(
    (r) => r.supplier?.country?.toLowerCase() === "fi"
  );
  const bestFi = fiResults[0] ?? null;

  const showSavings = bestFi && bestOffer && bestFi !== bestOffer;

  return {
    results,
    bestOffer,
    bestFi,
    savings: showSavings ? bestFi.calc.landedTotal - bestOffer.calc.landedTotal : 0,
    savingsPct:
      showSavings && bestFi.calc.landedTotal > 0
        ? Math.round(
            ((bestFi.calc.landedTotal - bestOffer.calc.landedTotal) /
              bestFi.calc.landedTotal) *
              100
          )
        : 0,
  };
}
