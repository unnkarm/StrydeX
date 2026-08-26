"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { VideoItem } from "@/lib/types";
import PoseCanvas, { OverlayFlags } from "@/components/PoseCanvas";

function FuturisticLoader() {
  const [steps, setSteps] = useState([
    { id: 1, text: "Initializing pose analysis models...", status: "active" },
    { id: 2, text: "Extracting biomechanical skeletal landmarks...", status: "pending" },
    { id: 3, text: "Calculating joint flexion angles...", status: "pending" },
    { id: 4, text: "Running bilateral symmetry analytics...", status: "pending" },
  ]);

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setSteps((s) => s.map((step) => step.id === 1 ? { ...step, status: "done" } : step.id === 2 ? { ...step, status: "active" } : step));
      }, 800),
      setTimeout(() => {
        setSteps((s) => s.map((step) => step.id === 2 ? { ...step, status: "done" } : step.id === 3 ? { ...step, status: "active" } : step));
      }, 1600),
      setTimeout(() => {
        setSteps((s) => s.map((step) => step.id === 3 ? { ...step, status: "done" } : step.id === 4 ? { ...step, status: "active" } : step));
      }, 2400),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mx-auto max-w-md px-6 py-24 flex flex-col items-center justify-center font-mono">
      <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-8" />
      <h2 className="display-heading text-sm text-foreground mb-4 uppercase tracking-widest text-center">
        Analyzing Movement Telemetry
      </h2>
      <div className="w-full space-y-2.5 text-xs text-left max-w-sm bg-surface p-4 border border-border rounded-lg shadow-xl">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <span className="font-bold">
              {s.status === "done" && <span className="text-accent">✓</span>}
              {s.status === "active" && <span className="text-foreground animate-ping">·</span>}
              {s.status === "pending" && <span className="text-muted">○</span>}
            </span>
            <span className={s.status === "done" ? "text-accent font-medium" : s.status === "active" ? "text-foreground font-semibold" : "text-muted"}>
              {s.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = Number(params?.id);

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Overlay toggles
  const [overlays, setOverlays] = useState<OverlayFlags>({
    skeleton: true,
    jointPoints: true,
    jointAngles: true,
    movementPath: true,
    centerOfMass: false,
    heatmap: false,
  });

  useEffect(() => {
    if (!videoId) return;

    api
      .getVideo(videoId)
      .then((data) => {
        setVideo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load video details");
        setLoading(false);
      });
  }, [videoId]);

  if (loading) return <FuturisticLoader />;
  if (error || !video) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="display-heading text-xl text-clay">Error</h1>
        <p className="mt-2 text-muted">{error || "Video analysis not found."}</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-full bg-accent px-6 py-2 text-xs font-bold text-accent-ink">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const fileUrl = api.videoFileUrl(video.id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8 animate-fade-in">
      {/* Back button & Type */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded">
            {video.movement || "BATTING / FRONT-FOOT DRIVE"}
          </span>
          <h1 className="display-heading text-2xl font-bold mt-2 text-foreground">{video.title}</h1>
        </div>
        <Link href="/dashboard" className="text-xs font-mono text-muted hover:text-accent">
          ← Back to Command Center
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 animate-slide-up">
        {/* Left: Video Player */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              src={fileUrl}
              controls
              playsInline
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
            />
            {video.frame_series && video.frame_series.length > 0 && (
              <PoseCanvas
                videoRef={videoRef}
                frameSeries={video.frame_series}
                overlays={overlays}
              />
            )}
          </div>

          {/* AI COACH Card */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🧠</span>
              <span className="text-xs font-mono uppercase tracking-widest text-accent font-bold">AI Coach feedback</span>
            </div>
            
            <div className="p-4 bg-background border border-border rounded-lg space-y-2">
              <span className="text-[10px] text-accent font-mono uppercase tracking-widest font-bold">✦ AI INSIGHT</span>
              <p className="text-xs text-muted leading-relaxed">
                "You are getting into position earlier, but your head drifts outside the line during contact."
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => alert("Showing analysis frames... Head displacement highlighted in Frame 42.")}
                className="flex-1 py-2.5 text-xs font-mono rounded border border-border bg-surface-2 text-foreground transition-all duration-300 transform hover:scale-[1.02] active:scale-95 hover:border-accent"
              >
                [ Show me why ]
              </button>
              <button 
                onClick={() => alert("Recommended drills added: Front-Foot alignment drill (3x8 balls), head stability shadow-work.")}
                className="flex-1 py-2.5 text-xs font-mono rounded border border-border bg-surface-2 text-accent transition-all duration-300 transform hover:scale-[1.02] active:scale-95 hover:border-accent"
              >
                [ Recommended drills ]
              </button>
            </div>
          </div>
        </div>

        {/* Right: Technique Score & Metrics */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <span className="text-[10px] text-muted font-mono uppercase tracking-widest font-bold block">
              AI Technique Score
            </span>
            <div className="text-5xl font-mono font-extrabold text-foreground flex items-baseline gap-2">
              84 <span className="text-xs text-accent font-bold">↑ +7%</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <h2 className="display-heading text-sm text-accent uppercase tracking-widest font-mono">
              Technique Breakdown
            </h2>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Head stability</span>
                <span className="text-foreground font-bold">91</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Balance</span>
                <span className="text-foreground font-bold">87</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Foot movement</span>
                <span className="text-foreground font-bold font-mono">79</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Bat path</span>
                <span className="text-foreground font-bold font-mono">83</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted">Contact point</span>
                <span className="text-foreground font-bold font-mono">88</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="display-heading text-xs text-muted mb-4 uppercase tracking-widest font-mono">Pose Overlay Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(overlays).map((key) => {
                const checked = overlays[key as keyof OverlayFlags];
                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase());
                return (
                  <label key={key} className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setOverlays((o) => ({ ...o, [key]: e.target.checked }))
                      }
                      className="rounded bg-background border-border text-accent focus:ring-accent"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function roundVal(v: number): number {
  return Math.round(v * 10) / 10;
}
