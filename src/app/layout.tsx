import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memeify",
  description: "Real-time meme battles with timed editing and community voting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-50">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
