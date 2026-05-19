import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adeptly — Use Claude Code properly",
  description: "Plan-first Claude Code for teams. Free, open source, runs on your machine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
