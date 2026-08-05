"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/performance", label: "Performance" },
  { href: "/upload", label: "Video Lab" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/settings", label: "Settings" },
];

export default function MobileAppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2 text-sm md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/upload" ? pathname.startsWith("/upload") : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full border px-3 py-1 ${
              active ? "border-accent text-accent" : "border-border text-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
