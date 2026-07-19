// Continental FTL route table copied from the new AI Studio app:
// base € per full truck to Finland + typical delivery days.
export const KULJETUS_ROUTES = [
  { code: "ee", price: 420, days: "1–2" },
  { code: "lv", price: 650, days: "1–2" },
  { code: "lt", price: 850, days: "2–3" },
  { code: "se", price: 1200, days: "1–3" },
  { code: "dk", price: 1400, days: "2–4" },
  { code: "pl", price: 1420, days: "3–4" },
  { code: "no", price: 1600, days: "2–5" },
  { code: "cz", price: 1800, days: "3–5" },
  { code: "de", price: 1850, days: "4–5" },
  { code: "sk", price: 1900, days: "4–6" },
  { code: "nl", price: 1950, days: "4–6" },
  { code: "be", price: 2100, days: "4–6" },
  { code: "hu", price: 2100, days: "4–6" },
  { code: "si", price: 2200, days: "5–7" },
  { code: "hr", price: 2400, days: "5–7" },
  { code: "at", price: 2400, days: "5–7" },
  { code: "ro", price: 2600, days: "6–8" },
  { code: "ch", price: 2800, days: "5–7" },
  { code: "fr", price: 2200, days: "4–6" },
  { code: "gb", price: 2400, days: "5–7" },
  { code: "bg", price: 2500, days: "5–8" },
  { code: "it", price: 2400, days: "5–7" },
  { code: "ie", price: 2600, days: "6–8" },
  { code: "gr", price: 2800, days: "6–9" },
  { code: "es", price: 2600, days: "6–8" },
  { code: "pt", price: 2800, days: "6–9" },
] as const;

// Localized country name via the platform, falling back to the code.
export function regionName(code: string, locale: string): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(
        code.toUpperCase()
      ) ?? code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}
