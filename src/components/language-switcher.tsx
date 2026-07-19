"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { EU_LANGUAGES } from "@/lib/languages";

const STORAGE_KEY = "materiaalitukku_lang";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  // Remember the visitor's language and restore it on the next visit.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, locale);
    } else if (saved !== locale) {
      if (EU_LANGUAGES.some((l) => l.code === saved)) {
        router.replace(pathname, { locale: saved });
      } else {
        localStorage.setItem(STORAGE_KEY, locale);
      }
    }
    // Only on mount: afterwards the select is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <select
      aria-label="Language"
      className="ml-2 h-9 max-w-28 cursor-pointer border-2 border-black bg-white px-1 font-mono text-sm font-bold"
      value={locale}
      onChange={(e) => {
        localStorage.setItem(STORAGE_KEY, e.target.value);
        router.replace(pathname, { locale: e.target.value });
      }}
    >
      {EU_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
