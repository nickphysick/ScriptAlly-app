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
import { BAR_NEAR, barTone, dueCell, eyeGroups, eyeRows } from "../../../lib/qcBirdsEye";
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
const ahead = (d: number) => new Date(NOW + d * DAY).toISOString();
let n = 0;
const mkQ = (over: Partial<Query> = {}): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(20), ...over,
});
const agent = (over: Partial<Agent> = {}): Agent => ({ id: "a1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 8, ...over } as Agent);
const rowsOf = (qs: Query[]) => buildQcRows(qs, [agent()], [], NOW);
const view = (qs: Query[] = [mkQ()]) => renderToStaticMarkup(<QcBirdsEye rows={rowsOf(qs)} nowMs={NOW} focus="all" onFocus={() => {}} onExpand={() => {}} />);
/* §B3 — an agency that states NO reply window, so the query has no expected date and nothing dates
   its track. `responseTimeWeeks` is OMITTED rather than zeroed: absence is the app's own "not
   stated", and `agentWindowMs` then returns null rather than guessing a window. */
const undatedView = (qs: Query[]) => renderToStaticMarkup(
  <QcBirdsEye rows={buildQcRows(qs, [{ ...agent(), responseTimeWeeks: undefined } as Agent], [], NOW)} nowMs={NOW} focus="all" onFocus={() => {}} onExpand={() => {}} />,
);

describe("the view, rendered", () => {
  it("head, focus, key, rows, foot — in that order, and the axis is GONE", () => {
    const html = view();
    expect(html, "§3.2 retired the axis with the due line it labelled").not.toContain('data-qcv="be-axis"');
    /* §4 (v95) — the key moved ABOVE the groups (it names the two ends of every bar, so it has to
       be read before them) and a FOOT closed the column. */
    const order = ["be-head", "be-focus", "be-key", "be-scroll", "be-foot"].map((p) => html.indexOf(`data-qcv="${p}"`));
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
  /**
   * §4 (v95) · ONE UNIVERSAL BAR, AND THIS REVERSES v65.3's DECISION 2.
   *
   * ⚠️ "THE FILL IS THE STATUS'S OWN COLOUR AND IS NEVER DEEPENED" WAS WRITTEN AGAINST A DIFFERENT
   * BAR, and the reason it gave no longer holds. That bar's fill WAS the status colour, so
   * deepening it meant one channel carrying two things at once — which status, and how urgent. The
   * v95 bar has no colour at all: the status is named in words on the line above it, so value is
   * the only channel the bar uses and it says one thing. The reference and §4 agree on it.
   *
   * The allowance, the overrun and the notch go with it — a bar that rescaled so its notch could
   * stay on the date needed three parts; one that clamps at its own track needs one.
   */
  it("§4 · the bar is ONE fill that deepens with the window — grey, ink70 past .75, ink at the date", () => {
    /**
     * ⚠️ A WITH-YOU QUERY WITH ITS OWN DATE, AND v96 §4 IS WHY. Only an agent's-turn query takes a
     * date from the agency's window — but the rail draws `Overdue` and `Upcoming` only now, and an
     * agent's-turn query reaches Upcoming solely in the last 14 days of a 56-day window, where its
     * fill is already past .75 and its tone is `near`. So **a flat dated agent's-turn bar can no
     * longer be drawn at all**, and the fixture for one is a with-you query carrying
     * `expectedSendDate`: in Upcoming whatever its distance, and far enough out to be flat.
     * (The ancestor of this case used `dateSent: ago(5)` and went red the moment the rail narrowed
     * to two groups — the fixture was in `watch`, which is no longer rendered.)
     */
    const fresh = view([mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2), expectedSendDate: ahead(30) })]);
    const late = view([mkQ({ dateSent: ago(400) })]);
    expect(fresh, "the retired due-line bar").not.toContain("qcv-be-bar");
    expect(fresh, "the retired three-part track").not.toContain('data-qcv="be-track"');
    expect(fresh, "the allowance went with the rescaling").not.toContain('data-qcv="be-allow"');
    expect(fresh, "the overrun went with the rescaling").not.toContain('data-qcv="be-over"');
    expect(fresh, "the notch was the overrun's join").not.toContain('data-qcv="be-notch"');
    /* one fill, a width, and a tone */
    expect(/<i class="qcv-be-pbf qcv-be-pbf--flat"[^>]*style="width:\d+%/.test(fresh), "no fill").toBe(true);
    expect(late).toContain("qcv-be-pbf--over");
    expect(late).toContain('data-tone="over"');
    /* ⚠️ AND THE TONE IS THE LIB'S ANSWER, NOT A SECOND THRESHOLD HERE. `barTone` is what the row
       reads; a number typed in this file would be a copy free to drift from it. */
    expect(barTone({ dated: true, f: 0.5, allowance: 1, fill: 0.5, over: 0 })).toBe("flat");
    expect(barTone({ dated: true, f: BAR_NEAR + 0.01, allowance: 1, fill: 1, over: 0 })).toBe("near");
    expect(barTone({ dated: true, f: 1, allowance: 1, fill: 1, over: 0 })).toBe("over");
    expect(barTone({ dated: false, f: null, allowance: 1, fill: 0, over: 0 }), "an undated bar has no tone").toBe("flat");
    /* ⚠️ NO STATUS COLOUR ANYWHERE ON THE BAR — that is what "universal" means here. */
    expect(fresh, "the bar is back in the status vocabulary").not.toMatch(/qcv-be-pb[^"]*"[^>]*--qcv-state/);
  });
  it("§4 · the ends are labelled from the query's own two dates, and omitted where they do not exist", () => {
    /* §4 (v96) — in a group the rail draws: `ago(55)` puts an 8-week window inside its last 14 days. */
    const html = view([mkQ({ dateSent: ago(55) })]);
    expect(html).toContain('data-qcv="be-from"');
    expect(html).toContain('data-qcv="be-to"');
    /* the right end's label is `expectedKind`'s own three — the same field the desk reads */
    expect(html).toMatch(/data-qcv="be-to"><b>(REPLY BY|SEND BY|DECIDE BY) /);
    expect(html).toMatch(/data-qcv="be-from">(SENT|ASKED|OFFER) /);
    /* §4 (v96) — with-you and dateless, so it lands in Upcoming and is drawn. A `Full Sent`
       with no window is agent's-turn and sits in `watch`, which the rail no longer renders. */
    const none = undatedView([mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) })]);
    expect(none, "a label over a date nobody recorded").toMatch(/data-qcv="be-to"><\/span>/);
    expect(none, "a dateless row must say so on its name line").toContain("no date set");
  });
  it("§B3 · an undated row draws an EMPTY WHITE track — never a bar against a date nobody gave", () => {
    /**
     * ⚠️ RETARGETED (§B3) — THE DASHED PATTERN IS GONE, AND THE OLD FORM PINNED IT. It required a
     * `repeating-linear-gradient`, which stood for *"an undated row draws no bar"*. A pattern is a
     * mark, and a mark is something to read; the fact here is that there is nothing to read, and an
     * empty track says that with no vocabulary at all. The law is unchanged and the claim survives:
     * nothing is placed against a date nobody promised.
     */
    /* §4 (v95) — the track is one rule now, and an undated row is the ABSENCE of a fill inside it
       rather than a track with its own treatment. Keeping the track is the point: hiding it would
       make the row a different shape from its neighbours for a reason the reader cannot see. */
    const track = rule(".qcv-be-pb");
    expect(track).toMatch(/background: var\(--qcv-track\)/);
    expect(track, "a pattern is back in the empty track").not.toMatch(/repeating-linear-gradient|dashed/);
    expect(css, "the retired empty-track rule is back").not.toMatch(/\.qcv-be-track--none/);
    /* …and the row really does draw no fill when nothing dates it */
    expect(undatedView([mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) })])).toContain('data-dated="no"');
    /* …and the ordinary case really does say the other thing, or the line above proves nothing */
    /* §4 (v96) — `ago(55)` puts an 8-week window inside its last 14 days, so the row is in Upcoming
       and drawn; the default `ago(20)` expects at +36 days, which is `watch` and no longer rendered. */
    expect(view([mkQ({ dateSent: ago(55) })])).toContain('data-dated="yes"');
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
     * (was `qcV65.measure.ts` §A4, retired with v126 — `tests/e2e/RETIRED-query-centre-v126.md`).
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
    expect(renderToStaticMarkup(<QcBirdsEye rows={[]} nowMs={NOW} loading focus="all" onFocus={() => {}} onExpand={() => {}} />)).not.toContain("Nothing is out");
  });
});

