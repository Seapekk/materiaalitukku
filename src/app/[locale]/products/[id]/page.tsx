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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 border border-slate-200 bg-slate-50 p-6 md:p-8">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          {category && (
            <span className="border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#1450A3]">
              {categoryName(category, locale)}
            </span>
          )}
          <span className="font-mono text-xs font-bold text-gray-500">
            {t("quantity")}:{" "}
            <span className="text-sm text-gray-800">{product.unit}</span>
          </span>
        </div>
        <h1 className="font-mono text-xl font-semibold uppercase leading-tight tracking-tight text-black md:text-3xl">
          {product.name}
        </h1>
        {product.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {product.description}
          </p>
        )}
      </div>

      <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-black">
        📊 {t("comparisonTitle")}
      </h2>
      <ComparisonTable
        product={product}
        offers={offers ?? []}
        suppliers={suppliers}
      />
      <p className="mt-3 font-mono text-[10px] font-bold uppercase text-gray-400">
        {tc("vatNote")}
      </p>
    </div>
  );
}
