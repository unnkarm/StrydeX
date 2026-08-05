"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteProfile } from "@/lib/types";

const emptyForm = {
  username: "",
  name: "",
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

  useEffect(() => {
    api
      .myProfile()
      .then((p: AthleteProfile) => {
        setForm({
          username: p.username,
          name: p.name,
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
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
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

  if (loading) return <div className="px-6 py-16 text-muted">Loading...</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-heading text-2xl">Portfolio Manager</h1>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent"
          >
            {copied ? "Link copied ✓" : "Share Profile"}
          </button>
          {form.username && (
            <Link
              href={`/u/${form.username}`}
              target="_blank"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
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
                type="button"
                key={value}
                onClick={() => update("visibility", value)}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  form.visibility === value
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-clay sm:col-span-2">{error}</p>}
        {saved && <p className="text-sm text-accent sm:col-span-2">Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
