"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await api.login(email, password);
      setToken(access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-73px)] md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-surface p-10 md:flex">
        <span className="display-heading text-lg font-semibold">
          Stryde<span className="text-accent">X</span>
        </span>
        <div>
          <p className="display-heading text-3xl leading-tight text-foreground">
            &ldquo;Your journey deserves
            <br />a professional home.&rdquo;
          </p>
          <div className="lane-rule my-6" />
          <div className="flex gap-6 text-sm text-muted">
            <div>
              <div className="stat-value text-xl text-accent">11.4s</div>
              100m PB
            </div>
            <div>
              <div className="stat-value text-xl text-foreground">58cm</div>
              Vertical
            </div>
            <div>
              <div className="stat-value text-xl text-foreground">✔</div>
              Verified
            </div>
          </div>
        </div>
        <div />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-6 py-16">
        <h1 className="display-heading text-3xl">Welcome to StrydeX</h1>
        <p className="mt-2 text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Create account
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
            {loading ? "Logging in..." : "Continue →"}
          </button>
        </form>
      </div>
    </div>
  );
}
