"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

type RoleType = "BATTER" | "BOWLER" | "FIELDING";

export default function UploadPage() {
  const { me, loading } = useCurrentUser();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [roleType, setRoleType] = useState<RoleType>("BATTER");
  const [analysisType, setAnalysisType] = useState("");
  const [cameraAngle, setCameraAngle] = useState("Side-on view");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const batterOptions = ["Front-foot shot", "Back-foot shot", "Drive", "Pull / Hook", "Cut", "Sweep", "Batting session"];
  const bowlerOptions = ["Fast bowling", "Spin bowling", "Run-up", "Delivery stride", "Release"];
  const fieldingOptions = ["Catching", "Throwing", "Direct hit drill"];

  const currentOptions = roleType === "BATTER" ? batterOptions : roleType === "BOWLER" ? bowlerOptions : fieldingOptions;

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("video/")) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^.]+$/, ""));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    setFile(chosen);
    if (chosen && !title) setTitle(chosen.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title || file.name);
      form.append("sport", "Cricket");
      form.append("movement", `${roleType} - ${analysisType || currentOptions[0]}`);
      form.append("camera_angle", cameraAngle);
      form.append("visibility", "public");

      const result = await api.uploadVideo(form);
      router.push(`/videos/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="px-6 py-16 text-muted font-mono">Connecting to PitchIQ Video Lab...</div>;
  if (!me) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
      <div>
        <span className="text-xs font-mono uppercase text-accent tracking-widest block">
          Technique Lab
        </span>
        <h1 className="display-heading text-3xl mt-1">Analyze Your Technique</h1>
        <p className="text-sm text-muted mt-1">
          Upload nets or match recordings to render joint trajectories and AI coaching checklists.
        </p>
      </div>

      <div className="text-center font-mono text-[9px] text-muted tracking-widest py-1 select-none">
        ────────────── ● ──────────────
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: What are you analyzing? */}
         <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-muted font-mono font-bold">
            1. What are you analyzing?
          </label>
          <div className="flex gap-3">
            {(["BATTER", "BOWLER", "FIELDING"] as const).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => {
                  setRoleType(r);
                  setAnalysisType("");
                }}
                className={`flex-1 py-3 text-xs font-mono rounded-lg border font-bold uppercase transition-all duration-300 transform active:scale-95 ${
                  roleType === r
                    ? "border-accent bg-accent text-accent-ink shadow-lg shadow-accent/20 scale-[1.02]"
                    : "border-border text-muted hover:text-foreground bg-surface/50 hover:border-accent/40"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select analysis type */}
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-muted font-mono font-bold">
            2. Select Analysis Focus
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentOptions.map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => setAnalysisType(opt)}
                className={`py-2 px-3 text-left text-xs font-mono rounded border transition-all duration-200 transform active:scale-95 ${
                  (analysisType || currentOptions[0]) === opt
                    ? "border-accent/60 bg-accent/10 text-accent font-semibold shadow-sm shadow-accent/10"
                    : "border-border text-muted hover:border-accent bg-surface/30"
                }`}
              >
                ○ {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest text-muted font-mono font-bold">
            3. Upload Video
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
              dragActive
                ? "border-accent bg-accent/5"
                : file
                  ? "border-accent/40 bg-surface"
                  : "border-border bg-surface hover:border-muted"
            }`}
          >
            {file ? (
              <>
                <span className="text-3xl">🎬</span>
                <p className="mt-3 font-medium text-foreground font-mono text-sm">{file.name}</p>
                <p className="mt-1 text-xs text-muted font-mono">
                  {(file.size / 1024 / 1024).toFixed(1)} MB &middot; Click to replace
                </p>
              </>
            ) : (
              <>
                <span className="text-3xl">↑</span>
                <p className="mt-3 font-semibold text-foreground font-mono text-sm">
                  Drop your video here
                </p>
                <p className="mt-1.5 text-xs text-muted font-mono max-w-xs">
                  Best results: side-on or behind-the-bowler angle (MP4, MOV, AVI)
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Details & Submit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted font-mono">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Net session practice"
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted font-mono">Camera Angle</label>
            <input
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value)}
              placeholder="e.g. Side-on view"
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        {error && <p className="text-sm text-clay font-mono">{error}</p>}

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full rounded-full bg-accent px-6 py-3 font-bold text-accent-ink transition-opacity disabled:opacity-40 font-mono text-xs uppercase tracking-wider"
        >
          {uploading ? "Analyzing with AI..." : "Analyze with AI →"}
        </button>
      </form>
    </div>
  );
}
