"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { AthleteProfile, PerformanceLog, VideoItem } from "@/lib/types";
import StatCard from "@/components/StatCard";
import ProgressChart from "@/components/ProgressChart";

export default function DashboardPage() {
  const { me, loading: meLoading } = useCurrentUser();
  const router = useRouter();

  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [profileMissing, setProfileMissing] = useState(false);
  const [logForm, setLogForm] = useState({
    sprint_time_sec: "",
    vertical_jump_cm: "",
    distance_km: "",
    duration_min: "",
    notes: "",
  });
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    if (meLoading) return;
    if (!me) {
      router.push("/login");
      return;
    }
    if (me.role !== "athlete") return;

    api
      .myProfile()
      .then((p) => setProfile(p))
      .catch(() => setProfileMissing(true));
    api.myPerformanceLogs().then(setLogs).catch(() => {});
    api.myVideos().then(setVideos).catch(() => {});
  }, [me, meLoading, router]);

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    setSavingLog(true);
    try {
      await api.addPerformanceLog({
        sprint_time_sec: logForm.sprint_time_sec ? Number(logForm.sprint_time_sec) : null,
        vertical_jump_cm: logForm.vertical_jump_cm ? Number(logForm.vertical_jump_cm) : null,
        distance_km: logForm.distance_km ? Number(logForm.distance_km) : null,
        duration_min: logForm.duration_min ? Number(logForm.duration_min) : null,
        notes: logForm.notes || null,
      });
      const fresh = await api.myPerformanceLogs();
      setLogs(fresh);
      setLogForm({ sprint_time_sec: "", vertical_jump_cm: "", distance_km: "", duration_min: "", notes: "" });
    } finally {
      setSavingLog(false);
    }
  }

  if (meLoading || !me) return <div className="px-6 py-16 text-muted">Loading...</div>;

  if (me.role !== "athlete") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="display-heading text-2xl">Dashboard</h1>
        <p className="mt-3 text-muted">
          You&apos;re signed in as a {me.role}. Head to{" "}
          <Link href="/scout" className="text-accent hover:underline">
            Scout
          </Link>{" "}
          to search athletes.
        </p>
      </div>
    );
  }

  if (profileMissing) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="display-heading text-2xl">Set up your profile</h1>
        <p className="mt-3 text-muted">Create your athlete profile to unlock your dashboard.</p>
        <Link
          href="/profile/edit"
          className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-medium text-accent-ink"
        >
          Create profile
        </Link>
      </div>
    );
  }

  if (!profile) return <div className="px-6 py-16 text-muted">Loading...</div>;

  const latestSprint = [...logs].filter((l) => l.sprint_time_sec != null)[0]?.sprint_time_sec;
  const latestJump = [...logs].filter((l) => l.vertical_jump_cm != null)[0]?.vertical_jump_cm;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-heading text-3xl">Hello, {profile.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.sport || "—"} &middot; {profile.position || "—"}
            {profile.verified && <span className="ml-2 text-accent">✔ Verified</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/profile/edit" className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">
            Edit profile
          </Link>
          <Link href="/upload" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
            Upload video
          </Link>
          <Link
            href={`/u/${profile.username}`}
            className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent"
          >
            View public page
          </Link>
        </div>
      </div>

      <div className="lane-rule my-8" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Sessions logged" value={logs.length} />
        <StatCard label="Sprint PB" value={latestSprint ?? "—"} unit={latestSprint ? "s" : undefined} accent />
        <StatCard label="Vertical jump" value={latestJump ?? "—"} unit={latestJump ? "cm" : undefined} />
        <StatCard label="Videos analyzed" value={videos.length} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="display-heading text-sm text-muted">Sprint time trend</h2>
          <div className="mt-3">
            <ProgressChart logs={logs} />
          </div>

          <h2 className="display-heading mt-8 text-sm text-muted">Log a session</h2>
          <form onSubmit={handleAddLog} className="mt-3 grid grid-cols-2 gap-3">
            <input
              placeholder="Sprint time (s)"
              value={logForm.sprint_time_sec}
              onChange={(e) => setLogForm((f) => ({ ...f, sprint_time_sec: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Vertical jump (cm)"
              value={logForm.vertical_jump_cm}
              onChange={(e) => setLogForm((f) => ({ ...f, vertical_jump_cm: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Distance (km)"
              value={logForm.distance_km}
              onChange={(e) => setLogForm((f) => ({ ...f, distance_km: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Duration (min)"
              value={logForm.duration_min}
              onChange={(e) => setLogForm((f) => ({ ...f, duration_min: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Notes"
              value={logForm.notes}
              onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
              className="col-span-2 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={savingLog}
              className="col-span-2 rounded-full bg-surface-2 border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
            >
              {savingLog ? "Saving..." : "Add session"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="display-heading text-sm text-muted">Recent videos</h2>
          <div className="mt-3 space-y-3">
            {videos.length === 0 && (
              <p className="text-sm text-muted">No videos yet — upload your first clip.</p>
            )}
            {videos.map((v) => (
              <div key={v.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{v.title}</div>
                  <div className="text-xs text-muted">{new Date(v.uploaded_at).toLocaleDateString()}</div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted">
                  <span>Duration: {v.duration_sec ?? "—"}s</span>
                  <span>Explosiveness: {v.est_max_speed_score ?? "—"}/100</span>
                  {v.score_overall != null && <span>AI Score: {v.score_overall}/100</span>}
                </div>
                {v.ai_report && (
                  <p className="mt-2 text-sm text-foreground/90">{v.ai_report.summary}</p>
                )}
                <Link
                  href={`/upload?video=${v.id}`}
                  className="mt-3 inline-block text-xs text-accent hover:underline"
                >
                  View full analysis →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
