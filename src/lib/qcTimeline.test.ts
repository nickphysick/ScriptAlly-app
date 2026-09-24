/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The expanded Birds-eye view's time model — the scale, the extent, the ticks, the heat, the bars.
 */
import { describe, it, expect } from "vitest";
import { Activity, Agent, Query, QueryStatus } from "../types";
import { buildQcRows, type QcRow } from "./qcSummary";
import {
  HEAT_CURRENT, HEAT_EXPECTED, HEAT_PAST, NUDGE_WEEKS, PXD_DEFAULT, PXD_MAX, PXD_MIN, TODAY_AT, ZOOM_PRESETS,
  activePreset, clampPxd, crosshairAt, currentWords, edgeCounts, extentOf, ghostFor, heatWeeks, monthTicks,
  msAt, pxdForPreset, scrollForToday, tlRow, trackWidth, weekTicks, xAt, zoomAbout,
} from "./qcTimeline";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 24, 12);
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
let n = 0;
const mkQ = (over: Partial<Query> = {}): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(20), ...over,
});
const agent = (over: Partial<Agent> = {}): Agent => ({ id: "a1", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 8, ...over } as Agent);
const rowsOf = (qs: Query[], acts: Activity[] = []) => buildQcRows(qs, [agent()], acts, NOW);
const one = (over: Partial<Query> = {}): QcRow => rowsOf([mkQ(over)])[0];
const EXT = extentOf(rowsOf([mkQ()]), NOW);

describe("§8.4 · the scale", () => {
  it("the stated numbers, and the clamp", () => {
    expect([PXD_MIN, PXD_MAX, PXD_DEFAULT]).toEqual([3, 30, 10.5]);
    expect(TODAY_AT).toBe(0.58);
    expect(NUDGE_WEEKS).toBe(4);
    expect(clampPxd(1)).toBe(PXD_MIN);
    expect(clampPxd(100)).toBe(PXD_MAX);
    expect(clampPxd(12)).toBe(12);
  });
  it("the three presets, and the switch lights one only when the scale really is at it", () => {
    expect(ZOOM_PRESETS.map((p) => p.key)).toEqual(["6w", "3m", "6m"]);
    expect(ZOOM_PRESETS.map((p) => p.days)).toEqual([42, 91, 182]);
    const W = 900;
    for (const p of ZOOM_PRESETS) expect(activePreset(pxdForPreset(p, W), W), p.key).toBe(p.key);
    /* ⚠️ AND NONE OF THEM BETWEEN TWO. A switch that always showed one lit would claim the view is
       at a preset when a pinch has taken it somewhere else. */
    const between = (pxdForPreset(ZOOM_PRESETS[0], W) + pxdForPreset(ZOOM_PRESETS[1], W)) / 2;
    expect(activePreset(between, W)).toBeNull();
  });
  it("⚠️ a zoom keeps the date under the pointer STILL", () => {
    const at = msAt(EXT, 10.5, 400 + 300);
    const z = zoomAbout(EXT, 10.5, 22, 400, 300);
    expect(z.pxd).toBe(22);
    /* the same date is still under the same pointer x */
    expect(Math.round(msAt(EXT, z.pxd, z.scrollLeft + 300) / DAY)).toBe(Math.round(at / DAY));
  });
  it("x and ms are each other's inverse, at every scale", () => {
    for (const pxd of [3, 10.5, 30]) {
      const ms = NOW - 40 * DAY;
      expect(Math.round(msAt(EXT, pxd, xAt(EXT, pxd, ms)))).toBe(Math.round(ms));
    }
  });
  it("on open, today sits at 58% of the visible track", () => {
    const boxW = 900;
    const left = scrollForToday(EXT, PXD_DEFAULT, boxW, NOW);
    const todayX = xAt(EXT, PXD_DEFAULT, new Date(NOW).setHours(0, 0, 0, 0));
    expect(Math.round(todayX - left)).toBe(Math.round(boxW * TODAY_AT));
  });
});

describe("§8.4 · the extent", () => {
  it("⚠️ it starts at the ACCOUNT's first query, not a fixed window back", () => {
    const old = extentOf(rowsOf([mkQ({ dateSent: ago(400) }), mkQ()]), NOW);
    const recent = extentOf(rowsOf([mkQ({ dateSent: ago(10) })]), NOW);
    expect(old.fromMs).toBeLessThan(recent.fromMs);
    /* the first of the month three weeks before that query */
    const d = new Date(old.fromMs);
    expect(d.getDate()).toBe(1);
    expect(old.fromMs).toBeLessThanOrEqual(NOW - 400 * DAY - 21 * DAY + DAY);
  });
  it("…and runs 26 weeks past today", () => {
    expect(Math.round((EXT.toMs - new Date(NOW).setHours(0, 0, 0, 0)) / DAY)).toBe(26 * 7);
  });
  it("an account with nothing sent still has an extent", () => {
    const e = extentOf([], NOW);
    expect(e.days).toBeGreaterThan(0);
    expect(trackWidth(e, PXD_DEFAULT)).toBeGreaterThan(0);
  });
});

