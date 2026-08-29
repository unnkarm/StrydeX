"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { AthleteProfile, PerformanceLog, VideoItem } from "@/lib/types";
import { EVENTS_BY_SPORT } from "@/lib/sports";
import StatCard from "@/components/StatCard";
import ProgressChart from "@/components/ProgressChart";

const EMPTY_RESULT_FORM = {
  competition_category: "men", environment: "outdoor", event: "100m Sprint",
  result_value: "", wind_speed_mps: "", approach_speed_mps: "", takeoff_velocity_mps: "",
  takeoff_angle_deg: "", takeoff_contact_time_ms: "", approach_consistency_pct: "",
  board_accuracy_cm: "", takeoff_distance_cm: "", reactive_strength_index: "",
  vertical_jump_cm: "", weight_lifted_kg: "", sleep_hours_per_night: "",
  mental_focus_level: "", fatigue_score: "", soreness_score: "", session_rpe: "",
  pain_present: false,
};

const JUMP_CONTEXT_FIELDS = [
  ["approach_speed_mps", "Approach speed (m/s)", "0.01"],
  ["takeoff_velocity_mps", "Take-off velocity (m/s)", "0.01"],
  ["takeoff_angle_deg", "Take-off angle (°)", "0.1"],
  ["takeoff_contact_time_ms", "Contact time (ms)", "1"],
  ["approach_consistency_pct", "Approach consistency (%)", "0.1"],
  ["board_accuracy_cm", "Board error—long jump (cm)", "0.1"],
  ["takeoff_distance_cm", "Take-off distance—high jump (cm)", "0.1"],
  ["reactive_strength_index", "Reactive strength index", "0.01"],
  ["vertical_jump_cm", "Vertical jump (cm)", "0.1"],
  ["weight_lifted_kg", "Lower-body strength test (kg)", "0.1"],
  ["sleep_hours_per_night", "Sleep (hours)", "0.1"],
  ["mental_focus_level", "Mental focus (/10)", "0.1"],
  ["fatigue_score", "Fatigue (/10)", "0.1"],
  ["soreness_score", "Soreness (/10)", "0.1"],
  ["session_rpe", "Session RPE (/10)", "0.1"],
] as const;

