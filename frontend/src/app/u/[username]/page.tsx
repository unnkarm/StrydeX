"use client";

import { useEffect, useMemo, useState } from "react";
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

  const bestScore = useMemo(() => {
    if (!data) return null;
    const scores = data.performance_logs
      .map((log) => log.performance_metric)
      .filter((score): score is number => score != null);
    return scores.length ? Math.max(...scores) : null;
  }, [data]);

  const latestScore = data?.performance_logs.find(
    (log) => log.performance_metric != null
  )?.performance_metric;

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center text-muted">
        Athlete not found.
      </div>
    );
  }

  if (!data) return <div className="px-6 py-16 text-muted">Loading...</div>;

  const { profile, performance_logs, videos } = data;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-heading text-4xl">{profile.name}</h1>
          <p className="mt-1 text-muted">
            {profile.sport || "—"} &middot; {profile.position || "—"} &middot;{" "}
            {profile.region || "—"}
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
        <StatCard
          label="Latest score"
          value={latestScore ?? "—"}
          unit={latestScore != null ? "/100" : undefined}
          accent
        />
        <StatCard
          label="Best score"
          value={bestScore ?? "—"}
          unit={bestScore != null ? "/100" : undefined}
        />
        <StatCard label="Sessions" value={performance_logs.length} />
      </div>

      <h2 className="display-heading mt-10 text-sm text-muted">
        Performance predictions
      </h2>
      <div className="mt-3 space-y-3">
        {performance_logs.length === 0 && (
          <p className="text-sm text-muted">No public performance predictions yet.</p>
        )}
        {performance_logs.slice(0, 6).map((log) => (
          <div key={log.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">
                  {log.sport_type} · {log.event}
                </div>
                <div className="text-xs text-muted">
                  {new Date(log.date).toLocaleDateString()}
                </div>
              </div>
              <div className="stat-value text-2xl text-accent">
                {log.performance_metric?.toFixed(1) ?? "—"}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
              <span>{log.training_hours_per_week} h/week</span>
              <span>VO₂ max {log.vo2_max}</span>
              <span>{log.training_intensity} intensity</span>
              <span>Focus {log.mental_focus_level}</span>
            </div>
          </div>
        ))}
      </div>

      <h2 className="display-heading mt-10 text-sm text-muted">Videos &amp; AI reports</h2>
      <div className="mt-3 space-y-4">
        {videos.length === 0 && <p className="text-sm text-muted">No public videos yet.</p>}
        {videos.map((video) => (
          <div key={video.id} className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <div className="font-medium">{video.title}</div>
              <div className="text-xs text-muted">
                {new Date(video.uploaded_at).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span>Duration: {video.duration_sec ?? "—"}s</span>
              <span>Explosiveness: {video.est_max_speed_score ?? "—"}/100</span>
            </div>
            {video.ai_report && (
              <p className="mt-3 text-sm text-foreground/90">{video.ai_report.summary}</p>
            )}
            {video.coach_comment && (
              <p className="mt-2 text-sm text-accent">Coach: {video.coach_comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
