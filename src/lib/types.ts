export type CategoryType = "construction" | "transport";

export type Category = {
  id: number;
  slug: string;
  parent_slug: string | null;
  name: Record<string, string>;
  sort_order: number;
  type: CategoryType;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  category_slug: string | null;
  unit: string;
  image_url: string | null;
  image_status: "pending" | "approved" | "blocked";
  name_translations: Record<string, string>;
  status: "active" | "hidden";
  created_at: string;
  updated_at: string;
};

export type LifecycleFields = {
  status: "active" | "rejected";
  expires_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  social: string | null;
  lead_time: string | null;
  description: string | null;
  created_at: string;
} & LifecycleFields;

// A higher-quantity price break: €/unit at or above `qty` pieces.
export type PriceTier = { qty: number; price: number };

export type Offer = {
  id: string;
  product_id: string;
  supplier_id: string;
  unit_price: number;
  wholesale_price: number | null;
  min_wholesale_qty: number | null;
  price_tiers: PriceTier[];
  transport_small: number;
  transport_bulk: number;
  status: "active" | "pending" | "rejected";
  source: "user" | "admin" | "scraped";
  created_at: string;
  updated_at: string;
};

export type OfferStatus = Offer["status"];
export type OfferSource = Offer["source"];

export type RouteDirection = "inbound" | "outbound" | "roundtrip";

export type SocialLink = { platform: string; url: string };

export type TransportCompany = {
  id: string;
  name: string;
  reg_number: string | null;
  origin_country: string;
  direction: RouteDirection;
  address: string | null;
  days: string;
  // Transport service-type slugs (see `categories` where type = 'transport').
  services: string[];
  // { <service slug>: from-price € } — per-type starting price.
  service_prices: Record<string, number>;
  socials: SocialLink[];
  capacity: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  // Public-facing description translated into fi/en/sv (source may be any lang).
  description_translations: Record<string, string>;
  featured: boolean;
  created_at: string;
  ftl_price: number | null;
  ltl_price: number | null;
  express_price: number | null;
} & LifecycleFields;

// Display string for a route, e.g. "EE -> FI" or "EE -> FI -> EE".
export function formatRoute(originCountry: string, direction: RouteDirection): string {
  const o = originCountry.toUpperCase();
  if (direction === "outbound") return `FI → ${o}`;
  if (direction === "roundtrip") return `${o} → FI → ${o}`;
  return `${o} → FI`;
}

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

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
  created_at: string;
};

export type Registration = {
  id: string;
  reg_type: "product" | "supplier" | "transport";
  company_name: string;
  email: string;
  phone: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "done" | "rejected";
  created_at: string;
};

export type ActivityLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  category: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AdminNote = {
  id: string;
  title: string;
  content: string;
  category: "PRICING" | "LOGISTICS" | "PURCHASING" | "PROJECTS" | "GENERAL";
  color: string;
  created_at: string;
  updated_at: string;
};

export type FooterLink = { title: string; url: string };

export type FooterConfig = {
  id: true;
  company_name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  copyright: string;
  links: FooterLink[];
  updated_at: string;
};

export type ScrapedPrice = {
  id: string;
  product_id: string;
  source_url: string;
  supplier_name: string;
  product_title: string;
  price: number;
  unit: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

export const UNITS = ["kpl", "m2", "jm", "m3"] as const;

export function categoryName(category: Category | undefined, locale: string): string {
  if (!category) return "";
  return category.name[locale] ?? category.name["fi"] ?? category.slug;
}
