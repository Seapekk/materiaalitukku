// Distance-based freight estimator: EU origin country -> a specific Finnish
// city. Replaces the flat (TRANSPORT_BASE + DEST_SURCHARGE)/1000 model with a
// haversine distance x per-km rate on top of a fixed per-truck handling fee,
// so "kertopuu, Poland 24 €" gets a landed price to the buyer's actual city.
//
// The rates below are deliberately simple and tunable — calibrated so the
// major lanes land near the AI Studio app's original FTL figures (PL~1420,
// DE~1850, EE~420) while now varying by destination distance.
import { TRANSPORT_BASE } from "./hinta-constants";

export type LatLng = { lat: number; lng: number };

// Representative road-freight origin point per EU country (capital / main hub).
// Approximate; extend or tune freely.
export const ORIGIN_POINTS: Record<string, LatLng> = {
  fi: { lat: 60.17, lng: 24.94 },
  ee: { lat: 59.44, lng: 24.75 },
  lv: { lat: 56.95, lng: 24.11 },
  lt: { lat: 54.69, lng: 25.28 },
  pl: { lat: 52.23, lng: 21.01 },
  de: { lat: 52.52, lng: 13.4 },
  se: { lat: 59.33, lng: 18.06 },
  dk: { lat: 55.68, lng: 12.57 },
  nl: { lat: 52.37, lng: 4.9 },
  be: { lat: 50.85, lng: 4.35 },
  fr: { lat: 48.85, lng: 2.35 },
  cz: { lat: 50.08, lng: 14.44 },
  sk: { lat: 48.15, lng: 17.11 },
  at: { lat: 48.21, lng: 16.37 },
  hu: { lat: 47.5, lng: 19.04 },
  si: { lat: 46.05, lng: 14.51 },
  hr: { lat: 45.81, lng: 15.98 },
  it: { lat: 45.46, lng: 9.19 }, // Milan (industrial north)
  es: { lat: 40.42, lng: -3.7 },
  pt: { lat: 38.72, lng: -9.13 },
  ie: { lat: 53.35, lng: -6.26 },
  ro: { lat: 44.43, lng: 26.1 },
  bg: { lat: 42.7, lng: 23.32 },
  gr: { lat: 37.98, lng: 23.73 },
  lu: { lat: 49.61, lng: 6.13 },
  mt: { lat: 35.9, lng: 14.51 },
  cy: { lat: 35.17, lng: 33.36 },
};

// Finnish destination cities (approx coordinates).
export const FI_CITIES: Record<string, LatLng> = {
  Helsinki: { lat: 60.17, lng: 24.94 },
  Espoo: { lat: 60.21, lng: 24.66 },
  Vantaa: { lat: 60.29, lng: 25.04 },
  Turku: { lat: 60.45, lng: 22.27 },
  Tampere: { lat: 61.5, lng: 23.79 },
  Lahti: { lat: 60.98, lng: 25.66 },
  Jyväskylä: { lat: 62.24, lng: 25.75 },
  Pori: { lat: 61.49, lng: 21.8 },
  Lappeenranta: { lat: 61.06, lng: 28.19 },
  Kuopio: { lat: 62.89, lng: 27.68 },
  Joensuu: { lat: 62.6, lng: 29.76 },
  Vaasa: { lat: 63.1, lng: 21.62 },
  Seinäjoki: { lat: 62.79, lng: 22.84 },
  Kokkola: { lat: 63.84, lng: 23.13 },
  Oulu: { lat: 65.01, lng: 25.47 },
  Kajaani: { lat: 64.23, lng: 27.73 },
  Kemi: { lat: 65.74, lng: 24.56 },
  Rovaniemi: { lat: 66.5, lng: 25.73 },
  Kittilä: { lat: 67.65, lng: 24.91 },
  Ivalo: { lat: 68.66, lng: 27.54 },
};

export const FI_CITY_NAMES = Object.keys(FI_CITIES);

// Tunable rate model.
export const FREIGHT_RATES = {
  perTruckHandling: 200, // fixed load/unload/admin € per truck
  ratePerKmFtl: 1.35, // € per km, full truckload
  unitsPerTruck: 1000, // per-unit basis (matches the original /1000)
  ltlPremium: 1.6, // per-unit multiplier for small (LTL) orders
};

const EARTH_R_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Estimated euro cost of one full truck from `originCountry` to `city`.
export function estimateFtlEuro(originCountry: string, city: string): number {
  const origin = ORIGIN_POINTS[originCountry.toLowerCase()];
  const dest = FI_CITIES[city];
  if (!origin || !dest) {
    // Fall back to the legacy flat base if we don't know the geography.
    return TRANSPORT_BASE[originCountry.toLowerCase()] ?? 1200;
  }
  const km = haversineKm(origin, dest);
  return FREIGHT_RATES.perTruckHandling + km * FREIGHT_RATES.ratePerKmFtl;
}

// Per-unit freight added to an offer's unit price. `bulk` = full-truckload
// pricing; otherwise a small-order (LTL) premium is applied.
export function estimateUnitFreight(
  originCountry: string,
  city: string,
  bulk = true
): number {
  const perUnit = estimateFtlEuro(originCountry, city) / FREIGHT_RATES.unitsPerTruck;
  return bulk ? perUnit : perUnit * FREIGHT_RATES.ltlPremium;
}

export function estimateDistanceKm(
  originCountry: string,
  city: string
): number | null {
  const origin = ORIGIN_POINTS[originCountry.toLowerCase()];
  const dest = FI_CITIES[city];
  if (!origin || !dest) return null;
  return Math.round(haversineKm(origin, dest));
}
