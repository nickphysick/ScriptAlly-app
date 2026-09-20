/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the to-do card (dashboard redesign Phase 5; rebuilt for v16, 18 Sep).
 *
 * ⚠️ THE TICKET GRID, THE CATEGORY RULE AND ITS LEGEND ARE RETIRED. The card is a list of rows in a
 * scroller with a pinned foot; the rule was a filter over a grid, and a filter that changes what
 * "All 18" means two lines above it is a second reading of the card's own count. Everything those
 * locks guarded that still has a subject is carried here, and what does not is asserted ABSENT —
 * rule and element together, so nothing dormant is left for the next reader to reattach.
 *
 * ⚠️ `taskCategory`'s EXHAUSTIVENESS LOCK STAYS, AND THIS IS ITS ONLY HOME. The card no longer reads
 * it; the To-do page does, and a sweep found no other suite that covers it. Retiring it with the
 * grid would have retired the guard on a live derivation because the surface that happened to test
 * it changed shape — which is exactly the way coverage disappears in a rebuild.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { existsSync, readFileSync } from "node:fs";
import { cssRule, cssRuleCount } from "../../test/cssRule";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { OneScreenTasks } from "./OneScreenTasks";
import { CATEGORIES, CATEGORY_FAMILY, CATEGORY_LABEL, taskCategory } from "../../lib/todoCategory";
import { TASK_TYPES } from "../../lib/todoActions";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
/* the shared ANCHORED reader — see src/test/cssRule.ts for the substring fault it closes */
const rule = (sel: string) => cssRule(cssRules, sel, "oneScreen.css");

const here = __dirname;
/* ⚠️ COMMENTS STRIPPED BEFORE ANYTHING IS ASSERTED — this repo's prose names every class it has
   ever retired, so a raw read reports an obituary as a live reference. */
