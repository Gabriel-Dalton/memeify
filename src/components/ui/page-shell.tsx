import type { ReactNode } from "react";

export function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-fuchsia-100 sm:text-base">{subtitle}</p> : null}
      </div>
      {children}
    </main>
  );
}
