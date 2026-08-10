"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteProfile, DailyCheckin, PerformanceLog, IntelligenceSummary } from "@/lib/types";

function Interactive3DChart({ points }: { points: { month: string; score: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState({ x: -0.3, y: 0.5 });
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 250;
    };
    resize();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const scale = Math.min(width, height) * 0.4;
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw 3D bounding box corners
      const corners = [
        { x: -1, y: -0.8, z: -1 }, { x: 1, y: -0.8, z: -1 }, { x: 1, y: 0.8, z: -1 }, { x: -1, y: 0.8, z: -1 },
        { x: -1, y: -0.8, z: 1 }, { x: 1, y: -0.8, z: 1 }, { x: 1, y: 0.8, z: 1 }, { x: -1, y: 0.8, z: 1 }
      ];

      const projectedCorners = corners.map((c) => {
        let x1 = c.x * Math.cos(rotation.y) - c.z * Math.sin(rotation.y);
        let z1 = c.x * Math.sin(rotation.y) + c.z * Math.cos(rotation.y);
        let y2 = c.y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
        let z2 = c.y * Math.sin(rotation.x) + z1 * Math.cos(rotation.x);

        const dist = 4;
        const s = dist / (dist + z2);
        return { px: centerX + x1 * scale * s, py: centerY + y2 * scale * s };
      });

      // Draw grid outline edges
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];
      edges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(projectedCorners[a].px, projectedCorners[a].py);
        ctx.lineTo(projectedCorners[b].px, projectedCorners[b].py);
        ctx.stroke();
      });

      // Plot data points in 3D space
      if (points.length > 0) {
        const data3d = points.map((p, idx) => {
          const pctX = points.length > 1 ? (idx / (points.length - 1)) * 1.6 - 0.8 : 0;
          const pctY = ((p.score - 50) / 50) * 1.2 - 0.6; // score range
          const pctZ = Math.sin(idx * 1.5) * 0.4;
          return { x: pctX, y: -pctY, z: pctZ, score: p.score, month: p.month };
        });

        const projectedData = data3d.map((pt) => {
          let x1 = pt.x * Math.cos(rotation.y) - pt.z * Math.sin(rotation.y);
          let z1 = pt.x * Math.sin(rotation.y) + pt.z * Math.cos(rotation.y);
          let y2 = pt.y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
          let z2 = pt.y * Math.sin(rotation.x) + z1 * Math.cos(rotation.x);

          const dist = 4;
          const s = dist / (dist + z2);
          return { px: centerX + x1 * scale * s, py: centerY + y2 * scale * s, score: pt.score, month: pt.month };
        });

        // Draw connecting 3D line
        ctx.strokeStyle = "var(--accent)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        projectedData.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.px, pt.py);
          else ctx.lineTo(pt.px, pt.py);
        });
        ctx.stroke();

        // Draw nodes and tooltips
        projectedData.forEach((pt) => {
          ctx.shadowColor = "var(--accent)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "var(--accent)";
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${pt.score}`, pt.px, pt.py - 10);
          ctx.fillStyle = "#8c978c";
          ctx.fillText(pt.month, pt.px, pt.py + 15);
        });
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [points, rotation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    prevMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - prevMouse.current.x;
    const dy = e.clientY - prevMouse.current.y;
    setRotation((r) => ({
      x: Math.max(-Math.PI / 3, Math.min(Math.PI / 3, r.x - dy * 0.01)),
      y: r.y - dx * 0.01
    }));
    prevMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing select-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <span className="absolute bottom-2 right-2 text-[9px] font-mono text-muted bg-background/80 border border-border px-2 py-0.5 rounded">
        🖱️ Click & Drag to Rotate in 3D
      </span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [performanceLogs, setPerformanceLogs] = useState<PerformanceLog[]>([]);
  const [readinessLogs, setReadinessLogs] = useState<DailyCheckin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setError(null);
    try {
      const [profileData, summaryData, performanceLogData, readinessLogData] = await Promise.all([
        api.myProfile(),
        api.intelligenceSummary(),
        api.myPerformanceLogs(),
        api.readinessHistory(),
      ]);

      setProfile(profileData);
      setSummary(summaryData);
      setPerformanceLogs(performanceLogData);
      setReadinessLogs(readinessLogData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) return <div className="px-6 py-16 text-muted">Loading intelligence board...</div>;

  // Trajectory points mapping
  const points = summary?.historical_scores || [];

  // Bar progress blocks
  const trainingLoadVal = 78;
  const readinessVal = summary?.readiness_pct || 87;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6 mb-8">
        <div>
          <h1 className="display-heading text-3xl">Analytics & Intelligence</h1>
          <p className="text-sm text-muted mt-1">
            Data visualizations and predictive metrics for {profile?.name || "Athlete"}.
          </p>
        </div>
        <Link href="/dashboard" className="rounded-full border border-border px-5 py-2 text-xs font-medium hover:border-accent">
          ← Dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Board Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Overall Performance */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2 className="display-heading text-xs text-muted tracking-widest uppercase mb-4">Overall Performance</h2>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-mono font-bold text-foreground">{summary?.overall_score || 84}</span>
              <span className="text-lg font-mono text-accent">↑ {summary?.overall_change_pct || 8}%</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-background border border-border rounded-lg text-center">
                <span className="text-[10px] text-muted font-mono uppercase">Batting Rating</span>
                <div className="text-2xl font-bold font-mono mt-1 text-foreground">{summary?.speed_score || 91}</div>
              </div>
              <div className="p-4 bg-background border border-border rounded-lg text-center">
                <span className="text-[10px] text-muted font-mono uppercase">Bowling Rating</span>
                <div className="text-2xl font-bold font-mono mt-1 text-foreground">{summary?.technique_score || 86}</div>
              </div>
              <div className="p-4 bg-background border border-border rounded-lg text-center">
                <span className="text-[10px] text-muted font-mono uppercase">Fielding Rating</span>
                <div className="text-2xl font-bold font-mono mt-1 text-foreground">{summary?.endurance_score || 81}</div>
              </div>
            </div>
          </div>

          {/* Section 2: Performance Trajectory */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2 className="display-heading text-xs text-muted tracking-widest uppercase mb-4">Performance Trajectory</h2>
            
            <div className="relative h-[280px] bg-background/50 rounded-lg border border-border overflow-hidden">
              <Interactive3DChart points={points} />
            </div>
          </div>

        </div>

        {/* Right Side: Training Load, Readiness, Injury Risk */}
        <div className="space-y-8">
          
          {/* Training Load */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2 className="display-heading text-xs text-muted tracking-widest uppercase mb-4">Training Load</h2>
            <div className="flex justify-between items-center mb-2 font-mono text-sm">
              <span className="text-muted">This week</span>
              <span className="text-foreground font-bold">{trainingLoadVal}%</span>
            </div>
            
            {/* Visual block bar */}
            <div className="flex gap-1.5 h-6">
              {Array.from({ length: 10 }).map((_, idx) => {
                const isActive = idx < Math.round(trainingLoadVal / 10);
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-sm transition-colors ${
                      isActive ? "bg-accent" : "bg-surface-2 border border-border"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Readiness */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2 className="display-heading text-xs text-muted tracking-widest uppercase mb-4">Readiness</h2>
            <div className="flex justify-between items-center mb-2 font-mono text-sm">
              <span className="text-muted">Recovery State</span>
              <span className="text-accent font-bold">{readinessVal}%</span>
            </div>

            <div className="w-full bg-surface-2 h-3 rounded-full overflow-hidden border border-border">
              <div className="bg-accent h-full transition-all duration-500" style={{ width: `${readinessVal}%` }} />
            </div>
            <p className="text-xs text-muted mt-3 italic">
              {summary?.readiness_recommendation || "Your body is primed for optimal performance today."}
            </p>
          </div>

          {/* Injury Risk */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2 className="display-heading text-xs text-muted tracking-widest uppercase mb-4">Injury Risk</h2>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold font-mono text-clay uppercase">
                {summary?.injury_risk_band || "LOW"}
              </span>
              <span className="text-xs bg-clay/10 border border-clay/30 text-clay px-2 py-0.5 rounded font-mono font-bold">
                {summary?.injury_risk_pct || 12}% RISK
              </span>
            </div>

            <div className="border-t border-border pt-4">
              <span className="text-[10px] text-muted font-mono uppercase tracking-widest block mb-2">Primary Factors</span>
              <ul className="space-y-1 text-xs text-muted font-mono">
                <li>• Recovery & sleep</li>
                <li>• Training load spikes</li>
                <li>• Movement asymmetry (left-leg stability)</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
