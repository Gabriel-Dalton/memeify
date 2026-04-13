import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative">
        <span className="tape left-6 -top-3 -rotate-[8deg]" aria-hidden />
        <span className="tape right-10 -top-3 rotate-[10deg]" aria-hidden />
        <div className="border-[3px] border-ink bg-paper-deep p-6 shadow-stamp sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-ink/70">
            ▓▓ MEMEIFY ▓▓
          </p>
          <h1 className="mt-3 font-display text-3xl leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="riso-print">{title}</span>
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-2xl font-mono text-sm text-ink/80 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </main>
  );
}
