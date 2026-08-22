/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode · THE RE-ENTRY GUARD (ref design-refs/qdb-create-polish.html).
 *
 * The bug was destructive, not cosmetic: a second openCreate() re-ran nine setState calls over a
 * draft you were typing, including `setStashedSelection(selectedQueryId)` — which by then was
 * already null, so the query to restore on discard was lost too. Every "Log query" in the app
 * funnels through that one function, which is why the fix belongs there, not at fourteen sites.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const queries = read("../components/Queries.tsx");
const app = read("../App.tsx");

/** openCreate's body, up to the close of its arrow function's first block. */
const openCreateBody = (): string => {
  const at = queries.indexOf("const openCreate = (seed:");
  return at < 0 ? "" : queries.slice(at, queries.indexOf("\n  };", at));
};

describe("re-entry is a no-op, from every entry point", () => {
  it("openCreate returns early when a draft is already open", () => {
    const body = openCreateBody();
    expect(body, "openCreate not found — this whole file is anchored on it").not.toBe("");
    const guard = body.slice(0, body.indexOf("const seedAgent"));
    expect(guard, "the guard must precede ALL state writes, or it guards nothing").toContain("if (creating) {");
    expect(guard).toContain("return;");
  });

  it("nothing is re-initialised — the draft, its baseline and the stash all survive", () => {
    const body = openCreateBody();
    const guardEnd = body.indexOf("return;");
    // setDraftIn dropped from this list with the draft row (v3) — the state no longer exists.
    for (const write of ["setCreateDraft", "setCreateBase", "setStashedSelection", "setSelectedQueryId"]) {
      expect(body.indexOf(write), `${write} runs before the guard`).toBeGreaterThan(guardEnd);
    }
  });

  it("the no-op speaks, so the button never reads as dead", () => {
    expect(openCreateBody()).toContain(`showToast({ message: "You're already logging a query" })`);
  });

  it("a SEEDED re-entry is guarded too — every launch point arrives through the same door", () => {
    // App's interception is the single funnel: rail capture, dashboard, agent cards, manuscript
    // plates and Discover all set a seed, and the seed effect calls openCreate.
    expect(app).toContain("setCreateQuerySeed({ agentId: opts?.agentId ?? null, manuscriptId: opts?.manuscriptId ?? null })");
    expect(queries).toContain("openCreate(createSeed);");
    // the seed is still consumed, or a stale seed would sit in App forever
    expect(queries).toContain("onCreateSeedConsumed?.();");
  });

  it("the masthead CTA greys out while drafting — both header variants", () => {
    /* ⚠️ ONE MASTHEAD CTA LEFT (§2). `Log query` was in both header variants and is now the
       TOOLBAR's button, over the column it adds to — so the populated variant has no CTA to grey,
       and only the empty branch's survives. The clause is unchanged: a re-entry point that is
       already drafting says so rather than looking live and doing nothing, which is now asserted
       on the toolbar's button as well. */
    /* ⚠️ ZERO NOW, NOT ONE (in-flow masthead, step 1). The one occurrence was the MASTHEAD's
       `Log query` action — the empty branch's re-entry point, disabled while a draft was open. The
       masthead holds no actions at all, and that button was a duplicate of the welcome pane's
       `Log your first query` rather than a control that needed rehoming. What the clause protects
       is unchanged and is asserted on the survivor below: a re-entry point that is already drafting
       says so rather than looking live and doing nothing. */
    expect(queries.match(/disabled: creating,/g)?.length ?? 0).toBe(0);
    expect(queries, "the toolbar's Log button stays live while a draft is open")
      .toMatch(/className="qc-btn qc-logq"[\s\S]{0,40}disabled=\{creating\}/);
  });
});

describe("a first-run draft actually renders", () => {
  /* Found during this pass: create mode lives in the populated branch, so with zero queries
     "Log your first query" set a draft that nothing displayed. */
  it("the empty branch yields to create mode", () => {
    /* ⚠️ THE CONDITION, NOT ITS POSITION IN THE CHAIN. This pinned the opening brace too, so §3
       putting the load skeleton AHEAD of the empty branch turned it red — a change that leaves the
       claim ("the empty branch yields to create mode") exactly as true. */
    expect(queries).toContain("queries.length === 0 && !creating ? (");
  });

  it("an empty list during a first-run draft isn't blamed on filters", () => {
    expect(queries).toContain("{sortedList.length === 0 && queries.length > 0 && (");
  });
});
