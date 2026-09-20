/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The v16 dashboard (18 Sep) — the quick actions, the Closed tile, the words and the type, on the
 * rendered page.
 *
 * ⚠️ REWRITTEN, NOT RETARGETED. This file locked "Where your queries stand" — five columns, a court
 * marking, an R&R/offer footer and a four-way reconciliation between the header, the breakdown and
 * the chart. v16 deletes that section outright, so the reconciliation it asserted has three of its
 * four terms missing. What survives with a subject is carried here: the figure the header hands the
 * chart, the closed tile's arithmetic, the language rule and the typewriter face.
 *
 * ⚠️ WHERE THE CLAIM IS A BOX — the page centred on its measure, the three cards one height, the
 * donut's arcs, the dots on the line — it is measured by `tests/e2e/dashStages.measure.ts`. This file
 * proves the markup, the words, the rules and the files.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, UserPlan, type Activity, type Agent, type Query } from "../../types";
import { OneScreenDashboard } from "./OneScreenDashboard";
import { OneScreenActions } from "./OneScreenActions";
import { OneScreenClosed } from "./OneScreenClosed";
import { ART_PAIRS, DASH_ART } from "../../lib/dashArt";
import { QUICK_ACTIONS } from "../../lib/dashActions";
import { closedTile } from "../../lib/dashClosed";
import { cssRule, cssRuleCount } from "../../test/cssRule";
import { sliceBetween } from "../../test/sliceBetween";

const css = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => cssRule(css, sel, "oneScreen.css");

/* ══ fixtures ══════════════════════════════════════════════════════════════════════════════ */

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const DAY = 86400000;
const ago = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();
let seq = 0;
const q = (status: QueryStatus, over: Record<string, unknown> = {}): Query =>
  ({ id: `s${++seq}`, userId: "u", agentId: "a1", manuscriptId: "m1", manuscriptTitle: "Tidewrack", status,
     dateSent: ago(40), ...over } as unknown as Query);
const act = (queryId: string, resultingStatus: QueryStatus, n: number): Activity =>
  ({ id: `t${++seq}`, queryId, manuscriptId: "m1", resultingStatus, date: ago(n), type: "Status Change",
     description: "" } as unknown as Activity);
const agent = (id: string, weeks?: number): Agent =>
  ({ id, userId: "u", name: id, agencyName: `${id} Lit`, submissionStatus: "Open",
     ...(weeks === undefined ? {} : { responseTimeWeeks: weeks }) } as unknown as Agent);

/** every live state, two closed shapes, a withdrawal and a draft — so every branch is entered */
const partialSent = q(QueryStatus.PARTIAL_SENT, { agentId: "w8" });
const passedAfterFull = q(QueryStatus.REJECTED, { lastStatusChange: ago(4) });
const QUERIES: Query[] = [
  q(QueryStatus.QUERIED, { dateSent: ago(70) }), q(QueryStatus.QUERIED),
  q(QueryStatus.PARTIAL_REQUESTED),
  partialSent,
  q(QueryStatus.FULL_REQUESTED), q(QueryStatus.FULL_REQUESTED),
  q(QueryStatus.REVISE_RESUBMIT),
  q(QueryStatus.OFFER),
  passedAfterFull,
  q(QueryStatus.NO_RESPONSE, { lastStatusChange: ago(2) }),
  q(QueryStatus.WITHDRAWN, { lastStatusChange: ago(3) }),
  q(QueryStatus.QUERIED, { dateSent: undefined }),
];
const ACTIVITIES: Activity[] = [
  act(partialSent.id, QueryStatus.PARTIAL_SENT, 7),
  act(passedAfterFull.id, QueryStatus.FULL_REQUESTED, 20),
  act(passedAfterFull.id, QueryStatus.REJECTED, 4),
];
const MS = { id: "m1", title: "Tidewrack", genre: "Fantasy", wordCount: 90000 } as any;

const base = {
  queries: QUERIES, agents: [agent("a1"), agent("w8", 8)], manuscripts: [MS],
  tasks: [] as any[], userTasks: [] as any[], activities: ACTIVITIES, taskFlags: [] as any[],
  currentUser: { id: "u", name: "Nick Physick", plan: UserPlan.FREE } as any,
  activeManuscript: MS,
  onNavigate: () => {}, onTaskAction: () => {}, updateUserProfile: async () => {},
  now: NOW,
};
const page = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(<OneScreenDashboard loading={false} {...base} {...over} />);
const num = (s: string) => Number(s.replace(/,/g, ""));
/* the rendered text of every element carrying the probe, with the markup's escapes read back */
const texts = (html: string, probe: string) =>
  [...html.matchAll(new RegExp(`data-probe-text="${probe}">([^<]*)<`, "g"))].map((m) => m[1].replace(/&amp;/g, "&"));

