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
import { buildQcRows, isWithYou, type QcRow } from "../../../lib/qcSummary";
import { MATERIAL_ROW_NAMES } from "../../../lib/agentMaterials";
import { MATERIAL_SLOTS } from "../../../lib/queryCardFacts";
import { QcList, QcListSkeleton } from "./QcList";
import { QcOpenCard, QcOpenCardSkeleton } from "./QcOpenCard";

/**
 * §2 (v95) — the list takes GROUPS now, and `No grouping` is one group with no label. These cases
 * are about the ROW, so they wrap in the ungrouped shape rather than restating a grouping each
 * time; the grouped shape has its own cases.
 */
const one = (rows: QcRow[]) => [{ key: "all", label: "", rows }];

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
    /* §3 (v95) — the disc, two flexible columns and three fixed ones. The shape, not the numbers:
       pinning the values made this go red on a retune that changed nothing about the law. */
    expect(rule(listCss, ".qcv-list")).toMatch(/--qcv-tpl:\s*34px minmax\(0, 1fr\) \d+px \d+px minmax\(0, [\d.]+fr\) \d+px\s*;/);
    const shared = rule(listCss, ".qcv-row");
    expect(shared).toMatch(/grid-template-columns:\s*var\(--qcv-tpl\)/);
    expect(shared).toMatch(/column-gap:\s*var\(--qcv-tpl-gap\)/);
    /**
     * ⚠️ THE LABEL STRIP IS GONE AGAIN, AND THIS IS THE THIRD SWING — which is why the history is
     * written down rather than the current state alone. v65 forbade it ("a heading strip floating
     * above detached cards labels a table that is not there"); v95 §2 brought it back as "the only
     * explanation of the second tiers"; v96 removes it, because the reference draws the band and
     * then the cards and §2's line about faint mono labels predates head C. **Ruled by Nick, 2 Oct:
     * the reference wins.** If a fourth pass wants them back, the thing that made the first strip
     * wrong is still the test: the labels and the rows must not be able to disagree.
     */
    expect(listCss, "the label strip's rules are back").not.toMatch(/(?:^|\n)\s*\.qcv-cols\s*[,{]/);
    expect(listCss.split("grid-template-columns").length - 1, "a second template somewhere would let rows disagree").toBe(1);
    expect(listCss).not.toMatch(/grid-template-columns:[^;]*(auto|max-content|min-content|fit-content)/);
    expect(listCss, "display: contents fractures a row's hover and selection").not.toMatch(/display:\s*contents/);
  });
  /**
   * ⚠️ RETARGETED FROM THE DATE TILE'S SINGLE THRESHOLD (v95 §3), AND THE ARITHMETIC IT CHECKED NO
   * LONGER EXISTS. It derived one container threshold from the four tracks' FLOORS — "the four
   * columns need N px, so the tile drops below it" — and the v95 row's flexible tracks are
   * `minmax(0, …)`: their floors are zero, so there is no sum to derive from. The row FOLDS BY
   * DESIGN instead, twice, at widths taken from the reference.
   *
   * What is assertable, and is what the folds are for: each fold removes a column AND its label
   * together, they are ordered, and the thresholds are the reference's own viewport numbers carried
   * across at this app's measured column-per-viewport slope — which the comment at the rule states
   * and this reads back, so a fold that moved without its reason fails here.
   */
  it("⚠️ each fold drops a column AND its label, and the two are ordered", () => {
    const folds = [...listCss.matchAll(/@container \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g)]
      .map((m) => ({ at: +m[1], body: m[2] }));
    expect(folds.length, "two folds").toBe(2);
    expect(folds[0].at, "the folds are not in order, widest first").toBeGreaterThan(folds[1].at);
    /* the wider fold: Queried goes, and the "ago" joins the agency line in its place */
    /* ⚠️ THE WIDER FOLD ALSO SWAPS THE TWO FLEXIBLE TRACKS' RATIO, and that is the fold's own logic
       rather than a tuning: it moves the "ago" INTO the agency line, so from here down the Agent
       column carries two facts where Where-it-stands carries one. Measured before the swap: fifty
       clipped agency lines at a 1440 viewport. */
    expect(folds[0].body).toMatch(/--qcv-tpl:\s*34px minmax\(0, 1\.15fr\) \d+px minmax\(0, 1fr\) \d+px/);
    expect(folds[0].body, "the Queried column does not go at the first fold").toMatch(/\.qcv-qd \{ display: none; \}/);
    expect(folds[0].body, "nothing replaces the date it removed").toMatch(/\.qcv-ag-ago \{ display: inline; \}/);
    /* the narrower fold: What you sent goes too */
    expect(folds[1].body).toMatch(/--qcv-tpl:\s*34px minmax\(0, 1\.15fr\) minmax\(0, 1fr\) \d+px/);
    expect(folds[1].body, "the What-you-sent column does not go at the second fold").toMatch(/\.qcv-ws \{ display: none; \}/);
    /* ⚠️ AND THE "AGO" IS RENDERED ALWAYS AND SHOWN BY THE QUERY — never mounted conditionally, or
       the fold reflows the row at the threshold and changes its height mid-scroll. */
    expect(rule(listCss, ".qcv-ag-ago"), "the ago is not hidden at rest, so it is in the agency line twice").toMatch(/display:\s*none/);
    /* ⚠️ THE CONTAINER IS `.qcv-ledger` AND THE LIST MUST NOT BE A SECOND ONE, or the query answers
       at the wrong box. */
    expect(rule(listCss, ".qcv-list"), "a second container answers the query at the wrong box").not.toMatch(/container-type/);
    expect(sheet("qcvPage.css"), "the ledger stopped being the size container").toMatch(/\.qcv-ledger \{[^}]*container-type:\s*inline-size/);
  });
  it("§3 · a row is a CARD — 80 tall, 12px corners, its own shadow, 10px from the next", () => {
    const row = rule(listCss, ".qcv-row");
    expect(row).toMatch(/min-height:\s*80px/);
    expect(row).toMatch(/border-radius:\s*12px/);
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
    /* §3 (v95) — the row LIFTS on hover; the parchment wash went with the v11 card, because a tint
       on the row is the one thing §3 reserves for the status edge. */
    expect(rule(listCss, ".qcv-row:hover")).toMatch(/transform:\s*translateY\(-1px\)/);
    expect(rule(listCss, ".qcv-row:hover"), "the wash is back, beside the edge that is meant to be the only tint").not.toMatch(/background:/);
    expect(rule(listCss, ".qcv-ag-2"), "mixed-case Playfair on a clipped line crops below 1.3").toMatch(/font-size:\s*13px/);
  });
});

