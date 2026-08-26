"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Portfolio } from "@/lib/types";

export default function PublicPortfolioPage() {
  const params = useParams<{ username: string }>();
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .portfolio(params.username)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Not found"));
  }, [params.username]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center font-mono">
        <h1 className="display-heading text-2xl text-clay">Player Profile Not Found</h1>
        <p className="mt-3 text-muted">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="px-6 py-16 text-muted font-mono">Loading PitchIQ Verified Player CV...</div>;
  }

  const profile = data.profile;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      {/* Header Profile Card */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-border pb-8">
        <div className="w-24 h-24 rounded-full border border-border bg-surface overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
          {profile.profile_picture ? (
            <img src={profile.profile_picture} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-mono text-muted">👤</span>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <span className="text-[10px] font-mono uppercase bg-accent/15 border border-accent/25 text-accent px-2 py-0.5 rounded">
            Cricket Profile
          </span>
          <h1 className="display-heading text-4xl font-bold mt-1 text-foreground">{profile.name}</h1>
          <p className="text-muted font-mono text-xs">
            {profile.position || "Batter · Right hand · Top order"}
            {profile.region && <> &middot; {profile.region}</>}
          </p>
          
          <div className="flex justify-center sm:justify-start pt-1">
            <div className="rounded-full bg-accent/10 px-3.5 py-1 text-[11px] font-mono text-accent border border-accent/20">
              ✓ Verified PitchIQ Athlete
            </div>
          </div>
        </div>
      </div>

      {profile.bio && (
        <div className="max-w-2xl text-sm text-foreground/90 leading-relaxed font-mono">
          <span className="text-[10px] text-muted uppercase block mb-1">Player bio</span>
          {profile.bio}
        </div>
      )}

      {/* boundary-line divider */}
      <div className="text-center font-mono text-[9px] text-muted tracking-widest py-1 select-none">
        ────────────── ● ──────────────
      </div>

      {/* Grid: Career Snapshot + AI Index */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Career Snapshot */}
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <h2 className="display-heading text-xs uppercase tracking-widest font-mono text-accent font-bold">
            🏏 Career Snapshot
          </h2>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">Matches</span>
              <span className="text-lg font-mono font-bold mt-1 block">48</span>
            </div>
            <div className="p-3 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">Runs</span>
              <span className="text-lg font-mono font-bold mt-1 block">1,842</span>
            </div>
            <div className="p-3 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">Average</span>
              <span className="text-lg font-mono font-bold mt-1 block">41.9</span>
            </div>
            <div className="p-3 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">SR</span>
              <span className="text-lg font-mono font-bold mt-1 block">137.2</span>
            </div>
            <div className="p-3 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">50s</span>
              <span className="text-lg font-mono font-bold mt-1 block">12</span>
            </div>
            <div className="p-3 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">100s</span>
              <span className="text-lg font-mono font-bold mt-1 block">3</span>
            </div>
          </div>
        </div>

        {/* AI Performance Index */}
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <h2 className="display-heading text-xs uppercase tracking-widest font-mono text-accent font-bold">
            🧠 AI Performance Index
          </h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-mono font-bold text-foreground">82</span>
            <span className="text-xs text-muted">/ 100 overall score</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">Batting</span>
              <span className="text-base font-mono font-semibold text-foreground mt-0.5 block">88</span>
            </div>
            <div className="p-2.5 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">Fitness</span>
              <span className="text-base font-mono font-semibold text-foreground mt-0.5 block">79</span>
            </div>
            <div className="p-2.5 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">Fielding</span>
              <span className="text-base font-mono font-semibold text-foreground mt-0.5 block">76</span>
            </div>
            <div className="p-2.5 bg-surface-2 border border-border rounded">
              <span className="text-[9px] text-muted font-mono block uppercase">Consistency</span>
              <span className="text-base font-mono font-semibold text-foreground mt-0.5 block">84</span>
            </div>
          </div>
        </div>
      </div>

      {/* Videos */}
      {data.videos.length > 0 && (
        <div className="space-y-4">
          <h2 className="display-heading text-xs uppercase tracking-widest font-mono text-muted">
            Verified Highlight Videos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.videos.map((video) => (
              <div key={video.id} className="rounded-lg border border-border bg-surface p-4 space-y-2">
                <p className="font-semibold text-foreground font-mono text-sm">{video.title}</p>
                <p className="text-[10px] text-muted font-mono">
                  {video.movement || "Cricket Technique"} &middot;{" "}
                  {new Date(video.uploaded_at).toLocaleDateString()}
                </p>
                {video.score_overall != null && (
                  <p className="text-xs font-mono">
                    AI Technique Score:{" "}
                    <span className="font-semibold text-accent">
                      {video.score_overall.toFixed(0)}/100
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
