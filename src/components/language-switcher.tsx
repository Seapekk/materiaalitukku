"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { EU_LANGUAGES } from "@/lib/languages";
import { browserPreferredLocale, localeFromCoords } from "@/lib/locale-detect";

const STORAGE_KEY = "materiaalitukku_lang";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [suggested, setSuggested] = useState<string | null>(null);

  const switchTo = (code: string) => {
    localStorage.setItem(STORAGE_KEY, code);
    if (code !== locale) router.replace(pathname, { locale: code });
  };

  // On first visit only restore an explicitly saved choice — no automatic
  // navigation. The Finnish market side stays Finnish by default (spec); the
  // browser default is only *offered* as a one-click hint below, and the
  // location button covers the supplier-area "detect my language" case. This
  // also avoids a double page load on first visit.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== locale && EU_LANGUAGES.some((l) => l.code === saved)) {
      router.replace(pathname, { locale: saved });
      return;
    }
    // No saved choice: offer the browser default as a one-click hint (no
    // automatic navigation). Set in an effect to avoid a hydration mismatch.
    if (!saved) {
      const pref = browserPreferredLocale();
      if (pref && pref !== locale) setSuggested(pref);
    }
    // Only on mount: afterwards the select is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explicit "use my location" (spec: "ask location permission to set
  // language"). Requires a user gesture, so it lives on a button rather than
  // auto-prompting. Maps the coordinate to the nearest EU country's language.
  const detectByLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const code = localeFromCoords(pos.coords.latitude, pos.coords.longitude);
        if (code) switchTo(code);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="ml-2 flex items-center gap-1">
      <select
        aria-label="Language"
        className="h-9 max-w-28 cursor-pointer border border-slate-200 bg-white px-1 font-mono text-sm font-bold"
        value={locale}
        onChange={(e) => switchTo(e.target.value)}
      >
        {EU_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.code.toUpperCase()}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={detectByLocation}
        disabled={locating}
        aria-label="Detect language from my location"
        title="Detect language from my location"
        className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        <MapPin className={`h-4 w-4 ${locating ? "animate-pulse" : ""}`} />
      </button>
      {suggested && (
        <button
          type="button"
          onClick={() => {
            switchTo(suggested);
            setSuggested(null);
          }}
          className="h-9 shrink-0 border border-slate-200 bg-white px-2 font-mono text-[11px] font-bold uppercase text-brand hover:bg-slate-50"
          title="Switch to your browser's language"
        >
          → {suggested.toUpperCase()}
        </button>
      )}
    </div>
  );
}
