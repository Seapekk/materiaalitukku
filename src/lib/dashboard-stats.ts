import type { SupabaseClient } from "@supabase/supabase-js";
import { flattenMessages } from "@/lib/flatten-messages";
import { EU_LANGUAGES, STATIC_LOCALES } from "@/lib/languages";
import { isImageVerificationEnabled } from "@/lib/settings";
import fiMessages from "../../messages/fi.json";

export type DuplicateGroup = { name: string; count: number };
export type ApiKeyStatus = { name: string; configured: boolean };

export type DashboardStats = {
  productsTotal: number;
  productsActive: number;
  productsHidden: number;
  duplicateGroups: DuplicateGroup[];
  errorCount: number;
  translationsTotalKeys: number;
  translationsLanguagesTotal: number;
  translationsLanguagesComplete: number;
  apiKeys: ApiKeyStatus[];
  imageVerificationEnabled: boolean;
  imagesBlocked: number;
  imagesPending: number;
};

// Aggregates the counters shown on the admin Dashboard tab. Reuses the same
// "static bundle overlaid with DB rows" merge as /admin/translations so the
// completeness count can't drift from what that page actually shows.
export async function getDashboardStats(
  supabase: SupabaseClient
): Promise<DashboardStats> {
  const { data: productRows } = await supabase
    .from("products")
    .select("name, status, image_status");
  const products = productRows ?? [];

  const byName = new Map<string, number>();
  for (const p of products) {
    const key = String(p.name ?? "").trim().toLowerCase();
    if (!key) continue;
    byName.set(key, (byName.get(key) ?? 0) + 1);
  }
  const duplicateGroups: DuplicateGroup[] = [...byName.entries()]
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const { count: errorCount } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("category", "errors");

  const base = flattenMessages(fiMessages as Record<string, unknown>);
  const totalKeys = Object.keys(base).length;

  const translations: Record<string, Record<string, string>> = {};
  for (const loc of STATIC_LOCALES) {
    if (loc === "fi") continue;
    translations[loc] = flattenMessages(
      (await import(`../../messages/${loc}.json`)).default
    );
  }
  const { data: dbRows } = await supabase.from("translations").select("key, values");
  for (const row of dbRows ?? []) {
    if (!(row.key in base)) continue;
    for (const [lang, text] of Object.entries(
      (row.values ?? {}) as Record<string, string>
    )) {
      if (typeof text !== "string" || text.trim() === "") continue;
      (translations[lang] ??= {})[row.key] = text;
    }
  }
  const nonFiLangs = EU_LANGUAGES.filter((l) => l.code !== "fi");
  const translationsLanguagesComplete = nonFiLangs.filter(
    (l) => Object.keys(translations[l.code] ?? {}).length >= totalKeys
  ).length;

  return {
    productsTotal: products.length,
    productsActive: products.filter((p) => p.status === "active").length,
    productsHidden: products.filter((p) => p.status === "hidden").length,
    duplicateGroups,
    errorCount: errorCount ?? 0,
    translationsTotalKeys: totalKeys,
    translationsLanguagesTotal: nonFiLangs.length,
    translationsLanguagesComplete,
    apiKeys: [
      { name: "GEMINI_API_KEY", configured: Boolean(process.env.GEMINI_API_KEY) },
      {
        name: "GOOGLE_TRANSLATE_API_KEY",
        configured: Boolean(process.env.GOOGLE_TRANSLATE_API_KEY),
      },
      { name: "RESEND_API_KEY", configured: Boolean(process.env.RESEND_API_KEY) },
      {
        name: "NEXT_PUBLIC_SUPABASE_URL",
        configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      },
      {
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
    ],
    imageVerificationEnabled: await isImageVerificationEnabled(supabase),
    imagesBlocked: products.filter((p) => p.image_status === "blocked").length,
    imagesPending: products.filter((p) => p.image_status === "pending").length,
  };
}