/* ══ the figure ════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ ONE LIVE COUNT ON THE PAGE, AND THE CHART IS HANDED IT. The breakdown used to be the third
 * reader of the same figure and the reconciliation ran four ways; two readers are left, and the
 * claim is the same one: nothing here types the total — each figure is read off the page and held
 * against the other, so a derivation that drifts fails rather than disagreeing quietly.
 */
describe("the header's figure is the chart's figure", () => {
  /* v33: the chart states its figure in its TITLE — "27 active queries" — where v16 stated it in an
     eyebrow ("27 out with agents"). Same number, same derivation; the probe follows it. */
  it("⚠️ 'N queries out' and 'N active queries' are the same number, read off the page", () => {
    const html = page();
    const header = /<b>([\d,]+)<\/b> quer(?:y|ies) out/.exec(html);
    expect(header, "the header must state a live count").not.toBeNull();
    const chart = /data-probe-text="chart-title">([\d,]+) active quer(?:y|ies)</.exec(html);
    expect(chart, "the chart must state the same one").not.toBeNull();
    expect(num(chart![1])).toBe(num(header![1]));
    /* the fixture must actually exercise it — a reconciliation over zero is satisfied by anything */
    expect(num(header![1])).toBeGreaterThan(0);
  });

  it("⚠️ while loading neither states a figure — never a zero", () => {
    const html = page({ loading: true });
    expect(html).not.toMatch(/<b>\d/);
    expect(html).not.toMatch(/\d+ (active|closed) quer/);
  });
});

/* ══ the quick actions ═════════════════════════════════════════════════════════════════════ */

describe("the quick actions", () => {
  const html = page();
  const qa = sliceBetween(html, 'data-probe="quick-actions"', 'data-probe="chart-card"', "the quick actions");

  /**
   * ⚠️ ONE TILE AND TWO LINES (v33 — the ref, and Nick). "Log a query" is what this card is for, so it
   * is the tile and it carries the quill; the other two are plain rows beneath it. The v16 card drew
   * three equal tiles, which said the three were equally likely. Its "no hero" claim is INVERTED here
   * on purpose; everything else it retired stays retired.
   */
  it("one tile and two rows, in the ref's order — and no large title", () => {
    const items = [...qa.matchAll(/data-action="(\w+)"/g)].map((m) => m[1]);
    expect(items).toEqual(["query", "record", "agent"]);
    expect(QUICK_ACTIONS.map((a) => [a.label, a.rank])).toEqual([["Log a query", "main"], ["Record a response", "minor"], ["Add an agent", "minor"]]);
    expect(qa.match(/class="os-qahero"/g) ?? []).toHaveLength(1);
    expect(qa.match(/class="os-qarow"/g) ?? []).toHaveLength(2);
    expect(qa).toMatch(/class="os-qahero" data-action="query"/);
    /* ⚠️ THE v34 MOCKUP (19 Sep): no header at all — the eyebrow and its sand band are gone, rule and
       element together — so the card is NAMED for assistive tech, and the tile is the frame's first child */
    expect(html).toMatch(/data-probe="quick-actions" role="group" aria-label="Quick actions" class="os-card os-lift os-qa"/);
    expect(qa).not.toContain("os-band");
    expect(qa).not.toContain("os-qaeyebrow");
    expect(qa).not.toContain("os-tone--sand");
    expect(qa).not.toContain("<h3");
    expect(qa).toMatch(/<div class="os-frame" data-probe="quick-actions-frame"><button type="button" class="os-qahero"/);
    for (const gone of ["os-qatile", "os-qastack", "os-qaart", "os-qaph", "os-qaic", "os-qasub", "os-protag", "os-qalist", "os-qafoot", "os-mount"]) {
      expect(qa, gone).not.toMatch(new RegExp(`["\\s]${gone}["\\s]`));
    }
    expect(qa).not.toContain("Querying ");
    expect(qa).not.toContain("querying-day");
  });

  /* ⚠️ ONE PICTURE, AND IT EXISTS. The per-tile art keys and their dashed placeholders are retired —
     only the main tile carries a drawing, so there is nothing left to wait for and nothing to caption. */
  it("the tile carries the quill — inert, unannounced — and each control ends in the ref's arrow", () => {
    expect(qa).toMatch(/<img class="os-qaquill" src="\/images\/dash\/quill\.png\?v=[0-9a-f]{8}"[^>]*alt=""/);
    expect(qa.match(/<img/g) ?? []).toHaveLength(1);
    expect(qa.match(/class="os-qaar"/g) ?? []).toHaveLength(3);
    const quill = rule(".os-qaquill");
    expect(quill).toContain("height: calc(100% - 78px)");
    expect(quill).toContain("top: 16px");
    expect(quill).toContain("pointer-events: none");
  });

  /* ⚠️ EVERY TILE IS AN EXISTING FLOW, reached the way the shell reaches it — the card is a second
     doorway, never a second door. The retired actions took their own flows with them. */
  it("every tile invokes a capture contract, and nothing else", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenActions.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toContain("invokeCapture(a.capture, onNavigate)");
    expect(src).not.toContain("onNavigate(\"manuscripts\"");
    expect(src).not.toContain("DashEmailDrop");
    for (const a of QUICK_ACTIONS) expect(["query", "record", "agent"]).toContain(a.capture);
  });

  it("while loading, the card keeps its words under the shimmer", () => {
    const loading = renderToStaticMarkup(<OneScreenActions loading onNavigate={() => {}} />);
    expect(loading).toContain("isload");
    expect(loading).toContain('aria-label="Quick actions"');
    expect(loading).toContain("Log a query");
  });
});

