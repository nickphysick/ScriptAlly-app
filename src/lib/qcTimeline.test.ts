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
  HEAT_CURRENT, HEAT_EXPECTED, MONTH_FULL, NUDGE_WEEKS, PXD_DEFAULT, PXD_MAX, PXD_MIN, TODAY_AT, ZOOM_PRESETS,
  activePreset, clampPxd, crosshairAt, currentWords, edgeCounts, extentOf, ghostFor, heatWeeks, monthBands,
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
    /**
     * ⚠️ A PRESET IS A SCALE, NOT A SPAN (v65.2 §8). They were `days` and the scale was
     * `trackW / days`, so "3m" meant a different px/day on every window — and `PXD_DEFAULT`, which
     * IS a scale, could only light a preset by coincidence of width. The mock states them as
     * scales, and 10.5 is the default, so the view opens on 3m lit rather than on whatever the
     * window happens to make of 91 days.
     */
    expect(ZOOM_PRESETS.map((p) => p.pxd)).toEqual([21, 10.5, 5]);
    for (const p of ZOOM_PRESETS) expect(activePreset(pxdForPreset(p)), p.key).toBe(p.key);
    expect(activePreset(PXD_DEFAULT), "the view opens on 3m").toBe("3m");
    /* ⚠️ AND NONE OF THEM BETWEEN TWO. A switch that always showed one lit would claim the view is
       at a preset when a pinch has taken it somewhere else. */
    const between = (pxdForPreset(ZOOM_PRESETS[0]) + pxdForPreset(ZOOM_PRESETS[1])) / 2;
    expect(activePreset(between)).toBeNull();
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
  /**
   * ⚠️ RETARGETED (v65.1) — AND IT WENT RED ON THE FIX, WHICH IS THE POINT OF IT. It asserted the
   * clearance as 3.2% of the TRACK, which is what the code did and what the fault was: on a
   * three-year pipeline that is 376px either side of today, and 35 month labels rendered with NOT
   * ONE of them visible. The claim that survives is the one it was standing in for — no label
   * collides with the TODAY pill — and it is a PIXEL distance now, asserted in the v65.1 block at
   * the foot of this file along with the property that makes it a fix rather than a smaller number.
   */
  /**
   * §5 — ⚠️ THE CLEARANCE IS GONE BECAUSE THE LABEL HAS SOMEWHERE ELSE TO BE. A month was a POINT
   * that had to dodge the TODAY pill; a BAND names itself at its own left edge, stuck to the names
   * column, so nothing collides and nothing has to be hidden to avoid colliding. The fault that
   * clearance caused is recorded in CLAUDE.md and is what a band forecloses rather than fixes:
   * thirty-five labels rendered and not one of them visible.
   */
  it("§5 · one band per month, contiguous, alternating, each naming itself", () => {
    const bands = monthBands(EXT, PXD_DEFAULT);
    expect(bands.length).toBeGreaterThan(3);
    for (const b of bands) {
      expect(b.month, `${b.month}`).toBe(MONTH_FULL[new Date(b.ms).getMonth()]);
      expect(b.year).toMatch(/^\d{4}$/);
      expect(b.width, "a band with no width is a month nobody can see").toBeGreaterThan(0);
      expect(new Date(b.ms).getDate(), "a band starts on the first of its month").toBe(1);
    }
    /* ⚠️ CONTIGUOUS AND ALTERNATING — a gap between two bands is a strip of nothing where a month
       should be, and two neighbours the same tone are one band as far as a reader can tell. */
    for (let i = 1; i < bands.length; i += 1) {
      expect(Math.abs(bands[i].x - (bands[i - 1].x + bands[i - 1].width)), `gap before ${bands[i].month}`).toBeLessThan(0.001);
      expect(bands[i].alt, `${bands[i].month} repeats its neighbour's tone`).toBe(!bands[i - 1].alt);
    }
  });
  it("§5 · every Monday, carrying its own date", () => {
    for (const t of weekTicks(EXT, PXD_DEFAULT).slice(0, 12)) {
      expect(new Date(t.ms).getDay()).toBe(1);
      /* the date itself, not a blank mark: the label IS the day of the month */
      expect(t.label).toBe(String(new Date(t.ms).getDate()));
    }
  });
});

