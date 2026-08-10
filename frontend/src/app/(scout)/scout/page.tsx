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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShortlist(getShortlist());
  }, []);

  function handleToggleShortlist(username: string) {
    setShortlist(toggleShortlist(username));
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.scoutSearch(filters);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute scout search");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="border-b border-border pb-6 mb-8">
        <h1 className="display-heading text-3xl">Scout Command Center</h1>
        <p className="text-sm text-muted mt-1">Discover, evaluate, and filter regional cricket talent.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay">
          {error}
        </div>
      )}

      {/* Grid Layout: Left is Filters, Right is Geographic Map */}
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <form onSubmit={handleSearch} className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Sport</label>
              <select
                value={filters.sport}
                onChange={(e) => setFilters((f) => ({ ...f, sport: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent text-foreground"
              >
                <option value="">All Sports</option>
                <option value="Cricket">Cricket</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Cricket Role</label>
              <select
                value={filters.position}
                onChange={(e) => setFilters((f) => ({ ...f, position: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent text-foreground"
              >
                <option value="">All Roles</option>
                <option value="Batter (RHB)">Batter (RHB)</option>
                <option value="Batter (LHB)">Batter (LHB)</option>
                <option value="Fast Bowler">Fast Bowler</option>
                <option value="Spin Bowler">Spin Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicketkeeper-Batter">Wicketkeeper-Batter</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Region</label>
              <input
                placeholder="Region (e.g. Mumbai)"
                value={filters.region}
                onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent text-foreground font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Min age</label>
              <input
                placeholder="Min age"
                value={filters.age_min}
                onChange={(e) => setFilters((f) => ({ ...f, age_min: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Max age</label>
              <input
                placeholder="Max age"
                value={filters.age_max}
                onChange={(e) => setFilters((f) => ({ ...f, age_max: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent text-foreground"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.verified_only}
                  onChange={(e) => setFilters((f) => ({ ...f, verified_only: e.target.checked }))}
                />
                Verified only
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="sm:col-span-3 rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Searching..." : "Search Candidates →"}
            </button>
          </form>
        </div>

        {/* Map Command Center Box */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-lg flex flex-col justify-between items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-transparent pointer-events-none" />
          <h2 className="display-heading text-[10px] text-muted tracking-widest uppercase mb-4 font-mono font-bold">
            Interactive Geomap Hubs
          </h2>

          <div className="w-[180px] h-[220px] bg-background/30 rounded border border-border/50 relative flex items-center justify-center p-2">
            {/* Simulated Geographic Vector outline of India */}
            <svg viewBox="0 0 100 120" className="w-full h-full text-border/30 opacity-70">
              <polygon points="40,20 50,10 60,20 62,35 75,45 80,60 70,68 62,70 58,85 50,110 45,90 35,80 25,65 30,50 38,40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
            </svg>

            {/* Hub hotspots */}
            {/* Kolkata */}
            <button
              onClick={() => {
                setError(null);
                setFilters((f) => ({ ...f, region: "Kolkata" }));
                api.scoutSearch({ ...filters, region: "Kolkata" }).then(setResults).catch((err) => setError(err.message));
              }}
              className="absolute top-[52px] right-[24px] group flex items-center justify-center"
            >
              <span className="absolute w-4 h-4 rounded-full bg-accent/20 animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent border border-black shadow" />
              <span className="absolute top-4 text-[9px] font-mono text-muted bg-background/90 px-1 border border-border rounded hidden group-hover:block whitespace-nowrap">Kolkata Academy</span>
            </button>

            {/* Mumbai */}
            <button
              onClick={() => {
                setError(null);
                setFilters((f) => ({ ...f, region: "Mumbai" }));
                api.scoutSearch({ ...filters, region: "Mumbai" }).then(setResults).catch((err) => setError(err.message));
              }}
              className="absolute bottom-[44px] left-[32px] group flex items-center justify-center"
            >
              <span className="absolute w-4 h-4 rounded-full bg-accent/20 animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent border border-black shadow" />
              <span className="absolute top-4 text-[9px] font-mono text-muted bg-background/90 px-1 border border-border rounded hidden group-hover:block whitespace-nowrap">Mumbai Academy</span>
            </button>

            {/* Bengaluru */}
            <button
              onClick={() => {
                setError(null);
                setFilters((f) => ({ ...f, region: "Bengaluru" }));
                api.scoutSearch({ ...filters, region: "Bengaluru" }).then(setResults).catch((err) => setError(err.message));
              }}
              className="absolute bottom-[22px] left-[45px] group flex items-center justify-center"
            >
              <span className="absolute w-4 h-4 rounded-full bg-accent/20 animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent border border-black shadow" />
              <span className="absolute top-4 text-[9px] font-mono text-muted bg-background/90 px-1 border border-border rounded hidden group-hover:block whitespace-nowrap">Bengaluru Academy</span>
            </button>
          </div>
          
          <p className="text-[10px] text-muted font-mono mt-3">
            🎯 Click any active hub to isolate regional candidates immediately.
          </p>
        </div>
      </div>

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
              <div className="flex items-center gap-2">
                <div className="font-medium text-foreground">{r.name}</div>
                {r.match_pct !== undefined && r.match_pct !== null && (
                  <span className="text-[10px] font-mono bg-accent/10 border border-accent/30 text-accent px-2 py-0.5 rounded-full font-bold">
                    {r.match_pct}% MATCH
                  </span>
                )}
              </div>
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
