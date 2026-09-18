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
import { QUICK_ART, ART_PLACEHOLDER } from "../../lib/dashArt";
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
  it("⚠️ 'N queries out' and 'N out with agents' are the same number, read off the page", () => {
    const html = page();
    const header = /<b>([\d,]+)<\/b> quer(?:y|ies) out/.exec(html);
    expect(header, "the header must state a live count").not.toBeNull();
    const chart = /data-probe-text="chart-eyebrow">(?:<span[^>]*>)?([\d,]+) out with agents/.exec(html);
    expect(chart, "the chart must state the same one").not.toBeNull();
    expect(num(chart![1])).toBe(num(header![1]));
    /* the fixture must actually exercise it — a reconciliation over zero is satisfied by anything */
    expect(num(header![1])).toBeGreaterThan(0);
  });

  it("⚠️ while loading neither states a figure — never a zero", () => {
    const html = page({ loading: true });
    expect(html).not.toMatch(/<b>\d/);
    expect(html).not.toMatch(/\d+ out with agents/);
  });
});

/* ══ the quick actions ═════════════════════════════════════════════════════════════════════ */

describe("the quick actions", () => {
  const html = page();
  const qa = sliceBetween(html, 'data-probe="quick-actions"', 'data-probe="chart-card"', "the quick actions");

  /**
   * ⚠️ THREE TILES, EACH A PICTURE AND A NAME (the ref, and Nick). The hero, the four-item list, the
   * sub-lines, the tones and the Pro mark are all retired: a tile is what it does, and the card's own
   * words are the card's title. The ref's markup carries a sub-line and hides it — the words were
   * "Request, pass, or R&R", the kind of explanation that is read once and then read past for ever.
   */
  it("three tiles, in the ref's order, each a picture and a name", () => {
    const items = [...qa.matchAll(/data-action="(\w+)"/g)].map((m) => m[1]);
    expect(items).toEqual(["query", "record", "agent"]);
    expect(QUICK_ACTIONS.map((a) => a.label)).toEqual(["Log a query", "Record a response", "Add an agent"]);
    /* no sub-text, no tone chips, no hero, no Pro mark — the retired furniture, absent */
    for (const gone of ["os-qahero", "os-qaic", "os-qasub", "os-protag", "os-qalist", "os-qafoot", "os-mount"]) {
      expect(qa, gone).not.toMatch(new RegExp(`["\\s]${gone}["\\s]`));
    }
    expect(qa).not.toContain("Querying ");
    expect(qa).not.toContain("querying-day");
  });

  /**
   * ⚠️ TWO OF THE THREE PICTURES DO NOT EXIST YET, AND THE TILE SAYS SO RATHER THAN SHRINKING. A
   * dashed square of the same 46px, captioned with the file's subject, holds the space the artwork
   * will take — so the day it lands nothing in this card moves. The placeholder is `aria-hidden`,
   * because "open letter" is a note to whoever draws it, not a label for a reader.
   */
  it("⚠️ a missing picture is a captioned placeholder of the same size, never an absence", () => {
    const drawn = Object.keys(QUICK_ART);
    expect(drawn, "the fixture must exercise both branches").toHaveLength(1);
    expect(qa.match(/class="os-qaart"/g) ?? []).toHaveLength(drawn.length);
    expect(qa.match(/class="os-qaph"/g) ?? []).toHaveLength(QUICK_ACTIONS.length - drawn.length);
    for (const a of QUICK_ACTIONS) {
      if (QUICK_ART[a.art]) continue;
      expect(qa).toContain(`<span class="os-qaph" aria-hidden="true">${ART_PLACEHOLDER[a.art]}</span>`);
    }
    /* the two shapes are ONE box, or the card relays out the day the artwork lands */
    const box = rule(".os-qaart, .os-qaph");
    expect(box).toContain("width: 46px");
    expect(box).toContain("height: 46px");
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
    expect(loading).toContain("Quick actions");
  });
});

/* ══ the closed tile ═══════════════════════════════════════════════════════════════════════ */

describe("the closed tile", () => {
  const html = page();
  const cl = sliceBetween(html, 'data-probe="closed-tile"', 'class="os-row2"', "the closed tile");

  it("the title, its eyebrow and the way to all of them", () => {
    expect(cl).toContain('<h3 class="os-cardttl">Closed</h3>');
    expect(cl).toContain('<p class="os-sub">Where each one stopped</p>');
    expect(cl).toContain('class="os-mini os-clall"');
    expect(cl).toMatch(/>All \d+<\/button>/);
  });

  /* ⚠️ THE BUCKETS ARE MUTUALLY EXCLUSIVE AND SUM TO THE TOTAL — the arithmetic the tile's whole
     claim rests on. A withdrawal is the writer's decision rather than an outcome and is left out; a
     silence is "No reply" whatever stage it fell quiet at. */
  it("⚠️ the four counts sum to the headline, a withdrawal is left out, and silence is No reply", () => {
    const total = num(texts(cl, "closed-total")[0]);
    const counts = texts(cl, "closed-count").map(num);
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
    expect(rule(".os-clrow.z, .os-clrow.z b")).toContain("color: var(--dash-ink-45)");
  });

  it("⚠️ while loading: the words and no figure", () => {
    const loading = renderToStaticMarkup(<OneScreenClosed loading tile={null} onSeeAll={() => {}} />);
    expect(texts(loading, "closed-total")).toEqual([""]);
    expect(texts(loading, "closed-count")).toEqual(["", "", "", ""]);
    expect(loading).toContain(">All</button>");
    expect(loading).toContain("Where each one stopped");
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

  /* ⚠️ NO MARK ON ANY CARD (v16) — the page's pictures are the three quick-action tiles, and the
     chart's hawk came off with them. A mark in a header is someone reading that as an oversight. */
  it("⚠️ no card on the page carries a mark, and the chart carries no illustration", () => {
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
    expect(rule(".os-qalab")).toContain("font-family: var(--os-type)");
  });

  /* ⚠️ EQUAL THIRDS, NOT THREE NATURAL HEIGHTS — the stack fills whatever height the row turns out
     to be, so the three tiles stay one object rather than three stacked buttons with a gap under them. */
  it("the quick actions' shapes are the ref's", () => {
    const stack = rule(".os-qastack");
    expect(stack).toContain("display: grid");
    /* equal thirds — the three tiles fill whatever height the row turns out to be */
    expect(stack).toMatch(/grid-template-rows: (?:1fr 1fr 1fr|repeat\(3, (?:minmax\(0, )?1fr\)?\))/);
    expect(stack).toContain("min-height: 0");
    expect(stack).toContain("gap: 10px");
    expect(stack).toContain("flex: 1");
    const tile = rule(".os-qatile");
    for (const d of ["display: flex", "align-items: center", "padding: 10px 14px 10px 10px", "border-radius: 12px"]) {
      expect(tile, d).toContain(d);
    }
    expect(tile).toContain("background: var(--dash-parchment)");
    expect(rule(".os-qalab")).toContain("font-size: 17px");
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
 * ⚠️ ONE PICTURE ON THE PAGE NOW, AND THE CHECK IS THE SAME. The hawk came off with v16 and its file
 * is deliberately KEPT (`lib/dashArt` still carries it, for the 96px slot the chart's header holds
 * open) — so the sweep reads what `QUICK_ART` actually draws rather than a list typed here, and an
 * asset added to that table is checked the day it lands.
 */
describe("the artwork", () => {
  for (const [key, art] of Object.entries(QUICK_ART)) {
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
