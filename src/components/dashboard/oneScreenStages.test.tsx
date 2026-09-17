/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard stages 2–3 (17 Sep) — "Where your queries stand", the quick actions, and the Closed tile,
 * on the rendered page.
 *
 * ⚠️ THE RECONCILIATION NICK ASKED FOR IS ASSERTED ON THE RENDERED PAGE, FIGURE AGAINST FIGURE: the
 * header's "queries out", the breakdown's meta, its five columns plus the R&R/offer line, and the chart's
 * headline. Nothing here types the total; each is read off the page and held against the others.
 *
 * ⚠️ WHERE THE CLAIM IS A BOX — the page centred on its measure, the three cards one height, the five
 * columns equal, the dots on the line — it is measured by `tests/e2e/dashStages.measure.ts`. This file
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
import { OneScreenBreakdown } from "./OneScreenBreakdown";
import { OneScreenActions } from "./OneScreenActions";
import { OneScreenClosed } from "./OneScreenClosed";
import { ACTIVE_QUERY_ART, QUICK_ACTIONS_ART } from "../../lib/dashArt";
import { QUICK_ACTIONS } from "../../lib/dashActions";
import { closedTile } from "../../lib/dashClosed";
import { cssRule } from "../../test/cssRule";
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
/* Full sent has nobody in it here — the zero column is part of the fixture on purpose */
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

/* ══ the breakdown ═════════════════════════════════════════════════════════════════════════ */

describe("where your queries stand", () => {
  const html = page();
  const bd = sliceBetween(html, '<section class="os-bd" data-probe="breakdown">', '<div class="os-row2"', "the breakdown");

  it("the heading and its count, on the page ground, with the manuscript's title", () => {
    expect(bd).toContain('<h2 class="os-bdtitle">Where your queries stand</h2>');
    expect(bd).toContain('<span class="os-bdmeta" data-probe-text="breakdown-meta">8 queries · Tidewrack</span>');
    /* the header is not inside the card */
    expect(bd.indexOf("os-bdhead")).toBeLessThan(bd.indexOf("os-mount"));
  });

  it("five columns, in the pipeline's order, each a count, a pill and a fact", () => {
    const cols = [...bd.matchAll(/<div class="os-bdcol([^"]*)" data-probe="breakdown-col" data-status="([^"]+)">/g)];
    expect(cols.map((m) => m[2])).toEqual([
      QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
    ]);
    expect(texts(bd, "breakdown-count").map(num)).toEqual([2, 1, 1, 2, 0]);
    for (const label of ["Queried", "Partial req", "Partial sent", "Full req", "Full sent"]) {
      expect(bd).toContain(`<span class="os-spill-l">${label}</span>`);
    }
  });

  it("⚠️ the two requested columns are marked, and only they; an empty column is quiet but present", () => {
    const flags = [...bd.matchAll(/<div class="os-bdcol([^"]*)" data-probe="breakdown-col" data-status="([^"]+)">/g)]
      .map((m) => [m[2], m[1].trim()]);
    expect(flags).toEqual([
      [QueryStatus.QUERIED, ""],
      [QueryStatus.PARTIAL_REQUESTED, "court"],
      [QueryStatus.PARTIAL_SENT, ""],
      [QueryStatus.FULL_REQUESTED, "court"],
      [QueryStatus.FULL_SENT, "zero"],
    ]);
  });

  it("the facts: the oldest wait, the writer's court, and a reply date somebody stated", () => {
    const facts = [...bd.matchAll(/<span class="os-bdfact">([^<]*)<\/span>/g)].map((m) => m[1]);
    const dueMs = new Date(ago(7)).getTime() + 56 * DAY;
    const due = new Date(dueMs);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    expect(facts).toEqual([
      "oldest 70 days",
      "in your court",
      `reply due ${due.getDate()} ${months[due.getMonth()]}`,
      "in your court",
      "",
    ]);
  });

  it("⚠️ header = meta = columns + the R&R/offer line = the chart's headline, read off the page", () => {
    const header = num(/<b>([\d,]+)<\/b>/.exec(sliceBetween(html, 'data-probe="hero"', '<section class="os-bd"', "the header"))![1]);
    const meta = num(texts(html, "breakdown-meta")[0].split(" ")[0]);
    const cols = texts(bd, "breakdown-count").map(num).reduce((a, b) => a + b, 0);
    const extras = texts(bd, "breakdown-extras")[0];
    expect(extras).toBe("Plus 1 R&R · 1 offer");
    const extra = extras.replace("Plus ", "").split(" · ").map((p) => num(p.split(" ")[0])).reduce((a, b) => a + b, 0);
    const chart = num(texts(html, "chart-figure")[0]);
    expect(header).toBe(meta);
    expect(cols + extra).toBe(meta);
    expect(chart).toBe(meta);
  });

  it("the R&R/offer line omits a zero half, and the whole line when both are zero", () => {
    const noOffer = page({ queries: QUERIES.filter((x) => x.status !== QueryStatus.OFFER) });
    expect(texts(noOffer, "breakdown-extras")).toEqual(["Plus 1 R&R"]);
    const neither = page({ queries: QUERIES.filter((x) => x.status !== QueryStatus.OFFER && x.status !== QueryStatus.REVISE_RESUBMIT) });
    expect(neither).not.toContain("os-bdfoot");
  });

  it("⚠️ while loading: the words and the boxes, and no figure anywhere in the section", () => {
    const loading = sliceBetween(page({ loading: true }), '<section class="os-bd" data-probe="breakdown">', '<div class="os-row2"', "the loading breakdown");
    expect(loading).toContain('data-probe-text="breakdown-meta">queries · Tidewrack<');
    expect(texts(loading, "breakdown-count")).toEqual(["", "", "", "", ""]);
    expect(loading).not.toContain("os-bdfoot");
    expect(loading).not.toMatch(/>\d/);
  });

  it("the ghost is the same component: the words stay, every figure is a block, nothing is probed", () => {
    const ghost = renderToStaticMarkup(<OneScreenBreakdown ghost breakdown={null} manuscriptTitle="Tidewrack" />);
    expect(ghost).not.toContain("data-probe");
    expect(ghost).toContain('data-sk="breakdown"');
    expect(ghost.match(/os-sk-bdn/g) ?? []).toHaveLength(5);
    expect(ghost).not.toMatch(/>\d/);
  });
});

