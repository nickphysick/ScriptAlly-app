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
import { readFileSync } from "node:fs";
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

const panel = readFileSync(resolve(__dirname, "./OneScreenTasks.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

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
   * ⚠️ THE STATUS GLYPH IS `StatusDot` AND ONLY `StatusDot` — the house law, and the ink tile is what
   * made it possible to keep: the tile scopes `--sd-hue`/`--sd-centre` to the page's cream, so the
   * canonical glyph renders on a dark ground rather than being redrawn by hand for one card.
   */
  it("⚠️ a status is drawn by StatusDot, and the tile tints it rather than replacing it", () => {
    expect(panel).toContain("<StatusDot");
    expect(panel).toContain("overrideSize={18}");
    const tile = rule(".os-tdico");
    expect(tile).toContain("--sd-hue: #f5f1eb");
    expect(tile).toContain("--sd-centre: transparent");
    /* a row with no query has no status to draw, and states that rather than inventing one */
    expect(panel).toContain("os-tdico--none");
    expect(rule(".os-tdico--none")).toContain("background: var(--dash-stone)");
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
     the title and its chip sit in the rose band, inside the frame. */
  it("states its name in the rose band, with a chip and one route to the page — and no eyebrow", () => {
    const h = html();
    expect(h).toMatch(/class="os-card os-lift os-todo os-tone--rose"/);
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
  it("⚠️ the drawer mounts TaskPane and its session, by import — and is loaded lazily", () => {
    expect(panel).toContain("React.lazy(");
    expect(panel).toContain('import("./DashTaskDrawer")');
    expect(panel, "a static import would drag Firebase into every dashboard suite")
      .not.toMatch(/^import .*DashTaskDrawer/m);
    const drawer = readFileSync(resolve(__dirname, "./DashTaskDrawer.tsx"), "utf8");
    expect(drawer).toContain('from "../todo/TaskPane"');
    expect(drawer).toContain('from "../todo/useTaskPaneSession"');
    expect(drawer).toContain('from "../shared/SlideOver"');
    expect(drawer).toContain("useTaskPaneSession(");
    expect(drawer).toContain("<TaskPane");
  });

  /**
   * ⚠️ ONE DRAWER ON THE PAGE, AND THE FEED ASKS THIS CARD TO OPEN IT. The feed is a sibling in
   * another column; its "Send it" link hands over a QUERY id, which is resolved HERE against the
   * live board — the only place that knows which card a query is currently raising. A second drawer
   * in the feed would be a second answer to what finishing a send involves.
   *
   * ⚠️ AND THE OPEN CARD IS RESOLVED FROM THE BOARD EVERY RENDER, never held as a copy: a card that
   * leaves the board while its drawer is open closes it, rather than stranding a pane over a task
   * that no longer exists.
   */
  it("⚠️ the drawer opens from two selectors and one board", () => {
    expect(panel).toContain("openForQueryId");
    expect(panel).toMatch(/live\.find\(\(c\) => c\.key === openKey\)/);
    expect(panel).toMatch(/live\.find\(\(c\) => c\.relatedRecordId === openForQueryId\)/);
    expect(panel).toContain("onOpenHandled");
  });
});

/* ══ THE SHEET ═══════════════════════════════════════════════════════════════════════════════ */

describe("the card's stylesheet", () => {
  /* ⚠️ THREE COLUMNS, AND THE MIDDLE ONE IS THE ONLY ONE THAT GIVES. The tile and the day count are
     fixed, so a long task line wraps rather than squeezing the figure it is explaining. */
  it("the row is a three-column grid: the tile, the sentence, the count", () => {
    const r = rule(".os-tdrow");
    expect(r).toContain("grid-template-columns: 44px 1fr auto");
    expect(r).toContain("align-items: center");
    expect(rule(".os-tdico")).toContain("width: 44px");
    expect(rule(".os-tdico")).toContain("height: 44px");
    expect(rule(".os-tdt")).toContain("min-width: 0");
  });

  /* ⚠️ THE SEPARATOR IS A TOP BORDER AND THE FIRST ROW HAS NONE — so the list opens against the
     header's own air rather than under a second hairline. */
  it("rows are separated by one hairline, and the first row carries none", () => {
    expect(rule(".os-tdrow")).toContain("border-top: 1px solid var(--dash-hair)");
    expect(rule(".os-tdrow:first-of-type")).toContain("border-top: 0");
  });

  /**
   * ⚠️ A GUESSED WINDOW IS DRAWN FAINTER, AND THAT IS THE POINT OF THE BAR (Nick, 18 Sep). The
   * fraction is days elapsed over the AGENT'S STATED reply window; where no window is stated the
   * app's default for that stage stands in, and the bar drops to 55% so a guess cannot be mistaken
   * for a fact. The distinction is the derivation's (`dashTodo.TodoBar.stated`) and this is the half
   * that makes it visible.
   */
  it("⚠️ the progress bar distinguishes a stated window from a guessed one", () => {
    const bar = rule(".os-tdbar");
    expect(bar).toContain("height: 6px");
    expect(bar).toContain("overflow: hidden");
    expect(rule(".os-tdbar i")).toContain("background: var(--dash-navy)");
    expect(rule(".os-tdbar--guess")).toContain("opacity: 0.55");
    expect(panel, "the component must render the guessed variant").toContain("os-tdbar--guess");
  });

  /* ⚠️ URGENT IS INK, NOT A SECOND PAPER — the row already carries a state on its tile, and a tinted
     row beside a tinted tile gives one fact two treatments. */
  it("an urgent row rusts its day count and nothing else", () => {
    expect(rule(".os-tdrow--urgent .os-tdn")).toContain("color: var(--dash-rust)");
    expect(cssRuleCount(cssRules, ".os-tdrow--urgent")).toBe(0);
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
