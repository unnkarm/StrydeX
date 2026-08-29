"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("Athletics");
  const [movement, setMovement] = useState("");
  const [cameraAngle, setCameraAngle] = useState("Side-on");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const form = new FormData();
      form.append("file", file); form.append("title", title || file.name);
      form.append("sport", sport); form.append("movement", movement || "Training session");
      form.append("camera_angle", cameraAngle); form.append("visibility", "public");
      const result = await api.uploadVideo(form);
      router.push(`/videos/${result.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="display-heading text-3xl">Analyze a training video</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div onClick={() => fileRef.current?.click()} className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-surface px-6 py-12 text-center"><p>{file ? file.name : "Select or drop a video"}</p><input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const next = e.target.files?.[0] ?? null; setFile(next); if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, "")); }} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs uppercase tracking-widest text-muted">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground" /></label>
          <label className="text-xs uppercase tracking-widest text-muted">Sport<input value={sport} onChange={(e) => setSport(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground" /></label>
          <label className="text-xs uppercase tracking-widest text-muted">Movement<input value={movement} onChange={(e) => setMovement(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground" /></label>
          <label className="text-xs uppercase tracking-widest text-muted">Camera angle<input value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground" /></label>
        </div>
        {error && <p className="text-sm text-clay">{error}</p>}
        <button type="submit" disabled={!file || uploading} className="w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-ink disabled:opacity-40">{uploading ? "Analyzing..." : "Upload and analyze"}</button>
      </form>
    </div>
  );
}
