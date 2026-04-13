"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";

export function ResumeCard() {
  const [info, setInfo] = useState<{ roomCode: string; nickname: string } | null>(
    null,
  );

  useEffect(() => {
    const session = getSession();
    if (session?.roomCode && session.nickname) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInfo({ roomCode: session.roomCode, nickname: session.nickname });
    }
  }, []);

  if (!info) return null;

  return (
    <div className="relative border-[3px] border-ink bg-riso-yellow p-4 shadow-stamp">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/70">
            ▓▓ you&apos;re still in a room ▓▓
          </p>
          <p className="mt-1 font-display text-xl">
            Room <span className="text-riso-pink">{info.roomCode}</span> · {info.nickname}
          </p>
        </div>
        <Link
          href={`/room/${info.roomCode}`}
          className="inline-flex items-center justify-center border-[3px] border-ink bg-paper px-4 py-2 font-display text-sm uppercase tracking-wider text-ink shadow-stamp-sm transition-transform hover:-translate-y-[2px] hover:bg-riso-pink"
        >
          ▸ Rejoin
        </Link>
      </div>
    </div>
  );
}
