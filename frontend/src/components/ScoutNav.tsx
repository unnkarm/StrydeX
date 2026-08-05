"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ScoutNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/scout" className="display-heading text-lg font-semibold text-foreground">
          Stryde<span className="text-accent">X</span>{" "}
          <span className="text-muted">Scout</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/scout"
            className={pathname === "/scout" ? "text-accent" : "text-muted hover:text-foreground transition-colors"}
          >
            Discover Talent
          </Link>
          <Link
            href="/scout/shortlist"
            className={
              pathname === "/scout/shortlist" ? "text-accent" : "text-muted hover:text-foreground transition-colors"
            }
          >
            Shortlist
          </Link>
          <Link href="/" className="text-muted hover:text-foreground transition-colors">
            Exit
          </Link>
        </nav>
      </div>
      <div className="lane-rule" />
    </header>
  );
}
