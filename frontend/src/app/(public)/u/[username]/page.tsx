"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Portfolio } from "@/lib/types";
import StatCard from "@/components/StatCard";

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
    return <div className="mx-auto max-w-xl px-6 py-16 text-center text-muted">Athlete not found.</div>;
  }
  if (!data) return <div className="px-6 py-16 text-muted">Loading...</div>;

  const { profile, performance_logs, videos } = data;
  const latestSprint = performance_logs.find((l) => l.sprint_time_sec != null)?.sprint_time_sec;
  const latestJump = performance_logs.find((l) => l.vertical_jump_cm != null)?.vertical_jump_cm;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-heading text-4xl">{profile.name}</h1>
          <p className="mt-1 text-muted">
            {profile.sport || "—"} &middot; {profile.position || "—"} &middot; {profile.region || "—"}
          </p>
          {profile.academy && <p className="text-sm text-muted">{profile.academy}</p>}
        </div>
        {profile.verified ? (
          <div className="rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            ✔ Verified{profile.verified_by ? ` by ${profile.verified_by}` : ""}
          </div>
        ) : (
          <div className="rounded-full border border-border px-4 py-1.5 text-sm text-muted">
            Unverified
          </div>
        )}
      </div>

      {profile.bio && <p className="mt-6 max-w-2xl text-foreground/90">{profile.bio}</p>}

      <div className="lane-rule my-8" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Age" value={profile.age ?? "—"} />
        <StatCard label="Sprint PB" value={latestSprint ?? "—"} unit={latestSprint ? "s" : undefined} accent />
        <StatCard label="Vertical jump" value={latestJump ?? "—"} unit={latestJump ? "cm" : undefined} />
        <StatCard label="Sessions" value={performance_logs.length} />
      </div>

      <h2 className="display-heading mt-10 text-sm text-muted">Videos &amp; AI reports</h2>
      <div className="mt-3 space-y-4">
        {videos.length === 0 && <p className="text-sm text-muted">No public videos yet.</p>}
        {videos.map((v) => (
          <div key={v.id} className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <div className="font-medium">{v.title}</div>
              <div className="text-xs text-muted">{new Date(v.uploaded_at).toLocaleDateString()}</div>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span>Duration: {v.duration_sec ?? "—"}s</span>
              <span>Explosiveness: {v.est_max_speed_score ?? "—"}/100</span>
            </div>
            {v.ai_report && <p className="mt-3 text-sm text-foreground/90">{v.ai_report.summary}</p>}
            {v.coach_comment && (
              <p className="mt-2 text-sm text-accent">Coach: {v.coach_comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
