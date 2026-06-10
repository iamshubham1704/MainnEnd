"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, checkAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed.");
        setIsLoading(false);
        return;
      }

      login(data.token, data.user);
      await checkAuth();
      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020205] text-[#f4f4f7] font-sans relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md space-y-6 sm:space-y-8 relative z-10">
        <div className="text-center space-y-2 sm:space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              ColdMail AI
            </h1>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#f4f4f7]">Welcome Back</h2>
          <p className="text-xs sm:text-sm text-zinc-400">Sign in to your account to continue</p>
        </div>

        <form className="space-y-4 sm:space-y-5 bg-[#07070f]/60 backdrop-blur-xl border border-white/5 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-900/20" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-zinc-300 mb-1.5 sm:mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-[#f4f4f7] placeholder-zinc-500 text-sm sm:text-base focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-zinc-300 mb-1.5 sm:mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg text-[#f4f4f7] placeholder-zinc-500 text-sm sm:text-base focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 sm:py-3 px-4 rounded-lg font-semibold text-sm sm:text-base text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#020205] focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-900/30 active:scale-[0.98]"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center space-y-2 sm:space-y-3">
          <p className="text-xs sm:text-sm text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
