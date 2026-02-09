"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [apiKey, setApiKey] = useState("");

  const handleStart = () => {
    if (apiKey.trim()) {
      sessionStorage.setItem("gemini_api_key", apiKey.trim());
    } else {
      sessionStorage.removeItem("gemini_api_key");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-center">
          Clay Game Engine
        </h1>

        <div className="w-full max-w-md flex flex-col gap-2">
          <input
            type="password"
            placeholder="Enter Gemini API Key (Optional)"
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded text-center text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-neutral-500 text-center">
            Leave empty to use server default (if configured). Key is stored in session only.
          </p>
        </div>

        <Link
          href="/play"
          onClick={handleStart}
          className="px-8 py-4 bg-white text-black font-bold rounded hover:bg-neutral-200 transition-colors text-lg"
        >
          Start
        </Link>
      </div>
    </main>
  );
}