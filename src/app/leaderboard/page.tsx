"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { getGlobalLeaderboard } from "@/lib/supabase/game";
import type { LeaderboardEntry } from "@/types/memeify";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setEntries(await getGlobalLeaderboard(30));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <PageShell title="Leaderboard" subtitle="Most voted meme creators across all rooms.">
      <SectionCard>
        {loading ? <p className="text-sm text-slate-300">Loading leaderboard...</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2">Votes</th>
                  <th className="px-3 py-2">Memes Submitted</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.userId} className="border-b border-white/5">
                    <td className="px-3 py-3 font-semibold">#{index + 1}</td>
                    <td className="px-3 py-3">{entry.nickname}</td>
                    <td className="px-3 py-3">{entry.totalVotes}</td>
                    <td className="px-3 py-3">{entry.totalMemes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>
    </PageShell>
  );
}
