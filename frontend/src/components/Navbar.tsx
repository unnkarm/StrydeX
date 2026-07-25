"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { clearToken } from "@/lib/api";

export default function Navbar() {
  const { me, loading, setMe } = useCurrentUser();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    setMe(null);
    router.push("/");
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

          {!loading && !me && (
            <>
              <Link href="/login" className="text-muted hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-accent px-4 py-1.5 font-medium text-accent-ink hover:opacity-90 transition-opacity"
              >
                Sign up
              </Link>
            </>
          )}

          {!loading && me && (
            <>
              <Link href="/dashboard" className="text-muted hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-muted hover:text-clay transition-colors"
              >
                Log out
              </button>
            </>
          )}
        </nav>
      </div>
      <div className="lane-rule" />
    </header>
  );
}
