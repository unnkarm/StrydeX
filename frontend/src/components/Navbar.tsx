"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { clearToken } from "@/lib/api";

export default function Navbar() {
  const { me, loading, setMe } = useCurrentUser();
  const router = useRouter();
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
            </>
          )}
        </nav>
      </div>
      <div className="lane-rule" />
    </header>
  );
}
