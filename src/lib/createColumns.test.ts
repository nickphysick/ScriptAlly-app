/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · COLUMN NAMES + the manuscript's home (ref design-refs/qdb-create-polish2.html §2).
 *
 * "When you sent it" holds send facts only. The manuscript moved to "What you sent" — it belongs
 * with the materials it went out with, not with the date. And the Journal column is called Notes
 * in BOTH modes, because the same data under two names is how two names start disagreeing.
 */
import { describe, it, expect } from "vitest";
import { STEP_TITLE } from "./createSteps";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const pane = read("../components/queries/QueryCreatePane.tsx");
const queries = read("../components/Queries.tsx");

/**
 * One step's body, sliced out of the BODIES map.
 *
 * ⚠️ ANCHOR BEFORE YOU SLICE (house rule). A missing marker here would yield "" and make every
 * `.not.toContain` below pass while testing nothing, so every caller asserts both ends exist.
 */
const body = (id: string, next: string): string => {
  const a = pane.indexOf(`    ${id}: () => (`);
  const b = pane.indexOf(`    ${next}: () => (`);
  expect(a, `the ${id} body is missing from BODIES`).toBeGreaterThan(-1);
  expect(b, `the ${next} body is missing from BODIES`).toBeGreaterThan(a);
  return pane.slice(a, b);
};

/* ⚠️ THE COLUMNS ARE NOW A STACK, and the stack is now FOUR steps. Three side-by-side cards
   became three sections met one at a time, and then choosing the agent — previously a stage
   before them — became the first of four. What this suite proved survives as facts about the
   BODIES, so the arguments it settled are not lost:

   · The named three are When you sent it · What you sent · Notes. Still true — single-sourced in
     STEP_TITLE, and now joined by the agent's own head rather than a stage's loose heading.
   · The manuscript sits with the MATERIALS it went out with, not with the send facts. Still
     true, and structural: it is inside the "what" body.

   What did NOT survive is everything about a GRID: the flexing columns, their min-height:0, and
   the per-column internal scroll. A stack has one column and the page scrolls; there is no
   fallback overflow to assert. */
describe("the sections keep the columns' vocabulary and their split", () => {
  it("named from one source, not typed into four heads", () => {
    expect(STEP_TITLE.agent).toBe("Who are you querying?");
    expect(STEP_TITLE.when).toBe("When you sent it");
    expect(STEP_TITLE.what).toBe("What you sent");
    expect(STEP_TITLE.notes).toBe("Notes");
    expect(pane, "the heads must render from the shared vocabulary").toContain("{STEP_TITLE[id]}");
  });

  it("the manuscript stayed with the materials, not with the send facts", () => {
    const what = body("what", "notes");
    expect(what, "the manuscript left the section it belongs to").toContain("Manuscript");
    expect(what, "both manuscript states came with it").toContain("onlyManuscript");
  });

  it("and the send facts did not follow it", () => {
    const when = body("when", "what");
    expect(when).toContain("Date sent");
    expect(when).toContain("Sent by");
    expect(when, "the manuscript came back to the send facts").not.toContain(">Manuscript<");
  });

  /* ⚠️ THE PICKER LEFT THE STAGE AND TOOK NOTHING WITH IT. The agent body holds the typeahead and
     the quick picks and nothing else — if a send fact or a material ever appears in it, the step
     has stopped being "who", which is the whole basis of the four-step split. */
  it("and the agent step asks only who", () => {
    const who = body("agent", "when");
    expect(who).toContain("<AgentSearchField");
    expect(who).toContain("qc-qp-in");
    expect(who, "a send fact wandered into the agent step").not.toContain("Date sent");
    expect(who, "a material wandered into the agent step").not.toContain("qc-mat");
  });
});


describe("one name for one thing, across modes", () => {
  it("the reading pane's column is Notes too", () => {
    expect(queries).toContain("<span>Notes</span>");
    expect(queries, "the reading pane still says Journal").not.toContain("<span>Journal</span>");
  });

  it("Tracking is left alone — it shows the activity timeline, not send facts", () => {
    expect(queries).toContain("<span>Tracking</span>");
  });
});
