/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the one-screen dashboard's derivation layer (dashboard-one-screen-spec.md; § refs).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import {
  achievementPill, awaitingChip, chartEvents, GOAL_BLOCKS, goalBlocksFilled, goalPeriodStart,
  aggregateLedger, bindEvents, dailyLedger, defaultFreq, goalState, MIN_SPAN, monotonePath,
  nearestStop, RANGE_STOPS, rangeChip, rangeWindow, runStage, stopForDays, tenureLine,
  tourAutoRuns, tourChipShows, yScale,
} from "./oneScreen";

// Thursday 6 August 2026 — the ref's own day (ISO week starts Mon 3 Aug).
const NOW = new Date(2026, 7, 6, 15, 0, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const q = (over: Record<string, unknown>) => ({
  id: String(Math.random()),
  status: QueryStatus.QUERIED,
  ...over,
}) as any;

/* ══ §3 · the weekly ledger ══ */

describe("dailyLedger — the source of truth", () => {
  it("one row per DAY from the first send to today, quiet days included", () => {
    const led = dailyLedger([q({ dateSent: daysAgo(21) }), q({ dateSent: daysAgo(0) })], NOW);
    expect(led).toHaveLength(22);           // inclusive of both ends
    expect(led[1].sent).toBe(0);            // a quiet day is a row, not a gap
    expect(led[0].label).toBe("16 Jul");
    expect(led[led.length - 1].label).toBe("6 Aug");
  });

  it("a close can never precede its own send", () => {
    const led = dailyLedger(
      [q({ dateSent: daysAgo(3), status: QueryStatus.REJECTED, lastStatusChange: daysAgo(10) })],
      NOW,
    );
    expect(led.reduce((a, d) => a + d.closed, 0)).toBe(1);
    expect(led[led.length - 1].active).toBe(0); // sent then closed — never negative
  });

  it("no sends → an empty ledger, not a single hallucinated day", () => {
    expect(dailyLedger([q({})], NOW)).toEqual([]);
  });
});

describe("aggregateLedger — flows sum, the stock closes", () => {
  const queries = [
    q({ dateSent: daysAgo(80) }),
    q({ dateSent: daysAgo(60), status: QueryStatus.REJECTED, lastStatusChange: daysAgo(30) }),
    q({ dateSent: daysAgo(40) }),
    q({ dateSent: daysAgo(21), status: QueryStatus.NO_RESPONSE, lastStatusChange: daysAgo(9) }),
    q({ dateSent: daysAgo(6) }),
    q({ dateSent: daysAgo(1) }),
  ];
  const daily = dailyLedger(queries, NOW);

  /* ⚠️ THE INVARIANT THAT MAKES THE THREE VIEWS ONE DATASET. If it ever fails at a frequency,
     that frequency is telling a different story about the same days. */
  it.each(["daily", "weekly", "monthly"] as const)(
    "⚠️ RECONCILES BY CONSTRUCTION at %s: Δactive === sent − closed",
    (freq) => {
      const rows = aggregateLedger(daily, freq);
      expect(rows.length).toBeGreaterThan(1);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].active - rows[i - 1].active, `${freq} ${rows[i].label}`)
          .toBe(rows[i].sent - rows[i].closed);
      }
      expect(rows[0].active).toBe(rows[0].sent - rows[0].closed); // against an empty board
    },
  );

  it("⚠️ active is a STOCK — the period's CLOSING value, never a sum of its days", () => {
    const weekly = aggregateLedger(daily, "weekly");
    for (const w of weekly) {
      const days = daily.filter((d) => d.start >= w.start && d.end <= w.end);
      expect(w.active).toBe(days[days.length - 1].active);
      // and summing would be plainly wrong wherever the week holds more than one day
      if (days.length > 1 && w.active > 0) {
        expect(w.active).not.toBe(days.reduce((a, d) => a + d.active, 0));
      }
    }
  });

  it("sent and closed are FLOWS — every day's is counted exactly once, at every frequency", () => {
    const totals = (rows: ReturnType<typeof dailyLedger>) =>
      rows.reduce((a, r) => ({ sent: a.sent + r.sent, closed: a.closed + r.closed }), { sent: 0, closed: 0 });
    const base = totals(daily);
    expect(base.sent).toBe(6);
    expect(totals(aggregateLedger(daily, "weekly"))).toEqual(base);
    expect(totals(aggregateLedger(daily, "monthly"))).toEqual(base);
  });

  it("labels name their grain; weekly buckets start on the Monday", () => {
    expect(aggregateLedger(daily, "weekly").every((w) => w.start.getDay() === 1)).toBe(true);
    expect(aggregateLedger(daily, "monthly").every((m) => m.start.getDate() === 1)).toBe(true);
    expect(aggregateLedger(daily, "monthly").at(-1)!.label).toBe("Aug 26");
  });

  it("daily passes straight through — it IS the source, not a re-derivation", () => {
    expect(aggregateLedger(daily, "daily")).toBe(daily);
  });
});

