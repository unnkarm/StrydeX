"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"athlete" | "coach" | "scout">("athlete");
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
