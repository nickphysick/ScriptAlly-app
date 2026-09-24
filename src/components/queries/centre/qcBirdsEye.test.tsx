/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Birds-eye view, rendered (v65 §6) — and, more to the point, what it does NOT do: derive.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Agent, Query, QueryStatus } from "../../../types";
import { buildQcRows } from "../../../lib/qcSummary";
import { dueCell, eyeGroups, eyeRows } from "../../../lib/qcBirdsEye";
import { attentionCounts } from "../../../lib/qcCalView";
import { BE_HAWK_HEAD } from "./qcArt";
import { QcBirdsEye } from "./QcBirdsEye";

const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const read = (rel: string) => decls(readFileSync(join(process.cwd(), rel), "utf8"));
const css = read("src/components/queries/centre/qcvBirdsEye.css");
const src = read("src/components/queries/centre/QcBirdsEye.tsx");
const rule = (sel: string) => {
  const m = css.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  expect(m, `${sel} has no rule`).toBeTruthy();
  return m![1];
};

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 23, 12);
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
let n = 0;
const mkQ = (over: Partial<Query> = {}): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(20), ...over,
});
const agent = (over: Partial<Agent> = {}): Agent => ({ id: "a1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 8, ...over } as Agent);
const rowsOf = (qs: Query[]) => buildQcRows(qs, [agent()], [], NOW);
const view = (qs: Query[] = [mkQ()]) => renderToStaticMarkup(<QcBirdsEye rows={rowsOf(qs)} nowMs={NOW} onExpand={() => {}} />);

describe("the view, rendered", () => {
  it("head, focus, axis, rows, legend — in that order and nothing else", () => {
    const html = view();
    const order = ["be-head", "be-focus", "be-axis", "be-scroll", "be-key"].map((p) => html.indexOf(`data-qcv="${p}"`));
    expect(order.every((i) => i > -1), JSON.stringify(order)).toBe(true);
    expect([...order].sort((a, b) => a - b), "the column is out of order").toEqual(order);
  });
  it("⚠️ the geometry is the LIB's — this file places percentages and derives nothing", () => {
    /* the fault this forecloses is a second copy of the seventy-day scale in the component, which
       would drift from the locked one the first time either was retuned */
    for (const forbidden of ["TRACK_DAYS", "86_400_000", "86400000", "/ DAY", "* DAY", "expectedMs", "stageStartMs"]) {
      expect(src, `${forbidden} — the view is doing arithmetic`).not.toContain(forbidden);
    }
    expect(src, "it must read the lib").toContain('from "../../../lib/qcBirdsEye"');
  });
  it("a bar carries its own left and width as percentages, and its stage's colour", () => {
    const html = view([mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(4) })]);
    const bar = /<i class="qcv-be-bar[^"]*"[^>]*style="([^"]*)"/.exec(html)?.[1] ?? "";
    expect(bar).toMatch(/left:\s*[\d.]+%/);
    expect(bar).toMatch(/width:\s*[\d.]+%/);
    expect(bar, "the bar is not in the app's status vocabulary").toContain("--qcv-state:var(--state-");
  });
  it("⚠️ the rust inset is the WITH-YOU court's, and an offer counts as yours here", () => {
    const mine = view([mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(4) })]);
    const offer = view([mkQ({ status: QueryStatus.OFFER, offerDate: ago(4) })]);
    const theirs = view([mkQ()]);
    expect(mine).toContain("qcv-be-bar--you");
    expect(offer, "an offer's decision is yours — the page's three courts, not the four-way one").toContain("qcv-be-bar--you");
    expect(theirs).not.toContain("qcv-be-bar--you");
  });
  it("⚠️ the line is drawn on the ROWS, never on the scroller", () => {
    const html = view([mkQ(), mkQ({ status: QueryStatus.PARTIAL_SENT, partialSentDate: ago(3) })]);
    /* the line must be inside a `be-rows`, and `be-rows` inside `be-scroll` — so the line is
       exactly as tall as the rows it measures rather than running on into empty space */
    const rows = html.indexOf('data-qcv="be-rows"');
    const line = html.indexOf('data-qcv="be-line"');
    const scroll = html.indexOf('data-qcv="be-scroll"');
    expect(scroll).toBeLessThan(rows);
    expect(rows).toBeLessThan(line);
    expect(rule(".qcv-be-rows")).toMatch(/position:\s*relative/);
    expect(rule(".qcv-be-line")).toMatch(/top:\s*0;\s*bottom:\s*0/);
  });
  it("group headings carry their count, and Overdue's is ink", () => {
    const html = view([mkQ({ dateSent: ago(400) }), mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) })]);
    const gs = eyeGroups(rowsOf([mkQ({ dateSent: ago(400) }), mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) })]), NOW);
    for (const g of gs) expect(html, g.label).toContain(`${g.label}<span>${g.count}</span>`);
    expect(rule(".qcv-be-grp--overdue .qcv-be-gh")).toMatch(/color:\s*var\(--qcv-ink\)/);
  });
  it("⚠️ nothing out with an agent says so, rather than drawing an empty track", () => {
    expect(view([])).toContain("Nothing is out with an agent.");
    /* …and while it is loading it says nothing at all, rather than claiming the account is empty */
    expect(renderToStaticMarkup(<QcBirdsEye rows={[]} nowMs={NOW} loading onExpand={() => {}} />)).not.toContain("Nothing is out");
  });
});

