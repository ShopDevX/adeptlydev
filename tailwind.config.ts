import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "html.dark"],
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base:     "var(--bg-base)",
        elevated: "var(--bg-elevated)",
        overlay:  "var(--bg-overlay)",
        "fg":     "var(--fg-primary)",
        "fg-secondary": "var(--fg-secondary)",
        "fg-tertiary": "var(--fg-tertiary)",
        "border-subtle": "var(--border-subtle)",
        "border-strong": "var(--border-strong)",
        accent: {
          1: "var(--accent-1)",
          2: "var(--accent-2)",
        },
        status: {
          draft:    "var(--status-draft)",
          review:   "var(--status-review)",
          approved: "var(--status-approved)",
          changes:  "var(--status-changes)",
        },
        // Legacy adept-* kept so v0.3 components keep compiling
        // until Phase B replaces them.
        adept: {
          50:  "rgba(124, 92, 255, 0.10)",
          100: "rgba(124, 92, 255, 0.18)",
          500: "var(--accent-1)",
          600: "var(--accent-1)",
          700: "var(--accent-1)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs:   ["0.6875rem", { lineHeight: "1rem" }],
        sm:   ["0.8125rem", { lineHeight: "1.125rem" }],
        base: ["0.9375rem", { lineHeight: "1.4rem" }],
        lg:   ["1.125rem",  { lineHeight: "1.5rem" }],
        xl:   ["1.5rem",    { lineHeight: "2rem" }],
        "2xl":["2rem",      { lineHeight: "2.5rem" }],
      },
      letterSpacing: {
        tight: "-0.015em",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(120deg, var(--accent-1) 0%, var(--accent-2) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
