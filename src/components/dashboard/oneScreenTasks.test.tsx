/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the to-do panel (dashboard redesign, Phase 5).
 *
 * ⚠️ THE THREE-WAY DERIVATION THIS FILE USED TO TEST IS DELETED, NOT ORPHANED. `taskTrio`,
 * `kindWord`, `yourTasksToday` and `dueWord` were the panel's own split — `buildOverToYouRows` +
 * `buildHousekeepingRows` + a dated-user-task filter, on the MEMBER unit, while the rail badge
 * beside it counted CARDS. A sweep with comments stripped found zero references to all four
 * outside this file before they went; `buildOverToYouRows`/`buildHousekeepingRows` themselves are
 * still live (the attention chip, `DeskTodoCard`) and are untouched.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import React from "react";
import { readFileSync } from "node:fs";
import { cssRule, cssRuleCount } from "../../test/cssRule";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../types";
import { OneScreenTasks } from "./OneScreenTasks";
import { CATEGORIES, CATEGORY_FAMILY, CATEGORY_LABEL, taskCategory } from "../../lib/todoCategory";
import { TASK_TYPES } from "../../lib/todoActions";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
/* the shared ANCHORED reader — see src/test/cssRule.ts for the substring fault it closes */
const rule = (sel: string) => cssRule(cssRules, sel, "oneScreen.css");

