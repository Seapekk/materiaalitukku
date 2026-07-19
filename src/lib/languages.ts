// The 23 official EU languages supported by the translation system.
// `flag` is the representative country flag shown in the language selector.
export const EU_LANGUAGES = [
  { code: "fi", flag: "🇫🇮", name: "Suomi" },
  { code: "et", flag: "🇪🇪", name: "Eesti" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "sv", flag: "🇸🇪", name: "Svenska" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "pl", flag: "🇵🇱", name: "Polski" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "pt", flag: "🇵🇹", name: "Português" },
  { code: "nl", flag: "🇳🇱", name: "Nederlands" },
  { code: "da", flag: "🇩🇰", name: "Dansk" },
  { code: "lv", flag: "🇱🇻", name: "Latviešu" },
  { code: "lt", flag: "🇱🇹", name: "Lietuvių" },
  { code: "cs", flag: "🇨🇿", name: "Čeština" },
  { code: "sk", flag: "🇸🇰", name: "Slovenčina" },
  { code: "sl", flag: "🇸🇮", name: "Slovenščina" },
  { code: "hr", flag: "🇭🇷", name: "Hrvatski" },
  { code: "hu", flag: "🇭🇺", name: "Magyar" },
  { code: "ro", flag: "🇷🇴", name: "Română" },
  { code: "bg", flag: "🇧🇬", name: "Български" },
  { code: "el", flag: "🇬🇷", name: "Ελληνικά" },
  { code: "mt", flag: "🇲🇹", name: "Malti" },
] as const;

export type LanguageCode = (typeof EU_LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = EU_LANGUAGES.map((l) => l.code);

// Languages that ship as static JSON bundles in messages/. Everything else is
// served from the base Finnish bundle overlaid with database translations.
export const STATIC_LOCALES = ["fi", "et", "en"] as const;
