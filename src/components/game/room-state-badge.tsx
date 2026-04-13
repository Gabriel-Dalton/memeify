import type { RoomStatus } from "@/types/memeify";

const config: Record<RoomStatus, { label: string; bg: string }> = {
  waiting: { label: "Waiting Room", bg: "bg-riso-yellow" },
  editing: { label: "Meme Editing", bg: "bg-riso-pink" },
  voting: { label: "Voting", bg: "bg-riso-blue text-paper" },
  results: { label: "Results", bg: "bg-ink text-paper" },
};

export function RoomStateBadge({ status }: { status: RoomStatus }) {
  const { label, bg } = config[status];
  return (
    <span
      className={`inline-flex border-[2.5px] border-ink px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.15em] shadow-stamp-sm ${bg}`}
    >
      ▌ {label}
    </span>
  );
}
