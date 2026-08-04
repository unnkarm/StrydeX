"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import { api } from "@/lib/api";
import type {
  AthleteProfile,
  DailyCheckin,
  PerformanceLog,
  Trends,
  PersonalRecordEntry,
  Prediction,
  InjuryRisk,
  Readiness,
  IntelligenceSummary,
} from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const RISK_COLOR: Record<string, string> = {
  low: "var(--accent)",
  moderate: "#f2c14e",
  high: "var(--clay)",
  critical: "#e4572e",
};

type Suggestion = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "positive" | "info";
};

const SUGGESTION_STYLE: Record<Suggestion["priority"], string> = {
  high: "border-clay/50 bg-clay/10 text-clay",
  medium: "border-[#f2c14e]/50 bg-[#f2c14e]/10 text-[#f2c14e]",
  positive: "border-accent/40 bg-accent/10 text-accent",
  info: "border-border bg-surface-2 text-foreground",
};

function buildSuggestions(
  summary: IntelligenceSummary | null,
  injuryRisk: InjuryRisk | null,
  readiness: Readiness | null,
  performanceLogCount: number
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (injuryRisk?.risk_band === "critical" || injuryRisk?.risk_band === "high") {
    suggestions.push({
      title: "Prioritize recovery",
      detail: `Your injury-risk estimate is ${injuryRisk.risk_pct}%. Reduce high-intensity load and review the risk factors with a coach or qualified clinician before the next hard session.`,
      priority: "high",
    });
  } else if (injuryRisk?.risk_band === "moderate") {
    suggestions.push({
      title: "Adjust today’s load",
      detail: "Keep the session controlled, extend the warm-up, and monitor fatigue or soreness before adding intensity.",
      priority: "medium",
    });
  } else if (injuryRisk?.risk_band === "low") {
    suggestions.push({
      title: "Maintain your recovery habits",
      detail: "Injury risk is currently low. Progress training load gradually and keep recovery data current.",
      priority: "positive",
    });
  }

  const readinessScore = readiness?.readiness_pct;
  if (readinessScore == null) {
    suggestions.push({
      title: "Complete today’s readiness check-in",
      detail: "Add sleep, activity, and heart-rate data to receive an ML readiness score before planning training intensity.",
      priority: "info",
    });
  } else if (readinessScore < 40) {
    suggestions.push({
      title: "Choose a recovery session",
      detail: "Readiness is low. Favor rest, mobility, hydration, and easy aerobic work instead of maximal efforts.",
      priority: "high",
    });
  } else if (readinessScore < 60) {
    suggestions.push({
      title: "Train below maximum intensity",
      detail: "Readiness is moderate. Reduce volume or intensity and reassess during the warm-up.",
      priority: "medium",
    });
  } else if (readinessScore >= 80) {
    suggestions.push({
      title: "Use the high-readiness window",
      detail: "Readiness is strong. If you feel well, schedule a quality session while keeping workload controlled.",
      priority: "positive",
    });
  } else {
    suggestions.push({
      title: "Follow the normal training plan",
      detail: "Readiness is good. Proceed as planned and continue monitoring recovery after the session.",
      priority: "positive",
    });
  }

  if (summary?.sprint_trend_pct != null && summary.sprint_trend_pct < 0) {
    suggestions.push({
      title: "Review the performance decline",
      detail: `Your recent score trend is ${summary.sprint_trend_pct}%. Review training load, sleep, and technique before increasing volume.`,
      priority: "medium",
    });
  } else if (summary?.sprint_trend_pct != null && summary.sprint_trend_pct > 0) {
    suggestions.push({
      title: "Build on the positive trend",
      detail: `Performance is trending up ${summary.sprint_trend_pct}%. Keep what is working and avoid sudden load increases.`,
      priority: "positive",
    });
  }

  if (performanceLogCount < 4) {
    suggestions.push({
      title: "Log more performance sessions",
      detail: `You have ${performanceLogCount} logged session${performanceLogCount === 1 ? "" : "s"}. Add at least four across multiple days for more useful trends and predictions.`,
      priority: "info",
    });
  }

  return suggestions.slice(0, 4);
}

