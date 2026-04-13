import Link from "next/link";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ResumeCard } from "@/components/home/resume-card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <ResumeCard />
      {/* ===== HERO ===== */}
      <section className="relative">
        <span className="tape left-10 -top-3 -rotate-[6deg]" aria-hidden />
        <span className="tape right-16 -top-3 rotate-[9deg]" aria-hidden />

        <div className="grid gap-6 border-[3px] border-ink bg-paper-deep p-6 shadow-stamp sm:p-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-ink/70">
                ▓ A PARTY GAME FOR YOUR GROUP CHAT ▓
              </p>
              <h1 className="mt-4 font-display text-[40px] leading-[0.88] tracking-tight sm:text-[72px] lg:text-[88px]">
                <span className="block animate-stamp-in riso-print">CAPTION</span>
                <span
                  className="block animate-stamp-in riso-print"
                  style={{ animationDelay: "120ms" }}
                >
                  THE MEME.
                </span>
                <span
                  className="block animate-stamp-in text-ink/90"
                  style={{ animationDelay: "240ms", fontSize: "0.55em" }}
                >
                  — funniest one{" "}
                  <span className="bg-riso-yellow px-2 font-display">wins.</span>
                </span>
              </h1>
              <p
                className="mt-6 max-w-md animate-slide-up font-mono text-sm leading-relaxed text-ink/80 sm:text-base"
                style={{ animationDelay: "360ms" }}
              >
                Everyone uploads a photo, captions it, and remixes it with filters.
                The room votes on the best one. Host controls the pace. Play in a
                group chat, in person, or across continents — fast, stupid, fun.
              </p>
            </div>

            <div
              className="flex animate-slide-up flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "480ms" }}
            >
              <Link href="/room/new" className="group">
                <PrimaryButton className="w-full sm:w-auto">
                  Start a Room
                </PrimaryButton>
              </Link>
              <Link
                href="/room/join"
                className="inline-flex items-center justify-center border-[3px] border-ink bg-paper px-5 py-3 font-display text-sm uppercase tracking-wider text-ink shadow-stamp transition-all hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-riso-blue hover:text-paper hover:shadow-[8px_8px_0_0_var(--ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_0_var(--ink)]"
              >
                <span className="mr-2">▸</span>Join with Code
              </Link>
            </div>
          </div>

          {/* Stamped polaroid — illustrative screenshot of the vibe */}
          <div className="relative flex items-center justify-center">
            <div
              className="relative rotate-[4deg] border-[3px] border-ink bg-paper p-3 shadow-stamp transition-transform hover:rotate-0 hover-jitter"
              aria-hidden
            >
              <div className="relative h-[200px] w-[240px] overflow-hidden border-[2px] border-ink sm:h-[240px] sm:w-[280px]">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, var(--riso-pink) 0%, transparent 45%), radial-gradient(circle at 70% 70%, var(--riso-blue) 0%, transparent 50%), repeating-linear-gradient(0deg, var(--paper-deep) 0 2px, transparent 2px 6px)",
                    mixBlendMode: "multiply",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-6xl riso-print sm:text-7xl">
                    LOL
                  </span>
                </div>
                <div
                  className="absolute -bottom-2 -right-2 h-16 w-16"
                  style={{
                    backgroundImage:
                      "radial-gradient(var(--ink) 1.5px, transparent 1.5px)",
                    backgroundSize: "6px 6px",
                  }}
                />
              </div>
              <p className="mt-2 text-center font-pixel text-lg text-ink">
                your meme, but better
              </p>
              <span
                className="absolute -left-4 -top-4 inline-flex h-14 w-14 rotate-[-18deg] items-center justify-center rounded-full border-[2.5px] border-riso-pink bg-paper font-display text-[10px] uppercase text-riso-pink"
                style={{ lineHeight: "1.05" }}
              >
                play
                <br />
                free
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MARQUEE ===== */}
      <div className="overflow-hidden border-y-[3px] border-ink bg-ink text-paper">
        <div className="marquee-track flex whitespace-nowrap py-3 font-display text-sm uppercase tracking-[0.3em]">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0 items-center">
              {[
                "★ everyone captions the same round",
                "◆ host picks the pace",
                "✱ vote the funniest",
                "▲ 18 filters to weird out any photo",
                "● no sign-up, no downloads",
                "✺ play in the group chat",
              ].map((t, j) => (
                <span key={`${i}-${j}`} className="px-8">
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <section className="grid gap-5 lg:grid-cols-3">
        {[
          {
            n: "01",
            title: "Start a room",
            body: "Create a room, share the 5-letter code. Whoever starts the room is the host and controls the pace.",
            color: "bg-riso-pink",
            rotate: "-rotate-[1.2deg]",
          },
          {
            n: "02",
            title: "Caption the meme",
            body: "Host hits Start — everyone jumps into the editor at once. Upload a photo, slap on captions, pick a filter (noir, deep fry, VHS, acid…). Submit when you're happy.",
            color: "bg-riso-yellow",
            rotate: "rotate-[0.8deg]",
          },
          {
            n: "03",
            title: "Vote the winner",
            body: "Everyone votes for their favorite (no self-votes). Host reveals results. Run another round, or crown a champion.",
            color: "bg-riso-blue",
            rotate: "-rotate-[0.6deg]",
          },
        ].map((step) => (
          <article
            key={step.n}
            className={`group relative border-[3px] border-ink bg-paper p-5 text-ink shadow-stamp transition-transform hover:-translate-y-1 hover:rotate-0 ${step.rotate}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`${step.color} inline-flex h-14 w-14 items-center justify-center border-[3px] border-ink font-display text-xl shadow-stamp-sm`}
              >
                {step.n}
              </span>
              <span className="font-pixel text-sm uppercase tracking-widest text-ink/60">
                STEP
              </span>
            </div>
            <h3 className="mt-5 font-display text-2xl leading-tight">
              {step.title}
            </h3>
            <p className="mt-3 font-mono text-sm leading-relaxed text-ink/80">
              {step.body}
            </p>
            <div
              className="mt-4 h-1 w-full"
              style={{
                backgroundImage:
                  "radial-gradient(var(--ink) 1px, transparent 1px)",
                backgroundSize: "5px 5px",
              }}
              aria-hidden
            />
          </article>
        ))}
      </section>

      {/* ===== RULES / HOST ===== */}
      <section className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="relative border-[3px] border-ink bg-paper-deep p-6 shadow-stamp">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-ink/70">
            ✎ HOUSE RULES
          </p>
          <ul className="mt-4 space-y-3 font-mono text-sm leading-relaxed sm:text-base">
            {[
              ["01", "Be funny. That's the only real rule."],
              ["02", "You can't vote for your own meme. We see you."],
              ["03", "The host runs the clock. Everyone moves together."],
              ["04", "The host can kick trolls. Don't be a troll."],
            ].map(([label, rule], i) => (
              <li key={i} className="flex gap-4">
                <span className="shrink-0 font-display text-riso-pink">#{label}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="relative flex flex-col justify-between gap-4 border-[3px] border-ink bg-ink p-6 text-paper shadow-stamp-pink">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-paper/70">
              »» tip for hosts
            </p>
            <p className="mt-3 font-display text-2xl leading-tight text-paper">
              The weirder the photo, the better the round.
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center border-[3px] border-paper bg-riso-yellow px-4 py-3 font-display text-sm uppercase text-ink shadow-[4px_4px_0_0_var(--paper)] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_var(--paper)]"
          >
            ▸ Check the scoreboard
          </Link>
        </aside>
      </section>
    </main>
  );
}
