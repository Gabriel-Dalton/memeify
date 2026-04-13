"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { getSession } from "@/lib/session";
import { castVote, getRoundMemes, getVotes, setRoomStatus } from "@/lib/supabase/game";
import { supabase } from "@/lib/supabase/client";
import { type Meme, type Vote } from "@/types/memeify";
import { formatVoteCount } from "@/lib/utils";
import { useRoomSync } from "@/lib/supabase/use-room-sync";

export default function VotePage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const session = getSession();
  const { room, isAdmin, error: syncError } = useRoomSync(
    roomCode,
    session?.userId,
    "voting",
  );

  const [memes, setMemes] = useState<Meme[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);

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
        setError(caught instanceof Error ? caught.message : "Unable to load voting data.");
      }
    };
    load();
  }, [room]);

  useEffect(() => {
    if (!room || !supabase) return;
    const client = supabase;
    const channel = client
      .channel(`votes-${room.id}-${room.round_number}`)
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

  const votesByMeme = useMemo(() => {
    const map = new Map<string, number>();
    for (const vote of votes) map.set(vote.meme_id, (map.get(vote.meme_id) ?? 0) + 1);
    return map;
  }, [votes]);

  const myVote = useMemo(
    () => votes.find((v) => v.voter_user_id === session?.userId)?.meme_id ?? null,
    [session?.userId, votes],
  );

  const onVote = async (memeId: string) => {
    if (!room) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await castVote(room.id, memeId, room.round_number);
      const fresh = await getVotes(room.id, room.round_number);
      setVotes(fresh);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Vote failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const endVoting = async () => {
    if (!room || !isAdmin) return;
    setEnding(true);
    try {
      await setRoomStatus(room.id, "results");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't close voting.");
      setEnding(false);
    }
  };

  return (
    <PageShell
      title={`Pick the funniest • Round ${room?.round_number ?? 1}`}
      subtitle="Vote for the best caption. You can't vote for your own."
    >
      {syncError || error ? <p className="zine-error">{syncError ?? error}</p> : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {memes.map((meme, i) => {
          const voteCount = votesByMeme.get(meme.id) ?? 0;
          const isMine = meme.user_id === session?.userId;
          const isSelected = myVote === meme.id;
          const rotate = i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.8deg]";
          return (
            <SectionCard
              key={meme.id}
              className={`space-y-3 transition-transform hover:rotate-0 ${rotate} ${
                isSelected ? "bg-riso-yellow" : ""
              }`}
            >
              <div className="border-[2.5px] border-ink bg-paper-deep p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meme.image_url}
                  alt={`Meme by ${meme.nickname}`}
                  className="h-64 w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-display text-sm uppercase tracking-wide">{meme.nickname}</span>
                <span className="border-[2px] border-ink bg-riso-pink px-2 py-0.5 font-display text-xs">
                  {formatVoteCount(voteCount)}
                </span>
              </div>
              <PrimaryButton
                type="button"
                className="w-full"
                onClick={() => onVote(meme.id)}
                disabled={isMine || isSubmitting || Boolean(myVote)}
              >
                {isMine ? "Can't vote for yourself" : isSelected ? "★ Voted" : "Vote"}
              </PrimaryButton>
            </SectionCard>
          );
        })}
        {memes.length === 0 ? (
          <SectionCard className="col-span-full text-center">
            <p className="font-mono text-sm text-ink/70">No memes were submitted this round. Oof.</p>
          </SectionCard>
        ) : null}
      </div>

      <SectionCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isAdmin ? (
          <>
            <p className="font-mono text-sm text-ink/80">
              When everyone&apos;s voted, close the round.
            </p>
            <PrimaryButton type="button" onClick={endVoting} disabled={ending}>
              {ending ? "Closing…" : "▸ Show results"}
            </PrimaryButton>
          </>
        ) : (
          <p className="font-pixel text-lg text-ink/70">
            &gt; waiting for host to close voting_
          </p>
        )}
      </SectionCard>
    </PageShell>
  );
}
