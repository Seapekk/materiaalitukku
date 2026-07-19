"use client";

import { Link, usePathname } from "@/i18n/navigation";

export function NavTab({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`flex h-full items-center whitespace-nowrap border-b-4 px-3 text-sm font-semibold lg:px-4 ${
        active
          ? "border-[#1450A3] text-[#1450A3]"
          : "border-transparent text-gray-600 hover:text-black"
      }`}
    >
      {children}
    </Link>
  );
}
