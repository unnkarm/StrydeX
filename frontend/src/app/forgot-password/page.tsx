"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const data = await api.forgotPassword(email);
      setMessage(data.message || "If an account exists for that email, a reset link has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="display-heading text-3xl">Forgot password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter your email and we’ll help you reset it.
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

        {error && <p className="text-sm text-clay">{error}</p>}
        {message && <p className="text-sm text-accent">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <div className="mt-6 text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
