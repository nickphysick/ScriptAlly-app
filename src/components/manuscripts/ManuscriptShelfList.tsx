/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SHELF — a selector list ═══════════════════════════════════════════════════════════════
 *
 * Ref: `design-refs/manuscripts-promos.html` (generated from the brief's prose; it says so).
 *
 * ⚠️ THE FIGURES COME FROM `bookFigures`, THE BOOK PAGE'S OWN DERIVATION. A shelf that counted
 * queries its own way would eventually disagree with the page it links to about the same book —
 * the two-numbers-both-called-the-same-thing fault, one click apart.
 *
 * ⚠️ EVERY ROW'S CONTROL IS A REAL BUTTON. A clickable `<td>` is not keyboard-reachable, announces
 * nothing, and does not fire on Enter or Space. The whole row is not the control: the Open button
 * is, so a reader tabbing the table lands on one thing per row rather than six.
 */
import React from "react";
import { Manuscript, Query } from "../../types";
import { bookFigures } from "../../lib/bookFigures";
import "./manuscriptShelfList.css";

export interface ManuscriptShelfListProps {
  manuscripts: Manuscript[];
  queries: Query[];
  genresOf: (m: Manuscript) => string[];
  statusOf: (m: Manuscript) => string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

/** `Adult · Literary fiction · 92,000 words` — and the word count omits itself when absent. */
const byline = (genres: string[], wordCount?: number): string =>
  [...genres, wordCount ? `${wordCount.toLocaleString("en-GB")} words` : ""].filter(Boolean).join(" · ");

export const ManuscriptShelfList: React.FC<ManuscriptShelfListProps> = ({
  manuscripts, queries, genresOf, statusOf, onOpen, onAdd,
}) => (
  <section className="msl">
    {/* ⚠️ SAGE CAP — the manuscripts family, the same pair the covers use. */}
    <h2 className="msl-cap">Your shelf</h2>

    <table className="msl-table">
      <thead>
        <tr>
          <th scope="col">Manuscript</th>
          <th scope="col">Status</th>
          {/* ⚠️ NUMERIC COLUMNS ARE RIGHT-ALIGNED AND SAY SO to a screen reader. */}
          <th scope="col" className="msl-num">Queries</th>
          <th scope="col" className="msl-num">Responses</th>
          <th scope="col">Last sent</th>
          {/* The action column's header is empty to the eye and named to a reader. */}
          <th scope="col"><span className="msl-sr">Open</span></th>
        </tr>
      </thead>
      <tbody>
        {manuscripts.map((m) => {
          const mine = queries.filter((q) => q.manuscriptId === m.id);
          const figs = bookFigures(mine);
          const val = (k: string) => figs.find((f) => f.key === k)?.value ?? "—";
          return (
            <tr key={m.id}>
              <td>
                <span className="msl-name">
                  {/* ⚠️ THE COVER IS DRAWN AS A BOOK — a spine shadow down the left edge and a
                      page-edge radius on the right. A flat rectangle reads as a missing image. */}
                  <span className="msl-cover" aria-hidden="true" />
                  <span className="msl-names">
                    <span className="msl-title">{m.title}</span>
                    <span className="msl-byline">{byline(genresOf(m), m.wordCount)}</span>
                  </span>
                </span>
              </td>
              <td className="msl-status">{statusOf(m)}</td>
              <td className="msl-num">{val("sent")}</td>
              <td className="msl-num">{val("responses")}</td>
              <td className="msl-last">{val("last")}</td>
              <td className="msl-act">
                {/* ⚠️ THE ACCESSIBLE NAME CARRIES THE BOOK. Six rows of "Open" tell a screen-reader
                    user nothing about which one they are on. */}
                <button type="button" className="msl-open" onClick={() => onOpen(m.id)}
                        aria-label={`Open ${m.title}`}>Open</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {/* ⚠️ BENEATH THE TABLE, NOT A ROW IN IT. A dashed `<tr>` would be announced as data — one more
        manuscript in a table of manuscripts — when it is an action. */}
    <button type="button" className="msl-add" onClick={onAdd}>＋ Add a manuscript</button>
  </section>
);
