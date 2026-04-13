"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { saveSession } from "@/lib/session";
import { getRoom, joinRoomByCode } from "@/lib/supabase/game";
import { safeRoomCode } from "@/lib/utils";

export default function JoinRoomWithCodePage() {
  const params = useParams<{ roomCode: string }>();
  const router = useRouter();
  const roomCode = safeRoomCode(String(params.roomCode ?? ""));

  const [roomName, setRoomName] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Confirm the room exists (and show its name) before asking for the nickname.
  useEffect(() => {
    let cancelled = false;
    const lookup = async () => {
      try {
        const room = await getRoom(roomCode);
        if (cancelled) return;
        setRoomName(room.name);
      } catch {
        if (cancelled) return;
        setLookupError(
          `No room with code ${roomCode}. Double-check the link, or join with a different code.`,
        );
      }
    };
    if (roomCode.length === 5) lookup();
    else setLookupError("That invite link doesn't look right.");
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const nick = nickname.trim();
      if (!nick) throw new Error("Pick a nickname first.");
      const result = await joinRoomByCode(roomCode, nick);
      saveSession({
        roomCode: result.roomCode,
        nickname: nick,
        userId: result.userId,
      });
      router.push(`/room/${result.roomCode}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to join room.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title={roomName ? `Join "${roomName}"` : `Join Room ${roomCode}`}
      subtitle="Somebody sent you an invite link. Just type a nickname and jump in."
    >
      <SectionCard className="mx-auto w-full max-w-xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="border-[2.5px] border-ink bg-riso-yellow px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] shadow-stamp-sm">
            CODE / {roomCode}
          </span>
          {roomName ? (
            <span className="font-mono text-xs text-ink/70">Room is real ✓</span>
          ) : null}
        </div>

        {lookupError ? (
          <p className="zine-error">{lookupError}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              Your nickname
              <input
                className="mt-2 w-full"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={24}
                autoFocus
                required
              />
            </label>

            {error ? <p className="zine-error">{error}</p> : null}

            <PrimaryButton
              type="submit"
              disabled={isLoading || !roomName}
              className="w-full py-3"
            >
              {isLoading ? "Joining…" : "▸ Join room"}
            </PrimaryButton>
          </form>
        )}
      </SectionCard>
    </PageShell>
  );
}