describe("§8.4 · the tier's labels", () => {
  it("⚠️ no month label within 3.2% of today — the TODAY pill is already there", () => {
    const pxd = PXD_DEFAULT;
    const w = trackWidth(EXT, pxd);
    const todayX = xAt(EXT, pxd, new Date(NOW).setHours(0, 0, 0, 0));
    for (const t of monthTicks(EXT, pxd, NOW)) {
      expect(Math.abs(t.x - todayX), t.label).toBeGreaterThan(w * 0.032);
    }
  });
  it("the year rides January's label rather than taking a row of its own", () => {
    const jans = monthTicks(EXT, PXD_DEFAULT, NOW).filter((t) => t.label.startsWith("Jan"));
    expect(jans.length).toBeGreaterThan(0);
    for (const j of jans) expect(j.label).toMatch(/^Jan \d{4}$/);
    const others = monthTicks(EXT, PXD_DEFAULT, NOW).filter((t) => !t.label.startsWith("Jan"));
    for (const o of others) expect(o.label, o.label).toMatch(/^[A-Z][a-z]{2}$/);
  });
  it("the week ticks are Mondays", () => {
    for (const t of weekTicks(EXT, PXD_DEFAULT).slice(0, 12)) expect(new Date(t.ms).getDay()).toBe(1);
  });
});

describe("§8.5 · the heat", () => {
  it("the three weights, stated", () => {
    expect([HEAT_PAST, HEAT_CURRENT, HEAT_EXPECTED]).toEqual([0.12, 0.28, 1]);
  });
  it("⚠️ an expected date outweighs a week of waiting — it is the thing a reader is looking for", () => {
    expect(HEAT_EXPECTED).toBeGreaterThan(HEAT_CURRENT * 3);
    expect(HEAT_CURRENT).toBeGreaterThan(HEAT_PAST);
  });
  it("⚠️ the scale is √(w/max), so the quiet weeks stay legible beside the loud one", () => {
    /* ⚠️ THE FIXTURE MUST HAVE A LOUD WEEK AND A QUIET ONE, or the claim below is about nothing:
       twelve queries sent in one week (whose expected dates then land in one week too) against one
       old query dragging a long quiet tail behind it. The precondition is asserted, because a
       fixture that drifts into one shape is how a scale claim goes quietly green. */
    const rows = rowsOf([
      ...Array.from({ length: 12 }, () => mkQ({ dateSent: ago(30) })),
      mkQ({ dateSent: ago(300) }),
    ]);
    const weeks = heatWeeks(rows, extentOf(rows, NOW), NOW);
    expect(weeks.length).toBeGreaterThan(4);
    const max = Math.max(...weeks.map((w) => w.weight));
    const quiet = weeks.find((w) => w.weight < max / 4);
    expect(quiet, "the fixture has no quiet week — the claim below would be vacuous").toBeTruthy();
    /* linear would put this one at under a quarter; the root lifts it above half */
    expect(quiet!.heightPc / 100).toBeGreaterThan(Math.sqrt(quiet!.weight / max) - 0.001);
    expect(quiet!.heightPc).toBeGreaterThanOrEqual(12);
    for (const w of weeks) expect(w.opacity).toBeLessThanOrEqual(0.62);
  });
  it("nothing to weigh draws nothing — never a band of zeros", () => {
    expect(heatWeeks([], EXT, NOW)).toEqual([]);
  });
});

