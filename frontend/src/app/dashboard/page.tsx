"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { AthleteProfile, PerformanceLog, VideoItem } from "@/lib/types";
import StatCard from "@/components/StatCard";
import ProgressChart from "@/components/ProgressChart";
import { EVENTS_BY_SPORT, SPORTS } from "@/lib/sports";

type PerformanceForm = {
  sport_type: string;
  event: string;
  training_hours_per_week: string;
  average_heart_rate: string;
  bmi: string;
  sleep_hours_per_night: string;
  daily_caloric_intake: string;
  hydration_level: string;
  injury_history: string;
  previous_competition_performance: string;
  training_intensity: string;
  resting_heart_rate: string;
  body_fat_percentage: string;
  vo2_max: string;
  event_distance: string;
  altitude_training: string;
  mental_focus_level: string;
};

const EMPTY_FORM: PerformanceForm = {
  sport_type: "",
  event: "",
  training_hours_per_week: "",
  average_heart_rate: "",
  bmi: "",
  sleep_hours_per_night: "",
  daily_caloric_intake: "",
  hydration_level: "",
  injury_history: "None",
  previous_competition_performance: "",
  training_intensity: "Medium",
  resting_heart_rate: "",
  body_fat_percentage: "",
  vo2_max: "",
  event_distance: "",
  altitude_training: "No",
  mental_focus_level: "",
};

const NUMERIC_FIELDS: Array<[keyof PerformanceForm, string]> = [
  ["training_hours_per_week", "Training time (h/week)"],
  ["average_heart_rate", "Average heart rate (bpm)"],
  ["bmi", "BMI (kg/m²)"],
  ["sleep_hours_per_night", "Sleep (h/night)"],
  ["daily_caloric_intake", "Daily calories (kcal/day)"],
  ["hydration_level", "Hydration level (%)"],
  ["previous_competition_performance", "Previous performance (score/100)"],
  ["resting_heart_rate", "Resting heart rate (bpm)"],
  ["body_fat_percentage", "Body fat (%)"],
  ["vo2_max", "VO₂ max (mL/kg/min)"],
  ["event_distance", "Event distance (m)"],
  ["mental_focus_level", "Mental focus (score/10)"],
];

