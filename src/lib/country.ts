// Countries suppliers commonly come from; extend as needed.
export const SUPPLIER_COUNTRIES = [
  "fi",
  "ee",
  "se",
  "de",
  "pl",
  "lv",
  "lt",
] as const;

export function getCountryFlag(code: string): string {
  const norm = (code ?? "").trim().toLowerCase();
  if (norm.length !== 2) return "🇪🇺";
  // Regional indicator symbols: 'a' -> 🇦 etc.
  const base = 0x1f1e6;
  return (
    String.fromCodePoint(base + norm.charCodeAt(0) - 97) +
    String.fromCodePoint(base + norm.charCodeAt(1) - 97)
  );
}

const COUNTRY_NAMES: Record<string, Record<string, string>> = {
  fi: { fi: "Suomi", et: "Soome", en: "Finland" },
  ee: { fi: "Viro", et: "Eesti", en: "Estonia" },
  se: { fi: "Ruotsi", et: "Rootsi", en: "Sweden" },
  de: { fi: "Saksa", et: "Saksamaa", en: "Germany" },
  pl: { fi: "Puola", et: "Poola", en: "Poland" },
  lv: { fi: "Latvia", et: "Läti", en: "Latvia" },
  lt: { fi: "Liettua", et: "Leedu", en: "Lithuania" },
};

export function getCountryName(code: string, locale: string): string {
  const norm = (code ?? "").trim().toLowerCase();
  return COUNTRY_NAMES[norm]?.[locale] ?? norm.toUpperCase();
}

// Standard VAT rates per country, copied from the AI Studio app.
export const EU_VAT_RATES: Record<string, number> = {
  fi: 25.5,
  se: 25,
  ee: 24,
  de: 19,
  pl: 23,
  at: 20,
  be: 21,
  bg: 20,
  hr: 25,
  cy: 19,
  cz: 21,
  dk: 25,
  fr: 20,
  gr: 24,
  hu: 27,
  ie: 23,
  it: 22,
  lv: 21,
  lt: 21,
  lu: 17,
  mt: 18,
  nl: 21,
  pt: 23,
  ro: 21,
  sk: 23,
  si: 22,
  es: 21,
};

export function getVatRate(countryCode?: string): number {
  if (!countryCode) return 0;
  const code = countryCode.trim().toLowerCase();
  return EU_VAT_RATES[code] !== undefined ? EU_VAT_RATES[code] : 21;
}
