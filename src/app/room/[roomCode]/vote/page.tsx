"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { getSession } from "@/lib/session";
import {
  castVote,
  countActiveMembers,
  countRoundVoters,
  getRoundMemes,
  getVotes,
  setRoomStatus,
} from "@/lib/supabase/game";
import { supabase } from "@/lib/supabase/client";
import { type Meme, type Vote } from "@/types/memeify";
import { formatVoteCount } from "@/lib/utils";
import { useRoomSync } from "@/lib/supabase/use-room-sync";
import { LeaveButton } from "@/components/game/leave-button";

export default function VotePage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const session = getSession();
  const { room, isAdmin, error: syncError, leaveNotice } = useRoomSync(
    roomCode,
    session?.userId,
    "voting",
  );

  const [memes, setMemes] = useState<Meme[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voterCount, setVoterCount] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [showingResults, setShowingResults] = useState(false);
  const [memesLoaded, setMemesLoaded] = useState(false);
  const transitioningRef = useRef(false);

  const roomId = room?.id;
  const roundNumber = room?.round_number;

  const memeAuthors = useMemo(
    () => new Set(memes.map((m) => m.user_id)),
    [memes],
  );

  const checkAllVoted = useCallback(async () => {
    if (!roomId || !roundNumber || transitioningRef.current) return;
    try {
      const [voters, active] = await Promise.all([
        countRoundVoters(roomId, roundNumber),
        countActiveMembers(roomId),
      ]);
      setVoterCount(voters);
      setTotalVoters(active);

      if (active <= 0) return;

      // Everyone who CAN vote has voted. Players who authored the only meme
      // can't vote for themselves and have no other option, so they don't
      // count as expected voters when there's only 1 meme.
      const eligibleVoters =
        memes.length === 1
          ? active - memes.filter((m) => memeAuthors.has(m.user_id)).length
          : active;

      if (eligibleVoters > 0 && voters >= eligibleVoters) {
        transitioningRef.current = true;
        await setRoomStatus(roomId, "results");
      }
    } catch (caught) {
      console.error("auto-transition check failed", caught);
    }
  }, [roomId, roundNumber, memes, memeAuthors]);

  useEffect(() => {
    if (!roomId || !roundNumber) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [m, v] = await Promise.all([
          getRoundMemes(roomId, roundNumber),
          getVotes(roomId, roundNumber),
        ]);
        if (cancelled) return;
        setMemes(m);
        setVotes(v);
        setMemesLoaded(true);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load voting data.");
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [roomId, roundNumber]);

  // When we discover 0 memes, auto-skip to results immediately.
  useEffect(() => {
    if (!roomId || !memesLoaded || transitioningRef.current) return;
    if (memes.length === 0) {
      transitioningRef.current = true;
      void setRoomStatus(roomId, "results");
    }
  }, [roomId, memesLoaded, memes.length]);

  useEffect(() => {
    if (!roomId || !roundNumber || !supabase) return;
    const client = supabase;
    const channel = client
      .channel(`vote-sync-${roomId}-${roundNumber}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${roomId}` },
        async () => {
          const fresh = await getVotes(roomId, roundNumber);
          setVotes(fresh);
          void checkAllVoted();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        () => checkAllVoted(),
      )
      .subscribe();

    const interval = window.setInterval(() => void checkAllVoted(), 3000);
    void checkAllVoted();

    return () => {
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [roomId, roundNumber, checkAllVoted]);

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
      void checkAllVoted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Vote failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showResultsNow = async () => {
    if (!room || transitioningRef.current) return;
    setShowingResults(true);
    setError(null);
    try {
      transitioningRef.current = true;
      await setRoomStatus(room.id, "results");
    } catch (caught) {
      transitioningRef.current = false;
      setError(caught instanceof Error ? caught.message : "Could not show results.");
      setShowingResults(false);
    }
  };

  const progressPct = totalVoters > 0 ? Math.round((voterCount / totalVoters) * 100) : 0;

  return (
    <PageShell
      title={`Pick the funniest • Round ${room?.round_number ?? 1}`}
      subtitle="Vote for the best caption. You can't vote for your own. Results pop up once everyone has voted."
    >
      <SectionCard className="space-y-3">
        <div className="flex items-center justify-end">
          <LeaveButton roomId={room?.id} prominent />
        </div>
        {leaveNotice ? (
          <div className="border-[2.5px] border-ink bg-riso-yellow px-3 py-2 font-mono text-xs uppercase tracking-[0.15em] shadow-stamp-sm">
            ← {leaveNotice}
          </div>
        ) : null}
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.15em] text-ink/70">
          <span>Votes in</span>
          <span>
            {voterCount} / {totalVoters}
          </span>
        </div>
        <div className="relative h-4 border-[2.5px] border-ink bg-paper-deep">
          <div
            className="h-full bg-riso-blue transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {syncError || error ? <p className="zine-error">{syncError ?? error}</p> : null}
      </SectionCard>

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
                  className="h-64 w-full object-contain"
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
        {memes.length === 0 && memesLoaded ? (
          <SectionCard className="col-span-full text-center">
            <p className="font-mono text-sm text-ink/70">No memes were submitted this round — skipping to results.</p>
          </SectionCard>
        ) : null}
      </div>

      <SectionCard className="space-y-3">
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">Host controls →</span>
            <PrimaryButton
              type="button"
              onClick={showResultsNow}
              disabled={showingResults}
            >
              {showingResults ? "Showing…" : "Show results now"}
            </PrimaryButton>
          </div>
        ) : (
          <p className="font-pixel text-lg text-ink/70">
            &gt; results appear as soon as everyone has voted_
          </p>
        )}
      </SectionCard>
    </PageShell>
  );
}
