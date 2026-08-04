"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { AthleteProfile, PerformanceLog, VideoItem } from "@/lib/types";
import StatCard from "@/components/StatCard";
import ProgressChart from "@/components/ProgressChart";

  useEffect(() => {
    if (meLoading) return;
    if (!me) {
      router.push("/login");
      return;
    }
    if (me.role !== "athlete") return;

    api.myPerformanceLogs().then(setLogs).catch(() => {});
    api.myVideos().then(setVideos).catch(() => {});
  }, [me, meLoading, router]);

    } finally {
      setSavingLog(false);
    }
  }

  if (meLoading || !me) return <div className="px-6 py-16 text-muted">Loading...</div>;

  if (me.role !== "athlete") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="display-heading text-2xl">Dashboard</h1>
        <p className="mt-3 text-muted">
          You&apos;re signed in as a {me.role}. Head to{" "}
          <Link href="/scout" className="text-accent hover:underline">
            Scout
          </Link>{" "}
          to search athletes.
        </p>
      </div>
    );
  }

  if (profileMissing) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="display-heading text-2xl">Set up your profile</h1>
        <p className="mt-3 text-muted">Create your athlete profile to unlock your dashboard.</p>
        <Link
          href="/profile/edit"
          className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-medium text-accent-ink"
        >
          Create profile
        </Link>
      </div>
    );
  }

  if (!profile) return <div className="px-6 py-16 text-muted">Loading...</div>;

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-heading text-3xl">Hello, {profile.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.sport || "—"} &middot; {profile.position || "—"}
            {profile.verified && <span className="ml-2 text-accent">✔ Verified</span>}
          </p>
        </div>
        <div className="flex gap-3">
            View public page
          </Link>
        </div>
      </div>

      <div className="lane-rule my-8" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Sessions logged" value={logs.length} />
        <StatCard label="Videos analyzed" value={videos.length} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="mt-3">
            <ProgressChart logs={logs} />
          </div>

            </button>
          </form>
        </div>

        <div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
