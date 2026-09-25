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
/* §B3 — an agency that states NO reply window, so the query has no expected date and nothing dates
   its track. `responseTimeWeeks` is OMITTED rather than zeroed: absence is the app's own "not
   stated", and `agentWindowMs` then returns null rather than guessing a window. */
const undatedView = (qs: Query[]) => renderToStaticMarkup(
  <QcBirdsEye rows={buildQcRows(qs, [{ ...agent(), responseTimeWeeks: undefined } as Agent], [], NOW)} nowMs={NOW} onExpand={() => {}} />,
);

describe("the view, rendered", () => {
  it("head, focus, rows, legend — in that order, and the axis is GONE", () => {
    const html = view();
    expect(html, "§3.2 retired the axis with the due line it labelled").not.toContain('data-qcv="be-axis"');
    const order = ["be-head", "be-focus", "be-scroll", "be-key"].map((p) => html.indexOf(`data-qcv="${p}"`));
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
  it("§3.2 · the bar is a TRACK with an allowance and a fill, in the status's own colour", () => {
    /* ⚠️ AN AGENT'S-TURN QUERY, because only those have an expected date. A `Full Requested` is the
       WRITER's turn, whose date comes from `expectedSendDate` and nothing else — so a fixture built
       from one draws the undated track and an allowance assertion over it is about a branch that
       cannot be entered. Found by this case going red on its first run. */
    const html = view([mkQ({ dateSent: ago(20) })]);
    expect(html, "the retired due-line bar").not.toContain("qcv-be-bar");
    expect(html).toContain('data-qcv="be-track"');
    expect(/<i class="qcv-be-allow"[^>]*style="width:[\d.]+%/.test(html), "no allowance").toBe(true);
    expect(/<b class="qcv-be-fill"[^>]*style="width:[\d.]+%/.test(html), "no fill").toBe(true);
    const track = /<i class="qcv-be-track[^"]*"[^>]*style="([^"]*)"/.exec(html)?.[1] ?? "";
    expect(track, "the bar is not in the app's status vocabulary").toContain("--qcv-state:var(--state-");
    /* ⚠️ THE TRUE STATUS COLOUR, NEVER THE DEEPENED ONE (decision 2) */
    expect(track, "a deepened token is a second status palette").not.toContain("-deep");
  });
  it("⚠️ past the date the track carries an overrun AND a notch; before it, neither", () => {
    const late = view([mkQ({ dateSent: ago(400) })]);
    const fresh = view([mkQ({ dateSent: ago(2) })]);
    expect(late).toContain('data-qcv="be-over"');
    expect(late, "the notch is the due date itself").toContain('data-qcv="be-notch"');
    expect(fresh, "nothing is past a date that has not come").not.toContain('data-qcv="be-over"');
    expect(fresh).not.toContain('data-qcv="be-notch"');
    /* …and the notch stands where the allowance ends, which is what makes it the date */
    const al = /<i class="qcv-be-allow"[^>]*style="width:([\d.]+)%/.exec(late)?.[1];
    const notch = /<s class="qcv-be-notch"[^>]*style="left:([\d.]+)%/.exec(late)?.[1];
    expect(al, "no allowance to compare").toBeTruthy();
    expect(notch).toBe(al);
  });
  it("§B3 · an undated row draws an EMPTY WHITE track — never a bar against a date nobody gave", () => {
    /**
     * ⚠️ RETARGETED (§B3) — THE DASHED PATTERN IS GONE, AND THE OLD FORM PINNED IT. It required a
     * `repeating-linear-gradient`, which stood for *"an undated row draws no bar"*. A pattern is a
     * mark, and a mark is something to read; the fact here is that there is nothing to read, and an
     * empty track says that with no vocabulary at all. The law is unchanged and the claim survives:
     * nothing is placed against a date nobody promised.
     */
    const none = rule(".qcv-be-track--none");
    expect(none).toMatch(/background: #fff/);
    expect(none, "a pattern is back in the empty track").not.toMatch(/repeating-linear-gradient|dashed/);
    /* the ring is a touch heavier, so an empty track still reads as a track rather than as a gap */
    expect(none).toMatch(/box-shadow: inset 0 0 0 1\.2px/);
    /* …and the row really does draw no fill when nothing dates it */
    expect(undatedView([mkQ({ status: QueryStatus.FULL_SENT })])).toContain('data-dated="no"');
    /* …and the ordinary case really does say the other thing, or the line above proves nothing */
    expect(view([mkQ()])).toContain('data-dated="yes"');
  });
  it("§3.4 · ⚠️ a stuck heading is on white, sticky, and states no negative margin", () => {
    /**
     * ⚠️ RETARGETED (§A4), AND THE OLD FORM IS WHY. It required the literal `margin: 0 -22px 4px`
     * while standing for *"the heading's background spans the card's inner width, so no row shows
     * beside it"* — and that spelling was the FAULT: the scroller carries no padding of its own, so
     * the negative margin pulled the background 22px OUTSIDE the card on each side (384 against a
     * 340 card) and put the ink on the card's edge, 22px left of the first disc.
     *
     * A lock pinning a spelling cannot tell a refactor from a regression, which is the only thing a
     * lock is for. **The width and the ink are geometry and live in the measurement now**
     * (`qcV65.measure.ts`, §A4: background = the card's inner width, ink = the first disc's x).
     * What a source lock can honestly carry is what is left here.
     */
    const r = rule(".qcv-be-gh");
    expect(r, "the heading stopped sticking").toMatch(/position:\s*sticky/);
    expect(r, "a transparent heading has rows scrolling through it").toMatch(/background:\s*#fff/);
    /* ⚠️ AND IT MUST NOT PULL OUT AGAIN — the one thing this file can still prove about the width */
    expect(r, "the negative margin is back; the background will overhang the card").not.toMatch(/margin:[^;]*-\d/);
    /* the air above it is PADDING, so a stuck heading never shows rows above itself */
    expect(r).toMatch(/padding:\s*18px 22px 8px/);
    /* §A4 — and the face beats `brand.tsx`'s runtime `h3 { !important }`, or it renders in serif */
    expect(r, "brand.tsx forces h3 with !important; without this the heading is Playfair").toMatch(/font-family: var\(--qcv-type\) !important/);
  });
  it("group headings carry their count, and Overdue's is ink", () => {
    const html = view([mkQ({ dateSent: ago(400) }), mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) })]);
    const gs = eyeGroups(rowsOf([mkQ({ dateSent: ago(400) }), mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) })]), NOW);
    for (const g of gs) expect(html, g.label).toContain(`${g.label}<span data-qcv="be-gcount">${g.count}</span>`);
    /* §3.4 — the count is a PILL, and Overdue's is ink with cream text */
    expect(rule(".qcv-be-gh span")).toMatch(/border-radius:\s*9px/);
    expect(rule(".qcv-be-grp--overdue .qcv-be-gh span")).toMatch(/background:\s*var\(--qcv-ink\)/);
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
    for (const t of ["--qcv-be-pad", "--qcv-be-who", "--qcv-be-day", "--qcv-be-gap"]) {
      expect(own, `${t} is not declared on the view`).toContain(t);
    }
    /* §3.2 — the track is inset from its own cell, and the two numbers are the mock's */
    expect(rule(".qcv-be-track")).toMatch(/left:\s*4px;\s*right:\s*10px/);
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
    for (const fixed of [".qcv-be-head", ".qcv-be-focus", ".qcv-be-key"]) {
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
  });
  it("§3.1 · ⚠️ the toggle's three labels are CENTRED in their segments", () => {
    /* a button's default text alignment is its UA's — left-aligned words inside three equal
       segments read as three columns rather than as one control */
    const b = rule(".qcv-be-focus button");
    expect(b).toMatch(/display:\s*flex/);
    expect(b).toMatch(/justify-content:\s*center/);
    expect(b).toMatch(/align-items:\s*center/);
  });
  it("the hawk is the enrolled asset, at its recorded version", () => {
    expect(view()).toContain(`src="${BE_HAWK_HEAD.src}?v=${BE_HAWK_HEAD.version}"`);
  });
});

/* ── v65.3 §3.2–§3.3 · the progress bars and the rows (locks 2 and 3) ─────────────────────────── */

describe("§3.2–§3.3 · the bars and the rows", () => {
  it("⚠️ the axis, its labels and the due line are RETIRED, sheet and markup alike", () => {
    /* the decision is decision 1's, and a rule left behind for a retired element is a rule the next
       reader has to work out is dead — so their absence is asserted rather than assumed */
    for (const gone of [".qcv-be-axis", ".qcv-be-axt", ".qcv-be-axnow", ".qcv-be-axl", ".qcv-be-axr", ".qcv-be-line", ".qcv-be-bar"]) {
      expect(css, `${gone} outlived the due line`).not.toContain(`${gone} {`);
      expect(css, `${gone} outlived the due line`).not.toContain(`${gone},`);
    }
    expect(src).not.toContain("be-axis");
    expect(src).not.toContain("be-line");
  });
  it("§5 · the right column is 52 and the columns do not gap", () => {
    const be = rule(".qcv-be");
    expect(be).toMatch(/--qcv-be-day: 52px/);
    expect(be, "a column gap moves the bar off the space the date column measures").toMatch(/--qcv-be-gap: 0px/);
  });
  it("§3.2 · the three parts of the track, and the notch stands proud of it", () => {
    expect(rule(".qcv-be-pg")).toMatch(/height:\s*8px/);
    expect(rule(".qcv-be-track")).toMatch(/border-radius:\s*4px/);
    expect(rule(".qcv-be-track")).toMatch(/left:\s*4px;\s*right:\s*10px/);
    expect(rule(".qcv-be-allow"), "the allowance is the white window").toMatch(/background:\s*#fff/);
    expect(rule(".qcv-be-fill")).toMatch(/background:\s*var\(--qcv-state, var\(--state-closed\)\)/);
    /* §1.9 — the overrun is INK at full opacity, as the expanded view's is */
    expect(rule(".qcv-be-over")).toMatch(/background:\s*var\(--qcv-ink\)/);
    /* 8 tall plus 3 proud above and below is 14 — the mock's own notch, measured */
    const n = rule(".qcv-be-notch");
    expect(n).toMatch(/top:\s*-3px/);
    expect(n).toMatch(/height:\s*14px/);
    expect(n).toMatch(/width:\s*2px/);
    expect(n).toMatch(/background:\s*#fff/);
  });
  it("§3.3 · ⚠️ an overdue row is an INSET card, and the inset pays the gutter back", () => {
    const late = rule(".qcv-be-row--late");
    /* 12 + 10 = the 22px gutter, so the ink lands where every other row's does and only the
       background moved. Either number alone is a row that is wrong in one of two ways. */
    /* ⚠️ `100%` widens the row by the margins and `auto` shrink-to-fits it (a button), so the
       width is STATED and names the margin it pays for. Both were measured on the page. */
    expect(late).toMatch(/width:\s*calc\(100% - 24px\)/);
    expect(late).toMatch(/margin:\s*0 12px 4px/);
    expect(late).toMatch(/padding:\s*0 10px/);
    expect(late).toMatch(/border-radius:\s*10px/);
    expect(late).toMatch(/background:\s*#f8ebe3/);
    expect(late, "the 3px ink edge is the marker").toMatch(/inset 3px 0 0 var\(--qcv-ink\)/);
    expect(late, "an inset card with a bottom border reads as a row that lost its corner").toMatch(/border-bottom:\s*0/);
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
    /* ⚠️ ORDER-INDEPENDENT (§C2). This matched `data-qcv="be-due" data-due="x"><b`, which is an
       attribute ORDER rather than a claim — adding `data-ym` between them took it to zero cells and
       reported "no row states a due cell" about a view where every row does. */
    const cells = [...html.matchAll(/data-qcv="be-due"[^>]*data-due="([a-z]+)"[^>]*><b[^>]*>([^<]*)<\/b><u[^>]*>([^<]*)</g)];
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
  it("§3.3 · the overdue class comes from the library's own answer, on the rows whose date has gone", () => {
    const html = view([mkQ({ dateSent: ago(400) })]);
    expect(html).toContain("qcv-be-row--late");
    expect(html).toContain('data-due="past"');
  });
});