describe("§8.5 · the heat", () => {
  it("§5 · the two weights, stated", () => {
    expect([HEAT_CURRENT, HEAT_EXPECTED]).toEqual([0.28, 1]);
  });
  it("⚠️ an expected date outweighs a week of waiting — it is the thing a reader is looking for", () => {
    expect(HEAT_EXPECTED).toBeGreaterThan(HEAT_CURRENT * 3);
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
    /* §5 — the strip is 6px of opacity now, not a bar with a height: `.1 + .6 × √(w/max)` */
    expect(quiet!.opacity).toBeCloseTo(Math.min(0.7, 0.1 + 0.6 * Math.sqrt(quiet!.weight / max)), 6);
    /* linear would leave the quiet week at a tenth of the loud one; the root lifts it well above */
    expect(quiet!.opacity).toBeGreaterThan(0.1 + 0.6 * (quiet!.weight / max));
    for (const w of weeks) expect(w.opacity).toBeLessThanOrEqual(0.7);
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

describe("§8.7 · every live row draws a bar, at least a day wide (v65.1)", () => {
  const NOW2 = Date.UTC(2026, 8, 25, 12);
  const day = 86_400_000;
  const iso2 = (d: number) => new Date(NOW2 + d * day).toISOString();
  const agent2 = { id: "a", userId: "u", name: "A", agency: "B", responseTimeWeeks: 8 } as never;
  const build = (over: Record<string, unknown>) => {
    const q2 = { id: "q", userId: "u", manuscriptId: "m", agentId: "a", packageId: "", personalisationNotes: "", sendMethod: "Email", status: QueryStatus.QUERIED, ...over } as never;
    return buildQcRows([q2], [agent2], [], NOW2)[0];
  };

  /**
   * ⚠️ THE FIXTURE MUST BE ONE WHERE THE BAR WOULD OTHERWISE BE ZERO, OR THE FLOOR IS NEVER ASKED.
   * A query sent TODAY at an agency that states a window has an expected date eight weeks ahead, so
   * its bar runs forward and is wide by construction — the first version of this case used exactly
   * that and stayed green with the floor deleted. The case that needs the floor is a stage entered
   * today with NOTHING ahead of it: no stated window, so no expected date, so `from` and `to` are
   * both today.
   */
  const noWindow = { id: "a", userId: "u", name: "A", agency: "B" } as never;
  const buildNoWindow = (over: Record<string, unknown>) => {
    const q2 = { id: "q", userId: "u", manuscriptId: "m", agentId: "a", packageId: "", personalisationNotes: "", sendMethod: "Email", status: QueryStatus.QUERIED, ...over } as never;
    return buildQcRows([q2], [noWindow], [], NOW2)[0];
  };
  it("⚠️ a stage entered TODAY with nothing ahead of it still draws — one day, never nothing", () => {
    const r = buildNoWindow({ dateSent: iso2(0) });
    expect(r.expectedMs, "the fixture really has nothing ahead of it").toBeNull();
    const t = tlRow(r, NOW2);
    expect(t.bars.length).toBeGreaterThan(0);
    for (const b of t.bars) expect(b.toMs - b.fromMs, b.label).toBeGreaterThanOrEqual(day);
  });
  it("…and a dated stage with a date ahead runs forward to it, not to today", () => {
    const r = build({ dateSent: iso2(0) });
    const cur = tlRow(r, NOW2).bars.find((b) => b.current)!;
    expect(r.expectedMs).not.toBeNull();
    expect(cur.toMs).toBe(r.expectedMs);
    expect(cur.aheadFromMs, "and the stretch beyond today is drawn hollow").not.toBeNull();
  });
  it("⚠️ an UNDATED current stage draws too, dashed, from the last thing anything dated", () => {
    /* Full Sent with no `fullSentDate` and no `lastStatusChange`: nothing dates the stage it stands
       at, and before v65.1 the whole row drew nothing at all */
    const r = build({ dateSent: iso2(-60), status: QueryStatus.FULL_SENT, fullRequestedDate: iso2(-20) });
    expect(r.stageStartMs, "nothing dates it").toBeNull();
    const t = tlRow(r, NOW2);
    const cur = t.bars.filter((b) => b.current);
    expect(cur).toHaveLength(1);
    expect(cur[0].undated).toBe(true);
    expect(cur[0].words).toBe("stage not dated");
    /* from the previous stage's end — the only date available — and never from the send */
    expect(cur[0].fromMs).toBe(Date.parse(iso2(-20)));
    expect(t.bars.length, "and the history survives with it").toBeGreaterThan(1);
  });
  it("⚠️ …and its ghost is after the bar, never on the today line", () => {
    const r = build({ dateSent: iso2(-60), status: QueryStatus.FULL_REQUESTED, partialSentDate: iso2(-20) });
    const t = tlRow(r, NOW2);
    expect(t.ghost, "a with-you stage owes something").not.toBeNull();
    const last = t.bars[t.bars.length - 1];
    expect(last, "there is a bar to place the ghost after").toBeTruthy();
    /* the ghost is drawn from the last bar's end; with no bars it fell back to `now` and sat on the line */
    expect(last.toMs).toBeGreaterThan(0);
  });
  it("an undated stage with NOTHING dated draws nothing — there is nothing to draw from", () => {
    const r = build({ status: QueryStatus.FULL_SENT });
    expect(tlRow(r, NOW2).bars).toEqual([]);
  });
});

/**
 * ⚠️ §8.4's CLEARANCE BLOCK IS RETIRED, AND THE FAULT IT GUARDED IS FORECLOSED RATHER THAN FIXED.
 * A month label was a POINT that had to dodge the TODAY pill, so it carried a clearance — first as
 * 3.2% of the track (376px either side of today on a three-year pipeline, thirty-five labels
 * rendered and none visible), then as a fixed 34px. §5 makes a month a BAND that names itself at
 * its own left edge, stuck to the names column: there is nothing to dodge, so there is no clearance
 * to get wrong. The lesson is CLAUDE.md's and stays there; these two cases are about a mechanism
 * that no longer exists, and the band's own properties are asserted in §8.4's block above.
 */

/* ── v65.2 §9 · the heat ───────────────────────────────────────────────────────────────────────── */

describe("§9 · the heat", () => {
  /**
   * ⚠️ THE SCALE IS `√(w/max)`, AND A LINEAR ONE IS WHY. On this data a linear scale draws one
   * spike at the busiest week and a flat line everywhere else; the square root is what makes the
   * quiet weeks legible beside the loud one, and the 12% floor is so a week with anything in it is
   * still a mark rather than nothing.
   */
  it("§5 · the two weights and the curve are §5's own", () => {
    /* ⚠️ THE STRIP IS 6px OF OPACITY NOW, NOT A BAR WITH A HEIGHT (§5), and a PAST stage no longer
       earns a weight: §5 names two contributions — the current stage and the expected date. */
    expect([HEAT_CURRENT, HEAT_EXPECTED]).toEqual([0.28, 1]);
    const rows = buildQcRows([mkQ(), mkQ({ dateSent: ago(300) })], [agent()], [], NOW);
    const ext = extentOf(rows, NOW);
    const heat = heatWeeks(rows, ext, NOW);
    expect(heat.length, "the fixture drew no heat at all").toBeGreaterThan(3);
    const max = Math.max(...heat.map((h) => h.weight));
    for (const h of heat) {
      expect(h.opacity, `opacity at w=${h.weight}`).toBeCloseTo(Math.min(0.7, 0.1 + 0.6 * Math.sqrt(h.weight / max)), 6);
      expect(h, "a height belongs to the retired tall bars").not.toHaveProperty("heightPc");
    }
  });
  /* §9 — every week inside the extent and none outside it: a bar off the track is a week nobody sees */
  it("every bar is inside the extent", () => {
    const rows = buildQcRows([mkQ(), mkQ({ dateSent: ago(300) })], [agent()], [], NOW);
    const ext = extentOf(rows, NOW);
    for (const h of heatWeeks(rows, ext, NOW)) {
      expect(h.ms).toBeGreaterThanOrEqual(ext.fromMs);
      expect(h.ms).toBeLessThanOrEqual(ext.toMs);
    }
  });
});
