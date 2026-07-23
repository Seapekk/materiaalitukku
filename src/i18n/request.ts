import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { routing } from "./routing";
import { STATIC_LOCALES } from "@/lib/languages";

type Messages = Record<string, unknown>;

// The whole `translations` table, cached across requests (revalidated every
// 60s / on the "translations" tag). Previously this ran a fresh Supabase query
// on EVERY non-Finnish page render — the main SSR cost for those locales.
const getOverlayRows = unstable_cache(
  async (): Promise<{ key: string; values: Record<string, string> }[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    try {
      const supabase = createClient(url, key);
      const { data } = await supabase.from("translations").select("key, values");
      return data ?? [];
    } catch {
      return [];
    }
  },
  ["translations-overlay"],
  { revalidate: 60, tags: ["translations"] }
);

// Overlay non-empty values from `override` onto `base`. The base Finnish
// bundle always provides every key, so the UI never renders blank text.
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const cur = out[key];
    if (
      value &&
      typeof value === "object" &&
      cur &&
      typeof cur === "object"
    ) {
      out[key] = deepMerge(cur as Messages, value as Messages);
    } else if (typeof value === "string" && value.trim() !== "") {
      out[key] = value;
    }
  }
  return out;
}

// Turn flat DB rows ("nav.products" → text) into a nested messages object.
function nestDbRows(
  rows: { key: string; values: Record<string, string> }[],
  locale: string
): Messages {
  const out: Messages = {};
  for (const row of rows) {
    const text = row.values?.[locale];
    if (typeof text !== "string" || text.trim() === "") continue;
    const parts = row.key.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof node[part] !== "object" || node[part] === null) {
        node[part] = {};
      }
      node = node[part] as Messages;
    }
    node[parts[parts.length - 1]] = text;
  }
  return out;
}

async function loadDbOverlay(locale: string): Promise<Messages> {
  return nestDbRows(await getOverlayRows(), locale);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Base Finnish bundle → static bundle for the locale (if any) → DB overlay.
  let messages: Messages = (await import("../../messages/fi.json")).default;
  if (
    locale !== "fi" &&
    (STATIC_LOCALES as readonly string[]).includes(locale)
  ) {
    const staticMessages = (await import(`../../messages/${locale}.json`))
      .default;
    messages = deepMerge(messages, staticMessages);
  }
  if (locale !== "fi") {
    messages = deepMerge(messages, await loadDbOverlay(locale));
  }

  return { locale, messages };
});
