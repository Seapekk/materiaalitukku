"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { et: "ET", fi: "FI", en: "EN" };

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      aria-label="Language"
      className="ml-1 border border-slate-300 rounded px-1.5 py-1.5 text-sm bg-white cursor-pointer"
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {LABELS[l]}
        </option>
      ))}
    </select>
  );
}
