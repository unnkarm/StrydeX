"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function UploadPage() {
  const { me, loading } = useCurrentUser();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [sport, setSport] = useState("");
  const [movement, setMovement] = useState("");
  const [cameraAngle, setCameraAngle] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
      if (tags) form.append("tags", tags);
      if (sport) form.append("sport", sport);
      if (movement) form.append("movement", movement);
      if (cameraAngle) form.append("camera_angle", cameraAngle);
      form.append("visibility", visibility);

      const result = await api.uploadVideo(form);
      router.push(`/videos/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="px-6 py-16 text-muted">Loading...</div>;
  if (!me) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="display-heading text-3xl">Upload Video</h1>
      <p className="mt-2 text-sm text-muted">
        Upload a training or match video for AI-powered analysis.
      </p>

      <div className="lane-rule my-8" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
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
              <p className="mt-3 font-medium text-foreground">{file.name}</p>
              <p className="mt-1 text-xs text-muted">
                {(file.size / 1024 / 1024).toFixed(1)} MB &middot; Click or drop to replace
              </p>
            </>
          ) : (
            <>
              <span className="text-3xl">↑</span>
              <p className="mt-3 font-medium text-foreground">
                Drag &amp; drop a video file here
              </p>
              <p className="mt-1 text-xs text-muted">or click to browse &middot; MP4, MOV, AVI</p>
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

        {/* Title */}
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint drill – morning session"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {/* Two-column metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Sport</label>
            <input
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="e.g. Running"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Movement
            </label>
            <input
              value={movement}
              onChange={(e) => setMovement(e.target.value)}
              placeholder="e.g. 100m sprint"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Camera angle
            </label>
            <input
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value)}
              placeholder="e.g. Side view"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="public">Public</option>
              <option value="scouts_only">Scouts only</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Tags (optional)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. speed, agility, pre-season"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-clay">{error}</p>}

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-opacity disabled:opacity-40"
        >
          {uploading ? "Analyzing…" : "Upload & analyze"}
        </button>
      </form>
    </div>
  );
}
