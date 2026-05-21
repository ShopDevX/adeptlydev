"use client";

/**
 * The Adeptly wordmark — a tiny gradient-filled mark (an inverted V echoing the
 * "A" of Adeptly, with a crossbar) next to the gradient-filled wordmark text.
 *
 * Kept as a pure component so we can re-use it in onboarding screens, the
 * landing page (future), and OG images.
 */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? 28 : size === "sm" ? 18 : 22;
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className="flex items-center gap-2">
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="adeptly-mark-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--accent-1)" />
            <stop offset="1" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="7" fill="url(#adeptly-mark-grad)" />
        <path
          d="M10 22 L16 8 L22 22"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="12.5" y1="17" x2="19.5" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span
        className={`${text} font-semibold tracking-tight bg-accent-gradient bg-clip-text text-transparent`}
      >
        Adeptly
      </span>
    </div>
  );
}
