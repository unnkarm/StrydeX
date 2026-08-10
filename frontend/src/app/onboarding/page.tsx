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
    sport: "Cricket",
    position: "Batter (RHB)", // RHB, LHB, Fast Bowler, Spin Bowler, Wicketkeeper, All-Rounder
    academy: "",
    height_cm: "",
    weight_kg: "",
    batting_avg: "",
    strike_rate: "",
    bowling_speed: "",
    yoyo_test: "",
    bio: "",
    visibility: "public" as "public" | "scouts_only" | "private",
    profile_picture: "",
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const res = await api.uploadAvatar(file);
      update("profile_picture", res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

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
        profile_picture: form.profile_picture || null,
      });

      // Save baseline logs
      if (form.batting_avg || form.bowling_speed) {
        await api.addPerformanceLog({
          notes: `Onboarding baseline: Batting Avg ${form.batting_avg || "—"}, Bowler Speed ${form.bowling_speed || "—"} km/h, YoYo score ${form.yoyo_test || "—"}`,
          sprint_time_sec: form.yoyo_test ? Number(form.yoyo_test) : null,
          vertical_jump_cm: form.batting_avg ? Number(form.batting_avg) : null,
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
        <p className="mt-3 text-muted">Your cricketer profile is ready.</p>
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
          Stryde<span className="text-accent">X</span> <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded ml-2 uppercase font-mono">Cricket</span>
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
        {step === 0 && "Build your cricketer profile"}
        {step === 1 && "What is your role?"}
        {step === 2 && "Your baseline statistics"}
        {step === 3 && "Who can see your profile?"}
      </h1>

      {step === 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full border border-border bg-surface-2 overflow-hidden flex items-center justify-center">
              {form.profile_picture ? (
                <img src={form.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl text-muted font-mono">👤</span>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-[8px] text-accent font-bold font-mono">
                  Loading...
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                id="onboarding-avatar-upload"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <label
                htmlFor="onboarding-avatar-upload"
                className="cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-mono hover:border-accent inline-block text-foreground"
              >
                {uploadingAvatar ? "Uploading..." : "Upload Photo"}
              </label>
            </div>
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
            <input disabled value={form.sport} className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelClass}>Cricket Role / Position</label>
            <select
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
              className={inputClass}
            >
              <option value="Batter (RHB)">Batter (RHB)</option>
              <option value="Batter (LHB)">Batter (LHB)</option>
              <option value="Fast Bowler">Fast Bowler</option>
              <option value="Spin Bowler">Spin Bowler</option>
              <option value="All-Rounder">All-Rounder</option>
              <option value="Wicketkeeper-Batter">Wicketkeeper-Batter</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Academy / State / Club name</label>
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
            <label className={labelClass}>Batting Average (runs/out)</label>
            <input
              type="number"
              step="0.01"
              value={form.batting_avg}
              onChange={(e) => update("batting_avg", e.target.value)}
              className={inputClass}
              placeholder="e.g. 42.5"
            />
          </div>
          <div>
            <label className={labelClass}>Strike Rate (runs/100 balls)</label>
            <input
              type="number"
              step="0.1"
              value={form.strike_rate}
              onChange={(e) => update("strike_rate", e.target.value)}
              className={inputClass}
              placeholder="e.g. 138.2"
            />
          </div>
          <div>
            <label className={labelClass}>Bowling Speed (km/h) — Bowlers</label>
            <input
              type="number"
              value={form.bowling_speed}
              onChange={(e) => update("bowling_speed", e.target.value)}
              className={inputClass}
              placeholder="e.g. 135"
            />
          </div>
          <div>
            <label className={labelClass}>Yo-Yo Test Score — Athletic Baseline</label>
            <input
              type="number"
              step="0.1"
              value={form.yoyo_test}
              onChange={(e) => update("yoyo_test", e.target.value)}
              className={inputClass}
              placeholder="e.g. 19.5"
            />
          </div>
          <p className="text-xs text-muted sm:col-span-2 mt-4">
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