describe("the range window", () => {
  const daily = dailyLedger(
    Array.from({ length: 40 }, (_, i) => q({ dateSent: daysAgo(i * 9) })),
    NOW,
  );

  /* ⚠️ DAYS, NOT POINTS — the reason the two controls are independent. */
  it("⚠️ the SAME 56 days of history at every frequency", () => {
    const span = (rows: ReturnType<typeof dailyLedger>) =>
      rows.length ? rows.at(-1)!.end.getTime() - rows[0].start.getTime() : 0;
    const day = rangeWindow(aggregateLedger(daily, "daily"), 56);
    const week = rangeWindow(aggregateLedger(daily, "weekly"), 56);
    expect(day).toHaveLength(57);           // 56 days back, inclusive
    expect(week.length).toBeLessThan(10);   // far fewer POINTS…
    // …covering the same window, to within the week the cutoff lands inside
    expect(Math.abs(span(day) - span(week)) / 86400000).toBeLessThan(7);
  });

  it("0 days means everything; a window too small still yields a line", () => {
    const all = aggregateLedger(daily, "monthly");
    expect(rangeWindow(all, 0)).toBe(all);
    expect(rangeWindow(all, 1).length).toBe(2); // a line needs two points
  });

  it("the stops are the only positions the thumb can rest at", () => {
    expect(RANGE_STOPS.map((s) => s.days)).toEqual([14, 30, 56, 91, 182, 365, 0]);
    expect(nearestStop(30).label).toBe("Last 8 weeks");  // snaps to p:34, not p:14
    expect(nearestStop(99).days).toBe(0);
    expect(stopForDays(56).p).toBe(34);
    expect(stopForDays(999)).toBe(RANGE_STOPS[2]);       // unknown falls back, never throws
  });

  it("the chip names the movement over the range, in words at zero", () => {
    expect(rangeChip([{ active: 3 } as any, { active: 7 } as any])).toBe("↑ +4 over this range");
    expect(rangeChip([{ active: 7 } as any, { active: 3 } as any])).toBe("↓ -4 over this range");
    expect(rangeChip([{ active: 5 } as any, { active: 5 } as any])).toBe("Level over this range");
  });
});

describe("⚠️ a new account opens on DAILY", () => {
  it("under four weeks of record is daily; past it, weekly", () => {
    expect(defaultFreq(dailyLedger([q({ dateSent: daysAgo(5) })], NOW))).toBe("daily");
    expect(defaultFreq(dailyLedger([q({ dateSent: daysAgo(26) })], NOW))).toBe("daily");
    expect(defaultFreq(dailyLedger([q({ dateSent: daysAgo(27) })], NOW))).toBe("weekly");
    expect(defaultFreq([])).toBe("daily");
  });
});

/* ══ §3 · y-scale ══ */

describe("yScale — the minimum span is the point", () => {
  it("never goes below zero and never spans less than MIN_SPAN", () => {
    const s = yScale([2, 3]);
    expect(s.lo).toBeGreaterThanOrEqual(0);
    expect(s.hi - s.lo).toBeGreaterThanOrEqual(MIN_SPAN);
  });

  it("⚠️ a beginner's 2–3 queries do not read as a cliff (§3)", () => {
    const s = yScale([2, 3, 2]);
    // the data occupies at most a fifth of the axis — a gentle slope, not a mountain range
    expect((3 - 2) / (s.hi - s.lo)).toBeLessThanOrEqual(1 / MIN_SPAN);
  });

  it("pads a real range by ~25% and floors at zero", () => {
    const s = yScale([0, 16]);
    expect(s.lo).toBe(0);
    expect(s.hi).toBeGreaterThanOrEqual(20);
  });
});