export default function DashboardPage() {
  const { me, loading: meLoading } = useCurrentUser();
  const router = useRouter();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_RESULT_FORM });

  useEffect(() => {
    if (meLoading) return;
    if (!me) { router.push("/login"); return; }
    if (me.role !== "athlete") return;
    api.myProfile().then(setProfile).catch(() => setProfileMissing(true));
    api.myPerformanceLogs().then(setLogs).catch(() => {});
    api.myVideos().then(setVideos).catch(() => {});
  }, [me, meLoading, router]);

  async function logResult(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const optionalNumber = (value: string) => value === "" ? undefined : Number(value);
    try {
      await api.addPerformanceLog({
        sport_type: "Athletics", event: form.event,
        competition_category: form.competition_category, environment: form.environment,
        result_value: Number(form.result_value),
        wind_speed_mps: optionalNumber(form.wind_speed_mps),
        approach_speed_mps: optionalNumber(form.approach_speed_mps),
        takeoff_velocity_mps: optionalNumber(form.takeoff_velocity_mps),
        takeoff_angle_deg: optionalNumber(form.takeoff_angle_deg),
        takeoff_contact_time_ms: optionalNumber(form.takeoff_contact_time_ms),
        approach_consistency_pct: optionalNumber(form.approach_consistency_pct),
        board_accuracy_cm: optionalNumber(form.board_accuracy_cm),
        takeoff_distance_cm: optionalNumber(form.takeoff_distance_cm),
        reactive_strength_index: optionalNumber(form.reactive_strength_index),
        vertical_jump_cm: optionalNumber(form.vertical_jump_cm),
        weight_lifted_kg: optionalNumber(form.weight_lifted_kg),
        sleep_hours_per_night: optionalNumber(form.sleep_hours_per_night),
        mental_focus_level: optionalNumber(form.mental_focus_level),
        fatigue_score: optionalNumber(form.fatigue_score),
        soreness_score: optionalNumber(form.soreness_score),
        session_rpe: optionalNumber(form.session_rpe),
        pain_present: form.pain_present,
      });
      setLogs(await api.myPerformanceLogs());
      setForm({ ...EMPTY_RESULT_FORM, competition_category: form.competition_category, environment: form.environment, event: form.event });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not score result"); }
    finally { setSaving(false); }
  }

  if (meLoading || !me) return <div className="px-6 py-16 text-muted">Loading...</div>;
  if (me.role !== "athlete") return <div className="mx-auto max-w-2xl px-6 py-16"><h1 className="display-heading text-2xl">Dashboard</h1><p className="mt-3 text-muted">Signed in as {me.role}. <Link href="/scout" className="text-accent">Search athletes</Link>.</p></div>;
  if (profileMissing) return <div className="mx-auto max-w-md px-6 py-16 text-center"><h1 className="display-heading text-2xl">Set up your profile</h1><Link href="/profile/edit" className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-accent-ink">Create profile</Link></div>;
  if (!profile) return <div className="px-6 py-16 text-muted">Loading...</div>;

  const scored = logs.filter((log) => log.performance_metric != null);
  const latest = scored[0];
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="display-heading text-3xl">Hello, {profile.name.split(" ")[0]}</h1><p className="mt-1 text-sm text-muted">{profile.sport || "Athletics"} · {profile.position || "—"}</p></div><div className="flex gap-3"><Link href="/analytics" className="rounded-full border border-border px-4 py-2 text-sm">Analytics</Link><Link href={`/u/${profile.username}`} className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink">Public page</Link></div></div>
      <div className="lane-rule my-8" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><StatCard label="Scored results" value={scored.length} /><StatCard label="Videos analyzed" value={videos.length} /><StatCard label="Latest score" value={latest?.performance_metric ?? "—"} accent={Boolean(latest)} /><StatCard label="WA points" value={latest?.world_athletics_points ?? "—"} /></div>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section><h2 className="display-heading text-xl">Performance trend</h2><div className="mt-3"><ProgressChart logs={logs} /></div></section>
        <section className="rounded-lg border border-border bg-surface p-5"><h2 className="display-heading text-xl">Log an athletics result</h2><form onSubmit={logResult} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs uppercase tracking-widest text-muted">Category<select value={form.competition_category} onChange={(e) => setForm({ ...form, competition_category: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"><option value="men">Men</option><option value="women">Women</option></select></label>
          <label className="text-xs uppercase tracking-widest text-muted">Environment<select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"><option value="outdoor">Outdoor</option><option value="indoor">Indoor</option></select></label>
          <label className="sm:col-span-2 text-xs uppercase tracking-widest text-muted">Event<select value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground">{EVENTS_BY_SPORT.Athletics.map((event) => <option key={event}>{event}</option>)}</select></label>
          <label className="text-xs uppercase tracking-widest text-muted">Result<input type="number" step="any" min="0" required value={form.result_value} onChange={(e) => setForm({ ...form, result_value: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground" /></label>
          <label className="text-xs uppercase tracking-widest text-muted">Wind m/s (optional)<input type="number" step="0.1" value={form.wind_speed_mps} onChange={(e) => setForm({ ...form, wind_speed_mps: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground" /></label>
          <details className="sm:col-span-2 rounded-md border border-border bg-background/40 p-3">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-widest text-accent">Personalised jump context (optional)</summary>
            <p className="mt-2 text-xs text-muted">Used for long/high-jump driver analysis and recommendations. These values never alter the objective result score.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {JUMP_CONTEXT_FIELDS.map(([key, label, step]) => (
                <label key={key} className="text-xs text-muted">{label}<input type="number" min="0" step={step} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground" /></label>
              ))}
              <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={form.pain_present} onChange={(e) => setForm({ ...form, pain_present: e.target.checked })} />Pain present during or after the session</label>
            </div>
          </details>
          {error && <p className="sm:col-span-2 text-sm text-clay">{error}</p>}
          <button type="submit" disabled={saving} className="sm:col-span-2 rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink disabled:opacity-50">{saving ? "Scoring..." : "Score and save result"}</button>
        </form></section>
      </div>
    </div>
  );
}
