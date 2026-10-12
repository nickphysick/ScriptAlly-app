/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The action drawer's head, on its own (Query panel v2 §D).
 *
 * ⚠️ A LEAF, AND IT MUST STAY ONE: it imports React and nothing else. The correction desk draws this head when it
 *    is stepped into the query's panel, and the desk is imported by unit suites that cannot load Firebase —
 *    reaching it through `DrawerShell` pulled the whole data layer in behind it and stopped a suite loading.
 */
import React from "react";

export const QUILL_SRC = "/images/qa/quill.webp";

/** "Back to Eleanor's query" — or "Back to the query" where there is no first name to use. */
export const backWords = (first: string | null | undefined): string => (first && first.trim() ? `Back to ${first.trim()}\u2019s query` : "Back to the query");

/**
 * The action drawer's head (`.qad-head`): the way back, the mode's eyebrow, the typewriter title, the quill, the
 * close, and the agent card. Shared by the standalone drawer, a journey stepped into the query's panel, and the
 * correction desk there (Query panel v2 §D) — one head, so the three cannot come to look different.
 */
export function QadHead({ from, onFrom, eyebrow, title, who, onClose, back = false }: {
  from?: string | null; onFrom: () => void; eyebrow: string; title: string; who?: React.ReactNode; onClose: () => void;
  /** the way back is the panel's own ("← Back to …'s query"): it carries the panel's probe */
  back?: boolean;
}) {
  return (
    <div className="qad-head" data-qad-head>
      <div className="qad-top">
        <div className="qad-tt">
          {from ? <button type="button" className="qad-from" data-qad-from data-qp={back ? "step-back" : undefined} onClick={onFrom}>← {from}</button> : null}
          <div className="qad-mode">{eyebrow}</div>
          {/* ⚠️ NOT AN <h2>: brand.tsx forces every h1–h3 into the brand serif with !important, so
              the typewriter title would silently become Playfair. The role keeps it a heading. */}
          <div className="qad-h2" role="heading" aria-level={2} data-qp={back ? "step-title" : undefined}>{title}</div>
        </div>
        <span className="qad-qwrap" aria-hidden="true"><img src={QUILL_SRC} alt="" /></span>
      </div>
      <button type="button" className="qad-dx" aria-label="Close" onClick={onClose}>×</button>
      {who}
    </div>
  );
}
