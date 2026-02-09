"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Zap, Layers, Wand2, Terminal, Play } from "lucide-react";

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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="font-bold text-black text-sm">C</span>
            </div>
            <span className="font-bold tracking-tight">Clay Engine</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-neutral-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
            <Link href="https://github.com/Henry8772/gemini-ai-engine" target="_blank" className="hover:text-white transition-colors">GitHub</Link>
            <Link
              href="/play"
              className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200 transition-colors flex items-center gap-2"
            >
              Start Playing
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800/20 via-black to-black pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-neutral-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            Built for Gemini 3 Hackathon
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 animate-in fade-in slide-in-from-bottom-8 duration-700">
            The World's First <br />
            Liquid Game Engine.
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-900 delay-100">
            Built entirely on Gemini 3. No compiled code, no static assets.
            Just language, imagination, and real-time "God Mode" modification.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 mb-16">
            <div className="flex flex-col gap-2 w-full max-w-sm">
              <div className="relative group">
                <input
                  type="password"
                  placeholder="Enter Gemini API Key (Optional)"
                  className="w-full px-5 py-3 bg-neutral-900/50 border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all text-sm backdrop-blur-sm"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-neutral-600 text-left px-1">
                Key is stored in session only. Leave empty to use server default.
              </p>
            </div>
            <Link
              href="/play"
              onClick={handleStart}
              className="w-full sm:w-auto px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 group whitespace-nowrap self-start"
            >
              Launch Engine
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* YouTube Video Embed */}
          <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/EshMFE5oguc?autoplay=1&mute=1"
              title="Gemini AI Engine Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Gallery Showcase */}
      <section className="py-20 bg-neutral-950/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl group">
              <Image
                src="/assets/gallery/gallery.png"
                alt="Game Gallery"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Infinite Possibilities</h3>
                  <p className="text-neutral-400 text-sm">From tactical RPGs to puzzle games, generated in seconds.</p>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Wand2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Text-to-State</h3>
                  <p className="text-neutral-400 leading-relaxed">
                    Unlike tools that just generate code, Clay uses Gemini as the runtime server.
                    The engine manages state, rules, and assets purely through language.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Real-time "God Mode"</h3>
                  <p className="text-neutral-400 leading-relaxed">
                    Rewrite rules or visuals mid-game. Type "Make the floor lava" and the engine
                    hot-swaps assets and logic instantly without recompiling.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Terminal className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Zero Hard-Coded Logic</h3>
                  <p className="text-neutral-400 leading-relaxed">
                    Physics and combat are just text strings processed by the LLM.
                    If you write "Knights can jump walls," it becomes a mechanic instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">From Prompt to Playable</h2>
          <p className="text-neutral-400">
            A pipeline of specialized AI agents works like a movie studio to build your game.
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "1. The Concept",
              desc: "The Scene Agent imagines the entire game screen as a single high-fidelity image.",
              img: "/assets/images/scene.png"
            },
            {
              title: "2. The Extraction",
              desc: "Characters are surgically removed, background is cleaned, and sprites are generated.",
              img: "/assets/images/sprites.png" // Using the transparent sprites image
            },
            {
              title: "3. The Logic",
              desc: "NavMesh Agent maps the world, and State Agent assigns rules and stats.",
              img: "/assets/images/navmesh.png"
            },
          ].map((step, i) => (
            <div key={i} className="group relative bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
              <div className="aspect-square relative">
                <Image
                  src={step.img}
                  alt={step.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-2 text-white">{step.title}</h3>
                <p className="text-sm text-neutral-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-neutral-950 text-center">
        <p className="text-neutral-500 text-sm mb-4">
          Built for Gemini 3 Hackathon. Powered by Google DeepMind.
        </p>
        <div className="flex justify-center gap-6 text-sm text-neutral-400">
          <Link href="#" className="hover:text-white transition-colors">Documentation</Link>
          <Link href="https://www.youtube.com/watch?v=EshMFE5oguc" target="_blank" className="hover:text-white transition-colors">YouTube</Link>
          <Link href="https://github.com/Henry8772/gemini-ai-engine" className="hover:text-white transition-colors">Source Code</Link>
        </div>
      </footer>
    </div>
  );
}