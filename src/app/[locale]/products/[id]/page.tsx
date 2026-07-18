import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ComparisonTable } from "@/components/comparison-table";
import { categoryName, type Supplier } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("name, description")
    .eq("id", id)
    .single();
  if (!product) return {};
  return {
    title: product.name,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("product");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

  const { data: category } = product.category_slug
    ? await supabase
        .from("categories")
        .select("*")
        .eq("slug", product.category_slug)
        .single()
    : { data: null };

  const { data: offers } = await supabase
    .from("offers")
    .select("*")
    .eq("product_id", id)
    .eq("status", "active");

  let suppliers: Supplier[] = [];
  if (offers && offers.length > 0) {
    const supplierIds = [...new Set(offers.map((o) => o.supplier_id))];
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .in("id", supplierIds);
    suppliers = data ?? [];
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {category && <>{categoryName(category, locale)} · </>}
          {product.unit}
        </p>
        {product.description && (
          <p className="mt-3 text-slate-700 whitespace-pre-wrap">
            {product.description}
          </p>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">{t("comparisonTitle")}</h2>
      <ComparisonTable
        product={product}
        offers={offers ?? []}
        suppliers={suppliers}
      />
      <p className="text-xs text-slate-400 mt-3">{tc("vatNote")}</p>
    </div>
  );
}
