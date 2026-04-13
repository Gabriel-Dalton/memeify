"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Countdown } from "@/components/game/countdown";
import { MemeEditor } from "@/components/editor/meme-editor";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { dataUrlToBlob } from "@/lib/image";
import { getSession } from "@/lib/session";
import {
  countActiveMembers,
  countRoundMemes,
  setRoomStatus,
  submitMeme,
  uploadMemeImage,
} from "@/lib/supabase/game";
import { supabase } from "@/lib/supabase/client";
import { useRoomSync } from "@/lib/supabase/use-room-sync";

export default function EditRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const session = getSession();
  const { room, error: syncError } = useRoomSync(roomCode, session?.userId, "editing");

  const [error] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const transitioningRef = useRef(false);

  const checkAllSubmitted = useCallback(async () => {
    if (!room || transitioningRef.current) return;
    try {
      const [memesCount, activeCount] = await Promise.all([
        countRoundMemes(room.id, room.round_number),
        countActiveMembers(room.id),
      ]);
      setSubmittedCount(memesCount);
      setTotalCount(activeCount);
      if (activeCount > 0 && memesCount >= activeCount) {
        transitioningRef.current = true;
        await setRoomStatus(room.id, "voting");
        // useRoomSync will navigate everyone.
      }
    } catch (caught) {
      console.error("auto-transition check failed", caught);
    }
  }, [room]);

  // Check immediately + whenever memes/members change via realtime.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkAllSubmitted();
  }, [checkAllSubmitted]);

  useEffect(() => {
    if (!room || !supabase) return;
    const client = supabase;
    const channel = client
      .channel(`edit-progress-${room.id}-${room.round_number}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memes", filter: `room_id=eq.${room.id}` },
        () => checkAllSubmitted(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${room.id}` },
        () => checkAllSubmitted(),
      )
      .subscribe();

    // Also poll every 3s as a fallback in case Realtime hiccups.
    const interval = window.setInterval(() => void checkAllSubmitted(), 3000);

    return () => {
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [room, checkAllSubmitted]);

  const onSubmit = async (dataUrl: string) => {
    if (!room) throw new Error("Room is unavailable.");
    if (!session?.nickname) throw new Error("Join a room before submitting.");

    const blob = dataUrlToBlob(dataUrl);
    let imageUrl: string;
    try {
      imageUrl = await uploadMemeImage(room.code, session.userId, blob);
    } catch (caught) {
      console.error("Storage upload failed, using data URL fallback.", caught);
      imageUrl = dataUrl;
    }

    await submitMeme({
      roomId: room.id,
      roundNumber: room.round_number,
      nickname: session.nickname,
      imageUrl,
    });

    setSubmitted(true);
    void checkAllSubmitted();
  };

  const progressPct = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

  return (
    <PageShell
      title={`Make the meme • Round ${room?.round_number ?? 1}`}
      subtitle="Upload a photo, caption it, stack filters, drop face parts. Round ends automatically once everyone submits."
    >
      <SectionCard className="space-y-4">
        <Countdown roomCode={roomCode} onExpire={() => setExpired(true)} />

        {/* Submission progress bar */}
        <div>
          <div className="mb-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.15em] text-ink/70">
            <span>Submissions</span>
            <span>
              {submittedCount} / {totalCount}
            </span>
          </div>
          <div className="relative h-4 border-[2.5px] border-ink bg-paper-deep">
            <div
              className="h-full bg-riso-pink transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {submitted ? (
          <div className="border-[2.5px] border-ink bg-riso-green p-3 font-mono text-sm shadow-stamp-sm">
            ✓ Submitted. Feel free to resubmit a better one — just hit submit again.
          </div>
        ) : null}
        {expired ? (
          <p className="zine-error">
            ⏰ Time&apos;s up on the suggested 3 minute timer — but you can still submit while others finish.
          </p>
        ) : null}
        {syncError || error ? <p className="zine-error">{syncError ?? error}</p> : null}

        <p className="font-pixel text-base text-ink/70">
          &gt; round ends automatically once everyone has submitted_
        </p>
      </SectionCard>

      <MemeEditor onSubmit={onSubmit} disabled={false} />
    </PageShell>
  );
}
