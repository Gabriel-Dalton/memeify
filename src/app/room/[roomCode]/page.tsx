"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RoomStateBadge } from "@/components/game/room-state-badge";
import { PageShell } from "@/components/ui/page-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";
import { type RoomMember } from "@/types/memeify";
import { getRoomMembers, kickMember, setRoomStatus } from "@/lib/supabase/game";
import { useRoomSync } from "@/lib/supabase/use-room-sync";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase/client";

export default function RoomLobbyPage() {
  const params = useParams<{ roomCode: string }>();
  const router = useRouter();
  const roomCode = String(params.roomCode).toUpperCase();
  const session = getSession();
  const userId = session?.userId;

  const { room, error: syncError, isAdmin } = useRoomSync(roomCode, userId, "waiting");

  const [members, setMembers] = useState<RoomMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/join/${roomCode}`
      : `/room/join/${roomCode}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard might be blocked (old browser, insecure context). Fallback:
      window.prompt("Copy this link:", inviteUrl);
    }
  };

  const shareInvite = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Join my Memeify room",
          text: `Come caption the meme with me → code ${roomCode}`,
          url: inviteUrl,
        });
        return;
      } catch {
        // user cancelled — fall through to clipboard.
      }
    }
    void copyInvite();
  };

  // No session → bounce to join.
  useEffect(() => {
    if (!session) {
      router.replace("/room/join");
    }
  }, [session, router]);

  const refreshMembers = useCallback(async () => {
    if (!room) return;
    try {
      setMembers(await getRoomMembers(room.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load players.");
    }
  }, [room]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshMembers();
  }, [refreshMembers]);

  // Live member list via realtime.
  useEffect(() => {
    if (!supabase || !room) return;
    const client = supabase;
    const channel = client
      .channel(`lobby-members-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${room.id}` },
        () => refreshMembers(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [room, refreshMembers]);

  const start = async () => {
    if (!room || !isAdmin) return;
    setIsStarting(true);
    try {
      await setRoomStatus(room.id, "editing");
      // useRoomSync will auto-navigate everyone (including admin) to /edit.
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the game.");
      setIsStarting(false);
    }
  };

  const onKick = async (member: RoomMember) => {
    if (!room || !isAdmin) return;
    if (member.user_id === userId) return;
    if (!confirm(`Kick ${member.nickname}?`)) return;
    try {
      await kickMember(room.id, member.user_id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not kick player.");
    }
  };

  return (
    <PageShell
      title={room ? room.name : `Room ${roomCode}`}
      subtitle={
        isAdmin
          ? "You're the host. Wait for your crew, then hit Start."
          : "You're in the room. Waiting for the host to start."
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="border-[2.5px] border-ink bg-riso-yellow px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] shadow-stamp-sm">
          CODE / {roomCode}
        </span>
        {room ? <RoomStateBadge status={room.status} /> : null}
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
          Round {room?.round_number ?? 1}
        </span>
        {isAdmin ? (
          <span className="border-[2.5px] border-ink bg-ink px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] text-paper shadow-stamp-sm">
            ★ HOST
          </span>
        ) : null}
      </div>

      <SectionCard>
        {syncError || error ? (
          <p className="zine-error mb-4">{syncError ?? error}</p>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-xl">
              Players <span className="text-riso-pink">({members.length})</span>
            </h2>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/60">
                  invite link
                </span>
                <button
                  type="button"
                  onClick={shareInvite}
                  className="ghost-btn text-[10px]"
                  title="Share link"
                >
                  {copied ? "✓ copied" : "↗ share"}
                </button>
                <button
                  type="button"
                  onClick={copyInvite}
                  className="ghost-btn text-[10px]"
                  title="Copy link"
                >
                  {copied ? "✓ copied" : "⎘ copy"}
                </button>
              </div>
              <code className="block overflow-hidden text-ellipsis whitespace-nowrap border-[2px] border-ink bg-paper-deep px-2 py-1.5 font-mono text-[11px] text-ink/80 shadow-stamp-sm">
                {inviteUrl}
              </code>
              <p className="font-mono text-[11px] text-ink/60">
                Or share the code <span className="font-display text-ink">{roomCode}</span>.
              </p>
            </div>
            <ul className="mt-4 space-y-2">
              {members.map((member, i) => {
                const isHost = member.user_id === room?.created_by;
                const isYou = member.user_id === userId;
                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3 border-[2px] border-ink bg-paper-deep px-3 py-2 font-mono text-sm shadow-stamp-sm"
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-display text-xs text-riso-pink">
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{member.nickname}</span>
                      {isHost ? (
                        <span className="border-[1.5px] border-ink bg-riso-yellow px-1.5 py-0.5 font-display text-[9px] uppercase">
                          HOST
                        </span>
                      ) : null}
                      {isYou ? (
                        <span className="font-display text-[10px] uppercase text-ink/60">
                          (you)
                        </span>
                      ) : null}
                    </span>
                    {isAdmin && !isHost ? (
                      <button
                        type="button"
                        onClick={() => onKick(member)}
                        className="border-[2px] border-ink bg-paper px-2 py-1 font-display text-[10px] uppercase shadow-stamp-sm transition-transform hover:-translate-y-[1px] hover:bg-riso-pink"
                        title="Kick player"
                      >
                        ✗ kick
                      </button>
                    ) : null}
                  </li>
                );
              })}
              {members.length === 0 ? (
                <li className="font-mono text-sm text-ink/60">
                  No players yet — invite some.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="space-y-3">
            {isAdmin ? (
              <>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
                  Host controls
                </p>
                <PrimaryButton
                  type="button"
                  className="w-full"
                  onClick={start}
                  disabled={isStarting || members.length < 1}
                >
                  {isStarting ? "Starting…" : `▸ Start Round ${room?.round_number ?? 1}`}
                </PrimaryButton>
                <p className="font-mono text-xs text-ink/60">
                  When you click Start, every player jumps to the meme editor at the same time.
                  You can still kick trolls during the game.
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink/70">
                  Waiting on the host…
                </p>
                <div className="border-[2.5px] border-ink bg-riso-yellow p-4 font-mono text-sm shadow-stamp-sm">
                  The host decides when to start. Poke them in real life.
                </div>
                <p className="font-pixel text-lg text-ink/70">
                  &gt; waiting for host to press start_
                </p>
              </>
            )}
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
