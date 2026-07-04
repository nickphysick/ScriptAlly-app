/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Suggestions — Pro comp candidates beneath the shelf hairline.
 *
 * Free users see the section in full; the button routes to the upgrade destination instead of
 * calling the function — no teasing skeletons, no blurred fake results. Pro clicks shimmer for
 * at least ~1s while the callable runs. Rows already on the shelf, or dismissed this session,
 * are filtered out — dismissals are COMPONENT STATE only (keyed per manuscript), never
 * persisted. Failures land in a quiet inline unavailable state with a retry.
 */
import React, { useState } from "react";
import { CompTitle } from "../../types";
import {
  CompSuggestion,
  fetchCompSuggestions,
  suggestionCautions,
  suggestionToComp,
  visibleSuggestions,
} from "../../lib/suggestComps";

interface MsSuggestState {
  status: "idle" | "loading" | "loaded" | "error";
  suggestions: CompSuggestion[];
  dismissed: string[];
}

const IDLE: MsSuggestState = { status: "idle", suggestions: [], dismissed: [] };

const INTRO =
  "Two or three recent comps tell an agent where your book sits on the shelf. I’ll suggest " +
  "candidates from your genre, age category and logline — starting points to research, not a " +
  "finished list.";

interface SuggestionsSectionProps {
  msId: string;
  manuscriptTitle: string;
  ageCategory: string;
  genre: string;
  logline: string;
  shelfTitles: string[];
  isPro: boolean;
  currentYear: number;
  onAddToShelf: (comp: CompTitle) => void;
  onUpgrade: () => void;
}

export const SuggestionsSection: React.FC<SuggestionsSectionProps> = ({
  msId,
  manuscriptTitle,
  ageCategory,
  genre,
  logline,
  shelfTitles,
  isPro,
  currentYear,
  onAddToShelf,
  onUpgrade,
}) => {
  // Keyed per manuscript so spine switches keep each book's fetched round + dismissals.
  const [byMs, setByMs] = useState<Record<string, MsSuggestState>>({});
  const entry = byMs[msId] ?? IDLE;

  const patch = (id: string, next: Partial<MsSuggestState>) =>
    setByMs((prev) => ({ ...prev, [id]: { ...(prev[id] ?? IDLE), ...next } }));

  const run = async () => {
    if (!isPro) {
      onUpgrade();
      return;
    }
    const id = msId;
    patch(id, { status: "loading" });
    try {
      // The shimmer holds for at least ~1s so a fast round trip doesn't flash.
      const [suggestions] = await Promise.all([
        fetchCompSuggestions({ manuscriptTitle, ageCategory, genre, logline, shelfTitles }),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
      patch(id, { status: "loaded", suggestions, dismissed: [] });
    } catch {
      patch(id, { status: "error" });
    }
  };

  const dismiss = (title: string) => patch(msId, { dismissed: [...entry.dismissed, title] });

  const rows = visibleSuggestions(entry.suggestions, shelfTitles, entry.dismissed);

  return (
    <>
      <div className="msv-sugghead">
        <div className="msv-suggtt">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l1.7 4.6L18 9.2l-4.3 1.6L12 15.5l-1.7-4.7L6 9.2l4.3-1.6L12 3z" />
            <path d="M18.5 14.5l.8 2.1 2.2.8-2.2.8-.8 2.1-.8-2.1-2.2-.8 2.2-.8.8-2.1z" />
          </svg>
          <h4>Suggestions</h4>
          <span className="msv-prochip">Pro</span>
        </div>
        <button
          type="button"
          className="msv-btn sm"
          onClick={run}
          disabled={entry.status === "loading"}
        >
          {entry.status === "loaded" ? "Refresh" : "Find suggestions"}
        </button>
      </div>

      {entry.status === "idle" && <p className="msv-suggintro">{INTRO}</p>}

      {entry.status === "loading" && (
        <div className="msv-shimmerwrap">
          <div className="msv-shimmer" />
          <div className="msv-shimmer" />
          <div className="msv-shimmer" />
        </div>
      )}

      {entry.status === "error" && (
        <p className="msv-suggintro">
          Suggestions aren&rsquo;t available right now.{" "}
          <button type="button" className="msv-linky" onClick={run}>
            TRY AGAIN
          </button>
        </p>
      )}

      {entry.status === "loaded" && (
        <>
          <div className="msv-sugglist">
            {rows.length === 0 ? (
              <p className="msv-suggintro" style={{ padding: "12px 2px" }}>
                Nothing left in this round &mdash; refresh for another pass.
              </p>
            ) : (
              rows.map((s) => {
                const flags = suggestionCautions(s, currentYear);
                return (
                  <div key={s.title} className="msv-suggrow">
                    <div className="msv-bk">
                      <div className="msv-t">{s.title}</div>
                      <div className="msv-lab" style={{ marginTop: 3 }}>
                        {s.author.toUpperCase()} &middot; {s.year}
                      </div>
                      <div className="msv-why">{s.rationale}</div>
                      {flags.length > 0 && (
                        <div className="msv-cautions">
                          {flags.map((c) => (
                            <span key={c} className="msv-caution">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="msv-suggacts">
                      <button
                        type="button"
                        className="msv-btn sm"
                        onClick={() => onAddToShelf(suggestionToComp(s))}
                      >
                        Add to shelf
                      </button>
                      <button
                        type="button"
                        className="msv-dismiss"
                        title="Dismiss"
                        aria-label={`Dismiss ${s.title}`}
                        onClick={() => dismiss(s.title)}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="msv-suggfoot">
            <span className="msv-lab" style={{ letterSpacing: ".12em" }}>
              SUGGESTIONS ARE STARTING POINTS &mdash; VERIFY AUTHOR, YEAR AND CONTENT BEFORE THEY
              GO IN A LETTER.
            </span>
          </div>
        </>
      )}
    </>
  );
};
