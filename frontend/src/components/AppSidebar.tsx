"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/performance", label: "Performance" },
  { href: "/upload", label: "Video Lab" },
  { href: "/portfolio", label: "Portfolio" },
];

export default function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/upload") return pathname.startsWith("/upload");
    return pathname === href;
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-border px-4 py-6 md:flex">
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
              isActive(item.href)
                ? "bg-surface-2 text-accent"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div>
        <div className="lane-rule mb-3" />
        <Link
          href="/settings"
          className={`block rounded-md px-3 py-2 text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-surface-2 text-accent"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
