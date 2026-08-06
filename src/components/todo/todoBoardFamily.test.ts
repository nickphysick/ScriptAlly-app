/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The band's family map and the ⋯ verbs (board+dock P3).
 *
 * ⚠️ THE MAP IS LOCKED AS A MAP, not as four separate colours — because the regression was a map
 * that got HALF-COPIED. The family distinction was never lost: it was never carried. The old card
 * grammar has it (`.tdb-band.do/.hk/.nt`); when the board was built its band rule was written
 * fresh from the one card the ref happened to draw — an urgent one — so one family's tint became
 * the band's only tint. A per-colour test would have passed on that card. This one cannot.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { bandFamily, sweepCardFor } from "../../lib/todoColumns";
import { cardFamily, liveFamily, FAMILY_SWATCH, FAMILY_BAND } from "../../lib/todoFamily";
import { TODO_FACETS, facetOf } from "../../lib/todoBoardSort";
import { cardMenu, MenuLeaf } from "../../lib/todoMenu";

const here = __dirname;
const css = readFileSync(join(here, "todoBoard.css"), "utf8");
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

/* ⚠️ CONSOLIDATED (board fixes II, P4): the map lives in src/lib/todoFamily.ts and NOWHERE else —
   it had shipped wrong twice, both times because a second copy existed (bandFamily and facetOf
   each keyed on the `hk` GLYPH flag, so STALE rendered urgent pink while the counting law filed
   it under housekeeping; the --td-sw-* swatch tokens were a third home, with sage and pink
   SWAPPED). bandFamily survives as a delegating re-export; facetOf delegates to liveFamily. */
describe("⚠️ family → tint, ONE MAP — the exhaustive kind table", () => {
  it("⚠️ STALE IS HOUSEKEEPING — the regression this pack was called for", () => {
    // derivedCopy builds a stale card with hk:false in the hk lane; the glyph flag misled both copies
    const stale = card({ stream: "hk", hk: false, taskType: "no_response_close", kind: "STALE" });
    expect(cardFamily(stale)).toBe("housekeeping");
    expect(facetOf(stale)).toBe("housekeeping"); // and the FILTERS agree — same map
  });

  it("every taskType lands where the counting law files it", () => {
    // urgent kinds — OFFER and the AGENT-WAITING set (the do lane)
    for (const t of ["offer_received", "partial_requested", "full_requested", "revise_resubmit", "nudge_overdue"]) {
      expect(cardFamily(card({ stream: "do", taskType: t })), t).toBe("urgent");
    }
    // housekeeping — stale, the data-quality members, the sweeps, the snoozed rebuilds
    expect(cardFamily(card({ stream: "hk", taskType: "no_response_close" }))).toBe("housekeeping");
    expect(cardFamily(card({ stream: "hk", hk: true, taskType: "data_quality_poor" }))).toBe("housekeeping");
    expect(cardFamily(sweepCardFor("dq_materials", "Materials", 16, []).card)).toBe("housekeeping");
    // the writer's own — wherever the lane put them (a promoted due task sits in "do")
    expect(cardFamily(card({ stream: "nt", userTaskId: "u1", nature: "task" }))).toBe("yours");
    expect(cardFamily(card({ stream: "do", userTaskId: "u1", nature: "task" }))).toBe("yours");
    expect(cardFamily(card({ stream: "nt", nature: "note" }))).toBe("yours");
    // a snoozed user task rebuilds with stream "hk" + userTaskId — yours wins (the guard order)
    expect(cardFamily(card({ stream: "hk", hk: true, taskType: "user_task", userTaskId: "u1" }))).toBe("yours");
  });

  it("done beats every other family — a finished thing is finished, whatever it was", () => {
    expect(cardFamily(card({ done: true, taskType: "offer_received" }))).toBe("done");
    expect(cardFamily(card({ done: true, userTaskId: "u1" }))).toBe("done");
    expect(liveFamily(card({ taskType: "offer_received" }))).toBe("urgent"); // the live view ignores done
  });

  it("bandFamily and facetOf are the SAME map, by delegation — never by agreement", () => {
    expect(bandFamily).toBe(cardFamily); // the re-export is the function itself
    const cases = [
      card({ stream: "do", taskType: "offer_received" }),
      card({ stream: "hk", taskType: "no_response_close" }),
      card({ stream: "nt", userTaskId: "u1" }),
    ];
    for (const c of cases) expect(facetOf(c)).toBe(liveFamily(c));
  });

  it("ALL FOUR families have their own rule — the half-copy is what regressed", () => {
    for (const fam of ["urgent", "housekeeping", "yours", "done"]) {
      expect(css, `.tbd-band.fam-${fam} has no rule`).toContain(`.tbd-band.fam-${fam} {`);
    }
  });

  it("and the four tints are DISTINCT — four rules all painting one colour is the same bug", () => {
    const tint = (fam: string) => {
      const i = css.indexOf(`.tbd-band.fam-${fam} {`);
      return css.slice(i, css.indexOf("}", i));
    };
    const tints = ["urgent", "housekeeping", "yours", "done"].map(tint);
    expect(new Set(tints).size).toBe(4);
    expect(new Set(Object.values(FAMILY_SWATCH)).size).toBe(4); // and so are the swatches
  });

  it("⚠️ the CSS restatement matches FAMILY_BAND per family — the consolidation's teeth", () => {
    for (const fam of ["urgent", "housekeeping", "yours", "done"] as const) {
      const i = css.indexOf(`.tbd-band.fam-${fam} {`);
      const rule = css.slice(i, css.indexOf("}", i));
      const b = FAMILY_BAND[fam];
      expect(rule, `${fam} from`).toContain(b.from);
      expect(rule, `${fam} to`).toContain(b.to);
      expect(rule, `${fam} border`).toContain(b.bd);
    }
  });

  it("⚠️ the FILTERS swatches ARE the family swatches — one source, two consumers", () => {
    for (const f of TODO_FACETS) {
      if (f.id === "all") continue;
      expect(f.swatch, f.label).toBe(FAMILY_SWATCH[f.id]);
    }
    // and they are the settled ref's own hexes
    expect(FAMILY_SWATCH.urgent).toBe("#e8a68e");
    expect(FAMILY_SWATCH.housekeeping).toBe("#d9c49a");
    expect(FAMILY_SWATCH.yours).toBe("#a8bca4");
  });

  it("⚠️ the ink border is worn IFF the family is urgent — same map as the band", () => {
    expect(board).toContain('`tbd-card${bandFamily(c) === "urgent" ? " urgent" : ""}');
    expect(board).toContain("`tbd-band fam-${bandFamily(c)}`");
  });
});

