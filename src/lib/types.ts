export type Category = {
  id: number;
  slug: string;
  parent_slug: string | null;
  name: Record<string, string>;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category_slug: string | null;
  unit: string;
  image_url: string | null;
  status: "active" | "hidden";
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  lead_time: string | null;
  description: string | null;
  created_at: string;
};

export type Offer = {
  id: string;
  product_id: string;
  supplier_id: string;
  unit_price: number;
  wholesale_price: number | null;
  min_wholesale_qty: number | null;
  transport_small: number;
  transport_bulk: number;
  status: "active" | "pending";
  created_at: string;
  updated_at: string;
};

export type TransportCompany = {
  id: string;
  name: string;
  route: string;
  days: string;
  services: string[];
  capacity: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  featured: boolean;
};

export type Submission = {
  id: string;
  supplier_name: string;
  supplier_email: string;
  supplier_country: string;
  supplier_id: string | null;
  raw_name: string;
  raw_description: string;
  raw_unit: string;
  raw_unit_price: number;
  raw_wholesale_price: number | null;
  raw_min_wholesale_qty: number | null;
  raw_transport_small: number | null;
  raw_transport_bulk: number | null;
  category_slug: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type Message = {
  id: string;
  sender_email: string;
  message: string;
  read: boolean;
  created_at: string;
};

export type PriceChangeRequest = {
  id: string;
  supplier_email: string;
  offer_id: string;
  new_unit_price: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export const UNITS = ["kpl", "m2", "jm", "m3"] as const;

export function categoryName(category: Category | undefined, locale: string): string {
  if (!category) return "";
  return category.name[locale] ?? category.name["fi"] ?? category.slug;
}