describe("the sheet", () => {
  /**
   * ⚠️ RETIRED WITH THE AXIS IT MEASURED (§4, v95). The three-column row shared a vertical line with
   * the heading above it, so the track's left edge and width had to be computed from the same four
   * tokens in three places — "three rules each computing it is three chances for one to be a pixel
   * out". The row is a STACK now: the bar takes the row's own width, there is no axis, and the four
   * tokens are deleted rather than left as knobs nobody turns.
   *
   * What replaces it is the shape itself, and that the dead tokens really went.
   */
  it("§4 · the row is a stack — name line, bar, ends — and the axis's tokens are gone", () => {
    const own = rule(".qcv-be");
    expect(own, "the gutter is still one token").toContain("--qcv-be-pad");
    for (const t of ["--qcv-be-who", "--qcv-be-day", "--qcv-be-gap", "--qcv-be-tl", "--qcv-be-tw"]) {
      expect(css, `${t} is a knob nothing turns`).not.toMatch(new RegExp(`${t}:`));
    }
    const row = rule(".qcv-be-row");
    expect(row, "the row is a grid again").toMatch(/display:\s*block/);
    expect(row).toMatch(/padding:\s*13px 22px/);
    /* the three parts, in order, and the hairline between rows rather than under them */
    expect(row).toMatch(/border-top:\s*1px solid var\(--qcv-hair\)/);
    expect(css).toMatch(/\.qcv-be-rows > \.qcv-be-row:first-child \{ border-top: 0; \}/);
    expect(rule(".qcv-be-pb")).toMatch(/height:\s*10px/);
    expect(rule(".qcv-be-ends")).toMatch(/justify-content:\s*space-between/);
  });
  it("⚠️ the rows are the only thing that scrolls, and the scroller has a floor of ZERO", () => {
    const sc = rule(".qcv-be-scroll");
    expect(sc).toMatch(/overflow-y:\s*auto/);
    /* without `min-height: 0` a flex child's floor is its CONTENT, so the rows push the card past
       the window instead of scrolling inside it — measured on four surfaces in this repo */
    expect(sc).toMatch(/min-height:\s*0/);
    expect(sc).toMatch(/flex:\s*1 1 auto/);
    for (const fixed of [".qcv-be-head", ".qcv-be-focus", ".qcv-be-key", ".qcv-be-foot"]) {
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
  /**
   * ⚠️ FIVE CASES RETIRED HERE BY §4 (v95), each with its subject rather than its claim. The rail's
   * three-column row is a STACK now: the initials disc (`.qcv-be-ini`), the 52px due column, the
   * track's allowance/overrun/notch, the overdue INSET CARD and the `--late` class it wore are all
   * gone from the markup, so a lock over any of them would be a probe that finds nothing and
   * reports no offence.
   *
   * What each one was FOR survives elsewhere and is asserted there: the bar's three parts became
   * the one fill whose tone the case above measures against `barTone`; the due column's two facts
   * became the name line's distance and the bar's right end, asserted together in the case above;
   * and the overdue card became the full ink bar — §4 is explicit that an overdue row has "no wash,
   * no edge, no highlight", because the bar IS the mark and a second one says it twice.
   */
  it("§4 · the retired row furniture is gone from the sheet and the markup alike", () => {
    const html = view([mkQ({ dateSent: ago(400) }), mkQ()]);
    for (const gone of ["be-track", "be-allow", "be-over", "be-notch", "be-due", "be-ini"]) {
      expect(html, `${gone} is rendered again`).not.toContain(`data-qcv="${gone}"`);
    }
    for (const gone of [".qcv-be-ini", ".qcv-be-pg", ".qcv-be-track", ".qcv-be-allow", ".qcv-be-fill", ".qcv-be-notch", ".qcv-be-due", ".qcv-be-row--late", ".qcv-be-row--watch"]) {
      expect(css, `${gone} is a rule with no subject`).not.toMatch(new RegExp(gone.replace(/[.-]/g, "\\$&") + "[\\s{,:]"));
    }
    /* ⚠️ AND AN OVERDUE ROW REALLY DOES CARRY NOTHING BUT ITS BAR. The one thing that distinguishes
       it in the markup is the tone, which is the bar's own. */
    expect(html).toContain('data-tone="over"');
    expect(html, "an overdue row wears a second mark").not.toMatch(/class="qcv-be-row[^"]*(late|washed|inset)/);
  });

  /**
   * §1.8 — THE DATE AND THE DISTANCE ARE TWO FACTS AND THE ROW STATES BOTH. Either alone leaves the
   * reader doing arithmetic: "10d over" does not say which day, and "9 Sep" does not say whether it
   * has gone.
   */
  /**
   * §4 (v95) — THE DUE CELL IS GONE AND ITS TWO FACTS ARE STILL BOTH THERE: the DISTANCE moved to
   * the right of the name line, the DATE to the right end of the bar. The claim this case exists
   * for is unchanged and is why it survives — "10d over" does not say which day and "9 Sep" does
   * not say whether it has gone, so a row stating only one leaves the reader doing arithmetic.
   * `dueCell` is still the one derivation behind both, and is still asserted in all four cases.
   */
  it("§4 · every row states its distance AND its date, from the shared derivation", () => {
    /**
     * ⚠️ THE ROWS THE RAIL DRAWS, NOT EVERY ROW `eyeRows` BUILDS. §4 (v96) narrowed the rail to
     * Overdue and Upcoming, so `eyeRows` is a superset of what is rendered and asserting over it
     * would require the html to contain rows the design deliberately leaves out. The claim is
     * unchanged — every row the reader can see states its distance and its date — and it is now
     * asked of exactly those.
     */
    const qs = [mkQ({ dateSent: ago(400) }), mkQ({ dateSent: ago(55) })];
    const rows = eyeGroups(rowsOf(qs), NOW).flatMap((g) => g.rows);
    expect(rows.length, "the fixture draws fewer than two rows").toBeGreaterThan(1);
    const html = view(qs);
    for (const r of rows) {
      const d = dueCell(r.row, NOW);
      expect(html, `${d.kind}: the distance is missing`).toContain(`>${d.distance}</em>`);
      expect(html, `${d.kind}: the date is missing from the bar's end`).toContain(d.date.toUpperCase());
    }
    /* the four wordings, stated once here and derived in the library */
    const past = dueCell({ expectedMs: NOW - 10 * DAY } as never, NOW);
    expect([past.date === "—", past.distance, past.kind, past.urgent]).toEqual([false, "10d over", "past", true]);
    expect(dueCell({ expectedMs: NOW } as never, NOW).distance).toBe("Today");
    expect(dueCell({ expectedMs: NOW + 3 * DAY } as never, NOW).distance).toBe("In 3d");
    const none = dueCell({ expectedMs: null } as never, NOW);
    expect([none.date, none.distance, none.kind]).toEqual(["—", "No date", "none"]);
    /* ⚠️ A DATELESS ROW SAYS SO AND OFFERS THE ONE THING THAT FIXES IT — never an em dash under a
       label, which is a label with nothing to label. */
    expect(undatedView([mkQ({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) })])).toContain("no date set");
    /* …and an overdue distance is the only one drawn in ink, which is the row's own mark */
    expect(html).toMatch(/class="qcv-be-over" data-qcv="be-dist" data-due="past"/);
  });

});
