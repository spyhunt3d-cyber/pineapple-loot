"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push(callbackUrl);
    } else {
      setError("Incorrect password. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-[--color-text-muted] mb-1">
          Admin Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-4 py-2 text-[--color-text] focus:outline-none focus:ring-2 focus:ring-[--color-gold]"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-md bg-[--color-gold] py-2 text-sm font-semibold text-black hover:bg-[--color-gold-light] disabled:opacity-50 transition-colors"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">🍍</span>
          <h1 className="mt-3 text-2xl font-bold text-[--color-gold]">Admin Login</h1>
          <p className="mt-1 text-sm text-[--color-text-muted]">Pineapple Loot Xpress</p>
        </div>

        <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-4 text-center text-xs text-[--color-text-muted]">
          <a href="/" className="hover:text-[--color-text]">← Back to public site</a>
        </p>
      </div>
    </div>
  );
}
