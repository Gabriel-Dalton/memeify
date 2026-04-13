"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { getSession } from "@/lib/session";
import { castVote, getRoom, getRoundMemes, getVotes, setRoomStatus } from "@/lib/supabase/game";
import { supabase } from "@/lib/supabase/client";
import { type Meme, type Room, type Vote } from "@/types/memeify";

export default function VotePage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const session = getSession();

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
        setError(caught instanceof Error ? caught.message : "Unable to load voting data.");
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
      .channel(`votes-${room.id}-${room.round_number}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${room.id}` }, async () => {
        const freshVotes = await getVotes(room.id, room.round_number);
        setVotes(freshVotes);
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [room]);

  const votesByMeme = useMemo(() => {
    const map = new Map<string, number>();
    for (const vote of votes) {
      map.set(vote.meme_id, (map.get(vote.meme_id) ?? 0) + 1);
    }
    return map;
  }, [votes]);

  const myVote = useMemo(
    () => votes.find((vote) => vote.voter_user_id === session?.userId)?.meme_id ?? null,
    [session?.userId, votes],
  );

  const onVote = async (memeId: string) => {
    if (!room) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await castVote(room.id, memeId, room.round_number);
      const freshVotes = await getVotes(room.id, room.round_number);
      setVotes(freshVotes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Vote failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishVoting = async () => {
    if (!room) return;
    await setRoomStatus(room.id, "results");
    router.push(`/room/${roomCode}/results`);
  };

  return (
    <PageShell title={`Vote • ${roomCode}`} subtitle="Pick the funniest meme this round.">
      {error ? <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memes.map((meme) => {
          const voteCount = votesByMeme.get(meme.id) ?? 0;
          const isMine = meme.user_id === session?.userId;
          const isSelected = myVote === meme.id;

          return (
            <SectionCard key={meme.id} className="space-y-3">
              <img src={meme.image_url} alt={`Meme by ${meme.nickname}`} className="h-64 w-full rounded-xl object-cover" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{meme.nickname}</span>
                <span>{voteCount} vote{voteCount === 1 ? "" : "s"}</span>
              </div>

              <PrimaryButton
                type="button"
                className="w-full"
                onClick={() => onVote(meme.id)}
                disabled={isMine || isSubmitting || Boolean(myVote)}
              >
                {isMine ? "You cannot vote for yourself" : isSelected ? "Voted" : "Vote"}
              </PrimaryButton>
            </SectionCard>
          );
        })}
      </div>

      <SectionCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-300">Need more edits? Jump back to the editor.</p>
        <div className="flex gap-2">
          <Link href={`/room/${roomCode}/edit`}>
            <button className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
              Back to editor
            </button>
          </Link>
          <PrimaryButton type="button" onClick={finishVoting}>
            Show results
          </PrimaryButton>
        </div>
      </SectionCard>
    </PageShell>
  );
}
