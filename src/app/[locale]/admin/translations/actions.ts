"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { flattenMessages } from "@/lib/flatten-messages";
import {
  translateTexts,
  engineKeyConfigured,
  DEFAULT_ENGINE,
  type TranslationEngine,
} from "@/lib/translate";
import { logActivity } from "@/lib/logs";
import { EU_LANGUAGES, STATIC_LOCALES } from "@/lib/languages";
import fiMessages from "../../../../../messages/fi.json";

export type TransActionState = {
  success?: string;
  count?: number;
  error?: string;
};

// Upsert edited texts for one language into the translations table.
// Empty strings clear the stored translation (fallback to Finnish resumes).
export async function saveTranslations(
  lang: string,
  entries: { key: string; text: string }[]
): Promise<TransActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;
  if (!EU_LANGUAGES.some((l) => l.code === lang) || lang === "fi")
    return { error: "genericError" };

  const keys = entries.map((e) => e.key);
  const { data: existing } = await supabase
    .from("translations")
    .select("key, values")
    .in("key", keys);
  const byKey = new Map((existing ?? []).map((r) => [r.key, r.values ?? {}]));

  const rows = entries.map(({ key, text }) => {
    const values = { ...(byKey.get(key) ?? {}) } as Record<string, string>;
    if (text.trim() === "") {
      delete values[lang];
    } else {
      values[lang] = text.trim();
    }
    return { key, values, updated_at: new Date().toISOString() };
  });

  const { error } = await supabase.from("translations").upsert(rows);
  if (error) return { error: "genericError" };

  revalidatePath("/", "layout");
  return { success: "saved", count: rows.length };
}

// Full CSV export: key, fi (base), then every other language
// (database value, falling back to the static bundle for et/en).
export async function exportTranslationsCsv(): Promise<
  TransActionState & { csv?: string }
> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  const base = flattenMessages(fiMessages as Record<string, unknown>);
  const staticByLang: Record<string, Record<string, string>> = {};
  for (const loc of STATIC_LOCALES) {
    if (loc === "fi") continue;
    staticByLang[loc] = flattenMessages(
      (await import(`../../../../../messages/${loc}.json`)).default
    );
  }
  const { data: dbRows } = await supabase
    .from("translations")
    .select("key, values");
  const db = new Map(
    (dbRows ?? []).map((r) => [r.key, (r.values ?? {}) as Record<string, string>])
  );

  const langs = EU_LANGUAGES.map((l) => l.code).filter((c) => c !== "fi");
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [["key", "fi", ...langs].join(",")];
  for (const [key, fiText] of Object.entries(base)) {
    const row = [esc(key), esc(fiText)];
    for (const lang of langs) {
      row.push(esc(db.get(key)?.[lang] ?? staticByLang[lang]?.[key] ?? ""));
    }
    lines.push(row.join(","));
  }
  return { success: "exported", csv: lines.join("\n") };
}

// Minimal CSV parser that understands quoted fields with commas/newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

export async function importTranslationsCsv(
  csvText: string
): Promise<TransActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  const rows = parseCsv(csvText);
  if (rows.length < 2) return { error: "genericError" };

  const header = rows[0].map((h) => h.trim());
  if (header[0] !== "key") return { error: "genericError" };
  const validLangs = new Set<string>(
    EU_LANGUAGES.map((l) => l.code).filter((c) => c !== "fi")
  );

  const base = flattenMessages(fiMessages as Record<string, unknown>);
  const keys = rows.slice(1).map((r) => r[0]).filter((k) => k in base);
  const { data: existing } = await supabase
    .from("translations")
    .select("key, values")
    .in("key", keys);
  const byKey = new Map((existing ?? []).map((r) => [r.key, r.values ?? {}]));

  const upserts: { key: string; values: Record<string, string> }[] = [];
  let count = 0;
  for (const row of rows.slice(1)) {
    const key = row[0];
    if (!(key in base)) continue;
    const values = { ...(byKey.get(key) ?? {}) } as Record<string, string>;
    let changed = false;
    header.forEach((lang, idx) => {
      if (!validLangs.has(lang)) return;
      const text = (row[idx] ?? "").trim();
      if (text !== "" && values[lang] !== text) {
        values[lang] = text;
        changed = true;
        count++;
      }
    });
    if (changed) upserts.push({ key, values });
  }

  if (upserts.length > 0) {
    const { error } = await supabase.from("translations").upsert(upserts);
    if (error) return { error: "genericError" };
  }

  revalidatePath("/", "layout");
  return { success: "imported", count };
}

// AI mass-translation via Gemini. Strict fail-safe: any API error, count
// mismatch or empty string aborts the whole run — nothing is written.
export async function aiTranslateMissing(
  lang: string,
  engine: TranslationEngine = DEFAULT_ENGINE
): Promise<TransActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const language = EU_LANGUAGES.find((l) => l.code === lang);
  if (!language || lang === "fi") return { error: "genericError" };

  if (!engineKeyConfigured(engine)) return { error: "aiNoKey" };

  const base = flattenMessages(fiMessages as Record<string, unknown>);
  const staticTexts: Record<string, string> = (
    STATIC_LOCALES as readonly string[]
  ).includes(lang)
    ? flattenMessages((await import(`../../../../../messages/${lang}.json`)).default)
    : {};
  const { data: dbRows } = await supabase
    .from("translations")
    .select("key, values");
  const db = new Map(
    (dbRows ?? []).map((r) => [r.key, (r.values ?? {}) as Record<string, string>])
  );

  const missing = Object.entries(base).filter(
    ([key]) => !db.get(key)?.[lang] && !staticTexts[key]
  );
  if (missing.length === 0) return { success: "nothingMissing", count: 0 };

  // Translate in chunks, but only write once everything has succeeded.
  const translated = new Map<string, string>();
  const CHUNK = 50;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    const texts = chunk.map(([, text]) => text);
    const out = await translateTexts(
      texts,
      language.name,
      lang,
      "Keep ICU placeholders like {count} and plural syntax exactly as they are. ",
      engine
    );
    if (!out) {
      await logActivity(supabase, user, "errors", `AI translation to "${lang}" failed`);
      return { error: "aiFailed" };
    }
    for (let j = 0; j < chunk.length; j++) translated.set(chunk[j][0], out[j]);
  }

  const upserts = [...translated.entries()].map(([key, text]) => {
    const values = { ...(db.get(key) ?? {}) } as Record<string, string>;
    values[lang] = text;
    return { key, values, updated_at: new Date().toISOString() };
  });
  const { error } = await supabase.from("translations").upsert(upserts);
  if (error) return { error: "aiFailed" };

  revalidatePath("/", "layout");
  return { success: "aiDone", count: upserts.length };
}