type ReadinessForm = {
  total_steps: string;
  calories: string;
  very_active_minutes: string;
  fairly_active_minutes: string;
  lightly_active_minutes: string;
  sedentary_minutes: string;
  total_minutes_asleep: string;
  total_time_in_bed: string;
  avg_heart_rate: string;
};

const EMPTY_CHECKIN: ReadinessForm = {
  total_steps: "",
  calories: "",
  very_active_minutes: "",
  fairly_active_minutes: "",
  lightly_active_minutes: "",
  sedentary_minutes: "",
  total_minutes_asleep: "",
  total_time_in_bed: "",
  avg_heart_rate: "",
};

function CheckinForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [form, setForm] = useState<ReadinessForm>(EMPTY_CHECKIN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields: Array<[keyof ReadinessForm, string]> = [
    ["total_steps", "Total steps (steps)"],
    ["calories", "Calories burned (kcal)"],
    ["very_active_minutes", "Very active time (min)"],
    ["fairly_active_minutes", "Fairly active time (min)"],
    ["lightly_active_minutes", "Lightly active time (min)"],
    ["sedentary_minutes", "Sedentary time (min)"],
    ["total_minutes_asleep", "Time asleep (min)"],
    ["total_time_in_bed", "Time in bed (min)"],
    ["avg_heart_rate", "Average heart rate (bpm)"],
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.submitCheckin(
        Object.fromEntries(
          Object.entries(form).map(([key, value]) => [key, Number(value)])
        )
      );
      setForm(EMPTY_CHECKIN);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {fields.map(([key, label]) => (
        <label key={key} className="text-xs text-muted">
          {label}
          <input
            required
            type="number"
            min="0"
            step="any"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
      ))}

      {error && <div className="sm:col-span-3 text-xs text-clay">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="sm:col-span-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Predicting readiness..." : "Submit wearable data"}
      </button>
    </form>
  );
}

