"use client";

import { Link, usePathname } from "@/i18n/navigation";

// English-only admin nav. Order and names follow the spec:
// Dashboard, Product Names, Products, Businesses, Transport Companies,
// Categories, Notes, Messages, Logs, Footer, Translations.
// Note: /admin/products holds the product-NAMES catalogue (nimikkeet) and
// /admin/offers holds the per-business product entries — hence the labels.
const ROUTES = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Product Names" },
  { href: "/admin/offers", label: "Products" },
  { href: "/admin/suppliers", label: "Businesses" },
  { href: "/admin/transport", label: "Transport Companies" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/notes", label: "Notes" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/footer", label: "Footer" },
  { href: "/admin/translations", label: "Translations" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 py-2 md:px-6">
        {ROUTES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              isActive(r.href)
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
