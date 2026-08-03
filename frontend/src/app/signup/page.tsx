"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";
import { POSITIONS_BY_SPORT, SPORTS } from "@/lib/sports";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"athlete" | "coach" | "scout">("athlete");
  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [customSport, setCustomSport] = useState("");
  const [customPosition, setCustomPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await api.signup(email, password, role);
      setToken(access_token);
      if (role === "athlete") {
        localStorage.setItem(
          "strydex_pending_profile",
          JSON.stringify({
            sport: sport === "Other" ? customSport.trim() : sport,
            position: position === "Other" ? customPosition.trim() : position,
          })
        );
      }
      router.push(role === "athlete" ? "/profile/edit" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="display-heading text-3xl">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        Already have one?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
            I am a
          </label>
          <div className="flex gap-2">
            {(["athlete", "coach", "scout"] as const).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-full border px-4 py-1.5 text-sm capitalize transition-colors ${
                  role === r
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {role === "athlete" && (
          <>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
                Sport
              </label>
              <select
                required
                value={sport}
                onChange={(e) => {
                  setSport(e.target.value);
                  setPosition("");
                  setCustomPosition("");
                  if (e.target.value !== "Other") setCustomSport("");
                }}
                className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
              >
                <option value="" disabled>Select a sport</option>
                {SPORTS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
                <option value="N/A">N/A</option>
                <option value="Other">Other / not listed</option>
              </select>
            </div>

            {sport === "Other" && (
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
                  Enter sport
                </label>
                <input
                  required
                  value={customSport}
                  onChange={(e) => setCustomSport(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
                Position / role
              </label>
              <select
                required
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  if (e.target.value !== "Other") setCustomPosition("");
                }}
                className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
              >
                <option value="" disabled>Select a position</option>
                {(POSITIONS_BY_SPORT[sport] || []).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
                <option value="N/A">N/A</option>
                <option value="Other">Other / not listed</option>
              </select>
            </div>

            {position === "Other" && (
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
                  Enter position / role
                </label>
                <input
                  required
                  value={customPosition}
                  onChange={(e) => setCustomPosition(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
                />
              </div>
            )}
          </>
        )}

        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-clay">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}
