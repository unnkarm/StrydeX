"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { PerformanceLog } from "@/lib/types";

type Metric = "sprint_time_sec" | "vertical_jump_cm" | "distance_km" | "duration_min";

const METRIC_META: Record<Metric, { label: string; unit: string; reversed: boolean }> = {
  sprint_time_sec: { label: "Sprint time", unit: "s", reversed: true },
  vertical_jump_cm: { label: "Vertical jump", unit: "cm", reversed: false },
  distance_km: { label: "Distance", unit: "km", reversed: false },
  duration_min: { label: "Session duration", unit: "min", reversed: false },
};

export default function ProgressChart({
  logs,
  metric = "sprint_time_sec",
}: {
  logs: PerformanceLog[];
  metric?: Metric;
}) {
  const meta = METRIC_META[metric];
  const data = [...logs]
    .filter((l) => l[metric] != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((l) => ({
      date: new Date(l.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: l[metric],
    }));

  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
        Log at least 2 sessions with {meta.label.toLowerCase()} to see a trend.
      </div>
    );
  }

  return (
    <div className="h-56 rounded-lg border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#2b362c" strokeDasharray="4 6" />
          <XAxis dataKey="date" stroke="#8c978c" fontSize={12} />
          <YAxis stroke="#8c978c" fontSize={12} reversed={meta.reversed} domain={["auto", "auto"]} />
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
            dataKey="value"
            stroke="#d4ff4f"
            strokeWidth={2}
            dot={{ fill: "#d4ff4f", r: 3 }}
            name={`${meta.label} (${meta.unit})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
