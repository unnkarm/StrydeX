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
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6 mb-8">
        <div>
          <span className="text-xs font-mono uppercase bg-accent/10 border border-accent/30 text-accent px-2 py-0.5 rounded">
            CV Analysis Done
          </span>
          <h1 className="display-heading text-3xl mt-2">{video.title}</h1>
          <p className="text-sm text-muted mt-1">
            Sport: <span className="text-foreground font-semibold">{video.sport || "—"}</span> &middot; 
            Movement: <span className="text-foreground font-semibold">{video.movement || "—"}</span> &middot; 
            Camera: <span className="text-foreground font-semibold">{video.camera_angle || "—"}</span>
          </p>
        </div>
        <Link href="/dashboard" className="rounded-full border border-border px-5 py-2 text-xs font-medium hover:border-accent">
          ← Dashboard
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Video + Canvas & Overlay Toggles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player + Skeleton overlays */}
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

          {/* Telemetry Display Controls */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="display-heading text-sm text-accent mb-4">Pose Overlay Settings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

          {/* AI Report Card */}
          {video.ai_report && (
            <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
              <h2 className="display-heading text-lg tracking-wider text-accent border-b border-border pb-3">
                🧠 Computer Vision & AI Feedback
              </h2>

              <div>
                <span className="text-[10px] text-accent font-mono uppercase tracking-widest font-bold">Analysis Summary</span>
                <p className="text-sm text-foreground mt-2 leading-relaxed">{video.ai_report.summary}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-background border border-border rounded-lg">
                  <span className="text-[10px] text-accent font-mono uppercase tracking-widest font-bold">Strengths</span>
                  <p className="text-xs text-muted mt-2 leading-relaxed whitespace-pre-line">{video.ai_report.strengths || "Analyzing..."}</p>
                </div>

                <div className="p-4 bg-background border border-border rounded-lg">
                  <span className="text-[10px] text-clay font-mono uppercase tracking-widest font-bold">Weaknesses / Risks</span>
                  <p className="text-xs text-muted mt-2 leading-relaxed whitespace-pre-line">{video.ai_report.weaknesses || "Analyzing..."}</p>
                </div>
              </div>

              <div className="p-4 bg-background border border-border rounded-lg">
                <span className="text-[10px] text-accent font-mono uppercase tracking-widest font-bold">Recommended Drills</span>
                <p className="text-xs text-muted mt-2 leading-relaxed whitespace-pre-line">{video.ai_report.drills || "Analyzing..."}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Performance Telemetry Stats */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="display-heading text-lg tracking-wider text-accent border-b border-border pb-3 mb-5">
              📈 Telemetry Metrics
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-xs text-muted">Technique Score</span>
                <span className="font-mono text-sm font-bold text-foreground">{video.score_technique ?? "—"}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-xs text-muted">Stability Score</span>
                <span className="font-mono text-sm font-bold text-foreground">{video.score_stability ?? "—"}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-xs text-muted">Symmetry Score</span>
                <span className="font-mono text-sm font-bold text-foreground">{video.score_symmetry ?? "—"}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-xs text-muted">Efficiency Score</span>
                <span className="font-mono text-sm font-bold text-foreground">{video.score_efficiency ?? "—"}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-xs text-muted">Overall Biomechanical Score</span>
                <span className="font-mono text-sm font-bold text-accent">{video.score_overall ?? "—"}%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="display-heading text-sm text-accent mb-4">CV Joint Telemetry (Cricket)</h2>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Front-Foot Knee Angle</span>
                <span className="text-foreground">{video.avg_knee_angle_deg ? `${roundVal(video.avg_knee_angle_deg)}°` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Trunk Lean at Release</span>
                <span className="text-foreground">{video.avg_trunk_lean_deg ? `${roundVal(video.avg_trunk_lean_deg)}°` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Bat / Bowler Arm Speed</span>
                <span className="text-foreground">{video.est_max_speed_score ? `${roundVal(video.est_max_speed_score)} m/s` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Release / Contact Height</span>
                <span className="text-foreground">{video.estimated_cadence_spm ? `${roundVal(video.estimated_cadence_spm / 100)} m` : "—"}</span>
              </div>
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
