"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { getRoundMemes, getVotes, startNextRound } from "@/lib/supabase/game";
import { supabase } from "@/lib/supabase/client";
import { type Meme, type Vote } from "@/types/memeify";
import { formatVoteCount } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { useRoomSync } from "@/lib/supabase/use-room-sync";

export default function ResultsPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const session = getSession();
  const { room, isAdmin, error: syncError } = useRoomSync(
    roomCode,
    session?.userId,
    "results",
  );

  const [memes, setMemes] = useState<Meme[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!room) return;
    const load = async () => {
      try {
        const [m, v] = await Promise.all([
          getRoundMemes(room.id, room.round_number),
          getVotes(room.id, room.round_number),
        ]);
        setMemes(m);
        setVotes(v);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load results.");
      }
    };
    load();
  }, [room]);

  useEffect(() => {
    if (!room || !supabase) return;
    const client = supabase;
    const channel = client
      .channel(`results-${room.id}-${room.round_number}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${room.id}` },
        async () => {
          const fresh = await getVotes(room.id, room.round_number);
          setVotes(fresh);
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [room]);

  const ranked = useMemo(() => {
    const voteMap = new Map<string, number>();
    for (const v of votes) voteMap.set(v.meme_id, (voteMap.get(v.meme_id) ?? 0) + 1);
    return [...memes]
      .map((meme) => ({ meme, score: voteMap.get(meme.id) ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [memes, votes]);

  const winner = ranked[0];

  const nextRound = async () => {
    if (!room || !isAdmin) return;
    setAdvancing(true);
    try {
      await startNextRound(room.id, room.round_number);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't start next round.");
      setAdvancing(false);
    }
  };

  return (
    <PageShell
      title={`Results • Round ${room?.round_number ?? 1}`}
      subtitle="The votes are in. Bask in it — or demand a rematch."
    >
      {syncError || error ? <p className="zine-error">{syncError ?? error}</p> : null}

      {winner && winner.score > 0 ? (
        <SectionCard className="space-y-4 bg-riso-yellow">
          <div className="flex items-center gap-3">
            <span className="border-[2.5px] border-ink bg-ink px-2 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-paper">
              ★ 1ST PLACE
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink/70">
              {formatVoteCount(winner.score)}
            </span>
          </div>
          <p className="font-display text-4xl leading-none riso-print">
            🏆 {winner.meme.nickname}
          </p>
          <div className="border-[3px] border-ink bg-paper p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={winner.meme.image_url}
              alt="Winning meme"
              className="max-h-[420px] w-full object-contain"
            />
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <p className="font-mono text-sm text-ink/70">
            No votes were cast this round. Everyone loses equally.
          </p>
        </SectionCard>
      )}

      <SectionCard>
        <h2 className="font-display text-xl">Full ranking</h2>
        <ul className="mt-4 space-y-2">
          {ranked.map((entry, index) => (
            <li
              key={entry.meme.id}
              className="flex items-center justify-between border-[2px] border-ink bg-paper-deep px-4 py-3 font-mono text-sm shadow-stamp-sm"
            >
              <span className="flex items-center gap-3">
                <span className="font-display text-riso-pink">
                  #{String(index + 1).padStart(2, "0")}
                </span>
                {entry.meme.nickname}
              </span>
              <span className="font-display text-xs uppercase tracking-wide">
                {formatVoteCount(entry.score)}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard className="flex flex-wrap items-center gap-3">
        {isAdmin ? (
          <>
            <p className="font-mono text-sm text-ink/80">
              Host controls →
            </p>
            <PrimaryButton type="button" onClick={nextRound} disabled={advancing}>
              {advancing ? "Starting…" : `▸ Next round`}
            </PrimaryButton>
          </>
        ) : (
          <p className="font-pixel text-lg text-ink/70">
            &gt; waiting for host to start next round_
          </p>
        )}
        <Link href="/leaderboard" className="ghost-btn">
          ★ Global leaderboard
        </Link>
      </SectionCard>
    </PageShell>
  );
}
