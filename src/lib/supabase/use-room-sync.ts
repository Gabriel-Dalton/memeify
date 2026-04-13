"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./client";
import { getRoom, getMyMembership } from "./game";
import type { Room, RoomMember, RoomStatus } from "@/types/memeify";

/**
 * Keeps a page synchronized with the room's live state:
 *  - Polls + subscribes to the room row so status/round changes push through.
 *  - Watches this user's membership row for kicks (→ redirects to /kicked).
 *  - Auto-navigates everyone to the page that matches the current status,
 *    unless `expectedStatus` matches (i.e. we're already in the right place).
 */
export function useRoomSync(
  roomCode: string,
  userId: string | undefined,
  expectedStatus: RoomStatus | RoomStatus[],
) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<RoomMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaveNotice, setLeaveNotice] = useState<string | null>(null);
  const navigatedRef = useRef(false);

  const expected = useMemo(
    () => (Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus]),
    [expectedStatus],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const r = await getRoom(roomCode);
        if (cancelled) return;
        setRoom(r);
        if (userId) {
          const m = await getMyMembership(r.id, userId);
          if (cancelled) return;
          setMe(m);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to load room.");
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [roomCode, userId]);

  // Navigate on state transitions.
  useEffect(() => {
    if (!room || navigatedRef.current) return;
    if (expected.includes(room.status)) return;

    const target =
      room.status === "waiting"
        ? `/room/${roomCode}`
        : room.status === "editing"
        ? `/room/${roomCode}/edit`
        : room.status === "voting"
        ? `/room/${roomCode}/vote`
        : `/room/${roomCode}/results`;

    navigatedRef.current = true;
    router.push(target);
  }, [room, expected, roomCode, router]);

  // Kick detection.
  useEffect(() => {
    if (me?.kicked_at && !navigatedRef.current) {
      navigatedRef.current = true;
      router.push("/kicked");
    }
  }, [me, router]);

  // Realtime subscription.
  useEffect(() => {
    if (!supabase || !room) return;
    const client = supabase;
    const channel = client
      .channel(`room-sync-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom((prev) => ({ ...(prev ?? room), ...(payload.new as Room) }));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${room.id}` },
        async (payload) => {
          if (userId) {
            const m = await getMyMembership(room.id, userId);
            setMe(m);
          }
          if (payload.eventType === "DELETE") {
            const nickname = (payload.old as RoomMember | undefined)?.nickname ?? "Someone";
            setLeaveNotice(`${nickname} left the room`);
            window.setTimeout(() => setLeaveNotice(null), 4000);
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [room, userId]);

  return {
    room,
    me,
    error,
    leaveNotice,
    isAdmin: !!room && !!userId && room.created_by === userId,
  };
}
