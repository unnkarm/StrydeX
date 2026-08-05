"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { AthleteProfile } from "@/lib/types";

const NOTIF_KEY = "strydex_notif_prefs";

type NotifPrefs = {
  analysis_completed: boolean;
  profile_views: boolean;
  scout_interest: boolean;
};

const defaultPrefs: NotifPrefs = {
  analysis_completed: true,
  profile_views: true,
  scout_interest: true,
};

export default function SettingsPage() {
  const { me } = useCurrentUser();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [visibility, setVisibility] = useState<"public" | "scouts_only" | "private">("public");
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .myProfile()
      .then((p: AthleteProfile) => {
        setProfile(p);
        setVisibility((p.visibility as "public" | "scouts_only" | "private") ?? "public");
      })
      .finally(() => setLoading(false));

    try {
      const stored = localStorage.getItem(NOTIF_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      if (profile) {
        await api.upsertProfile({
          username: profile.username,
          name: profile.name,
          age: profile.age ?? null,
          sport: profile.sport ?? null,
          position: profile.position ?? null,
          height_cm: profile.height_cm ?? null,
          weight_kg: profile.weight_kg ?? null,
          academy: profile.academy ?? null,
          region: profile.region ?? null,
          bio: profile.bio ?? null,
          visibility,
        });
      }
      localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="display-heading text-2xl">Settings</h1>
      <div className="lane-rule my-6" />

      <section>
        <h2 className="display-heading text-sm text-muted">Account</h2>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
            <div>
              <div className="text-xs text-muted">Email</div>
              <div className="text-sm">{me?.email ?? "—"}</div>
            </div>
            <span className="text-xs text-muted">Managed via your account provider</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
            <div>
              <div className="text-xs text-muted">Role</div>
              <div className="text-sm capitalize">{me?.role ?? "—"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="display-heading text-sm text-muted">Profile Visibility</h2>
        {loading ? (
          <p className="mt-3 text-sm text-muted">Loading...</p>
        ) : !profile ? (
          <p className="mt-3 text-sm text-muted">Create your athlete profile in Portfolio first.</p>
        ) : (
          <div className="mt-3 space-y-2">
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
                  visibility === value ? "border-accent bg-surface-2" : "border-border bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                  className="mt-1 accent-accent"
                />
                <span className="text-foreground">{desc}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="display-heading text-sm text-muted">Notifications</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(
            [
              ["analysis_completed", "Analysis completed"],
              ["profile_views", "Profile views"],
              ["scout_interest", "Scout interest"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                className="accent-accent"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Stored on this device.</p>
      </section>

      <div className="mt-10 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && <span className="text-sm text-accent">Saved.</span>}
      </div>
    </div>
  );
}
