"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { FrameSample } from "@/lib/types";
import { angleKey } from "@/lib/pose";

export default function JointAngleGraph({
  frameSeries,
  joint,
  jointLabel,
  currentTime,
  onSeek,
}: {
  frameSeries: FrameSample[];
  joint: string;
  jointLabel: string;
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const data = frameSeries.map((f) => ({
    t: f.t,
    left: f.ang[angleKey(joint, "left")],
    right: f.ang[angleKey(joint, "right")],
  }));

  const hasLeft = data.some((d) => d.left !== undefined);
  const hasRight = data.some((d) => d.right !== undefined);

  if (!hasLeft && !hasRight) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
        Not enough pose data detected for {jointLabel.toLowerCase()}.
      </div>
    );
  }

  return (
    <div className="h-56 rounded-lg border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
          onClick={(e) => {
            if (e && typeof e.activeLabel === "number") onSeek(e.activeLabel);
          }}
        >
          <CartesianGrid stroke="#2b362c" strokeDasharray="4 6" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            stroke="#8c978c"
            fontSize={12}
            tickFormatter={(v: number) => `${v.toFixed(1)}s`}
          />
          <YAxis stroke="#8c978c" fontSize={12} unit={"\u00b0"} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "#1f2a20",
              border: "1px solid #2b362c",
              borderRadius: 8,
              color: "#eaefe7",
            }}
            labelFormatter={(v) => `${Number(v).toFixed(2)}s`}
          />
          <ReferenceLine x={currentTime} stroke="#d4ff4f" strokeWidth={2} />
          {hasLeft && (
            <Line type="monotone" dataKey="left" stroke="#d4ff4f" strokeWidth={2} dot={false} name={`Left ${jointLabel}`} connectNulls />
          )}
          {hasRight && (
            <Line type="monotone" dataKey="right" stroke="#e4572e" strokeWidth={2} dot={false} name={`Right ${jointLabel}`} connectNulls />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
