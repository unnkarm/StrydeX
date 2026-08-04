"use client";

import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Portfolio } from "@/lib/types";
import StatCard from "@/components/StatCard";

export default function PublicPortfolioPage() {
  const params = useParams<{ username: string }>();
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .portfolio(params.username)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Not found"));
  }, [params.username]);


  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-heading text-4xl">{profile.name}</h1>
          <p className="mt-1 text-muted">
        {profile.verified ? (
          <div className="rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            ✔ Verified{profile.verified_by ? ` by ${profile.verified_by}` : ""}
          </div>
        ) : (
          <div className="rounded-full border border-border px-4 py-1.5 text-sm text-muted">
            Unverified
          </div>
        )}
      </div>

      {profile.bio && <p className="mt-6 max-w-2xl text-foreground/90">{profile.bio}</p>}

      <div className="lane-rule my-8" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Age" value={profile.age ?? "—"} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
