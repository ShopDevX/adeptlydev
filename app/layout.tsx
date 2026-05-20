import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adeptly — Use Claude Code properly",
  description: "Plan-first Claude Code for teams. Free, open source, runs on your machine.",
};

/**
 * Tiny inline script that runs before paint to apply the persisted theme
 * (or default to dark per ADR-011). This prevents a flash of the wrong
 * theme on first paint.
 */
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('adeptly:theme');
    var theme = (stored === 'light' || stored === 'dark') ? stored : 'dark';
    document.documentElement.classList.add(theme);
  } catch (_) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
