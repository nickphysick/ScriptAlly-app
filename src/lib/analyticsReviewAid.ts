/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * analyticsReviewAid — a DEV-ONLY review aid for the Analytics page. It fabricates INPUT, never output:
 * `window.__SA_AN_LIMIT = n` hands the real derivation only the manuscript's first `n` queries (oldest
 * sent first), so the thin-sample rule can be measured on a single query (AN17-16) without changing the
 * dev seed. Every figure is still computed by `analyticsModel` from real records.
 *
 * ⚠️ THE GATE IS AT THE CALL SITE (`QueryAnalytics.tsx`), where a statically replaced
 * `import.meta.env.MODE` makes the call dead code in a production build and this module unreachable —
 * a guard inside the module would still ship the module (the qcReviewAid lesson).
 */
import type { Query } from "../types";

export function limitForReview(queries: Query[]): Query[] {
  if (typeof window === "undefined") return queries;
  const n = (window as unknown as { __SA_AN_LIMIT?: unknown }).__SA_AN_LIMIT;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return queries;
  const t = (q: Query) => { const ms = q.dateSent ? Date.parse(q.dateSent) : NaN; return Number.isFinite(ms) ? ms : Infinity; };
  return queries.slice().sort((a, b) => t(a) - t(b)).slice(0, Math.floor(n));
}
