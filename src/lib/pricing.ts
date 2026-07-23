import type { Offer, Supplier } from "./types";

// Ported from the old app's utils/pricing.ts. Prices are € / unit, VAT 0%.

export type LandedCalc = {
  unitPrice: number;
  freight: number;
  landedTotal: number;
  landedPerUnit: number;
};

// €/unit for a given order quantity: the highest-qty tier whose threshold is
// met wins; otherwise the legacy wholesale break; otherwise the 1-piece price.
export function effectiveUnitPrice(offer: Offer, qty: number): number {
  const tiers = Array.isArray(offer.price_tiers) ? offer.price_tiers : [];
  const applicable = tiers
    .filter((t) => t && t.price > 0 && qty >= t.qty)
    .sort((a, b) => b.qty - a.qty);
  if (applicable.length > 0) return applicable[0].price;

  const isBulk = offer.min_wholesale_qty ? qty >= offer.min_wholesale_qty : false;
  return isBulk && offer.wholesale_price != null
    ? offer.wholesale_price
    : offer.unit_price;
}

export function calculateOfferLanded(offer: Offer, qty: number): LandedCalc {
  const unitPrice = effectiveUnitPrice(offer, qty);
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
