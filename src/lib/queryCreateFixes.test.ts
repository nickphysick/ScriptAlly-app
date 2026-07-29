/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub · create-mode FIXES (ref design-refs/qdb-create-fixes.html).
 *
 * The one that matters most is the first: there is NO query-count limit on the free tier, and a
 * regression here silently blocks saving for exactly the users least likely to report it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const db = read("../lib/db.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");
const picker = read("../components/AgentSearchField.tsx");
const queries = read("../components/Queries.tsx");
const css = read("../components/shell/f12.css");
const rules = read("../../firestore.rules");

describe("there is NO query-count limit on the free tier", () => {
  it("addQuery gates on nothing but a session", () => {
    expect(db, "a query-count gate came back").not.toMatch(/queries\.length\s*>=?\s*\d/);
    expect(db).not.toContain("Free tier limit is 10 queries");
  });

  it("no constant, no rule and no UI encodes one", () => {
    expect(db).not.toMatch(/FREE_QUERY_LIMIT|MAX_FREE_QUERIES/);
    // `queries.length > 0` is legitimate throughout (auto-select, response rate, header actions);
    // a `>=` against a number is the shape a gate takes.
    expect(queries, "a query-count gate appeared on the page").not.toMatch(/queries\.length\s*>=\s*\d/);
    // Firestore can't count documents in a rule, and nothing tries to.
    expect(rules).not.toMatch(/queries.*size\(\)\s*[<>]/);
  });

  it("the OTHER free-tier limits are deliberately left alone (different rules, out of scope)", () => {
    expect(db, "the 1-manuscript limit was removed without being asked for").toContain("manuscripts.length >= 1");
    expect(db, "the 5-agent limit was removed without being asked for").toContain("agents.length >= 5");
  });

  it("genuine Pro gating is untouched — packages still require Pro", () => {
    expect(db).toContain("Custom Submission Packages & A/B Tracking are premium features");
  });
});

describe("the agent hero", () => {
  it("offers a Change affordance once an agent is chosen", () => {
    expect(pane).toContain('className="qc-change"');
    expect(css).toContain(".qc-change {");
  });

  it("changing agent RE-DERIVES what was seeded from the old one", () => {
    // Clearing the id alone would strand the previous agent's materials pre-fill on the draft.
    expect(pane).toContain("set({ agentId: null, materials: materialRowsForDraft(null) })");
  });
});

describe("the agent picker", () => {
  it("has no group-by-rating toggle — it means nothing when picking one agent", () => {
    expect(picker, "the toggle's state came back").not.toContain("groupByRating");
    // (the file's header still explains WHY it went — that's documentation, not the control)
    expect(picker, "the toggle's markup came back").not.toContain("sa-ag-toggle");
  });

  it("keeps the search and the add-an-agent route", () => {
    expect(picker).toContain('className="sa-ag"');
    expect(picker, "the add-an-agent route went with it").toContain("sa-ag-addlink");
  });
});

describe("the send column", () => {
  it("date and method share one row, so the nudge field is above the fold", () => {
    expect(pane).toMatch(/display: "flex", gap: 12, marginBottom: 15[\s\S]{0,400}Date sent/);
  });

  it("every field in the column is the same height", () => {
    // The segmented control's 42px moved into .qc-seg when it became an inset track (round 2),
    // so the guarantee now spans both files — same number, two homes.
    expect(pane.match(/minHeight: 42/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(css, "the segmented track drifted off the field height").toMatch(/\.qc-seg \{[^}]*height: 42px/);
  });
});

describe("the manuscript field has two states, and neither is a native select", () => {
  it("a native <select> is gone — it rendered the off-brand macOS system menu", () => {
    // Scoped to the manuscript field: the sample-unit control in "What you sent" is still a
    // native select — same off-brand system menu, but a different field and out of scope here
    // (flagged in the report).
    const msField = pane.slice(pane.indexOf("<div style={LABEL}>Manuscript</div>"), pane.indexOf("Date sent"));
    expect(msField, "the manuscript field is back on a native select").not.toContain("<select");
    expect(msField).toContain("F12Menu");
    expect(pane, "the placeholder option is retired in both states").not.toContain("Choose a manuscript…");
  });

  it("one manuscript → a locked read-out that says why", () => {
    expect(pane).toContain("Only manuscript");
    expect(pane).toContain("const onlyManuscript = manuscripts.length === 1");
  });

  it("several → the app's OWN custom menu, not a new one", () => {
    expect(pane).toContain("F12Menu");
    expect(pane).toContain("useFixedMenu");
  });
});

describe("the draft row's tag is not clipped", () => {
  it("it sits in flow above the row content, inside the row's padding", () => {
    expect(queries).toContain('className="f12-draftbody"');
    expect(queries).toContain('className="f12-draftmain"');
    expect(css).toContain(".f12-drafttag { position: static;");
  });

  it("the row owns padding and lays its parts out in a column", () => {
    expect(css).toContain(".f12-draft { display: block; padding: 11px 13px; }");
    expect(css).toContain(".f12-draftbody { display: flex; flex-direction: column; }");
  });
});
