"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";
import { leaveRoom } from "@/lib/supabase/game";

interface Props {
  roomId?: string;
  /** If true, render a big red button; otherwise a small ghost-style link. */
  prominent?: boolean;
  label?: string;
  onBefore?: () => void;
}

/**
 * Leave-room affordance. Calls leaveRoom(), clears the local session, and
 * sends the player back home. Also wires up a beforeunload handler that
 * best-effort leaves if the tab is closed — so other players don't end up
 * stuck waiting on a ghost.
 */
export function LeaveButton({ roomId, prominent = false, label = "Leave room", onBefore }: Props) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const session = typeof window !== "undefined" ? getSession() : null;

  // Best-effort cleanup on tab close / navigation away.
  useEffect(() => {
    if (!roomId || !session?.userId) return;
    const userId = session.userId;
    const currentRoomId = roomId;

    const handler = () => {
      // sendBeacon is the only reliable thing during unload. We POST to the
      // Supabase REST endpoint directly. If it fails (e.g. no network), oh
      // well — the host can still kick the ghost.
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return;
        const endpoint = `${url}/rest/v1/room_members?room_id=eq.${currentRoomId}&user_id=eq.${userId}`;
        // DELETE via sendBeacon isn't supported — use fetch with keepalive.
        void fetch(endpoint, {
          method: "DELETE",
          keepalive: true,
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        });
      } catch {
        // ignore
      }
    };

    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [roomId, session?.userId]);

  const leave = async () => {
    if (!roomId || !session?.userId) {
      // No room yet — just go home.
      router.push("/");
      return;
    }
    if (!confirm("Leave the room? You can rejoin with the same link.")) return;

    setLeaving(true);
    onBefore?.();
    try {
      await leaveRoom(roomId, session.userId);
    } catch (caught) {
      console.error("leave failed", caught);
    } finally {
      try {
        window.localStorage.removeItem("memeify-session");
      } catch {
        // ignore
      }
      router.push("/");
    }
  };

  if (prominent) {
    return (
      <button
        type="button"
        onClick={leave}
        disabled={leaving}
        className="border-[2.5px] border-ink bg-riso-pink px-4 py-2 font-display text-xs uppercase tracking-wider text-ink shadow-stamp-sm transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px] hover:bg-ink hover:text-paper disabled:opacity-50"
      >
        {leaving ? "leaving…" : `← ${label}`}
      </button>
    );
  }
  return (
    <button type="button" onClick={leave} disabled={leaving} className="ghost-btn">
      {leaving ? "leaving…" : `← ${label}`}
    </button>
  );
}
