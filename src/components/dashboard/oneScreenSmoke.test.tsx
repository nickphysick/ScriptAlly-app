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
  tasks: [], userTasks: [], activities: [],
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
  it("the grid is three columns, the centre elastic, capped 1660 and centred", () => {
    const c = rule(".os-content");
    expect(c).toContain("grid-template-columns: 302px minmax(0, 1fr) 287px");
    /* ⚠️ THE COLUMN BOTTOMS AGREE BY ONE WORD, not by three heights. Every column is handed the
       same row box; there is no number to keep in step. */
    expect(c).toContain("align-items: stretch");
    expect(c).toContain("max-width: var(--work-max)");
    /* ⚠️ THE FIGURE MOVED TO A TOKEN SO QUERY CENTRE CAN READ THE SAME ONE. Two pages agreeing by
       literal agree until one is edited; the value is asserted where it is now declared. */
    expect(readFileSync(resolve(__dirname, "../../index.css"), "utf8"), "the shared cap changed value")
      .toContain("--work-max: 1660px;");
    expect(c).toContain("margin: 0 auto");
  });

  /* ⚠️ THE HEADER IS ITS OWN ROW, AND THE ROWS ARE `auto auto`. With `1fr` the RAIL would drive
     the row height and the page would grow past the fold with nothing to scroll it — the left
     column owns the height, which is the whole reason the two columns end level. */
  /* ⚠️ ROW 2 IS BOUNDED BY THE VIEWPORT, NOT BY CONTENT. An `auto` row is content-driven, so a
     long activity feed can drive it past the fold; it has not, only because `.os-actv` is
     `flex: 1` (basis 0) and contributes nothing to max-content — a coincidence of one shorthand,
     not a design. `minmax(0, 1fr)` says it outright, and `align-content: start` had to go because
     it stops the second row filling. */
  it("⚠️ the header spans all three columns; row 2 is minmax(0,1fr), never auto", () => {
    const c = rule(".os-content");
    expect(c).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(c).not.toContain("align-content: start");
    expect(c).toContain("height: 100%");
    expect(cssRules).toContain(".os-greet { grid-column: 1 / -1; grid-row: 1; }");
    expect(cssRules).toContain(".os-colL { grid-column: 1; grid-row: 2; }");
    expect(cssRules).toContain(".os-colM { grid-column: 2; grid-row: 2; }");
    expect(cssRules).toContain(".os-colR { grid-column: 3; grid-row: 2; }");
  });

  /* the columns take the row they are given and nothing escapes them */
  it("all three columns are height:100% with overflow hidden", () => {
    const c = rule(".os-colL, .os-colM, .os-colR");
    expect(c).toContain("height: 100%");
    expect(c).toContain("min-height: 0");
    expect(c).toContain("overflow: hidden");
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
  it("both side columns step together at every breakpoint; the centre stays elastic", () => {
    for (const [l, r] of [["302px", "287px"], ["276px", "262px"], ["256px", "240px"]]) {
      expect(cssRules, `${l} / ${r}`).toContain(`grid-template-columns: ${l} minmax(0, 1fr) ${r}`);
    }
    /* the old two-column form must not survive anywhere — it would win at whichever width it sat */
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
    expect(rule(".os-colR > *")).toContain("margin-bottom: 13px");
  });

  /* ⚠️ RETARGETED (dashboard redesign, Phase 2). The budget INVERTED: the chart is now the card
     with the range (340–560) and the to-do panel takes whatever the chart does not. That is the
     point of the redesign's centre column — the chart is bounded so the panel can be generous —
     and it is the reverse of the old row, where tasks were bounded 118–318 and the chart flexed. */
  it("the vertical budget: the chart is bounded 340–560, the to-do panel takes the rest", () => {
    const chart = rule(".os-colM .os-lead");
    expect(chart).toContain("min-height: 340px");
    expect(chart).toContain("max-height: 560px");
    expect(chart).toContain("flex: 0 1 auto");
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

  /* ⚠️ TWO PILLS NOW. The agents count moved to the counters card — one number, one home; two
     homes is how they come to disagree. */
  it("the pills are tenure then achievement, and the agents pill is GONE", () => {
    const html = render();
    const pills = html.indexOf("os-pills");
    expect(pills).toBeGreaterThan(-1);
    const tenure = html.indexOf("Querying since", pills);
    /* ⚠️ THE LITERAL IS BACK, AND MY REMOVING IT WAS THE MISTAKE. I retargeted this onto the
       `os-pill ach` class on the reasoning that the copy was fixture-dependent. It was not: the
       pill genuinely reads "out with agents", and the reason the source said "awaiting a reply"
       was that `a7b5d54` had reverted `oneScreen.ts` to the older wording. So the assertion was
       right, the source was wrong, and retargeting the test PINNED THE REGRESSION — the same
       fault as the census. Anchored on the copy again, because the copy is the decision:
       "the writer is the subject of it. The queries are somewhere, doing something." */
    const ach = html.indexOf("out with agents", pills);
    expect(tenure).toBeGreaterThan(-1);
    expect(ach).toBeGreaterThan(tenure);
    // the phrase survives ONLY as the counter's label, never as a pill
    const pillRow = html.slice(pills, html.indexOf("os-counters"));
    expect(pillRow).not.toContain("agents on file");
  });

  it('the counter says "Agents on file" — "on file", never "met"', () => {
    expect(render()).toContain("Agents on file");
    expect(render()).not.toContain("agents met");
  });

  it("the ≤1200px rule drops the SECOND pill — the achievement slot", () => {
    expect(cssRules).toContain(".os-pills .os-pill:nth-child(2) { display: none; }");
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
  it("day one: the single Day one pill, the invitation chart, the two ghost CTAs", () => {
    const html = render({ queries: [], manuscripts: [], agents: [], activeManuscript: null });
    expect(html).toContain(">Day one<");
    // the pill row holds ONLY Day one — no tenure, no achievement
    expect(sliceBetween(html, "os-pills", "os-counters")).not.toContain("Querying since");
    expect(html).toContain("Every query you send and every reply that comes back will be charted here.");
    expect(html).toContain("Send your first query");
    /* ⚠️ the header's day-one line folded into the shared empty state (v16 §4) — the "yet" it
       carried is said properly by the BODY copy below it, so nothing was lost but a duplicate */
    expect(html).toContain("Nothing needs you");
    expect(html).toContain("Tasks appear here as your queries progress.");
    expect(html).toContain("Add your manuscript");
    expect(html).toContain("Add an agent");
    expect(html).toContain("The story starts with your first query.");
  });

  /* ⚠️ EARLY DAYS SUPPRESSES THE ACHIEVEMENT PILL even though §7's fallback is always true — §9
     is explicit, and a day-three account told "2 queries awaiting a reply" as an ACHIEVEMENT is
     the padding the facts-only rule exists to stop. The chart's chip carries that fact instead. */
  it("early days: the tenure pill only; the chart chip is the awaiting count", () => {
    const html = render({ queries: [q({ dateSent: daysAgo(3) }), q({ dateSent: daysAgo(9) })] });
    expect(html).toContain("Querying since");
    expect(html).not.toContain("os-pill ach");
    expect(html).toContain("awaiting a reply");
  });

  it("settled: both pills, achievement second", () => {
    const html = render(); // base fixture: first send 30 days ago
    expect(html).toContain("os-pill ach");
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
