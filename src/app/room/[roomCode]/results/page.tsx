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
      {error ? <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      {winner ? (
        <SectionCard className="space-y-3">
          <p className="text-sm uppercase tracking-wide text-fuchsia-200">Winner</p>
          <p className="text-2xl font-black">🏆 {winner.meme.nickname}</p>
          <p className="text-sm text-slate-300">{formatVoteCount(winner.score)}</p>
          <img src={winner.meme.image_url} alt="Winning meme" className="max-h-[420px] w-full rounded-2xl object-contain" />
        </SectionCard>
      ) : null}

      <SectionCard>
        <h2 className="text-lg font-bold">Full ranking</h2>
        <ul className="mt-4 space-y-3">
          {ranked.map((entry, index) => (
            <li key={entry.meme.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm">
              <span>
                #{index + 1} {entry.meme.nickname}
              </span>
              <span>{formatVoteCount(entry.score)}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard className="flex flex-wrap gap-2">
        <Link href={`/room/${roomCode}`} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
          Back to room
        </Link>
        <Link href={`/room/${roomCode}/edit`} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
          Start another round
        </Link>
        <Link href="/leaderboard" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
          Global leaderboard
        </Link>
      </SectionCard>
    </PageShell>
  );
}
