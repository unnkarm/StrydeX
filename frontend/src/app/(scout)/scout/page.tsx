"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ScoutResult } from "@/lib/types";
import { getShortlist, toggleShortlist } from "@/lib/shortlist";

export default function ScoutPage() {
  const [filters, setFilters] = useState({
    sport: "",
    position: "",
    region: "",
    age_min: "",
    age_max: "",
    verified_only: false,
  });
  const [results, setResults] = useState<ScoutResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [shortlist, setShortlist] = useState<string[]>([]);

  useEffect(() => {
    setShortlist(getShortlist());
  }, []);

  function handleToggleShortlist(username: string) {
    setShortlist(toggleShortlist(username));
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.scoutSearch(filters);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="display-heading text-3xl">Scout athletes</h1>
      <p className="mt-2 text-sm text-muted">
        Search verified, data-backed athlete profiles.
      </p>

      <form onSubmit={handleSearch} className="mt-8 grid gap-3 sm:grid-cols-3">
        <input
          placeholder="Sport"
          value={filters.sport}
          onChange={(e) => setFilters((f) => ({ ...f, sport: e.target.value }))}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          placeholder="Position"
          value={filters.position}
          onChange={(e) => setFilters((f) => ({ ...f, position: e.target.value }))}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          placeholder="Region"
          value={filters.region}
          onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          placeholder="Min age"
          value={filters.age_min}
          onChange={(e) => setFilters((f) => ({ ...f, age_min: e.target.value }))}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          placeholder="Max age"
          value={filters.age_max}
          onChange={(e) => setFilters((f) => ({ ...f, age_max: e.target.value }))}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={filters.verified_only}
            onChange={(e) => setFilters((f) => ({ ...f, verified_only: e.target.checked }))}
          />
          Verified only
        </label>

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-3 rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="lane-rule my-8" />

      <div className="space-y-3">
        {results === null && <p className="text-sm text-muted">Run a search to see athletes.</p>}
        {results?.length === 0 && <p className="text-sm text-muted">No athletes match those filters.</p>}
        {results?.map((r) => (
          <div
            key={r.username}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent"
          >
            <Link href={`/u/${r.username}`} className="min-w-0 flex-1">
              <div className="font-medium">{r.name}</div>
              <div className="text-sm text-muted">
                {r.sport || "—"} &middot; {r.position || "—"} &middot; Age {r.age ?? "—"} &middot; {r.region || "—"}
              </div>
            </Link>
            <div className="flex items-center gap-3">
              {r.verified && <div className="text-sm text-accent">✔ Verified</div>}
              <Link href={`/u/${r.username}`} className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent">
                View
              </Link>
              <button
                onClick={() => handleToggleShortlist(r.username)}
                aria-label="Save to shortlist"
                className={`text-lg leading-none ${
                  shortlist.includes(r.username) ? "text-clay" : "text-muted hover:text-clay"
                }`}
              >
                {shortlist.includes(r.username) ? "♥" : "♡"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
