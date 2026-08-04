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

export default function ProgressChart({ logs }: { logs: PerformanceLog[] }) {
  const data = [...logs]
    }));

  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
      </div>
    );
  }

  return (
    <div className="h-56 rounded-lg border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#2b362c" strokeDasharray="4 6" />
          <XAxis dataKey="date" stroke="#8c978c" fontSize={12} />
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
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
