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
        {loading ? <p className="font-mono text-sm text-ink/70">Loading leaderboard…</p> : null}
        {error ? <p className="zine-error">{error}</p> : null}

        {!loading && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-3">Rank</th>
                  <th className="px-3 py-3">Player</th>
                  <th className="px-3 py-3">Votes</th>
                  <th className="px-3 py-3">Memes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const medal =
                    index === 0
                      ? "bg-riso-yellow"
                      : index === 1
                      ? "bg-riso-pink text-paper"
                      : index === 2
                      ? "bg-riso-blue text-paper"
                      : "";
                  return (
                    <tr key={entry.userId} className={medal}>
                      <td className="px-3 py-3 font-display text-base">
                        #{String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-3 font-mono">{entry.nickname}</td>
                      <td className="px-3 py-3 font-display">{entry.totalVotes}</td>
                      <td className="px-3 py-3 font-mono">{entry.totalMemes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>
    </PageShell>
  );
}
