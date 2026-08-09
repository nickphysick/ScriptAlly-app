/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub v4 · PHASE 2 locks — inline query creation replaces the Log-a-query POPUP
 * (ref design-refs/create-mode-ref.html).
 *
 * The behaviour that matters and that jsdom can't drive: nothing is written before Save, the
 * draft row shows regardless of the active filters, and every one of the app's "Log query"
 * launch points still reaches creation — because the migration happened at the SINGLE
 * interception they all funnel through, not at fourteen call sites.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const app = read("../App.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");
const css = read("../components/shell/f12.css");

/** One CSS rule body, anchored at a line start so a compound selector can't match instead. */
const block = (selector: string): string => {
  const at = css.indexOf("\n" + selector + " {");
  if (at < 0) return "";
  return css.slice(at, css.indexOf("}", at) + 1);
};

describe("the popup is retired", () => {
  it("LogQueryFocusForm is deleted and imported by nothing", () => {
    expect(existsSync(new URL("../components/LogQueryFocusForm.tsx", import.meta.url))).toBe(false);
    expect(app).not.toContain("LogQueryFocusForm");
    expect(app).not.toContain("isLogQueryOpen");
  });

  it("the DEAD second inline modal is gone from Queries.tsx (state, handler and markup)", () => {
    for (const trace of ["showLogModal", "handleLogQuerySubmit", "logMsId", "logAgId", "logPkgId"]) {
      expect(queries, `${trace} survived the migration`).not.toContain(trace);
    }
  });

  it("the popup's manuscript preselect SURVIVES — a one-book library still opens ready to save", () => {
    expect(queries).toContain("resolveInitialManuscriptId");
  });
});

describe("every launch point still reaches creation", () => {
  it("the interception keeps BOTH legacy sub-page strings, so no call site had to change", () => {
    expect(app).toContain('subPageName === "Log a query" || subPageName === "Send a query"');
  });

  it("it now seeds the hub and navigates there (the popup opened in place)", () => {
    expect(app).toContain("setCreateQuerySeed(");
    expect(app).toContain('navigate(pathFor("queries"))');
    expect(app).toContain("createSeed={createQuerySeed}");
  });

  it("the agent / manuscript seams are preserved through the seed", () => {
    expect(app).toContain("agentId: opts?.agentId ?? null");
    expect(app).toContain("manuscriptId: opts?.manuscriptId ?? null");
  });
});

describe("the draft is LOCAL until Save", () => {
  /* ⚠️ AMENDED (v3): the draft row is gone. It pinned to the top of the list so the thing you
     were making had a place in the thing you were making it for — but the list is now HIDDEN
     while creating, so the row had nowhere to pin and nothing to be seen against. */
  it("create mode owns the reading pane, and nothing is left in the list", () => {
    expect(queries).toContain("createDraft ? (");
    expect(queries).toContain("<QueryCreatePane");
    expect(queries, "the draft row outlived the list it pinned to").not.toContain("f12-draft");
  });

  /* ⚠️ RETIRED WITH THE ROW (v3). It asserted the draft was emitted BEFORE the filtered map, so
     no active filter could hide the thing you were currently making — a real trap, and the right
     fix while the row existed. The list is hidden in create mode now, so nothing can hide it
     because nothing renders it. The lesson survives for anything else added to that container:
     a filter applies to records, and a draft is not one yet. */

  it("the pane writes nothing itself — no db CALLS live in the create component", () => {
    // Match invocation, not prose: the file's header legitimately names the addQuery path it feeds.
    for (const write of ["addQuery(", "updateQuery(", "addJournalEntry(", "useScriptAllyDb("]) {
      expect(pane, `${write} leaked into the create pane — the parent owns the single write`).not.toContain(write);
    }
  });

  it("Save goes through the EXISTING creation path, and only then the journal", () => {
    expect(queries).toContain("addQuery(draftToPayload(");
    expect(queries).toContain("if (createDraft.journal.trim()) await addJournalEntry(");
  });

  it("leaving is silent when untouched and confirms when dirty", () => {
    expect(queries).toContain("draftDirty(createDraft, createBase)");
    expect(queries).toContain('title: "Discard this query?"');
  });
});

describe("the create pane follows the live idiom, not the ref's espresso", () => {
  /* Save MOVED to the command bar with the takeover (see createCommandBar.test.ts) — so the
     treatment is asserted where the button now lives, not where it used to. */
  /* The primary moved from the command bar to the illustrated header (create mode v2 P3), so
     the gap between the class and the label grew — the button now carries a disabled gate and
     an icon between them. The treatment is what this asserts, and that is unchanged. */
  it("Save is the soft-pink house primary; there is no dark-pill CTA", () => {
    expect(queries, "the Save primary lost its house treatment").toMatch(/f12-btn-pri"[\s\S]{0,600}Save query/);
    expect(pane, "the pane must not grow a second Save").not.toContain("f12-btn-pri");
    expect(pane).not.toContain("#3a2d1f");
    expect(queries).not.toContain("#3a2d1f");
  });

  /* SUPERSEDED (corrections round 2, ref qdb-create-fixes2 option A): the inset ink RING is gone.
     It framed the active segment inside the container, which overflowed the frame and knocked the
     label off-centre. The track is now recessed and the active segment is raised out of it. The
     "no per-segment borders" half of the old lock survives — that was never the problem. */
  it("the segmented control is an inset track, not a ringed segment", () => {
    expect(pane, "the ink ring came back").not.toContain("inset 0 0 0 1.5px var(--ink)");
    expect(pane).toContain('className="qc-seg"');
    // Anchor every slice before reading it: a missing rule yields "" and every `.not.toContain`
    // on an empty string passes, which is a green test that checked nothing.
    const seg = block(".qc-seg");
    const segBtn = block(".qc-seg button");
    const segOn = block(".qc-seg button.on");
    expect(seg, "the .qc-seg rule is missing").not.toBe("");
    expect(segBtn, "the .qc-seg button rule is missing").not.toBe("");
    expect(segOn, "the .qc-seg button.on rule is missing").not.toBe("");
    expect(seg, "the track must be recessed — a white track is not an inset track").toContain("background: var(--oat)");
    expect(seg, "height matches the Date sent field so the two-up row sits level").toContain("height: 42px");
    expect(segBtn, "a per-segment border would misalign the row again").toContain("border: none");
    expect(segOn, "the active segment is a raised white pill").toContain("background: var(--panel)");
  });

  it("the picker and the unit physics are REUSED, never rebuilt", () => {
    expect(pane).toContain("AgentSearchField");
    expect(pane).toContain("snapToUnit");
    expect(pane).toContain("stepAmount");
  });
});
