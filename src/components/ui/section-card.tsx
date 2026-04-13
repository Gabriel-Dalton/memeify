import type { ReactNode } from "react";

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/20 bg-slate-950/50 p-5 text-slate-100 shadow-2xl ${className}`}>
      {children}
    </section>
  );
}