/* ══ the quick actions ═════════════════════════════════════════════════════════════════════ */

describe("the quick actions", () => {
  const html = page();
  const qa = sliceBetween(html, 'data-probe="quick-actions"', 'data-probe="chart-card"', "the quick actions");

  it("one hero — the quill and the words, no subtitle — then the four actions in order", () => {
    expect(qa).toContain(`src="${QUICK_ACTIONS_ART.src}?v=${QUICK_ACTIONS_ART.version}"`);
    const hero = sliceBetween(qa, '<button type="button" class="os-mount os-mount--hero os-qahero">', "</button>", "the hero");
    expect(hero.replace(/<[^>]+>/g, "")).toBe("Log a new query");
    const items = [...qa.matchAll(/data-action="(\w+)"/g)].map((m) => m[1]);
    expect(items).toEqual(["record", "agent", "email", "package"]);
    expect(QUICK_ACTIONS.map((a) => [a.label, a.tone])).toEqual([
      ["Record a reply", "ink"], ["Add an agent", "slate"], ["Smart email drop", "ink"], ["New package", "ochre"],
    ]);
    for (const a of QUICK_ACTIONS) expect(qa).toContain(`os-qaic os-qaic--${a.tone}`);
  });

  it("⚠️ the Pro mark shows for a free writer and never for a paying one", () => {
    expect(qa.match(/class="os-protag"/g) ?? []).toHaveLength(1);
    const email = sliceBetween(qa, 'data-action="email"', "</button>", "the email action");
    expect(email).toContain('class="os-protag"');
    const pro = page({ currentUser: { ...base.currentUser, plan: UserPlan.PRO } });
    expect(pro).not.toContain('class="os-protag"');
  });

  it("the foot: the manuscript being queried, and which day of it this is", () => {
    const foot = sliceBetween(qa, 'data-probe="quick-actions-foot"', "</div>", "the foot");
    expect(foot).toContain('<span class="os-qaq">Querying <span class="os-qatitle">Tidewrack</span></span>');
    /* the first send was 70 days ago, and that day was day 1 */
    expect(foot).toContain('data-probe-text="querying-day">Day 71<');
  });

  it("⚠️ no day before the first query, and none while loading", () => {
    const fresh = page({ queries: [] });
    expect(fresh).not.toContain('data-probe-text="querying-day"');
    expect(page({ loading: true })).not.toContain('data-probe-text="querying-day"');
  });

  it("every action is an existing flow — the capture contracts, the paste flow, the Builder tab", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenActions.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toContain('invokeCapture("query", onNavigate)');
    expect(src).toContain('invokeCapture("record", onNavigate)');
    expect(src).toContain('invokeCapture("agent", onNavigate)');
    expect(src).toContain('onNavigate("manuscripts", "New package")');
    expect(src).toContain('React.lazy(() => import("./DashEmailDrop"))');
    /* ⚠️ EXHAUSTIVE: a fifth action does not compile until it says what it does */
    expect(src).toContain("const unhandled: never = key;");
    const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
    expect(app).toContain('if (subPageName === "New package") return "/manuscripts/packages?tab=builder";');
    const drop = readFileSync(resolve(__dirname, "./DashEmailDrop.tsx"), "utf8");
    expect(drop).toContain("createPortal(");
    expect(drop).toContain("document.body");
    expect(drop).toMatch(/isPro \? \(\s*<PasteEmailFlow/);
    expect(drop).toContain("<UpsellExplainer");
  });

  it("while loading, the card keeps its words under the shimmer and states no day", () => {
    const loading = renderToStaticMarkup(
      <OneScreenActions loading manuscriptTitle="Tidewrack" day={12} isPro={false} onNavigate={() => {}} />,
    );
    expect(loading).toContain("isload");
    expect(loading).not.toContain("Day 12");
  });
});