/* ══ the closed tile ═══════════════════════════════════════════════════════════════════════ */

describe("the closed tile", () => {
  const html = page();
  const cl = sliceBetween(html, 'data-probe="closed-tile"', 'class="os-row2"', "the closed tile");

  /* v33: the title is a sentence with the count, on the stone band; the eyebrow and the "All N" chip
     are retired — the way to all of them is each slice's own popup ("See all 9"). */
  it("the title is a sentence with the count, on the stone band, and nothing sits under it", () => {
    expect(html).toMatch(/class="os-card os-lift os-cl"/);
    expect(cl).toMatch(/<h3 class="os-cardttl" data-probe-text="closed-title">\d+ closed quer(?:y|ies)<\/h3>/);
    expect(cl).not.toContain("Where each one stopped");
    expect(cl).not.toMatch(/["\s]os-sub["\s]/);
    expect(cl).not.toContain("os-clall");
  });

  /* ⚠️ THE BUCKETS ARE MUTUALLY EXCLUSIVE AND SUM TO THE TOTAL — the arithmetic the tile's whole
     claim rests on. A withdrawal is the writer's decision rather than an outcome and is left out; a
     silence is "No reply" whatever stage it fell quiet at. */
  it("⚠️ the four counts sum to the headline, a withdrawal is left out, and silence is No reply", () => {
    /* ⚠️ RETARGETED (v33): the key states its counts as TALLIES and shows no numeral, so the figure is
       read off each tally's own `data-count` (it is also its aria-label); the total is the title's. */
    const total = num(/data-probe-text="closed-title">([\d,]+) closed/.exec(cl)![1]);
    const counts = [...cl.matchAll(/data-probe="tally" data-count="(\d+)"/g)].map((m) => Number(m[1]));
    expect(counts).toHaveLength(4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(total);
    expect(total).toBe(2);
    const rows = [...cl.matchAll(/data-bucket="(\w+)"/g)].map((m) => m[1]);
    /* the arcs carry the same buckets in the same order as the key — one order, drawn twice */
    expect(rows.slice(-4)).toEqual(["quiet", "letter", "partial", "full"]);
    /* the page's tile is the lib's, over the page's own scoped sets */
    expect(total).toBe(closedTile(QUERIES, ACTIVITIES).total);
  });

  /* ⚠️ A ZERO ROW IS QUIET, NOT ABSENT — a row that vanishes states nothing; a muted one states
     "none of these", which is the fact the tile exists to give. */
  it("a zero bucket keeps its row and goes quiet", () => {
    expect(cl.match(/class="os-clrow z"/g) ?? []).not.toHaveLength(0);
    expect(cl.match(/data-probe="closed-row"/g) ?? []).toHaveLength(4);
    expect(rule(".os-clrow.z")).toContain("opacity: 0.45");
    /* …and a quiet row is not a control: nothing to hover, nothing to pin */
    const quietRow = /<div class="os-clrow[^"]* z"[^>]*>/.exec(cl)![0];
    expect(quietRow).not.toContain("tabindex");
    expect(quietRow).not.toContain('role="button"');
  });

  it("⚠️ while loading: the words and no figure", () => {
    const loading = renderToStaticMarkup(<OneScreenClosed loading tile={null} onSeeAll={() => {}} />);
    expect(loading).toContain('data-probe-text="closed-title">Closed queries</h3>');
    expect(loading).not.toMatch(/data-probe="tally"/);
    expect(loading).not.toMatch(/\d+ closed/);
  });
});

