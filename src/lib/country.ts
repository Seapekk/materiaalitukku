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
