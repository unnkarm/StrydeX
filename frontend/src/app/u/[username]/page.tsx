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
  useEffect(() => { api.portfolio(params.username).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Not found")); }, [params.username]);
  if (error) return <div className="px-6 py-16 text-clay">{error}</div>;
  if (!data) return <div className="px-6 py-16 text-muted">Loading...</div>;
  const { profile, performance_logs: logs, videos } = data;
  const latestScore = logs.find((log) => log.performance_metric != null)?.performance_metric;
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="display-heading text-4xl">{profile.name}</h1><p className="mt-1 text-muted">{profile.sport || "Athlete"} · {profile.position || "—"}</p></div><div className={profile.verified ? "text-accent" : "text-muted"}>{profile.verified ? `✔ Verified${profile.verified_by ? ` by ${profile.verified_by}` : ""}` : "Unverified"}</div></div>
      {profile.bio && <p className="mt-6 max-w-2xl text-foreground/90">{profile.bio}</p>}
      <div className="lane-rule my-8" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><StatCard label="Age" value={profile.age ?? "—"} /><StatCard label="Results" value={logs.length} /><StatCard label="Videos" value={videos.length} /><StatCard label="Latest score" value={latestScore ?? "—"} accent={latestScore != null} /></div>
    </div>
  );
}
