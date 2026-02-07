"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

type AuthMode = "initial" | "login" | "signup";

export default function Home() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("initial");
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeKey = useMutation(api.apiKeys.storeKey);
  const usernameExists = useQuery(api.apiKeys.checkUsernameExists, { username }) ?? false;

  // Check if username exists when it changes (for signup mode)
  const showUsernameError = authMode === "signup" && username && usernameExists;

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    // Check if username exists
    if (usernameExists) {
      setAuthMode("login");
    } else {
      setAuthMode("signup");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!username.trim()) {
        setError("Username is required");
        setIsLoading(false);
        return;
      }

      if (!apiKey.startsWith("AIza")) {
        setError("Invalid API key format");
        setIsLoading(false);
        return;
      }

      await storeKey({ username: username.trim(), apiKey });

      // Store username in localStorage for later use
      if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_username', username.trim());
      }

      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!username.trim()) {
        setError("Username is required");
        setIsLoading(false);
        return;
      }

      // Store username in localStorage - no API key needed for login
      if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_username', username.trim());
      }

      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (authMode === "initial") {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            Gemini AI Engine
          </h1>

          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-3 rounded bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
              disabled={isLoading}
              autoFocus
            />

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={!username || isLoading}
              className="w-full py-3 rounded font-medium bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:cursor-not-allowed transition"
            >
              {isLoading ? "..." : "Continue"}
            </button>
          </form>

          <p className="text-neutral-400 text-xs text-center mt-4">
            Sign up with a new account or log in to an existing one
          </p>
        </div>
      </main>
    );
  }

  if (authMode === "signup") {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Create Account
          </h1>
          <p className="text-neutral-400 text-sm text-center mb-6">
            Username: <span className="text-white font-medium">{username}</span>
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-neutral-300 text-sm mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-3 rounded bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-neutral-400 text-xs mt-2">
                Get a free key at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-white underline">aistudio.google.com</a>
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={!apiKey || isLoading}
                className="w-full py-3 rounded font-medium bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:cursor-not-allowed transition"
              >
                {isLoading ? "..." : "Create Account"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("initial");
                  setUsername("");
                  setApiKey("");
                  setError(null);
                }}
                className="w-full py-3 rounded font-medium border border-neutral-800 text-white hover:bg-neutral-900 transition"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  if (authMode === "login") {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Welcome Back
          </h1>
          <p className="text-neutral-400 text-sm text-center mb-6">
            Username: <span className="text-white font-medium">{username}</span>
          </p>

          <p className="text-neutral-300 text-sm mb-6 bg-neutral-900 p-4 rounded border border-neutral-800">
            Ready to continue with your existing account? Your API key is securely stored.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded font-medium bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:cursor-not-allowed transition"
              >
                {isLoading ? "..." : "Continue"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("initial");
                  setUsername("");
                  setApiKey("");
                  setError(null);
                }}
                className="w-full py-3 rounded font-medium border border-neutral-800 text-white hover:bg-neutral-900 transition"
              >
                Use Different Username
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }
}
