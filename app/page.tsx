"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          Clay Game Engine
        </h1>

        <Link
          href="/play"
          className="px-8 py-4 bg-white text-black font-bold rounded hover:bg-neutral-200 transition-colors text-lg"
        >
          Start
        </Link>
      </div>
    </main>
  );
}