import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="grid gap-10 py-20 md:grid-cols-2 md:items-center">
        <div>
          <div className="mb-4 text-xs uppercase tracking-[0.3em] text-accent">
            Athlete Portfolio &middot; Verified
          </div>
          <h1 className="display-heading text-5xl leading-[1.05] text-foreground md:text-6xl">
            Your training,
            <br />
            timed, verified,
            <br />
            <span className="text-accent">discoverable.</span>
          </h1>
          <p className="mt-6 max-w-md text-muted">
            StrydeX turns scattered training clips and notebook stats into one
            shareable portfolio — analyzed by computer vision, verified by
            your coach, and searchable by scouts.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity"
            >
              Build your portfolio
            </Link>
            <Link
              href="/scout"
              className="rounded-full border border-border px-6 py-3 font-medium text-foreground hover:border-accent transition-colors"
            >
              Scout athletes
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="display-heading text-lg">Unnita Roy</div>
              <div className="text-sm text-muted">Sprinter &middot; SAI Kolkata</div>
            </div>
            <div className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              ✔ Verified
            </div>
          </div>
          <div className="lane-rule my-5" />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted">100m PB</div>
              <div className="stat-value text-2xl text-foreground">11.4s</div>
            </div>
            <div>
              <div className="text-xs text-muted">Vertical</div>
              <div className="stat-value text-2xl text-foreground">58cm</div>
            </div>
            <div>
              <div className="text-xs text-muted">Streak</div>
              <div className="stat-value text-2xl text-accent">18d</div>
            </div>
          </div>
        </div>
      </section>

      <div className="lane-rule" />

      <section id="how-it-works" className="grid gap-8 py-16 md:grid-cols-3">
        {[
          {
            step: "Track",
            copy: "Log training sessions and upload match or drill footage.",
          },
          {
            step: "Analyze",
            copy: "Computer vision extracts movement metrics automatically from every clip.",
          },
          {
            step: "Get found",
            copy: "Coach-verified stats and a public link scouts can search and trust.",
          },
        ].map((item) => (
          <div key={item.step}>
            <div className="display-heading text-sm text-accent">{item.step}</div>
            <p className="mt-2 text-foreground">{item.copy}</p>
          </div>
        ))}
      </section>

      <div className="lane-rule" />

      <section id="for-athletes" className="py-16">
        <h2 className="display-heading text-sm text-muted">Athlete Features</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { label: "Performance", copy: "Sprint, jump, and session trends over time." },
            { label: "Video AI", copy: "Pose estimation and joint-angle breakdowns." },
            { label: "Portfolio", copy: "One shareable, coach-verified profile." },
            { label: "Progress", copy: "See what's improving, session to session." },
          ].map((f) => (
            <div key={f.label} className="rounded-lg border border-border bg-surface p-4">
              <div className="display-heading text-sm text-accent">{f.label}</div>
              <p className="mt-2 text-sm text-muted">{f.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-2 p-8">
          <p className="display-heading text-xl">Built for athletes. Designed for discovery.</p>
          <Link
            href="/signup"
            className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 transition-opacity"
          >
            Get Started →
          </Link>
        </div>
      </section>
    </div>
  );
}
