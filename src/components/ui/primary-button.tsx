import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className, ...props }: Props) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center border-[3px] border-ink bg-riso-pink px-5 py-3 font-display text-sm uppercase tracking-wider text-ink shadow-stamp transition-all",
        "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-riso-yellow hover:shadow-[8px_8px_0_0_var(--ink)]",
        "active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_0_var(--ink)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:bg-riso-pink disabled:hover:shadow-stamp",
        className,
      )}
      {...props}
    >
      <span className="mr-2 text-ink/70">▸</span>
      {children}
    </button>
  );
}
