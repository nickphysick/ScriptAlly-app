/**
 * A query's clock (non-workspace v1, Phase 3) — the locks.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { queryClock, CLOCK_DEFAULTS } from "./queryClock";
import { queryState, quietWeeksOf, DEFAULT_QUIET_WEEKS } from "./queryState";
import { STAGE_RESPONSE_WINDOWS } from "./queryAmbient";
import { NUDGE_GRACE_DAYS } from "./taskPrecedence";
import { DEFAULT_CHECKBACK_DAYS } from "./todoWalk";
import { clockCaption } from "../components/settings/ClockTimeline";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-12T12:00:00Z");

/* A seeded spread: one query in each time-driven state, plus closed and offer (proved below to cover them). */
const SEED = [
  { status: "Queried", expectedMs: NOW + 10 * DAY },                       // with the agent
  { status: "Queried", expectedMs: NOW - 5 * DAY },                        // nudge due
  { status: "Queried", expectedMs: NOW - 40 * DAY },                       // gone quiet (4 weeks)
  { status: "Queried", expectedMs: NOW - 70 * DAY, nudge: NOW - 10 * DAY }, // nudged, inside the window
  { status: "Queried", expectedMs: NOW - 90 * DAY, nudge: NOW - 35 * DAY }, // nudged, quiet
  { status: "Partial Requested", expectedMs: null },
  { status: "Rejected", expectedMs: null },
  { status: "Offer", expectedMs: null },
];
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const run = (weeks: number) => SEED.map((s) => queryState({
  status: s.status, expectedMs: s.expectedMs, stageStartMs: NOW - 100 * DAY, sentMs: NOW - 150 * DAY, nrmn: false,
  query: { lastNudgeSentDate: "nudge" in s && s.nudge ? iso(s.nudge) : null, dateSent: iso(NOW - 150 * DAY) },
}, { quietWeeks: weeks, nowMs: NOW }));

describe("with no stored prefs, nothing moves", () => {
  it("the defaults are today's constants", () => {
    expect(CLOCK_DEFAULTS).toEqual({
      replyWeeks: STAGE_RESPONSE_WINDOWS.query,
      nudgeAfterWeeks: NUDGE_GRACE_DAYS / 7,
      checkBackWeeks: DEFAULT_CHECKBACK_DAYS / 7,
      quietWeeks: 4,
    });
    expect(queryClock(null)).toEqual(CLOCK_DEFAULTS);
    expect(quietWeeksOf({})).toBe(DEFAULT_QUIET_WEEKS);
  });
  it("the seed covers every time-driven state", () => {
    expect(new Set(run(DEFAULT_QUIET_WEEKS))).toEqual(new Set(["agent", "nudge", "quiet", "materials", "closed", "offer"]));
  });
  it("every seeded query has the same state before (the v153.3 default) and after (the clock)", () => {
    expect(run(quietWeeksOf({}))).toEqual(run(4));
  });
  it("a writer's own v153.3 window is honoured", () => {
    expect(quietWeeksOf({ todoPrefs: { queries: { quietWeeks: 8 } } })).toBe(8);
    expect(quietWeeksOf({ todoPrefs: { queries: { quietWeeks: 8 } }, workspacePrefs: { clock: { quietWeeks: 3 } } })).toBe(3);
  });
});

describe("changing goes quiet moves the quiet date and nothing else", () => {
  it("only quietWeeks changes in the clock", () => {
    const c = queryClock({ workspacePrefs: { clock: { quietWeeks: 8 } } });
    expect({ ...c, quietWeeks: CLOCK_DEFAULTS.quietWeeks }).toEqual(CLOCK_DEFAULTS);
  });
  it("only the queries on the quiet boundary change state", () => {
    const at4 = run(4), at8 = run(8);
    const moved = at4.map((s, i) => (s === at8[i] ? null : `${s}→${at8[i]}`)).filter(Boolean);
    expect(moved).toEqual(["quiet→nudge", "quiet→agent"]);
  });
  it("the caption redraws from the clock", () => {
    const t = new Date(NOW);
    expect(clockCaption(CLOCK_DEFAULTS, t)).toContain("If you nudge and still hear nothing");
    expect(clockCaption({ ...CLOCK_DEFAULTS, quietWeeks: 2 }, t)).not.toContain("If you nudge");
  });
});

describe("one source for the four numbers", () => {
  it("queryClock.ts states no week figure of its own beyond the legacy quiet choices", () => {
    const src = readFileSync(resolve(__dirname, "queryClock.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const nums = (src.match(/\b\d+\b/g) ?? []).filter((n) => !["2", "3", "4", "6", "8", "7"].includes(n));
    expect(nums).toEqual([]);
    expect(src.match(/LEGACY_QUIET_DEFAULT = (\d+)/)?.[1]).toBe("4");
  });
  it("Settings reads the clock, never a literal", () => {
    const s = readFileSync(resolve(__dirname, "../components/AccountSettings.tsx"), "utf8");
    expect(s).toContain("const clock = queryClock(currentUser);");
    expect(s).not.toMatch(/quietWeeks\s*[:=]\s*\d/);
    expect(s).not.toMatch(/\b(replyWeeks|nudgeAfterWeeks|checkBackWeeks)\s*[:=]\s*\d/);
  });
});
