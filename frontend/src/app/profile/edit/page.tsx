"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
};

export default function ProfileEditPage() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        });
      })
      .catch(() => {
        // no profile yet — leave form blank
      });
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
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
      });
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="display-heading text-3xl">Your profile</h1>
      <p className="mt-2 text-sm text-muted">
        This becomes your public portfolio at strydex.app/u/
        {form.username || "your-username"}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
        {fields.map(([key, label, type]) => (
          <div key={key} className={key === "username" || key === "name" ? "sm:col-span-2" : ""}>
            <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
              {label}
            </label>
            <input
              type={type || "text"}
              required={key === "username" || key === "name"}
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
            Bio
          </label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-clay sm:col-span-2">{error}</p>}
        {saved && <p className="text-sm text-accent sm:col-span-2">Saved — redirecting...</p>}

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