/* ══ the closed tile ═══════════════════════════════════════════════════════════════════════ */

describe("the closed tile", () => {
  const html = page();
  const cl = sliceBetween(html, 'data-probe="closed-tile"', 'data-probe="grid"', "the closed tile");

  it("the title and the way to all of them", () => {
    expect(cl).toContain('<h3 class="os-cltitle">Closed</h3>');
    expect(cl).toContain('<button type="button" class="os-clall">All 2 →</button>');
  });

  it("⚠️ the four counts sum to the headline, a withdrawal is left out, and silence is No reply", () => {
    const total = num(texts(cl, "closed-total")[0]);
    const counts = texts(cl, "closed-count").map(num);
    expect(counts).toHaveLength(4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(total);
    expect(total).toBe(2);
    const rows = [...cl.matchAll(/data-bucket="(\w+)"/g)].map((m) => m[1]);
    expect(rows).toEqual(["letter", "partial", "full", "quiet"]);
    expect(counts).toEqual([0, 0, 1, 1]);
    expect(cl).toContain('<span class="os-clsub2">1 got past the letter</span>');
    expect(cl).toContain('<p class="os-clfoot">1 replied · 1 went quiet</p>');
    /* the page's tile is the lib's, over the page's own scoped sets */
    expect(total).toBe(closedTile(QUERIES, ACTIVITIES).total);
  });

  it("⚠️ while loading: the words and no figure", () => {
    const loading = renderToStaticMarkup(<OneScreenClosed loading tile={null} onSeeAll={() => {}} />);
    expect(texts(loading, "closed-total")).toEqual([""]);
    expect(texts(loading, "closed-count")).toEqual(["", "", "", ""]);
    expect(loading).toContain(">All →<");
    expect(loading).toContain(">replied · went quiet<");
  });
});

/* ══ the words, across all three ═══════════════════════════════════════════════════════════ */

describe("⚠️ the words say how far a query got, never a verdict", () => {
  it("no 'rejected', no 'ghosted', no 'overdue' in any of the new sections, in any state", () => {
    for (const html of [page(), page({ loading: true }), page({ queries: [] })]) {
      const sections = [
        sliceBetween(html, '<section class="os-bd"', '<div class="os-row2"', "the breakdown"),
        sliceBetween(html, '<div class="os-row2"', 'data-probe="grid"', "the second row"),
      ].join(" ").replace(/<[^>]+>/g, " ").toLowerCase();
      expect(sections).not.toMatch(/reject|ghost|overdue/);
    }
  });

  it("⚠️ the chart carries no mark — its header's illustration is the hawk", () => {
    const src = readFileSync(resolve(__dirname, "./OneScreenChart.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toContain("OneScreenMark");
    expect(page()).toContain(`src="${ACTIVE_QUERY_ART.src}?v=${ACTIVE_QUERY_ART.version}"`);
  });
});

/* ══ the rules ═════════════════════════════════════════════════════════════════════════════ */

describe("the rules", () => {
  it("⚠️ the typewriter face is stated once, and every new heading reads it — the two h-tags out-ranking the brand script", () => {
    expect(rule(".os-root")).toContain('--os-type: "Special Elite", "Courier New", Courier, monospace');
    for (const sel of [".os-bd .os-bdtitle", ".os-cl .os-cltitle"]) {
      expect(rule(sel), sel).toContain("font-family: var(--os-type) !important");
    }
    for (const sel of [".os-qaherot", ".os-qatitle", ".os-acttl"]) {
      expect(rule(sel), sel).toContain("font-family: var(--os-type)");
    }
    /* one statement of the face in the page's new rules — the greeting's own is stage 1's */
    expect(css.match(/Special Elite/g) ?? []).toHaveLength(2);
  });

  it("the breakdown's heading: 23px; its count line mono 11px at .13em, capitals, muted, cut short when long", () => {
    expect(rule(".os-bd .os-bdtitle")).toContain("font-size: 23px");
    const m = rule(".os-bdmeta");
    for (const d of ['font-family: "JetBrains Mono", monospace', "font-size: 11px", "letter-spacing: 0.13em",
                     "text-transform: uppercase", "text-overflow: ellipsis", "overflow: clip"]) {
      expect(m, d).toContain(d);
    }
    /* ⚠️ IT CLAIMS NO WIDTH — a long title must not hold the page open on a phone */
    expect(m).toContain("width: 0");
    expect(m).toContain("flex: 1 1 0");
    expect(rule(".os-bdhead")).toContain("align-items: baseline");
  });

  it("⚠️ the mount: a parchment rim of even padding round a REAL clipping frame, in burgundy", () => {
    const m = rule(".os-mount");
    expect(m).toContain("background-color: #fdfaf5");
    const inner = rule(".os-mount-in");
    for (const d of ["border: 1px solid #7c3a2a", "background-color: #ffffff", "overflow: hidden"]) expect(inner, d).toContain(d);
    const card = rule(".os-mount--card");
    expect(card).toContain("border-radius: 16px");
    expect(card).toContain("padding: 6px");
    expect(rule(".os-mount--card > .os-mount-in")).toContain("border-radius: 11px");
    const hero = rule(".os-mount--hero");
    expect(hero).toContain("border-radius: 13px");
    expect(hero).toContain("padding: 5px");
    expect(rule(".os-mount--hero > .os-mount-in")).toContain("border-radius: 9px");
    /* ⚠️ THE SHARED COMPONENT IS UNTOUCHED */
    const shared = readFileSync(resolve(__dirname, "../MountPanel.tsx"), "utf8");
    expect(shared).toContain("borderRadius: 14,");
    expect(shared).toContain("padding: 6,");
  });

  it("⚠️ five equal columns, the hairlines between them the grid's own gaps", () => {
    const g = rule(".os-bdgrid");
    expect(g).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(g).toContain("gap: 1px");
    const c = rule(".os-bdcol");
    for (const d of ["padding: 19px 10px 17px", "align-items: center", "text-align: center", "background-color: #ffffff"]) {
      expect(c, d).toContain(d);
    }
    const n = rule(".os-bdn");
    expect(n).toContain("font-size: 29px");
    expect(n).toContain("font-weight: 600");
    expect(rule(".os-bdcol > .os-spill, .os-bdcol > .os-sk-bdpill")).toContain("margin-top: 10px");
    const f = rule(".os-bdfact");
    expect(f).toContain("font-size: 11.5px");
    expect(f).toContain("min-height: 28px");
  });

  it("⚠️ the court columns: a warmer ground, a 3px rust bar on the bottom edge, the fact in rust — and a zero column goes quiet", () => {
    const court = rule(".os-bdcol.court");
    expect(court).toContain("background-color: #fcf8f6");
    expect(court).toContain("box-shadow: inset 0 -3px 0 #8a4a3c");
    expect(rule(".os-bdcol.court .os-bdfact")).toContain("color: #8a4a3c");
    expect(rule(".os-bdcol.zero .os-bdn")).toMatch(/color: #[0-9a-f]{6}/);
    expect(rule(".os-bdcol.zero .os-spill")).toContain("opacity: 0.55");
  });

  it("⚠️ the pill: the stage's glyph and words, mono 9px, on the app's state tokens — never a raw hex", () => {
    const p = rule(".os-spill");
    for (const d of ['font-family: "JetBrains Mono", monospace', "font-size: 9px", "letter-spacing: 0.08em",
                     "text-transform: uppercase", "padding: 4px 9px 4px 6px", "border-radius: 20px", "color: #2a1f18"]) {
      expect(p, d).toContain(d);
    }
    for (const [tone, token] of [["queried", "--state-queried"], ["you", "--state-you"], ["agent", "--state-agent"], ["closed", "--state-closed"]]) {
      expect(rule(`.os-spill--${tone}`)).toBe(` background-color: var(${token}); `);
    }
    /* the tokens resolve here: they are declared at :root, not on a page's theme class */
    const f12 = readFileSync(resolve(__dirname, "../shell/f12.css"), "utf8");
    const rootBlock = sliceBetween(f12, "\n:root {", "\n}", "the state tokens' root block");
    for (const t of ["--state-queried:", "--state-you:", "--state-agent:", "--state-closed:"]) expect(rootBlock, t).toContain(t);
    /* and the pill label keeps the pill's face — the brand script names bare spans */
    expect(rule(".os-spill-l")).toContain("font-family: inherit");
    expect(rule(".os-bdfoot")).toContain('font-family: "JetBrains Mono", monospace');
  });

  it("the quick actions' shapes are the brief's", () => {
    const hero = rule(".os-qahero-in");
    for (const d of ["display: flex", "gap: 11px", "padding: 9px 13px 9px 9px"]) expect(hero, d).toContain(d);
    const art = rule(".os-qaart");
    for (const d of ["width: 52px", "height: 52px", "object-fit: contain"]) expect(art, d).toContain(d);
    expect(rule(".os-qaherot")).toContain("font-size: 18px");
    expect(rule(".os-qalist")).toContain("gap: 7px");
    const item = rule(".os-qaitem");
    for (const d of ["padding: 10px 12px", "border-radius: 10px", "background-color: #f5f1eb", "font-size: 14px"]) {
      expect(item, d).toContain(d);
    }
    const ic = rule(".os-qaic");
    expect(ic).toContain("width: 16px");
    expect(ic).toContain("height: 16px");
    const foot = rule(".os-qafoot");
    expect(foot).toContain("margin-top: auto");
    expect(foot).toContain("border-top: 1px solid");
    const day = rule(".os-qaday");
    expect(day).toContain("font-size: 9.5px");
    expect(day).toContain('font-family: "JetBrains Mono", monospace');
  });

  it("the closed tile's shapes are the brief's, and its four fills are its own", () => {
    expect(rule(".os-cl .os-cltitle")).toContain("font-size: 20px");
    const all = rule(".os-clall");
    expect(all).toContain("font-size: 13px");
    expect(all).toContain("text-decoration: underline");
    expect(rule(".os-clnum")).toContain("font-size: 33px");
    const rows = rule(".os-clrows");
    expect(rows).toContain("gap: 7px");
    expect(rule(".os-clrow")).toContain("grid-template-columns: 106px minmax(0, 1fr) 20px");
    const track = rule(".os-cltrack");
    expect(track).toContain("height: 10px");
    expect(track).toContain("background-color: #f4f1ec");
    expect([["letter", "#8a4a3c"], ["partial", "#b07a6e"], ["full", "#d6b3aa"], ["quiet", "#cdc7bd"]]
      .map(([k, hex]) => rule(`.os-clfill--${k}`).includes(`background-color: ${hex}`))).toEqual([true, true, true, true]);
    expect(rule(".os-clct")).toContain("text-align: right");
    const foot = rule(".os-clfoot");
    expect(foot).toContain("margin: auto 0 0");
    expect(foot).toContain("border-top: 1px solid");
  });
});

/* ══ the two pictures ══════════════════════════════════════════════════════════════════════ */

describe("the two pictures", () => {
  for (const art of [ACTIVE_QUERY_ART, QUICK_ACTIONS_ART]) {
    it(`${art.src}: versioned by its own bytes, its stated size, transparent, and under 300KB`, () => {
      const file = resolve(__dirname, "../../..", "public" + art.src);
      const png = readFileSync(file);
      expect(art.version, "the version IS the file").toBe(createHash("md5").update(png).digest("hex").slice(0, 8));
      expect(png.toString("latin1", 12, 16)).toBe("IHDR");
      expect(png.readUInt32BE(16)).toBe(art.width);
      expect(png.readUInt32BE(20)).toBe(art.height);
      expect(statSync(file).size).toBeLessThanOrEqual(300 * 1024);
      /* RGBA or a palette with transparency — either way, no opaque field behind the drawing */
      expect([3, 6]).toContain(png[25]);
      if (png[25] === 3) expect(png.includes(Buffer.from("tRNS"))).toBe(true);
    });
  }
});
