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
    /* ⚠️ v65 §5: ONE FLEXIBLE TRACK AND THREE FIXED ONES, and the head row is GONE — a heading strip
       floating above detached cards labels a table that is not there. So the template is read on the
       ROW alone, and `justify-content: space-between` went with the head: a single `1fr` track takes
       the spare itself, and putting it in the gaps instead would move the three right-hand columns
       away from the date tile they are read against. */
    expect(rule(listCss, ".qcv-list")).toMatch(/--qcv-tpl:\s*minmax\(\d+px, 1fr\) \d+px \d+px \d+px\s*;/);
    const shared = rule(listCss, ".qcv-row");
    expect(shared).toMatch(/grid-template-columns:\s*var\(--qcv-tpl\)/);
    expect(shared).toMatch(/column-gap:\s*var\(--qcv-tpl-gap\)/);
    expect(listCss, "the head row is retired; a rule for it is what the next reader mounts").not.toMatch(/\.qcv-cols/);
    expect(listCss.split("grid-template-columns").length - 1, "a second template somewhere would let rows disagree").toBe(2);
    expect(listCss).not.toMatch(/grid-template-columns:[^;]*(auto|max-content|min-content|fit-content)/);
    expect(listCss, "display: contents fractures a row's hover and selection").not.toMatch(/display:\s*contents/);
  });
  it("⚠️ the date tile goes where the four FLOORS stop fitting, and the threshold is DERIVED from them rather than restated", () => {
    /* ⚠️ THE FLOORS ARE READ OUT OF THE SHEET, NOT TYPED HERE. Restating them made this a pair of
       literals that agree with each other and with nothing else — it passed while the tile was
       dropping at the window it was written to protect. Both sides now come from `--qcv-tpl`, so a
       floor that moves without its threshold fails here, which is the only thing this can usefully
       say. The 34 is the row's own 16 + 18 of padding and NOTHING ELSE: the ledger's FramedCard went
       with the frame in v65 §5, so there are no longer two borders to subtract. The container is
       `.qcv-ledger` and an inline-size query reads its CONTENT box (measured, not assumed). */
    const tpl = /--qcv-tpl:\s*([^;]+);/.exec(listCss)?.[1] ?? "";
    const floors = [...tpl.matchAll(/minmax\((\d+(?:\.\d+)?)px/g)].map((m) => +m[1]);
    const fixed = [...tpl.replace(/minmax\([^)]*\)/g, "").matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => +m[1]);
    const gap = +(/--qcv-tpl-gap:\s*(\d+(?:\.\d+)?)px/.exec(listCss)?.[1] ?? 0);
    expect(floors.length, "one flexible track").toBe(1);
    expect(fixed.length, "three fixed tracks — where it stands, sent so far, the date tile").toBe(3);
    expect(gap).toBeGreaterThan(0);
    const boundary = [...floors, ...fixed].reduce((a, b) => a + b, 0) + 3 * gap + 34;
    const declared = +(/@container \(max-width: (\d+)px\)/.exec(listCss)?.[1] ?? -1);
    expect(declared, `the four columns need ${boundary}px of container, so the tile drops below it`).toBe(boundary - 1);
    /* and it must still clear a 1280 window, which is what this pass was for: 540 of container */
    expect(boundary, "the four-column row no longer fits a 1280 window's 540px container").toBeLessThanOrEqual(540);
    expect(listCss).toMatch(/@container \(max-width: \d+px\) \{\s*\.qcv-row \{ grid-template-columns: minmax\(166px, 1fr\) 160px 78px; column-gap: 14px; \}/);
    expect(listCss).toMatch(/\.qcv-date, \.qcv-date-sk \{ display: none; \}/);
    /* ⚠️ THE CONTAINER MOVED RATHER THAN MULTIPLYING. `.qcv-ledger` is the size container now (the
       frame that used to be it is gone); the list must still not be a second one, or the query
       answers at the wrong box. */
    expect(rule(listCss, ".qcv-list"), "a second container answers the query at the wrong box").not.toMatch(/container-type/);
    expect(sheet("qcvPage.css"), "the ledger stopped being the size container").toMatch(/\.qcv-ledger \{[^}]*container-type:\s*inline-size/);
  });
  it("§5 · a row is a CARD — 69 tall, 14px corners, its own shadow, 10px from the next", () => {
    const row = rule(listCss, ".qcv-row");
    expect(row).toMatch(/min-height:\s*69px/);
    expect(row).toMatch(/border-radius:\s*14px/);
    expect(row).toMatch(/background:\s*#fff/);
    expect(row).toMatch(/box-shadow:\s*0 1px 2px rgba\(28, 19, 15, 0\.05\), 0 10px 24px -18px rgba\(28, 19, 15, 0\.22\)/);
    expect(rule(listCss, ".qcv-rows")).toMatch(/gap:\s*10px/);
    /* ⚠️ SELECTION IS A RING AND NEVER A FILL, and it is now ONE mechanism: an inset shadow beside
       the base one. A border would change the card's box and shuffle every track; two rings drawn
       two ways is how a focused-and-selected row wears a double outline. */
    const sel = rule(listCss, '.qcv-row[aria-selected="true"]');
    expect(sel).toMatch(/box-shadow:\s*0 0 0 1\.6px var\(--qcv-ink\) inset/);
    expect(sel, "the ring must keep the card's own shadow, not replace it").toMatch(/0 10px 24px -18px/);
    expect(listCss).not.toMatch(/\[aria-selected="true"\][^{]*\{[^}]*background/);
    expect(listCss, "the ring must not also be drawn as a pseudo-element").not.toMatch(/\[aria-selected="true"\]::after/);
    expect(rule(listCss, ".qcv-row:hover")).toMatch(/background:\s*var\(--qcv-parchment\)/);
    expect(rule(listCss, ".qcv-row-nm")).toMatch(/line-height:\s*1\.3/);
  });
});

describe("the rows, rendered", () => {
  it("⚠️ NO ROW BUTTONS — a row selects and nothing else, and there is no head row to name columns", () => {
    const html = renderToStaticMarkup(<QcList rows={rowsOf([q({}), q({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(3) })])} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    expect(html).not.toContain("<button");
    expect(html, "the retired head row is rendered again").not.toContain("qcv-cols");
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
  });
  /**
   * ⚠️ IT NEITHER STICKS NOR CAPS ITSELF SINCE v65 §6.5, and both retirements are asserted rather
   * than left to lapse. Both were right while the card sat in a scrolling column: `position: sticky`
   * held it as the ledger went past, and `max-height: calc(var(--wpg-port-h) …)` stopped it running
   * off the bottom. In the rail — a card already placed to the window's measured height — a sticky
   * child has nowhere to travel, and a cap is a SECOND opinion about a height something else has
   * measured. Two derivations of one number disagree at every viewport where they differ.
   */
  it("⚠️ in the rail it fills its host, and states neither a sticky nor a height of its own", () => {
    const own = rule(openCss, ".qcv-open");
    expect(own).toMatch(/position:\s*static/);
    expect(own).toMatch(/flex:\s*1 1 auto/);
    /* ⚠️ §1.5's CARD, NOT THE FRAMED ONE: white, a soft shadow, 12px corners — and crucially NO rim
       and NO burgundy line, which is what the framed treatment is. The framed look is the three
       court tiles' alone on this page, and a framed card inside the rail's unframed one would be
       two borders 14px apart. The rim is what `FramedCard` draws as two inset shadows, so its
       absence is the thing to assert. */
    expect(own, "the card kept the framed rim").not.toMatch(/inset 0 0 0 \d+px/);
    expect(own).toMatch(/border-radius:\s*12px/);
    expect(own).toMatch(/box-shadow:\s*0 1px 2px rgba\(28, 19, 15, 0\.05\), 0 10px 24px -18px rgba\(28, 19, 15, 0\.22\)/);
    expect(rule(openCss, ".qcv-open-fr"), "the frame still draws a line").toMatch(/border:\s*0/);
    /* ⚠️ …and it is 14px inside the rail (§6.5), which is the RAIL's padding and only while it is
       showing a query: the Birds-eye view IS the card, so insetting it would inset its own head. */
    expect(sheet("qcvRail.css")).toMatch(/\.qcv-rail\[data-showing="query"\] \{ padding: 14px; \}/);
    expect(rule(openCss, ".qcv-open-fr")).not.toMatch(/max-height/);
    /* ⚠️ AND THE STANDING LAW IS UNCHANGED AND STILL CHECKED: nothing here is sized to the viewport.
       The fallback went with the cap, so the sheet must now name no `vh` at all. */
    expect(openCss).not.toMatch(/\d(vh|dvh)/);
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
