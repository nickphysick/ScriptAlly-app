/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153.1 (design-refs/query-centre-v153-1.html) — THE STAGE RING, "Where they are": the ring of five
 * buckets and its legend.
 *
 * v153.2 (design-refs/query-centre-v153-2.html): OPEN. No card, no navy bar and no artwork; the ring and the legend sit
 * on the page's own ground. The middle is a soft disc holding the number still in play; the legend has a heading,
 * "Where they are" over a 2px navy rule, with "M sent" (or "Nothing sent yet") at its right.
 *
 * ⚠️ THE RING IS THE RAIL'S STAGE FILTER. A segment or a legend row toggles `toggleRing`, which writes the same
 *    `stages` field the rail's "Where it stands" rows write, so the rail shows it on and the list narrows.
 * ⚠️ THE SVG IS `aria-hidden`; THE LEGEND IS ITS TEXT. Each legend row is a button named "Partial requested, 5 of 26";
 *    the segments are the same buttons for a pointer (no tab stop of their own, so nothing is reachable twice).
 */
import React from "react";
import type { Qc138Filters } from "../../../lib/qc138";
import { RING_BUCKETS, ringInPlay, ringOn, ringTotal, toggleRing, type RingCounts, type RingKey } from "../../../lib/qc1531";
import { OpenRing, type OpenRingBucket } from "../../shell/OpenRing";

export interface QcStageRingProps {
  /** null while loading: the track, no figures */
  counts: RingCounts | null;
  filters: Qc138Filters;
  onFilters: (f: Qc138Filters) => void;
}

/* Your notes v1: the drawing is the shared `shell/OpenRing`; this names the Query Centre's five buckets, its middle
   ("still in play") and the rail's stage filter. openHeaderShared.test.tsx holds the markup byte-identical. */
const BUCKETS: readonly OpenRingBucket<RingKey>[] = RING_BUCKETS.map((b) => ({ key: b.key, label: b.label, fill: b.fill, ink: b.ink, hatch: b.key === "closed" }));

export const QcStageRing1531: React.FC<QcStageRingProps> = ({ counts, filters, onFilters }) => {
  const total = counts ? ringTotal(counts) : 0;
  const inPlay = counts ? ringInPlay(counts) : null;
  return (
    <OpenRing<RingKey>
      buckets={BUCKETS}
      counts={counts}
      isOn={(k) => ringOn(filters, k)}
      onPick={(k) => onFilters(toggleRing(filters, k))}
      mid={{ n: inPlay, label: "still in play" }}
      srMid={inPlay != null ? `, ${inPlay} still in play` : null}
      heading="Where they are"
      sum={!counts ? " " : total === 0 ? "Nothing sent yet" : `${total} sent`}
      ariaLabel="Where they are"
      tipNoun="queries"
      hatchId="qc1531-hatch"
      probe="qc1531"
    />
  );
};
