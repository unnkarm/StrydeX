"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { clearToken } from "@/lib/api";

export default function Navbar() {
  const { me, loading, setMe } = useCurrentUser();
  const router = useRouter();

  function logout() {
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
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/scout" className="text-muted hover:text-foreground">Scout</Link>
          {!loading && me ? (
            <>
              <Link href="/dashboard" className="text-muted hover:text-foreground">Dashboard</Link>
              <Link href="/analytics" className="text-muted hover:text-foreground">Analytics</Link>
              <button onClick={logout} className="text-muted hover:text-foreground">Log out</button>
            </>
          ) : !loading ? (
            <Link href="/login" className="text-accent">Log in</Link>
          ) : null}
        </nav>
      </div>
      <div className="lane-rule" />
    </header>
  );
}
