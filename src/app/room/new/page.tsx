"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { saveSession } from "@/lib/session";
import { createRoomAndJoin } from "@/lib/supabase/game";

export default function CreateRoomPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("Late Night Meme Arena");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const nextNickname = nickname.trim();
      if (!nextNickname) {
        throw new Error("Nickname is required.");
      }

      const result = await createRoomAndJoin(roomName.trim(), nextNickname);
      saveSession({
        roomCode: result.roomCode,
        nickname: nextNickname,
        userId: result.userId,
      });
      router.push(`/room/${result.roomCode}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create room.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell title="Create a room" subtitle="Start a private meme battle in under 10 seconds.">
      <SectionCard className="mx-auto w-full max-w-xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-semibold">
            Room name
            <input
              className="mt-2 w-full"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              maxLength={60}
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
            {isLoading ? "Creating room..." : "Create room"}
          </PrimaryButton>
        </form>
      </SectionCard>
    </PageShell>
  );
}
