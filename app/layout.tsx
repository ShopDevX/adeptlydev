import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adeptly — Use Claude Code properly",
  description:
    "Plan-first companion for Claude Code. Describe what you want to build, get a full plan back with the right Claude Code features baked into each section. Free, open source, runs on your machine.",
  applicationName: "Adeptly",
  keywords: [
    "claude code",
    "ai planning",
    "developer tools",
    "plan first",
    "anthropic",
    "subagents",
    "skills",
  ],
  openGraph: {
    title: "Adeptly — Use Claude Code properly",
    description:
      "Describe what you want to build. Adeptly drafts the plan and picks the right Claude Code features for each section. Free, open source.",
    siteName: "Adeptly",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0e" },
    { media: "(prefers-color-scheme: light)", color: "#eef0f4" },
  ],
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
