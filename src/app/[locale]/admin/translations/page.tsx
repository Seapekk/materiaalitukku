import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { flattenMessages } from "@/lib/flatten-messages";
import { EU_LANGUAGES, STATIC_LOCALES } from "@/lib/languages";
import fiMessages from "../../../../../messages/fi.json";
import { TranslationsDashboard } from "@/components/translations-dashboard";

export const metadata: Metadata = { title: "Käännökset" };
export const dynamic = "force-dynamic";

export default async function TranslationsPage() {
  const t = await getTranslations("adminTrans");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    redirect({ href: "/", locale });
    return null;
  }

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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 space-y-2 border-2 border-black bg-black p-8 text-white">
        <span className="inline-block bg-white px-2 py-0.5 font-mono text-xs font-bold uppercase text-[#1450A3]">
          Admin / i18n
        </span>
        <h1 className="font-mono text-2xl font-black uppercase md:text-3xl">
          🌍 {t("title")}
        </h1>
        <p className="max-w-3xl text-sm text-gray-300">{t("intro")}</p>
        <div className="pt-2">
          <Link
            href="/admin"
            className="border-2 border-white bg-black px-3 py-1.5 font-mono text-xs font-black uppercase text-white hover:bg-[#1450A3]"
          >
            ← Admin
          </Link>
        </div>
      </div>

      <TranslationsDashboard
        baseEntries={Object.entries(base).map(([key, text]) => ({ key, text }))}
        translations={translations}
        languages={languages}
      />
    </div>
  );
}
