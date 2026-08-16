/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Template guards for the board card's band and border (corrections fixes 4 + 5). These are the
 * tests that should have caught "OFFER · OFFER" and the ink border on every card.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus, Agent, Query, Manuscript, Task } from "../../types";
import { assembleBoard, offerDue, BoardInput } from "../../lib/todoBoard";

const here = __dirname;
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
const css = readFileSync(join(here, "todoBoard.css"), "utf8");

const NOW = Date.parse("2026-08-06T12:00:00Z");
const TODAY = "2026-08-06";
const task = (id: string, taskType: string, rid: string): Task =>
  ({ id, priority: "urgent", title: "", description: "", manuscriptTitle: "", context: "", relatedRecordId: rid, taskType, actionLabel: "", actionPath: "queries" } as Task);
const query = (id: string, agentId: string, status: QueryStatus, over: Partial<Query> = {}): Query =>
  ({ id, agentId, manuscriptId: "m1", status, dateSent: "2026-05-01T00:00:00Z", ...over } as unknown as Query);
const agent = (id: string, name: string, agency: string): Agent => ({ id, name, agency } as unknown as Agent);
const base = (over: Partial<BoardInput> = {}): BoardInput => ({
  tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [{ id: "m1", title: "Lost Clockworks" } as unknown as Manuscript],
  taskFlags: [], activities: [], today: TODAY, now: NOW, ...over,
} as BoardInput);

describe("⚠️ the right band lane NEVER mirrors the left (fix 4)", () => {
  it("an offer with no reply-by states NOTHING on the right — it used to state 'OFFER' twice", () => {
    expect(offerDue(null, NOW)).toBe("");
    expect(offerDue(NaN, NOW)).toBe("");
  });

  it("an offer WITH a reply-by states only the when — the kind is the left lane's job", () => {
    const inThree = NOW + 3 * 86400000;
    expect(offerDue(inThree, NOW)).toBe("3 DAYS TO REPLY");
    expect(offerDue(inThree, NOW)).not.toContain("OFFER");
    expect(offerDue(NOW - 86400000, NOW)).toBe("REPLY-BY PASSED");
  });

  it("across EVERY derived card, `due` is never equal to `kind`", () => {
    const b = assembleBoard(base({
      tasks: [
        task("t1", "offer_received", "q1"), task("t2", "partial_requested", "q2"),
        task("t3", "full_requested", "q3"), task("t4", "nudge_overdue", "q4"),
        task("t5", "no_response_close", "q5"), task("t6", "data_quality_poor", "a1"),
      ],
      queries: [
        query("q1", "a1", QueryStatus.OFFER), query("q2", "a1", QueryStatus.PARTIAL_REQUESTED),
        query("q3", "a1", QueryStatus.FULL_REQUESTED), query("q4", "a1", QueryStatus.QUERIED),
        query("q5", "a1", QueryStatus.QUERIED),
      ],
      agents: [agent("a1", "Tom Ellery", "Ellery Literary")],
    }));
    for (const c of [...b.do, ...b.hk]) {
      expect(c.due, `${c.key}: the right lane repeats the left`).not.toBe(c.kind);
    }
  });

  it("and the TEMPLATE guards it too, so neither end can produce the echo", () => {
    expect(board).toContain("c.due !== c.kind");
  });
});

describe("the card's meta line is agent · agency, never a second agent (fix 4)", () => {
  it("reads exactly the agent's own two identity fields", () => {
    const b = assembleBoard(base({
      tasks: [task("t1", "full_requested", "q1")],
      queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED)],
      agents: [agent("a1", "Tom Ellery", "Ellery Literary"), agent("a2", "Curtis Vane", "Vane & Co")],
    }));
    expect(b.do[0].record).toBe("Tom Ellery · Ellery Literary");
    // the OTHER agent on file must never reach this card
    expect(b.do[0].record).not.toContain("Curtis Vane");
  });
});

describe("⚠️ the ink border is URGENT-ONLY (fix 5)", () => {
  it("the class keys on the URGENT FAMILY, not on `warn` (P4 re-keyed the lane onto the map)", () => {
    /* `warn` is true for offers, fulls, stale queries and old nudges alike — most of the board —
       so keying on it put ink on nearly every card and the border distinguished nothing. The lane
       fixed that but inked a promoted user task's sage band; the FAMILY is the border's meaning,
       and it is the same consolidated map the band class reads. */
    expect(board).toContain('bandFamily(c) === "urgent" ? " urgent" : ""');
    expect(board).not.toContain('c.warn ? " urgent" : ""');
    expect(board).not.toContain('c.stream === "do" ? " urgent" : ""');
  });

  it("the base card is a hairline and only .urgent is ink", () => {
    /* P6 re-anchored (the slice law): ".tbd-card {" now first matches the body-spacing rule, and
       a slice from there swept in the lift-link's ink hover. Anchor on the surface rule itself. */
    const anchor = ".tbd-card {\n  background:";
    expect(css).toContain(anchor);
    const baseRule = css.slice(css.indexOf(anchor), css.indexOf("}", css.indexOf(anchor)));
    expect(baseRule).toContain("border: 1px solid #efe8dc");
    expect(baseRule).not.toContain("#2a1a13");
    expect(css).toContain(".tbd-card.urgent { border: 1px solid #2a1a13; }");
  });

  it("border presence iff urgent, over a real board", () => {
    const b = assembleBoard(base({
      tasks: [task("t1", "full_requested", "q1"), task("t2", "data_quality_poor", "a1")],
      queries: [query("q1", "a1", QueryStatus.FULL_REQUESTED)],
      agents: [agent("a1", "Tom Ellery", "Ellery Literary")],
    }));
    expect(b.do.every((c) => c.stream === "do")).toBe(true);   // these get ink
    expect(b.hk.every((c) => c.stream !== "do")).toBe(true);   // these must not
  });
});
