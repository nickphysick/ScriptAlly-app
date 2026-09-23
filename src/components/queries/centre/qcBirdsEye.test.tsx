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
import { eyeGroups } from "../../../lib/qcBirdsEye";
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
