"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RoomStateBadge } from "@/components/game/room-state-badge";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { type Room, type RoomMember } from "@/types/memeify";
import { getRoom, getRoomMembers, setRoomStatus } from "@/lib/supabase/game";

export default function RoomLobbyPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = String(params.roomCode).toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const roomData = await getRoom(roomCode);
        const roomMembers = await getRoomMembers(roomData.id);
        setRoom(roomData);
        setMembers(roomMembers);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load room.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [roomCode]);

  const startEditing = async () => {
    if (!room) return;
    await setRoomStatus(room.id, "editing");
    setRoom({ ...room, status: "editing" });
  };

  return (
    <PageShell
      title={room ? `${room.name}` : `Room ${roomCode}`}
      subtitle="Invite players, then move through Edit → Vote → Results."
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="border-[2.5px] border-ink bg-riso-yellow px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] shadow-stamp-sm">
          CODE / {roomCode}
        </span>
        {room ? <RoomStateBadge status={room.status} /> : null}
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
          Round {room?.round_number ?? 1}
        </span>
      </div>

      <SectionCard>
        {isLoading ? (
          <p className="font-mono text-sm text-ink/70">Loading room…</p>
        ) : null}
        {error ? <p className="zine-error">{error}</p> : null}
        {!isLoading && !error ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-xl">
                Players <span className="text-riso-pink">({members.length})</span>
              </h2>
              <ul className="mt-4 space-y-2">
                {members.map((member, i) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 border-[2px] border-ink bg-paper-deep px-3 py-2 font-mono text-sm shadow-stamp-sm"
                  >
                    <span className="font-display text-xs text-riso-pink">
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                    {member.nickname}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <PrimaryButton type="button" className="w-full" onClick={startEditing}>
                Start editing phase
              </PrimaryButton>
              <Link href={`/room/${roomCode}/edit`} className="ghost-btn w-full">
                → Go to meme editor
              </Link>
              <Link href={`/room/${roomCode}/vote`} className="ghost-btn w-full">
                → Go to voting page
              </Link>
              <Link href={`/room/${roomCode}/results`} className="ghost-btn w-full">
                → View results
              </Link>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </PageShell>
  );
}
