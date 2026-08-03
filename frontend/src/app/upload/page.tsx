"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { VideoItem } from "@/lib/types";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoItem | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("tags", tags);
      form.append("visibility", "public");
      form.append("file", file);
      const video = await api.uploadVideo(form);
      setResult(video);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="display-heading text-3xl">Upload a video</h1>
      <p className="mt-2 text-sm text-muted">
        We&apos;ll analyze motion automatically and generate an AI feedback report.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent"
            placeholder="e.g. 100m Sprint Session"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Tags</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent"
            placeholder="sprint, track"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Video file</label>
          <input
            required
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-clay">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Upload & analyze"}
        </button>
      </form>

      {result && (
        <div className="mt-8 rounded-lg border border-border bg-surface p-5">
          <div className="display-heading text-sm text-accent">Analysis complete</div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>Duration: {result.duration_sec}s</div>
            <div>Frames: {result.frame_count}</div>
            <div>Motion score: {result.motion_score}</div>
            <div>Explosiveness: {result.est_max_speed_score}/100</div>
          </div>
          {result.ai_report && (
            <div className="mt-4 space-y-2 text-sm">
              <p>{result.ai_report.summary}</p>
              {result.ai_report.strengths && (
                <p className="text-accent">Strengths: {result.ai_report.strengths}</p>
              )}
              {result.ai_report.weaknesses && (
                <p className="text-clay">Focus areas: {result.ai_report.weaknesses}</p>
              )}
              {result.ai_report.drills && <p className="text-muted">Drills: {result.ai_report.drills}</p>}
            </div>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-full border border-border px-4 py-2 text-sm hover:border-accent"
          >
            Back to dashboard
          </button>
        </div>
      )}
    </div>
  );
}
