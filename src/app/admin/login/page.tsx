"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        password,
        redirect: false,
      });

      if (result?.ok) {
        // Hard navigation so the server picks up the new session cookie
        window.location.href = callbackUrl.startsWith("/") ? callbackUrl : "/admin";
        return;
      }

      // Auth.js v5 beta returns error codes, not messages
      const code = result?.error ?? "";
      if (code.toLowerCase().includes("too many") || code === "RateLimitExceeded") {
        setError("Too many login attempts. Try again in 15 minutes.");
      } else {
        setError("Incorrect password. Try again.");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[--color-text-muted] mb-1.5">
          Admin Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          className="field"
          placeholder="Enter password"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading || !password} className="btn-gold w-full">
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[--color-border] bg-[--color-surface] text-3xl">
            {process.env.NEXT_PUBLIC_APP_EMOJI ?? "🍍"}
          </div>
          <h1 className="text-2xl font-bold text-[--color-gold]">Admin Access</h1>
          <p className="mt-1 text-sm text-[--color-text-muted]">{process.env.NEXT_PUBLIC_APP_NAME ?? "Pineapple Loot Xpress"}</p>
        </div>

        <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-xs text-[--color-text-muted]">
          <a href="/" className="hover:text-[--color-gold] transition-colors">
            ← Back to public site
          </a>
        </p>
      </div>
    </div>
  );
}
