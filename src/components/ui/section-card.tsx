import type { ReactNode } from "react";

export function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-[3px] border-ink bg-paper p-6 text-ink shadow-stamp ${className}`}
    >
      {children}
    </section>
  );
}