/* ⚠️ SUPERSEDED (board fixes II, P1 — 6 Aug): `cardVerbs` retired; the menu model is now the
   grouped `cardMenu` in src/lib/todoMenu.ts and its own suite (todoBoardMenu.test.ts) carries the
   exhaustive per-kind/per-column tables. What survives HERE are the two laws this file has always
   held: verbs never say "Move to X", and an offer's Dismiss renders disabled with its reason. */
const flatten = (c: BoardCard, col: "todo" | "today" | "snoozed" | "done"): MenuLeaf[] =>
  cardMenu(c, col).flatMap((g) => g.entries.flatMap((e) => (e.kind === "leaf" ? [e] : e.sub)));

describe("⚠️ the ⋯ menu speaks VERBS, never 'Move to X'", () => {
  it("names acts", () => {
    const labels = flatten(card({ relatedRecordId: "q1", taskType: "full_requested" }), "todo").map((v) => v.label);
    expect(labels).toContain("Action now");
    expect(labels).toContain("＋ Add to today");
    expect(labels).toContain("Open the query");
  });

  it("NOWHERE says 'Move to' — that describes the card, not the work", () => {
    for (const col of ["todo", "today", "snoozed", "done"] as const) {
      for (const c of [card({ taskType: "full_requested" }), card({ userTaskId: "u1" })]) {
        for (const v of flatten(c, col)) expect(v.label).not.toMatch(/move to/i);
      }
    }
    expect(board).not.toMatch(/Move to \{/);
  });

  it("on Today the verb REVERSES rather than repeating — it is a state, not a command list", () => {
    expect(flatten(card({}), "today").map((v) => v.label)).toContain("− Remove from today");
    expect(flatten(card({}), "todo").map((v) => v.label)).toContain("＋ Add to today");
  });

  it("⚠️ an offer's Dismiss RENDERS, disabled, and says why — absence would read as an oversight", () => {
    const d = flatten(card({ taskType: "offer_received" }), "todo").find((v) => v.label.startsWith("Dismiss"))!;
    expect(d.label).toBe("Dismiss — not for offers");
    expect(d.disabled).toBe(true);
    expect(d.why).toContain("reply-by");
  });

  it("a user task has no 'Open the query' — there is no query to open", () => {
    const labels = flatten(card({ userTaskId: "u1" }), "todo").map((v) => v.label);
    expect(labels).not.toContain("Open the query");
  });
});

describe("⚠️ completion goes through the PRIMITIVE, from either path (the undo repair)", () => {
  const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

  it("the drag's complete branch calls quickDone — the same call the tick makes", () => {
    const fn = page.slice(page.indexOf("function performBoardPlan"), page.indexOf("function renderBoard"));
    expect(fn).toContain('case "complete": void quickDone(card);');
  });

  it("no board path writes `done: true` directly, which is how the undo was bypassed", () => {
    const fn = page.slice(page.indexOf("function performBoardPlan"), page.indexOf("function renderBoard"));
    expect(fn).not.toContain("done: true");
  });

  it("and quickDone still raises the undo toast it always did", () => {
    const qd = page.slice(page.indexOf("async function quickDone"), page.indexOf("async function quickDone") + 1200);
    expect(qd).toContain("const undo =");
    expect(qd).toContain("flash(");
  });
});
