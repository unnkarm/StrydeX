"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteProfile } from "@/lib/types";

const emptyForm = {
  username: "",
  name: "",
  profile_picture: "",
  age: "",
  sport: "",
  position: "",
  height_cm: "",
  weight_kg: "",
  academy: "",
  region: "",
  bio: "",
  visibility: "public" as "public" | "scouts_only" | "private",
};

export default function PortfolioManagerPage() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    api
      .myProfile()
      .then((p: AthleteProfile) => {
        setForm({
          username: p.username,
          name: p.name,
          profile_picture: p.profile_picture ?? "",
          age: p.age?.toString() ?? "",
          sport: p.sport ?? "",
          position: p.position ?? "",
          height_cm: p.height_cm?.toString() ?? "",
          weight_kg: p.weight_kg?.toString() ?? "",
          academy: p.academy ?? "",
          region: p.region ?? "",
          bio: p.bio ?? "",
          visibility: (p.visibility as "public" | "scouts_only" | "private") ?? "public",
        });
      })
      .catch((err) => {
        // Safe to ignore for brand new accounts that don't have a profile row yet
        console.log("No profile exists yet:", err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    try {
      const res = await api.uploadAvatar(file);
      setForm((f) => ({ ...f, profile_picture: res.message }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.upsertProfile({
        username: form.username,
        name: form.name,
        profile_picture: form.profile_picture || null,
        age: form.age ? Number(form.age) : null,
        sport: form.sport || null,
        position: form.position || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        academy: form.academy || null,
        region: form.region || null,
        bio: form.bio || null,
        visibility: form.visibility,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/u/${form.username}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const fields: [keyof typeof form, string, string?][] = [
    ["username", "Username (your public link)"],
    ["name", "Full name"],
    ["age", "Age", "number"],
    ["sport", "Sport"],
    ["position", "Position"],
    ["height_cm", "Height (cm)", "number"],
    ["weight_kg", "Weight (kg)", "number"],
    ["academy", "Academy / club"],
    ["region", "Region"],
  ];

  if (loading) return <div className="px-6 py-16 text-muted font-mono">Loading portfolio data...</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-heading text-2xl">Portfolio Manager</h1>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="rounded-full border border-border px-4 py-2 text-xs font-mono hover:border-accent"
          >
            {copied ? "Link copied ✓" : "Share Profile"}
          </button>
          {form.username && (
            <Link
              href={`/u/${form.username}`}
              target="_blank"
              className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-ink hover:opacity-90"
            >
              View public page ↗
            </Link>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        This becomes your public portfolio at strydex.app/u/{form.username || "your-username"}
      </p>

      <div className="lane-rule my-6" />

      {error && (
        <div className="mb-6 rounded-md border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay font-mono">
          {error}
        </div>
      )}

      {/* Profile Avatar Uploader Section */}
      <div className="mb-8 p-5 rounded-xl border border-border bg-surface flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-20 h-20 rounded-full border border-border bg-surface-2 overflow-hidden flex items-center justify-center">
          {form.profile_picture ? (
            <img src={form.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-muted font-mono">👤</span>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-[10px] text-accent font-bold font-mono">
              Loading...
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted font-mono font-bold">Profile Picture</label>
          <p className="text-[11px] text-muted mb-3 font-mono">JPG, PNG, or GIF up to 5MB.</p>
          <input
            type="file"
            accept="image/*"
            id="avatar-upload"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <label
            htmlFor="avatar-upload"
            className="cursor-pointer rounded-full border border-border bg-background px-4 py-2 text-xs font-mono hover:border-accent inline-block text-foreground"
          >
            {uploadingAvatar ? "Uploading..." : "Upload Photo"}
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        {fields.map(([key, label, type]) => (
          <div key={key} className={key === "username" || key === "name" ? "sm:col-span-2" : ""}>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">{label}</label>
            <input
              type={type || "text"}
              required={key === "username" || key === "name"}
              value={form[key] as string}
              onChange={(e) => update(key, e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Bio</label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Profile visibility</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["public", "Public"],
                ["scouts_only", "Scouts only"],
                ["private", "Private"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update("visibility", value)}
                className={`rounded-full px-5 py-2 text-xs font-medium border transition-colors ${
                  form.visibility === value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface hover:border-accent text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 flex items-center justify-between border-t border-border pt-5 mt-4">
          {saved && (
            <span className="text-xs text-accent font-mono animate-fade-in">
              Profile updated successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
