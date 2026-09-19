/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the one-screen dashboard's scaffold (spec §1, §2, §8; P2).
 * Whole-string assertions; CSS asserted against RULES with comments stripped (the tombstone trap).
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import React from "react";
import { readFileSync } from "node:fs";
import { cssRule, cssRuleCount, cssRules as cssRules_ } from "../../test/cssRule";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, UserPlan } from "../../types";
import { OneScreenDashboard } from "./OneScreenDashboard";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
/* ⚠️ THE SHARED ANCHORED READER. This helper used to be `indexOf(sel + " {")` — a SUBSTRING
   search, so `.os-actv {` matched inside `.os-colR .os-actv {` and every assertion about a base
   rule silently repointed at a descendant one. See `src/test/cssRule.ts`. */
const rule = (sel: string) => cssRule(cssRules, sel, "oneScreen.css");

const NOW = new Date(2026, 7, 6, 15, 0, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

/* ⚠️ `manuscriptId` IS PART OF THE FACTORY NOW, AND IT WAS ALWAYS MISSING (empty-states pack,
   Phase 1). `Query.manuscriptId` is a required string in `types.ts` AND in `firestore.rules`, so a
   query without one is not a value this system can produce — and `scopeQueries` filters strictly on
   it, so every fixture here reached the cards as an EMPTY scoped set. Two cases below were named for
   queries that never arrived ("a single point on the record" over a scoped record of zero points);
   they passed because the outcome they asserted happened to be the zero-scoped-query outcome. The
   id matches `base.activeManuscript`, so the fixtures now produce what their names claim. */
const q = (over: Record<string, unknown>) => ({ id: String(Math.random()), status: QueryStatus.QUERIED, manuscriptId: "m1", ...over }) as any;

const base = {
  queries: [q({ dateSent: daysAgo(30) }), q({ dateSent: daysAgo(2) })],
  agents: [{ id: "a1", name: "Sophie Dunn", agency: "Curtis Vane" }] as any[],
  manuscripts: [{ id: "m1", title: "Murphy's Day Out", genre: "Thriller", wordCount: 82400 }] as any[],
  tasks: [], userTasks: [], activities: [], taskFlags: [],
  currentUser: { id: "u", name: "Nick Physick", plan: UserPlan.FREE } as any,
  activeManuscript: { id: "m1", title: "Murphy's Day Out" } as any,
  onNavigate: () => {}, onTaskAction: () => {},
  updateUserProfile: async () => {},
  now: NOW,
};

const render = (over: Partial<typeof base> & { loading?: boolean } = {}) =>
  renderToStaticMarkup(<OneScreenDashboard loading={false} {...base} {...over} />);

/* ══ §1 · the page (dashboard stages 2–3, 17 Sep) ══
   ⚠️ THE ONE-SCREEN LOCK IS RETIRED, AND THIS BLOCK USED TO LOCK IT. Nick: "The page scrolls. Drop the
   one-screen lock." Its cases are rewritten rather than deleted: each lock's subject either moved (the
   bottom row's height, the phone stack) or became an absence worth holding (no page height, no
   releases, no fixed-viewport route). */
describe("§1 · the page", () => {
  const baseRules = cssRules.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");

  it("⚠️ the page states no height of its own — the window scrolls it", () => {
    for (const sel of [".os-root", ".os-content"]) {
      expect(rule(sel), sel).not.toMatch(/(^|[\s;])height:/);
      expect(rule(sel), sel).not.toMatch(/overflow(-y)?:\s*hidden/);
    }
    /* the wrapper has no rule of its own at all now — its focus rings select on it, nothing sizes it */
    expect(cssRuleCount(cssRules, ".sa-dashroot")).toBe(0);
    /* and nothing releases a lock that no longer exists */
    expect(cssRules).not.toContain("!important;\n  overflow: visible");
    expect(cssRules).not.toMatch(/height:\s*auto\s*!important/);
    expect(cssRules).not.toContain("@media (max-height: 680px)");
    /* ⚠️ NO 100vh ANYWHERE — the page's height is its content's; the shell's window does the rest */
    expect(baseRules).not.toContain("100vh");
    expect(baseRules).not.toContain("100dvh");
  });

  /**
   * ⚠️ THE STAGE LOCK STAYS DELETED; THE PORT MEASUREMENT IS NOT ONE (v16, 18 Sep).
   *
   * The lock sized the PAGE to the viewport and is what made it unscrollable. What v16 measures is
   * the scroller's own height, to give the second row the ref's `clamp(380px, calc(100vh - 560px),
   * 560px)` honestly — the viewport arithmetic is exactly what this page may not do, because it sits
   * under the beta strip, the top bar and the window's inset. So the observer is REQUIRED, and what
   * is asserted is the property that makes it safe: neither input depends on the row's own height,
   * so the measurement cannot feed itself.
   */
  it("⚠️ the stage lock stays deleted, and the port measurement cannot feed itself", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenDashboard.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const gone of ["useStageLock", "STAGE_SCROLL_ID", "lockH"]) {
      expect(src, gone).not.toContain(gone);
    }
    /* the two published values, and what they are read from */
    expect(src).toContain("--os-port-h");
    expect(src).toContain("--os-row2-top");
    expect(src).toContain("ResizeObserver");
    expect(src, "the port is the SCROLLER's box, never the window's").not.toContain("innerHeight");
    /* ⚠️ AND NEITHER IS READ OFF THE ROW — a row sized from its own box is a measurement loop */
    expect(src).not.toMatch(/row2Ref[^;]*getBoundingClientRect\(\)\.height/);
    expect(src).not.toMatch(/className="os-root"[^>]*style=\{\{[^}]*height/);
  });

  /* ⚠️ THE DASHBOARD'S OWN WRAPPER IS PART OF THE CHAIN — it carried `min-h-screen` (100vh) and `pb-16`
     from the era when this page scrolled, and broke the lock twice unnoticed. The page scrolls again,
     and those two stay gone: the page's foot is `.os-content`'s own padding. */
  it("⚠️ the Dashboard wrapper carries no min-h-screen and no bottom padding", () => {
    const src = readFileSync(resolve(__dirname, "../Dashboard.tsx"), "utf8");
    const cls = /className="(sa-dashroot[^"]*)"/.exec(src)?.[1] ?? "";
    expect(cls, "the sa-dashroot wrapper must exist").not.toBe("");
    expect(cls).not.toContain("min-h-screen");
    expect(cls).not.toContain("pb-16");
  });

  /* ⚠️ BOTH ROUTE DECLARATIONS ARE UNDONE TOGETHER. `layout="fill"` on the slot and `fit` on the work
     wrapper were the lock's two halves; a scrolling page wants neither, and a `fit` wrapper would clip it. */
  it("⚠️ the route is a flowing slot, and it is off the fixed-viewport list", () => {
    const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
    expect(app).toContain('<StagePage active={routeKey === "dashboard"}>');
    expect(app).not.toContain('<StagePage active={routeKey === "dashboard"} layout="fill">');
    const shellSrc = readFileSync(resolve(__dirname, "../shell/AppShell.tsx"), "utf8");
    const fit = /fit=\{([^}]*)\}/.exec(shellSrc)?.[1] ?? "";
    expect(fit, "the fit expression must exist").not.toBe("");
    expect(fit).not.toContain('"dashboard"');
  });

  /* ⚠️ THE PAGE MEASURE (Nick): the content is a centred block no wider than `--dash-page-max`, inset by
     `--dash-page-pad` — and the top bar pads itself with the same two tokens, so the two cannot disagree
     about where the columns are. Both are declared once, on the route's `.ws-main` — the column holding
     both readers, so the rail does not inherit them. The alignment itself is a
     measurement (`tests/e2e/dashStages.measure.ts`); this is the construction. */
  it("⚠️ the content is a centred block on the page measure, and the bar reads the same two tokens", () => {
    const c = rule(".os-content");
    expect(c).toContain("box-sizing: border-box");
    expect(c).toContain("max-width: calc(var(--dash-page-max) + 2 * var(--dash-page-pad))");
    expect(c).toContain("margin-inline: auto");
    /* the v34 mockup: the top padding is the shell's bar — the scroller runs up under it on this route */
    expect(c).toMatch(/padding:\s*var\(--dash-bar-h, 0px\) var\(--dash-page-pad\) \d+px/);
    expect(c).not.toContain("--work-max");
    const shellCss = readFileSync(resolve(__dirname, "../shell/workspaceShell.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(shellCss.match(/--dash-page-max:\s*\d+px/g) ?? []).toHaveLength(1);
    expect(shellCss).toContain(".dash-mode .ws-main { --dash-page-max: 1440px; --dash-page-pad: 22px; }");
    /* not on the shell's root, where the rail would inherit them (the rail gate diffs its whole style) */
    expect(shellCss).not.toMatch(/\.dash-mode \{[^}]*--dash-page/);
    const bar = /\.dash-mode \.ws-pagebar \{([^}]*)\}/.exec(shellCss)?.[1] ?? "";
    expect(bar, "the bar's measure rule must exist").not.toBe("");
    for (const t of ["var(--dash-page-max)", "var(--dash-page-pad)"]) {
      expect(bar, t).toContain(t);
    }
  });

  /* ⚠️ THREE ROWS, IN ONE BLOCK, IN THIS ORDER (v16) — and both bottom cards are INSIDE the block
     (Nick: pinned to the window's edge, the activity column opens a gap beside the content). */
  it("⚠️ the header, the three-card row, then the feed beside the to-do card", () => {
    const html = render();
    /* the content block is the root's last child when nothing is loading or touring, so it runs to the end */
    const start = html.indexOf('<div class="os-content" data-probe="main">');
    expect(start, "the content block must render").toBeGreaterThan(-1);
    const content = html.slice(start);
    const at = (needle: string) => {
      const i = content.indexOf(needle);
      expect(i, needle).toBeGreaterThan(-1);
      return i;
    };
    const order = [at('data-probe="hero"'), at('data-probe="row1"'), at('data-probe="row2"')];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const row1 = [at('data-probe="quick-actions"'), at('data-probe="chart-card"'), at('data-probe="closed-tile"')];
    expect([...row1].sort((a, b) => a - b)).toEqual(row1);
    expect(row1[0], "row one's cards must be inside row one").toBeGreaterThan(order[1]);
    expect(row1[2], "…and above the second row").toBeLessThan(order[2]);
    /* ⚠️ THE FEED LEADS THE SECOND ROW — the ref puts the wider card on the left, and the to-do
       card's foot is what aligns with it. */
    const row2 = [at('data-probe="activity-card"'), at('data-probe="todo-card")'.replace(")", ""))];
    expect(row2[0]).toBeGreaterThan(order[2]);
    expect(row2[1]).toBeGreaterThan(row2[0]);
    /* the retired grid and its two columns are gone from the markup entirely */
    for (const gone of ["os-colL", "os-colR", "os-grid", "os-bd"]) {
      expect(content, gone).not.toMatch(new RegExp(`class="([^"]* )?${gone}[" ]`));
    }
  });

  /**
   * ⚠️ ROW ONE'S TRACKS ARE THE REF'S, AND THE TWO FLEXIBLE ONES ARE `fr` WHILE THE THIRD IS NOT.
   * The closed tile is a fixed 320 because a donut does not get better at being wider; the quick
   * actions take a floor and a share, and the chart takes the rest. Equal card heights are the ROW's
   * — `align-items: stretch` — and never a stated height on a card, which is what lets the chart's
   * plot give when the quick actions' tiles do not.
   */
  /* ⚠️ v33 — THREE ELASTIC TRACKS, AND THE CHART IS ALWAYS THE WIDEST. The closed card's fixed 320px
     column is retired with its token: a fixed side column makes the chart absorb all of the squeeze,
     which is the fault the ref's own note records. What is asserted is the RELATION as well as the
     rule — the middle track has the largest floor and the largest share. */
  it("⚠️ the first row: three floors and three shares, the chart's the largest of each", () => {
    const r = rule(".os-row1");
    expect(r).toContain("grid-template-columns: minmax(228px, 0.78fr) minmax(340px, 2fr) minmax(296px, 1.12fr)");
    expect(r).toContain("gap: var(--dash-gap)");
    expect(r).toContain("align-items: stretch");
    /* the base declaration only — `rule()` joins every block for the selector, the ≤1279 step included */
    const decl = /grid-template-columns: ([^;]+);/.exec(r)![1];
    const tracks = [...decl.matchAll(/minmax\((\d+)px, ([\d.]+)fr\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(tracks.length).toBe(3);
    expect(tracks[1][0]).toBeGreaterThan(Math.max(tracks[0][0], tracks[2][0]));
    expect(tracks[1][1]).toBeGreaterThan(Math.max(tracks[0][1], tracks[2][1]));
    expect(cssRules, "the fixed closed column is back").not.toContain("--dash-row1-closed");
    /* ⚠️ THE SWEEP, NOT THREE NAMED RULES. Two of the three cards have no base rule at all — their
       look is `.os-card`'s and their own rules are descendants — so `cssRule` would fail on a sheet
       that is perfectly correct. The claim is that NOTHING in the sheet states a height on any of
       them, which is what "equal heights are the row's" means. */
    const rows = cssRules_(cssRules);
    for (const card of ["os-qa", "os-lead", "os-cl"]) {
      for (const r of rows.filter((x) => new RegExp(`\\.${card}(?![\\w-])`).test(x.sel))) {
        expect(r.body, `${r.sel} states a height — the row must own it`).not.toMatch(/(^|[\s;])height:/);
      }
    }
  });

  /**
   * ⚠️ THE ONE STATED HEIGHT ON THE PAGE, AND IT IS MEASURED FROM THE PAGE'S OWN SCROLL AREA. The
   * ref writes `clamp(380px, calc(100vh - 560px), 560px)`; this page does not start at the top of the
   * window, so `100vh` over-claims by the beta strip, the top bar and the window's inset — the house
   * stage law, and the 21px the Tasks chassis lost to exactly this arithmetic. Both cards keep their
   * own inner scroll inside it, so neither column's content can grow the row.
   */
  it("⚠️ the second row: the ref's clamp, measured from the scrollport", () => {
    const r = rule(".os-row2");
    expect(r).toContain("grid-template-columns: 1.4fr 1fr");
    expect(r).toContain("gap: var(--dash-gap)");
    expect(r).toContain("align-items: stretch");
    expect(r).toContain("margin-top: var(--dash-gap)");
    expect(r).toContain("height: var(--dash-row2-h)");
    const root = rule(".os-root");
    expect(root).toContain("--dash-row2-min: 380px");
    expect(root).toContain("--dash-row2-max: 560px");
    expect(root).toMatch(/--dash-row2-h:\s*clamp\(/);
    /* the clamp's middle term is the PORT's height less what is above the row — never the viewport */
    expect(root).toMatch(/calc\(var\(--os-port-h\) - var\(--os-row2-top\) - \d+px\)/);
    /* ⚠️ AND BOTH INPUTS OPEN AT A SENTINEL, so an unmeasured first frame yields the FLOOR rather
       than a row that runs past the fold. `100vh` sat here for one build. */
    expect(root).toContain("--os-port-h: 0px");
    expect(root).toContain("--os-row2-top: 0px");
  });

  /* ⚠️ BOTH BOTTOM CARDS SCROLL INSIDE THE ROW, and the row's height is what bounds them. A card
     without `min-height: 0` in a grid track refuses to shrink below its content, so the scroller
     never engages and the row grows instead — the fault that hid behind content in two rebuilds. */
  it("⚠️ the bottom cards bound their contents rather than growing the row", () => {
    /* the cards inherit `min-height: 0` from `.os-card`, which is where a grid child needs it — a
       card that refuses to shrink below its content never engages its scroller and grows the row */
    expect(rule(".os-card")).toContain("min-height: 0");
    const scroll = rule(".os-scroll");
    expect(scroll).toContain("flex: 1");
    expect(scroll).toContain("min-height: 0");
    expect(scroll).toMatch(/overflow-y:\s*auto/);
  });

  it("the retired grid, its columns and the two-row spine are gone, rule and element together", () => {
    for (const sel of [".os-grid", ".os-colL", ".os-colR", ".os-colL, .os-colR", ".os-colM",
                       ".os-midrow", ".os-lowrow", ".os-toprow", ".os-actv", ".os-tasks", ".os-bd"]) {
      expect(cssRuleCount(cssRules, sel), `${sel} is still declared`).toBe(0);
    }
    expect(cssRules).not.toContain("--os-bottom-h");
    for (const src of ["./OneScreenDashboard.tsx", "./OneScreenSkeleton.tsx"]) {
      const t = readFileSync(resolve(__dirname, src), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(t, `${src} still renders a retired row`).not.toMatch(/["\s`]os-(mid|low|top)row["\s`]/);
      expect(t, `${src} still renders a retired column`).not.toMatch(/["\s`]os-col[LMR]["\s`]/);
    }
  });

  /**
   * ⚠️ THE STEPS COME AFTER EVERY RULE THEY OVERRIDE — a media query confers no specificity, and the
   * lock's old frame sat four hundred lines above the rules it overrode with one of them quietly
   * winning. The ref carries NO media queries at all (it draws 1440 and nothing else), so all three
   * are Nick's prose and are the authority at those widths.
   */
  it("⚠️ the three steps are Nick's, and each comes after the base rules it overrides", () => {
    /* ⚠️ THE OPENING IS FOUND BY A TOLERANT MATCH, because comments are stripped and leave blank
       lines: `indexOf("@media (…) {\n  .os-")` failed on a correct sheet the moment a block opened
       with a note. */
    const block = (cond: string) => {
      const m = new RegExp(`@media \\(${cond}\\) \\{`).exec(cssRules);
      expect(m, cond).not.toBeNull();
      return { at: m!.index, body: sliceBetween(cssRules.slice(m!.index), "{", "\n}", cond) };
    };
    /* 1280: the closed tile drops beneath the chart, at the middle column's full width */
    const narrow = block("max-width: 1279px");
    expect(narrow.body).toContain(".os-row1 { grid-template-columns: minmax(228px, 0.78fr) minmax(340px, 2fr); }");
    expect(narrow.body).toContain(".os-row1 > .os-cl { grid-column: 2; }");
    /* 1000: everything stacks, and the stated row height is released or the cards are squeezed */
    const stack = block("max-width: 999px");
    expect(stack.body).toContain(".os-row1, .os-row2 { grid-template-columns: minmax(0, 1fr); height: auto; }");
    expect(stack.body, "a stacked card needs a height of its own, or it collapses")
      .toMatch(/\.os-row2 > \.os-card \{ height: \d+px; \}/);
    /* 640: the type steps down and the page's own gutter tightens */
    const phone = block("max-width: 640px");
    expect(phone.body).toMatch(/\.os-greet \.os-hello \{ font-size: \d+px; \}/);
    for (const base of [".os-row1 {", ".os-row2 {", ".os-greet .os-hello {", ".os-content {"]) {
      const b = cssRules.indexOf(base);
      expect(b, base).toBeGreaterThan(-1);
      for (const step of [narrow.at, stack.at, phone.at]) {
        expect(step, `${base} must come before its step`).toBeGreaterThan(b);
      }
    }
    /* ⚠️ AND THE NARROW BLOCKS COME AFTER THE WIDE ONE — equal specificity, so the later wins, and a
       ≤1279 block below a ≤999 one would override the narrower regime at phone width. */
    expect(stack.at).toBeGreaterThan(narrow.at);
    expect(phone.at).toBeGreaterThan(stack.at);
    /* and all three sit above the reduced-motion block, which stays last */
    expect(cssRules.lastIndexOf("@media (prefers-reduced-motion: reduce)")).toBeGreaterThan(phone.at);
  });

  /* ⚠️ THE SWEEP, NOT THE FOUR NAMES (dashboard redesign, Phase 2). Each header's own suite asserts
     its own rule; this asks the question of the WHOLE sheet, so a FIFTH card header added later
     with a band cannot pass by nobody having written a case for it. */
  it("⚠️ no card header in this sheet paints a band or a hairline", () => {
    for (const sel of [".os-ahead", ".os-th2", ".os-goal-r1", ".os-commhead", ".os-achead", ".os-clhd"]) {
      const declared = cssRuleCount(cssRules, sel);
      if (declared === 0) continue; // `.os-commhead` rides `.os-ahead`; absence is not a failure
      const body = rule(sel);
      expect(body, `${sel} paints a fill`).not.toMatch(/(^|;|\s)background(-color|-image)?\s*:/);
      expect(body, `${sel} draws a hairline under itself`).not.toContain("border-bottom");
    }
    expect(cssRuleCount(cssRules, ".os-mark")).toBe(1);
    expect(rule(".os-mark")).not.toContain("box-shadow");
  });

  /**
   * ⚠️ ONE SPACING MECHANISM PER AXIS, AND THE CLAIM SURVIVED ITS SUBJECT (v29 Phase 6 → v16). The
   * retired right column stated a gap AND its children carried margins, which once opened 44px
   * between two cards. The columns are gone; the same fault is available to the two rows, so the
   * claim is pointed at them: each row spaces with its `gap` and nothing inside it adds a margin.
   */
  it("⚠️ the rows space with ONE mechanism — the gap, and no margins beside it", () => {
    for (const sel of [".os-row1", ".os-row2"]) {
      expect(rule(sel), `${sel} must state a gap`).toContain("gap: var(--dash-gap)");
    }
    expect(cssRules, "a margin beside the gap doubles the spacing")
      .not.toMatch(/\.os-row[12] > \*\s*\{[^}]*margin/);
    /* the gap is one token, declared once, so the two rows cannot part */
    expect((cssRules.match(/--dash-gap:/g) ?? [])).toHaveLength(1);
  });
});

describe("§2 · the greeting", () => {
  /**
   * ⚠️ THE SLOT UNDER THE NAME IS EMPTY AGAIN, AND IT HAS NOW HELD THREE THINGS (ref v22).
   *
   * A kicker went first, for repeating what the chrome already said. A muted date line replaced it
   * and went for a plainer reason — anyone reading it knows what day it is. A subtitle replaced
   * THAT, and v22 draws the greeting alone: its hero is `<div><h1>…</h1></div>` beside the stats,
   * with no lede, no manuscript line and no goals meter. Three answers, and the design's has been
   * the name by itself each time the question was asked properly.
   */
  /* ⚠️ RETARGETED: THE SUBTITLE IS BACK, AND IT IS THE ONE THING THAT CHANGED (v26). This forbade
     "on your desk today?" outright, because the v22 hero was the greeting and nothing else. v26
     states the question as its OWN hero row with its own text probe — row 2, column 1, beside the
     stats that span both rows. What the case was really guarding survives unchanged and is still
     asserted: no kicker, no `.os-sub2` lede, no italic-burgundy name. The slot has now held a
     kicker, a date, a lede and a question; this is the fourth swing and the first with a probe on
     it, which is what makes it checkable rather than remembered. */
  /* ⚠️ RETARGETED AGAIN (dashboard header, stage 1): THE QUESTION IS GONE, AND A LINE OF FIGURES
     TAKES ITS ROW. "What's on your desk today?" is the fifth thing this slot has held and the first
     to be replaced by a statement rather than an address — "N queries out · N tasks waiting on
     you". What the case has always guarded still holds and is still asserted: no kicker, no lede,
     no italic-burgundy name. The new line's own claims live in `dashHeader.test.tsx`. */
  it("the greeting leads, the counts line sits under it, and the name is plain ink", () => {
    const html = render();
    expect(html).toContain('<h1 class="os-hello" data-probe-text="greeting">Hello, Nick.</h1>');
    expect(html).toContain('data-probe-text="header-counts"');
    expect(html).not.toContain("os-sub2line");
    expect(html).not.toContain('data-probe-text="subtitle"');
    expect(html).not.toContain("on your desk today");
    expect(html).not.toContain('class="os-sub2"');
    expect(html).not.toContain("os-kicker");
    // no italic-burgundy name: the h1 carries no <em>
    expect(html).not.toMatch(/<h1[^>]*>[^<]*<em/);
  });

  it("⚠️ the date line is GONE, not merely unstyled — no element and no rule", () => {
    expect(render()).not.toContain("os-dateline");
    expect(cssRules).not.toContain(".os-dateline {");
  });

  /* ⚠️ RETARGETED (stage 1): the `.os-sub2` lede rule had no element for several passes and went
     with the header rewrite, as did the question's own `.os-sub2line`. A rule with no subject is the
     fault this sheet records; its absence is the claim now. */
  it("the lede and question rules are gone with their elements", () => {
    expect(cssRuleCount(cssRules, ".os-sub2")).toBe(0);
    expect(cssRuleCount(cssRules, ".os-sub2line")).toBe(0);
    expect(cssRules).not.toContain(".os-subrow");
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 3) — THE PILLS ARE RETIRED, and this asserts that
     they went rather than what they said. "Querying since {month}" and the achievement pill were
     both true and neither was work: one states how long you have been at it, the other congratulates
     you, on a page whose job is to show what needs doing.

     ⚠️ THE COPY LITERALS ARE KEPT IN THE NEGATIVE, DELIBERATELY. This case previously carried a note
     recording that retargeting it off the copy once PINNED A REGRESSION — the source had reverted to
     older wording and the test was changed to match it. Asserting the sentences are ABSENT keeps the
     same anchor pointing the other way, so a pill reinstated with either wording fails here. */
  it("the greeting's two pills are RETIRED — no tenure, no achievement, no row", () => {
    const html = render();
    expect(html).not.toContain("os-pills");
    expect(html).not.toContain("os-pill");
    expect(html).not.toContain("Querying since");
    /* ⚠️ RETARGETED, NOT DROPPED (v16). "N out with agents" was the tenure pill's wording and is now
       the CHART's eyebrow — a page-wide `not.toContain` would forbid a live sentence. The claim is
       that it is not in the GREETING, which is what the pill row was. */
    const greet = sliceBetween(html, '<div class="os-greet"', '<div class="os-row1"', "the greeting");
    expect(greet).not.toContain("out with agents");
    /* ⚠️ THE GREETING KEEPS ITS NAME AND NOTHING ELSE (ref v22) — the pills went, then the date
       line, then the address. What this case guards is that the ROW of pills has not returned, and
       that claim does not depend on what else is or is not under the name. */
    expect(html).toContain("Hello, ");
  });

  /* ⚠️ RETARGETED (stage 1): THE THREE STAT CARDS ARE DELETED, so "Agents on file" no longer renders
     here at all. The vocabulary half of the old case ("on file", never "met") still has a subject —
     no surface on this page may say "agents met" — and the cards' absence is asserted by their
     labels AND their classes, so a card reinstated under either fails. */
  it("the three stat cards are gone — no label, no row, no slot — and nothing says 'agents met'", () => {
    const html = render();
    for (const label of ["Queries sent", "Agents on file", ">Responses<"]) {
      expect(html, label).not.toContain(label);
    }
    expect(html).not.toContain('data-probe="stats"');
    expect(html).not.toContain('data-probe="stat-card"');
    expect(html).not.toContain('data-probe="stat-illustration"');
    for (const cls of ["os-counters", "os-counter", "os-cic", "os-cn", "os-cd"]) {
      expect(html, cls).not.toMatch(new RegExp(`["\\s\`]${cls}["\\s\`]`));
    }
    expect(html).not.toContain("agents met");
  });

  /* ⚠️ RETARGETED: the ≤1200 rule dropped the achievement pill because the header was crowded.
     With no pills there is nothing to drop, and the rule must not survive them — a `:nth-child`
     rule aimed at a retired row is the "class with no subject" fault wearing a media query. */
  it("the ≤1200px pill rule went with the pills", () => {
    expect(cssRules).not.toContain(".os-pills");
    expect(cssRuleCount(cssRules, ".os-pill")).toBe(0);
    /* ⚠️ AND THE PASTILLE TOKENS GO WITH THE PILL — CHECKED, NOT ASSUMED. The first draft of this
       assertion said the tokens must SURVIVE because `.os-p` (the tasks trio) reads them. It does
       not: the trio is white and its own lock says so in as many words. The pill was the only
       consumer, so retiring it left four tokens declared and read by nothing. */
    expect(cssRules).not.toContain("--os-pastille");
  });
});

describe("§8 · skeletons", () => {
  it("loading renders per-card shimmers and hides content without unmounting it", () => {
    const html = render({ loading: true });
    expect(html).toContain("os-skel");
    expect(html).toContain("isload");
    // content is still IN the tree (opacity:0 via CSS) so layout cannot shift when data lands
    expect(html).toContain("Hello, Nick.");
    /* ⚠️ `.os-greet.isload` LEFT THE RULE (stage 1) — the header takes no per-card skeleton */
    expect(rule(".os-card.isload > *:not(.os-skel)")).toContain("opacity: 0");
    expect(cssRules).not.toContain(".os-greet.isload");
  });

  /* ⚠️ THE HEADER IS THE ONE PANEL THAT DOES NOT SHIMMER (stage 1): while the data is out it says its
     words and no figures — never a zero, never a bar. Asserted on the PAGE's header, which is the
     one carrying the probe; the cover's copy is asserted in `oneScreenSkeleton.test.tsx`. */
  it("⚠️ loading: the header carries no shimmer and no figure", () => {
    const html = render({ loading: true });
    const hdr = sliceBetween(html, '<div class="os-greet" data-probe="hero">', '<div class="os-row1"', "the page's header");
    expect(hdr).not.toContain("isload");
    expect(hdr).not.toContain("os-skel");
    expect(hdr).not.toContain("<b>");
    expect(hdr).toContain("queries out");
    expect(hdr).toContain("waiting on you");
  });

  it("reduced motion stills the shimmer to a static tint", () => {
    expect(cssRules).toContain(".os-skel i { animation: none; background: #efe7db; }");
  });
});

describe("§6 trap · the entrance animation is scoped to .enter", () => {
  it("⚠️ no animation on the bare card classes — only on .enter, which JS removes", () => {
    expect(rule(".os-card")).not.toContain("animation");
    expect(cssRules).toContain(".os-card.enter, .os-greet.enter { animation: os-rise");
  });
});

describe("the sparse chart state and the tasks empty state (shells)", () => {
  it("a single point on the record: the chart says how the line begins", () => {
    const html = render({ queries: [q({ dateSent: daysAgo(0) })] });
    /* v33: a short campaign is drawn DAILY and stepped, so the line needs two days, not two weeks */
    expect(html).toContain("The line begins once there are two days on the record.");
  });

  it("no tasks → the italic empty line, and the header says Nothing needs you", () => {
    const html = render();
    expect(html).toContain("Nothing needs you");
    expect(html).toContain("Nothing needs you today.");
  });
});

describe("§9 · first-run states", () => {
  /* ⚠️ RETARGETED (Phase 3). These three cases read the GREETING's pills, which are gone. The
     first-run states themselves are untouched and still worth locking — they just live in the chart
     and the tasks card now, which is where `scopedStage` was always the input. The ACCOUNT-wide
     `stage` that drove the pills is deleted with them; the SCOPED one is not, and that split was
     already the file's own documented decision (B3). */
  it("day one: the faded example and the getting-started deeds", () => {
    const html = render({ queries: [], manuscripts: [], agents: [], activeManuscript: null });
    /* ⚠️ RETARGETED (empty-states pack, Phase 1) — and this is a SUPERSESSION, not a rebaseline.
       Day one used to draw the chart's invitation ("Every query you send …") and the tasks card's
       two ghost CTAs. Both branches still exist and still render for any caller that does not pass
       `empty`; the dashboard now passes it, because the ref's first getting-started deed is "Add
       your first manuscript" — a row addressed to an account with no manuscript, i.e. this one.
       Behind the old two-CTA state that row could only ever have been ticked and decorative.

       ⚠️ THE OLD LINES ARE ASSERTED ABSENT, not merely unmentioned: a supersession that leaves the
       superseded thing on screen is two first-run states on one page. */
    expect(html).toContain("Log your first query");
    expect(html).toContain("Add your first manuscript");
    expect(html).toContain("Getting started");
    expect(html).not.toContain("Every query you send and every reply that comes back will be charted here.");
    expect(html).not.toContain("Tasks appear here as your queries progress.");
    /* ⚠️ THE FEED'S ZERO-ROWS LINE IS SUPERSEDED TOO, and only on the `all` tab. The ghost tail's
       caveat is the message now; keeping both would put two sentences about an empty feed in one
       column. A NARROWED tab with nothing in it still keeps its own line, because that is a fact
       about the filter, which the generic caveat does not state — asserted in `dashEmptyState`. */
    expect(html).not.toContain("The story starts with your first query.");
    expect(html).toContain("every send, reply and note you record lands here");
    /* the retired pill row must not come back on the one state that had a pill of its own */
    expect(html).not.toContain(">Day one<");
  });

  /* ⚠️ RETARGETED (stage 3): the chart's "N awaiting a reply" chip is retired with the chart that wore it.
     Early days still states a fact and still congratulates nothing: the caption says how far the count
     moved, and there is no pill. */
  /* v33: the movement caption is retired with the eyebrow; what early days states instead is SINCE
     WHEN — the short campaign's quiet suffix — and still nothing congratulates. */
  it("early days: the chart says since when, and nothing congratulates", () => {
    const html = render({ queries: [q({ dateSent: daysAgo(3) }), q({ dateSent: daysAgo(9) })] });
    expect(html).toMatch(/data-probe-text="chart-since">since \d{1,2} [A-Z][a-z]{2}<\/span>/);
    expect(html).not.toContain("over 8 weeks");
    expect(html).not.toContain("awaiting a reply");
    expect(html).not.toContain("os-pill");
  });

  it("settled: the page states no achievement anywhere", () => {
    const html = render(); // base fixture: first send 30 days ago
    expect(html).not.toContain("os-pill ach");
    expect(html).not.toContain("Best month");
  });
});

/* ══ v16 §6 · the entrance stagger cleans up after itself ══ */

describe("⚠️ the entrance class is REMOVED, and the guard is a ref", () => {
  const src = readFileSync(resolve(__dirname, "./OneScreenDashboard.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  /* ⚠️ THE BUG THIS PINS: with `entered` in state AND in the deps, setting it re-ran the effect
     — the cleanup fired first and cleared the pending timeout, and the re-run returned early at
     the guard without re-arming it. The `enter` class was added and NEVER removed, which leaves
     a `fill-mode: both` animation permanently outranking any inline transform on every card.
     Verified in the browser as `stillAnimating: true` long after settling. */
  it("the stagger guard is a ref and is NOT in the effect's deps", () => {
    expect(src).toContain("const entered = useRef(false)");
    expect(src).toContain("if (loading || entered.current) return;");
    expect(src).toContain("entered.current = true;");
    // the deps that matter: `entered` must not appear, or the effect cancels its own timeout
    expect(src).toMatch(/items\.forEach\(\(el\) => el\.classList\.remove\("enter"\)\), 900\);\s*return \(\) => window\.clearTimeout\(id\);\s*\}, \[loading\]\);/);
    expect(src).not.toContain("[loading, entered]");
  });

  it("the animation still carries `both`, so removal is what keeps it safe", () => {
    expect(cssRules).toContain(".os-card.enter, .os-greet.enter { animation: os-rise");
    expect(cssRules).toMatch(/\.os-card\.enter[^}]*both;/);
  });

  /* ⚠️ RETARGETED (stages 2–3): every delay names the row its card actually lives in, and the page's own
     order sets the sequence. The retired cards' delays went with them. */
  it("every stagger delay names the row its card actually lives in", () => {
    /* ⚠️ RETARGETED (v16), AND THE SELECTORS ARE POSITIONAL NOW. Each row's cards are staggered by
       `:nth-child` inside the row they live in, rather than by name — five cards, two rows, and a
       card moving between rows takes its place in the sequence with it rather than keeping a delay
       written against its old parent. */
    const order = [".os-greet.enter",
                   ".os-row1 .os-card.enter:nth-child(1)", ".os-row1 .os-card.enter:nth-child(2)",
                   ".os-row1 .os-card.enter:nth-child(3)",
                   ".os-row2 .os-card.enter:nth-child(1)", ".os-row2 .os-card.enter:nth-child(2)"];
    const delay = (sel: string) => {
      const m = new RegExp(`(?:^|\n)${sel.replace(/[.()]/g, "\\$&")} \\{ animation-delay: ([\\d.]+)s; \\}`).exec(cssRules);
      expect(m, sel).not.toBeNull();
      return Number(m![1]);
    };
    const delays = order.map(delay);
    expect([...delays].sort((a, b) => a - b)).toEqual(delays);
    /* the retired cards' delays went with them — a delay naming a card nothing renders is a rule
       with no subject, and the sequence it belonged to has one fewer step than it looks */
    for (const gone of [".os-colL", ".os-colR", ".os-bd.enter", ".os-toprow", ".os-aut.enter",
                        ".os-probanner.enter", ".os-goal.enter", ".os-comm.enter"]) {
      expect(cssRules, gone).not.toContain(gone);
    }
    /* ⚠️ AND THE POSITIONS ARE REAL: `:nth-child` is a claim about the DOM, so the rendered rows must
       hold exactly the cards the delays assume, in that order. */
    const html = render();
    const row1 = sliceBetween(html, 'data-probe="row1"', 'class="os-row2"', "the first row");
    expect([...row1.matchAll(/class="os-card(?: os-lift)? (os-[a-z]+)[" ]/g)].map((m) => m[1]))
      .toEqual(["os-qa", "os-lead", "os-cl"]);
    const row2 = html.slice(html.indexOf('class="os-row2"'));
    expect([...row2.matchAll(/class="os-card(?: os-lift)? (os-[a-z]+)[" ]/g)].map((m) => m[1]))
      .toEqual(["os-feed", "os-todo"]);
  });
});

describe("one search control, not two (v27, Phase 2)", () => {
  const shell = readFileSync(resolve(__dirname, "../shell/WorkspaceShell.tsx"), "utf8");

  /* ⚠️ THE DASHBOARD RENDERS ITS OWN 620px FIELD, so the bar's pill was the SECOND search control
     on one screen. Two controls for one job is worse than either alone: the reader has to work out
     whether they do the same thing, and they do. */
  it("the bar's search pill does not render on /dashboard", () => {
    /* ⚠️ RETARGETED, SAME LAW (the v34 mockup, 19 Sep): the dashboard's field is `SearchPill big` now, so
       the component is mounted TWICE in the source — and exactly one of them per route. The big one is
       gated ON the dashboard flag, the small one on its negation. */
    const mounts = [...shell.matchAll(/<SearchPill\b/g)].map((m) => m.index!);
    expect(mounts, "one big, one small").toHaveLength(2);
    const gate = (at: number) => shell.slice(Math.max(0, at - 160), at);
    const big = mounts.find((at) => /\bbig\b/.test(shell.slice(at, at + 160)))!;
    const small = mounts.find((at) => at !== big)!;
    expect(gate(big), "the big field is the dashboard's alone").toMatch(/\{dashMode && \(\s*$/);
    expect(gate(small), "the pill must be conditional on NOT being in dash mode").toMatch(/\{!dashMode && \(/);
  });

  /* ⚠️ REMOVED FROM THE DOM, NOT HIDDEN. "There is exactly one search control" is a claim about the
     document; `display: none` leaves the element there and the claim false. */
  it("it is removed rather than hidden", () => {
    const css = readFileSync(resolve(__dirname, "../shell/workspaceShell.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/dash-mode[^{]*\.ws-appctl[^{]*\{[^}]*display:\s*none/);
  });

  /* ⚠️ AND THE PAGE'S OWN FIELD IS THE ONE THAT SURVIVES — exactly one, with the probe on it. */
  /* ⚠️ THE FIELD IS THE SHELL'S NOW (v28, Phase 2), so the PAGE renders none — and this case
     asserts that, because the page having a search of its own is exactly the fault v28 exists to
     fix. The count that matters is the whole document's, and it lives in the harness as a standing
     gate run at every width: a unit test that renders one component can never see two controls in
     two components, which is how v27's "exactly one search control" passed on a page with the
     field in a row of its own. */
  it("the dashboard page renders no search of its own — the nav row carries it", () => {
    const html = render();
    expect(html).not.toContain('data-probe="search"');
    expect(html).not.toContain('class="os-search"');
    expect(html).not.toContain("os-topbar");
  });

  /* ⚠️ ⌘K SURVIVES, and it is registered somewhere other than the button that was removed — every
     read of the anchor ref is optional-chained, so the palette opens as before with nothing to
     anchor to on this route. */
  it("the keyboard route does not live on the removed button", () => {
    const palette = readFileSync(resolve(__dirname, "../shell/usePalette.tsx"), "utf8");
    expect(palette).toContain("openPalette");
    expect(shell).not.toMatch(/SearchPill[\s\S]{0,200}registerShortcut/);
  });
});
