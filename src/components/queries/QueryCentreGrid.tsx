/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryCentreGrid — the browsing view: every query as a card, optionally under headings.
 *
 * ⚠️ IT RECEIVES ROWS, IT DOES NOT BUILD THEM. The page derives the set once — the same
 * `sortedList` the detail view reads — so the two views cannot show different queries under the
 * same filters. A grid that filtered for itself is the second data path that makes that
 * inevitable, and invisible.
 *
 * ⚠️ THE FLIP IS THE SHARED HELPER, NOT A LOCAL ONE. `lib/flip.ts` already enforces
 * settle-before-measure — our entrance animations carry `fill-mode: both`, and a filled animation
 * outranks an inline transform, so an unsettled card accepts the FLIP transform and renders as
 * though it were never set.
 */
import React, { useEffect, useLayoutEffect, useRef } from "react";
import "./queryCard.css";
import "./queryCentreGrid.css";
import { QueryCard } from "./QueryCard";
import { measureFlip, playFlip, clearFlip, type FlipRects } from "../../lib/flip";
import { compareGroupLabels, groupLabelFor, type GroupKey, type GridRow } from "../../lib/queryCentreGrid";
import type { CardFacts } from "../../lib/queryCardFacts";
import type { QueryStatus } from "../../types";

/** The card's own duration and curve — the ref's, not the agent list's. */
const FLIP_MS = 340;
const FLIP_EASE = "cubic-bezier(.2,.7,.2,1)";
const SELECTOR = "[data-qcc-id]";
const DATA_KEY = "qccId";

export interface GridCard extends GridRow {
  facts: CardFacts;
  initials: string;
  status: QueryStatus;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const QueryCentreGrid: React.FC<{
  rows: readonly GridCard[];
  group: GroupKey;
  selectedId?: string | null;
  onOpen?: (id: string) => void;
}> = ({ rows, group, selectedId, onOpen }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  /**
   * ⚠️ RECTS ARE CAPTURED AFTER EACH COMMIT, NEVER DURING RENDER. `measureFlip` writes to the DOM
   * (it adds `sa-settled` before reading, which is the rule the helper exists to enforce), and a
   * render body that mutates the DOM runs twice under StrictMode and at unpredictable moments
   * under concurrent rendering. Positions recorded at the end of a layout effect are the last ones
   * actually painted, which is exactly what FIRST means.
   */
  const before = useRef<FlipRects | null>(null);
  /* ⚠️ THE ORDER, NOT THE ROWS. A re-render that changed no positions must not play a FLIP — the
     key is what the arrangement IS, so an identical key means nothing moved and nothing is
     touched. `playFlip` is selective too, but not asking is cheaper than asking and being told no. */
  const orderKey = `${group}|${rows.map((r) => r.id).join(",")}`;
  const lastOrder = useRef<string | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const changed = lastOrder.current !== null && lastOrder.current !== orderKey;
    lastOrder.current = orderKey;

    let done: number | undefined;
    if (changed && before.current && !prefersReducedMotion()) {
      playFlip(stage, before.current, {
        selector: SELECTOR, dataKey: DATA_KEY, durationMs: FLIP_MS, easing: FLIP_EASE,
      });
      done = window.setTimeout(() => {
        clearFlip(stage, SELECTOR);
        /* Re-record from the settled, cleared state — otherwise the next FLIP inverts against
           positions that still carried a transform. */
        before.current = measureFlip(stage, { selector: SELECTOR, dataKey: DATA_KEY });
        clearFlip(stage, SELECTOR);
      }, FLIP_MS + 60);
    } else {
      if (changed) clearFlip(stage, SELECTOR);
      before.current = measureFlip(stage, { selector: SELECTOR, dataKey: DATA_KEY });
      /* ⚠️ CLEARED IMMEDIATELY. `measureFlip` settles every card in order to read it; leaving them
         settled would kill the entrance animation for every card that arrives later. */
      clearFlip(stage, SELECTOR);
    }
    return () => { if (done !== undefined) window.clearTimeout(done); };
  }, [orderKey]);

  /* Nothing left holding a settled class or an inline transform when the grid goes. */
  useEffect(() => () => clearFlip(stageRef.current, SELECTOR), []);

  const card = (r: GridCard) => (
    <QueryCard
      key={r.id}
      id={r.id}
      status={r.status}
      name={r.name}
      agency={r.agency}
      initials={r.initials}
      facts={r.facts}
      selected={selectedId === r.id}
      onOpen={onOpen}
    />
  );

  if (group === "none") {
    return (
      <div className="qcc-stage" ref={stageRef}>
        <div className="qcc-grid">{rows.map(card)}</div>
      </div>
    );
  }

  /* ⚠️ GROUPING PARTITIONS AN ALREADY-SORTED LIST — it never re-orders within a group. A second
     ordering pass is how the grouped and flat readings come to disagree about the same two cards. */
  const buckets = new Map<string, GridCard[]>();
  for (const r of rows) {
    const label = groupLabelFor(r, group);
    const list = buckets.get(label);
    if (list) list.push(r);
    else buckets.set(label, [r]);
  }
  const headings = [...buckets.keys()].sort((a, b) => compareGroupLabels(a, b, group));

  return (
    <div className="qcc-stage" ref={stageRef}>
      {headings.map((h) => (
        <section className="qcc-sec" key={h}>
          <h2 className="qcc-sech">
            <span className="qcc-sech-tx">{h}</span>
            <span className="qcc-sech-n">{buckets.get(h)!.length}</span>
            <span className="qcc-sech-rule" aria-hidden="true" />
          </h2>
          <div className="qcc-grid">{buckets.get(h)!.map(card)}</div>
        </section>
      ))}
    </div>
  );
};
