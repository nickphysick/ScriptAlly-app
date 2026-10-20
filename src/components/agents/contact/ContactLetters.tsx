/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18 §A — THE LETTER TABS. The A to Z divider tabs at the top of the page (inset with the header), and
 * the same 26 letters, compact, in the pinned row. Both read one `counts` (the list's own, after its filters and
 * search) and one `current` (the page's per-frame reader), and both call one `onPick`.
 *
 * ⚠️ A LETTER WITH NO VISIBLE AGENTS IS DISABLED, NOT HIDDEN: the strip keeps its 26 columns so nothing moves when a
 *    filter changes, and the disabled tab says so ("M, no agents").
 */
import React from "react";
import "./contactV18.css";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const words = (L: string, n: number): string => (n === 0 ? `${L}, no agents` : `${L}, ${n} ${n === 1 ? "agent" : "agents"}`);

export const LetterTabs: React.FC<{
  /** "top": the divider tabs at the top of the page; "pin": the compact letters in the pinned row */
  variant: "top" | "pin";
  counts: ReadonlyMap<string, number>;
  current: string | null;
  onPick: (letter: string) => void;
  /** while the page settles: the boxes are held, nothing is pressable and no count is shown */
  loading?: boolean;
}> = ({ variant, counts, current, onPick, loading = false }) => (
  <nav className={variant === "top" ? "cl18-tabs" : "cl18-pl"} data-cl18={variant === "top" ? "tabs" : "pin-letters"} aria-label="Jump to a letter">
    {LETTERS.map((L) => {
      const n = loading ? 0 : counts.get(L) ?? 0;
      const on = !loading && current === L;
      return (
        <button key={L} type="button" data-cl18={variant === "top" ? "tab" : "pin-letter"} data-l={L} data-n={n}
          aria-current={on ? "true" : undefined} aria-label={loading ? L : words(L, n)} disabled={loading || n === 0}
          onClick={() => onPick(L)}>
          <b>{L}</b>
          {variant === "top" ? <span data-cl18="tab-n">{loading || n === 0 ? "" : n}</span> : null}
        </button>
      );
    })}
  </nav>
);
