"use client";

import { useState, useEffect } from "react";
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
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="display-heading text-2xl">Portfolio not found</h1>
        <p className="mt-3 text-muted">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="px-6 py-16 text-muted">Loading...</div>;
  }

  const profile = data.profile;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-heading text-4xl">{profile.name}</h1>
          <p className="mt-1 text-muted">
            {profile.sport || "—"} &middot; {profile.position || "—"}
            {profile.region && <> &middot; {profile.region}</>}
          </p>
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
        <StatCard label="Height" value={profile.height_cm ? `${profile.height_cm}` : "—"} unit={profile.height_cm ? "cm" : undefined} />
        <StatCard label="Weight" value={profile.weight_kg ? `${profile.weight_kg}` : "—"} unit={profile.weight_kg ? "kg" : undefined} />
        <StatCard label="Sessions" value={data.performance_logs.length} />
      </div>

      {/* Videos */}
      {data.videos.length > 0 && (
        <>
          <div className="lane-rule my-8" />
          <h2 className="display-heading text-sm text-muted">Highlight videos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.videos.map((video) => (
              <div key={video.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="font-medium text-foreground">{video.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {video.sport || "—"} &middot;{" "}
                  {new Date(video.uploaded_at).toLocaleDateString()}
                </p>
                {video.score_overall != null && (
                  <p className="mt-2 text-sm">
                    Overall score:{" "}
                    <span className="stat-value font-semibold text-accent">
                      {video.score_overall.toFixed(1)}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Performance logs */}
      {data.performance_logs.length > 0 && (
        <>
          <div className="lane-rule my-8" />
          <h2 className="display-heading text-sm text-muted">Recent performance</h2>
          <div className="mt-4 space-y-2">
            {data.performance_logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm"
              >
                <span className="text-muted">
                  {new Date(log.date).toLocaleDateString()}
                </span>
                <div className="flex gap-4">
                  {log.sprint_time_sec != null && (
                    <span>Sprint: <strong className="stat-value">{log.sprint_time_sec}s</strong></span>
                  )}
                  {log.vertical_jump_cm != null && (
                    <span>Jump: <strong className="stat-value">{log.vertical_jump_cm}cm</strong></span>
                  )}
                  {log.distance_km != null && (
                    <span>Distance: <strong className="stat-value">{log.distance_km}km</strong></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
