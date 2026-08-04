"use client";

import { useEffect, useRef } from "react";
import type { FrameSample } from "@/lib/types";
import { SKELETON_BONES, nearestFrame } from "@/lib/pose";

export interface OverlayFlags {
  skeleton: boolean;
  jointPoints: boolean;
  jointAngles: boolean;
  movementPath: boolean;
  centerOfMass: boolean;
  heatmap: boolean;
}

export default function PoseCanvas({
  videoRef,
  frameSeries,
  overlays,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  frameSeries: FrameSample[];
  overlays: OverlayFlags;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas || !video) return;
      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !video || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (frameSeries.length > 0) {
        const t = video.currentTime;
        const flags = overlaysRef.current;

        // --- motion heatmap: accumulated wrist/ankle/foot positions ---
        if (flags.heatmap) {
          ctx.save();
          const heatPoints = ["left_wrist", "right_wrist", "left_ankle", "right_ankle", "left_foot_index", "right_foot_index"];
          for (const f of frameSeries) {
            for (const key of heatPoints) {
              const p = f.lm[key];
              if (!p) continue;
              const x = p[0] * w;
              const y = p[1] * h;
              const grad = ctx.createRadialGradient(x, y, 0, x, y, 22);
              grad.addColorStop(0, "rgba(228,87,46,0.28)");
              grad.addColorStop(1, "rgba(228,87,46,0)");
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(x, y, 22, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }

        // --- movement path: hip-midpoint trace up to current time ---
        if (flags.movementPath) {
          const pts: [number, number][] = [];
          for (const f of frameSeries) {
            if (f.t > t) break;
            const lh = f.lm["left_hip"];
            const rh = f.lm["right_hip"];
            if (lh && rh) pts.push([((lh[0] + rh[0]) / 2) * w, ((lh[1] + rh[1]) / 2) * h]);
          }
          if (pts.length > 1) {
            ctx.save();
            ctx.strokeStyle = "rgba(212,255,79,0.85)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
            ctx.stroke();
            ctx.restore();
          }
        }

        const frame = nearestFrame(frameSeries, t);
        if (frame) {
          const pt = (name: string): [number, number] | null => {
            const p = frame.lm[name];
            return p ? [p[0] * w, p[1] * h] : null;
          };

          // --- skeleton bones ---
          if (flags.skeleton) {
            ctx.save();
            ctx.strokeStyle = "#d4ff4f";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            for (const [a, b] of SKELETON_BONES) {
              const pa = pt(a);
              const pb = pt(b);
              if (pa && pb) {
                ctx.beginPath();
                ctx.moveTo(pa[0], pa[1]);
                ctx.lineTo(pb[0], pb[1]);
                ctx.stroke();
              }
            }
            ctx.restore();
          }

          // --- joint points ---
          if (flags.jointPoints) {
            ctx.save();
            ctx.fillStyle = "#eaefe7";
            ctx.strokeStyle = "#10160f";
            ctx.lineWidth = 1.5;
            for (const name of Object.keys(frame.lm)) {
              const p = pt(name);
              if (!p) continue;
              ctx.beginPath();
              ctx.arc(p[0], p[1], 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
            ctx.restore();
          }

          // --- center of mass (hip midpoint) ---
          if (flags.centerOfMass) {
            const lh = pt("left_hip");
            const rh = pt("right_hip");
            if (lh && rh) {
              const cx = (lh[0] + rh[0]) / 2;
              const cy = (lh[1] + rh[1]) / 2;
              ctx.save();
              ctx.fillStyle = "#e4572e";
              ctx.beginPath();
              ctx.arc(cx, cy, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#eaefe7";
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.restore();
            }
          }

          // --- joint angle labels ---
          if (flags.jointAngles) {
            ctx.save();
            ctx.font = "600 11px var(--font-mono), monospace";
            ctx.textAlign = "center";
            const labelAt = (jointName: string, angleVal: number | undefined) => {
              if (angleVal === undefined) return;
              const p = pt(jointName);
              if (!p) return;
              const text = `${Math.round(angleVal)}\u00b0`;
              const tw = ctx.measureText(text).width;
              ctx.fillStyle = "rgba(16,22,15,0.82)";
              ctx.fillRect(p[0] - tw / 2 - 4, p[1] - 22, tw + 8, 16);
              ctx.fillStyle = "#d4ff4f";
              ctx.fillText(text, p[0], p[1] - 10);
            };
            labelAt("left_knee", frame.ang.left_knee);
            labelAt("right_knee", frame.ang.right_knee);
            labelAt("left_hip", frame.ang.left_hip);
            labelAt("right_hip", frame.ang.right_hip);
            labelAt("left_ankle", frame.ang.left_ankle);
            labelAt("right_ankle", frame.ang.right_ankle);
            ctx.restore();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [frameSeries, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