export default function DashboardPage() {
  const { me, loading: meLoading } = useCurrentUser();
  const router = useRouter();

  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [profileMissing, setProfileMissing] = useState(false);
  const [logForm, setLogForm] = useState<PerformanceForm>(EMPTY_FORM);
  const [customSport, setCustomSport] = useState("");
  const [customEvent, setCustomEvent] = useState("");
  const [naFields, setNaFields] = useState<Set<keyof PerformanceForm>>(new Set());
  const [savingLog, setSavingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const eventOptions = useMemo(() => {
    if (logForm.sport_type) {
      return EVENTS_BY_SPORT[logForm.sport_type] || [];
    }
    return Array.from(new Set(Object.values(EVENTS_BY_SPORT).flat())).sort();
  }, [logForm.sport_type]);

  useEffect(() => {
    if (meLoading) return;
    if (!me) {
      router.push("/login");
      return;
    }
    if (me.role !== "athlete") return;

    api.myProfile().then(setProfile).catch(() => setProfileMissing(true));
    api.myPerformanceLogs().then(setLogs).catch(() => {});
    api.myVideos().then(setVideos).catch(() => {});
  }, [me, meLoading, router]);

  const latestScore = useMemo(
    () => logs.find((log) => log.performance_metric != null)?.performance_metric,
    [logs]
  );

  const bestScore = useMemo(() => {
    const scores = logs
      .map((log) => log.performance_metric)
      .filter((score): score is number => score != null);
    return scores.length ? Math.max(...scores) : null;
  }, [logs]);

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    setSavingLog(true);
    setLogError(null);

    try {
      const numeric = (key: keyof PerformanceForm) => {
        const value = logForm[key].trim();
        return naFields.has(key) || value === "" ? null : Number(value);
      };

      await api.addPerformanceLog({
        sport_type: logForm.sport_type === "Other" ? customSport.trim() : logForm.sport_type,
        event: logForm.event === "Other" ? customEvent.trim() : logForm.event,
        training_hours_per_week: numeric("training_hours_per_week"),
        average_heart_rate: numeric("average_heart_rate"),
        bmi: numeric("bmi"),
        sleep_hours_per_night: numeric("sleep_hours_per_night"),
        daily_caloric_intake: numeric("daily_caloric_intake"),
        hydration_level: numeric("hydration_level"),
        injury_history: logForm.injury_history,
        previous_competition_performance: numeric("previous_competition_performance"),
        training_intensity: logForm.training_intensity,
        resting_heart_rate: numeric("resting_heart_rate"),
        body_fat_percentage: numeric("body_fat_percentage"),
        vo2_max: numeric("vo2_max"),
        event_distance: numeric("event_distance"),
        altitude_training: logForm.altitude_training,
        mental_focus_level: numeric("mental_focus_level"),
      });

      const fresh = await api.myPerformanceLogs();
      setLogs(fresh);
      setLogForm(EMPTY_FORM);
      setCustomSport("");
      setCustomEvent("");
      setNaFields(new Set());
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Failed to add performance log");
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-heading text-3xl">Hello, {profile.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.sport || "—"} &middot; {profile.position || "—"}
            {profile.verified && <span className="ml-2 text-accent">✔ Verified</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/analytics" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90">
            Open analytics
          </Link>
          <Link href="/profile/edit" className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">
            Edit profile
          </Link>
          <Link href="/upload" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
            Upload video
          </Link>
          <Link href={`/u/${profile.username}`} className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent">
            View public page
          </Link>
        </div>
      </div>

      <div className="lane-rule my-8" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Sessions logged" value={logs.length} />
        <StatCard label="Latest score" value={latestScore ?? "—"} unit={latestScore != null ? "/100" : undefined} accent />
        <StatCard label="Best score" value={bestScore ?? "—"} unit={bestScore != null ? "/100" : undefined} />
        <StatCard label="Videos analyzed" value={videos.length} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="display-heading text-sm text-muted">Performance-score trend</h2>
          <div className="mt-3">
            <ProgressChart logs={logs} />
          </div>

          <h2 className="display-heading mt-8 text-sm text-muted">Log an ML performance session</h2>
          <form onSubmit={handleAddLog} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted">
              Sport type
              <select
                required
                value={logForm.sport_type}
                onChange={(e) => {
                  const sport = e.target.value;
                  setLogForm((form) => ({
                    ...form,
                    sport_type: sport,
                    event: "",
                  }));
                  if (sport !== "Other") setCustomSport("");
                  setCustomEvent("");
                }}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="" disabled>Select a sport</option>
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
                <option value="N/A">N/A</option>
                <option value="Other">Other / not listed</option>
              </select>
            </label>
            {logForm.sport_type === "Other" && (
              <label className="text-xs text-muted">
                Enter sport
                <input
                  required
                  value={customSport}
                  onChange={(e) => setCustomSport(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </label>
            )}
            <label className="text-xs text-muted">
              Event
              <select
                required
                value={logForm.event}
                onChange={(e) => {
                  const event = e.target.value;
                  setLogForm((form) => ({ ...form, event }));
                  if (event !== "Other") setCustomEvent("");
                }}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="" disabled>Select an event</option>
                {eventOptions.map((event) => (
                  <option key={event} value={event}>{event}</option>
                ))}
                <option value="N/A">N/A</option>
                <option value="Other">Other / not listed</option>
              </select>
            </label>
            {logForm.event === "Other" && (
              <label className="text-xs text-muted">
                Enter event
                <input
                  required
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </label>
            )}

            {NUMERIC_FIELDS.map(([key, label]) => {
              const isNA = naFields.has(key);
              return (
              <label key={key} className="text-xs text-muted">
                <span className="flex items-center justify-between gap-2">
                  {label}
                  <span className="flex items-center gap-1 text-[11px] normal-case tracking-normal">
                    <input
                      type="checkbox"
                      checked={isNA}
                      onChange={(e) => {
                        setNaFields((current) => {
                          const next = new Set(current);
                          if (e.target.checked) next.add(key);
                          else next.delete(key);
                          return next;
                        });
                      }}
                    />
                    N/A
                  </span>
                </span>
                <input
                  required={!isNA}
                  disabled={isNA}
                  type="number"
                  step="any"
                  min="0"
                  value={logForm[key]}
                  onChange={(e) => setLogForm((form) => ({ ...form, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                />
              </label>
              );
            })}

            <label className="text-xs text-muted">
              Injury history
              <select
                value={logForm.injury_history}
                onChange={(e) => setLogForm((form) => ({ ...form, injury_history: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="None">None</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Unknown">N/A</option>
              </select>
            </label>

            <label className="text-xs text-muted">
              Training intensity
              <select
                value={logForm.training_intensity}
                onChange={(e) => setLogForm((form) => ({ ...form, training_intensity: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Unknown">N/A</option>
              </select>
            </label>

            <label className="text-xs text-muted">
              Altitude training
              <select
                value={logForm.altitude_training}
                onChange={(e) => setLogForm((form) => ({ ...form, altitude_training: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
                <option value="Unknown">N/A</option>
              </select>
            </label>

            {logError && <div className="sm:col-span-2 text-sm text-clay">{logError}</div>}

            <button
              type="submit"
              disabled={savingLog}
              className="sm:col-span-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
            >
              {savingLog ? "Predicting and saving..." : "Predict performance and save session"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="display-heading text-sm text-muted">Recent predictions</h2>
          <div className="mt-3 space-y-3">
            {logs.length === 0 && <p className="text-sm text-muted">No performance predictions yet.</p>}
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{log.sport_type} · {log.event}</div>
                    <div className="text-xs text-muted">{new Date(log.date).toLocaleDateString()}</div>
                  </div>
                  <div className="stat-value text-2xl text-accent">
                    {log.performance_metric?.toFixed(1) ?? "—"}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span>Training: {log.training_hours_per_week != null ? `${log.training_hours_per_week} h/week` : "N/A"}</span>
                  <span>VO₂ max: {log.vo2_max ?? "N/A"}</span>
                  <span>Intensity: {log.training_intensity}</span>
                  <span>Focus: {log.mental_focus_level ?? "N/A"}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="display-heading mt-8 text-sm text-muted">Recent videos</h2>
          <div className="mt-3 space-y-3">
            {videos.length === 0 && <p className="text-sm text-muted">No videos yet — upload your first clip.</p>}
            {videos.map((video) => (
              <div key={video.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{video.title}</div>
                  <div className="text-xs text-muted">{new Date(video.uploaded_at).toLocaleDateString()}</div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted">
                  <span>Duration: {video.duration_sec ?? "—"}s</span>
                  <span>Explosiveness: {video.est_max_speed_score ?? "—"}/100</span>
                </div>
                {video.ai_report && <p className="mt-2 text-sm text-foreground/90">{video.ai_report.summary}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
