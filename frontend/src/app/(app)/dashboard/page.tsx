"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [savingLog, setSavingLog] = useState(false);
  const [form, setForm] = useState({
    sprint_time_sec: "",
    vertical_jump_cm: "",
    distance_km: "",
    duration_min: "",
    notes: "",
  });

  useEffect(() => {
    if (meLoading) return;
    if (!me) {
      router.push("/login");
      return;
    }
    if (me.role !== "athlete") return;

    api
      .myProfile()
      .then((data) => {
        setProfile(data);
        setProfileMissing(false);
      })
      .catch(() => {
        setProfileMissing(true);
      });

    api.myPerformanceLogs().then(setLogs).catch(() => setLogs([]));
    api.myVideos().then(setVideos).catch(() => setVideos([]));
  }, [me, meLoading, router]);

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    setSavingLog(true);

    try {
      await api.addPerformanceLog({
        sprint_time_sec: form.sprint_time_sec ? Number(form.sprint_time_sec) : null,
        vertical_jump_cm: form.vertical_jump_cm ? Number(form.vertical_jump_cm) : null,
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        duration_min: form.duration_min ? Number(form.duration_min) : null,
        notes: form.notes || null,
      });

      const freshLogs = await api.myPerformanceLogs();
      setLogs(freshLogs);
      setForm({
        sprint_time_sec: "",
        vertical_jump_cm: "",
        distance_km: "",
        duration_min: "",
        notes: "",
      });
    } finally {
      setSavingLog(false);
    }
  }

  const latestSprint = [...logs].filter((l) => l.sprint_time_sec != null)[0]?.sprint_time_sec;
  const latestJump = [...logs].filter((l) => l.vertical_jump_cm != null)[0]?.vertical_jump_cm;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function handleShare() {
    if (!profile) return;
    const url = `${window.location.origin}/u/${profile.username}`;
    navigator.clipboard?.writeText(url);
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
          href="/onboarding"
          className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-medium text-accent-ink"
        >
          Create profile
        </Link>
      </div>
    );
  }

  if (!profile) return <div className="px-6 py-16 text-muted">Loading...</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-heading text-3xl">
            {greeting}, {profile.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted">
            {profile.sport || "—"} &middot; {profile.position || "—"}
            {profile.verified && <span className="ml-2 text-accent">✔ Verified</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/u/${profile.username}`} className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">
            View public page
          </Link>
          <Link href="/performance" className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">
            + Log Training
          </Link>
          <Link href="/upload" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
            ↑ Upload Video
          </Link>
          <button
            onClick={handleShare}
            className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent"
          >
            ↗ Share Portfolio
          </button>
        </div>
      </div>

      <div className="lane-rule my-8" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Sessions logged" value={logs.length} />
        <StatCard label="Videos analyzed" value={videos.length} />
        <StatCard label="Latest sprint" value={latestSprint ?? "—"} unit={latestSprint != null ? "s" : undefined} />
        <StatCard label="Latest jump" value={latestJump ?? "—"} unit={latestJump != null ? "cm" : undefined} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="display-heading text-sm text-muted">Performance trend</h2>
          <div className="mt-3">
            <ProgressChart logs={logs} />
          </div>
        </div>

        <div>
          <h2 className="display-heading text-sm text-muted">Quick log</h2>
          <form onSubmit={handleAddLog} className="mt-3 grid grid-cols-2 gap-3">
            <input
              placeholder="Sprint time (s)"
              value={form.sprint_time_sec}
              onChange={(e) => setForm((f) => ({ ...f, sprint_time_sec: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Vertical jump (cm)"
              value={form.vertical_jump_cm}
              onChange={(e) => setForm((f) => ({ ...f, vertical_jump_cm: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Distance (km)"
              value={form.distance_km}
              onChange={(e) => setForm((f) => ({ ...f, distance_km: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Duration (min)"
              value={form.duration_min}
              onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="col-span-2 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={savingLog}
              className="col-span-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
            >
              {savingLog ? "Saving..." : "Add session"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