describe("the rows, rendered", () => {
  /**
   * ⚠️ BOTH HALVES OF THIS CASE ARE REVERSED BY v95, AND IT IS KEPT RATHER THAN DELETED because
   * what replaced them still needs saying. "No row buttons" was v11's — actions lived in the open
   * card's footer — and §3 gives the row a hover tray of exactly three. "No head row to name
   * columns" was right while the columns were unlabelled and is reversed by §2's mono labels.
   *
   * So: the tray's three and NOTHING else, and the labels present but hidden from the tree.
   */
  it("⚠️ the row's buttons are the tray's THREE, and the column labels are drawn but not read", () => {
    const rows = rowsOf([q({}), q({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(3) })]);
    const bare = renderToStaticMarkup(<QcList groups={one(rows)} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    /* with nothing coming up there is no tray, so a row still has no buttons at all */
    expect(bare, "a row with nothing coming up draws a tray").not.toContain("<button");
    expect(bare.split('role="option"').length - 1).toBe(2);
    /* the labels are rendered and hidden — every cell beneath carries its own text or label */
    /* §2 (v96) — no label strip: the band heads the list and the cards follow it. */
    expect(bare, "the label strip is rendered again").not.toContain("qcv-cols");
    /* §2 (v96) — the five label words go with the strip. The columns are explained by the cells
       themselves now; the band is what heads the list. */
    for (const w of ["AGENT", "QUERIED", "WHAT YOU SENT", "WHERE IT STANDS"]) expect(bare, `${w} is still drawn as a label`).not.toContain(w);
    /* and with something coming up: three buttons per row, no more */
    const coming = new Map(rows.map((r) => [r.id, { bucket: "chase" as const, verb: "Nudge", tail: null, over: false, action: "Nudge now" }]));
    const trayed = renderToStaticMarkup(<QcList groups={one(rows)} selectedId={null} onOpen={() => {}} nowMs={NOW} coming={coming} />);
    expect(trayed.split("<button").length - 1, "the tray is three controls: the verb, Snooze and ⋯").toBe(6);
    expect(trayed).toContain("Nudge now");
    expect(trayed).toContain("Snooze");
  });
  it("⚠️ RUST FOLLOWS `isWithYou` EXACTLY — for every status, and never an offer", () => {
    const rows = rowsOf(ALL.map((s) => q({ status: s })));
    const html = renderToStaticMarkup(<QcList groups={one(rows)} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    for (const s of ALL) {
      const m = html.match(new RegExp(`data-status="${s.replace(/&/g, "&amp;")}" data-you="(true|false)"`));
      expect(m, `${s} rendered no row`).toBeTruthy();
      expect(m![1], s).toBe(String(isWithYou(s)));
    }
    expect(html.split("qcv-row--you").length - 1).toBe(3);
    /**
     * ⚠️ THE MARKER IS THE `YOUR MOVE` TAG NOW, NOT A RUST RAIL — §6 retires the side accent in as
     * many words ("no rust side accent"), because §3 gives the left edge to the STATUS fill and
     * "nothing else tinted". The claim this case exists for is unchanged and is the one above: WHICH
     * statuses are with you. What it watches has moved from a `::before` to a tag.
     */
    expect(listCss, "the rust rail is back beside the status edge").not.toMatch(/\.qcv-row--you::before/);
    expect(html.split("qcv-ym").length - 1, "the YOUR MOVE tag does not follow isWithYou").toBe(3);
    expect(html).toContain(">YOUR MOVE<");
    expect(rule(listCss, ".qcv-ym")).toMatch(/color:\s*var\(--qcv-rust\)/);
  });
  it("one tab stop: the selected row, or the first when nothing is; the chip and the tile wear the row's STATE token", () => {
    const rows = rowsOf([q({}), q({}), q({ status: QueryStatus.OFFER })]);
    const html = renderToStaticMarkup(<QcList groups={one(rows)} selectedId={rows[1].id} onOpen={() => {}} nowMs={NOW} />);
    expect([...html.matchAll(/aria-selected="(true|false)" tabindex="(-?\d)"/g)].map((m) => `${m[1]}:${m[2]}`)).toEqual(["false:-1", "true:0", "false:-1"]);
    const none = renderToStaticMarkup(<QcList groups={one(rows)} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    expect([...none.matchAll(/tabindex="(-?\d)"/g)].map((m) => m[1])).toEqual(["0", "-1", "-1"]);
    expect(html).toContain("--qcv-state:var(--state-queried)");
    expect(html).toContain("--qcv-state:var(--state-offer)");
  });
  /**
   * §3 (v95) · WHAT YOU SENT HAS THREE TREATMENTS AND THEY ARE `sentRecordOf`'s THREE ANSWERS.
   *
   * ⚠️ THE OLD CASE'S "nothing recorded" BRANCH IS NOW THE `Add` BRANCH, which is the change rather
   * than a loosening: it used to draw four quiet icons whose titles said "not recorded", and §3
   * replaces that with one word. The claim it protected — that "not sent" is never said of a query
   * nobody recorded anything for — is asserted here on both of the branches that can still say it.
   */
  it("⚠️ what you sent: a package chip, the four icons, or `Add` — and NOT SENT only where something was recorded", () => {
    const some = renderToStaticMarkup(<QcList groups={one(rowsOf([q({ materialsWanted: ["Query letter"] })]))} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    /* ⚠️ THE NAMES ARE THE APP'S OWN DISPLAY MAP, NOT TYPED HERE: the stored token "Query letter" is
       shown as "Covering letter" app-wide (`materialLabel`), and this list must not be the one place
       that says otherwise. */
    const NAME = MATERIAL_SLOTS.map((k) => MATERIAL_ROW_NAMES[k]);
    expect(NAME).toEqual(["Covering letter", "Synopsis", "Opening sample", "Other"]);
    expect(some).toContain(`title="${NAME[0]} sent"`);
    expect(some).toContain(`title="${NAME[1]} not sent"`);
    /* the ghosted ones carry the modifier; the sent one does not */
    expect(some.split("qcv-mi-i--off").length - 1, "three of the four are ghosted").toBe(3);
    expect(some.split('class="qcv-mi-i"').length - 1, "one is sent").toBe(1);
    /* four slots, in the Materials tab's order, and no fifth */
    expect([...some.matchAll(/class="qcv-mi-i[^"]*" title="([^"]+?) (?:sent|not sent)"/g)].map((m) => m[1])).toEqual(NAME);

    /* ⚠️ NOTHING RECORDED IS NOT NOTHING SENT — one word, and no icons to read "not sent" from. */
    const none = renderToStaticMarkup(<QcList groups={one(rowsOf([q({})]))} selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    expect(none, "the unrecorded cell draws icons again").not.toContain("qcv-mi-i");
    expect(none).toContain('data-qcv="row-add"');
    expect(none).toContain(">Add<");
    expect(none, "a query nobody recorded anything for is told what it did not send").not.toContain("not sent");

    /* a package is ONE chip with its name, never the icons */
    const pkg = renderToStaticMarkup(
      <QcList groups={one(rowsOf([q({ sentHow: "package", sentPackageId: "p1", sentPackageName: "Standard" })]))}
        selectedId={null} onOpen={() => {}} nowMs={NOW} />);
    expect(pkg).toContain('data-qcv="row-pkg"');
    expect(pkg).toContain("Standard");
    expect(pkg, "a package also draws the individual icons").not.toContain("qcv-mi-i");
    expect(pkg, "a package also draws Add").not.toContain('data-qcv="row-add"');
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
