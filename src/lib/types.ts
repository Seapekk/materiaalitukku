export type Category = {
  id: number;
  slug: string;
  name: Record<string, string>;
  category_group: string | null;
  sort_order: number;
};

export type Tender = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category_id: number | null;
  type: "goods" | "services";
  budget: number | null;
  country: string;
  city: string;
  status: "pending" | "approved" | "rejected" | "deleted";
  rejection_reason: string | null;
  views: number;
  created_at: string;
  expires_at: string;
};

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  tagline: string | null;
  description: string;
  category_ids: number[];
  country: string;
  city: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  status: "pending" | "approved" | "rejected" | "deleted" | "banned";
  created_at: string;
};

export const COUNTRIES = ["EE", "FI"] as const;

export function categoryName(category: Category | undefined, locale: string): string {
  if (!category) return "";
  return category.name[locale] ?? category.name["en"] ?? category.slug;
}
