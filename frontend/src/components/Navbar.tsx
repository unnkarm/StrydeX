"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { clearToken } from "@/lib/api";

export default function Navbar() {
  const { me, loading, setMe } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    clearToken();
    setMe(null);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="display-heading text-xl font-semibold text-foreground">
          Stryde<span className="text-accent">X</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/scout" className="text-muted hover:text-foreground transition-colors">
            Scout
          </Link>
          <Link
            href="/dashboard"
            aria-label="Dashboard"
            title="Dashboard"
            className="text-muted transition-colors hover:text-foreground"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </Link>

          {!loading && me && (
            <>
              <Link href="/analytics" className="text-muted hover:text-foreground transition-colors">
                Analytics
              </Link>
              {pathname !== "/login" && (
                <button
                  onClick={handleLogout}
                  className="text-muted hover:text-clay transition-colors"
                >
                  Sign out
                </button>
              )}
            </>
          )}
        </nav>
      </div>
      <div className="lane-rule" />
    </header>
  );
}
