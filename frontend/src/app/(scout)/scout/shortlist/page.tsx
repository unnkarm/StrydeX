"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteProfile } from "@/lib/types";
import { getShortlist, toggleShortlist } from "@/lib/shortlist";

export default function ShortlistPage() {
  const [usernames, setUsernames] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = getShortlist();
    setUsernames(list);
    Promise.all(
      list.map((u) =>
        api
          .portfolio(u)
          .then((p) => p.profile as AthleteProfile)
          .catch(() => null)
      )
    ).then((results) => {
      setProfiles(results.filter((p): p is AthleteProfile => !!p));
      setLoading(false);
    });
  }, []);

  function handleRemove(username: string) {
    const next = toggleShortlist(username);
    setUsernames(next);
    setProfiles((p) => p.filter((pr) => pr.username !== username));
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="display-heading text-3xl">Shortlist</h1>
      <p className="mt-2 text-sm text-muted">Athletes you&apos;ve saved for follow-up, kept on this device.</p>

      <div className="lane-rule my-8" />

      {loading && <p className="text-sm text-muted">Loading...</p>}
      {!loading && usernames.length === 0 && (
        <p className="text-sm text-muted">
          Nothing here yet — save athletes from{" "}
          <Link href="/scout" className="text-accent hover:underline">
            Discover Talent
          </Link>
          .
        </p>
      )}

      <div className="space-y-3">
        {profiles.map((p) => (
          <div
            key={p.username}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
          >
            <Link href={`/u/${p.username}`} className="min-w-0 flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted">
                {p.sport || "—"} &middot; {p.position || "—"} &middot; {p.region || "—"}
              </div>
            </Link>
            <div className="flex items-center gap-3">
              {p.verified && <div className="text-sm text-accent">✔ Verified</div>}
              <button
                onClick={() => handleRemove(p.username)}
                className="text-lg leading-none text-clay"
                aria-label="Remove from shortlist"
              >
                ♥
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
