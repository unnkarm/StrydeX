"use client";

import { useEffect, useRef, useState } from "react";

type Joint = {
  name: string;
  x: number;
  y: number;
  z: number;
  color: string;
};

interface InteractiveAthleteProps {
  scrollProgress: number; // 0.0 to 1.0
}

export default function InteractiveAthlete({ scrollProgress }: InteractiveAthleteProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedJoint, setSelectedJoint] = useState<Joint | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [hoveredJoint, setHoveredJoint] = useState<Joint | null>(null);

  // 1. Pose Coordinates
  const joints: Joint[] = [
    { name: "Head", x: 0, y: -1.6, z: 0, color: "#d4ff4f" },
    { name: "Left Shoulder", x: -0.45, y: -1.2, z: 0.1, color: "#ffffff" },
    { name: "Right Shoulder", x: 0.45, y: -1.2, z: -0.1, color: "#ffffff" },
    { name: "Left Elbow", x: -0.65, y: -0.7, z: 0.2, color: "#ffffff" },
    { name: "Right Elbow", x: 0.65, y: -0.7, z: -0.2, color: "#ffffff" },
    { name: "Left Hip", x: -0.25, y: -0.4, z: 0.05, color: "#ffffff" },
    { name: "Right Hip", x: 0.25, y: -0.4, z: -0.05, color: "#ffffff" },
    { name: "Left Knee", x: -0.35, y: 0.2, z: 0.25, color: "#d4ff4f" },
    { name: "Right Knee", x: 0.35, y: 0.2, z: -0.15, color: "#d4ff4f" },
    { name: "Left Ankle", x: -0.3, y: 0.8, z: 0.2, color: "#ffffff" },
    { name: "Right Ankle", x: 0.3, y: 0.8, z: -0.2, color: "#ffffff" },
  ];

  const bones: [number, number][] = [
    [0, 1], [0, 2], [1, 2], // Neck/shoulders
    [1, 3], [2, 4], // Arms
    [1, 5], [2, 6], [5, 6], // Torso/hips
    [5, 7], [6, 8], // Upper legs
    [7, 9], [8, 10]  // Lower legs
  ];

  // 2. Chart Coordinates (Morph target)
  const chartPoints = [
    { x: -0.9, y: 0.5, z: -0.2 },
    { x: -0.7, y: 0.2, z: -0.1 },
    { x: -0.5, y: 0.3, z: 0.0 },
    { x: -0.3, y: -0.1, z: 0.1 },
    { x: -0.1, y: 0.1, z: -0.1 },
    { x: 0.1, y: -0.3, z: 0.2 },
    { x: 0.3, y: 0.2, z: -0.2 },
    { x: 0.5, y: -0.4, z: 0.1 },
    { x: 0.7, y: -0.2, z: 0.0 },
    { x: 0.9, y: -0.5, z: -0.1 },
    { x: 1.0, y: -0.6, z: 0.2 }
  ];

  // Joint details on click
  const metrics: Record<string, Record<string, string>> = {
    "Head": { Focus: "Trunk stability", Alignment: "Optimal" },
    "Left Knee": { Angle: "162°", Symmetry: "94%", Stability: "87% (Slight shift)" },
    "Right Knee": { Angle: "160°", Symmetry: "94%", Stability: "92%" },
    "Left Ankle": { Mobility: "91%", Force: "94%", Stability: "89%" },
    "Right Ankle": { Mobility: "90%", Force: "95%", Stability: "91%" },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let autoRotation = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouseRef.current.targetX = (e.clientX - cx) / (rect.width / 2);
      mouseRef.current.targetY = (e.clientY - cy) / (rect.height / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 2;

      // Mouse offsets with easing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      autoRotation += 0.006;

      // Stage evaluations based on scroll progress
      // Hero Stage (0.0 to 0.2): Standard rotating body.
      // Zoom Stage (0.2 to 0.4): Scale increases.
      // Biomechanics Stage (0.4 to 0.6): Highlight skeleton details and overlay angles.
      // Morph Stage (0.6 to 0.8): Coordinates transform into graph path.
      // Dashboard Stage (0.8 to 1.0): Folds into grid.

      let currentScale = Math.min(w, h) * 0.35;
      if (scrollProgress > 0.2 && scrollProgress <= 0.4) {
        const factor = (scrollProgress - 0.2) / 0.2;
        currentScale = Math.min(w, h) * (0.35 + factor * 0.15); // Zoom-in
      } else if (scrollProgress > 0.4) {
        currentScale = Math.min(w, h) * 0.5; // Lock zoomed scale
      }

      // Morph interpolation factor (t)
      let morphT = 0;
      if (scrollProgress > 0.6 && scrollProgress <= 0.8) {
        morphT = (scrollProgress - 0.6) / 0.2;
      } else if (scrollProgress > 0.8) {
        morphT = 1.0;
      }

      // Fold interpolation factor (for dashboard layout mapping)
      let foldT = 0;
      if (scrollProgress > 0.8) {
        foldT = (scrollProgress - 0.8) / 0.2;
      }

      // Rotation angles
      const rotY = autoRotation + mouseRef.current.x * 0.6 * (1 - foldT);
      const rotX = mouseRef.current.y * 0.4 * (1 - foldT);

      // Compute current coordinates by interpolating body points to graph points
      const projected = joints.map((j, idx) => {
        // Source (Body joint)
        const srcX = j.x;
        const srcY = j.y;
        const srcZ = j.z;

        // Destination (Graph point)
        const dst = chartPoints[idx];
        const dstX = dst.x;
        const dstY = dst.y;
        const dstZ = dst.z;

        // Interpolated coordinate before rotation/projection
        let interpX = srcX * (1 - morphT) + dstX * morphT;
        let interpY = srcY * (1 - morphT) + dstY * morphT;
        let interpZ = srcZ * (1 - morphT) + dstZ * morphT;

        // Fold stage: align points to flat 2D screen surface
        if (foldT > 0) {
          interpY = interpY * (1 - foldT) + 0.3 * foldT;
          interpZ = interpZ * (1 - foldT);
        }

        // Apply rotation
        let x1 = interpX * Math.cos(rotY) - interpZ * Math.sin(rotY);
        let z1 = interpX * Math.sin(rotY) + interpZ * Math.cos(rotY);
        let y2 = interpY * Math.cos(rotX) - z1 * Math.sin(rotX);
        let z2 = interpY * Math.sin(rotX) + z1 * Math.cos(rotX);

        // Perspective projection
        const dist = 3.5;
        const pScale = dist / (dist + z2);
        const px = centerX + x1 * currentScale * pScale;
        const py = centerY + y2 * currentScale * pScale;

        return { px, py, original: j };
      });

      // Background Scanning Grid (Fades out when morphing to chart)
      ctx.strokeStyle = `rgba(212, 255, 79, ${0.08 * (1 - morphT)})`;
      ctx.lineWidth = 1;
      const gridLines = 8;
      for (let i = 1; i < gridLines; i++) {
        const y = (h / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(w - 30, y);
        ctx.stroke();
      }

      // Draw skeleton limbs (Fades out during morphing)
      if (morphT < 0.95) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 - morphT)})`;
        ctx.lineWidth = 2.5;
        bones.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(projected[a].px, projected[a].py);
          ctx.lineTo(projected[b].px, projected[b].py);
          ctx.stroke();
        });
      }

      // Draw chart path lines (Fades in during morphing)
      if (morphT > 0.05) {
        ctx.strokeStyle = `rgba(212, 255, 79, ${morphT * (1 - foldT * 0.5)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        projected.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.px, pt.py);
          else ctx.lineTo(pt.px, pt.py);
        });
        ctx.stroke();
      }

      // Draw Joint points
      projected.forEach((j) => {
        const isHeadOrKnee = j.original.name === "Head" || j.original.name.includes("Knee");
        const radius = isHeadOrKnee ? 6 : 4.5;
        
        ctx.shadowColor = "var(--accent)";
        ctx.shadowBlur = isHeadOrKnee ? 12 : 6;
        ctx.fillStyle = j.original.color;
        ctx.beginPath();
        ctx.arc(j.px, j.py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // Biomechanical highlight annotation overlay (Between scroll 40% and 75%)
      if (scrollProgress >= 0.35 && scrollProgress < 0.65) {
        const knee = projected[7]; // Left Knee
        ctx.strokeStyle = "#d4ff4f";
        ctx.lineWidth = 1.5;

        // Indicator line pointing to Left Knee
        ctx.beginPath();
        ctx.moveTo(knee.px, knee.py);
        ctx.lineTo(knee.px + 45, knee.py - 30);
        ctx.lineTo(knee.px + 100, knee.py - 30);
        ctx.stroke();

        // Overlay angle text
        ctx.fillStyle = "#d4ff4f";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "left";
        ctx.fillText("KNEE ANGLE: 162°", knee.px + 50, knee.py - 36);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("SYMMETRY: 94%", knee.px + 50, knee.py - 20);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [scrollProgress]);

  // Click handler for hotspots
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (scrollProgress > 0.6) return; // Disable clicks during chart morph

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const scale = Math.min(w, h) * (scrollProgress > 0.4 ? 0.5 : 0.35);

    const rotY = (Date.now() * 0.0006) + mouseRef.current.x * 0.6;
    const rotX = mouseRef.current.y * 0.4;

    let matched: Joint | null = null;
    joints.forEach((j) => {
      let x1 = j.x * Math.cos(rotY) - j.z * Math.sin(rotY);
      let z1 = j.x * Math.sin(rotY) + j.z * Math.cos(rotY);
      let y2 = j.y * Math.cos(rotX) - z1 * Math.sin(rotX);
      let z2 = j.y * Math.sin(rotX) + z1 * Math.cos(rotX);

      const dist = 3.5;
      const pScale = dist / (dist + z2);
      const px = centerX + x1 * scale * pScale;
      const py = centerY + y2 * scale * pScale;

      const dx = px - x;
      const dy = py - y;
      if (Math.sqrt(dx * dx + dy * dy) < 16) {
        matched = j;
      }
    });

    if (matched) setSelectedJoint(matched);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-pointer"
      />

      {/* Dynamic metric overlay card */}
      {selectedJoint && metrics[selectedJoint.name] && (
        <div className="absolute top-4 left-4 bg-background/90 border border-border p-4 rounded-lg shadow-xl backdrop-blur-md max-w-xs transition-opacity duration-300 pointer-events-auto select-none">
          <div className="flex justify-between items-center border-b border-border pb-1 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-accent font-bold">
              {selectedJoint.name} telemetry
            </span>
            <button
              onClick={() => setSelectedJoint(null)}
              className="text-[10px] text-muted hover:text-foreground font-mono"
            >
              ✕ Close
            </button>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            {Object.entries(metrics[selectedJoint.name]).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-4">
                <span className="text-muted">{key}:</span>
                <span className="text-foreground font-bold">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
