// Language auto-detection for the supplier area (spec: "ask location permission
// to set language and use browser default language"). Two keyless strategies:
//   1) browserPreferredLocale — reads navigator.languages (reliable, no prompt)
//   2) localeFromCoords — maps geolocation to the nearest EU capital's country,
//      then to that country's main supported language (used behind an explicit
//      "use my location" button, i.e. a user gesture / permission grant).
import { LANGUAGE_CODES } from "./languages";
import { ORIGIN_POINTS, haversineKm } from "./transport-pricing";

// EU country -> the supported UI language we default its visitors to.
export const COUNTRY_TO_LOCALE: Record<string, string> = {
  fi: "fi",
  ee: "et",
  lv: "lv",
  lt: "lt",
  se: "sv",
  dk: "da",
  de: "de",
  at: "de",
  pl: "pl",
  cz: "cs",
  sk: "sk",
  si: "sl",
  hr: "hr",
  hu: "hu",
  ro: "ro",
  bg: "bg",
  gr: "el",
  fr: "fr",
  lu: "fr",
  be: "nl",
  nl: "nl",
  it: "it",
  es: "es",
  pt: "pt",
  ie: "en",
  mt: "mt",
  cy: "el",
};

const SUPPORTED = new Set<string>(LANGUAGE_CODES);

// Best supported language from the browser's preference list, or null.
export function browserPreferredLocale(): string | null {
  if (typeof navigator === "undefined") return null;
  const prefs =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
  for (const raw of prefs) {
    const code = raw?.toLowerCase().split("-")[0];
    if (code && SUPPORTED.has(code)) return code;
  }
  return null;
}

// Nearest EU capital (from the transport origin points) to a coordinate.
export function nearestCountry(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestKm = Infinity;
  for (const [country, pt] of Object.entries(ORIGIN_POINTS)) {
    const km = haversineKm({ lat, lng }, pt);
    if (km < bestKm) {
      bestKm = km;
      best = country;
    }
  }
  return best;
}

// Supported language for a geolocation coordinate, or null.
export function localeFromCoords(lat: number, lng: number): string | null {
  const country = nearestCountry(lat, lng);
  if (!country) return null;
  const loc = COUNTRY_TO_LOCALE[country];
  return loc && SUPPORTED.has(loc) ? loc : null;
}
