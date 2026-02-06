"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Home() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeKey = useMutation(api.apiKeys.storeKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!apiKey.startsWith("AIza")) {
        setError("Invalid API key format");
        setIsLoading(false);
        return;
      }

      await storeKey({ apiKey });
      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to store key");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Enter Gemini API Key
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full px-4 py-3 rounded bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
            disabled={isLoading}
            autoFocus
          />

          <p className="text-neutral-400 text-xs">
            Key should have at least 1M tokens/month
          </p>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={!apiKey || isLoading}
            className="w-full py-3 rounded font-medium bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:cursor-not-allowed transition"
          >
            {isLoading ? "..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}