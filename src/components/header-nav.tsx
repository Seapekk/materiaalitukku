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
  { href: "/hinnoittelu", key: "addProducts", idle: "bg-[#10B981] hover:bg-[#059669] text-white" },
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
    <nav className="sticky top-0 z-50 w-full border-b-2 border-black bg-white shadow-sm">
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

        {/* Desktop Menu (hidden on mobile, visible on lg) */}
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
                className={`mx-1 flex shrink-0 cursor-pointer items-center gap-1 rounded-none border-2 border-black px-3.5 py-2 text-xs font-black uppercase transition-all active:translate-x-[1px] active:translate-y-[1px] ${
                  isActive(btn.href)
                    ? `${btn.key === "adminPanel" ? "bg-black" : "bg-[#1450A3]"} text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
                    : `${btn.idle} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`
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
            className="cursor-pointer border-2 border-black bg-[#EAB308] p-2 text-black hover:bg-[#CA8A04] active:translate-x-[1px] active:translate-y-[1px]"
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
        <div className="w-full space-y-4 border-t-2 border-black bg-stone-50 p-4 shadow-md lg:hidden">
          {/* Main sections */}
          <div className="grid grid-cols-1 gap-2">
            {TABS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`w-full border-2 border-black px-4 py-3 text-left text-xs font-black uppercase transition-all ${
                  isActive(item.href)
                    ? "bg-[#1450A3] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                }`}
              >
                {labels[item.key]}
              </Link>
            ))}
          </div>

          <hr className="my-2 border-black/10" />

          {/* Supplier Area Controls */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1 px-1 font-mono text-xs font-black uppercase text-[#991B1B]">
              <span>{labels.supplierArea}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ACTION_BUTTONS.map((btn) => (
                <Link
                  key={btn.key}
                  href={btn.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex cursor-pointer items-center justify-center rounded-none border-2 border-black px-3 py-2.5 text-center text-[10.5px] font-black uppercase leading-tight transition-all active:translate-x-[1px] active:translate-y-[1px] ${
                    isActive(btn.href)
                      ? `${btn.key === "adminPanel" ? "bg-black" : "bg-[#1450A3]"} text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`
                      : `${btn.idle} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
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
