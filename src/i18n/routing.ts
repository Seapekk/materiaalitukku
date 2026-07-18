import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["et", "fi", "en"],
  defaultLocale: "et",
});

export type Locale = (typeof routing.locales)[number];
