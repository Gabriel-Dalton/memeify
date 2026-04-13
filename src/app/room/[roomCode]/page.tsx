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
      title={room ? `${room.name} (${room.code})` : `Room ${roomCode}`}
      subtitle="Invite players, then move through Edit → Vote → Results."
    >
      {room ? (
        <div className="flex">
          <RoomStateBadge status={room.status} />
        </div>
      ) : null}

      <SectionCard>
        {isLoading ? <p className="text-sm text-slate-300">Loading room...</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {!isLoading && !error ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-bold">Players ({members.length})</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {members.map((member) => (
                  <li key={member.id} className="rounded-lg bg-white/5 px-3 py-2">
                    {member.nickname}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-300">Round {room?.round_number ?? 1}</p>
              <PrimaryButton type="button" className="w-full" onClick={startEditing}>
                Start editing phase
              </PrimaryButton>
              <Link href={`/room/${roomCode}/edit`} className="block">
                <button className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
                  Go to meme editor
                </button>
              </Link>
              <Link href={`/room/${roomCode}/vote`} className="block">
                <button className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
                  Go to voting page
                </button>
              </Link>
              <Link href={`/room/${roomCode}/results`} className="block">
                <button className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
                  View results
                </button>
              </Link>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </PageShell>
  );
}
