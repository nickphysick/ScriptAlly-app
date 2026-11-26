/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.2 · Phase 2 — two of the row's own parts:
 *
 *   GenreLines   Genres sought as tags in lines: TWO a line (THREE when the card is 1250 or wider, ONE below 980), at most
 *                two lines, then "+n" on the last line. Each line is centred; a tag too long for its line ends in "…". The
 *                book's genres come first (as GenrePills orders them). The tag is the standard text tag (contactListRows.css):
 *                28 high, Source Serif 600 14px, padding 0 12, fully rounded, the pills' own colours.
 *   FitRater     an unrated agent's quiet dash, which becomes five faint stars on row hover or focus. A star sets the
 *                agent's Fit through the page's `onRate` — the agent card's own setter (its `edit.save({ rating })`) and its
 *                own toast. A radio group: ← → move between the stars, Enter or Space chooses.
 *
 * ⚠️ shared/agentRowParts' GenrePills is NOT changed: other surfaces (the card, Cards view) draw it as they do today.
 */
import React, { useRef, useState } from "react";
import { FIT_WORDS } from "../card/agentPills";

export const GenreLines: React.FC<{
  genres: readonly string[];
  hit: (raw: string) => boolean;
  word: (raw: string) => string;
  /** tags a line: 3, 2 or 1 (the card's width) */
  per: 1 | 2 | 3;
}> = ({ genres, hit, word, per }) => {
  const ordered = [...genres.filter((g) => hit(g)), ...genres.filter((g) => !hit(g))];
  const max = per * 2;
  const shown = ordered.slice(0, max);
  const more = ordered.length - shown.length;
  const lines: string[][] = [];
  for (let i = 0; i < shown.length; i += per) lines.push(shown.slice(i, i + per));
  return (
    <span className="clr-glines" data-clr="glines" data-per={per} data-total={ordered.length} data-shown={shown.length}>
      {lines.map((ln, li) => (
        <span key={li} className="clr-gline" data-clr="gline">
          {ln.map((g) => (
            <span key={g} className={`cl252-pill clr-tag${hit(g) ? " hit" : ""}`} data-cl252="pill" data-hit={hit(g) ? "" : undefined} title={word(g)}>
              {hit(g) ? "✓ " : null}{word(g)}
            </span>
          ))}
          {li === lines.length - 1 && more > 0 ? <em className="cl252-more clr-more" data-clr="more" data-n={more}>+{more}</em> : null}
        </span>
      ))}
    </span>
  );
};

export const FitRater: React.FC<{ name: string; onRate: (n: 1 | 2 | 3 | 4 | 5) => void }> = ({ name, onRate }) => {
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => { const k = (i + 5) % 5; setFocus(k); refs.current[k]?.focus(); };
  return (
    <span className="clr-rate" data-clr="rate">
      <span className="clr-dash" data-clr="unrated" role="img" title="Not rated yet" aria-label="Not rated yet">–</span>
      <span className="clr-pick" role="radiogroup" aria-label={`Rate ${name}’s fit`}>
        {[1, 2, 3, 4, 5].map((n, i) => (
          <button key={n} type="button" role="radio" aria-checked="false" ref={(el) => { refs.current[i] = el; }}
            tabIndex={i === focus ? 0 : -1} data-clr="rate-star" data-n={n} title={FIT_WORDS[n]} aria-label={`${n} of 5, ${FIT_WORDS[n]}`}
            onClick={(e) => { e.stopPropagation(); onRate(n as 1 | 2 | 3 | 4 | 5); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); move(i + 1); }
              else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); move(i - 1); }
              else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onRate(n as 1 | 2 | 3 | 4 | 5); }
            }}>★</button>
        ))}
      </span>
    </span>
  );
};
