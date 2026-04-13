import Link from "next/link";
import { PrimaryButton } from "@/components/ui/primary-button";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";

export default function Home() {
  return (
    <PageShell
      title="Memeify: 3-Minute Meme Battles"
      subtitle="Upload a photo, craft chaos, and let the room vote on the funniest meme."
    >
      <SectionCard className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-black">How it works</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-slate-200">
            <li>Create a room and invite friends with a short room code.</li>
            <li>Each round gives everyone 3 minutes to remix an uploaded image.</li>
            <li>Vote for the funniest meme and watch the leaderboard update live.</li>
          </ol>
        </div>
        <div className="flex flex-col justify-center gap-3">
          <Link href="/room/new">
            <PrimaryButton className="w-full py-3">Start a Meme Room</PrimaryButton>
          </Link>
          <Link href="/room/join">
            <button className="w-full rounded-xl border border-fuchsia-300/40 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
              Join Existing Room
            </button>
          </Link>
        </div>
      </SectionCard>
    </PageShell>
  );
}
