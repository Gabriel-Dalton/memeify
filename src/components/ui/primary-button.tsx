import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className, ...props }: Props) {
  return (
    <button
      className={cn(
        "rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-950/30 transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
