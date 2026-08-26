/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AN ACTIVITY LIVES TWICE, AND IT LEAVES TWICE — the lock on the two-store seam.
 *
 * ⚠️ WHAT THIS EXISTS FOR. An event is a document in the query's own `activity` subcollection, which
 * is AUTHORITATIVE (`recomputeQuery` derives from it, the reading pane renders it), and a row in the
 * global `activities` feed, which is its PROJECTION. Three primitives removed or patched them one at
 * a time and each swallowed the failure of the second. Measured on the harness account: an undo took
 * the authoritative doc and left the projection, so the query read `Queried` while its timeline still
 * showed the close.
 *
 * ⚠️ AND IT IS A SOURCE LOCK ON PURPOSE, WHICH IS THE WEAKER KIND. What it can prove is that no
 * primitive still writes one store alone — a claim about the code, which is where this fault lives.
 * What it cannot prove is that a delete on a real account removes both; that is
 * `tests/e2e/auditActivityStores.mjs`, which reads the two stores and compares them.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/** comments here quote the very patterns the assertions forbid — strip them first */
const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const DB = decls(readFileSync("src/lib/db.tsx", "utf8"));

/** one function's body, bounded by the next top-level `const x = async` in the same file */
function body(name: string): string {
  const i = DB.indexOf(`const ${name} = async`);
  expect(i, `${name} is gone — this lock is reading a file that has moved on`).toBeGreaterThan(-1);
  const rest = DB.slice(i + 10);
  const j = rest.search(/\n  const [a-zA-Z]+ = async/);
  return rest.slice(0, j === -1 ? rest.length : j);
}

describe("⚠️ the primitive: both stores, or neither", () => {
  it("removeActivityEverywhere commits ONE batch, so a failure removes nothing", () => {
    const b = body("removeActivityEverywhere");
    expect(b).toContain("writeBatch(db)");
    expect(b).toContain("batch.commit()");
    /* ⚠️ AND IT MUST NOT DELETE OUTSIDE THE BATCH. A stray `deleteDoc` here would reintroduce the
       half-applied state the batch exists to make impossible. */
    expect(b, "a delete outside the batch").not.toContain("deleteDoc(");
  });

  it("it resolves EITHER store's id, because its two callers hold different ones", () => {
    const b = body("removeActivityEverywhere");
    /* deleteActivity holds a FEED id; undoQueryStatus holds a SUBCOLLECTION one. A primitive taking
       only one of them would delete nothing for the other on exactly the divergent rows it is for. */
    expect(b).toMatch(/queries",\s*queryId,\s*"activity",\s*id/);
    expect(b).toMatch(/"activities",\s*id/);
  });
});

describe("⚠️ every primitive routes through it", () => {
  it.each(["undoQueryStatus", "deleteActivity"])("%s removes through the primitive", (fn) => {
    expect(body(fn)).toContain("removeActivityEverywhere(");
  });

  /**
   * ⚠️ BOTH HALVES. An assertion that the primitive is CALLED passes on a function that also still
   * deletes a store by hand beside it — which is how the old shape would survive a repair.
   */
  it("undoQueryStatus no longer deletes a store by hand", () => {
    const b = body("undoQueryStatus");
    expect(b, "a hand-written delete survives beside the primitive").not.toContain("deleteDoc(");
  });

  it("deleteActivity's only hand-written delete is the feed-only case", () => {
    const b = body("deleteActivity");
    const hand = [...b.matchAll(/deleteDoc\(/g)].length;
    /* exactly one: an activity with no queryId has no authoritative twin to pair with */
    expect(hand, "more than the one feed-only delete").toBe(1);
    expect(b).toMatch(/!target\?\.queryId/);
  });

  it("editActivity patches both stores in one batch, or neither", () => {
    const b = body("editActivity");
    expect(b).toContain("writeBatch(db)");
    expect(b).toContain("batch.commit()");
    expect(b, "a lone updateDoc survives beside the batch").not.toContain("await updateDoc(");
  });

  it("moveActivity resolves the feed twin rather than assuming the id", () => {
    const b = body("moveActivity");
    expect(b).toContain("batch.commit()");
    /* it must LOOK for a divergent twin, not take the id on faith */
    expect(b).toMatch(/feedSnap\s*=\s*await getDoc\(feedRef\)/);
  });
});

describe("⚠️ the root cause: one id, both stores", () => {
  /**
   * ⚠️ THIS IS THE FAULT UNDER ALL THREE. `recordMaterialsSent` minted an AUTO-GENERATED id for the
   * subcollection and a separate `act-<random>` for the feed, so the same event lived under two ids
   * and nothing could pair them — which is why each caller had grown a heuristic. Every other writer
   * in the file already used one id for both.
   */
  it("recordMaterialsSent writes both stores under one id", () => {
    const b = body("recordMaterialsSent");
    expect(b, "the subcollection ref is auto-generated again")
      .not.toMatch(/doc\(collection\(db, "users", currentUser\.id, "queries", queryId, "activity"\)\)/);
    expect(b).toMatch(/"activity",\s*actId/);
    expect(b).toMatch(/"activities",\s*actId/);
  });

  /**
   * ⚠️ AND NO WRITER MAY MINT A SUBCOLLECTION ID FROM `doc(collection(...))` AGAIN. That call is what
   * produces an id the feed cannot know, and it is the single construction that caused this whole
   * family. Stated over the WHOLE file rather than one function, because the next writer will be a
   * new function.
   */
  it("no writer anywhere mints an auto-id for a query's activity log", () => {
    const hits = [...DB.matchAll(/doc\(collection\(db, "users", [^)]*"activity"\)\)/g)].map((m) => m[0]);
    expect(hits, "an auto-generated activity id is back: " + hits.join(" | ")).toEqual([]);
  });
});
