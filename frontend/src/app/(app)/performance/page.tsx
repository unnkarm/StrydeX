"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { PerformanceLog } from "@/lib/types";
import ProgressChart from "@/components/ProgressChart";

type Metric = "sprint_time_sec" | "vertical_jump_cm" | "distance_km" | "duration_min";

const TABS: { key: Metric; label: string }[] = [
  { key: "sprint_time_sec", label: "Sprint" },
  { key: "vertical_jump_cm", label: "Jump" },
  { key: "distance_km", label: "Distance" },
  { key: "duration_min", label: "Training" },
];

export default function PerformancePage() {
  const { me, loading: meLoading } = useCurrentUser();
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Metric>("sprint_time_sec");
  const [form, setForm] = useState({
    sprint_time_sec: "",
    vertical_jump_cm: "",
    distance_km: "",
    duration_min: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (meLoading || !me) return;
    api
      .myPerformanceLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [me, meLoading]);

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addPerformanceLog({
        sprint_time_sec: form.sprint_time_sec ? Number(form.sprint_time_sec) : null,
        vertical_jump_cm: form.vertical_jump_cm ? Number(form.vertical_jump_cm) : null,
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        duration_min: form.duration_min ? Number(form.duration_min) : null,
        notes: form.notes || null,
      });
      const fresh = await api.myPerformanceLogs();
      setLogs(fresh);
      setForm({ sprint_time_sec: "", vertical_jump_cm: "", distance_km: "", duration_min: "", notes: "" });
    } finally {
      setSaving(false);
    }
  }

  const bestSprint = logs.filter((l) => l.sprint_time_sec != null).sort((a, b) => a.sprint_time_sec! - b.sprint_time_sec!)[0]?.sprint_time_sec;
  const bestJump = logs.filter((l) => l.vertical_jump_cm != null).sort((a, b) => b.vertical_jump_cm! - a.vertical_jump_cm!)[0]?.vertical_jump_cm;
  const bestDistance = logs.filter((l) => l.distance_km != null).sort((a, b) => b.distance_km! - a.distance_km!)[0]?.distance_km;

  const activityLabel = (l: PerformanceLog) => {
    if (l.sprint_time_sec != null) return "Sprint";
    if (l.vertical_jump_cm != null) return "Jump";
    if (l.distance_km != null) return "Distance";
    if (l.duration_min != null) return "Training";
    return "Session";
  };
  const resultLabel = (l: PerformanceLog) => {
    if (l.sprint_time_sec != null) return `${l.sprint_time_sec}s`;
    if (l.vertical_jump_cm != null) return `${l.vertical_jump_cm}cm`;
    if (l.distance_km != null) return `${l.distance_km}km`;
    if (l.duration_min != null) return `${l.duration_min}min`;
    return "—";
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-heading text-2xl">Performance</h1>
      </div>

      <div className="lane-rule my-6" />

      <div className="flex gap-2 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 ${
              tab === t.key ? "border-accent text-accent" : "border-border text-muted hover:border-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted">Loading...</div>
        ) : (
          <ProgressChart logs={logs} metric={tab} />
        )}
      </div>

      <h2 className="display-heading mt-10 text-sm text-muted">Personal Records</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface px-5 py-4">
          <div className="text-xs uppercase tracking-widest text-muted">Sprint PB</div>
          <div className="stat-value mt-1 text-2xl text-accent">{bestSprint ?? "—"}{bestSprint != null && "s"}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface px-5 py-4">
          <div className="text-xs uppercase tracking-widest text-muted">Vertical Jump</div>
          <div className="stat-value mt-1 text-2xl text-foreground">{bestJump ?? "—"}{bestJump != null && "cm"}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface px-5 py-4">
          <div className="text-xs uppercase tracking-widest text-muted">Best Distance</div>
          <div className="stat-value mt-1 text-2xl text-foreground">{bestDistance ?? "—"}{bestDistance != null && "km"}</div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="display-heading text-sm text-muted">Training History</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-widest text-muted">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Activity</th>
                  <th className="px-4 py-2.5">Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted">
                      No sessions logged yet.
                    </td>
                  </tr>
                )}
                {[...logs]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0 odd:bg-surface/40">
                      <td className="px-4 py-2.5 text-muted">
                        {new Date(l.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5">{activityLabel(l)}</td>
                      <td className="stat-value px-4 py-2.5">{resultLabel(l)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="display-heading text-sm text-muted">+ Add Log</h2>
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
              disabled={saving}
              className="col-span-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add session"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
