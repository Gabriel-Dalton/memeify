"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const GOODBYES = [
  "You've been escorted out of the meme van.",
  "The host has deemed your vibes sus. Appeal denied.",
  "Ejected at high speed. Tumble gracefully.",
  "You took it too far. Even for memes.",
  "The council has spoken. You are no longer in the group chat.",
  "Too spicy. Too weird. Too much. Begone.",
  "You have been un-invited from the bit.",
  "Kicked. For crimes against comedy.",
];

export default function KickedPage() {
  const [line, setLine] = useState(GOODBYES[0]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLine(GOODBYES[Math.floor(Math.random() * GOODBYES.length)]);
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6">
      <div className="relative border-[3px] border-ink bg-riso-pink p-10 shadow-stamp">
        <span
          className="absolute -top-5 left-1/2 inline-flex -translate-x-1/2 rotate-[-6deg] items-center justify-center border-[3px] border-ink bg-ink px-4 py-1 font-display text-xs uppercase tracking-[0.3em] text-paper"
          aria-hidden
        >
          ★ official notice ★
        </span>
        <p className="font-pixel text-2xl text-ink/70">NOTIFICATION //</p>
        <h1 className="mt-2 font-display text-5xl leading-[0.9] sm:text-7xl riso-print">
          YOU GOT
          <br />
          KICKED.
        </h1>
        <p className="mt-6 font-mono text-base text-ink sm:text-lg">{line}</p>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.25em] text-ink/70">
          reason: the host pressed the button
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="ghost-btn">
          ← Home
        </Link>
        <Link href="/room/join" className="ghost-btn">
          ↻ Try a different room
        </Link>
      </div>
    </main>
  );
}
