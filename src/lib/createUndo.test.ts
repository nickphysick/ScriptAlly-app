/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE RECEIPT'S UNDO (fix pack 5 §3, ref 82-create-exits.html).
 *
 * ⚠️ UNDOING A CREATE DELETES THE RECORDS THE CREATE MADE. It never appends a compensating one —
 * that is the repo's standing undo law, and it is the difference between a query that never
 * happened and a query with a cancellation stapled to it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const db = read("./db.tsx");

/** `undoCreate`'s body. Both ends anchored (house rule). */
const undoBody = (): string => {
  const a = queries.indexOf("const undoCreate = async (id: string, wasBatch: boolean) => {");
  expect(a, "undoCreate is missing").toBeGreaterThan(-1);
  const b = queries.indexOf("\n  };", a);
  expect(b, "undoCreate never closes").toBeGreaterThan(a);
  return queries.slice(a, b);
};

describe("it deletes, it does not compensate", () => {
  it("the undo removes the query through the existing cascade", () => {
    const body = undoBody();
    expect(body).not.toBe("");
    expect(body).toContain("await deleteQuery(id);");
  });

  /* ⚠️ NEVER A COMPENSATING RECORD. An undo that writes "query withdrawn" leaves a history saying
     something happened, when the whole claim of the undo is that nothing did. */
  it("and writes nothing in its place", () => {
    const body = undoBody();
    for (const w of ["addQuery", "addActivity", "updateQueryStatus", "logNudge", "recordResponse"]) {
      expect(body, `${w} would leave a trace of a query that never happened`).not.toContain(w);
    }
  });

  /* The seeded QUERY_SENT is written to BOTH the per-query subcollection and the global feed, so an
     undo that reached only one of them would leave the dashboard timeline reporting a send with no
     query behind it. `deleteQuery` is the door that covers both — asserted against db.tsx so this
     stays true if that cascade is ever narrowed. */
  it("the cascade it leans on covers the global feed as well as the subcollection", () => {
    const a = db.indexOf("const deleteQuery = async (queryId: string) => {");
    expect(a, "deleteQuery is missing").toBeGreaterThan(-1);
    const b = db.indexOf("\n  };", a);
    expect(b).toBeGreaterThan(a);
    const cascade = db.slice(a, b);
    expect(cascade, "the per-query activity subcollection").toContain('"activity"');
    expect(cascade, "and the global-feed twins").toContain("activityIdsForQueries(activities, [queryId])");
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ JOURNAL ENTRIES ARE NOT IN THAT CASCADE. They live in a TOP-LEVEL `journalEntries` collection
   keyed by queryId, so `deleteQuery` cannot see them — a create carrying an opening note would
   leave the note behind, attached to a query that no longer exists.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the note the create wrote goes with it", () => {
  it("journal entries for that query are removed too", () => {
    const body = undoBody();
    expect(body).toContain("journalEntriesRef.current.filter((e) => e.queryId === id)");
    expect(body).toContain("await deleteJournalEntry(j.id);");
  });

  /* They must go FIRST, while the query is still there to identify them by — and because
     `deleteQuery` is the irreversible half. */
  it("before the query itself", () => {
    const body = undoBody();
    expect(body.indexOf("deleteJournalEntry")).toBeLessThan(body.indexOf("await deleteQuery(id)"));
  });

  /* ⚠️ READ FRESH, NOT CAPTURED. The receipt's closure is built during the write, when the entry it
     needs has not yet come back from the listener. A captured array would be empty exactly when it
     mattered. */
  it("read through a ref, so the closure does not hold a list from before the write", () => {
    expect(queries).toContain("const journalEntriesRef = useRef(journalEntries);");
    expect(queries).toContain("journalEntriesRef.current = journalEntries;");
    expect(undoBody(), "a captured array is empty at exactly the wrong moment")
      .not.toMatch(/journalEntries\.filter/);
  });

  /* ⚠️ THE GAP IS A PROPERTY OF `deleteQuery` ITSELF, so the Delete button orphans journal entries
     too. That is not fixed here — it belongs in db.tsx, which another stream is holding — and it is
     recorded in the report rather than guarded by a test asserting the comment above says so.
     Locking prose is the thing CLAUDE.md warns against: the constraint worth a warning comment is
     worth a test, and the test is the one above, which checks the entries actually go. */
});

describe("the undo names the query it was made for", () => {
  /* ⚠️ BOUND AT THE WRITE. Reading the id back off the draft when the button is pressed would undo
     whatever is being drafted NOW — which, after "Save & log another", is a different query. */
  it("the id is bound at the write, not read at the press", () => {
    expect(queries).toContain("undo: () => undoCreate(newId, logAnother),");
    expect(undoBody(), "the draft must not be consulted at undo time").not.toContain("createDraft");
  });

  it("the receipt carries it on both save paths, because there is one receipt call", () => {
    const a = queries.indexOf("const saveCreate = async");
    const b = queries.indexOf("if (!pendingSave) return;", a);
    expect(b).toBeGreaterThan(a);
    const save = queries.slice(a, b);
    expect(save.split("showToast({").length - 1).toBe(1);
    expect(save).toContain("undo: () => undoCreate(");
  });
});

describe("what is on screen is unwound too", () => {
  /* The reading pane resolves its record from the selected id; a selection pointing at a deleted
     query is a pane with nothing behind it. */
  it("the selection, the landed row and the grace row all release that id", () => {
    const body = undoBody();
    expect(body).toContain("setSelectedQueryId((cur) => (cur === id ? null : cur));");
    expect(body).toContain("setLandedId((cur) => (cur === id ? null : cur));");
    expect(body).toContain("setGraceRow((cur) => (cur?.id === id ? null : cur));");
  });

  /* ⚠️ CONDITIONALLY. Clearing unconditionally would throw away a selection the writer had moved
     to something else in the six seconds the receipt was up. */
  it("and only that id — a selection moved elsewhere is left alone", () => {
    const body = undoBody();
    expect(body, "an unconditional clear discards a selection the writer chose")
      .not.toContain("setSelectedQueryId(null);");
  });

  it("it happens before the delete lands", () => {
    const body = undoBody();
    expect(body.indexOf("setSelectedQueryId")).toBeLessThan(body.indexOf("await deleteQuery(id)"));
  });
});

describe("the tally uncounts it", () => {
  /* The sitting must not report work that is no longer there. Only the batch path counted, so only
     the batch path uncounts. */
  it("the tally left with the takeover — undo no longer uncounts a session figure", () => {
    /* RETARGETED (§4, log-sheet run): `sessionLogged` was the takeover's sitting tally and went
       with it; the drawer's form has no session counter to uncount. The law that SURVIVES is the
       one the rest of this file holds — undo deletes through the cascade and writes nothing. */
    expect(undoBody()).not.toContain("setSessionLogged");
  });

  it("and a plain save's undo leaves it alone, because it never counted", () => {
    /* `wasBatch` is `logAnother` — the same flag that decides whether the tally moved at all. */
    expect(queries).toContain("undo: () => undoCreate(newId, logAnother),");
  });
});
