"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

const STEPS = ["Identity", "Role", "Performance", "Visibility"] as const;

const inputClass =
  "w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent font-mono text-sm";
const labelClass = "mb-1 block text-xs uppercase tracking-widest text-muted font-mono font-bold";

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
    position: "Batter", // RHB, LHB, Fast Bowler, Spin Bowler, Wicketkeeper, All-Rounder
    hand: "Right hand",
    bowling_style: "None",
    goal: "Improve technique",
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
        position: `${form.position} · ${form.hand} · ${form.bowling_style}`,
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
          notes: `Onboarding baseline: Batting Avg ${form.batting_avg || "—"}, Speed ${form.bowling_speed || "—"} km/h, Goal: ${form.goal}`,
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
      <div className="mx-auto max-w-md px-6 py-24 text-center font-mono space-y-4">
        <div className="display-heading text-3xl text-accent">You&apos;re in.</div>
        <p className="text-muted text-sm">Your verified PitchIQ cricket profile is active.</p>
        <button
          onClick={() => {
            window.location.href = "/dashboard";
          }}
          className="mt-8 rounded-full bg-accent px-6 py-3 font-bold text-accent-ink hover:opacity-90 transition-opacity text-xs uppercase tracking-wider"
        >
          Go to dashboard →
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-14">
      <div className="flex items-center justify-between">
        <span className="display-heading text-lg font-bold tracking-wider">
          Pitch<span className="text-accent font-extrabold">IQ</span> <span className="text-[9px] bg-accent/15 text-accent px-2 py-0.5 rounded ml-2 uppercase font-mono tracking-widest font-extrabold">Cricket</span>
        </span>
        <Link href="/dashboard" className="text-xs font-mono text-muted hover:text-foreground">
          Exit
        </Link>
      </div>

      {/* progress */}
      <div className="mt-10 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-mono ${
                  i < step
                    ? "border-accent bg-accent text-accent-ink"
                    : i === step
                    ? "border-accent text-accent"
                    : "border-border text-muted"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`mt-1.5 text-[9px] font-mono uppercase tracking-widest font-bold ${i <= step ? "text-foreground" : "text-muted"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${i < step ? "bg-accent" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <h1 className="display-heading mt-10 text-2xl font-bold">
        {step === 0 && "Welcome to PitchIQ"}
        {step === 1 && "What do you play?"}
        {step === 2 && "Configure baseline metrics"}
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
            <label className={labelClass}>Location (City)</label>
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
            <label className={labelClass}>Select Role</label>
            <select
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
              className={inputClass}
            >
              <option value="Batter">🏏 Batter</option>
              <option value="Bowler">🏏 Bowler</option>
              <option value="All-rounder">🏏 All-rounder</option>
              <option value="Wicketkeeper">🧤 Wicketkeeper</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Batting Hand</label>
            <select
              value={form.hand}
              onChange={(e) => update("hand", e.target.value)}
              className={inputClass}
            >
              <option value="Right hand">Right hand</option>
              <option value="Left hand">Left hand</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Bowling Style</label>
            <select
              value={form.bowling_style}
              onChange={(e) => update("bowling_style", e.target.value)}
              className={inputClass}
            >
              <option value="None">None</option>
              <option value="Right-arm fast">Right-arm fast</option>
              <option value="Right-arm medium">Right-arm medium</option>
              <option value="Off-spin">Off-spin</option>
              <option value="Leg-spin">Leg-spin</option>
              <option value="Left-arm orthodox">Left-arm orthodox</option>
              <option value="Left-arm fast">Left-arm fast</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Primary Training Goal</label>
            <select
              value={form.goal}
              onChange={(e) => update("goal", e.target.value)}
              className={inputClass}
            >
              <option value="Improve technique">Improve technique</option>
              <option value="Increase scoring">Increase scoring</option>
              <option value="Increase bowling consistency">Increase bowling consistency</option>
              <option value="Prepare for trials">Prepare for trials</option>
              <option value="Track match performance">Track match performance</option>
              <option value="Get noticed by scouts">Get noticed by scouts</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Academy / State / Club name</label>
            <input
              value={form.academy}
              onChange={(e) => update("academy", e.target.value)}
              className={inputClass}
              placeholder="e.g. Cricket Association of Bengal"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Batting Average (if known)</label>
            <input
              type="number"
              step="0.1"
              value={form.batting_avg}
              onChange={(e) => update("batting_avg", e.target.value)}
              className={inputClass}
              placeholder="e.g. 42.5"
            />
          </div>
          <div>
            <label className={labelClass}>Strike Rate (if known)</label>
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
            <label className={labelClass}>Max Bowling Speed (km/h)</label>
            <input
              type="number"
              value={form.bowling_speed}
              onChange={(e) => update("bowling_speed", e.target.value)}
              className={inputClass}
              placeholder="e.g. 134"
            />
          </div>
          <div>
            <label className={labelClass}>Yo-Yo Fitness Test Score</label>
            <input
              type="number"
              step="0.1"
              value={form.yoyo_test}
              onChange={(e) => update("yoyo_test", e.target.value)}
              className={inputClass}
              placeholder="e.g. 18.2"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted font-mono leading-relaxed">
            Choose who has access to view your PitchIQ verified cricket performance records:
          </p>
          <div className="space-y-2">
            {(
              [
                ["public", "Public (Anyone can view your verified stats)"],
                ["scouts_only", "Verified Scouts only (Coaches and selectors)"],
                ["private", "Private (Only you)"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => update("visibility", value)}
                className={`w-full text-left rounded-lg border p-4 text-xs font-mono transition-colors ${
                  form.visibility === value
                    ? "border-accent bg-accent/10 text-accent font-semibold"
                    : "border-border hover:border-accent text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="mt-6 text-sm text-clay font-mono">⚠️ {error}</div>}

      {/* footer nav buttons */}
      <div className="mt-10 flex justify-between border-t border-border pt-6">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-full border border-border px-5 py-2 text-xs font-bold text-muted hover:text-foreground disabled:opacity-30 font-mono uppercase tracking-wider"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue()}
            className="rounded-full bg-accent px-6 py-2 text-xs font-bold text-accent-ink hover:opacity-90 disabled:opacity-50 font-mono uppercase tracking-wider"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="rounded-full bg-accent px-6 py-2 text-xs font-bold text-accent-ink hover:opacity-90 disabled:opacity-50 font-mono uppercase tracking-wider animate-pulse"
          >
            {saving ? "Saving..." : "Verify Portfolio"}
          </button>
        )}
      </div>
    </div>
  );
}