describe("the sheet", () => {
  it("⚠️ the track's geometry is stated ONCE and every rule reads it", () => {
    const own = rule(".qcv-be");
    for (const t of ["--qcv-be-pad", "--qcv-be-who", "--qcv-be-day", "--qcv-be-gap", "--qcv-be-tl", "--qcv-be-tw"]) {
      expect(own, `${t} is not declared on the view`).toContain(t);
    }
    /* the line and the row read the same tokens — three rules each computing the track is three
       chances for one of them to be a pixel out, on the element whose whole job is to line up */
    expect(rule(".qcv-be-line")).toMatch(/left:\s*calc\(var\(--qcv-be-tl\) \+ var\(--qcv-be-tw\) \* 0\.5\)/);
    expect(rule(".qcv-be-row")).toMatch(/grid-template-columns:\s*var\(--qcv-be-who\) minmax\(0, 1fr\) var\(--qcv-be-day\)/);
    expect(rule(".qcv-be-row")).toMatch(/column-gap:\s*var\(--qcv-be-gap\)/);
    expect(rule(".qcv-be-row")).toMatch(/padding:\s*0 var\(--qcv-be-pad\)/);
  });
  it("⚠️ the rows are the only thing that scrolls, and the scroller has a floor of ZERO", () => {
    const sc = rule(".qcv-be-scroll");
    expect(sc).toMatch(/overflow-y:\s*auto/);
    /* without `min-height: 0` a flex child's floor is its CONTENT, so the rows push the card past
       the window instead of scrolling inside it — measured on four surfaces in this repo */
    expect(sc).toMatch(/min-height:\s*0/);
    expect(sc).toMatch(/flex:\s*1 1 auto/);
    for (const fixed of [".qcv-be-head", ".qcv-be-focus", ".qcv-be-axis", ".qcv-be-key"]) {
      expect(rule(fixed), `${fixed} must not grow or shrink`).toMatch(/flex:\s*none/);
    }
    /* and nothing in this view is sized to the viewport — the card's height is the window's */
    expect(css).not.toMatch(/\d(vh|dvh)/);
  });
  it("§6.1 · the focus toggle: 32px, the pressed segment white, and it FADES rather than hides", () => {
    expect(rule(".qcv-be-focus")).toMatch(/height:\s*32px/);
    expect(rule('.qcv-be-focus button[aria-pressed="true"]')).toMatch(/background:\s*#fff/);
    expect(rule(".qcv-be-row--fade")).toMatch(/opacity:\s*0\.22/);
    expect(rule(".qcv-be-row--fade:hover")).toMatch(/opacity:\s*0\.6/);
    /* ⚠️ a rule that HID the other court would make the toggle a second filter beside the
       sentence's, and the two would disagree about how many queries there are */
    expect(css, "the focus hides rows instead of fading them").not.toMatch(/\.qcv-be-row--fade[^{]*\{[^}]*display:\s*none/);
  });
  it("§1.6 · the initials disc is the shell's anthracite with cream initials", () => {
    const ini = rule(".qcv-be-ini");
    expect(ini).toMatch(/background:\s*var\(--sp-anthracite\)/);
    expect(ini).toMatch(/color:\s*#f5f1eb/);
    expect(ini).toMatch(/border-radius:\s*50%/);
  });
});

/* ── v65.2 §4 · the rail's header (lock 3) ────────────────────────────────────────────────────── */

describe("§4 · the header is a blush tray with the hawk behind the words", () => {
  it("the tray: 8px inside the card, 122 tall, 14px corners, and it does NOT clip", () => {
    const head = rule(".qcv-be-head");
    expect(head).toMatch(/margin: 8px 8px 0/);
    expect(head).toMatch(/height: 122px/);
    expect(head).toMatch(/border-radius: 14px/);
    expect(head).toMatch(/background: var\(--be-accent\)/);
    /**
     * ⚠️ THE TRAY MUST NOT CLIP, AND THE CLIP LAYER MUST. The toggle sits BELOW the tray and the
     * counts line's descenders reach its padding; a tray with `overflow: hidden` would cut both.
     * One element clips and it holds nothing but the picture — which is also what lets the picture
     * hang off the tray's bottom edge at all.
     */
    expect(head, "the tray clips, so it will cut text as well as the picture").not.toMatch(/overflow:\s*hidden/);
    const clip = rule(".qcv-be-clip");
    expect(clip).toMatch(/overflow: hidden/);
    expect(clip).toMatch(/border-radius: 14px/);
    expect(clip).toMatch(/z-index: 0/);
    expect(clip, "a clip layer that takes the pointer steals the tray's own clicks").toMatch(/pointer-events: none/);
  });
  it("⚠️ the picture is BEHIND the words by stacking order, and hangs off the bottom-right", () => {
    const hawk = rule(".qcv-be-hawk");
    expect(hawk).toMatch(/width: 102px/);
    expect(hawk).toMatch(/right: -14px/);
    expect(hawk).toMatch(/bottom: -36px/);
    /* every text child is above the clip layer's 0 — asserted per element, because one of them
       being left behind is exactly how a drawing ends up on top of a title */
    for (const sel of [".qcv-be-ttl", ".qcv-be-counts", ".qcv-be-ex"]) expect(rule(sel), `${sel} is not above the picture`).toMatch(/z-index: 1/);
  });
  it("the title, the counts line and the ⤢ are placed from the tray's own edges", () => {
    expect(rule(".qcv-be-ttl")).toMatch(/left: 19px; top: 32px/);
    expect(rule(".qcv-be-ttl")).toMatch(/font-size: 30px/);
    expect(rule(".qcv-be-ttl"), "a title that wraps would sit over the picture").toMatch(/white-space: nowrap/);
    expect(rule(".qcv-be-counts")).toMatch(/left: 20px; top: 74px/);
    expect(rule(".qcv-be-counts")).toMatch(/font-size: 8.5px/);
    expect(rule(".qcv-be-counts")).toMatch(/letter-spacing: 0.1em/);
    expect(rule(".qcv-be-ex")).toMatch(/top: 14px; right: 14px/);
    /* §4 — transparent with a ring, not a white disc: the tray is the fill it sits on */
    expect(rule(".qcv-be-ex")).toMatch(/background: none/);
    expect(rule(".qcv-be-ex")).toMatch(/box-shadow: inset 0 0 0 1px var\(--be-mute\)/);
  });
  it("§4 · the counts line reads the same function the expanded stat cards read", () => {
    const qs = [mkQ(), mkQ({ status: QueryStatus.PARTIAL_REQUESTED }), mkQ({ dateSent: ago(400) })];
    const rows = rowsOf(qs);
    const c = attentionCounts(rows, NOW);
    const html = view(qs);
    /* the rendered line IS the derivation's three numbers, in the stated order */
    expect(html).toContain(`<b>${c.overdue} overdue</b> · ${c.upcoming} upcoming · ${c.watch} waiting`);
    /* …and the source names the shared function rather than counting groups a second time */
    expect(src).toMatch(/attentionCounts\(loading \? \[\] : rows, nowMs\)/);
  });
  it("§4 · the toggle is OUT of the tray, 10px beneath it", () => {
    expect(rule(".qcv-be-focus")).toMatch(/margin: 10px 22px 0/);
    /**
     * …and it is a SIBLING of the tray, not a child — a child would be clipped by the layer above,
     * or would grow the tray past the 122 the design states.
     *
     * ⚠️ A DEPTH WALK, NOT A `</div>` SEARCH. "Some close tag sits between the two" is true of a
     * toggle nested three levels inside the tray, which is the fault this asserts against; phase 2
     * proved that form vacuous by moving an element back inside its parent and watching it pass.
     */
    const html = view();
    const headOpen = html.lastIndexOf("<div", html.indexOf('data-qcv="be-head"'));
    const focusAt = html.indexOf('data-qcv="be-focus"');
    expect(focusAt).toBeGreaterThan(headOpen);
    let depth = 0;
    for (const m of html.slice(headOpen, html.lastIndexOf("<", focusAt)).matchAll(/<(\/?)div\b/g)) depth += m[1] ? -1 : 1;
    expect(depth, "the toggle is nested inside the tray").toBe(0);
  });
  it("the hawk is the enrolled asset, at its recorded version", () => {
    expect(view()).toContain(`src="${BE_HAWK_HEAD.src}?v=${BE_HAWK_HEAD.version}"`);
  });
});

/* ── v65.2 §5 · the axis and the rows (lock 4) ────────────────────────────────────────────────── */

describe("§5 · the axis and the rows", () => {
  it("the axis shares the ROW's grid, so the pill cannot drift from the line", () => {
    const ax = rule(".qcv-be-axis");
    const row = rule(".qcv-be-row");
    const tracks = /grid-template-columns: ([^;]+);/.exec(ax)?.[1];
    expect(tracks, "the axis states no tracks").toBeTruthy();
    expect(row, "the row's tracks differ from the axis's").toContain(`grid-template-columns: ${tracks}`);
    expect(tracks).toBe("var(--qcv-be-who) minmax(0, 1fr) var(--qcv-be-day)");
    expect(ax).toMatch(/height: 22px/);
  });
  it("§5 · the right column is 52 and the columns do not gap", () => {
    const be = rule(".qcv-be");
    expect(be).toMatch(/--qcv-be-day: 52px/);
    expect(be, "a column gap moves the pill off the line the rows are measured against").toMatch(/--qcv-be-gap: 0px/);
  });
  it("⚠️ WAITING and OVERDUE are 30px from the LINE, never from the pill", () => {
    /* the pill's width is its text's, so measuring from its edges moves both labels the day the
       word changes — and the labels' whole job is to say which side of the line is which */
    expect(rule(".qcv-be-axl")).toMatch(/right: calc\(50% \+ 30px\)/);
    expect(rule(".qcv-be-axr")).toMatch(/left: calc\(50% \+ 30px\)/);
    expect(rule(".qcv-be-axl"), "the waiting side is the quiet one").toMatch(/color: var\(--qcv-ink-45\)/);
    expect(rule(".qcv-be-axr"), "the overdue side is bold ink").toMatch(/font-weight: 600; color: var\(--qcv-ink\)/);
    expect(rule(".qcv-be-axnow")).toMatch(/background: var\(--qcv-ink\)/);
    expect(rule(".qcv-be-axnow")).toMatch(/left: 50%/);
  });
  it("§5 · the due line is 1.5px ink at 70%", () => {
    const line = rule(".qcv-be-line");
    expect(line).toMatch(/width: 1.5px/);
    expect(line).toMatch(/background: var\(--qcv-ink\)/);
    expect(line).toMatch(/opacity: 0.7/);
    /* …and it is centred on the track's midpoint rather than offset to one side of it */
    expect(line).toMatch(/margin-left: -0.75px/);
  });
  /**
   * §1.8 — THE DATE AND THE DISTANCE ARE TWO FACTS AND THE ROW STATES BOTH. Either alone leaves the
   * reader doing arithmetic: "10d over" does not say which day, and "9 Sep" does not say whether it
   * has gone.
   */
  it("§5 · every row carries its due date over its distance, and the four cases read as they should", () => {
    const rows = eyeRows(rowsOf([mkQ({ dateSent: ago(400) }), mkQ()]), NOW);
    expect(rows.length).toBeGreaterThan(1);
    const html = view([mkQ({ dateSent: ago(400) }), mkQ()]);
    const cells = [...html.matchAll(/data-qcv="be-due" data-due="([a-z]+)"><b[^>]*>([^<]*)<\/b><u[^>]*>([^<]*)</g)];
    expect(cells.length, "no row states a due cell").toBe(rows.length);
    /* the four wordings, stated once here and derived in the library */
    const past = dueCell({ expectedMs: NOW - 10 * DAY } as never, NOW);
    expect([past.date === "—", past.distance, past.kind, past.urgent]).toEqual([false, "10d over", "past", true]);
    expect(dueCell({ expectedMs: NOW } as never, NOW).distance).toBe("Today");
    expect(dueCell({ expectedMs: NOW + 3 * DAY } as never, NOW).distance).toBe("In 3d");
    const none = dueCell({ expectedMs: null } as never, NOW);
    expect([none.date, none.distance, none.kind]).toEqual(["—", "No date", "none"]);
    /* ⚠️ THE SHEET UPPERCASES; the STRING does not. A screen reader should not be shouted at. */
    expect(rule(".qcv-be-due u")).toMatch(/text-transform: uppercase/);
    for (const c of cells) expect(c[3], `"${c[3]}" is already uppercase in the source`).not.toBe(c[3].toUpperCase());
  });
  it("§5 · an overdue row is washed across the WHOLE card, with a 3px ink edge", () => {
    const late = rule(".qcv-be-row--late");
    expect(late).toMatch(/background: #f8ebe3/);
    expect(late).toMatch(/box-shadow: inset 3px 0 0 var\(--qcv-ink\)/);
    expect(late).toMatch(/border-bottom-color: #efdcd1/);
    /**
     * ⚠️ AND IT ADDS NO BLEED, WHICH THE MOCK DOES AND WE MUST NOT COPY. Its rows sit in a container
     * inset by the gutter, so its overdue row needs `margin: 0 -22px` to reach the card's edges;
     * ours span the card already and hold the gutter as padding. Carrying the negative margin
     * across overshot by exactly that gutter — measured, 22px outside the card. The wash's reach is
     * a RENDERED claim and lives in `qcV65.measure.ts`; what belongs here is that nothing moves the
     * row's box, because that is what keeps its columns on every other row's.
     */
    expect(late, "a margin here moves the row off the card").not.toMatch(/margin/);
    expect(late, "a width here moves the row off the card").not.toMatch(/width/);
    expect(late, "padding here moves the columns out of step with every other row").not.toMatch(/padding/);
    /* and the class is on the rows whose date has gone, from the library's own answer */
    const html = view([mkQ({ dateSent: ago(400) })]);
    expect(html).toContain("qcv-be-row--late");
    expect(html).toContain('data-due="past"');
  });
});
