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

    const tick = () => {
      const diff = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0 && onExpire) {
        onExpire();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineKey, onExpire]);

  const danger = secondsLeft <= 30;

  return (
    <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${danger ? "bg-red-500/20 text-red-200" : "bg-emerald-500/20 text-emerald-100"}`}>
      ⏳ Time left: <span className="font-mono text-base">{formatCountdown(secondsLeft)}</span>
    </div>
  );
}