describe("§8.7 · the bars and their words", () => {
  it("⚠️ the tense follows the DATE, not the status", () => {
    const soon = one({ dateSent: ago(10) });
    expect(currentWords(soon, NOW)).toMatch(/agent response expected by/);
    const gone = one({ dateSent: ago(400) });
    expect(currentWords(gone, NOW)).toMatch(/agent response was expected by/);
  });
  it("the three courts each say their own thing, and a missing date says which is missing", () => {
    expect(currentWords(one({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2), expectedSendDate: new Date(NOW + 6 * DAY).toISOString() }), NOW)).toMatch(/send by/);
    expect(currentWords(one({ status: QueryStatus.OFFER, offerDate: ago(2), offerResponseDeadline: new Date(NOW + 6 * DAY).toISOString() }), NOW)).toMatch(/your decision by/);
    /* ⚠️ TWO DIFFERENT ABSENCES, TWO DIFFERENT SENTENCES — neither is a zero */
    expect(currentWords(one({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) }), NOW)).toContain("no send-by date");
    expect(currentWords(one({ dateSent: ago(10) }, ), NOW)).not.toContain("no send-by date");
  });
  it("the current bar runs to max(expected, today), and what is beyond today is HOLLOW", () => {
    const r = one({ dateSent: ago(10) });
    const t = tlRow(r, NOW);
    const cur = t.bars.find((b) => b.current)!;
    expect(cur.toMs).toBeGreaterThan(NOW);
    expect(cur.aheadFromMs, "the stretch that has not happened yet is marked").toBeTruthy();
    expect(cur.overFromMs, "nothing is past a date that has not come").toBeNull();
  });
  it("…and past its date the bar carries an INK stretch from the date to today", () => {
    const t = tlRow(one({ dateSent: ago(400) }), NOW);
    const cur = t.bars.find((b) => b.current)!;
    expect(cur.overFromMs).toBe(one({ dateSent: ago(400) }).expectedMs);
    expect(cur.aheadFromMs, "nothing is ahead of today on a bar that ends at today").toBeNull();
  });
  it("⚠️ the nudge chip is AGENT-SIDE ONLY — a nudge is sent to someone who owes you a reply", () => {
    expect(tlRow(one({ dateSent: ago(400) }), NOW).nudge?.text).toMatch(/overdue · nudge$/);
    /* a with-you query past its own send-by date owes YOU, so there is nobody to nudge */
    const mine = one({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(40), expectedSendDate: ago(10) });
    expect(mine.expectedMs).toBeLessThan(NOW);
    expect(tlRow(mine, NOW).nudge).toBeNull();
    expect(tlRow(one({ dateSent: ago(5) }), NOW).nudge, "nothing is overdue").toBeNull();
  });
  it("⚠️ the action ghost follows a WITH-YOU bar and nothing follows an agent-side one", () => {
    expect(ghostFor(QueryStatus.PARTIAL_REQUESTED)).toEqual({ status: QueryStatus.PARTIAL_SENT, label: "Send the partial" });
    expect(ghostFor(QueryStatus.FULL_REQUESTED)).toEqual({ status: QueryStatus.FULL_SENT, label: "Send the full" });
    expect(ghostFor(QueryStatus.OFFER)?.label).toBe("Your decision");
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) expect(ghostFor(s), s).toBeNull();
    expect(tlRow(one({ dateSent: ago(10) }), NOW).ghost).toBeNull();
    expect(tlRow(one({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(2) }), NOW).ghost?.label).toBe("Send the full");
  });
});

describe("§8.8 · the edge markers", () => {
  it("⚠️ they count expected DATES, not rows — a row with none has nothing to glide to", () => {
    const rows = [one({ dateSent: ago(300) }), one({ dateSent: ago(10) })].map((r) => tlRow(r, NOW));
    const undated = tlRow({ ...one(), expectedMs: null } as QcRow, NOW);
    const all = [...rows, undated];
    const e = edgeCounts(all, EXT, PXD_DEFAULT, 0, 200);
    expect(e.earlier + e.later).toBeLessThanOrEqual(rows.length);
    expect(e.later).toBeGreaterThan(0);
    expect(e.nearestLater).toBeTruthy();
  });
  it("nothing off either edge means no markers", () => {
    const rows = [tlRow(one({ dateSent: ago(10) }), NOW)];
    const e = edgeCounts(rows, EXT, PXD_DEFAULT, 0, trackWidth(EXT, PXD_DEFAULT));
    expect([e.earlier, e.later]).toEqual([0, 0]);
  });
});

describe("§8.9 · the crosshair", () => {
  it("it snaps to the day, and today says so in its own words", () => {
    const x = xAt(EXT, PXD_DEFAULT, NOW) + PXD_DEFAULT * 0.4;
    const c = crosshairAt(EXT, PXD_DEFAULT, x, NOW);
    expect(c.today).toBe(true);
    expect(c.label).toMatch(/^Today · \d+ [A-Z][a-z]{2}$/);
    const other = crosshairAt(EXT, PXD_DEFAULT, xAt(EXT, PXD_DEFAULT, NOW - 3 * DAY), NOW);
    expect(other.today).toBe(false);
    expect(other.label).toMatch(/^\d+ [A-Z][a-z]{2} · (Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
  });
});
