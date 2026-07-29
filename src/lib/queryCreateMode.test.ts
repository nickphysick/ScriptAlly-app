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
  it("create mode owns the reading pane, and the draft row pins to the list", () => {
    expect(queries).toContain("createDraft ? (");
    expect(queries).toContain("<QueryCreatePane");
    expect(queries).toContain("f12-draft");
  });

  it("the draft row renders OUTSIDE the filtered map — a draft matches no filter", () => {
    // It is emitted before sortedList.map, inside the rows container.
    const rows = queries.indexOf('className="f12-rows" role="listbox"');
    const draft = queries.indexOf("f12-drafttag", rows);
    const map = queries.indexOf("sortedList.map", rows);
    expect(rows).toBeGreaterThan(-1);
    expect(draft).toBeGreaterThan(rows);
    expect(draft, "the draft row fell inside the filtered list").toBeLessThan(map);
  });

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
  it("Save is the soft-pink house primary; there is no dark-pill CTA", () => {
    expect(pane).toContain("f12-btn-pri");
    expect(pane).not.toContain("#3a2d1f");
  });

  it("the segmented control selects with an inset ink ring and no per-segment borders", () => {
    expect(pane).toContain("inset 0 0 0 1.5px var(--ink)");
  });

  it("the picker and the unit physics are REUSED, never rebuilt", () => {
    expect(pane).toContain("AgentSearchField");
    expect(pane).toContain("snapToUnit");
    expect(pane).toContain("stepAmount");
  });
});
