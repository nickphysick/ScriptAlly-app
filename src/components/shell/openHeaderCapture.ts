/**
 * Your notes v1 — the Query Centre header and ring rendered in a fixed set of states. Used ONCE to capture the
 * markup before the extraction (openHeaderShared.fixture.json) and by the lock that holds it byte-identical after.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QcHeader1531 } from "../queries/centre/QcHeader1531";
import { QcStageRing1531 } from "../queries/centre/QcStageRing1531";
import { emptyQc138Filters } from "../../lib/qc138";
import { QueryStatus } from "../../types";

const noop = () => {};
export function captureQcHeaderStates(): Record<string, string> {
  const f0 = emptyQc138Filters();
  const fOn = { ...f0, stages: [QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT] };
  const counts = { wait: 12, partial: 5, full: 3, offer: 1, closed: 7 };
  const ring = (c: typeof counts | null, f = f0) => React.createElement(QcStageRing1531, { counts: c, filters: f, onFilters: noop });
  const r = (el: React.ReactElement) => renderToStaticMarkup(el);
  return {
    ringLoading: r(ring(null)),
    ringCounts: r(ring(counts)),
    ringFilterOn: r(ring(counts, fOn)),
    ringZeroBucket: r(ring({ wait: 4, partial: 0, full: 0, offer: 0, closed: 2 })),
    ringOneBucket: r(ring({ wait: 4, partial: 0, full: 0, offer: 0, closed: 0 })),
    ringEmpty: r(ring({ wait: 0, partial: 0, full: 0, offer: 0, closed: 0 })),
    headerLoading: r(React.createElement(QcHeader1531, { loading: true, onLog: noop, onRecord: noop })),
    headerFull: r(React.createElement(QcHeader1531, { loading: false, onLog: noop, onRecord: noop, counts: { ms: "Murphy’s Day Out", sent: 26, active: 19, heardPct: 40 }, ring: ring(counts) })),
    headerNoMs: r(React.createElement(QcHeader1531, { loading: false, logDisabled: true, onLog: noop, onRecord: noop, counts: { ms: null, sent: 1, active: 1, heardPct: 0 } })),
  };
}
