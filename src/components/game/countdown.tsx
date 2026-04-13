"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCountdown } from "@/lib/utils";

const ROUND_SECONDS = 180;

interface Props {
  roomCode: string;
  onExpire?: () => void;
}

function getDeadlineKey(roomCode: string) {
  return `memeify-deadline-${roomCode}`;
}

export function Countdown({ roomCode, onExpire }: Props) {
  const deadlineKey = useMemo(() => getDeadlineKey(roomCode), [roomCode]);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);

  useEffect(() => {
    const now = Date.now();
    const raw = window.localStorage.getItem(deadlineKey);

    let deadline = raw ? Number(raw) : 0;
    if (!deadline || Number.isNaN(deadline) || deadline <= now) {
      deadline = now + ROUND_SECONDS * 1000;
      window.localStorage.setItem(deadlineKey, String(deadline));
    }

    let hasExpired = false;

    const tick = () => {
      const diff = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0 && onExpire && !hasExpired) {
        hasExpired = true;
        onExpire();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineKey, onExpire]);

  const danger = secondsLeft <= 30;

  return (
    <div
      className={`flex items-center justify-between border-[2.5px] border-ink px-4 py-3 shadow-stamp-sm ${
        danger ? "bg-riso-pink animate-pulse" : "bg-riso-yellow"
      }`}
    >
      <span className="font-display text-xs uppercase tracking-[0.15em] text-ink">
        ⏱ Time Remaining
      </span>
      <span className="font-display text-2xl tabular-nums text-ink">
        {formatCountdown(secondsLeft)}
      </span>
    </div>
  );
}
