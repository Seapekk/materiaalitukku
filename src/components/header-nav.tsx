"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { logout } from "@/app/[locale]/(auth)/actions";

export type HeaderLabels = {
  products: string;
  transport: string;
  suppliers: string;
  supplierArea: string;
  addProducts: string;
  addBusiness: string;
  contact: string;
  adminPanel: string;
  logout: string;
};

const TABS = [
  { href: "/", key: "products" },
  { href: "/transport", key: "transport" },
  { href: "/suppliers", key: "suppliers" },
] as const;

const ACTION_BUTTONS = [
  { href: "/addproducts", key: "addProducts", idle: "bg-[#10B981] hover:bg-[#059669] text-white" },
  { href: "/addbusiness", key: "addBusiness", idle: "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white" },
  { href: "/yhteystiedot", key: "contact", idle: "bg-[#3B82F6] hover:bg-[#2563EB] text-white" },
  { href: "/admin", key: "adminPanel", idle: "bg-[#EF4444] hover:bg-[#DC2626] text-white" },
] as const;

export function HeaderNav({
  labels,
  loggedIn,
}: {
  labels: HeaderLabels;
  loggedIn: boolean;
}) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      {/* Main header row */}
      <div className="flex h-[75px] w-full items-center justify-between pl-4 pr-4 lg:h-[85px] lg:pl-8 lg:pr-0">
        <Link href="/" className="flex select-none flex-col justify-center">
          <span className="flex items-center gap-1.5 font-mono text-[16px] font-semibold tracking-tighter text-black lg:text-[19px]">
            materiaalitukku.<span className="text-[#1450A3]">com</span>
          </span>
          <span className="mt-[1px] line-clamp-1 text-[9px] font-medium uppercase tracking-wide text-gray-500 lg:text-[10.5px]">
            a Estbe powered price comparison tool
          </span>
        </Link>

        {/* Desktop Menu (hidden on mobile, visible on lg). The user area fades
            into red/yellow attention stripes at an angle, per the spec. */}
        <div
          className="hidden h-full items-center pr-8 lg:flex"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 12%, transparent), repeating-linear-gradient(45deg, #FFEDD5, #FFEDD5 10px, #FEE2E2 10px, #FEE2E2 20px)",
          }}
        >
          {/* Left Menu */}
          {TABS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex h-[85px] cursor-pointer items-center border-b-4 px-4 text-sm font-semibold ${
                isActive(item.href)
                  ? "border-[#1450A3] text-[#1450A3]"
                  : "border-transparent text-gray-600 hover:text-black"
              }`}
            >
              {labels[item.key]}
            </Link>
          ))}

          {/* Right Menu */}
          <div className="flex h-[85px] items-center gap-1 pl-4">
            <span className="pr-2 font-mono text-[11px] font-bold uppercase text-[#991B1B]">
              {labels.supplierArea}
            </span>

            {ACTION_BUTTONS.map((btn) => (
              <Link
                key={btn.key}
                href={btn.href}
                className={`mx-1 flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-3.5 py-2 text-xs font-semibold uppercase transition-all ${
                  isActive(btn.href)
                    ? `${btn.key === "adminPanel" ? "bg-brand" : "bg-[#1450A3]"} text-white`
                    : `${btn.idle}`
                }`}
              >
                <span>{labels[btn.key]}</span>
              </Link>
            ))}

            {loggedIn && (
              <form action={logout}>
                <button className="cursor-pointer px-2 font-mono text-[11px] font-bold uppercase text-gray-500 hover:text-black">
                  {labels.logout}
                </button>
              </form>
            )}

            <LanguageSwitcher />
          </div>
        </div>

        {/* Mobile menu and Language controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="cursor-pointer border border-slate-200 bg-[#EAB308] p-2 text-black hover:bg-[#CA8A04]"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X size={20} className="stroke-[3]" />
            ) : (
              <Menu size={20} className="stroke-[3]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="w-full space-y-4 border-t border-slate-200 bg-stone-50 p-4 shadow-md lg:hidden">
          {/* Main sections */}
          <div className="grid grid-cols-1 gap-2">
            {TABS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`w-full border border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase transition-all ${
                  isActive(item.href)
                    ? "bg-[#1450A3] text-white"
                    : "bg-white text-stone-900"
                }`}
              >
                {labels[item.key]}
              </Link>
            ))}
          </div>

          <hr className="my-2 border-slate-200/10" />

          {/* Supplier Area Controls */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1 px-1 font-mono text-xs font-semibold uppercase text-[#991B1B]">
              <span>{labels.supplierArea}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ACTION_BUTTONS.map((btn) => (
                <Link
                  key={btn.key}
                  href={btn.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex cursor-pointer items-center justify-center rounded-md border border-slate-200 px-3 py-2.5 text-center text-[10.5px] font-semibold uppercase leading-tight transition-all ${
                    isActive(btn.href)
                      ? `${btn.key === "adminPanel" ? "bg-brand" : "bg-[#1450A3]"} text-white`
                      : `${btn.idle}`
                  }`}
                >
                  {labels[btn.key]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
