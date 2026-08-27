/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Comparable titles, read-only ═══════════════════════════════════════════
 *
 * Reference: `design-refs/manuscripts-book-profile.html`, `#pane-comps`.
 *
 * ⚠️ NOTHING HERE EDITS A COMP. No add, no remove, no reorder — the Comparable titles page is the
 * single editing home and this pane says so and links to it. Two editing surfaces for one list is
 * how the two come to disagree about its order, which is the thing the pitch line reads.
 *
 * ⚠️ AND THE TAB IS FREE. Comparable titles carries no Pro cap: only the Scout that SUGGESTS comps
 * is gated, and it lives on the other page. A chip here would sell a writer what they already have
 * — the fault a Pro-selling surface was retired from packages for, twice.
 */
import React from "react";
import { SectionHeader } from "../containers/SectionHeader";
import { CappedCard } from "../containers/CappedCard";
import { CompTitle } from "../../types";
import "./bookProfile.css";

export interface CompsPaneProps {
  comps: CompTitle[];
  /** Opens the Comparable titles page — the one place a comp is added, edited or reordered. */
  onManage: () => void;
}

/** `Lauren James · 2017` — every clause omits itself, so no stray interpuncts. */
const byline = (c: CompTitle): string =>
  [c.author, c.year ? String(c.year) : null].filter(Boolean).join(" · ");

export const CompsPane: React.FC<CompsPaneProps> = ({ comps, onManage }) => {
  /**
   * ⚠️ SPLIT DOWN THE MIDDLE, KEEPING THE WRITER'S ORDER. The two cards are a column break and
   * nothing more — never a ranking, never "strongest first". `ceil` puts the odd one in the first
   * card, so a list of one is a single card rather than an empty second.
   */
  const half = Math.ceil(comps.length / 2);
  const columns = comps.length ? [comps.slice(0, half), comps.slice(half)].filter((c) => c.length) : [];

  return (
    <div className="msp-blk">
      <SectionHeader
        title="Comparable titles"
        meta={`${comps.length} recorded`}
        actions={
          <button type="button" className="msp-linkact" onClick={onManage}>
            Manage in Comparable titles ›
          </button>
        }
      />

      {columns.length === 0 ? (
        <CappedCard tint="reference" label="Comparable titles">
          <p className="msp-empty">No comparable titles recorded yet.</p>
        </CappedCard>
      ) : (
        <div className="msp-duo">
          {columns.map((col, i) => (
            <CappedCard
              key={i}
              tint="reference"
              label="Comparable titles"
              /* `1–3` / `4–6` — which slice of the writer's own order this card holds. */
              right={col.length === 1
                ? String(i * half + 1)
                : `${i * half + 1}–${i * half + col.length}`}
            >
              {col.map((c, j) => (
                <div key={`${c.title}-${j}`} className="msp-comp">
                  <div className="msp-compt">{c.title}</div>
                  {/* Absent author and year state nothing — never "Unknown", never a dash. */}
                  {byline(c) && <div className="msp-compby">{byline(c)}</div>}
                  {c.note && <div className="msp-compshares">{c.note}</div>}
                </div>
              ))}
            </CappedCard>
          ))}
        </div>
      )}

      <p className="msp-footnote">
        Read-only here. Add, edit and reorder comps on the Comparable titles page.
      </p>
    </div>
  );
};
