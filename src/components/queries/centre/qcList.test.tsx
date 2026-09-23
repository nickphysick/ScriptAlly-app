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
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
    /* ⚠️ THE SHAPE, NOT THE FIVE NUMBERS. Pinning the values made this go red on a retune that
       changed nothing about the law — three minmax tracks and one fixed tile — and the values
       themselves are asserted where they MEAN something, in the threshold arithmetic below. */
    expect(rule(listCss, ".qcv-list")).toMatch(/--qcv-tpl:\s*minmax\(\d+px, \d+px\) minmax\(\d+px, \d+px\) minmax\(\d+px, \d+px\) \d+px\s*;/);
    const shared = rule(listCss, ".qcv-cols, .qcv-row");
    expect(shared).toMatch(/grid-template-columns:\s*var\(--qcv-tpl\)/);
    expect(shared).toMatch(/column-gap:\s*var\(--qcv-tpl-gap\)/);
    expect(shared, "past the ceilings the spare goes into the GAPS").toMatch(/justify-content:\s*space-between/);
    expect(listCss.split("grid-template-columns").length - 1, "a second template somewhere would let head and rows disagree").toBe(2);
    expect(listCss).not.toMatch(/grid-template-columns:[^;]*(auto|max-content|min-content|fit-content)/);
    expect(listCss, "display: contents fractures a row's hover and selection").not.toMatch(/display:\s*contents/);
  });
  it("⚠️ the date tile goes where the four FLOORS stop fitting, and the threshold is DERIVED from them rather than restated", () => {
    /* ⚠️ THE FLOORS ARE READ OUT OF THE SHEET, NOT TYPED HERE. Restating them made this a pair of
       literals that agree with each other and with nothing else — it passed while the tile was
       dropping at the window it was written to protect. Both sides now come from `--qcv-tpl`, so a
       floor that moves without its threshold fails here, which is the only thing this can usefully
       say. The 36 is the frame's two borders plus the row's 16 + 18 of padding; the container is
       the ledger's card and an inline-size query reads its CONTENT box (measured, not assumed). */
    const tpl = /--qcv-tpl:\s*([^;]+);/.exec(listCss)?.[1] ?? "";
    const floors = [...tpl.matchAll(/minmax\((\d+(?:\.\d+)?)px/g)].map((m) => +m[1]);
    const fixed = [...tpl.replace(/minmax\([^)]*\)/g, "").matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => +m[1]);
    const gap = +(/--qcv-tpl-gap:\s*(\d+(?:\.\d+)?)px/.exec(listCss)?.[1] ?? 0);
    expect(floors.length, "three flexible tracks").toBe(3);
    expect(fixed.length, "one fixed track — the date tile").toBe(1);
    expect(gap).toBeGreaterThan(0);
    const boundary = [...floors, ...fixed].reduce((a, b) => a + b, 0) + 3 * gap + 36;
    const declared = +(/@container \(max-width: (\d+)px\)/.exec(listCss)?.[1] ?? -1);
    expect(declared, `the four columns need ${boundary}px of container, so the tile drops below it`).toBe(boundary - 1);
    /* and it must still clear a 1280 window, which is what this pass was for: 540 of container */
    expect(boundary, "the four-column row no longer fits a 1280 window's 540px container").toBeLessThanOrEqual(540);
    expect(listCss).toMatch(/@container \(max-width: \d+px\) \{\s*\.qcv-cols, \.qcv-row \{ grid-template-columns: minmax\(166px, 1fr\) 160px 78px; column-gap: 14px; \}/);
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

/**
 * ⚠️ THE GRID VIEW IS DELETED (v65 §1) AND ITS FOUR CASES GO WITH IT rather than being retargeted.
 * They asserted tile geometry, the rust marker per status, the shared fact line and eight
 * placeholder tiles — all about `QcGrid.tsx` and `qcvGrid.css`, both removed. The two claims worth
 * keeping were never the grid's: the fact line is `QcList`'s own (asserted above), and the rust
 * marker's law is `isWithYou`'s, locked in `qcSummary.test.ts`.
 *
 * What replaces them is the ABSENCE — the same discipline the view table gets in `qcCentre.test`,
 * because a component nothing imports is one import away from being mounted again.
 */
describe("the card grid is gone", () => {
  it("neither the component nor its sheet is in the tree, and nothing imports them", () => {
    for (const f of ["QcGrid.tsx", "qcvGrid.css"]) {
      expect(existsSync(join(process.cwd(), "src/components/queries/centre", f)), `${f} is still in the tree`).toBe(false);
    }
    const src = readdirSync(join(process.cwd(), "src/components/queries/centre"))
      .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
      .map((f) => readFileSync(join(process.cwd(), "src/components/queries/centre", f), "utf8")).join("\n")
      + readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(src.replace(/\/\*[\s\S]*?\*\//g, ""), "QcGrid is imported again").not.toMatch(/from "\.\/QcGrid"|centre\/QcGrid/);
  });
});
