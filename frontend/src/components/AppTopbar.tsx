"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { clearToken, api } from "@/lib/api";
import type { AthleteProfile } from "@/lib/types";

export default function AppTopbar() {
  const { me, setMe } = useCurrentUser();
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.myProfile().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleLogout() {
    clearToken();
    setMe(null);
    router.push("/");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/u/${search.trim()}`);
  }

  const initials = (profile?.name || me?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
      <Link href="/dashboard" className="display-heading shrink-0 text-lg font-semibold text-foreground">
        Stryde<span className="text-accent">X</span>
      </Link>

      <form onSubmit={handleSearch} className="hidden flex-1 max-w-sm sm:block">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search an athlete username..."
          className="w-full rounded-full border border-border bg-surface px-4 py-1.5 text-sm outline-none focus:border-accent"
        />
      </form>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:border-accent hover:text-foreground"
            aria-label="Notifications"
          >
            🔔
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-surface p-3 text-xs text-muted shadow-lg">
              No new notifications yet.
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-medium text-accent"
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface text-sm shadow-lg">
              {profile && (
                <Link
                  href={`/u/${profile.username}`}
                  className="block px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  View public profile
                </Link>
              )}
              <Link
                href="/settings"
                className="block px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2.5 text-left text-clay hover:bg-surface-2"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
