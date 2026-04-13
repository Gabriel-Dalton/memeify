"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { saveSession } from "@/lib/session";
import { joinRoomByCode } from "@/lib/supabase/game";
import { safeRoomCode } from "@/lib/utils";

export default function JoinRoomPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const normalizedCode = safeRoomCode(roomCode);
      if (normalizedCode.length !== 5) {
        throw new Error("Room code must be 5 letters/numbers.");
      }

      const result = await joinRoomByCode(normalizedCode, nickname.trim());
      saveSession({
        roomCode: result.roomCode,
        nickname: nickname.trim(),
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
    <PageShell title="Join room" subtitle="Drop in and start memeing with your crew.">
      <SectionCard className="mx-auto w-full max-w-xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-semibold">
            Room code
            <input
              className="mt-2 w-full font-display uppercase tracking-[0.3em]"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value)}
              maxLength={5}
              required
            />
          </label>

          <label className="block text-sm font-semibold">
            Your nickname
            <input
              className="mt-2 w-full"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={24}
              required
            />
          </label>

          {error ? <p className="zine-error">{error}</p> : null}

          <PrimaryButton type="submit" disabled={isLoading} className="w-full py-3">
            {isLoading ? "Joining room..." : "Join room"}
          </PrimaryButton>
        </form>
      </SectionCard>
    </PageShell>
  );
}
