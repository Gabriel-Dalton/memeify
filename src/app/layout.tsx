import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEMEIFY // photocopied chaos",
  description: "Three minutes. One photo. Remix it. The room votes. Welcome to the zine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-paper text-ink">
        <Navigation />
        {children}
        <footer className="mt-16 border-t-[3px] border-ink bg-ink text-paper">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 font-mono text-xs uppercase tracking-[0.2em] sm:px-6 lg:px-8">
            <span>ISSUE №01 // SPRING {new Date().getFullYear()}</span>
            <span className="text-riso-pink">★ PHOTOCOPY & PASS IT ON ★</span>
            <span className="hidden sm:inline">DIY / DIT / DIY</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