/* ══ §3 · monotone cubic ══ */

describe("monotonePath — Fritsch–Carlson, never an overshoot", () => {
  it("passes exactly through every data point", () => {
    const pts: [number, number][] = [[0, 100], [50, 40], [100, 60], [150, 20]];
    const d = monotonePath(pts);
    for (const [x, y] of pts) expect(d).toContain(`${x.toFixed(1)} ${y.toFixed(1)}`);
  });

  /* ⚠️ THE SPEC'S OWN REJECTION CASE: on monotone data every Bézier control ordinate must stay
     within its segment's bounds — an overshooting spline (Catmull-Rom on this data) would emit a
     control point beyond them, drawing a dip that never happened. */
  it("control points stay within neighbour bounds on monotone data", () => {
    const pts: [number, number][] = [[0, 100], [60, 80], [120, 30], [180, 28]];
    const d = monotonePath(pts);
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    for (const y of ys) {
      expect(y).toBeLessThanOrEqual(100 + 1e-6);
      expect(y).toBeGreaterThanOrEqual(28 - 1e-6);
    }
  });

  it("flat segments stay flat — no invented wobble between equal values", () => {
    const d = monotonePath([[0, 50], [60, 50], [120, 50]]);
    const ys = d.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 1);
    for (const y of ys) expect(y).toBe(50);
  });

  it("degrades to a straight line under three points, and to nothing at zero", () => {
    expect(monotonePath([[0, 1], [10, 2]])).toBe("M0.0 1.0 L10.0 2.0");
    expect(monotonePath([])).toBe("");
  });
});

/* ══ §3 · event pins ══ */

describe("chartEvents", () => {
  const name = (x: any) => x.agentName ?? "the agent";

  it("derives first request, first full and offers from the queries' own fields", () => {
    const evs = chartEvents([
      q({ agentName: "Fenella", dateSent: daysAgo(60), partialRequestedDate: daysAgo(50) }),
      q({ agentName: "Sophie", dateSent: daysAgo(40), fullRequestedDate: daysAgo(20) }),
      q({ agentName: "Tom", dateSent: daysAgo(30), status: QueryStatus.OFFER, lastStatusChange: daysAgo(5) }),
    ], name);
    expect(evs.map((e) => e.kind)).toEqual(["First request", "First full", "Offer"]);
    expect(evs[0].who).toBe("Fenella");
  });

  it("⚠️ the first full EATS the first request when the full IS the first request", () => {
    const evs = chartEvents([q({ agentName: "Sophie", dateSent: daysAgo(30), fullRequestedDate: daysAgo(10) })], name);
    expect(evs.map((e) => e.kind)).toEqual(["First full"]);
  });

  it("an offer with no usable date is omitted rather than pinned to a guessed week", () => {
    expect(chartEvents([q({ status: QueryStatus.OFFER })], name)).toEqual([]);
  });

  /* ⚠️ the event carries its own MOMENT; which point wears the pin is the view's business, so
     the same offer pins one day at daily grain and the week containing it at weekly. */
  it("binds to the point that CONTAINS it — at whatever frequency is drawn", () => {
    const queries = [q({ agentName: "Tom", dateSent: daysAgo(30), status: QueryStatus.OFFER, lastStatusChange: daysAgo(5) })];
    const evs = chartEvents(queries, name);
    const daily = dailyLedger(queries, NOW);
    const dayPin = bindEvents(daily, evs);
    expect(dayPin.size).toBe(1);
    expect(daily[[...dayPin.keys()][0]].label).toBe("1 Aug"); // the day it happened

    const weekly = aggregateLedger(daily, "weekly");
    const wkPin = bindEvents(weekly, evs);
    expect(weekly[[...wkPin.keys()][0]].label).toBe("27 Jul"); // the week that holds it
  });

  it("an event outside the window is DROPPED, never clamped onto the edge", () => {
    const queries = [q({ agentName: "Tom", dateSent: daysAgo(90), status: QueryStatus.OFFER, lastStatusChange: daysAgo(80) })];
    const view = rangeWindow(dailyLedger(queries, NOW), 14);
    expect(bindEvents(view, chartEvents(queries, name)).size).toBe(0);
  });
});