const panel = readFileSync(resolve(__dirname, "./OneScreenTasks.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/* ══ THE MIGRATION ═══════════════════════════════════════════════════════════════════════════ */

describe("the panel reads the To-do page's categories and derives none of its own", () => {
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

  /* ⚠️ NO SECOND OPINION IN THE PANEL. A local branch on `taskType` here would be a derivation that
     cannot fail the way `taskCategory`'s `never` guard does. */
  it("⚠️ the panel contains no category derivation of its own", () => {
    expect(panel).toContain('from "../../lib/todoCategory"');
    expect(panel).toContain("taskCategory(");
    for (const forbidden of ["buildOverToYouRows", "buildHousekeepingRows", "yourTasksToday", "taskTrio", "kindWord"]) {
      expect(panel, `${forbidden} is back in the panel`).not.toContain(forbidden);
    }
    /* the counting law: the same call every Tasks page and the rail badge make */
    expect(panel).toContain("assembleBoardColumns");
  });

  /* ⚠️ URGENT IS A LENS, NOT A BAND — a task whose clock starts would otherwise change category as
     time passed, and the rule would redraw itself overnight. */
  it("urgent is applied to a ticket and is never one of the bands", () => {
    expect(panel).toContain("isUrgentCard(");
    expect(panel).toContain("RULE_ORDER");
    const order = /const RULE_ORDER[^=]*=\s*\[([^\]]*)\]/.exec(panel)?.[1] ?? "";
    expect(order, "the rule order must be declared").not.toBe("");
    expect(order).not.toContain("urgent");
    for (const c of CATEGORIES) expect(order, `${c} is missing from the rule`).toContain(`"${c}"`);
  });

  /**
   * ⚠️ THE ORDER IS NOT THE DECLARATION'S ORDER, AND THAT IS PHASE 5's WHOLE COLOUR ANSWER. Five
   * categories, three family papers: `req`+`nudge` share "now" and `quiet`+`house` share "house",
   * so the two pairs must sit ADJACENT or the rule shows two identical colours with a stranger
   * between them.
   */
  it("⚠️ categories sharing a family paper are adjacent in the rule", () => {
    const order = (/const RULE_ORDER[^=]*=\s*\[([^\]]*)\]/.exec(panel)?.[1] ?? "")
      .split(",").map((x) => x.trim().replace(/"/g, "")).filter(Boolean);
    expect(order.length).toBe(CATEGORIES.length);
    const fams = order.map((c) => CATEGORY_FAMILY[c as never]);
    /* every family occupies ONE contiguous run — the property, not a pinned sequence, so a
       legitimate re-ordering within a family passes and a split does not */
    for (const f of new Set(fams)) {
      const first = fams.indexOf(f), last = fams.lastIndexOf(f);
      expect(fams.slice(first, last + 1).every((x) => x === f), `${f} is split across the rule`).toBe(true);
    }
  });
});

describe("the rendered panel", () => {
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

  it("states its name, a badge and one route to the page", () => {
    const h = html();
    expect(h).toContain("To-do list");
    expect(h).toContain("os-tbadge");
    expect(h).toContain("See all");
  });

  /* ⚠️ THE BADGE AND THE TICKETS ARE ONE SET. At rest the badge is the open total; the fault it
     forecloses is a badge stating a number the visible tickets contradict.
     ⚠️ AND AT REST IT IS THE NUMBER ALONE (refdiff pass, Phase 6) — "0 open" restated the card's
     own name in the card's own header. The word returns under a filter, where the figure is a
     SUBSET and nothing else on the card says which; that reading is asserted below. */
  it("an empty board states nothing needs you, and the badge agrees", () => {
    const h = html();
    expect(h).toContain("Nothing needs you today.");
    expect(h).toContain("<b>0</b>");
    expect(h).not.toContain("open</span>");
    expect(h).not.toMatch(/<b>0<\/b>\s*open/);
  });

  it("day one explains where tasks come from and offers the two first moves", () => {
    const h = html({ dayOne: true });
    expect(h).toContain("Tasks appear here as your queries progress.");
    expect(h).toContain("Add your manuscript");
    expect(h).toContain("Add an agent");
    /* ⚠️ AND THE RULE IS ABSENT ON DAY ONE — five bands of nothing is a shape promising data that
       does not exist, which is the fault the community tile's own header already records. */
    expect(h).not.toContain("os-rule");
  });

  /* ⚠️ THE DRAWER IS THE To-do PAGE'S PANE, BY IMPORT — not a reduced form of it. */
  /* ⚠️ THE DRAWER IS ITS OWN MODULE AND THE PANEL LOADS IT LAZILY, WHICH IS NOT AN OPTIMISATION.
     `useTaskCommit` reaches `lib/db` → `lib/firebase`, which initialises the SDK at module load;
     a static import from the panel put `auth/invalid-api-key` into ELEVEN dashboard suites and they
     stopped COLLECTING — a failure that reads as "no tests found" rather than as a red. Asserted so
     nobody flattens it back to a static import and rediscovers that the hard way. */
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
    expect(drawer).toMatch(/width=\{580\}/);
  });

  /* ⚠️ THE TICKET IS THE SHARED COMPONENT, SNIPPED — never a look-alike. */
  it("⚠️ the tickets are TaskTicket, snipped, with two tints from two derivations", () => {
    expect(panel).toContain('from "../todo/TaskTicket"');
    expect(panel).toContain("snipped");
    /* the EDGE is the query's state; the TAG is the card's family. They come from different
       functions and must never swap — the ticket's own head note states the same law. */
    expect(panel).toContain("STATE_TOKEN[stateFor(c.status)]");
    const ticket = readFileSync(resolve(__dirname, "../todo/TaskTicket.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(ticket).toContain("CATEGORY_FAMILY[cat]");
    expect(ticket).not.toContain("CATEGORY_FAMILY[stateFor");
  });
});

describe("the panel's stylesheet", () => {
  /* ⚠️ THE LEGEND IS AN OVERLAY — asserted here as `position: absolute`, and measured on a rendered
     page as "the tickets' boxes do not move". The declaration is what makes it possible; only the
     measurement proves it happened. */
  it("⚠️ the legend is positioned OVER the tickets, never in the flow", () => {
    const lg = rule(".os-legend");
    expect(lg).toContain("position: absolute");
    expect(lg).toContain("z-index");
    expect(rule(".os-rulezone")).toContain("position: relative");
  });

  /* ⚠️ RETARGETED BY A MEASUREMENT. The bands were 9px and the ROW grew to 12 on hover — and the row
     is in FLOW, so P5.3 caught every ticket moving down by exactly 3. The row now reserves 12px
     always and the BANDS grow inside it, which is what "the thicken happens inside space that is
     already there" was supposed to mean. Asserted where the heights now live. */
  /* ⚠️ RETARGETED, AND THE LAW IT GUARDS IS UNCHANGED (v26, Phase 7). v26 states the rule as ONE
     object — 12px, pill radius, a single hairline, full card width, growing to 15px on hover — so
     the old mechanism (a 12px row holding 9px bands that thickened inside it) cannot express it:
     that gives a 12px ROW and a 9px RULE, where the ref's resting rule IS 12.
     ⚠️ WHAT MUST NOT CHANGE IS THAT NOTHING BELOW MOVES, which is the fault P5.3 measured — every
     ticket dropping by 3px on hover. The ref does not solve it: it raises `.sbar.thin` to 15 and
     its zone grows by 3. Here the ink grows and the FLOW height does not, via a negative block
     margin of exactly half the growth. That is the claim, and it is what this case asserts now. */
  it("the rule is 12px and grows to 15 without moving anything below it", () => {
    expect(rule(".os-rule")).toContain("height: 12px");
    expect(rule(".os-rule")).toContain("border-radius: 99px");
    /* the grown state, and the margin that pays for it */
    const grown = /\.os-rulezone:hover \.os-rule[^{]*\{([^}]*)\}/.exec(cssRules);
    expect(grown, "the rule must have a grown state").not.toBeNull();
    expect(grown![1]).toContain("height: 15px");
    expect(grown![1], "the growth must be paid for, or the tickets move")
      .toMatch(/margin-block:\s*-1\.5px/);
    /* ⚠️ AND NO LAYOUT TRANSITION. Animating height or margin puts the whole card through layout on
       every frame of a hover; the ref transitions filter, flex-basis and transform and lets the
       height snap. The sheet's own motion lock forbids it too — this states the reason. */
    expect(rule(".os-rule")).not.toMatch(/transition:[^;]*(height|margin)/);
    /* the separator belongs to the band, and the last one has none */
    expect(rule(".os-rb")).toContain("border-right: 2px solid");
    expect(rule(".os-rb:last-child")).toContain("border-right: 0");
  });

  /**
   * ⚠️ THE FAMILY PAPERS RESOLVE FOR EVERY TICKET, NOT JUST THIS GRID'S.
   *
   * They were declared only on `.tpn` — the task pane — and `TaskTicket` renders outside a pane on
   * both surfaces that mount it, so the tag's `var()` resolved to nothing and painted transparent.
   * This grid then carried a private copy, which fixed the dashboard and left `/todo` broken: 28
   * tickets measured with a computed `rgba(0, 0, 0, 0)` behind a label whose only job is to be a
   * coloured paper. A page-scoped workaround is worse than the bug it patches, because it removes
   * the symptom from the page someone is looking at.
   *
   * ⚠️ SO THE CLAIM IS ABOUT THE DECLARATION'S SCOPE, AND BOTH HALVES MATTER: the tokens are at
   * `:root` in the ticket's own sheet, and this grid does NOT restate them — a copy here would
   * silently make the hoist untestable from this page again.
   */
  it("⚠️ the family papers are declared at :root, and this grid does not restate them", () => {
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
    /* and the grid's own copy is gone */
    expect(rule(".os-tkgrid")).not.toContain("--u-now-1");
  });

  /* ⚠️ A MINIMUM, NOT A COUNT (ref v16, Phase 6) — `repeat(auto-fill, minmax(288px, 1fr))`, stepping
     to 240 at the ref's own 1700 breakpoint. A fixed `repeat(3, …)` states how many tickets fit
     rather than how narrow one may be, so at any width where three 288s do not fit it makes them
     narrower than the design allows instead of dropping to two. Both regimes are asserted, and the
     COUNT form is forbidden so it cannot come back as a tidy-up. */
  it("the ticket grid states a minimum width, never a column count", () => {
    const g = rule(".os-tkgrid");
    expect(g).toContain("repeat(auto-fill, minmax(288px, 1fr))");
    expect(cssRules).toMatch(/max-width:\s*1699px[\s\S]{0,200}?\.os-tkgrid\s*\{[^}]*minmax\(240px/);
    expect(g).not.toMatch(/repeat\(\d/);
    expect(g).toContain("align-content: start");
    /* ⚠️ THE SCROLL IS `EdgeFadeScroll`'s, SET INLINE — the shared fade computes "is there more
       above / below" itself and owns the overflow, so a `.os-tbody { overflow }` rule here would be
       a second mechanism. Asserted at the mount instead of in the sheet. */
    expect(panel).toContain("<EdgeFadeScroll");
    expect(panel).toContain('scrollClassName="os-tbody"');
  });

  /* ⚠️ THE ROW MARKUP IS RETIRED, RULE AND ELEMENT TOGETHER — thirteen classes, swept for
     renderers with comments stripped before any of them went. */
  it("⚠️ no rule survives for the retired row markup", () => {
    for (const dead of ["os-trow", "os-knd", "os-tt", "os-tn", "os-tm2", "os-endcell",
      "os-stp", "os-act", "os-dots", "os-trio", "os-p", "os-pdot", "os-none"]) {
      expect(cssRuleCount(cssRules, `.${dead}`), `.${dead} still has a rule`).toBe(0);
    }
  });
});

describe("the pink band (app-shell-v2)", () => {
  /* ⚠️ PINK IS THE RULE, NOT THE PREFERENCE: sage heads a dashboard container, PINK marks the
     surface asking something of you — and this is the one that does. Swapping them would make
     the to-do card read like any other panel. */
  it("⚠️ the tasks header carries no fill and no hairline — but keeps its ink", () => {
    /* ⚠️ RETARGETED (dashboard redesign, Phase 2). The pink band is GONE; the header sits on the
       card. Pink was reserved for the surface that WANTS something, against sage for a container,
       and the ink is where that distinction survives the fill's removal. `background` is absent
       rather than `transparent` — the shorthand resets every longhand. */
    const block = cssRule(cssRules, ".os-th2", "oneScreen.css");
    expect(block).not.toContain("linear-gradient");
    expect(block).not.toContain("border-bottom");
    expect(block).not.toContain("background");
    expect(cssRule(cssRules, ".os-th2 h2", "oneScreen.css")).toContain("color: #2a1f18");
  });

  /* the band is edge-to-edge, so the card has to clip or it overhangs the radius */
  it("the card clips its band", () => {
    expect(rule(".os-tasks")).toContain("overflow: hidden");
  });

  /* ⚠️ RETARGETED (polish P7), not deleted. This pinned three WHITE pills — the state where the
     trio read as three separate objects, told apart only by their text colour. They now share one
     faint pastille-blue fill and the DOT carries the kind, which is the job it always had. The
     dots' own hues are unchanged, and that half of the lock stands. */
  /* ⚠️ THE TRIO IS RETIRED (Phase 5) — the three count pills were the panel's own three-way split
     rendered as chips, and the split is gone. The badge states one figure and the rule states the
     five categories beneath it, which is the same information without a second vocabulary for it. */
  it("the count trio is retired — one badge states the figure now", () => {
    expect(cssRuleCount(cssRules, ".os-p")).toBe(0);
    expect(cssRuleCount(cssRules, ".os-trio")).toBe(0);
    expect(cssRuleCount(cssRules, ".os-tbadge")).toBe(1);
  });
});

/**
 * ⚠️ THE ROW STYLESHEET IS RETIRED WITH THE ROW (dashboard redesign, Phase 5). This describe held
 * five cases about `.os-trow`'s fixed grid, its absolute-in-one-cell crossfade, its 20px kind pill,
 * its touch behaviour and its ≤640 stack. All five were true and none has a subject: the panel
 * renders `TaskTicket` now. They are replaced by the ONE claim that outlives them — that the rules
 * went with the markup, because a retired rule left in a sheet is how a deleted layout comes back.
 */
describe("§5 · the row stylesheet is retired with the row", () => {
  it("⚠️ no rule survives for any of the thirteen retired row classes", () => {
    for (const dead of ["os-trow", "os-knd", "os-tt", "os-tn", "os-tm2", "os-endcell",
      "os-stp", "os-act", "os-dots", "os-trio", "os-p", "os-pdot", "os-none"]) {
      expect(cssRuleCount(cssRules, `.${dead}`), `.${dead} still has a rule`).toBe(0);
    }
  });

  /* ⚠️ AND NOTHING RENDERS THEM EITHER — the other half of the sweep, because a rule and its
     element are retired together or one of them comes back looking for the other. */
  it("⚠️ and no component emits them", () => {
    for (const dead of ["os-trow", "os-knd", "os-endcell", "os-stp", "os-dots", "os-trio", "os-pdot"]) {
      expect(panel, `the panel still renders .${dead}`).not.toMatch(new RegExp(`["\`\\s]${dead}["\`\\s]`));
    }
  });
});

describe("the pastille is retired with the pill it dressed", () => {
  const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  /* the shared ANCHORED reader — `blk` was `indexOf(sel + " {")`, which matches inside any
     descendant selector ending in the same name. See src/test/cssRule.ts. */
  const blk = (sel: string) => cssRule(bare, sel, "oneScreen.css");

  it("the four values are declared once, as tokens", () => {
    /* ⚠️ THE CENSUS INVERTS (dashboard redesign, Phase 3). It listed the four tokens and required
       them PRESENT, so a retune could not reach one surface and miss the other. The header pill was
       the only surface, and it is retired — which left four tokens declared and read by nothing. A
       `var()` with no definition is invisible; a DEFINITION with no reader is the orphan half of the
       same sweep, and it is what makes the next person think there is a pastille treatment here to
       match. */
    for (const t of ["--os-pastille-bg", "--os-pastille-line", "--os-pastille-ink", "--os-pastille-fig"]) {
      expect(bare, `${t} is declared and read by nothing`).not.toContain(t);
    }
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 3). The greeting's pills are gone with the row that
     held them, so the rule this pinned has no subject. What replaces it is the retirement itself:
     nothing may declare or read the pastille, because there is no longer a pill to wear it. */
  it("⚠️ the header pill is RETIRED — no rule, and no token behind it", () => {
    expect(cssRuleCount(bare, ".os-pill")).toBe(0);
    expect(cssRuleCount(bare, ".os-pills")).toBe(0);
    expect(bare).not.toContain("var(--os-pastille");
  });

  /* ⚠️ THE TRIO'S HALF OF THE LAW IS THE HALF THAT SURVIVES, and it is the one worth keeping: the
     trio is WHITE and must not go tinted. It never read the pastille — its own case said so — and
     there is now none to read, so the claim is stated against the literals as well as the token. */
  /* ⚠️ RETARGETED AGAIN, ONE PHASE LATER, AND THE SECOND MOVE MAKES THE FIRST ONE MOOT. Phase 3
     retired the header PILL and kept this as "the trio is white"; Phase 5 retired the TRIO itself
     with the panel's three-way split. Neither element exists, so the surviving claim is about the
     PAGE: no pastille anywhere, in any form. */
  it("the pastille is gone from the sheet entirely — no token, no literal, no reader", () => {
    expect(bare).not.toContain("--os-pastille");
    expect(bare).not.toContain("var(--os-pastille");
    for (const hex of ["#f4f7fa", "#dde6ee", "#4a5a6b", "#2c3f52"]) {
      expect(bare, `${hex} survived the pastille's retirement as a literal`).not.toContain(hex);
    }
  });
});
