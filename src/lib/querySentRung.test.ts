/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE PROJECTION AND THE LOG TRAVEL TOGETHER (chase round, Phase 2).
 *
 * `users/{uid}/activities` is a PROJECTION; `users/{uid}/queries/{id}/activity` is the authoritative
 * log, and it is what the task pane's story column reads. `addQuery` wrote every seeded entry to the
 * projection and only the ADVANCED one to the log — so `QUERY_SENT` reached the feed and never the
 * record, and every card's story opened on its own terminus with no beginning.
 *
 * ⚠️ IT IS ASSERTED AS ONE LOOP, NOT AS TWO CALLS EXISTING. Two `setDoc`s in separate blocks is the
 * shape that produced the fault: both were present, and one iterated a filtered subset. What makes
 * them unable to diverge is that a single `for` body writes both, so an entry cannot reach one
 * store without reaching the other.
 *
 * ⚠️ A SOURCE LOCK IS WHAT IS AVAILABLE HERE and its limits are stated rather than hidden: `db.tsx`
 * pulls in Firebase, so this proves the code was WRITTEN, not that it ran. The claim that it runs is
 * measured on the page — `tests/e2e/chaseStory.measure.ts`, which counts the rendered rungs against
 * the query's own activity count.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sliceBetween } from "../test/sliceBetween";

const src = readFileSync(join(__dirname, "db.tsx"), "utf8");
/** ⚠️ comments stripped — this file's prose quotes the very strings the locks forbid. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("⚠️ a query's send rung reaches the log, not just the feed", () => {
  /* fails loudly on a missing anchor rather than silently widening to the rest of the file */
  const seedBlock = () => sliceBetween(code, "const seeded = seedActivities();", "return { success: true, id };", "addQuery's seeding block");

  it("one loop writes both stores for every seeded entry", () => {
    const block = seedBlock();
    const loop = sliceBetween(block, "for (const act of seeded) {", "}", "the seeding loop");
    expect(loop, "the feed write left the loop").toContain('"activities", act.id');
    expect(loop, "the log write is not in the same loop — the two stores can diverge again")
      .toContain('"activity", act.id');
  });

  /**
   * ⚠️ AND NOTHING FILTERS THE ENTRIES ON THEIR WAY TO THE LOG. The fault was a `find` for the
   * advanced entry feeding a single write; a `filter` or a second `find` here would be the same
   * mistake wearing a different verb.
   */
  it("no entry is selected out of the log write", () => {
    const block = seedBlock();
    const loop = sliceBetween(block, "for (const act of seeded) {", "}", "the seeding loop");
    for (const verb of ["find(", "filter(", "slice(", "[0]"]) {
      expect(loop, `the log write is behind a ${verb} — the send rung can be dropped again`)
        .not.toContain(verb);
    }
  });

  /**
   * ⚠️ THE RECOMPUTE STILL FOLLOWS AN ADVANCED SEED, AND ONLY ONE. A query born at Queried is
   * already at its derived status; recomputing every create would be a write per query for nothing.
   * Asserted because the guard moved when the loop did, and a moved guard is where behaviour is
   * lost quietly.
   */
  it("the recompute is still gated on an advanced seed", () => {
    const block = seedBlock();
    expect(block).toContain("recomputeQueryOnline");
    const at = block.indexOf("recomputeQueryOnline");
    const guard = block.slice(Math.max(0, at - 260), at);
    expect(guard, "the recompute lost its advanced-seed guard").toMatch(/!==\s*QueryStatus\.QUERIED/);
  });

  /**
   * ⚠️ THE TWO SHAPES ARE DIFFERENT DOCUMENTS. The log keys on `type`/`createdAt`/`note`; writing
   * the feed's `Activity` into the log's collection produces a row that parses and renders as
   * nothing — which is indistinguishable, on screen, from the bug this fixes.
   */
  it("the log document is built for the log, not copied from the feed", () => {
    const block = seedBlock();
    expect(block).toContain("const logDoc =");
    const builder = sliceBetween(block, "const logDoc =", "});", "the log-document builder");
    for (const field of ["type:", "resultingStatus:", "createdAt:", "note:", "queryId:"]) {
      expect(builder, `the log document is missing ${field}`).toContain(field);
    }
  });
});
