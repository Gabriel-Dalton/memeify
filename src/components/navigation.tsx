import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/room/new", label: "Create Room" },
  { href: "/room/join", label: "Join Room" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navigation() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/75 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-black tracking-wide text-white">
          Memeify
        </Link>
        <nav className="flex items-center gap-2 text-sm text-fuchsia-100">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3 py-1.5 hover:bg-white/10">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
