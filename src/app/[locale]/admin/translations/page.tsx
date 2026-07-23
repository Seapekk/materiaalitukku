import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { flattenMessages } from "@/lib/flatten-messages";
import { EU_LANGUAGES, STATIC_LOCALES } from "@/lib/languages";
import fiMessages from "../../../../../messages/fi.json";
import { TranslationsDashboard } from "@/components/translations-dashboard";

export const metadata: Metadata = { title: "Admin — Translations" };
export const dynamic = "force-dynamic";

export default async function TranslationsPage() {
  // Auth is already gated by the /admin layout; this page only needs data.
  const supabase = await createClient();

  // Every UI text auto-registers here from the Finnish base bundle.
  const base = flattenMessages(fiMessages as Record<string, unknown>);

  // Existing translations: static bundles (et/en) overlaid with the database.
  const translations: Record<string, Record<string, string>> = {};
  for (const loc of STATIC_LOCALES) {
    if (loc === "fi") continue;
    translations[loc] = flattenMessages(
      (await import(`../../../../../messages/${loc}.json`)).default
    );
  }
  const { data: dbRows } = await supabase
    .from("translations")
    .select("key, values");
  for (const row of dbRows ?? []) {
    if (!(row.key in base)) continue;
    for (const [lang, text] of Object.entries(
      (row.values ?? {}) as Record<string, string>
    )) {
      if (typeof text !== "string" || text.trim() === "") continue;
      (translations[lang] ??= {})[row.key] = text;
    }
  }

  const languages = EU_LANGUAGES.filter((l) => l.code !== "fi").map((l) => ({
    code: l.code,
    flag: l.flag,
    name: l.name,
    filled: Object.keys(translations[l.code] ?? {}).length,
  }));

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Translations</h1>
        <p className="admin-sub">
          Every site text registers here automatically from the Finnish base.
          Missing languages fall back to Finnish until a translation is added.
        </p>
      </header>

      <TranslationsDashboard
        baseEntries={Object.entries(base).map(([key, text]) => ({ key, text }))}
        translations={translations}
        languages={languages}
      />
    </div>
  );
}
