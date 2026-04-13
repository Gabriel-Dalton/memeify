"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Countdown } from "@/components/game/countdown";
import { MemeEditor } from "@/components/editor/meme-editor";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { dataUrlToBlob } from "@/lib/image";
import { getSession } from "@/lib/session";
import { setRoomStatus, submitMeme, uploadMemeImage } from "@/lib/supabase/game";
import { useRoomSync } from "@/lib/supabase/use-room-sync";

export default function EditRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const session = getSession();
  const { room, isAdmin, error: syncError } = useRoomSync(
    roomCode,
    session?.userId,
    "editing",
  );
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [endingRound, setEndingRound] = useState(false);

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
  };

  const endEditingPhase = async () => {
    if (!room || !isAdmin) return;
    setEndingRound(true);
    try {
      await setRoomStatus(room.id, "voting");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not end round.");
      setEndingRound(false);
    }
  };

  return (
    <PageShell
      title={`Make the meme • Round ${room?.round_number ?? 1}`}
      subtitle="Upload a photo, slap captions, remix filters. Submit before the host ends the round."
    >
      <SectionCard className="space-y-4">
        <Countdown roomCode={roomCode} onExpire={() => setExpired(true)} />
        {submitted ? (
          <div className="border-[2.5px] border-ink bg-riso-green p-4 font-mono text-sm shadow-stamp-sm">
            ✓ Meme submitted. You can keep editing and resubmit, or wait for the host to end the round.
          </div>
        ) : null}
        {expired ? (
          <p className="zine-error">⏰ Time&apos;s up! Submit what you have before the host ends the round.</p>
        ) : null}
        {syncError || error ? <p className="zine-error">{syncError ?? error}</p> : null}

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-3 border-t-2 border-dashed border-ink/30 pt-4">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
              Host controls →
            </p>
            <PrimaryButton type="button" onClick={endEditingPhase} disabled={endingRound}>
              {endingRound ? "Ending round…" : "▸ End round & start voting"}
            </PrimaryButton>
            <span className="font-mono text-xs text-ink/60">
              Sends everyone to the voting page at once.
            </span>
          </div>
        ) : (
          <p className="font-pixel text-lg text-ink/70">&gt; waiting for host to end the round_</p>
        )}
      </SectionCard>

      <MemeEditor onSubmit={onSubmit} disabled={false} />
    </PageShell>
  );
}
