import type { RoomStatus } from "@/types/memeify";

const labels: Record<RoomStatus, string> = {
  waiting: "Waiting Room",
  editing: "Meme Editing",
  voting: "Voting",
  results: "Results",
};

export function RoomStateBadge({ status }: { status: RoomStatus }) {
  return (
    <span className="inline-flex rounded-full bg-fuchsia-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fuchsia-100">
      {labels[status]}
    </span>
  );
}
