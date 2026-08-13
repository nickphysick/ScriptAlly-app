/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · Pack A §4 — CHIPS APPEAR ONLY ONCE EARNED.
 *
 * Both journeys opened with every chip rendered as an empty ring — a row of unfilled circles sitting
 * exactly where the eye should be going to the question. A chip now appears when its phase is
 * complete, already ticked, because there is no other state it can be in.
 *
 * ⚠️ THE DERIVATIONS ARE UNCHANGED, AND DELIBERATELY SO. `requirements` and `responseChips` still
 * return every state — that is what the render FILTERS on, and the states also drive the step
 * stack's own marks. What changed is what the header draws.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { requirements } from "./createSteps";
import { responseChips, emptyResponseDraft } from "./responseDraft";
import { emptyDraft } from "./queryDraft";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const css = read("../components/shell/f12.css");
const rule = (sel: string): string => {
  const i = css.indexOf("\n" + sel + " {");
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1);
};

describe("§4 · the initial state renders no chips at all", () => {
  /* ⚠️ ASSERTED ON THE DERIVATION THE RENDER FILTERS, not on rendered HTML — this repo has no
     jsdom. What the render does with these is asserted separately, below. */
  it("create: nothing is `answered` before the writer has done anything", () => {
    const d = emptyDraft();
    const earned = requirements(d, d, { when: false, what: false }).filter((r) => r.state === "answered");
    expect(earned, "a chip is earned on arrival — the header would open with a tick").toHaveLength(0);
  });

  /* ⚠️ AND A SEEDED MANUSCRIPT DOES NOT EARN ONE. `openCreate` can preselect a book; that is the
     app's own doing, and a tick against it claims a confirmation nobody gave. */
  it("create: a seeded manuscript and today's date earn nothing", () => {
    const d = emptyDraft({ manuscriptId: "m1" });
    const earned = requirements(d, d, { when: false, what: false }).filter((r) => r.state === "answered");
    expect(earned.map((r) => r.key), "the app's own seeding earned a tick").toEqual([]);
  });

  it("record: nothing is `done` before an outcome is chosen", () => {
    const d = emptyResponseDraft("2026-08-13");
    const earned = responseChips(d, { when: false }).filter((c) => c.state === "done");
    expect(earned, "the arrival date is seeded, and a seeded date is not an answer").toHaveLength(0);
  });
});

describe("§4 · a chip appears only in its completed form", () => {
  it("create: choosing an agent earns exactly that chip", () => {
    const base = emptyDraft();
    const d = { ...base, agentId: "a1" };
    const earned = requirements(d, base, { when: false, what: false }).filter((r) => r.state === "answered");
    expect(earned.map((r) => r.key)).toEqual(["agent"]);
  });

  it("create: advancing past a step earns its chip", () => {
    const base = emptyDraft({ manuscriptId: "m1" });
    const earned = requirements(base, base, { when: true, what: true }).filter((r) => r.state === "answered");
    expect(earned.map((r) => r.key)).toEqual(["manuscript", "date"]);
  });

  it("record: choosing an outcome earns its chip, opening When earns the other", () => {
    const d = { ...emptyResponseDraft("2026-08-13"), outcome: "offer" as const };
    expect(responseChips(d, { when: false }).filter((c) => c.state === "done").map((c) => c.key))
      .toEqual(["outcome"]);
    expect(responseChips(d, { when: true }).filter((c) => c.state === "done").map((c) => c.key))
      .toEqual(["outcome", "date"]);
  });

  /* ⚠️ AN EARNED CHIP CAN ONLY BE TICKED, so the render has nothing left to choose between. The
     ternary that picked an empty ring, a dash or a tick is gone from both headers. */
  it("both headers filter to earned chips and draw one mark", () => {
    expect(queries).toContain('.filter((r) => r.state === "answered")');
    expect(queries).toContain('.filter((r) => r.state === "done")');
    expect(queries, "an unearned state is still being drawn")
      .not.toContain('r.state === "prefilled" ? "–"');
    expect(queries, "an empty ring can still be rendered").not.toContain('r.state === "empty" ? ""');
  });
});

describe("§4 · the row's arrival moves nothing above it", () => {
  /**
   * ⚠️ RESERVED, NOT ANIMATED. A height transition still moves everything below it for the length
   * of the transition; holding the space means nothing moves at all. The row is the same height
   * empty or full, so the first chip to arrive cannot push the title or the place line.
   *
   * The rendered proof is browser-measured (`tests/e2e/qcReconcile.measure.ts`) — jsdom has no
   * layout engine, so a height assertion here would pass against a row that collapses.
   */
  it("the chip row's height is reserved", () => {
    const r = rule(".qch-reqs");
    expect(r, "the chip row rule is missing").not.toBe("");
    expect(r, "the row collapses when empty — the header would grow as chips arrive")
      .toContain("min-height");
  });

  /* the title and the place line sit ABOVE the row, so their order is what makes reserving work */
  it("the row is the last thing in the header's text block", () => {
    const at = queries.indexOf('className="qch-reqs"');
    expect(at, "the chip row is missing").toBeGreaterThan(-1);
    const place = queries.lastIndexOf("qch-place", at);
    expect(place, "the place line moved below the chips — it would be what shifts").toBeGreaterThan(-1);
    expect(place).toBeLessThan(at);
  });
});
