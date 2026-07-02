"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !pin.trim()) {
      setError("Username dan PIN wajib diisi.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        username,
        pin,
        redirect: false,
      });

      if (result?.error) {
        setError("Username atau PIN salah");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Haland Petcare
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Masukkan username dan PIN untuk masuk ke sistem.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
              placeholder="owner"
              required
            />
          </div>

          <div>
            <label htmlFor="pin" className="mb-1 block text-sm font-medium text-slate-700">
              PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              autoComplete="current-password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
              placeholder="123456"
              required
            />
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
