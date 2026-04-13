import Link from "next/link";

const links = [
  { href: "/room/new", label: "CREATE", color: "text-riso-pink" },
  { href: "/room/join", label: "JOIN", color: "text-riso-blue" },
  { href: "/leaderboard", label: "SCOREBOARD", color: "text-ink" },
];

export function Navigation() {
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="Memeify home"
        >
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-paper shadow-stamp-sm transition-transform group-hover:-rotate-12"
            style={{ fontSize: "14px" }}
          >
            M
          </span>
          <span className="font-display text-xl tracking-tight riso-print">
            MEMEIFY
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-ink/60 sm:inline">
            / caption the meme
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-display text-xs sm:text-sm ${link.color} border-[2px] border-ink bg-paper px-3 py-2 shadow-stamp-sm transition-transform hover:-translate-y-[2px] hover:-rotate-1`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
