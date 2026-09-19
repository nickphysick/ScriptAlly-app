/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcList and QcOpenCard — the List view and the docked card, rendered. The column TEMPLATE is locked
 * here as a rule (floors, ceilings, the spare in the gaps, one template for head and rows); where
 * the columns actually land at 1280 / 1440 / 1720 is measured on a rendered page
 * (tests/e2e/qcV11.measure.ts) — a source lock cannot see a column.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Agent, Query, QueryStatus } from "../../../types";
import { buildQcRows, isWithYou } from "../../../lib/qcSummary";
import { MATERIAL_ROW_NAMES } from "../../../lib/agentMaterials";
import { MATERIAL_SLOTS } from "../../../lib/queryCardFacts";
import { QcList, QcListSkeleton } from "./QcList";
import { QcOpenCard, QcOpenCardSkeleton } from "./QcOpenCard";

const DAY = 86_400_000, NOW = Date.UTC(2026, 8, 19, 12);
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
let n = 0;
const q = (over: Partial<Query>): Query => ({ id: `q${++n}`, userId: "u", manuscriptId: "m", agentId: "a", packageId: "", personalisationNotes: "", sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(20), ...over });
const agent = { id: "a", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 4 } as Agent;
const rowsOf = (qs: Query[]) => buildQcRows(qs, [agent], [], NOW);
const ALL = Object.values(QueryStatus) as QueryStatus[];
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const sheet = (f: string) => decls(readFileSync(join(process.cwd(), "src/components/queries/centre", f), "utf8"));
const rule = (css: string, sel: string) => { const m = css.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`)); expect(m, `${sel} has no rule`).toBeTruthy(); return m![1]; };
const listCss = sheet("qcvList.css"), openCss = sheet("qcvOpen.css");

describe("the list's columns — one template, floors and ceilings, the spare in the gaps", () => {
  it("⚠️ the template is stated ONCE and read by the head AND every row; tracks are minmax(floor, ceiling), never content-sized", () => {
    expect(rule(listCss, ".qcv-list")).toMatch(/--qcv-tpl:\s*minmax\(186px, 256px\) minmax\(168px, 240px\) minmax\(78px, 96px\) 46px/);
    const shared = rule(listCss, ".qcv-cols, .qcv-row");
    expect(shared).toMatch(/grid-template-columns:\s*var\(--qcv-tpl\)/);
    expect(shared).toMatch(/column-gap:\s*var\(--qcv-tpl-gap\)/);
    expect(shared, "past the ceilings the spare goes into the GAPS").toMatch(/justify-content:\s*space-between/);
    expect(listCss.split("grid-template-columns").length - 1, "a second template somewhere would let head and rows disagree").toBe(2);
    expect(listCss).not.toMatch(/grid-template-columns:[^;]*(auto|max-content|min-content|fit-content)/);
    expect(listCss, "display: contents fractures a row's hover and selection").not.toMatch(/display:\s*contents/);
  });
  it("⚠️ the date tile goes where the four FLOORS stop fitting — 568, by arithmetic, and the rule is the ledger's container query", () => {
    const floors = 186 + 168 + 78 + 46, gaps = 3 * 18, rowPadding = 16 + 18, frameLines = 2;
    expect(floors + gaps + rowPadding + frameLines).toBe(568);
    expect(listCss).toMatch(/@container \(max-width: 567px\) \{\s*\.qcv-cols, \.qcv-row \{ grid-template-columns: minmax\(166px, 1fr\) 160px 78px; column-gap: 14px; \}/);
    expect(listCss).toMatch(/\.qcv-cols-date, \.qcv-date, \.qcv-date-sk \{ display: none; \}/);
    expect(rule(listCss, ".qcv-list"), "the list must not be a container itself — the rule is about the LEDGER").not.toMatch(/container-type/);
  });
  it("a row is 67 tall; selection is an inset ink ring and never a fill; the name is Playfair on a clipped line, so 1.3", () => {
    expect(rule(listCss, ".qcv-row")).toMatch(/height:\s*67px/);
    const sel = rule(listCss, '.qcv-row[aria-selected="true"]::after');
    expect(sel).toMatch(/inset:\s*3px/); expect(sel).toMatch(/border:\s*1\.6px solid var\(--qcv-ink\)/); expect(sel).toMatch(/border-radius:\s*8px/);
    expect(rule(listCss, ".qcv-row:hover")).toMatch(/background:\s*var\(--qcv-parchment\)/);
    expect(listCss).not.toMatch(/\[aria-selected="true"\]\s*\{[^}]*background/);
    expect(rule(listCss, ".qcv-row-nm")).toMatch(/line-height:\s*1\.3/);
  });
});

describe("the rows, rendered", () => {
  it("⚠️ NO ROW BUTTONS — a row selects and nothing else; the head names the four columns", () => {
    const html = renderToStaticMarkup(<QcList rows={rowsOf([q({}), q({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(3) })])} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    expect(html).not.toContain("<button");
    expect(html).toMatch(/>Agent<\/b><b>Where it stands<\/b><b>Sent so far<\/b><b class="qcv-cols-date">Queried<\/b>/);
    expect(html.split('role="option"').length - 1).toBe(2);
  });
  it("⚠️ RUST FOLLOWS `isWithYou` EXACTLY — for every status, and never an offer", () => {
    const rows = rowsOf(ALL.map((s) => q({ status: s })));
    const html = renderToStaticMarkup(<QcList rows={rows} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    for (const s of ALL) {
      const m = html.match(new RegExp(`data-status="${s.replace(/&/g, "&amp;")}" data-you="(true|false)"`));
      expect(m, `${s} rendered no row`).toBeTruthy();
      expect(m![1], s).toBe(String(isWithYou(s)));
    }
    expect(html.split("qcv-row--you").length - 1).toBe(3);
    expect(rule(listCss, ".qcv-row--you::before")).toMatch(/width:\s*3px;\s*background:\s*var\(--qcv-rust\)/);
    expect(rule(listCss, ".qcv-row--you::before")).toMatch(/top:\s*12px;\s*bottom:\s*12px/);
  });
  it("one tab stop: the selected row, or the first when nothing is; the chip and the tile wear the row's STATE token", () => {
    const rows = rowsOf([q({}), q({}), q({ status: QueryStatus.OFFER })]);
    const html = renderToStaticMarkup(<QcList rows={rows} selectedId={rows[1].id} onOpen={() => {}} nowMs={NOW} />);
    expect([...html.matchAll(/aria-selected="(true|false)" tabindex="(-?\d)"/g)].map((m) => `${m[1]}:${m[2]}`)).toEqual(["false:-1", "true:0", "false:-1"]);
    const none = renderToStaticMarkup(<QcList rows={rows} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    expect([...none.matchAll(/tabindex="(-?\d)"/g)].map((m) => m[1])).toEqual(["0", "-1", "-1"]);
    expect(html).toContain("--qcv-state:var(--state-queried)");
    expect(html).toContain("--qcv-state:var(--state-offer)");
  });
  it("⚠️ 'sent so far' says NOT SENT only where something was recorded — nothing recorded is not nothing sent", () => {
    const some = renderToStaticMarkup(<QcList rows={rowsOf([q({ materialsWanted: ["Query letter"] })])} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    /* ⚠️ THE NAMES ARE THE APP'S OWN DISPLAY MAP, NOT TYPED HERE: the stored token "Query letter" is
       shown as "Covering letter" app-wide (`materialLabel`), and this list must not be the one place
       that says otherwise. The brief lists the four rows by their stored names. */
    const NAME = MATERIAL_SLOTS.map((k) => MATERIAL_ROW_NAMES[k]);
    expect(NAME).toEqual(["Covering letter", "Synopsis", "Opening sample", "Other"]);
    expect(some).toContain(`title="${NAME[0]} sent"`);
    expect(some).toContain(`title="${NAME[1]} not sent"`);
    expect(some.split("qcv-mat-i--on").length - 1).toBe(1);
    const none = renderToStaticMarkup(<QcList rows={rowsOf([q({})])} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    expect(none).toContain(`title="${NAME[0]} not recorded"`);
    expect(none).not.toContain("not sent");
    /* four slots, in the Materials tab's order, and no fifth */
    expect([...some.matchAll(/class="qcv-mat-i[^"]*" title="([^"]+?) (?:sent|not sent)"/g)].map((m) => m[1])).toEqual(NAME);
  });
  it("the skeleton is eight rows at the real row's class, so nothing jumps", () => {
    const html = renderToStaticMarkup(<QcListSkeleton />);
    expect(html.split('data-qcv="sk-row"').length - 1).toBe(8);
    expect(html.split("qcv-skw").length - 1).toBe(1);
    expect(html).toContain('class="qcv-row qcv-row--sk"');
  });
});

describe("the open query, docked", () => {
  const card = (over: Partial<Query>, extra: Partial<React.ComponentProps<typeof QcOpenCard>> = {}) => renderToStaticMarkup(
    <QcOpenCard row={rowsOf([q(over)])[0]} nowMs={NOW} manuscriptTitle="Murphy's Day Out" manuscriptTags={["Adult", "Thriller", "50,000 words"]}
      onPrimary={() => {}} onAction={() => {}} tracking={<ol id="tl" />} agentTab={<div id="ag" />} notesTab={<div id="nt" />} noteCount={2} {...extra} />);
  it("it is an aside in the shared FramedCard; the band is the query's STATE colour; it is never an overlay", () => {
    const html = card({});
    expect(html).toMatch(/^<aside[^>]*data-qcv="open"[^>]*class="fc-card qcv-open qcv-own"[^>]*style="--fc-band:var\(--state-queried\)"/);
    expect(html).not.toMatch(/scrim|qpn/);
    expect(rule(openCss, ".qcv-open")).toMatch(/position:\s*sticky;\s*top:\s*16px/);
  });
  it("⚠️ it caps itself to the SCROLLPORT — `--wpg-port-h` — and no rule on the sheet is sized to the viewport alone", () => {
    expect(rule(openCss, ".qcv-open-fr")).toMatch(/max-height:\s*calc\(var\(--wpg-port-h, 100vh\) - 32px - 12px\)/);
    expect(openCss.replace(/var\(--wpg-port-h, 100vh\)/g, "")).not.toMatch(/\d(vh|dvh)/);
    expect(rule(openCss, ".qcv-open-body")).toMatch(/overflow-y:\s*auto/);
    expect(rule(openCss, ".qcv-open-ft")).toMatch(/flex:\s*none/);
  });
  it("the band: whose court, the rust dot only when it is the writer's move, and Day N — omitted when undated", () => {
    expect(card({})).toMatch(/data-qcv="open-court" data-you="false">With the agent<\/b><b class="qcv-open-day">Day 20<\/b>/);
    expect(card({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) })).toMatch(/class="qcv-open-crt qcv-open-crt--you"[^>]*data-you="true">With you</);
    expect(card({ status: QueryStatus.OFFER, offerDate: ago(2) })).toMatch(/class="qcv-open-crt"[^>]*data-you="false">Offer</);
    expect(card({ status: QueryStatus.NO_RESPONSE })).not.toContain("qcv-open-day");
  });
  it("the drawer's own three tabs, and their bodies inside `.qcv-legacy` where the font reset stops", () => {
    const html = card({});
    expect([...html.matchAll(/role="tab" aria-selected="(true|false)">(Tracking|Agent|Notes)/g)].map((m) => m[2])).toEqual(["Tracking", "Agent", "Notes"]);
    expect(html).toMatch(/<div class="qcv-open-tab qcv-legacy" role="tabpanel"><ol id="tl">/);
    expect(html).toContain('<i class="qcv-open-tabn">2</i>');
  });
  it("⚠️ ONE action in the footer, by status — none when closed; everything else behind ⋯, and only what `queryVerbs` offers", () => {
    expect(card({})).toMatch(/data-qcv="open-action">Record a response<\/button>/);
    expect(card({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: ago(2) })).toContain(">Mark partial sent</button>");
    expect(card({ status: QueryStatus.OFFER, offerDate: ago(2) })).toContain(">Record your decision</button>");
    const closed = card({ status: QueryStatus.REJECTED, rejectedDate: ago(2) });
    expect(closed).not.toContain('data-qcv="open-action"');
    expect(closed, "a closed query has nothing left to nudge, snooze or close").not.toContain('data-qcv="open-more"');
    expect(card({})).toContain('data-qcv="open-more"');
    expect(rule(openCss, ".qcv-open-act")).toMatch(/background:\s*var\(--qcv-navy\);\s*color:\s*#ffffff/);
  });
  it("the loading card has the real frame, band and footer, and one pulse per group", () => {
    const html = renderToStaticMarkup(<QcOpenCardSkeleton />);
    expect(html).toContain('data-qcv="open"'); expect(html).toContain('data-qcv="open-foot"');
    expect(html).toContain("--fc-band:#e9e4dc");
    expect(html).not.toContain("<button");
  });
});

/* ── the Grid view (v11, phase 9): the same rows, as tiles ── */
import { QcGrid, QcGridSkeleton } from "./QcGrid";
describe("the grid's tiles", () => {
  const gridCss = sheet("qcvGrid.css");
  it("two across, gap 14, 18px of padding; a tile is 116 tall with a 35px band — and takes 1.3 on its clipped Playfair name", () => {
    const t = rule(gridCss, ".qcv-tiles");
    expect(t).toMatch(/grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/); expect(t).toMatch(/gap:\s*14px/); expect(t).toMatch(/padding:\s*18px/);
    expect(rule(gridCss, ".qcv-tile")).toMatch(/height:\s*116px/);
    expect(rule(gridCss, ".qcv-tile-bd")).toMatch(/height:\s*35px/);
    expect(rule(gridCss, ".qcv-tile-nm")).toMatch(/line-height:\s*1\.3/);
  });
  it("⚠️ NO TILE ACTIONS; rust follows `isWithYou` for every status; Day N is omitted when undated", () => {
    const rows = rowsOf(ALL.map((s) => q({ status: s })));
    const html = renderToStaticMarkup(<QcGrid rows={rows} selectedId={rows[0].id} onOpen={() => {}} nowMs={NOW} />);
    expect(html).not.toContain("<button");
    for (const s of ALL) expect(html.match(new RegExp(`data-status="${s.replace(/&/g, "&amp;")}" data-you="(true|false)"`))![1], s).toBe(String(isWithYou(s)));
    expect(html.split('aria-selected="true"').length - 1).toBe(1);
    expect(html).toContain("<em>Day 20</em>");
    /* a close with no close date: no Day N at all, never "Day 0" */
    expect(renderToStaticMarkup(<QcGrid rows={rowsOf([q({ status: QueryStatus.NO_RESPONSE })])} selectedId={null} onOpen={() => {}} nowMs={NOW} />)).not.toContain("Day ");
  });
  it("the tile states the list's OWN fact line — one derivation, two views", () => {
    const rows = rowsOf([q({ dateSent: ago(36) })]);
    const tile = renderToStaticMarkup(<QcGrid rows={rows} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    const list = renderToStaticMarkup(<QcList rows={rows} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    const said = tile.match(/class="qcv-tile-fact" title="([^"]+)"/)![1];
    expect(said.length).toBeGreaterThan(8);
    expect(list).toContain(`title="${said}"`);
  });
  it("eight placeholder tiles, none of them interactive", () => {
    const html = renderToStaticMarkup(<QcGridSkeleton />);
    expect(html.split('data-qcv="sk-tile"').length - 1).toBe(8);
    expect(html).not.toContain('role="option"');
  });
});
