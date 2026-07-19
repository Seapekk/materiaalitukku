import { defineRouting } from "next-intl/routing";
import { LANGUAGE_CODES } from "@/lib/languages";

export const routing = defineRouting({
  locales: LANGUAGE_CODES,
  defaultLocale: "fi",
});

export type Locale = (typeof routing.locales)[number];
