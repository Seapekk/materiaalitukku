"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";
import { EU_LANGUAGES } from "@/lib/languages";
import {
  translateTexts,
  engineKeyConfigured,
  DEFAULT_ENGINE,
  type TranslationEngine,
} from "@/lib/translate";

export type PNActionState = { success?: string; error?: string; count?: number };

// Translate one chunk of product names into `lang` and write immediately, so a
// later failure never loses the work already done (spec: "when something fails
// then save translations. After everything is translated then save
// automatically"). Returns the translated pairs for the terminal view.
export async function translateProductNamesChunk(
  items: { id: string; name: string }[],
  lang: string,
  engine: TranslationEngine = DEFAULT_ENGINE
): Promise<{ error?: string; results?: { id: string; text: string }[] }> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  const language = EU_LANGUAGES.find((l) => l.code === lang);
  if (!language || lang === "fi") return { error: "badLang" };
  if (!engineKeyConfigured(engine)) return { error: "aiNoKey" };
  if (items.length === 0) return { results: [] };

  const out = await translateTexts(
    items.map((i) => i.name),
    language.name,
    lang,
    "These are short building-material product names; keep model numbers, " +
      "dimensions and units unchanged. ",
    engine
  );
  if (!out) return { error: "aiFailed" };

  // Merge into each row's name_translations and persist this chunk now.
  const ids = items.map((i) => i.id);
  const { data: rows } = await supabase
    .from("products")
    .select("id, name_translations")
    .in("id", ids);
  const current = new Map(
    (rows ?? []).map((r) => [
      r.id as string,
      (r.name_translations ?? {}) as Record<string, string>,
    ])
  );

  const results: { id: string; text: string }[] = [];
  for (let i = 0; i < items.length; i++) {
    const id = items[i].id;
    const values = { ...(current.get(id) ?? {}) };
    values[lang] = out[i];
    await supabase.from("products").update({ name_translations: values }).eq("id", id);
    results.push({ id, text: out[i] });
  }
  revalidatePath("/", "layout");
  return { results };
}

export async function logTranslationRun(lang: string, count: number) {
  const ctx = await requireAdminAction();
  if (!ctx) return;
  await logActivity(
    ctx.supabase,
    ctx.user,
    "products",
    `Translated ${count} product name(s) into "${lang}"`
  );
}

// --- Export ----------------------------------------------------------------
function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// scope "en" => id,name(fi),en ; scope "all" => id,name(fi) + every language.
export async function exportProductNames(
  format: "csv" | "json",
  scope: "en" | "all"
): Promise<{ error?: string; data?: string; filename?: string }> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase } = ctx;

  const { data: rows } = await supabase
    .from("products")
    .select("id, name, name_translations")
    .order("name");
  const products = rows ?? [];
  const langs =
    scope === "en" ? ["en"] : EU_LANGUAGES.filter((l) => l.code !== "fi").map((l) => l.code);

  if (format === "json") {
    const payload = products.map((p) => ({
      id: p.id,
      fi: p.name,
      translations: Object.fromEntries(
        langs.map((code) => [
          code,
          ((p.name_translations ?? {}) as Record<string, string>)[code] ?? "",
        ])
      ),
    }));
    return {
      data: JSON.stringify(payload, null, 2),
      filename: `product-names-${scope}.json`,
    };
  }

  const header = ["id", "fi", ...langs].map(csvEscape).join(",");
  const lines = products.map((p) => {
    const t = (p.name_translations ?? {}) as Record<string, string>;
    return [p.id, p.name, ...langs.map((code) => t[code] ?? "")]
      .map((v) => csvEscape(String(v)))
      .join(",");
  });
  return {
    data: [header, ...lines].join("\n"),
    filename: `product-names-${scope}.csv`,
  };
}

// --- Import ----------------------------------------------------------------
// Accepts the CSV/JSON produced by export. Matches rows by id; only writes
// non-empty translated cells, never touching the Finnish base name.
export async function importProductNames(
  format: "csv" | "json",
  text: string
): Promise<PNActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  type Incoming = { id: string; translations: Record<string, string> };
  let incoming: Incoming[] = [];

  try {
    if (format === "json") {
      const parsed = JSON.parse(text) as {
        id: string;
        translations?: Record<string, string>;
      }[];
      incoming = parsed
        .filter((r) => r && typeof r.id === "string")
        .map((r) => ({ id: r.id, translations: r.translations ?? {} }));
    } else {
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length < 2) return { error: "empty" };
      const header = splitCsvLine(lines[0]);
      const langCols = header
        .map((h, i) => ({ h, i }))
        .filter((c) => c.h !== "id" && c.h !== "fi");
      const idIdx = header.indexOf("id");
      if (idIdx === -1) return { error: "noId" };
      for (const line of lines.slice(1)) {
        const cells = splitCsvLine(line);
        const id = cells[idIdx];
        if (!id) continue;
        const translations: Record<string, string> = {};
        for (const { h, i } of langCols) {
          const v = (cells[i] ?? "").trim();
          if (v) translations[h] = v;
        }
        incoming.push({ id, translations });
      }
    }
  } catch {
    return { error: "parseFailed" };
  }

  const ids = incoming.map((r) => r.id);
  const { data: rows } = await supabase
    .from("products")
    .select("id, name_translations")
    .in("id", ids);
  const current = new Map(
    (rows ?? []).map((r) => [
      r.id as string,
      (r.name_translations ?? {}) as Record<string, string>,
    ])
  );

  let count = 0;
  for (const r of incoming) {
    if (!current.has(r.id) || Object.keys(r.translations).length === 0) continue;
    const merged = { ...(current.get(r.id) ?? {}), ...r.translations };
    const { error } = await supabase
      .from("products")
      .update({ name_translations: merged })
      .eq("id", r.id);
    if (!error) count++;
  }

  await logActivity(supabase, user, "products", `Imported ${count} product-name translation row(s)`);
  revalidatePath("/", "layout");
  return { success: "imported", count };
}

// Minimal CSV line splitter (handles quoted fields with commas / "").
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
