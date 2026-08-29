"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { AthleteProfile } from "@/lib/types";
import { EVENTS_BY_SPORT, POSITIONS_BY_SPORT, SPORTS } from "@/lib/sports";

const emptyForm = { username: "", name: "", age: "", sport: "Athletics", position: "", height_cm: "", weight_kg: "", academy: "", region: "", bio: "" };

export default function EditProfilePage() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.myProfile().then((p: AthleteProfile) => setForm({
      username: p.username ?? "", name: p.name ?? "", age: p.age?.toString() ?? "",
      sport: p.sport ?? "Athletics", position: p.position ?? "", height_cm: p.height_cm?.toString() ?? "",
      weight_kg: p.weight_kg?.toString() ?? "", academy: p.academy ?? "", region: p.region ?? "", bio: p.bio ?? "",
    })).catch(() => {});
  }, []);

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      await api.upsertProfile({ ...form, age: form.age ? Number(form.age) : null, height_cm: form.height_cm ? Number(form.height_cm) : null, weight_kg: form.weight_kg ? Number(form.weight_kg) : null });
      router.push("/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save profile"); }
    finally { setLoading(false); }
  }

  const fields: Array<[keyof typeof form, string, string]> = [["username","Username","text"],["name","Name","text"],["age","Age","number"],["height_cm","Height (cm)","number"],["weight_kg","Weight (kg)","number"],["academy","Academy","text"],["region","Region","text"]];
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="display-heading text-3xl">Athlete profile</h1>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
        {fields.map(([key, label, type]) => <label key={key} className="text-xs uppercase tracking-widest text-muted">{label}<input required={key === "username" || key === "name"} type={type} value={form[key]} onChange={(e) => update(key, e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground" /></label>)}
        <label className="text-xs uppercase tracking-widest text-muted">Sport<select value={form.sport} onChange={(e) => update("sport", e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground">{SPORTS.map((sport) => <option key={sport}>{sport}</option>)}</select></label>
        <label className="text-xs uppercase tracking-widest text-muted">Position<select value={form.position} onChange={(e) => update("position", e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground"><option value="">Select</option>{(POSITIONS_BY_SPORT[form.sport] || EVENTS_BY_SPORT[form.sport] || []).map((position) => <option key={position}>{position}</option>)}</select></label>
        <label className="sm:col-span-2 text-xs uppercase tracking-widest text-muted">Bio<textarea rows={3} value={form.bio} onChange={(e) => update("bio", e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground" /></label>
        {error && <p className="sm:col-span-2 text-sm text-clay">{error}</p>}
        <button type="submit" disabled={loading} className="sm:col-span-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-ink disabled:opacity-50">{loading ? "Saving..." : "Save profile"}</button>
      </form>
    </div>
  );
}
