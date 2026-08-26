"use client";

import { useState } from "react";

type SubTab = "batting" | "bowling" | "fielding" | "fitness";

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<SubTab>("batting");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      {/* Title */}
      <div className="border-b border-border pb-4">
        <span className="text-xs font-mono uppercase text-accent tracking-widest block">
          Telemetry Center
        </span>
        <h1 className="display-heading text-2xl mt-1">My Game Performance</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5 text-sm border-b border-border/50 pb-3">
        {(["batting", "bowling", "fielding", "fitness"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-full border px-4 py-1.5 capitalize font-mono text-xs transition-colors ${
              activeTab === t
                ? "border-accent bg-accent text-accent-ink"
                : "border-border text-muted hover:border-accent hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "batting" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Stats card */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
            <h2 className="display-heading text-sm text-accent uppercase tracking-widest font-mono">
              🏏 Batting Metrics
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-2 border border-border rounded">
                <span className="text-[10px] text-muted font-mono block uppercase">Average</span>
                <span className="text-2xl font-mono font-bold text-foreground mt-1 block">42.3</span>
              </div>
              <div className="p-3 bg-surface-2 border border-border rounded">
                <span className="text-[10px] text-muted font-mono block uppercase">Strike Rate</span>
                <span className="text-2xl font-mono font-bold text-foreground mt-1 block">137.4</span>
              </div>
              <div className="p-3 bg-surface-2 border border-border rounded">
                <span className="text-[10px] text-muted font-mono block uppercase">Boundary %</span>
                <span className="text-2xl font-mono font-bold text-foreground mt-1 block">18.2%</span>
              </div>
              <div className="p-3 bg-surface-2 border border-border rounded">
                <span className="text-[10px] text-muted font-mono block uppercase">Dot Ball %</span>
                <span className="text-2xl font-mono font-bold text-foreground mt-1 block">31.4%</span>
              </div>
            </div>

            {/* Strike Rate Trend */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] text-accent font-mono uppercase tracking-widest font-bold block">
                Strike Rate Progression
              </span>
              <div className="h-28 flex items-end justify-between font-mono text-[10px] text-muted bg-background/50 border border-border rounded p-4 select-none">
                <div className="flex flex-col h-full justify-between pr-2 text-right">
                  <span>150</span>
                  <span>130</span>
                  <span>110</span>
                </div>
                <div className="flex-1 flex justify-around items-end h-full pt-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-4 bg-accent/20 h-10 rounded-t" />
                    <span>Jan</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-4 bg-accent/40 h-14 rounded-t" />
                    <span>Feb</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-4 bg-accent/60 h-16 rounded-t" />
                    <span>Mar</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-4 bg-accent/80 h-15 rounded-t" />
                    <span>Apr</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-4 bg-accent h-20 rounded-t" />
                    <span>May</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wagon wheel scoring zones */}
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col justify-between">
            <div>
              <h2 className="display-heading text-sm text-accent uppercase tracking-widest font-mono mb-4">
                🎯 Wagon Wheel — Scoring Zones
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Visual representation of shot locations and runs split based on verified training sessions.
              </p>
            </div>

            <div className="my-6 relative flex justify-center items-center h-48 border border-border/50 bg-background/30 rounded-lg overflow-hidden">
              {/* Outer boundary circle */}
              <div className="w-36 h-36 rounded-full border border-dashed border-muted/30 flex items-center justify-center relative">
                <span className="absolute text-[8px] text-muted/40 font-mono top-1">Off Side</span>
                <span className="absolute text-[8px] text-muted/40 font-mono bottom-1">Leg Side</span>
                
                {/* Scoring lines */}
                <svg className="w-full h-full absolute inset-0 transform rotate-45 pointer-events-none">
                  {/* Third man */}
                  <line x1="50%" y1="50%" x2="10%" y2="20%" stroke="var(--accent)" strokeWidth="1.5" />
                  {/* Cover drive */}
                  <line x1="50%" y1="50%" x2="30%" y2="90%" stroke="var(--accent)" strokeWidth="2.5" />
                  {/* Mid wicket */}
                  <line x1="50%" y1="50%" x2="90%" x2="60%" stroke="var(--accent)" strokeWidth="2" />
                  {/* Fine leg */}
                  <line x1="50%" y1="50%" x2="80%" y2="10%" stroke="var(--clay)" strokeWidth="1" />
                </svg>

                {/* Pitch outline center */}
                <div className="w-3 h-8 bg-surface border border-border" />
              </div>
            </div>

            <div className="text-[10px] font-mono text-muted flex justify-between bg-surface-2 p-2.5 rounded border border-border">
              <span>Off-side scoring: 64% (Cover dominant)</span>
              <span>Leg-side scoring: 36%</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "bowling" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Stats card */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
            <h2 className="display-heading text-sm text-accent uppercase tracking-widest font-mono">
              🏏 Bowling Metrics
            </h2>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Avg Pace</span>
                <span className="text-foreground font-bold">132 km/h</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Accuracy</span>
                <span className="text-foreground font-bold">82%</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Release consistency</span>
                <span className="text-foreground font-bold">76%</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Line consistency</span>
                <span className="text-foreground font-bold">88%</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Length consistency</span>
                <span className="text-foreground font-bold">79%</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Run-up consistency</span>
                <span className="text-foreground font-bold">91%</span>
              </div>
            </div>

            <div className="p-4 bg-background border border-border rounded-lg">
              <span className="text-[10px] text-accent font-mono uppercase tracking-widest font-bold block mb-1">✦ AI INSIGHT</span>
              <p className="text-xs text-muted leading-relaxed">
                Your pace is stable, but your release point is varying by ~11 cm across deliveries. Likely impact: inconsistent length. Focus: release-point consistency.
              </p>
            </div>
          </div>

          {/* Pitch delivery map */}
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col justify-between">
            <div>
              <h2 className="display-heading text-sm text-accent uppercase tracking-widest font-mono mb-4">
                🏏 Bowling Pitch Delivery Map
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Delivery landing locations colored by length type and outcome:
              </p>
              <div className="flex gap-3 text-[9px] font-mono text-muted mt-2">
                <span className="flex items-center gap-1">🟢 Wicket</span>
                <span className="flex items-center gap-1">🟡 Dot ball</span>
                <span className="flex items-center gap-1">🔴 Boundary</span>
              </div>
            </div>

            <div className="my-6 flex justify-center items-center h-48 border border-border/50 bg-background/30 rounded-lg relative overflow-hidden select-none">
              <div className="w-16 h-36 bg-surface-2 border border-border relative flex flex-col justify-between items-center py-2 font-mono text-[8px] text-muted/30">
                <span>BATSMAN Crease</span>
                
                {/* Delivery land indicators */}
                <div className="absolute top-[30%] left-[45%] w-2 h-2 rounded-full bg-accent animate-ping" />
                <div className="absolute top-[30%] left-[45%] w-2 h-2 rounded-full bg-accent" />
                <div className="absolute top-[45%] left-[20%] w-2 h-2 rounded-full bg-yellow-500" />
                <div className="absolute top-[20%] left-[60%] w-2 h-2 rounded-full bg-clay" />
                <div className="absolute top-[60%] left-[30%] w-2 h-2 rounded-full bg-yellow-500" />

                <span>BOWLER Crease</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-muted bg-surface-2 p-2.5 rounded border border-border">
              AI Zone Index: 64% of your successful deliveries land in this Good Length zone.
            </div>
          </div>
        </div>
      )}

      {(activeTab === "fielding" || activeTab === "fitness") && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="display-heading text-sm text-accent uppercase tracking-widest font-mono mb-4 capitalize">
            🏏 {activeTab} Indicators
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 bg-surface-2 border border-border rounded-lg">
              <span className="text-xs text-muted font-mono block uppercase">
                {activeTab === "fielding" ? "Catch Success Rate" : "Yo-Yo Fitness Score"}
              </span>
              <span className="text-3xl font-mono font-bold text-foreground mt-2 block">
                {activeTab === "fielding" ? "88%" : "18.6"}
              </span>
            </div>
            <div className="p-4 bg-surface-2 border border-border rounded-lg">
              <span className="text-xs text-muted font-mono block uppercase">
                {activeTab === "fielding" ? "Throwing Accuracy (Direct Hits)" : "Resting Heart Rate"}
              </span>
              <span className="text-3xl font-mono font-bold text-foreground mt-2 block">
                {activeTab === "fielding" ? "74%" : "54 bpm"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
