"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("athlete");
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
      <h1 className="display-heading text-3xl">Create your StrydeX account</h1>
      <p className="mt-2 text-sm text-muted">Already registered? <Link href="/login" className="text-accent">Log in</Link></p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-xs uppercase tracking-widest text-muted">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground" />
        </label>
        <label className="block text-xs uppercase tracking-widest text-muted">
          Password
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground" />
        </label>
        <label className="block text-xs uppercase tracking-widest text-muted">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-foreground">
            <option value="athlete">Athlete</option><option value="coach">Coach</option><option value="scout">Scout</option>
          </select>
        </label>
        {error && <p className="text-sm text-clay">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-ink disabled:opacity-50">
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}
