import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { CategoriesDashboard } from "@/components/categories-dashboard";

export const metadata: Metadata = { title: "Admin — Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  const categories = (data ?? []) as Category[];

  return (
    <div className="admin-page">
      <header className="mb-6">
        <h1 className="admin-h1">Categories</h1>
        <p className="admin-sub">
          Product categories and their translations. New categories are created
          from the Finnish name; the identifier (slug) cannot be changed after
          creation.
        </p>
      </header>

      <CategoriesDashboard categories={categories} />
    </div>
  );
}
