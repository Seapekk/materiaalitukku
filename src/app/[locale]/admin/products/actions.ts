"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/logs";
import { classifyProductImage } from "@/lib/gemini-vision";

export type ProdActionState = { success?: string; error?: string };
export type ImageStatus = "pending" | "approved" | "blocked";

export type ProductInput = {
  name: string;
  description: string;
  categorySlug: string | null;
  unit: string;
  imageUrl: string | null;
  status: "active" | "hidden";
};

export async function createProduct(data: ProductInput): Promise<ProdActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.name.trim()) return { error: "genericError" };

  const { error } = await supabase.from("products").insert({
    name: data.name.trim(),
    description: data.description.trim(),
    category_slug: data.categorySlug,
    unit: data.unit || "kpl",
    image_url: data.imageUrl,
    status: data.status,
  });
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "products", `Created product "${data.name}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function updateProduct(
  id: string,
  data: ProductInput
): Promise<ProdActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  if (!data.name.trim()) return { error: "genericError" };

  const { error } = await supabase
    .from("products")
    .update({
      name: data.name.trim(),
      description: data.description.trim(),
      category_slug: data.categorySlug,
      unit: data.unit || "kpl",
      image_url: data.imageUrl,
      status: data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "products", `Updated product "${data.name}"`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

// Run AI moderation on a product's image and store the verdict. No-ops to
// "pending" without a GEMINI_API_KEY or on any technical failure.
export async function verifyProductImage(id: string): Promise<ProdActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { data: product } = await supabase
    .from("products")
    .select("image_url, name")
    .eq("id", id)
    .maybeSingle();
  if (!product?.image_url) return { error: "noImage" };

  const { verdict, reason } = await classifyProductImage(product.image_url);
  await supabase.from("products").update({ image_status: verdict }).eq("id", id);
  await logActivity(
    supabase,
    user,
    verdict === "blocked" ? "errors" : "products",
    `Image verification for "${product.name}": ${verdict}${reason ? ` (${reason})` : ""}`
  );
  revalidatePath("/", "layout");
  return { success: verdict };
}

// Manual override of an image's moderation status.
export async function setProductImageStatus(
  id: string,
  status: ImageStatus
): Promise<ProdActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("products")
    .update({ image_status: status })
    .eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "products", `Set image status ${status} on ${id}`);
  revalidatePath("/", "layout");
  return { success: "saved" };
}

export async function deleteProduct(id: string): Promise<ProdActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { error: "genericError" };
  const { supabase, user } = ctx;

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: "genericError" };

  await logActivity(supabase, user, "products", `Deleted product ${id}`);
  revalidatePath("/", "layout");
  return { success: "deleted" };
}
