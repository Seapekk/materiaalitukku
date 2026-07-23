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

export async function createCategory(data: {
  nameFi: string;
  parentSlug: string | null;
  sortOrder: number;
}): Promise<CatActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const nameFi = data.nameFi.trim();
  const parentSlug = data.parentSlug;
  const sortOrder = Number.isFinite(data.sortOrder) ? data.sortOrder : 0;
  if (!nameFi) return { error: "genericError" };

  const slug = slugify(nameFi);
  if (!slug) return { error: "genericError" };

  const { error } = await supabase.from("categories").insert({
    slug,
    parent_slug: parentSlug,
    name: { fi: nameFi },
    sort_order: sortOrder,
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
