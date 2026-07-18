import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fi", "et", "en"],
  defaultLocale: "fi",
});

export type Locale = (typeof routing.locales)[number];
