"use client";

import type { MovementPhase } from "@/lib/types";

export default function MovementTimeline({
  phases,
  duration,
  currentTime,
  onSeek,
}: {
  phases: MovementPhase[];
  duration: number;
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  if (!duration) return null;
  const pct = (t: number) => Math.max(0, Math.min(100, (t / duration) * 100));

  return (
    <div className="mt-6">
      <div className="display-heading text-xs text-muted">Movement Timeline</div>
      <div className="mt-4 flex justify-between text-xs text-muted">
        {phases.map((p) => (
          <button
            key={p.name}
            onClick={() => onSeek(p.t)}
            className="hover:text-accent transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="relative mt-2 h-8">
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-border" />
        <div
          className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-accent transition-[width]"
          style={{ width: `${pct(currentTime)}%` }}
        />
        {phases.map((p) => (
          <button
            key={p.name}
            onClick={() => onSeek(p.t)}
            className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pct(p.t)}%` }}
            title={`${p.name} — ${p.t.toFixed(1)}s`}
          >
            <span className="block h-3 w-3 rounded-full border-2 border-background bg-accent group-hover:scale-125 transition-transform" />
          </button>
        ))}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-foreground shadow"
          style={{ left: `${pct(currentTime)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        {phases.map((p) => (
          <span key={p.name}>{p.t.toFixed(1)}s</span>
        ))}
      </div>
    </div>
  );
}