/* ══ §2 · tenure ══ */

describe("tenureLine", () => {
  it("names the month of the earliest send, and is null before the first query", () => {
    expect(tenureLine([q({ dateSent: new Date(2024, 2, 15).toISOString() }), q({ dateSent: daysAgo(1) })]))
      .toBe("Querying since March 2024");
    expect(tenureLine([q({})])).toBeNull();
  });
});

/* ══ §7 · the achievement pill ══ */

describe("achievementPill — the highest-priority TRUE fact, facts only", () => {
  it("falls back to awaiting-a-reply on an empty history — never a consolation", () => {
    const a = achievementPill([], NOW);
    expect(a.key).toBe("awaiting");
    expect(a.strong).toBe("0");
    expect(a.post).toContain("queries awaiting");
  });

  it("the fallback agrees in number at one", () => {
    const a = achievementPill([q({ dateSent: daysAgo(3) })], NOW);
    expect(a.key === "awaiting" ? a.post : "").toContain("query awaiting");
  });

  it("a streak of ≥4 consecutive weeks fires rule 2", () => {
    const queries = [0, 7, 14, 21, 28].map((d) => q({ dateSent: daysAgo(d) }));
    const a = achievementPill(queries, NOW);
    expect(a.key).toBe("streak");
    expect(a.strong).toBe("5 weeks");
  });

  it("⚠️ the current week PENDING does not break a streak — a streak dies only after a full quiet week", () => {
    // sends in the four weeks BEFORE this one, nothing yet this week
    const queries = [7, 14, 21, 28].map((d) => q({ dateSent: daysAgo(d) }));
    expect(achievementPill(queries, NOW).key).toBe("streak");
  });

  it("a milestone within 14 days beats the streak fallback path when higher rules are false", () => {
    // exactly 10 sends, the 10th two days ago, spread out so no streak forms
    const queries = [
      ...[200, 190, 180, 170, 150, 140, 120, 100, 80].map((d) => q({ dateSent: daysAgo(d) })),
      q({ dateSent: daysAgo(2) }),
    ];
    const a = achievementPill(queries, NOW);
    expect(a.key).toBe("milestone");
    expect(a.strong).toBe("10th query");
    expect(a.post).toContain("this week");
  });

  it("best month requires ≥3 completed months, a strict beat, ≥3 sent, and the 14-day window", () => {
    // May: 1, Jun: 2, Jul: 4 — July closed 6 days before NOW (6 Aug), strictly best, ≥3
    const mk = (y: number, m: number, d: number) => q({ dateSent: new Date(y, m, d).toISOString() });
    const queries = [
      mk(2026, 4, 10),
      mk(2026, 5, 5), mk(2026, 5, 20),
      mk(2026, 6, 2), mk(2026, 6, 9), mk(2026, 6, 16), mk(2026, 6, 23),
    ];
    const a = achievementPill(queries, NOW);
    expect(a.key).toBe("record");
    expect(a.strong).toBe("4 sent in July");
  });

  it("…and a TIED month is not a record — the beat must be strict", () => {
    const mk = (m: number, d: number) => q({ dateSent: new Date(2026, m, d).toISOString() });
    const queries = [
      mk(4, 1), mk(4, 2), mk(4, 3), mk(4, 4),
      mk(5, 1),
      mk(6, 2), mk(6, 9), mk(6, 16), mk(6, 23), // July: 4, tying May's 4
    ];
    expect(achievementPill(queries, NOW).key).not.toBe("record");
  });

  it("a new fastest reply fires only when it BEATS the prior best, inside 30 days", () => {
    const queries = [
      q({ dateSent: daysAgo(100), responseReceivedAt: daysAgo(80) }),  // 20 days — the old best
      q({ dateSent: daysAgo(15), responseReceivedAt: daysAgo(6) }),    // 9 days — new best, recent
    ];
    const a = achievementPill(queries, NOW);
    expect(a.key).toBe("fastest");
    expect(a.strong).toBe("9 days");
  });

  it("matching the old record is not news", () => {
    const queries = [
      q({ dateSent: daysAgo(100), responseReceivedAt: daysAgo(91) }), // 9 days
      q({ dateSent: daysAgo(15), responseReceivedAt: daysAgo(6) }),   // 9 days again
    ];
    expect(achievementPill(queries, NOW).key).not.toBe("fastest");
  });
});

