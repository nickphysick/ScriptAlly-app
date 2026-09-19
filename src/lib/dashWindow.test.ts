/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashWindow — the card over a campaign's life (v33, 18 Sep).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Query } from "../types";
import { aggregateLedger, dailyLedger, rangeWindow } from "./oneScreen";
import {
  campaignStage, clampWindowEnd, firstMonthLabel, longView, MINIMAP_AFTER_DAYS, rangeSentence, sinceLabel, thumbnailSeries,
  WINDOW_DAYS, windowBox, windowFraction,
} from "./dashWindow";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const DAY = 86400000;
const ago = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();
let seq = 0;
const q = (sent: number | null): Query =>
  ({ id: `k${++seq}`, userId: "u", agentId: "a", manuscriptId: "m", status: QueryStatus.QUERIED, dateSent: sent === null ? undefined : ago(sent) } as unknown as Query);

describe("⚠️ the stage is the amount of QUERY HISTORY, never the account's age", () => {
  it("none · short · long — and twelve weeks is one and a half windows", () => {
    expect(MINIMAP_AFTER_DAYS).toBe(84);
    expect(MINIMAP_AFTER_DAYS).toBe(WINDOW_DAYS * 1.5);
    expect(campaignStage(dailyLedger([q(null)], NOW))).toBe("none");
    expect(campaignStage(dailyLedger([q(12)], NOW))).toBe("short");
    expect(campaignStage(dailyLedger([q(82)], NOW))).toBe("short");
    expect(campaignStage(dailyLedger([q(83)], NOW))).toBe("long");
    /* an imported two-year campaign is long on its first day */
    expect(campaignStage(dailyLedger([q(730), q(0)], NOW))).toBe("long");
  });
  it("the short campaign says since when, and the minimap names the first month", () => {
    const d = dailyLedger([q(15)], NOW);
    expect(sinceLabel(d)).toBe("since 2 Sep");
    expect(firstMonthLabel(dailyLedger([q(640)], NOW))).toBe("Dec 2024");
    expect(sinceLabel([])).toBeNull();
  });
});

describe("the window", () => {
  const daily = dailyLedger(Array.from({ length: 50 }, (_, i) => q(i * 12)), NOW);
  const last = daily.length - 1;
  it("⚠️ at today it IS the chart the page drew before — the weekly roll-up cut to eight weeks", () => {
    const before = rangeWindow(aggregateLedger(daily.map((p) => ({ ...p })), "weekly"), 56);
    expect(longView(daily, last).map((p) => [p.label, p.active])).toEqual(before.map((p) => [p.label, p.active]));
  });
  it("dragged back, its last point closes on the window's own last day, and the ledger is not mutated", () => {
    const snap = JSON.stringify(daily.map((p) => p.active));
    const v = longView(daily, last - 100);
    expect(v[v.length - 1].end.getTime()).toBe(daily[last - 100].end.getTime());
    expect(v[v.length - 1].active).toBe(daily[last - 100].active);
    expect(JSON.stringify(daily.map((p) => p.active)), "aggregation rewrites its buckets in place — never the caller's rows").toBe(snap);
  });
  /* ⚠️ `windowAtToday` IS RETIRED (the v34 mockup, 19 Sep): the end of the chart always disintegrates now,
     so nothing asks whether the window reaches today. What replaces it here is what the control SAYS. */
  it("the control names the range it is showing, and that it drags", () => {
    expect(rangeSentence(longView(daily, last))).toMatch(/^Showing \d{1,2} [A-Z][a-z]{2} to \d{1,2} [A-Z][a-z]{2}\. Drag to change the dates\.$/);
    expect(rangeSentence(longView(daily, last - 100))).not.toBe(rangeSentence(longView(daily, last)));
    expect(rangeSentence([])).toBe("Drag to change the dates.");
  });
  it("it cannot be dragged off either end", () => {
    expect(clampWindowEnd(99999, daily.length)).toBe(last);
    expect(clampWindowEnd(-5, daily.length)).toBe(WINDOW_DAYS);
  });
  it("the window's fraction of the record ends where the window ends", () => {
    for (const end of [WINDOW_DAYS, 200, 333, last]) {
      const f = windowFraction(end, daily.length);
      expect(f.left + f.width).toBeLessThanOrEqual(1 + 1e-9);
      expect(f.left + f.width).toBeCloseTo(end / (daily.length - 1), 9);
    }
    expect(windowFraction(last, daily.length).left + windowFraction(last, daily.length).width).toBeCloseTo(1, 9);
  });

  /* ⚠️ THE MOCKUP LETS A NARROW WINDOW RUN PAST THE TRACK'S RIGHT-HAND END AND CLIPS IT — a shortcut, not
     the intent. Asserted as a PROPERTY over every end position, track width and record length, with
     the floor-binding branch counted: a sweep that never reached the floor would prove nothing. */
  it("⚠️ the drawn window is inside its track at every position — even where its 22px floor is wider than its eight weeks", () => {
    let floored = 0, natural = 0;
    for (const len of [90, 200, 600, 1100]) for (const trackW of [120, 178, 200, 460]) {
      for (let end = Math.min(WINDOW_DAYS, len - 1); end <= len - 1; end += 7) {
        const b = windowBox(end, len, trackW, 22);
        expect(b.left, `len ${len} track ${trackW} end ${end}`).toBeGreaterThanOrEqual(-1e-9);
        expect(b.left + b.width).toBeLessThanOrEqual(trackW + 1e-9);
        expect(b.width).toBeGreaterThanOrEqual(Math.min(22, trackW) - 1e-9);
        if (windowFraction(end, len).width * trackW < 22) floored += 1; else natural += 1;
      }
      /* at today the window is hard against the track's right-hand end, floored or not */
      const today = windowBox(len - 1, len, trackW, 22);
      expect(today.left + today.width).toBeCloseTo(trackW, 6);
    }
    expect(floored, "the floor bound somewhere").toBeGreaterThan(50);
    expect(natural, "and did not bind somewhere").toBeGreaterThan(50);
  });
  it("the thumbnail is thinned, and always keeps the first and the last day", () => {
    const t = thumbnailSeries(daily, 120);
    expect(t.length).toBe(120);
    expect(t[0]).toBe(daily[0].active);
    expect(t[119]).toBe(daily[last].active);
    expect(thumbnailSeries(daily.slice(0, 30)).length).toBe(30);
  });
});