function AthleteSidebar({ profile }: { profile: AthleteProfile | null }) {
  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "A";

  return (
    <aside className="h-fit rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-24">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted">
        Athlete profile
      </p>

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-xl font-semibold text-accent">
        {initials}
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        {profile?.name || "Athlete"}
      </h2>

      <p className="mt-1 text-sm text-accent">
        {profile?.sport || "Sport not set"}
      </p>

      <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Position</p>
          <p className="mt-1 text-foreground">{profile?.position || "Not set"}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Region</p>
          <p className="mt-1 text-foreground">{profile?.region || "Not set"}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Username</p>
          <p className="mt-1 break-all text-foreground">
            {profile?.username ? `@${profile.username}` : "Not set"}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            profile?.verified
              ? "bg-accent/10 text-accent"
              : "bg-surface-2 text-muted"
          }`}
        >
          {profile?.verified ? "Verified athlete" : "Not verified"}
        </span>
      </div>
    </aside>
  );
}

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [records, setRecords] = useState<PersonalRecordEntry[] | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [injuryRisk, setInjuryRisk] = useState<InjuryRisk | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [performanceLogs, setPerformanceLogs] = useState<PerformanceLog[]>([]);
  const [readinessLogs, setReadinessLogs] = useState<DailyCheckin[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    try {
      const [
        profileData,
        summaryData,
        trendsData,
        recordsData,
        predictionData,
        injuryData,
        readinessData,
        performanceLogData,
        readinessLogData,
      ] = await Promise.all([
        api.myProfile(),
        api.intelligenceSummary(),
        api.trends(),
        api.records(),
        api.prediction("performance_metric"),
        api.injuryRisk(),
        api.readiness(),
        api.myPerformanceLogs(),
        api.readinessHistory(),
      ]);

      setProfile(profileData);
      setSummary(summaryData);
      setTrends(trendsData);
      setRecords(recordsData);
      setPrediction(predictionData);
      setInjuryRisk(injuryData);
      setReadiness(readinessData);
      setPerformanceLogs(performanceLogData);
      setReadinessLogs(readinessLogData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const chartData =
    trends?.sprint_time.points.map((point) => ({
      date: new Date(point.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      performance: point.value,
    })) || [];

  const suggestions = buildSuggestions(
    summary,
    injuryRisk,
    readiness,
    performanceLogs.length
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <AthleteSidebar profile={profile} />

        <section>
        <h1 className="display-heading mb-1 text-3xl font-semibold text-foreground">
          Athlete intelligence
        </h1>
        <p className="mb-8 text-sm text-muted">
          ML performance predictions, injury-risk estimation, wearable readiness, trends, and records.
        </p>

        {error && (
          <div className="mb-6 rounded-md border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay">
            {error}
          </div>
        )}

        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard compact label="Best score" value={summary?.sprint_pb ?? "—"} unit={summary?.sprint_pb != null ? "/100" : undefined} accent />
          <StatCard
            compact
            label="Trend"
            value={
              summary?.sprint_trend_pct != null
                ? `${summary.sprint_trend_pct > 0 ? "+" : ""}${summary.sprint_trend_pct}%`
                : "—"
            }
          />
          <StatCard
            compact
            label="New best"
            value={summary?.new_pb_days_ago != null ? `${summary.new_pb_days_ago}d ago` : "—"}
          />
          <StatCard compact label="Predicted score" value={summary?.predicted_next_month ?? "—"} unit={summary?.predicted_next_month != null ? "/100" : undefined} />
          <StatCard compact label="Injury risk" value={summary?.injury_risk_pct != null ? `${summary.injury_risk_pct}%` : "—"} />
          <StatCard compact label="Readiness" value={summary?.readiness_pct != null ? `${summary.readiness_pct}%` : "—"} />
        </div>

        <section className="mb-10 rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium text-foreground">Suggested next steps</h2>
              <p className="mt-1 text-xs text-muted">
                Prioritized from your latest ML estimates and training history
              </p>
            </div>
            <span className="text-[11px] text-muted">Guidance only · adjust to how you feel</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <div
                key={`${suggestion.title}-${suggestion.priority}`}
                className={`rounded-md border p-4 ${SUGGESTION_STYLE[suggestion.priority]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium">{suggestion.title}</h3>
                  <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] uppercase tracking-wider opacity-80">
                    {suggestion.priority === "positive" ? "on track" : suggestion.priority}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">{suggestion.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-1 text-sm font-medium text-foreground">Performance-score trend</h2>
            <p className="mb-4 text-xs text-muted">Predicted scores from your logged sessions</p>
            {chartData.length >= 2 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#2b362c" strokeDasharray="4 6" />
                    <XAxis dataKey="date" stroke="#8c978c" fontSize={12} />
                    <YAxis stroke="#8c978c" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "#1f2a20",
                        border: "1px solid #2b362c",
                        borderRadius: 8,
                        color: "#eaefe7",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="performance"
                      stroke="#d4ff4f"
                      strokeWidth={2}
                      dot={{ fill: "#d4ff4f", r: 3 }}
                      name="Performance score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-md border border-border bg-surface-2 text-sm text-muted">
                Log more performance sessions to see a trend.
              </div>
            )}
            {trends && trends.insights.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-muted">
                {trends.insights.map((line, index) => (
                  <li key={index}>• {line}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-1 text-sm font-medium text-foreground">ML performance prediction</h2>
            <p className="mb-4 text-xs text-muted">Random Forest prediction from your latest session inputs</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="stat-value text-xl text-foreground">
                  {prediction?.current != null ? `${prediction.current}/100` : "—"}
                </div>
                <div className="mt-1 text-[11px] text-muted">Current</div>
              </div>
              <div>
                <div className="stat-value text-xl text-accent">
                  {prediction?.predicted_30d != null ? `${prediction.predicted_30d}/100` : "—"}
                </div>
                <div className="mt-1 text-[11px] text-muted">Predicted</div>
              </div>
              <div>
                <div className="stat-value text-xl text-foreground">0–100</div>
                <div className="mt-1 text-[11px] text-muted">Scale</div>
              </div>
            </div>
            {prediction?.note && <p className="mt-4 text-xs text-muted">{prediction.note}</p>}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-1 text-sm font-medium text-foreground">Personal-best timeline</h2>
            <p className="mb-4 text-xs text-muted">Every time your predicted performance score reached a new high</p>
            <div className="max-h-72 space-y-2 overflow-auto">
              {!records || records.length === 0 ? (
                <div className="text-sm text-muted">No records yet — log a few sessions first.</div>
              ) : (
                [...records].reverse().map((record, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                      record.is_current_best
                        ? "border-accent/50 bg-accent/10"
                        : "border-border bg-surface-2"
                    }`}
                  >
                    <div>
                      <div className="text-foreground">{record.label}</div>
                      <div className="text-[11px] text-muted">
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="stat-value text-foreground">
                        {record.value} <span className="text-xs text-muted">{record.unit}</span>
                      </div>
                      {record.is_current_best && <div className="text-[11px] text-accent">Current best</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-1 text-sm font-medium text-foreground">ML injury risk</h2>
            <p className="mb-4 text-xs text-muted">Classification model using athlete, load, recovery, and fatigue features</p>
            {injuryRisk ? (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="stat-value text-3xl"
                    style={{ color: RISK_COLOR[injuryRisk.risk_band] || "var(--foreground)" }}
                  >
                    {injuryRisk.risk_pct}%
                  </div>
                  <div
                    className="rounded-full px-3 py-1 text-xs font-medium capitalize"
                    style={{
                      color: RISK_COLOR[injuryRisk.risk_band] || "var(--foreground)",
                      background: `${RISK_COLOR[injuryRisk.risk_band] || "#888"}22`,
                    }}
                  >
                    {injuryRisk.risk_band} risk
                  </div>
                </div>
                <ul className="space-y-1 text-xs text-muted">
                  {injuryRisk.reasons.map((reason, index) => (
                    <li key={index}>• {reason}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted">Add a performance session to calculate injury risk.</p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
            <h2 className="mb-1 text-sm font-medium text-foreground">Wearable readiness prediction</h2>
            <p className="mb-4 text-xs text-muted">
              Submit Fitbit-style activity, sleep, and heart-rate inputs for an ML readiness score.
            </p>

            {readiness?.readiness_pct != null && (
              <div className="mb-4 flex items-center gap-4 rounded-md border border-border bg-surface-2 p-4">
                <div className="stat-value text-3xl text-accent">{readiness.readiness_pct}%</div>
                <div className="text-sm text-foreground">{readiness.recommendation}</div>
              </div>
            )}

            <CheckinForm onSubmitted={loadAll} />
          </section>

          <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
            <h2 className="mb-1 text-sm font-medium text-foreground">Previous performance logs</h2>
            <p className="mb-4 text-xs text-muted">Your most recently logged performance sessions</p>
            {performanceLogs.length === 0 ? (
              <p className="text-sm text-muted">No performance sessions logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 font-medium">Sport / event</th>
                      <th className="pb-3 pr-4 font-medium">Score</th>
                      <th className="pb-3 pr-4 font-medium">Training</th>
                      <th className="pb-3 font-medium">Sleep</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {performanceLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 pr-4 text-muted">{new Date(log.date).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-foreground">
                          {log.sport_type} <span className="text-muted">· {log.event}</span>
                        </td>
                        <td className="py-3 pr-4 font-medium text-accent">
                          {log.performance_metric != null ? `${log.performance_metric}/100` : "—"}
                        </td>
                        <td className="py-3 pr-4 text-foreground">
                          {log.training_intensity} <span className="text-muted">· {log.training_hours_per_week != null ? `${log.training_hours_per_week}h/wk` : "N/A"}</span>
                        </td>
                        <td className="py-3 text-foreground">{log.sleep_hours_per_night != null ? `${log.sleep_hours_per_night}h` : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
            <h2 className="mb-1 text-sm font-medium text-foreground">Previous readiness logs</h2>
            <p className="mb-4 text-xs text-muted">Your readiness predictions and wearable inputs</p>
            {readinessLogs.length === 0 ? (
              <p className="text-sm text-muted">No readiness check-ins logged yet.</p>
            ) : (
              <div className="space-y-3">
                {readinessLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-border bg-surface-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted">{new Date(log.date).toLocaleString()}</p>
                        <p className="mt-1 text-sm text-foreground">{log.recommendation || "No recommendation available."}</p>
                      </div>
                      <div className="stat-value text-2xl text-accent">
                        {log.readiness_score != null ? `${log.readiness_score}%` : "—"}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                      <span>{log.total_steps.toLocaleString()} steps</span>
                      <span>{Math.round((log.total_minutes_asleep / 60) * 10) / 10}h sleep</span>
                      <span>{log.avg_heart_rate} bpm average HR</span>
                      <span>{log.calories.toLocaleString()} calories</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        </section>
      </div>
    </div>
  );
}
