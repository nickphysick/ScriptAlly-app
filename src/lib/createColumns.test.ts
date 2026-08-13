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
/* ⚠️ THE ANCHOR IS WIDENED, THE ASSERTIONS ARE NOT. The step-stack CHASSIS — the three
   treatments, the summary rows, the numbered head, the Back/Next footer, Enter-to-advance and the
   pulse — was extracted to `StepStack` so the response takeover wears the same rhythm rather than a
   copy of it. Create mode is now TWO files, and "the pane's source" honestly means both: every
   assertion below is unchanged and still fails if its subject disappears from wherever it lives. */
const pane = read("../components/queries/QueryCreatePane.tsx") + read("../components/queries/StepStack.tsx");
const queries = read("../components/Queries.tsx");

/** Everything between two column headings — the body of the first one. */
const column = (from: string, to: string): string => {
  const a = pane.indexOf(`<span>${from}</span>`);
  const b = pane.indexOf(`<span>${to}</span>`);
  return a < 0 || b < 0 || b < a ? "" : pane.slice(a, b);
};

/* ⚠️ THE COLUMNS ARE NOW A STACK (create mode v3). Three side-by-side cards became three
   sections met one at a time — same fields, same order, same manuscript placement. What this
   suite proved survives as facts about the SECTIONS, so the arguments it settled are not lost:

   · The three are named When you sent it · What you sent · Notes. Still true — and now
     single-sourced in STEP_TITLE rather than typed into three card heads.
   · The manuscript sits with the MATERIALS it went out with, not with the send facts. Still
     true, and now structural: it is inside the "what" section's body.

   What did NOT survive is everything about a GRID: the flexing columns, their min-height:0, and
   the per-column internal scroll. A stack has one column and the page scrolls; there is no
   fallback overflow to assert. */
describe("the three sections keep the columns' vocabulary and their split", () => {
  it("named from one source, not typed into three heads", () => {
    expect(STEP_TITLE.when).toBe("When you sent it");
    expect(STEP_TITLE.what).toBe("What you sent");
    expect(STEP_TITLE.notes).toBe("Notes");
    expect(pane, "the heads must render from the shared vocabulary").toContain("STEP_TITLE.when");
  });

  it("the manuscript stayed with the materials, not with the send facts", () => {
    /* ⚠️ RE-ANCHORED, NOT WEAKENED. The per-section `aria-labelledby` literals became one
       templated attribute in `StepStack`; the step BODIES still live here, in order, behind their
       descriptors. Slicing on those keeps the assertion pointed at exactly the same content. */
    const whatAt = pane.indexOf('id: "what",');
    const notesAt = pane.indexOf('id: "notes",');
    expect(whatAt, "the what section is missing").toBeGreaterThan(-1);
    expect(notesAt).toBeGreaterThan(whatAt);
    const what = pane.slice(whatAt, notesAt);
    expect(what, "the manuscript left the section it belongs to").toContain("Manuscript");
    expect(what, "both manuscript states came with it").toContain("onlyManuscript");
  });

  it("and the send facts did not follow it", () => {
    /* ⚠️ RE-ANCHORED, NOT WEAKENED — see above. */
    const whenAt = pane.indexOf('id: "when",');
    expect(whenAt, "the when step is missing").toBeGreaterThan(-1);
    const when = pane.slice(whenAt, pane.indexOf('id: "what",'));
    expect(when).toContain("Date sent");
    expect(when).toContain("Sent by");
    expect(when, "the manuscript came back to the send facts").not.toContain(">Manuscript<");
  });
});


describe("one name for one thing, across modes", () => {
  it("the reading pane's column is Notes too", () => {
    /* ⚠️ THE HEADER IS A COMPONENT NOW (Pack B §2). The three cards were three hand-rolled copies of
       one band, which is why their glyphs and titles could drift; `PaneCard` takes the title as a
       prop. The NAME is what this case is about and it is unchanged. */
    expect(queries).toContain('title="Notes"');
    expect(queries, "the reading pane still says Journal").not.toContain("<span>Journal</span>");
  });

  it("Tracking is left alone — it shows the activity timeline, not send facts", () => {
    expect(queries).toContain('title="Tracking"');
  });
});
