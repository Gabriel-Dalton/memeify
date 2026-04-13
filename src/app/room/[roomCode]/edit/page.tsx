"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Countdown } from "@/components/game/countdown";
import { MemeEditor } from "@/components/editor/meme-editor";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { dataUrlToBlob } from "@/lib/image";
import { getSession } from "@/lib/session";
import { getRoom, setRoomStatus, submitMeme, uploadMemeImage } from "@/lib/supabase/game";
import { type Room } from "@/types/memeify";

export default function EditRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const nextRoom = await getRoom(roomCode);
        setRoom(nextRoom);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load room.");
      }
    };

    load();
  }, [roomCode]);

  const onSubmit = async (dataUrl: string) => {
    if (!room) {
      throw new Error("Room is unavailable.");
    }

    const session = getSession();
    if (!session?.nickname) {
      throw new Error("Join a room before submitting.");
    }

    const blob = dataUrlToBlob(dataUrl);
    let imageUrl: string;

    try {
      imageUrl = await uploadMemeImage(room.code, session.userId, blob);
    } catch (caught) {
      console.error("Storage upload failed, using data URL fallback.", caught);
      // Storage can be disabled in some Supabase setups; keep MVP flow moving with data URL fallback.
      imageUrl = dataUrl;
    }

    await submitMeme({
      roomId: room.id,
      roundNumber: room.round_number,
      nickname: session.nickname,
      imageUrl,
    });

    await setRoomStatus(room.id, "voting");
    router.push(`/room/${roomCode}/vote`);
  };

  return (
    <PageShell title={`Edit meme • ${roomCode}`} subtitle="Drag captions, add stickers, distort it, and submit before time runs out.">
      <SectionCard className="space-y-4">
        <Countdown roomCode={roomCode} onExpire={() => setExpired(true)} />
        {expired ? (
          <p className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-200">
            Time is up. Start another round or head to voting.
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </SectionCard>

      <MemeEditor onSubmit={onSubmit} disabled={expired} />
    </PageShell>
  );
}
