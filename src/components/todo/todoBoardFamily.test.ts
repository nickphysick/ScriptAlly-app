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
import { bandFamily, cardVerbs } from "../../lib/todoColumns";

const here = __dirname;
const css = readFileSync(join(here, "todoBoard.css"), "utf8");
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

describe("⚠️ family → tint, as a MAP", () => {
  it("every card lands in exactly one family", () => {
    expect(bandFamily(card({ taskType: "offer_received" }))).toBe("urgent");
    expect(bandFamily(card({ hk: true, taskType: "data_quality_poor" }))).toBe("housekeeping");
    expect(bandFamily(card({ userTaskId: "u1", nature: "task" }))).toBe("yours");
    expect(bandFamily(card({ done: true }))).toBe("done");
  });

  it("done beats every other family — a finished thing is finished, whatever it was", () => {
    expect(bandFamily(card({ done: true, taskType: "offer_received" }))).toBe("done");
    expect(bandFamily(card({ done: true, userTaskId: "u1" }))).toBe("done");
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
  });

  it("urgent is the family PINK with its own border (the brief's values)", () => {
    const u = css.slice(css.indexOf(".tbd-band.fam-urgent {"), css.indexOf("}", css.indexOf(".tbd-band.fam-urgent {")));
    expect(u).toContain("#f8e2d9");
    expect(u).toContain("#f4d5c9");
    expect(u).toContain("#e8c8bc");
  });

  it("the template actually applies the family — a map nothing reads is not a map", () => {
    expect(board).toContain("`tbd-band fam-${bandFamily(c)}`");
  });
});

describe("⚠️ the ⋯ menu speaks VERBS, never 'Move to X'", () => {
  it("names acts", () => {
    const labels = cardVerbs(card({ relatedRecordId: "q1", taskType: "full_requested" }), "todo").map((v) => v.label);
    expect(labels).toContain("Action now");
    expect(labels).toContain("＋ Add to today");
    expect(labels).toContain("Snooze…");
    expect(labels).toContain("Open the query");
  });

  it("NOWHERE says 'Move to' — that describes the card, not the work", () => {
    for (const col of ["todo", "today", "snoozed", "done"] as const) {
      for (const c of [card({ taskType: "full_requested" }), card({ userTaskId: "u1" })]) {
        for (const v of cardVerbs(c, col)) expect(v.label).not.toMatch(/move to/i);
      }
    }
    expect(board).not.toMatch(/Move to \{/);
  });

  it("on Today the verb REVERSES rather than repeating — it is a state, not a command list", () => {
    expect(cardVerbs(card({}), "today").map((v) => v.label)).toContain("− Take off today");
    expect(cardVerbs(card({}), "todo").map((v) => v.label)).toContain("＋ Add to today");
  });

  it("⚠️ an offer's Dismiss RENDERS, disabled, and says why — absence would read as an oversight", () => {
    const d = cardVerbs(card({ taskType: "offer_received" }), "todo").find((v) => v.id === "dismiss")!;
    expect(d.label).toBe("Dismiss — not for offers");
    expect(d.disabled).toBe(true);
    expect(d.why).toContain("reply-by");
  });

  it("a user task has no 'Open the query' — there is no query to open", () => {
    const labels = cardVerbs(card({ userTaskId: "u1" }), "todo").map((v) => v.label);
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
