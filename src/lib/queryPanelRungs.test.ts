/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { rungFacts, waitProgress } from "./queryPanelRungs";

describe("⚠️ the rail names an event by its own `type`, never by its status", () => {
  it("keeps the non-status rows the rules explicitly protect", () => {
    /* `firestore.rules` says in as many words that `type` must NOT take the enum check, because
       'Nudge sent', 'Holding reply', 'Offer accepted' and 'Offer declined' carry no
       `resultingStatus` — and that constraining it "would deny every nudge, holding reply and
       offer decision AND blank those rows". Reading the status for a LABEL blanks them the same
       way, one layer up. */
    const rows = [
      { id: "a", type: "Query sent", resultingStatus: "Queried", createdAt: "2026-08-01T09:00:00Z" },
      { id: "b", type: "Nudge sent", createdAt: "2026-08-20T09:00:00Z" },
      { id: "c", type: "Holding reply", createdAt: "2026-08-25T09:00:00Z" },
      { id: "d", type: "Offer declined", resultingStatus: "Withdrawn", createdAt: "2026-09-01T09:00:00Z" },
    ];
    const out = rungFacts(rows);
    expect(out.map((r) => r.event)).toEqual(["Query sent", "Nudge sent", "Holding reply", "Offer declined"]);
    /* none of them is blank, which is the failure this guards */
    for (const r of out) expect(r.event.trim()).not.toBe("");
  });

  it("every row gets a status for its dot, even one that states none", () => {
    const out = rungFacts([{ id: "n", type: "Nudge sent", createdAt: "2026-08-20T09:00:00Z" }]);
    expect(out[0].status).toBe(QueryStatus.NO_RESPONSE);
  });

  it("⚠️ oldest first — the same order the record view reads", () => {
    const out = rungFacts([
      { id: "late", type: "Full Sent", createdAt: "2026-09-01T09:00:00Z" },
      { id: "early", type: "Query sent", createdAt: "2026-08-01T09:00:00Z" },
    ]);
    expect(out.map((r) => r.id)).toEqual(["early", "late"]);
  });

  it("reads a Firestore timestamp as well as an ISO string", () => {
    const out = rungFacts([
      { id: "ts", type: "B", createdAt: { seconds: 1_780_000_000 } },
      { id: "iso", type: "A", createdAt: "2020-01-01T00:00:00Z" },
    ]);
    expect(out.map((r) => r.id)).toEqual(["iso", "ts"]);
    expect(out[1].ms).toBe(1_780_000_000_000);
  });

  it("a row with no date sorts first rather than throwing", () => {
    const out = rungFacts([{ id: "x", type: "A" }, { id: "y", type: "B", createdAt: "2026-01-01T00:00:00Z" }]);
    expect(out).toHaveLength(2);
    expect(out[0].ms).toBeNull();
  });
});

describe("⚠️ the waiting bar cannot overflow, and says nothing when it knows nothing", () => {
  const T = new Date("2026-09-04T00:00:00Z").getTime();
  const d = (iso: string) => new Date(iso).getTime();

  it("null where there is nothing to measure — the caller draws no bar", () => {
    expect(waitProgress(null, d("2026-10-01"), T)).toBeNull();
    expect(waitProgress(d("2026-08-01"), null, T)).toBeNull();
  });

  it("clamps at both ends", () => {
    expect(waitProgress(d("2026-08-01"), d("2026-10-01"), T)!.pct).toBe(56); /* 34 of 61 days */
    /* past the window: 100, not 140 */
    expect(waitProgress(d("2026-06-01"), d("2026-07-01"), T)!.pct).toBe(100);
    /* before the send — a back-dated expected date */
    expect(waitProgress(d("2026-10-01"), d("2026-11-01"), T)!.pct).toBe(0);
  });

  it("⚠️ a zero-length window is 100, never Infinity", () => {
    /* Unclamped this divides by zero and puts `Infinity%` into a width, filling the panel. */
    const r = waitProgress(d("2026-09-04"), d("2026-09-04"), T)!;
    expect(Number.isFinite(r.pct)).toBe(true);
    expect(r.pct).toBe(100);
  });

  it("past is about the date, not the percentage", () => {
    /* At exactly 100% but not yet past the date, the bar is full and not warm. */
    expect(waitProgress(d("2026-08-01"), d("2026-09-04"), T)!.past).toBe(false);
    expect(waitProgress(d("2026-08-01"), d("2026-09-03"), T)!.past).toBe(true);
  });
});
