/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The manuscript switcher, in the bar (page header v2 §1; ref design-refs/page-header/
 * contact-list-header-v5.html `.ms`). It MOVED here from the sidebar's card, and the card is gone.
 *
 * ⚠️ IT SWITCHES EXACTLY AS THE CARD DID — the caller's `onPick` writes the shared
 * `scriptally_active_manuscript_id` key and re-opens the route, which is how every page that reads
 * the key comes to re-read it. Nothing here writes storage or navigates on its own: one switch, one
 * owner, and the mobile bar's `ShellScope` follows the same rule from `manuscriptScope`.
 *
 * ⚠️ DISMISSAL IS A `pointerdown` CAPTURE AT THE DOCUMENT, as with the Query Centre's panels, plus
 * Escape. A capture listener sees the press before anything under it can stop it, so a press on a
 * control that swallows its own events still closes the menu.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Manuscript, Query } from "../../types";

/** The cover tint for a book: the active one is always the rust pair, the rest take the next two in turn. */
const TINTS = ["a", "b", "c"] as const;
export function coverTint(isActive: boolean, index: number): (typeof TINTS)[number] {
  if (isActive) return "a";
  return index % 2 === 0 ? "b" : "c";
}

/** `Thriller · 50,000 words` — only the parts the record has (never "0 words"). */
export function switcherMeta(ms: { genre?: string; wordCount?: number }): string {
  const bits: string[] = [];
  if (ms.genre) bits.push(ms.genre);
  if (ms.wordCount) bits.push(`${ms.wordCount.toLocaleString("en-GB")} words`);
  return bits.join(" · ");
}

/** The menu row's line: the switcher's meta, then the query count where there are any. */
export function switcherRowMeta(ms: { genre?: string; wordCount?: number }, queryCount: number): string {
  const bits = [switcherMeta(ms)].filter(Boolean);
  if (queryCount > 0) bits.push(`${queryCount} ${queryCount === 1 ? "query" : "queries"}`);
  return bits.join(" · ");
}

const BookIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M4 4.5h8.5a2 2 0 0 1 2 2V16H6a2 2 0 0 1-2-2z" /><path d="M4 14a2 2 0 0 1 2-2h8.5" />
  </svg>
);

export interface BarSwitcherProps {
  manuscripts: Manuscript[];
  queries: Query[];
  activeId: string | null;
  onPick: (id: string) => void;
  onAdd: () => void;
}

export const BarSwitcher: React.FC<BarSwitcherProps> = ({ manuscripts, queries, activeId, onPick, onAdd }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = manuscripts.find((m) => m.id === activeId) ?? null;

  /* ⚠️ NO BOOK YET: the switcher is the door to adding one, as the sidebar card's empty state was. */
  if (!active) {
    return (
      <div className="ws-ms" data-shell="switcher">
        <button type="button" className="ws-ms-btn" onClick={onAdd}>
          <span className="ws-ms-cov ws-ms-cov--a" aria-hidden="true">+</span>
          <span className="ws-ms-tx"><b className="ws-ms-t">Add a manuscript</b></span>
        </button>
      </div>
    );
  }

  const meta = switcherMeta(active);
  return (
    <div className={`ws-ms${open ? " is-open" : ""}`} data-shell="switcher" ref={rootRef}>
      <button
        type="button"
        className="ws-ms-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Manuscript: ${active.title}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ws-ms-cov ws-ms-cov--a" aria-hidden="true"><BookIcon /></span>
        <span className="ws-ms-tx">
          <b className="ws-ms-t">{active.title}</b>
          {meta && <small className="ws-ms-m">{meta}</small>}
        </span>
        <span className="ws-ms-chev" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8l4 4 4-4" /></svg>
        </span>
      </button>
      {open && (
        <div className="ws-ms-menu" role="menu" aria-label="Your manuscripts">
          <p className="ws-ms-h">YOUR MANUSCRIPTS</p>
          {manuscripts.map((m, i) => {
            const on = m.id === active.id;
            const line = switcherRowMeta(m, queries.filter((q) => q.manuscriptId === m.id).length);
            return (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={on}
                key={m.id}
                className={`ws-ms-it${on ? " on" : ""}`}
                onClick={() => { setOpen(false); onPick(m.id); }}
              >
                <span className={`ws-ms-cov ws-ms-cov--${coverTint(on, i)}`} aria-hidden="true"><BookIcon /></span>
                <span className="ws-ms-tx">
                  <b className="ws-ms-t">{m.title}</b>
                  {line && <small className="ws-ms-m ws-ms-m--row">{line}</small>}
                </span>
                {on && <span className="ws-ms-ck" aria-hidden="true">✓</span>}
              </button>
            );
          })}
          <button type="button" role="menuitem" className="ws-ms-add" onClick={() => { setOpen(false); onAdd(); }}>
            + Add a manuscript
          </button>
        </div>
      )}
    </div>
  );
};
