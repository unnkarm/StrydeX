"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

const STEPS = ["Identity", "Sport", "Performance", "Visibility"] as const;

const inputClass =
  "w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent";
const labelClass = "mb-1 block text-xs uppercase tracking-widest text-muted";

export default function OnboardingPage() {
  const router = useRouter();
  const { me, loading: meLoading } = useCurrentUser();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (meLoading) return;
    if (!me) router.push("/login");
  }, [me, meLoading, router]);

  const [form, setForm] = useState({
    name: "",
    username: "",
    region: "",
    age: "",
    sport: "",
    position: "",
    academy: "",
    height_cm: "",
    weight_kg: "",
    sprint_time_sec: "",
    vertical_jump_cm: "",
    bio: "",
    visibility: "public" as "public" | "scouts_only" | "private",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canContinue() {
    if (step === 0) return form.name.trim() && form.username.trim();
    return true;
  }

  async function finish() {
    setError(null);
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

      if (form.sprint_time_sec || form.vertical_jump_cm) {
        await api.addPerformanceLog({
          sprint_time_sec: form.sprint_time_sec ? Number(form.sprint_time_sec) : null,
          vertical_jump_cm: form.vertical_jump_cm ? Number(form.vertical_jump_cm) : null,
          notes: "Added during onboarding",
        });
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="display-heading text-3xl text-accent">You&apos;re in.</div>
        <p className="mt-3 text-muted">Your athlete profile is ready.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-8 rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity"
        >
          Go to dashboard →
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-14">
      <div className="flex items-center justify-between">
        <span className="display-heading text-lg font-semibold">
          Stryde<span className="text-accent">X</span>
        </span>
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          Exit
        </Link>
      </div>

      {/* progress */}
      <div className="mt-10 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] ${
                  i < step
                    ? "border-accent bg-accent text-accent-ink"
                    : i === step
                    ? "border-accent text-accent"
                    : "border-border text-muted"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`mt-1.5 text-[11px] ${i <= step ? "text-foreground" : "text-muted"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${i < step ? "bg-accent" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <h1 className="display-heading mt-10 text-2xl">
        {step === 0 && "Build your athlete identity"}
        {step === 1 && "What do you play?"}
        {step === 2 && "Your baseline numbers"}
        {step === 3 && "Who can see your profile?"}
      </h1>

      {step === 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted">
              Photo
            </div>
            <button
              type="button"
              title="Coming soon"
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted"
            >
              Upload (coming soon)
            </button>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Full name</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Username (your public link)</label>
            <input
              value={form.username}
              onChange={(e) => update("username", e.target.value.trim().toLowerCase())}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input value={form.region} onChange={(e) => update("region", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Age</label>
            <input
              type="number"
              value={form.age}
              onChange={(e) => update("age", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Sport</label>
            <input value={form.sport} onChange={(e) => update("sport", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Position</label>
            <input
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Academy / club</label>
            <input
              value={form.academy}
              onChange={(e) => update("academy", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Height (cm)</label>
            <input
              type="number"
              value={form.height_cm}
              onChange={(e) => update("height_cm", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Weight (kg)</label>
            <input
              type="number"
              value={form.weight_kg}
              onChange={(e) => update("weight_kg", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Sprint PB (s) — optional</label>
            <input
              type="number"
              step="0.01"
              value={form.sprint_time_sec}
              onChange={(e) => update("sprint_time_sec", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Vertical jump (cm) — optional</label>
            <input
              type="number"
              value={form.vertical_jump_cm}
              onChange={(e) => update("vertical_jump_cm", e.target.value)}
              className={inputClass}
            />
          </div>
          <p className="text-xs text-muted sm:col-span-2">
            You can log more sessions any time from Performance in your dashboard.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8 space-y-5">
          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Profile visibility</label>
            <div className="space-y-2">
              {(
                [
                  ["public", "Public — visible to anyone, including on search engines"],
                  ["scouts_only", "Scouts only — visible via direct link and scout search"],
                  ["private", "Private — hidden from scout search and your public link"],
                ] as const
              ).map(([value, desc]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                    form.visibility === value ? "border-accent bg-surface-2" : "border-border bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={form.visibility === value}
                    onChange={() => update("visibility", value)}
                    className="mt-1 accent-accent"
                  />
                  <span className="text-foreground">{desc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-5 text-sm text-clay">{error}</p>}

      <div className="mt-10 flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-full border border-border px-5 py-2.5 text-sm disabled:opacity-0"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canContinue() && setStep((s) => s + 1)}
            disabled={!canContinue()}
            className="rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}
