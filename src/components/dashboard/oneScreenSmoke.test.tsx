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
import { cssRule, cssRuleCount } from "../../test/cssRule";
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

const q = (over: Record<string, unknown>) => ({ id: String(Math.random()), status: QueryStatus.QUERIED, ...over }) as any;

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

describe("§1 · the lock", () => {
  it("⚠️ min-height is FORBIDDEN on the lock elements", () => {
    expect(rule(".os-root")).not.toContain("min-height");
    /* ⚠️ NO 100vh IN THE LOCKED RULES — while the lock holds, the height comes from the slot and
       never from the viewport. The RELEASES are the exception and must stay one: once the page is
       allowed to scroll it is an ordinary page again, and `min-height: 100dvh` on the wrapper is
       the correct reference there. So this checks the base stylesheet, not the media queries. */
    const locked = cssRules.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    expect(locked).not.toContain("100vh");
    expect(locked).not.toContain("100dvh");
  });

  /* ⚠️ THE HEIGHT IS CSS NOW, AND THE JS LOCK IS DELETED. It measured #app-stage-scroll and
     stamped that as a pixel height — but the scroller CONTAINS the 66px sticky bar, so the card
     scrolled by exactly `--head`. Browser-measured before and after: 66 → 0. */
  it("⚠️ height:100% of the slot, and no measuring hook left behind", () => {
    expect(rule(".os-root")).toContain("height: 100%");
    const src = readFileSync(resolve(__dirname, "./OneScreenDashboard.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const gone of ["useStageLock", "STAGE_SCROLL_ID", "lockH", "ResizeObserver"]) {
      expect(src, gone).not.toContain(gone);
    }
    /* target the ROOT's own attributes — the skeleton bars carry a legitimate inline width, so a
       bare search for "style={" fails for the wrong reason (it did, first run) */
    expect(src).not.toMatch(/className="os-root"[^>]*style=/);
  });

  /* ⚠️ THE DASHBOARD'S OWN WRAPPER IS PART OF THE CHAIN — and it is the link that broke, twice
     unnoticed, because it is invisible from inside OneScreenDashboard. `.sa-dashroot` carried
     `min-h-screen` (100vh) and `pb-16` from the era when this page scrolled: 100vh inside a slot
     that is the viewport MINUS the 66px bar can never fit, and `min-height` leaves `height: auto`,
     so the `height:100%` below it had nothing to resolve against. Measured at 1155x870: slot
     774px, wrapper 6,499px, scroller overflowing by 5,725px. */
  it("⚠️ the Dashboard wrapper carries no min-h-screen and no bottom padding", () => {
    const src = readFileSync(resolve(__dirname, "../Dashboard.tsx"), "utf8");
    const cls = /className="(sa-dashroot[^"]*)"/.exec(src)?.[1] ?? "";
    expect(cls, "the sa-dashroot wrapper must exist").not.toBe("");
    expect(cls).not.toContain("min-h-screen");
    expect(cls).not.toContain("pb-16");
  });

  it("⚠️ and it takes a DEFINITE height, so height:100% below it can resolve", () => {
    expect(rule(".sa-dashroot")).toContain("height: 100%");
    expect(rule(".sa-dashroot")).toContain("min-height: 0");
    // the releases hand it back to a scrolling page
    expect(cssRules).toContain(".sa-dashroot { height: auto; min-height: 100vh; min-height: 100dvh; padding-bottom: 4rem; }");
  });

  /* ⚠️ BOTH ROUTE DECLARATIONS ARE REQUIRED. `layout="fill"` alone leaves `.ws-work` at
     `flex: 1 0 auto` — shrink 0, so it can never be smaller than its content and the card scrolls
     regardless; `.ws-work--fit`'s own rule records that `min-height: 0` does NOT substitute for a
     definite basis, measured. Asserted at source because no render test can see the shell. */
  it("⚠️ the route declares fill AND opts into the shrinkable work wrapper", () => {
    const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
    expect(app).toContain('<StagePage active={routeKey === "dashboard"} layout="fill">');
    /* ⚠️ MEMBERSHIP, not the whole expression. Other fixed-viewport routes legitimately join this
       list — one did within the hour of this being written — and a lock that pins the exact list
       fails on someone else's correct change. What matters here is that the dashboard is in it. */
    const shellSrc = readFileSync(resolve(__dirname, "../shell/AppShell.tsx"), "utf8");
    const fit = /fit=\{([^}]*)\}/.exec(shellSrc)?.[1] ?? "";
    expect(fit, "the fit expression must exist").not.toBe("");
    expect(fit).toContain('routeKey === "dashboard"');
  });

  it("both releases exist, and they outrank the inline height with !important", () => {
    expect(cssRules).toContain("@media (max-width: 1024px)");
    expect(cssRules).toContain("@media (max-height: 680px) and (min-width: 1025px)");
    const releases = cssRules.match(/height: auto !important/g) ?? [];
    expect(releases.length).toBeGreaterThanOrEqual(2);
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 2) — THREE columns, and the CENTRE is the elastic
     one. The law is unchanged in substance: the page is one capped, centred grid whose side
     columns are fixed and whose middle takes the rest. What moved is which track is `1fr`. */
  /* ⚠️ RETARGETED (refdiff pass, Phase 3). The grid left `.os-content` for its own `.os-grid`,
     because the hero used to be a grid ROW — so its height was a track and the three columns could
     never have a row of their own. The tracks are now the REF's: 440/1fr/420, with its own
     340/1fr/360 below 1700. The cap went with the move: the ref's content is uncapped and the
     harness compares `main`'s box against it. */
  it("the grid is three columns on the ref's tracks, and it is its own element", () => {
    const c = rule(".os-grid");
    expect(c).toContain("grid-template-columns: 352px minmax(0, 1fr) 420px");
    /* ⚠️ THE COLUMN BOTTOMS AGREE BY ONE WORD, not by three heights. Every column is handed the
       same row box; there is no number to keep in step. */
    expect(c).toContain("align-items: stretch");
    expect(cssRules).toContain(".os-grid { grid-template-columns: 300px minmax(0, 1fr) 340px; }");
    /* ⚠️ THE CAP IS GONE, DELIBERATELY. `--work-max` centred the page inside 1660 and the ref does
       not cap its content at all — at 2520 that put the app's `main` 494px narrower than the ref's
       and every column 250px in from where the design puts it. The token is untouched and Query
       Centre still reads it; the dashboard simply no longer does. */
    expect(rule(".os-content")).not.toContain("--work-max");
  });

  /* ⚠️ THE HEADER IS ITS OWN ROW, AND THE ROWS ARE `auto auto`. With `1fr` the RAIL would drive
     the row height and the page would grow past the fold with nothing to scroll it — the left
     column owns the height, which is the whole reason the two columns end level. */
  /* ⚠️ ROW 2 IS BOUNDED BY THE VIEWPORT, NOT BY CONTENT. An `auto` row is content-driven, so a
     long activity feed can drive it past the fold; it has not, only because `.os-actv` is
     `flex: 1` (basis 0) and contributes nothing to max-content — a coincidence of one shorthand,
     not a design. `minmax(0, 1fr)` says it outright, and `align-content: start` had to go because
     it stops the second row filling. */
  /* ⚠️ RETARGETED: `main` is a flex COLUMN now — hero, then grid — rather than a two-row grid with
     the hero spanning it. The property that mattered is unchanged and is asserted where it now
     lives: the grid takes the space the hero leaves and never sizes to its content. */
  it("⚠️ main is hero-then-grid, and the grid takes what the hero leaves", () => {
    const c = rule(".os-content");
    expect(c).toContain("flex-direction: column");
    expect(c).toContain("height: 100%");
    expect(c).not.toContain("align-content: start");
    const g = rule(".os-grid");
    expect(g).toContain("flex: 1");
    expect(g).toContain("min-height: 0");
    expect(cssRules).toContain(".os-colL { grid-column: 1; }");
    expect(cssRules).toContain(".os-colM { grid-column: 2; }");
    expect(cssRules).toContain(".os-colR { grid-column: 3; }");
  });

  /**
   * ⚠️ THE SIDE COLUMNS CONTRIBUTE NOTHING TO THE ROW'S HEIGHT AND STRETCH TO MATCH IT — v16's
   * `.grid3 > .col.side{height:0;min-height:100%;overflow:hidden}`, and it is the column-bottom law
   * in one declaration.
   *
   * All three were `height: 100%`, so each column asked for the row's height while its own content
   * ALSO fed that height — a loop in which a tall side column grew the row and the other two then
   * stretched to the new total. `height: 0` on the SIDES breaks it: the centre states the height and
   * the sides are told what it is. Both halves are asserted, because either alone is the bug.
   */
  it("the sides are height:0 with min-height:100%; the centre states the height", () => {
    const c = rule(".os-colL, .os-colM, .os-colR");
    expect(c).toContain("min-height: 100%");
    expect(c).toContain("overflow: hidden");
    expect(rule(".os-colL, .os-colR")).toContain("height: 0");
    expect(rule(".os-colM")).toContain("height: 100%");
  });

  /* ⚠️ SMALL ON PURPOSE — its job is to stop the card collapsing, not to reserve space. A large
     min-height makes the card refuse to shrink and pushes the row taller again. */
  it("⚠️ the activity card can SHRINK: flex 1 1 auto behind a small min-height", () => {
    const a = rule(".os-actv");
    expect(a).toContain("flex: 1 1 auto");
    expect(a).toContain("min-height: 120px");
    expect(a).not.toContain("min-height: 200px");
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 2), AND THE LAW IT ASSERTED IS NOW STRUCTURAL.
     `.os-midrow, .os-lowrow` was ONE `grid-template-columns` shared by two rows, so the Community
     tile could not drift from the author tile's width nor tasks from the chart's. With the columns
     as the grid's own tracks there is no second row to agree with — the property is kept by the
     shape rather than by a shared declaration, so the declaration goes rather than being repointed.
     What survives as an assertion is that it went: a retired rule left in a sheet is how a deleted
     layout comes back, and this sheet has been bitten by exactly that.

     ⚠️ AND THE AUTHOR TILE'S SQUARENESS GOES WITH IT, DELIBERATELY. 302×302 was "the same value
     twice" — the row's height and the column's width. There is no fixed row now, so the height
     half has nothing to read. */
  it("the two-row spine is RETIRED, rule and element together", () => {
    expect(cssRuleCount(cssRules, ".os-midrow")).toBe(0);
    expect(cssRuleCount(cssRules, ".os-lowrow")).toBe(0);
    expect(cssRuleCount(cssRules, ".os-midrow, .os-lowrow")).toBe(0);
    for (const src of ["./OneScreenDashboard.tsx", "./OneScreenSkeleton.tsx"]) {
      const t = readFileSync(resolve(__dirname, src), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(t, `${src} still renders a retired row`).not.toMatch(/["\s`]os-(mid|low)row["\s`]/);
    }
  });

  /* the rail narrowed 25% at every step so the chart gets the width; the proportion is the point,
     so all three steps move together or the page reads differently at each breakpoint */
  /* ⚠️ RETARGETED: the rail's three steps are unchanged (287 · 262 · 240) and the LEFT column now
     steps with them, so the two sides narrow together and the centre keeps the width it gains. A
     breakpoint that moved one side and not the other would re-proportion the page at that width
     only, which is the fault the original 25% rule was written against. */
  /* ⚠️ RETARGETED: TWO regimes now, not four, and both are the ref's own — 440/420 at ≥1700 and
     340/360 below it, which is where the ref collapses. The app's old four-step ladder was its own
     invention and none of its widths were the design's. */
  it("two regimes, both the ref's, and the centre stays elastic in each", () => {
    for (const [l, r] of [["352px", "420px"], ["300px", "340px"]]) {
      expect(cssRules, `${l} / ${r}`).toContain(`grid-template-columns: ${l} minmax(0, 1fr) ${r}`);
    }
    expect(cssRules).not.toMatch(/grid-template-columns: minmax\(0, 1fr\) \d+px/);
  });

  /* ⚠️ THE SWEEP, NOT THE FOUR NAMES (dashboard redesign, Phase 2). Each header's own suite asserts
     its own rule; this asks the question of the WHOLE sheet, so a FIFTH card header added later
     with a band cannot pass by nobody having written a case for it. The prompt phrased it as
     ".hd carries no background or border-bottom" — `.hd` is the REF's class and this app has never
     had one, so the claim is stated over the classes that actually head a dashboard card. */
  it("⚠️ no card header in this sheet paints a band or a hairline", () => {
    for (const sel of [".os-ahead", ".os-th2", ".os-goal-r1", ".os-commhead"]) {
      const declared = cssRuleCount(cssRules, sel);
      if (declared === 0) continue; // `.os-commhead` rides `.os-ahead`; absence is not a failure
      const body = rule(sel);
      expect(body, `${sel} paints a fill`).not.toMatch(/(^|;|\s)background(-color|-image)?\s*:/);
      expect(body, `${sel} draws a hairline under itself`).not.toContain("border-bottom");
    }
    /* the icon tile loses its plate on all of them, and there is exactly ONE rule to lose it in */
    expect(cssRuleCount(cssRules, ".os-mark")).toBe(1);
    expect(rule(".os-mark")).not.toContain("box-shadow");
  });

  it("⚠️ the rail spaces with MARGINS, not gap — a collapsing panel takes its spacing with it", () => {
    /* the shared `.os-colM, .os-colR` rule sits first, so the naive first-match lookup lands on
       it; assert the standalone declarations verbatim instead */
    expect(cssRules).toContain(".os-colR { gap: 0; }");
    expect(rule(".os-colR > *")).toContain("margin-bottom: 22px");
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 2). The budget INVERTED: the chart is now the card
     with the range (340–560) and the to-do panel takes whatever the chart does not. That is the
     point of the redesign's centre column — the chart is bounded so the panel can be generous —
     and it is the reverse of the old row, where tasks were bounded 118–318 and the chart flexed. */
  /* ⚠️ THE CHART'S HEIGHT IS FIXED, NOT A RANGE — v16's `#chartCard{height:clamp(400px,42vh,560px)}`.
     A range let the chart shrink whenever the to-do card wanted more, so the plot's proportions were
     a function of how many tickets were open; the clamp makes them a function of the viewport, which
     is the only thing a chart's shape should follow. */
  it("the vertical budget: the chart is a clamped height, the to-do panel takes the rest", () => {
    const chart = rule(".os-colM .os-lead");
    expect(chart).toContain("height: clamp(400px, 42vh, 560px)");
    expect(chart).toContain("flex: 0 0 auto");
    /* ⚠️ NO NUMERIC CEILING — `max-height: none` is a REMOVAL and appears in the narrow regimes,
       where the card takes a stated height instead. The reader joins every block for the selector,
       so forbidding the property outright fails on a rule that is turning it off. */
    expect(chart).not.toMatch(/max-height:\s*\d/);
    const todo = rule(".os-colM .os-tasks");
    expect(todo).toContain("flex: 1 1 auto");
    expect(todo).toContain("min-height: 0");
    /* ⚠️ THE FEED FLEXES TO ITS COLUMN AND NEVER SETS IT — the property the measurement asserts. */
    expect(rule(".os-colR .os-actv")).toContain("flex: 1 1 auto");
  });
});

describe("§2 · the greeting", () => {
  /* ⚠️ RETARGETED (audit pack P2). The kicker went first, for repeating what the chrome already
     said; the muted DATE LINE that replaced it has now gone too, for a plainer reason — anyone
     reading it knows what day it is. A subtitle sits BELOW the name instead, so the block reads
     greeting → address → facts. */
  it("the greeting leads, a subtitle sits under it, and the name is plain ink", () => {
    const html = render();
    expect(html).toContain("Hello, Nick");
    expect(html).toContain('class="os-sub2"');
    expect(html).toContain("on your desk today?");
    expect(html).not.toContain("os-kicker");
    // no italic-burgundy name: the h1 carries no <em>
    expect(html).not.toMatch(/<h1[^>]*>[^<]*<em/);
  });

  it("⚠️ the date line is GONE, not merely unstyled — no element and no rule", () => {
    expect(render()).not.toContain("os-dateline");
    expect(cssRules).not.toContain(".os-dateline {");
  });

  it("the subtitle is 13.5px muted brown, 6px under the name", () => {
    const r = rule(".os-sub2");
    expect(r).toContain("font-size: 13.5px");
    expect(r).toContain("color: #8a7a6c");
    expect(r).toContain("margin-top: 6px");
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
    expect(html).not.toContain("out with agents");
    /* the greeting keeps its name and its question — the row went, the address did not */
    expect(html).toContain("Hello, ");
    expect(html).toContain("on your desk today?");
  });

  it('the counter says "Agents on file" — "on file", never "met"', () => {
    expect(render()).toContain("Agents on file");
    expect(render()).not.toContain("agents met");
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
    expect(html).toContain("Hello, Nick");
    expect(rule(".os-card.isload > *:not(.os-skel), .os-greet.isload > *:not(.os-skel)")).toContain("opacity: 0");
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
  it("day one: the invitation chart and the two ghost CTAs", () => {
    const html = render({ queries: [], manuscripts: [], agents: [], activeManuscript: null });
    expect(html).toContain("Every query you send and every reply that comes back will be charted here.");
    expect(html).toContain("Send your first query");
    /* ⚠️ RETARGETED (Phase 5): the header's "Nothing needs you" was the retired count trio's empty
       slot. Day one states its case in the BODY, which is where the two first moves are. */
    expect(html).toContain("Tasks appear here as your queries progress.");
    expect(html).toContain("Add your manuscript");
    expect(html).toContain("Add an agent");
    expect(html).toContain("The story starts with your first query.");
    /* the retired pill row must not come back on the one state that had a pill of its own */
    expect(html).not.toContain(">Day one<");
  });

  /* ⚠️ EARLY DAYS IS STILL A DISTINCT STATE — the chart's chip carries the awaiting count, which is
     the fact the achievement pill was suppressed here to avoid dressing up as a triumph. */
  it("early days: the chart chip is the awaiting count, and nothing congratulates", () => {
    const html = render({ queries: [q({ dateSent: daysAgo(3) }), q({ dateSent: daysAgo(9) })] });
    expect(html).toContain("awaiting a reply");
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

  /* the author tile moved to the main column in §1; its stagger delay had stayed in the rail */
  it("every stagger delay names the column its card actually lives in", () => {
    expect(cssRules).toContain(".os-colL .os-aut.enter");
    expect(cssRules).not.toContain(".os-colR .os-aut.enter");
    expect(cssRules).toContain(".os-colL .os-probanner.enter");
  });
});
