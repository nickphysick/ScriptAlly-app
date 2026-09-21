/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcReviewAid — a review aid for two states the harness account cannot show on its own: the summary
 * row on a busier account, and a gauge whose window is still OPEN. Both are asked of the page by
 * giving it different INPUT, never by editing its output.
 *
 *   window.__SA_QC_PAD_LIVE = 56   repeat the account's own live queries until that many are live
 *   window.__SA_QC_AHEAD    = 6    re-date N agent's-turn queries so their window has not closed
 *
 * ⚠️ IT FABRICATES QUERIES, NOT ROWS, AND THAT IS THE WHOLE POINT. An earlier version copied
 * finished `QcRow`s, so anything it demonstrated was demonstrated about numbers this file had
 * written — the gauge geometry would have been "proved" from hand-made inputs. Everything here goes
 * in at the top of the same pipe the real queries use, so `buildQcRows` → `expectedFor` →
 * `stageHistory` all run for real and a screenshot shows the app's own arithmetic. (`gaugeFor`
 * was the third link until the compact strip was retired on 21 Sep; the calendar's bars are what
 * `__SA_QC_AHEAD` demonstrates now.)
 *
 * ⚠️ `AHEAD` RE-DATES EXISTING QUERIES RATHER THAN ADDING NEW ONES, and the reason is the finding
 * it exists to illustrate. A column draws its four FURTHEST-through gauges; an open window is by
 * definition behind every overrun; and on this account every agent's-turn stage but one is full of
 * overruns. Added copies were therefore derived, sorted, and never drawn — one `within` gauge
 * reached the page out of six. Moving a query's own send date inside its agency's window turns an
 * overrun into an open window IN PLACE, in the slot it already held, which is the only arrangement
 * that shows the two side by side.
 *
 * ⚠️ AND IT MOVES THE SEND, NEVER THE EXPECTED DATE. `f` is elapsed / window, so a query whose last
 * send was `window × f` ago lands at that fraction; the aid spreads its picks from 0.15 to 0.95 to
 * walk the fill up to the notch. A query whose agency states no window has no expected date to
 * move and is left alone.
 *
 * ⚠️ NEVER READ IN A PRODUCTION BUILD — the same gate as `useQcLoad`'s hold, asserted the same way.
 * Nothing here writes. The padded copies carry ids that do not exist in Firestore, so opening one
 * logs a permission error: this is for LOOKING at the row, not for using the page.
 */
import type { Agent, Query } from "../../../types";
import { courtOf } from "../../../lib/qcSummary";
import { isClosedStatus, anyToMs } from "../../../lib/qcStages";

const DAY = 86_400_000;
const num = (k: string): number => {
  if (import.meta.env.MODE === "production" || typeof window === "undefined") return 0;
  const v = (window as unknown as Record<string, unknown>)[k];
  return typeof v === "number" && v > 0 ? v : 0;
};

/** The fractions of the window the re-dated queries sit at: early, through the middle, at the notch. */
const AHEAD_F = [0.15, 0.32, 0.5, 0.68, 0.82, 0.95];
const SEND_KEYS = ["dateSent", "partialSentDate", "fullSentDate"] as const;
const DATED_KEYS = ["dateSent", "partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate"] as const;
const field = (q: Query, k: string): unknown => (q as unknown as Record<string, unknown>)[k];
const setField = (q: Query, k: string, v: unknown): void => { (q as unknown as Record<string, unknown>)[k] = v; };

/** Slide every dated stage of a query so its LAST send lands `weeks × f` ago. Returns a new object. */
function reDate(src: Query, weeks: number, f: number, nowMs: number): Query {
  const sends = SEND_KEYS.map((k) => anyToMs(field(src, k))).filter((t): t is number => t != null);
  if (!sends.length) return src;
  const sentMs = nowMs - Math.round(weeks * 7 * DAY * f);
  const shift = sentMs - Math.max(...sends);
  const copy: Query = { ...src };
  for (const k of DATED_KEYS) {
    const t = anyToMs(field(copy, k));
    if (t != null) setField(copy, k, new Date(t + shift).toISOString());
  }
  setField(copy, "lastStatusChange", new Date(sentMs).toISOString());
  return copy;
}

export function padLiveQueries(queries: readonly Query[], agents: readonly Agent[], nowMs: number): Query[] {
  const want = num("__SA_QC_PAD_LIVE"), ahead = num("__SA_QC_AHEAD");
  if (!want && !ahead) return queries as Query[];
  const weeksOf = (q: Query): number | null => agents.find((a) => a.id === q.agentId)?.responseTimeWeeks ?? null;

  let out = queries.slice();

  if (ahead) {
    /* the candidates are the agent's-turn queries whose agency states a window — the only ones
       that HAVE an expected date derived from a send, and so the only ones this can move */
    const cand = out.filter((q) => courtOf(q.status) === "agent" && (weeksOf(q) ?? 0) > 0
      && SEND_KEYS.some((k) => anyToMs(field(q, k)) != null));
    /* round-robin across stages, so several columns show an open window beside their overruns
       rather than one column showing six */
    const byStage = new Map<string, Query[]>();
    for (const q of cand) byStage.set(q.status, [...(byStage.get(q.status) ?? []), q]);
    const lanes = [...byStage.values()];
    const picks: Query[] = [];
    for (let r = 0; picks.length < Math.min(ahead, cand.length); r++) {
      for (const lane of lanes) { if (lane[r] && picks.length < ahead) picks.push(lane[r]); }
      if (lanes.every((l) => l.length <= r + 1)) break;
    }
    const moved = new Map<string, Query>();
    picks.forEach((q, i) => moved.set(q.id, reDate(q, weeksOf(q)!, AHEAD_F[i % AHEAD_F.length], nowMs)));
    out = out.map((q) => moved.get(q.id) ?? q);
  }

  if (want) {
    /* ⚠️ THE EMPTY GUARD IS LOAD-BEARING AND IS WHY THIS HAS A TEST. This runs on every render,
       including the first — before the collections have loaded, when there is nothing to copy.
       Without it `i % live.length` is `NaN`, `live[NaN]` is `undefined`, and the page fell into
       its error boundary reading `.id`. It passed tsc, the unit suite and the build; the rendered
       page is what caught it. */
    const live = out.filter((q) => !isClosedStatus(q.status));
    if (live.length && live.length < want) {
      for (let i = 0; live.length + i < want; i++) out.push({ ...live[i % live.length], id: `${live[i % live.length].id}~pad${i}` });
    }
  }
  return out;
}