const read = (f: string) => readFileSync(resolve(here, f), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const panel = read("OneScreenTasks.tsx");

/* ══ THE DERIVATIONS ═════════════════════════════════════════════════════════════════════════ */

describe("the categories the To-do page reads", () => {
  /**
   * ⚠️ A TABLE OVER THE WHOLE UNION, NOT A SAMPLE. `taskCategory` closes with the house `never`
   * idiom, so a thirteenth task type cannot compile until it says where it belongs — this asserts
   * the same property from the outside, over every declared type, so a `default` branch quietly
   * replacing the guard would be caught even though it would still compile.
   */
  it("⚠️ every declared task type maps to exactly one of the five categories", () => {
    expect(TASK_TYPES.length).toBeGreaterThan(8);
    for (const t of TASK_TYPES) {
      const c = taskCategory({ key: `k-${t}`, title: "x", taskType: t } as any);
      expect(CATEGORIES, `${t} landed outside the five`).toContain(c);
    }
    /* and the five are exhaustively named and papered — a category with no label or no family
       would render an empty band nobody could identify */
    for (const c of CATEGORIES) {
      expect(CATEGORY_LABEL[c], `${c} has no label`).toBeTruthy();
      expect(CATEGORY_FAMILY[c], `${c} has no family paper`).toBeTruthy();
    }
  });
});

describe("the card derives nothing about a task", () => {
  /* ⚠️ THE COUNTING LAW: the same call the rail badge and every Tasks page make. A local count here
     is the two-numbers-both-called-To-do fault arriving one surface along. */
  it("⚠️ the board is `assembleBoardColumns`', and the rows are one shared derivation", () => {
    expect(panel).toContain("assembleBoardColumns");
    expect(panel).toContain('from "../../lib/dashTodo"');
    expect(panel).toContain("todoRows(");
    expect(panel).toContain("moreWaiting(");
    /* the row's own facts come from the accessors the To-do page's list uses */
    expect(panel).toContain("listRowInputs(");
    for (const forbidden of ["buildOverToYouRows", "buildHousekeepingRows", "yourTasksToday", "taskTrio", "kindWord"]) {
      expect(panel, `${forbidden} is back in the card`).not.toContain(forbidden);
    }
  });

  /* ⚠️ URGENT IS A LENS, NOT A BAND — a task whose clock starts would otherwise change category as
     time passed, and a rule drawn from categories would redraw itself overnight. The rule is gone;
     the lens survives, and it is the one thing on the row that reads a clock. */
  it("urgent is `isUrgentCard`, applied to a row, and the retired rule is not rebuilt here", () => {
    expect(panel).toContain("isUrgentCard(");
    expect(panel, "the retired category rule is back").not.toContain("RULE_ORDER");
    expect(panel).not.toContain("taskCategory(");
  });

  /**
   * ⚠️ THE STATUS GLYPH IS `StatusDot` AND ONLY `StatusDot` — the house law. The ink tile that used to
   * carry it is retired with the row's redraw; the state now travels in the shared `StatePill`, which
   * renders the canonical glyph itself and states the stone "no status" pill where a card is not
   * about a query. So the law is kept by DELEGATION, and this asserts the delegation rather than a
   * second copy of the glyph — the failure it forecloses is this card hand-drawing a status again.
   */
  /* ⚠️ RETARGETED (to-do row round): the markup moved into `TodoRowCard`, so the claim is asserted
     where the pill is now rendered. The LAW is unchanged — a query status has one drawing, and this
     card delegates to it rather than keeping a second. */
  it("⚠️ a status is drawn by StatusDot — here, through the shared pill", () => {
    const row = read("TodoRowCard.tsx");
    expect(row).toContain("<StatePill");
    /* and NOT redrawn: no glyph of its own, no tile scoping the dot's tokens to a dark ground */
    expect(row, "the card must not redraw a status of its own").not.toContain("<StatusDot");
    expect(panel).not.toMatch(/["\s`]os-tdico["\s`]/);
    expect(cssRuleCount(cssRules, ".os-tdico")).toBe(0);
    /* a row with no query passes `status: null`, which is the pill's own stone branch */
    expect(row).toContain("row.status");
  });
});

/* ══ THE RENDERED CARD ═══════════════════════════════════════════════════════════════════════ */

describe("the rendered card", () => {
  const base = {
    loading: false,
    tasks: [] as any[], queries: [] as any[], agents: [] as any[], manuscripts: [] as any[],
    userTasks: [] as any[], activities: [] as any[], taskFlags: [] as any[],
    currentUser: { id: "u", name: "N" } as any,
    now: new Date(2026, 7, 6, 15, 0, 0),
    onSeeAll: () => {}, onNavigate: () => {},
  };
  const html = (over: Record<string, unknown> = {}) =>
    renderToStaticMarkup(<OneScreenTasks {...base} {...over} />);

  /* ⚠️ v33 — NO SUB-HEADING UNDER ANY TITLE. The eyebrow ("Where the ball is with you") is retired;
     the title and its chip sit in the navy band, inside the frame. */
  it("states its name in the navy band, with a chip and one route to the page — and no eyebrow", () => {
    const h = html();
    /* the four band tones are retired: every card's band is the one navy */
    expect(h).toMatch(/class="os-card os-lift os-todo"/);
    expect(h).not.toContain("os-tone--");
    expect(h).toContain('<h3 class="os-cardttl" data-probe-text="todo-title">To-do list</h3>');
    expect(h).not.toContain("Where the ball is with you");
    expect(h).not.toMatch(/["\s]os-sub["\s]/);
    expect(h).toContain('data-probe="todo-badge"');
    expect(h).toContain("See all");
    /* the retired badge markup is gone with the band it sat in */
    expect(h).not.toContain("os-tbadge");
  });

  /* ⚠️ THE CHIP AND THE ROWS ARE ONE SET. The chip is the open total; the fault it forecloses is a
     chip stating a number the visible rows contradict. */
  it("an empty board states nothing needs you, and the chip agrees", () => {
    const h = html();
    expect(h).toContain("Nothing needs you today.");
    expect(h).toContain(">All 0</button>");
    expect(h).not.toContain('data-probe="todo-row"');
  });

  /* ⚠️ NEVER A NUMBER THAT MIGHT CHANGE (Nick) — the chip states its word and waits for its figure */
  it("⚠️ while loading the chip carries no figure — never a zero", () => {
    expect(html({ loading: true })).toContain(">All </button>");
  });

  it("day one explains where tasks come from and offers the two first moves", () => {
    const h = html({ dayOne: true });
    expect(h).toContain("Tasks appear here as your queries progress.");
    expect(h).toContain("Add your manuscript");
    expect(h).toContain("Add an agent");
    /* ⚠️ AND THE RETIRED RULE IS ABSENT — five bands of nothing is a shape promising data that does
       not exist, which is the fault the community tile's own header already records. */
    expect(h).not.toContain("os-rule");
  });

  /* ⚠️ THE FOOT IS THE CARD'S, AND IT SAYS NOTHING WHEN THERE IS NOTHING MORE. "0 more waiting" is
     a sentence about an absence; the link alone is the honest form. */
  it("the foot states only a real remainder, and always offers the page", () => {
    const h = html();
    expect(h).toContain('class="os-tdfoot"');
    expect(h).not.toContain("0 more waiting");
    expect(h).toContain("See all →");
  });

  /* ⚠️ THE DRAWER IS THE To-do PAGE'S PANE, BY IMPORT — not a reduced form of it. */
  /* ⚠️ AND THE PANEL LOADS IT LAZILY, WHICH IS NOT AN OPTIMISATION. `useTaskCommit` reaches
     `lib/db` → `lib/firebase`, which initialises the SDK at module load; a static import from the
     panel put `auth/invalid-api-key` into ELEVEN dashboard suites and they stopped COLLECTING — a
     failure that reads as "no tests found" rather than as a red. Asserted so nobody flattens it
     back to a static import and rediscovers that the hard way. */
  /**
   * ⚠️ RETARGETED, AND THE SUBJECT IS GONE RATHER THAN MOVED (to-do row round). These two cases
   * asserted that the dashboard's completion surface was the To-do page's own pane, mounted whole
   * and lazily. The pane is no longer opened from the dashboard at all — the row completes in
   * place — so what survives of the law is the half that still has a subject: **the dashboard and
   * the To-do page write the same records through the same function**. That is stronger than the
   * mount claim ever was, because it is about the write rather than about the component.
   */
  it("⚠️ the dashboard writes through `useTaskCommit`, exactly as the To-do page does", () => {
    const writer = read("DashTaskCommit.tsx");
    expect(writer).toContain('from "../todo/useTaskCommit"');
    expect(writer).toContain("useTaskCommit({");
    /* and it is the ONLY write path this card has — no second door */
    expect(panel, "the card must not write directly").not.toContain('from "../../lib/db"');
  });

  it("⚠️ the retired drawer is gone, rule and element", () => {
    expect(panel).not.toContain("DashTaskDrawer");
    expect(existsSync(resolve(here, "DashTaskDrawer.tsx")),
      "a replacement that is ADDED leaves the original reachable").toBe(false);
  });

});

/* ══ THE SHEET ═══════════════════════════════════════════════════════════════════════════════ */

describe("the card's stylesheet", () => {
  /* ⚠️ THREE COLUMNS, AND THE MIDDLE ONE IS THE ONLY ONE THAT GIVES. The tick and the day count are
     fixed, so a long task line wraps rather than squeezing the figure it is explaining.
     ⚠️ AND THE ROW ALIGNS TO ITS TOP, NOT ITS CENTRE: the sentence now carries a meta line beneath
     it, so a centred row would float the tick and the figure against a two-line middle column. */
  /* ⚠️ FIVE COLUMNS SINCE THE ROW BECAME A SLIM QUERY CARD (`todo-journeys.html`): the band, the
     tick, the avatar, the sentence and the figure. Only the sentence gives. */
  it("the row is a five-column grid: band, tick, avatar, sentence, count", () => {
    const r = rule(".os-tdrow");
    expect(r).toContain("grid-template-columns: var(--td-band) 22px 38px 1fr auto");
    expect(r).toContain("align-items: center");
    expect(rule(".os-tdbox")).toContain("width: 22px");
    expect(rule(".os-tdbox")).toContain("height: 22px");
    expect(rule(".os-tdav"), "the avatar is the card's own circle at row size").toContain("width: 38px");
    expect(rule(".os-tdt")).toContain("min-width: 0");
  });

  /* ⚠️ THE HAIRLINE SEPARATOR IS RETIRED WITH THE LIST LINE. Rows are cards now: each carries its
     own border on all four sides and they are separated by 8px of ground, so a shared top border
     would draw a second line against the card above it. */
  it("rows are separated by ground, not by a shared hairline", () => {
    const r = rule(".os-tdrow");
    expect(r).toContain("border: 1px solid var(--dash-hair)");
    expect(r).toContain("margin-bottom: 8px");
    expect(r).toContain("border-radius: var(--td-radius)");
    expect(cssRuleCount(cssRules, ".os-tdrow:first-of-type"),
      "the first-row carve-out went with the shared border").toBe(0);
  });

  /**
   * ⚠️ THE PROGRESS BAR IS RETIRED, RULE AND ELEMENT TOGETHER (20 Sep). The row states its age as a
   * figure; a bar beside that figure is the same fact drawn twice, and the fainter "guessed window"
   * treatment it carried has nowhere left to show. `replyWindow` survives in `dashTodo` because the
   * task panel's "reply expected" reads it — that is arithmetic, not a drawing.
   *
   * Asserted as an absence in BOTH directions, because a rule with no element and an element with no
   * rule are each silent, and this pass produced the opportunity for both.
   */
  it("⚠️ the progress bar is gone — no rule, no variant, no element", () => {
    for (const gone of [".os-tdbar", ".os-tdbar i", ".os-tdbar--guess"]) {
      expect(cssRuleCount(cssRules, gone), gone).toBe(0);
    }
    expect(panel).not.toMatch(/["\s`]os-tdbar(--guess)?["\s`]/);
  });

  /**
   * ⚠️ THE TICK IS THE ROW'S CONTROL AND IT IS A BUTTON, NOT A CHECKBOX INPUT. What it opens is the
   * task panel at that task — a tick that silently completed a send would record a fact the writer
   * never stated. The filled state is what a completion looks like AFTERWARDS.
   */
  it("the tick is a 22px control, and its filled state is ink with a cream mark", () => {
    const box = rule(".os-tdbox");
    expect(box).toContain("border-radius: 7px");
    expect(box).toContain("border: 1.5px solid rgba(28, 19, 15, 0.28)");
    expect(box).toContain("background: #ffffff");
    /* ⚠️ `--on`, NOT `--done` — the box is ON while a quiet row's menu is open and nothing has been
       written yet, so the class names the CONTROL's state rather than the task's. */
    expect(rule(".os-tdbox--on")).toContain("background: var(--dash-ink)");
    expect(read("TodoRowCard.tsx")).toContain('data-probe="todo-tick"');
  });

  /**
   * ⚠️ A COMPLETED ROW SAYS WHAT WAS LOGGED AND OFFERS THE WAY BACK. It stays on the card until the
   * card next refreshes: a row that vanishes the instant it is ticked gives the writer nothing to
   * check and nowhere to undo from.
   */
  it("a completed row strikes its sentence through and keeps its meta line legible", () => {
    expect(rule(".os-tdrow--done .os-tdtx")).toContain("text-decoration: line-through");
    /* ⚠️ THE STRIKE MUST NOT REACH THE META LINE — it is the receipt, and a struck receipt reads as
       though the undo were spent too. `text-decoration` inherits into descendants, so this is an
       explicit reversal rather than an omission. */
    expect(rule(".os-tdrow--done .os-tdl2")).toContain("text-decoration: none");
    expect(read("TodoRowCard.tsx")).toContain('data-probe="todo-undo"');
  });

  /* ⚠️ URGENT IS INK, NOT A SECOND PAPER — the row already carries a state on its tile, and a tinted
     row beside a tinted tile gives one fact two treatments. */
  it("an urgent row rusts its day count and nothing else", () => {
    expect(rule(".os-tdn--hot b")).toContain("color: var(--dash-rust)");
    expect(cssRuleCount(cssRules, ".os-tdrow--urgent")).toBe(0);
    expect(cssRuleCount(cssRules, ".os-tdrow--hot")).toBe(0);
  });

  /* ⚠️ THE FOOT IS PINNED WITH `margin: auto 0 0`, NOT POSITIONED — the card is a flex column, so
     the auto margin puts the foot on the card's bottom edge whatever the rows do, and it still
     sits in the flow where a short list ends. */
  it("the foot pins itself to the card's bottom and the rows scroll above it", () => {
    const f = rule(".os-tdfoot");
    expect(f).toContain("margin: auto 0 0");
    expect(f).toContain("border-top: 1px solid var(--dash-hair)");
    expect(f).toContain("flex: none");
    const scroll = rule(".os-scroll");
    expect(scroll).toMatch(/overflow-y:\s*auto/);
    expect(scroll).toContain("min-height: 0");
  });
});

/* ══ THE RETIREMENTS ═════════════════════════════════════════════════════════════════════════ */

describe("⚠️ the ticket grid and its furniture are retired, rule and element together", () => {
  /* a dormant rule is a second treatment waiting for the next reader to reattach it */
  it("no rule survives for the grid, the rule, the legend or the retired bands", () => {
    for (const sel of [".os-tkgrid", ".os-tbody", ".os-tbodywrap", ".os-rule", ".os-rulezone", ".os-rb",
                       ".os-legend", ".os-tbadge", ".os-th2", ".os-tasks", ".os-trio", ".os-p"]) {
      expect(cssRuleCount(cssRules, sel), `${sel} is still declared`).toBe(0);
    }
  });

  it("…and the card emits none of them", () => {
    for (const cls of ["os-tkgrid", "os-tbody", "os-rule", "os-rulezone", "os-legend", "os-tbadge", "os-th2"]) {
      expect(panel, `${cls} is still rendered`).not.toMatch(new RegExp(`["\\s\`]${cls}["\\s\`]`));
    }
    /* the shared ticket and the shared scroller went with the grid they were in */
    expect(panel).not.toContain('from "../todo/TaskTicket"');
    expect(panel).not.toContain("<EdgeFadeScroll");
  });

  /**
   * ⚠️ AND THE FAMILY PAPERS STAY AT `:root` IN THE TICKET'S OWN SHEET, which this card no longer
   * reads and must not start restating. They were once declared only on `.tpn` — the task pane — so
   * a `TaskTicket` rendered outside a pane painted its tag transparent, and the fix attempted here
   * was a private copy in this grid: it fixed the dashboard and left `/todo` broken, which is worse
   * than the bug, because it removes the symptom from the page someone is looking at.
   */
  it("⚠️ the family papers are declared at :root in the ticket's sheet, and not here", () => {
    const ticketCss = readFileSync(resolve(__dirname, "../todo/taskTicket.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const root = /(?:^|\n):root\s*\{([^}]*)\}/m.exec(ticketCss);
    expect(root, "taskTicket.css must declare the papers at :root").not.toBeNull();
    for (const t of ["--u-now-1", "--u-house-1", "--u-yours-1"]) {
      expect(root![1], `${t} must resolve for a ticket outside a pane`).toContain(t);
    }
    /* the values are the app tokens the PANE resolves to, never the ported hexes above them */
    expect(root![1]).toContain("var(--pink)");
    expect(root![1]).toContain("var(--sage-band)");
    expect(root![1]).toContain("var(--gold-t)");
    /* and the dashboard's sheet holds no copy of them */
    expect(cssRules, "the dashboard restates a ticket paper").not.toContain("--u-now-1");
  });
});
