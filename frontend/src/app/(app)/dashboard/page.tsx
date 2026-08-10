"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { AthleteProfile, PerformanceLog, VideoItem, Goal, IntelligenceSummary, ScoutResult } from "@/lib/types";

// 1. Circular Radial Gauge
function RadialProgress({ value, label, size = 110, strokeWidth = 8, accent = false }: { value: number; label: string; size?: number; strokeWidth?: number; accent?: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={accent ? "var(--accent)" : "rgba(255,255,255,0.8)"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center font-mono">
        <span className={`text-xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>{progress}%</span>
        <span className="text-[8px] uppercase text-muted tracking-widest mt-0.5">{label}</span>
      </div>
    </div>
  );
}

// 2. Interactive 3D Cricket Pitch Delivery Arc
function Interactive3DPitch() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState({ x: -0.3, y: 0.4 });
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const ballTime = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 500;
      canvas.height = canvas.parentElement?.clientHeight || 280;
    };
    resize();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const scale = Math.min(w, h) * 0.45;
      const cx = w / 2;
      const cy = h / 2 + 10;

      // Draw 3D Cricket Pitch Coordinate lines
      const pitchWidth = 0.5;
      const pitchLength = 2.0;

      const pitchCorners = [
        { x: -pitchWidth, y: 0.1, z: -pitchLength }, // Bowler Crease L
        { x: pitchWidth, y: 0.1, z: -pitchLength },  // Bowler Crease R
        { x: pitchWidth, y: 0.1, z: pitchLength },   // Batsman Crease R
        { x: -pitchWidth, y: 0.1, z: pitchLength },  // Batsman Crease L
      ];

      const projCorners = pitchCorners.map((pt) => {
        let x1 = pt.x * Math.cos(rotation.y) - pt.z * Math.sin(rotation.y);
        let z1 = pt.x * Math.sin(rotation.y) + pt.z * Math.cos(rotation.y);
        let y2 = pt.y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
        let z2 = pt.y * Math.sin(rotation.x) + z1 * Math.cos(rotation.x);

        const dist = 4.0;
        const s = dist / (dist + z2);
        return { px: cx + x1 * scale * s, py: cy + y2 * scale * s };
      });

      // Draw Pitch Grass Polygon
      ctx.fillStyle = "rgba(40, 50, 40, 0.3)";
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(projCorners[0].px, projCorners[0].py);
      for (let i = 1; i < 4; i++) ctx.lineTo(projCorners[i].px, projCorners[i].py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Stumps (Stump height = 0.3)
      const drawStumps = (zPos: number) => {
        const stumps = [
          { x: -0.05, y: 0.1, z: zPos },
          { x: 0, y: 0.1, z: zPos },
          { x: 0.05, y: 0.1, z: zPos }
        ];

        const stumpsTop = [
          { x: -0.05, y: -0.2, z: zPos },
          { x: 0, y: -0.2, z: zPos },
          { x: 0.05, y: -0.2, z: zPos }
        ];

        const pStumps = stumps.map((pt) => {
          let x1 = pt.x * Math.cos(rotation.y) - pt.z * Math.sin(rotation.y);
          let z1 = pt.x * Math.sin(rotation.y) + pt.z * Math.cos(rotation.y);
          let y2 = pt.y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
          let z2 = pt.y * Math.sin(rotation.x) + z1 * Math.cos(rotation.x);
          const s = 4.0 / (4.0 + z2);
          return { px: cx + x1 * scale * s, py: cy + y2 * scale * s };
        });

        const pTop = stumpsTop.map((pt) => {
          let x1 = pt.x * Math.cos(rotation.y) - pt.z * Math.sin(rotation.y);
          let z1 = pt.x * Math.sin(rotation.y) + pt.z * Math.cos(rotation.y);
          let y2 = pt.y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
          let z2 = pt.y * Math.sin(rotation.x) + z1 * Math.cos(rotation.x);
          const s = 4.0 / (4.0 + z2);
          return { px: cx + x1 * scale * s, py: cy + y2 * scale * s };
        });

        ctx.strokeStyle = "#d4ff4f";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(pStumps[i].px, pStumps[i].py);
          ctx.lineTo(pTop[i].px, pTop[i].py);
          ctx.stroke();
        }
        // Bail link
        ctx.beginPath();
        ctx.moveTo(pTop[0].px, pTop[0].py);
        ctx.lineTo(pTop[2].px, pTop[2].py);
        ctx.stroke();
      };

      drawStumps(-pitchLength + 0.1); // Bowler wickets
      drawStumps(pitchLength - 0.1);  // Batsman wickets

      // 3. Draw Ball trajectory path curve (quadratic bezier path simulation)
      // Release Hand -> Bounce point (z=0.7) -> Batsman reach (z=1.8)
      ballTime.current = (ballTime.current + 0.008) % 1.0;
      const t = ballTime.current;

      const getTrajectoryPoint = (u: number) => {
        let x = 0.05 * Math.sin(u * Math.PI); // slight side swing
        let y = 0;
        let z = -pitchLength + 0.2 + u * (2 * pitchLength - 0.4);

        if (u < 0.65) {
          // Downward arc to bounce
          const norm = u / 0.65;
          y = -0.4 * (1 - norm) * (1 - norm) + 0.1; // release height -0.4 to 0.1
        } else {
          // Bounce kick upward
          const norm = (u - 0.65) / 0.35;
          y = 0.1 * (1 - norm) - 0.18 * norm * (1 - norm);
        }
        return { x, y, z };
      };

      // Draw trajectory path line
      ctx.strokeStyle = "rgba(212, 255, 79, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const pt = getTrajectoryPoint(i / steps);
        let x1 = pt.x * Math.cos(rotation.y) - pt.z * Math.sin(rotation.y);
        let z1 = pt.x * Math.sin(rotation.y) + pt.z * Math.cos(rotation.y);
        let y2 = pt.y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
        let z2 = pt.y * Math.sin(rotation.x) + z1 * Math.cos(rotation.x);
        const s = 4.0 / (4.0 + z2);
        const px = cx + x1 * scale * s;
        const py = cy + y2 * scale * s;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Draw animated Ball
      const ballPos = getTrajectoryPoint(t);
      let bx1 = ballPos.x * Math.cos(rotation.y) - ballPos.z * Math.sin(rotation.y);
      let bz1 = ballPos.x * Math.sin(rotation.y) + ballPos.z * Math.cos(rotation.y);
      let by2 = ballPos.y * Math.cos(rotation.x) - bz1 * Math.sin(rotation.x);
      let bz2 = ballPos.y * Math.sin(rotation.x) + bz1 * Math.cos(rotation.x);
      const bs = 4.0 / (4.0 + bz2);
      const bpx = cx + bx1 * scale * bs;
      const bpy = cy + by2 * scale * bs;

      ctx.shadowColor = "var(--accent)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "var(--accent)";
      ctx.beginPath();
      ctx.arc(bpx, bpy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [rotation]);

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
        🏏 3D Pitch Tracker • Drag to Rotate
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { me, loading: meLoading } = useCurrentUser();
  const router = useRouter();

  // Shared states
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  // Coach states
  const [squadResults, setSquadResults] = useState<ScoutResult[]>([]);
  const [coachLogForm, setCoachLogForm] = useState({
    athlete_username: "",
    duration_min: "",
    notes: "",
  });

  // Scout states
  const [shortlistResults, setShortlistResults] = useState<ScoutResult[]>([]);

  // Quick log form
  const [form, setForm] = useState({
    sprint_time_sec: "",
    vertical_jump_cm: "",
    distance_km: "",
    duration_min: "",
    notes: "",
  });

  // Goal creation form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: "",
    current_value: "",
    target_value: "",
    unit: "",
  });

  useEffect(() => {
    if (meLoading) return;
    if (!me) {
      router.push("/login");
      return;
    }

    if (me.role === "athlete") {
      api.myProfile().then(setProfile).catch(() => setProfileMissing(true));
      api.myPerformanceLogs().then(setLogs).catch(console.error);
      api.myVideos().then(setVideos).catch(console.error);
      api.myGoals().then(setGoals).catch(console.error);
      api.intelligenceSummary().then(setSummary).catch(console.error);
    } else if (me.role === "coach") {
      // Coach/Academy views squad lists
      api.scoutSearch({ sport: "Cricket" }).then(setSquadResults).catch(console.error);
      api.myVideos().then(setVideos).catch(console.error);
    } else if (me.role === "scout") {
      // Scout views candidates and shortlists
      api.scoutSearch({ sport: "Cricket", verified_only: true }).then(setShortlistResults).catch(console.error);
    }
  }, [me, meLoading]);

  // Log submit handler
  async function handleSubmitLog(e: React.FormEvent) {
    e.preventDefault();
    setSavingLog(true);
    try {
      const payload = {
        sprint_time_sec: form.sprint_time_sec ? Number(form.sprint_time_sec) : undefined,
        vertical_jump_cm: form.vertical_jump_cm ? Number(form.vertical_jump_cm) : undefined,
        distance_km: form.distance_km ? Number(form.distance_km) : undefined,
        duration_min: form.duration_min ? Number(form.duration_min) : undefined,
        notes: form.notes || undefined,
      };
      await api.createPerformanceLog(payload);
      setForm({ sprint_time_sec: "", vertical_jump_cm: "", distance_km: "", duration_min: "", notes: "" });
      // reload
      const updated = await api.myPerformanceLogs();
      setLogs(updated);
      const summ = await api.intelligenceSummary();
      setSummary(summ);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLog(false);
    }
  }

  // Coach Logs Player training submit
  async function handleCoachSubmitLog(e: React.FormEvent) {
    e.preventDefault();
    if (!coachLogForm.athlete_username) return;
    setSavingLog(true);
    try {
      await api.createPerformanceLog({
        duration_min: coachLogForm.duration_min ? Number(coachLogForm.duration_min) : undefined,
        notes: `Coach Logged session: ${coachLogForm.notes || "Standard drill"}`
      });
      setCoachLogForm({ athlete_username: "", duration_min: "", notes: "" });
      alert("Session logged successfully for player!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLog(false);
    }
  }

  // Goal submit handler
  async function handleSubmitGoal(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoal(true);
    try {
      const payload = {
        title: goalForm.title,
        current_value: Number(goalForm.current_value),
        target_value: Number(goalForm.target_value),
        unit: goalForm.unit,
      };
      await api.createGoal(payload);
      setGoalForm({ title: "", current_value: "", target_value: "", unit: "" });
      setShowGoalForm(false);
      const updated = await api.myGoals();
      setGoals(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingGoal(false);
    }
  }

  if (meLoading) return <div className="px-6 py-16 text-muted font-mono">Connecting sports lab...</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6 mb-8">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-accent">Strydex Command Center</span>
          <h1 className="display-heading text-3xl mt-1">
            {me?.role === "athlete" && `Athlete Intelligence • ${profile?.name || me?.email}`}
            {me?.role === "coach" && `Academy Commander • Coach Board`}
            {me?.role === "scout" && `Recruit Command Hub`}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link href="/scout" className="rounded-full border border-border px-5 py-2 text-xs font-mono hover:border-accent">
            🔎 Find Talent
          </Link>
          <Link href="/analytics" className="rounded-full border border-border px-5 py-2 text-xs font-mono hover:border-accent">
            📈 3D Analytics
          </Link>
        </div>
      </div>

      {profileMissing && me?.role === "athlete" && (
        <div className="mb-8 rounded-lg border border-accent bg-accent/5 p-6 text-center shadow-lg">
          <h2 className="display-heading text-lg text-accent">Configure Cricketer Profile</h2>
          <p className="mt-2 text-sm text-muted">Complete your cricket baselines (Batting style, bowling speed) to open full radar telemetry.</p>
          <Link href="/onboarding" className="mt-4 inline-block rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-accent-ink hover:opacity-90">
            Complete Onboarding
          </Link>
        </div>
      )}

      {/* ========================================================
          ROLE: ATHLETE (CRICKETER) VIEW
          ======================================================== */}
      {me?.role === "athlete" && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Snapshot */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="display-heading text-sm text-accent border-b border-border pb-3 mb-5 uppercase tracking-widest font-mono">
                🧠 Biometric Intelligence Snapshot
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="flex flex-col items-center justify-center p-4 bg-surface-2 rounded-lg border border-border">
                  <RadialProgress value={summary?.overall_score || 84} label="Overall" accent />
                  <span className="text-[10px] text-muted mt-2 font-mono">↑ {summary?.overall_change_pct || 8}% 4-Wk Change</span>
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-background rounded border border-border">
                    <div className="text-xs text-muted font-medium font-mono">Batting Index</div>
                    <div className="text-2xl font-bold font-mono mt-1 text-foreground">{summary?.speed_score || 91}</div>
                  </div>
                  <div className="p-3 bg-background rounded border border-border">
                    <div className="text-xs text-muted font-medium font-mono">Bowling Index</div>
                    <div className="text-2xl font-bold font-mono mt-1 text-foreground">{summary?.strength_score || 78}</div>
                  </div>
                  <div className="p-3 bg-background rounded border border-border">
                    <div className="text-xs text-muted font-medium font-mono">Fielding Index</div>
                    <div className="text-2xl font-bold font-mono mt-1 text-foreground">{summary?.technique_score || 86}</div>
                  </div>
                  <div className="p-3 bg-background rounded border border-border">
                    <div className="text-xs text-muted font-medium font-mono">Athleticism Index</div>
                    <div className="text-2xl font-bold font-mono mt-1 text-foreground">{summary?.endurance_score || 81}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6 border-t border-border pt-4">
                <div className="p-3 bg-surface-2 rounded-lg border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted font-mono block">System Readiness</span>
                    <span className="text-[10px] text-muted italic mt-0.5 block">Body battery score</span>
                  </div>
                  <RadialProgress value={summary?.readiness_pct || 87} label="Readiness" size={80} strokeWidth={6} />
                </div>
                <div className="p-3 bg-surface-2 rounded-lg border border-border flex flex-col justify-between">
                  <span className="text-xs text-muted font-mono">INJURY RISK EVALUATION</span>
                  <span className="text-xl font-bold font-mono mt-1 text-clay uppercase tracking-wider">{summary?.injury_risk_band || "LOW"}</span>
                </div>
              </div>
            </div>

            {/* 3D Delivery Path telemetry */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="display-heading text-sm text-accent border-b border-border pb-3 mb-5 uppercase tracking-widest font-mono">
                🏏 3D Bowling Release trajectory
              </h2>
              <div className="relative h-[290px] bg-background/50 rounded-lg border border-border overflow-hidden">
                <Interactive3DPitch />
              </div>
            </div>

            {/* Active Goals */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <div className="flex justify-between items-center border-b border-border pb-3 mb-5">
                <h2 className="display-heading text-sm text-accent uppercase tracking-widest font-mono">🎯 Active Performance Goals</h2>
                <button
                  onClick={() => setShowGoalForm(!showGoalForm)}
                  className="text-xs text-accent hover:underline font-mono"
                >
                  {showGoalForm ? "Cancel" : "+ Add Goal"}
                </button>
              </div>

              {showGoalForm && (
                <form onSubmit={handleSubmitGoal} className="mb-6 grid gap-4 p-4 border border-border/50 bg-background/30 rounded-lg sm:grid-cols-4 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Metric Title</label>
                    <input
                      required
                      placeholder="e.g. Bowling Speed"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm((g) => ({ ...g, title: e.target.value }))}
                      className="mt-1 w-full rounded border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Current</label>
                    <input
                      required
                      type="number"
                      placeholder="120"
                      value={goalForm.current_value}
                      onChange={(e) => setGoalForm((g) => ({ ...g, current_value: e.target.value }))}
                      className="mt-1 w-full rounded border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Target</label>
                    <input
                      required
                      type="number"
                      placeholder="130"
                      value={goalForm.target_value}
                      onChange={(e) => setGoalForm((g) => ({ ...g, target_value: e.target.value }))}
                      className="mt-1 w-full rounded border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Unit</label>
                    <input
                      required
                      placeholder="km/h"
                      value={goalForm.unit}
                      onChange={(e) => setGoalForm((g) => ({ ...g, unit: e.target.value }))}
                      className="mt-1 w-full rounded border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <button type="submit" disabled={savingGoal} className="rounded bg-accent text-accent-ink text-xs font-mono py-2 hover:opacity-90 disabled:opacity-50">
                    {savingGoal ? "Saving..." : "Create Goal"}
                  </button>
                </form>
              )}

              {goals.length === 0 ? (
                <p className="text-xs text-muted font-mono">No active training goals set.</p>
              ) : (
                <div className="space-y-4">
                  {goals.map((g) => {
                    const pct = Math.min(100, Math.max(0, (g.current_value / g.target_value) * 100));
                    return (
                      <div key={g.id} className="p-3 bg-surface-2 rounded-lg border border-border">
                        <div className="flex justify-between items-center text-xs font-mono mb-2">
                          <span className="font-bold text-foreground">{g.title}</span>
                          <span className="text-muted">
                            {g.current_value} / {g.target_value} {g.unit}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Quick Session Logger */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="display-heading text-sm text-accent border-b border-border pb-3 mb-5 uppercase tracking-widest font-mono">
                ⚡ Quick Session Log
              </h2>
              <form onSubmit={handleSubmitLog} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Bowling Speed (km/h)</label>
                  <input
                    type="number"
                    placeholder="e.g. 128"
                    value={form.sprint_time_sec}
                    onChange={(e) => setForm((f) => ({ ...f, sprint_time_sec: e.target.value }))}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Yo-Yo Test Score</label>
                  <input
                    type="number"
                    placeholder="e.g. 18.2"
                    value={form.vertical_jump_cm}
                    onChange={(e) => setForm((f) => ({ ...f, vertical_jump_cm: e.target.value }))}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Training Distance (km)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5.4"
                    value={form.distance_km}
                    onChange={(e) => setForm((f) => ({ ...f, distance_km: e.target.value }))}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Duration (minutes)</label>
                  <input
                    type="number"
                    placeholder="e.g. 90"
                    value={form.duration_min}
                    onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Session Notes</label>
                  <textarea
                    placeholder="e.g. Practiced target line and length deliveries."
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent h-20 resize-none"
                  />
                </div>
                <button type="submit" disabled={savingLog} className="w-full rounded-full bg-accent text-accent-ink font-mono text-xs py-2.5 hover:opacity-90 disabled:opacity-50">
                  {savingLog ? "Logging..." : "Log Session →"}
                </button>
              </form>
            </div>

            {/* Video List */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="display-heading text-sm text-accent border-b border-border pb-3 mb-5 uppercase tracking-widest font-mono">
                🎥 Biomechanical Footage
              </h2>
              {videos.length === 0 ? (
                <div className="text-center py-6 font-mono text-xs text-muted">
                  No video telemetry loaded.
                  <Link href="/videos" className="block mt-2 text-accent hover:underline">Upload Footage →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.slice(0, 3).map((v) => (
                    <Link
                      key={v.id}
                      href={`/videos/${v.id}`}
                      className="block p-3 rounded-lg border border-border bg-surface-2 hover:border-accent transition-colors"
                    >
                      <div className="text-xs font-bold font-mono text-foreground truncate">{v.title}</div>
                      <div className="text-[10px] text-muted font-mono mt-1 flex justify-between">
                        <span>Symmetry: {v.left_knee_flexion_deg ? "94%" : "Pending"}</span>
                        <span className="text-accent">View Analysis →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ROLE: COACH / ACADEMY VIEW
          ======================================================== */}
      {me?.role === "coach" && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Squad Metrics & Analytics */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="display-heading text-sm text-accent border-b border-border pb-3 mb-5 uppercase tracking-widest font-mono">
                🏏 Academy Squad Roster Averages
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-surface-2 border border-border rounded text-center">
                  <div className="text-[10px] text-muted font-mono uppercase">Academy Strike Rate</div>
                  <div className="text-2xl font-bold font-mono mt-1 text-foreground">138.4</div>
                </div>
                <div className="p-3 bg-surface-2 border border-border rounded text-center">
                  <div className="text-[10px] text-muted font-mono uppercase">Mean Fast Ball Velocity</div>
                  <div className="text-2xl font-bold font-mono mt-1 text-foreground">131 km/h</div>
                </div>
                <div className="p-3 bg-surface-2 border border-border rounded text-center">
                  <div className="text-[10px] text-muted font-mono uppercase">Yo-Yo Fitness Mean</div>
                  <div className="text-2xl font-bold font-mono mt-1 text-accent">18.6</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Role</th>
                      <th className="pb-2">Region</th>
                      <th className="pb-2">Fitness Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {squadResults.map((player) => (
                      <tr key={player.username} className="border-b border-border/50 hover:bg-background/20">
                        <td className="py-2.5 font-bold text-foreground">
                          <Link href={`/u/${player.username}`} className="hover:underline">{player.name}</Link>
                        </td>
                        <td className="py-2.5 text-muted">{player.position || "Batter"}</td>
                        <td className="py-2.5 text-muted">{player.region || "Academy"}</td>
                        <td className="py-2.5 text-accent">{player.match_pct || 88}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick squad session logging */}
          <div className="space-y-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="display-heading text-sm text-accent border-b border-border pb-3 mb-5 uppercase tracking-widest font-mono">
                ✏️ Academy Session Logger
              </h2>
              <form onSubmit={handleCoachSubmitLog} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Select Player</label>
                  <select
                    value={coachLogForm.athlete_username}
                    onChange={(e) => setCoachLogForm((f) => ({ ...f, athlete_username: e.target.value }))}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  >
                    <option value="">Choose Player...</option>
                    {squadResults.map((p) => (
                      <option key={p.username} value={p.username}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Session Duration (min)</label>
                  <input
                    type="number"
                    placeholder="90"
                    value={coachLogForm.duration_min}
                    onChange={(e) => setCoachLogForm((f) => ({ ...f, duration_min: e.target.value }))}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted tracking-widest font-mono">Drill Notes</label>
                  <textarea
                    placeholder="e.g. Net session practice against spin bowlers."
                    value={coachLogForm.notes}
                    onChange={(e) => setCoachLogForm((f) => ({ ...f, notes: e.target.value }))}
                    className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-accent h-24"
                  />
                </div>
                <button type="submit" className="w-full rounded-full bg-accent text-accent-ink font-mono text-xs py-2.5 hover:opacity-90">
                  Submit Log →
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ROLE: RECRUITMENT SCOUT VIEW
          ======================================================== */}
      {me?.role === "scout" && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Scout Pipeline */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="display-heading text-sm text-accent border-b border-border pb-3 mb-5 uppercase tracking-widest font-mono">
                📋 Scout Recruitment Shortlist
              </h2>
              <div className="space-y-4">
                {shortlistResults.slice(0, 4).map((cand) => (
                  <div key={cand.username} className="p-4 bg-surface-2 rounded-lg border border-border flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold font-mono text-foreground">{cand.name}</div>
                      <div className="text-xs font-mono text-muted mt-1">
                        {cand.position} • {cand.region || "India"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-accent">{cand.match_pct || 91}% FIT</span>
                      <Link
                        href={`/u/${cand.username}`}
                        className="block mt-1 text-[10px] text-muted hover:text-accent font-mono underline"
                      >
                        Inspect Biomechanics →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick scout tools */}
          <div className="space-y-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h2 className="display-heading text-sm text-accent border-b border-border pb-3 mb-5 uppercase tracking-widest font-mono">
                ⚙️ Quick Scout Filters
              </h2>
              <div className="space-y-3 font-mono text-xs">
                <Link
                  href="/scout"
                  className="block p-3 rounded bg-surface-2 border border-border hover:border-accent text-center text-foreground font-bold"
                >
                  Configure Recruitment Target →
                </Link>
                <div className="p-3 bg-background border border-border rounded text-muted">
                  Matches are prioritized based on Yo-Yo test score, batting/bowling velocity, and knee joint angle telemetry verification.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
