"use client";

import type { FeatureSuggestion } from "@/lib/types";
import { getFeatureById } from "@/lib/features";

export function SuggestedFeatures({
  suggestions,
  onJumpToFeature,
}: {
  suggestions: FeatureSuggestion[];
  onJumpToFeature?: (featureId: string) => void;
}) {
  if (suggestions.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic px-3 py-2">
        No feature suggestions yet — write a plan and Adeptly will scan for keywords like "auth", "test", "refactor", "schedule", "external API" and recommend Claude Code features that fit.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {suggestions.map((s) => {
        const f = getFeatureById(s.featureId);
        if (!f) return null;
        return (
          <li key={s.featureId} className="px-3 py-2">
            <button
              onClick={() => onJumpToFeature?.(s.featureId)}
              className="text-left w-full"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-adept-600">
                  {f.category}
                </span>
                <span className="text-sm font-medium">{f.name}</span>
              </div>
              <div className="text-xs text-gray-700 leading-snug mt-0.5">{s.reason}</div>
              {s.matchedText && (
                <div className="text-[10px] text-gray-400 mt-0.5">
                  matched: <span className="font-mono">"{s.matchedText}"</span>
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
