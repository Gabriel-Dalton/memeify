"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { getRoom, getRoundMemes, getVotes } from "@/lib/supabase/game";
import { supabase } from "@/lib/supabase/client";
import { type Meme, type Room, type Vote } from "@/types/memeify";
import { formatVoteCount } from "@/lib/utils";

export default function ResultsPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const roomData = await getRoom(roomCode);
        const [memesData, votesData] = await Promise.all([
          getRoundMemes(roomData.id, roomData.round_number),
          getVotes(roomData.id, roomData.round_number),
        ]);
        setRoom(roomData);
        setMemes(memesData);
        setVotes(votesData);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load results.");
      }
    };

    load();
  }, [roomCode]);

  useEffect(() => {
    if (!room || !supabase) {
      return;
    }
    const client = supabase;

    const channel = client
      .channel(`results-${room.id}-${room.round_number}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${room.id}` }, async () => {
        const refreshed = await getVotes(room.id, room.round_number);
        setVotes(refreshed);
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [room]);

  const ranked = useMemo(() => {
    const voteMap = new Map<string, number>();
    for (const vote of votes) {
      voteMap.set(vote.meme_id, (voteMap.get(vote.meme_id) ?? 0) + 1);
    }

    return [...memes]
      .map((meme) => ({ meme, score: voteMap.get(meme.id) ?? 0 }))
      .sort((a, b) => b.score - a.score);
  }, [memes, votes]);

  const winner = ranked[0];

  return (
    <PageShell title={`Results • ${roomCode}`} subtitle="Round standings based on live voting.">
      {error ? <p className="zine-error">{error}</p> : null}

      {winner ? (
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
            <img
              src={winner.meme.image_url}
              alt="Winning meme"
              className="max-h-[420px] w-full object-contain"
            />
          </div>
        </SectionCard>
      ) : null}

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

      <SectionCard className="flex flex-wrap gap-3">
        <Link href={`/room/${roomCode}`} className="ghost-btn">
          ← Back to room
        </Link>
        <Link href={`/room/${roomCode}/edit`} className="ghost-btn">
          ↻ Start another round
        </Link>
        <Link href="/leaderboard" className="ghost-btn">
          ★ Global leaderboard
        </Link>
      </SectionCard>
    </PageShell>
  );
}