/* ══ §6 · goals ══ */

describe("goalState + the 25-block meter", () => {
  it("derives done from sends inside the current period — never stored", () => {
    const g = goalState([
      q({ dateSent: daysAgo(2) }),                                     // inside Q3
      q({ dateSent: new Date(2026, 2, 1).toISOString() }),             // Q1 — outside
    ], 25, "quarter", NOW)!;
    expect(g.done).toBe(1);
    expect(g.sentence).toBe("Query 25 agents this quarter");
  });

  it("no target → no goal state (the day-one CTA renders instead)", () => {
    expect(goalState([], undefined, undefined, NOW)).toBeNull();
    expect(goalState([], 0, "quarter", NOW)).toBeNull();
  });

  it("quarter starts are calendar quarters", () => {
    expect(goalPeriodStart("quarter", NOW).getMonth()).toBe(6); // Jul for an Aug now
    expect(goalPeriodStart("month", NOW).getDate()).toBe(1);
    expect(goalPeriodStart("year", NOW).getMonth()).toBe(0);
  });

  it("⚠️ the meter rounds DOWN and never claims more than happened", () => {
    expect(goalBlocksFilled(21, 25)).toBe(21); // the ref's own figure: 21/25 → 21 blocks
    expect(goalBlocksFilled(1, 25)).toBe(1);
    expect(goalBlocksFilled(2, 3)).toBe(16);   // 2/3 of 25 = 16.67 → 16, not 17
    expect(goalBlocksFilled(30, 25)).toBe(GOAL_BLOCKS); // over-achievement caps at full
    expect(goalBlocksFilled(0, 0)).toBe(0);    // never NaN
  });
});

/* ══ §12 · tour visibility ══ */

describe("tour visibility — derived, never a stored day-7 flag", () => {
  it("auto-runs only when never completed, and never below the breakpoint", () => {
    expect(tourAutoRuns(undefined, true)).toBe(true);
    expect(tourAutoRuns("2026-08-01T00:00:00Z", true)).toBe(false);
    expect(tourAutoRuns(undefined, false)).toBe(false);
  });

  it("the chip lives for the account's first 7 days, from the CREATION time", () => {
    expect(tourChipShows(daysAgo(3), NOW, true)).toBe(true);
    expect(tourChipShows(daysAgo(8), NOW, true)).toBe(false);
    expect(tourChipShows(daysAgo(3), NOW, false)).toBe(false);
  });

  it("no creation time on record → no chip, never a guess", () => {
    expect(tourChipShows(undefined, NOW, true)).toBe(false);
  });
});

/* ══ §9 · run stage ══ */

describe("runStage — day one, early days, settled", () => {
  it("nothing at all is day one; a manuscript alone is still before the line", () => {
    expect(runStage([], [], NOW)).toBe("day-one");
    expect(runStage([], [{ id: "m1" }], NOW)).toBe("early-days");
  });

  it("the first fortnight from the FIRST SEND is early days; beyond it, settled", () => {
    expect(runStage([q({ dateSent: daysAgo(3) })], [{}], NOW)).toBe("early-days");
    expect(runStage([q({ dateSent: daysAgo(14) })], [{}], NOW)).toBe("early-days");
    expect(runStage([q({ dateSent: daysAgo(15) })], [{}], NOW)).toBe("settled");
  });

  it("the early-days chip states what is out, singular-safe by construction", () => {
    expect(awaitingChip([q({ dateSent: daysAgo(1) })])).toBe("1 awaiting a reply");
    expect(awaitingChip([])).toBe("0 awaiting a reply");
  });
});