/* ══ the words ═════════════════════════════════════════════════════════════════════════════ */

describe("⚠️ the words say how far a query got, never a verdict", () => {
  it("no 'rejected', no 'ghosted', no 'overdue' anywhere on the page, in any state", () => {
    for (const html of [page(), page({ loading: true }), page({ queries: [] })]) {
      const words = html.replace(/<[^>]+>/g, " ").toLowerCase();
      expect(words).not.toMatch(/reject|ghost|overdue/);
    }
  });

  /* ⚠️ NO MARK IN ANY HEADER (v16, and still true in v33). The page HAS illustrations now — the quill,
     the Mentor, the Archivist — and every one of them lives in its card's CONTENT, never in a band.
     A mark in a header is still someone reading that as an oversight, and the old hawk is still off. */
  it("⚠️ no card carries a header mark, and the old hawk is not back", () => {
    for (const f of ["OneScreenChart", "OneScreenClosed", "OneScreenFeed", "OneScreenTasks"]) {
      const src = readFileSync(resolve(__dirname, `./${f}.tsx`), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(src, `${f} carries a mark`).not.toContain("OneScreenMark");
    }
    expect(page()).not.toContain("active-query-hawk.png");
  });
});

/* ══ the rules ═════════════════════════════════════════════════════════════════════════════ */

describe("the rules", () => {
  /**
   * ⚠️ THE TYPEWRITER FACE IS STATED ONCE AND READ BY FOUR RULES. A `var()` whose custom property is
   * declared NOWHERE is invalid at computed-value time and the declaration is simply dropped, with no
   * error and nothing to point at — this token was lost for one build of the v16 rewrite and every
   * heading quietly fell back to the body serif.
   *
   * ⚠️ AND THE HEADINGS NEED `!important` PLUS TWO CLASSES, against `lib/brand.tsx`. That script
   * injects `h1:not(.wsh-title){font-family:…!important}` and `h3{…!important}` at runtime on every
   * route; between two `!important` declarations the more specific selector wins.
   */
  it("⚠️ the typewriter face is stated once, and every heading that needs it out-ranks the brand script", () => {
    expect(rule(".os-root")).toContain('--os-type: "Special Elite", "Courier New", Courier, monospace');
    expect(css.match(/Special Elite/g) ?? []).toHaveLength(1);
    for (const sel of [".os-greet .os-hello", ".os-cardttl"]) {
      expect(rule(sel), sel).toMatch(/font-family: var\(--os-type\)\s*!important/);
    }
    for (const sel of [".os-qaherolab", ".os-qarowlab"]) expect(rule(sel), sel).toContain("font-family: var(--os-type)");
  });

  /* ⚠️ THE TILE FILLS WHAT THE TWO LINES LEAVE, so the card never ends short of the two beside it; and
     every label is ONE line that scales with its own card (`cqw`), never with the window. */
  it("the quick actions' shapes are the ref's", () => {
    const hero = rule(".os-qahero");
    for (const d of ["flex: 1 1 0", "min-height: 0", "position: relative", "align-items: flex-end", "padding: 16px", "border-radius: 12px"]) {
      expect(hero, d).toContain(d);
    }
    expect(hero).toContain("background: var(--dash-parchment)");
    expect(rule(".os-qaherolab")).toContain("font-size: clamp(18px, 9.6cqw, 24px)");
    expect(rule(".os-qaherolab")).toContain("white-space: nowrap");
    expect(rule(".os-qarowlab")).toContain("font-size: clamp(14.5px, 6.8cqw, 17px)");
    expect(rule(".os-qarow")).toContain("padding: 13px 4px");
    expect(rule(".os-qarow:last-child")).toContain("border-bottom: 0");
    expect(rule(".os-qa > .os-frame")).toContain("padding: 18px 18px 12px");
    expect(css.replace(/\/\*[\s\S]*?\*\//g, ""), "the eyebrow's rule went with the eyebrow").not.toMatch(/\.os-qaeyebrow[\s{,]/);
  });

  /* ⚠️ THE DONUT'S FOUR FILLS ARE TOKENS, and the key's four swatches read the SAME four — the ring
     and the key are one statement drawn twice, so a retune cannot move one and not the other. */
  it("the closed tile's ring and key read one set of tokens", () => {
    for (const k of ["quiet", "letter", "partial", "full"]) {
      expect(rule(`.os-dnarc--${k}`)).toBe(` stroke: var(--dash-${k}); `);
      expect(rule(`.os-dnsw--${k}`)).toBe(` background: var(--dash-${k}); `);
    }
    const root = rule(".os-root");
    for (const t of ["--dash-quiet:", "--dash-letter:", "--dash-partial:", "--dash-full:"]) {
      expect(root, t).toContain(t);
    }
    /* the retired bar-chart key went with the tile it drew */
    for (const sel of [".os-cltrack", ".os-clfill--letter", ".os-clrows", ".os-clnum", ".os-cltitle", ".os-clsub2"]) {
      expect(cssRuleCount(css, sel), sel).toBe(0);
    }
  });
});

/* ══ the artwork ═══════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ SEVEN FILES, ONE CHECK EACH, AND THE SWEEP READS THE TABLE (v33). Whatever `DASH_ART` draws is
 * checked the day it lands: versioned by its own bytes, the size it declares, transparent, and small.
 * The old hawk's file is deliberately KEPT (`ACTIVE_QUERY_ART`) and is not drawn.
 */
describe("the artwork", () => {
  it("the table is the v33 set — the sweep below cannot pass by reading nothing", () => {
    expect(Object.keys(DASH_ART).sort()).toEqual(["archivist", "archivistLooking", "courier", "mentor", "mentorLooking", "quill", "shadow"]);
  });

  /* ⚠️ THE TWO PAIRS REGISTER TO THE PIXEL ONLY WHILE THEY SHARE A CANVAS. Trimming either file to its
     own alpha bounds gives the two different boxes and the hover swap jumps — so the two files of a
     pair must declare, and BE, one size. */
  for (const [a, b] of ART_PAIRS) {
    it(`⚠️ ${a} / ${b}: one canvas`, () => {
      expect([DASH_ART[a].width, DASH_ART[a].height]).toEqual([DASH_ART[b].width, DASH_ART[b].height]);
      const size = (k: keyof typeof DASH_ART) => { const png = readFileSync(resolve(__dirname, "../../..", "public" + DASH_ART[k].src)); return [png.readUInt32BE(16), png.readUInt32BE(20)]; };
      expect(size(a)).toEqual(size(b));
    });
  }

  it("⚠️ the greeting's shadow is the SOLID file — its soft edge kept exactly, 256 alpha levels", () => {
    const png = readFileSync(resolve(__dirname, "../../..", "public" + DASH_ART.shadow.src));
    expect(png[25], "a palette").toBe(3);
    const at = png.indexOf(Buffer.from("tRNS"));
    expect(at).toBeGreaterThan(0);
    expect(png.readUInt32BE(at - 4), "one palette entry per alpha level — the edge is not quantised").toBe(256);
    /* …and it is not the landing page's pre-toned file, which would be invisible at 8% */
    expect(DASH_ART.shadow.src).not.toBe("/images/hawk-shadow.png");
  });

  for (const [key, art] of Object.entries(DASH_ART)) {
    it(`${key}: versioned by its own bytes, its stated size, transparent, and under 300KB`, () => {
      const file = resolve(__dirname, "../../..", "public" + art!.src);
      const png = readFileSync(file);
      expect(art!.version, "the version IS the file").toBe(createHash("md5").update(png).digest("hex").slice(0, 8));
      expect(png.toString("latin1", 12, 16)).toBe("IHDR");
      expect(png.readUInt32BE(16)).toBe(art!.width);
      expect(png.readUInt32BE(20)).toBe(art!.height);
      expect(statSync(file).size).toBeLessThanOrEqual(300 * 1024);
      /* RGBA or a palette with transparency — either way, no opaque field behind the drawing */
      expect([3, 6]).toContain(png[25]);
      if (png[25] === 3) expect(png.includes(Buffer.from("tRNS"))).toBe(true);
    });
  }
});
