"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InteractiveAthlete from "@/components/InteractiveAthlete";

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress(window.scrollY / totalScroll);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 relative">
      {/* Cinematic Main Section */}
      <div className="grid gap-12 md:grid-cols-2 min-h-screen items-start py-12 relative">
        
        {/* Left Side: Scrolling text narrative segments */}
        <div className="space-y-[45vh] py-[10vh] pr-0 md:pr-8">
          
          {/* Chapter 1: Hero */}
          <div className="min-h-[60vh] flex flex-col justify-center">
            <div className="mb-4 text-xs font-mono uppercase tracking-[0.3em] text-accent">
              TRAIN. ANALYZE. EVOLVE.
            </div>
            <h1 className="display-heading text-5xl leading-[1.05] text-foreground md:text-6xl">
              AI-POWERED
              <br />
              ATHLETE PERFORMANCE
            </h1>
            <p className="mt-6 text-muted max-w-md text-sm md:text-base">
              Turn your training data and movement into measurable progress. Build a verified profile to showcase your biomechanical strengths.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity"
              >
                Start Your Journey
              </Link>
              <Link
                href="/scout"
                className="rounded-full border border-border px-6 py-3 font-medium text-foreground hover:border-accent transition-colors"
              >
                Explore Athletes
              </Link>
            </div>
          </div>

          {/* Chapter 2: Biomechanics */}
          <div className="min-h-[50vh] flex flex-col justify-center">
            <div className="text-xs font-mono uppercase tracking-widest text-accent mb-2">01 / MOVEMENT</div>
            <h2 className="display-heading text-3xl text-foreground">Interactive Biomechanics</h2>
            <p className="mt-4 text-muted text-sm leading-relaxed max-w-md">
              StrydeX fits keypose models directly onto training footage. Look at the canvas to inspect joint angle highlights, stability, and bilateral symmetry markers in real time.
            </p>
          </div>

          {/* Chapter 3: Analytics */}
          <div className="min-h-[50vh] flex flex-col justify-center">
            <div className="text-xs font-mono uppercase tracking-widest text-accent mb-2">02 / DATA TRANSFORMATION</div>
            <h2 className="display-heading text-3xl text-foreground">Draggable Data Fields</h2>
            <p className="mt-4 text-muted text-sm leading-relaxed max-w-md">
              Watch the athlete morph into a 3D analytics landscape. Track how velocity, release metrics, and body battery indices connect inside a draggable coordinate grid.
            </p>
          </div>

          {/* Chapter 4: Intelligence Dashboard */}
          <div className="min-h-[50vh] flex flex-col justify-center">
            <div className="text-xs font-mono uppercase tracking-widest text-accent mb-2">03 / DECISION ENGINE</div>
            <h2 className="display-heading text-3xl text-foreground">Lab-Grade Performance</h2>
            <p className="mt-4 text-muted text-sm leading-relaxed max-w-md">
              Your biometric profiles are folded into an action plan. Access verified profiles to check performance ratings, injury risk reports, and tailored training goals.
            </p>
          </div>

        </div>

        {/* Right Side: Sticky 3D Lab Box */}
        <div className="sticky top-[10vh] h-[80vh] w-full hidden md:flex items-center justify-center rounded-xl border border-border bg-surface/30 shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Scanning line grids */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(212,255,79,0.02)_1px,transparent_1px)] bg-[size:100%_40px] pointer-events-none" />
          <InteractiveAthlete scrollProgress={scrollProgress} />
        </div>

      </div>

      <div className="lane-rule my-8" />

      {/* Grid overview */}
      <section id="features" className="py-16">
        <h2 className="display-heading text-xs text-muted tracking-widest uppercase mb-8">Performance Capabilities</h2>
        <div className="grid gap-6 sm:grid-cols-4">
          {[
            { label: "Performance Log", copy: "Sprint, batting, and daily checkin trends over time." },
            { label: "Video AI", copy: "Pose estimation and joint-angle telemetry dashboards." },
            { label: "Verification", copy: "Shareable portfolio links scouts can filter and trust." },
            { label: "AI Insights", copy: "Dynamic recommendations tailored to your biomechanics." },
          ].map((f) => (
            <div key={f.label} className="rounded-lg border border-border bg-surface p-5 hover:border-accent transition-colors">
              <div className="display-heading text-sm text-accent">{f.label}</div>
              <p className="mt-2 text-xs text-muted leading-relaxed">{f.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-2 p-8">
          <p className="display-heading text-xl">Designed for cricketers. Built for discovery.</p>
          <Link
            href="/signup"
            className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity"
          >
            Start Analyzing →
          </Link>
        </div>
      </section>
    </div>
  );
}
