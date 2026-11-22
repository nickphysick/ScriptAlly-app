/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v3 · Getting started folded to one row (Phase 5; ref design-refs/dashboard-v3.html, "Established").
 *
 * With one step left the checklist folds to a single row under Agents on file: the five-segment bar, "Getting started,
 * {n} of {m} done. Last one: {the step}.", the step's own link, and Hide.
 *
 * ⚠️ THE ROWS AND THEIR WORDS ARE GETTING STARTED'S (`gsRows`, `gsCopy`); the link opens the step's own flow, and Hide
 * is the same preference the full card's Hide writes.
 */
import React from "react";
import { gsCopy, type GsLink, type StartPath } from "../../../lib/dashFirstVisit";
import { gsDone, type GsRow } from "../fv1/GettingStarted";

export const gsRowLine = (done: number, total: number, deed: string): string =>
  `Getting started, ${done} of ${total} done. Last one: ${deed.charAt(0).toLowerCase()}${deed.slice(1)}.`;

export const Dash3GsRow: React.FC<{ rows: readonly GsRow[]; path: StartPath | null; onGo: (go: GsLink) => void; onHide?: () => void }> = ({ rows, path, onGo, onHide }) => {
  const last = rows.find((r) => !r.done);
  if (!last) return null;
  const c = gsCopy(last.key, path);
  return (
    <section className="d3-gsrow" data-d3="gs-row" data-fv2="gs" data-done={gsDone(rows)} data-total={rows.length} aria-label="Getting started">
      <span className="d3-gssegs" aria-hidden="true">{rows.map((r) => <i key={r.key} className={r.done ? "is-on" : undefined} />)}</span>
      <span className="d3-gstx">{gsRowLine(gsDone(rows), rows.length, c.deed)}</span>
      <button type="button" className="d2-link" data-fv1="gs-link" data-go={c.go} onClick={() => onGo(c.go)}>{c.link} →</button>
      {onHide && <button type="button" className="d3-gshide" data-fv2="gs-hide" onClick={onHide}>Hide</button>}
    </section>
  );
};
