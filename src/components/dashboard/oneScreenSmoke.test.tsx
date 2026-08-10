/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the one-screen dashboard's scaffold (spec §1, §2, §8; P2).
 * Whole-string assertions; CSS asserted against RULES with comments stripped (the tombstone trap).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, UserPlan } from "../../types";
import { OneScreenDashboard } from "./OneScreenDashboard";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => {
  const i = cssRules.indexOf(sel + " {");
  expect(i, `oneScreen.css must define ${sel}`).toBeGreaterThan(-1);
  return cssRules.slice(i, cssRules.indexOf("}", i));
};

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

  it("the grid is v16's: minmax(0,1fr) 287px, capped 1660 and centred", () => {
    const c = rule(".os-content");
    expect(c).toContain("grid-template-columns: minmax(0, 1fr) 287px");
    expect(c).toContain("max-width: 1660px");
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
  it("⚠️ the header spans both columns; row 2 is minmax(0,1fr), never auto", () => {
    const c = rule(".os-content");
    expect(c).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(c).not.toContain("align-content: start");
    expect(c).toContain("height: 100%");
    expect(cssRules).toContain(".os-greet { grid-column: 1 / -1; grid-row: 1; }");
    expect(cssRules).toContain(".os-colM { grid-column: 1; grid-row: 2; }");
  });

  /* the columns take the row they are given and nothing escapes them */
  it("both columns are height:100% with overflow hidden", () => {
    const c = rule(".os-colM, .os-colR");
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

  /* ⚠️ THE TILE IS SQUARE BECAUSE BOTH NUMBERS ARE THE SAME ONE. Asserted as an identity, not
     as two literals that happen to agree — if the row height moves and the width does not, this
     is what says so. */
  it("the midrow is a FIXED 302px, and the author tile is SQUARE", () => {
    const m = rule(".os-midrow");
    const w = /grid-template-columns: (\d+)px minmax\(0, 1fr\)/.exec(m)?.[1];
    const h = /height: (\d+)px/.exec(m)?.[1];
    expect(w, "the midrow must declare an explicit author width").toBeDefined();
    expect(h, "the midrow must declare an explicit height").toBeDefined();
    expect(w).toBe(h);
    expect(m).toContain("flex: 0 0 auto");
  });

  /* the rail narrowed 25% at every step so the chart gets the width; the proportion is the point,
     so all three steps move together or the page reads differently at each breakpoint */
  it("the rail's three widths are one 25% reduction, not one hand-tuned number", () => {
    for (const px of ["287px", "262px", "240px"]) {
      expect(cssRules, px).toContain(`grid-template-columns: minmax(0, 1fr) ${px}`);
    }
    for (const old of ["383px", "350px", "320px"]) {
      expect(cssRules, old).not.toContain(`minmax(0, 1fr) ${old}`);
    }
  });

  it("⚠️ the rail spaces with MARGINS, not gap — a collapsing panel takes its spacing with it", () => {
    /* the shared `.os-colM, .os-colR` rule sits first, so the naive first-match lookup lands on
       it; assert the standalone declarations verbatim instead */
    expect(cssRules).toContain(".os-colR { gap: 0; }");
    expect(rule(".os-colR > *")).toContain("margin-bottom: 13px");
  });

  it("the vertical budget: the chart flexes, tasks are content-driven 118–318", () => {
    expect(rule(".os-colM .os-lead")).toContain("flex: 1 1 auto");
    const t = rule(".os-colM .os-tasks");
    expect(t).toContain("min-height: 118px");
    expect(t).toContain("max-height: 318px");
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
    /* ⚠️ RETARGETED (polish P7): the header pill reads "out with agents" now — same number,
       and the writer is the subject of it. The CHART chip below still says "awaiting a reply";
       that string was not in the pack's scope and is flagged in reports/dashboard-polish.md. */
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
    expect(html.slice(html.indexOf("os-pills"), html.indexOf("os-counters"))).not.toContain("Querying since");
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
    expect(cssRules).toContain(".os-colM .os-aut.enter");
    expect(cssRules).not.toContain(".os-colR .os-aut.enter");
    expect(cssRules).toContain(".os-colM .os-probanner.enter");
  });
});
