/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PANEL, FINAL — what SURVIVES the shell follow-up (P3): the parchment panel itself retired
 * with the hardback spine (the v2 shell draws the chrome), and its two control surfaces — the
 * CHIP BENCH (P2) and the BLUE PRO STICKER (P3, option 5) — relocated to the page body. These
 * locks pin the survivors: the bench card + chips grammar, the selection model, the sticker's
 * card language and its assistant-preview wiring. The page is auth-gated (jsdom mounts
 * nothing); pixels are Nick's in-browser checklist.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const shellCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
const pageCss = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const promo = readFileSync(join(here, "AssistantPromo.tsx"), "utf8");

/** Read a single CSS rule body by exact selector (first match). */
const ruleIn = (css: string) => (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};
const shell = ruleIn(shellCss);

/* ⚠️ "the filter chips — bare on the control line" IS RETIRED (corrections fix 3). The strip was
   the LISTS facets' stand-in while the To-do list page had no side container. It has one now, so
   the strip was a second narrowing surface for the same facts — which is how the two came to
   disagree on the live page. The side container's rows are the one narrowing. */

describe("the ASSISTANT BAND — the page's closing note (briefing-slot P2)", () => {
  it("the component keeps its copy and its gate — it is unmounted from the page, not deleted", () => {
    /* ⚠️ UNMOUNTED FROM THE TO-DO LIST (fix pack, 10 Aug): a placement decision. What this case
       protects is the COMPONENT, which is untouched; its seat on this page is gone because it was
       taking height from a scroll zone that was already too short — and because its counts are in
       the wrong unit (see assistantPromo.test.ts). */
    expect(page).not.toContain("<AssistantBand");
    const band = promo.slice(promo.indexOf("export const AssistantBand"), promo.indexOf("export const AssistantModal"));
    expect(band).toContain("{hkCount} of your {totalCount} tasks could run in the background whilst you write.");
    expect(band).toContain("onClick={onPreview}>Meet the assistant");
  });

  it("the BLUE STICKER returns, wide, at the foot — and it is the app's only one", () => {
    const r = ruleIn(pageCss)(".tdb-asst");
    expect(r).toContain("box-shadow: 4px 4px 0 #c2cfda");
    expect(r).toContain("border: 1.5px solid #3a1c14");
    expect((pageCss.match(/#c2cfda/g) ?? []).length).toBe(1);
    expect(page).not.toContain("ProStrip");
  });
});

/* ⚠️ AMENDED (corrections fix 3) — the header changed on purpose, so its lock changes with it. */
describe("the To-do PAGE HEADER — it names the page, and carries ONE action", () => {
  /* tasks-pages P1: the header block is TasksPageLayout's; the page's tools live in renderTools.
     The slice spans the layout mount through the tools so title + controls stay covered. */
  const hero = page.slice(page.indexOf("<TasksPageLayout"), page.indexOf("function renderHero"));

  it("titles itself 'To-do list' — the same words as the breadcrumb", () => {
    /* "What's on your desk?" named nothing and disagreed with the crumb, which reads "To-do
       list". A page whose title and crumb differ makes you check which one is lying. */
    expect(hero).toContain('title="To-do list"');
    expect(hero).not.toContain("What’s on your desk?");
    /* ⚠️ THE ONE LINE IS THE STAT CHIPS NOW (tasks-consolidation P2, 9 Aug) — same facts, same
       `boardCols`, one statement rather than two. The eyebrow above the title is the Dashboard's
       grammar arriving with the consolidation. */
    expect(hero).toContain("eyebrow={tasksEyebrow(");
    expect(page).toContain("taskStats(boardCols,");
  });

  it("its actions are a TOOL ROW now (board+dock P1) — pink Add, ghost session launcher", () => {
    /* The two-action array became `actionsSlot`: two instruments (a search field, a sort
       dropdown) beside two buttons. The max-two law is about actions competing for attention;
       collapsing instruments into "actions" to satisfy a count would read its letter against
       its purpose. */
    expect(hero).toContain("tools={renderTools()}"); // the layout's tool row is the one instrument home
    expect(hero).toContain('className="tdb-addb"');  // pink — creation
    // board fixes II P3: the ghost session launcher is retired — the dock's doors replaced it
    expect(hero).not.toContain('className="tdb-ghb"');
    expect(hero).toContain("tdb-sortb");
    expect(hero).not.toContain("Last week in review"); // one thing, one door
  });
});
