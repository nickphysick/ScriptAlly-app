/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcReviewAid — a review aid for ONE question the harness account cannot answer: what the summary
 * row does on an account with more live queries than the test account holds.
 *
 * `window.__SA_QC_PAD_LIVE = 56` repeats the account's own live rows, under new ids, until that many
 * are live. Nothing is written anywhere; the rows exist for the life of the page.
 *
 * ⚠️ NEVER READ IN A PRODUCTION BUILD — the same gate as `useQcLoad`'s hold. A padded row is a COPY
 * of a real one, so opening it would put an id that does not exist into the URL: this is for
 * measuring the row of gauges, not for using the page.
 */
import type { QcRow } from "../../../lib/qcSummary";
import { isClosedStatus } from "../../../lib/qcStages";

export function padLiveRows(rows: QcRow[]): QcRow[] {
  if (import.meta.env.MODE === "production" || typeof window === "undefined") return rows;
  const want = (window as unknown as { __SA_QC_PAD_LIVE?: number }).__SA_QC_PAD_LIVE;
  if (typeof want !== "number" || want <= 0) return rows;
  const live = rows.filter((r) => !isClosedStatus(r.status));
  if (!live.length || live.length >= want) return rows;
  const out = rows.slice();
  for (let i = 0; live.length + i < want; i++) {
    const src = live[i % live.length];
    const id = `${src.id}~pad${i}`;
    out.push({ ...src, id, query: { ...src.query, id } });
  }
  return out;
}
