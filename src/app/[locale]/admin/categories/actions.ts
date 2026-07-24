"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";
import { translateTexts } from "@/lib/translate";
import { EU_LANGUAGES } from "@/lib/languages";

export type CatActionState = {
  success?: string;
  error?: string;
  count?: number;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

// Minimal RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF, commas).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\r") { /* skip */ }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Bulk create/update categories from a CSV export (round-trips the download).
// Columns: slug, type, parent_slug, sort_order, name_<lang>… Upsert by slug.
export async function importCategoriesCsv(csvText: string): Promise<CatActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const rows = parseCsv(csvText).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length < 2) return { error: "genericError" };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iSlug = idx("slug");
  if (iSlug === -1) return { error: "genericError" };
  const iType = idx("type");
  const iParent = idx("parent_slug");
  const iSort = idx("sort_order");
  const langCols = EU_LANGUAGES.map((l) => ({ code: l.code, i: idx(`name_${l.code}`) })).filter(
    (c) => c.i !== -1
  );

  const parsed = rows.slice(1).map((r) => {
    const slug = slugify(r[iSlug] ?? "");
    const name: Record<string, string> = {};
    for (const { code, i } of langCols) {
      const v = (r[i] ?? "").trim();
      if (v) name[code] = v;
    }
    const type = iType !== -1 && (r[iType] ?? "").trim() === "transport" ? "transport" : "construction";
    const parentRaw = iParent !== -1 ? slugify(r[iParent] ?? "") : "";
    const sortOrder = iSort !== -1 ? Number(r[iSort]) : 0;
    return {
      slug,
      name,
      type,
      parent_slug: parentRaw || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    };
  }).filter((r) => r.slug && Object.keys(r.name).length > 0);

  if (parsed.length === 0) return { error: "genericError" };

  // Pass 1: upsert without parents (avoids FK ordering issues within the file).
  const { error: e1 } = await supabase
    .from("categories")
    .upsert(
      parsed.map(({ slug, name, type, sort_order }) => ({ slug, name, type, sort_order, parent_slug: null })),
      { onConflict: "slug" }
    );
  if (e1) return { error: "genericError" };

  // Pass 2: set parents now that every referenced slug exists.
  for (const r of parsed.filter((r) => r.parent_slug)) {
    await supabase.from("categories").update({ parent_slug: r.parent_slug }).eq("slug", r.slug);
  }

  await logActivity(supabase, user, "categories", `Imported ${parsed.length} categories from CSV`);
  revalidatePath("/", "layout");
  return { success: "imported", count: parsed.length };
}

export async function createCategory(data: {
  nameFi: string;
  parentSlug: string | null;
  sortOrder: number;
  type?: "construction" | "transport";
}): Promise<CatActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const nameFi = data.nameFi.trim();
  const parentSlug = data.parentSlug;
  const sortOrder = Number.isFinite(data.sortOrder) ? data.sortOrder : 0;
  const type = data.type === "transport" ? "transport" : "construction";
  if (!nameFi) return { error: "genericError" };

  const slug = slugify(nameFi);
  if (!slug) return { error: "genericError" };

  const { error } = await supabase.from("categories").insert({
    slug,
    parent_slug: parentSlug,
    name: { fi: nameFi },
    sort_order: sortOrder,
    type,
  });
  if (error) {
    return { error: error.code === "23505" ? "duplicateSlug" : "genericError" };
  }

  await logActivity(supabase, user, "categories", `Created category "${nameFi}" (${slug})`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function updateCategory(
  slug: string,
  data: { name: Record<string, string>; parentSlug: string | null; sortOrder: number }
): Promise<CatActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (data.parentSlug === slug) return { error: "genericError" };

  const { error } = await supabase
    .from("categories")
    .update({
      name: data.name,
      parent_slug: data.parentSlug,
      sort_order: data.sortOrder,
    })
    .eq("slug", slug);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "categories", `Updated category "${slug}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function deleteCategory(slug: string): Promise<CatActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_slug", slug);
  if (count && count > 0) return { error: "categoryInUse" };

  const { error } = await supabase.from("categories").delete().eq("slug", slug);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "categories", `Deleted category "${slug}"`);
  revalidatePath("/", "layout");
  return { success: "deleted" };
}

// AI-translate this category's name into every EU language it's still
// missing. Strict fail-safe, same philosophy as the site-wide translator.
export async function translateCategoryMissing(slug: string): Promise<CatActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!process.env.GEMINI_API_KEY) return { error: "aiNoKey" };

  const { data: cat } = await supabase
    .from("categories")
    .select("name")
    .eq("slug", slug)
    .single();
  if (!cat) return { error: "genericError" };

  const name = (cat.name ?? {}) as Record<string, string>;
  const fiText = name.fi;
  if (!fiText) return { error: "genericError" };

  const missingLangs = EU_LANGUAGES.filter(
    (l) => l.code !== "fi" && !name[l.code]?.trim()
  );
  if (missingLangs.length === 0) return { success: "nothingMissing", count: 0 };

  const updated = { ...name };
  for (const lang of missingLangs) {
    const out = await translateTexts([fiText], lang.name, lang.code);
    if (!out) {
      await logActivity(supabase, user, "errors", `AI translation for category "${slug}" failed`);
      return { error: "aiFailed" };
    }
    updated[lang.code] = out[0];
  }

  const { error } = await supabase
    .from("categories")
    .update({ name: updated })
    .eq("slug", slug);
  if (error) return { error: "aiFailed" };

  await logActivity(
    supabase,
    user,
    "categories",
    `AI-translated category "${slug}" into ${missingLangs.length} language(s)`
  );
  revalidatePath("/", "layout");
  return { success: "aiDone", count: missingLangs.length };
}
