// EU + nearby countries for the registration forms (July AI Studio app).
export const EU_COUNTRY_CODES = [
  "fi", "ee", "lv", "lt", "se", "dk", "pl", "de", "nl", "be", "cz", "sk",
  "at", "hu", "si", "hr", "ro", "bg", "it", "fr", "es", "pt", "ie", "gr",
  "lu", "mt", "cy", "no", "ch", "gb",
] as const;

export const REG_UNITS = ["kpl", "m²", "m³", "jm", "kg", "tn", "pkt", "lava"] as const;

export const PHONE_PREFIXES = [
  { prefix: "+358", flag: "🇫🇮" },
  { prefix: "+372", flag: "🇪🇪" },
  { prefix: "+48", flag: "🇵🇱" },
  { prefix: "+49", flag: "🇩🇪" },
  { prefix: "+371", flag: "🇱🇻" },
  { prefix: "+370", flag: "🇱🇹" },
  { prefix: "+46", flag: "🇸🇪" },
] as const;
