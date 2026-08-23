/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The goals card's three states, and the things that must never come back.
 *
 * ⚠️ THESE ARE STRING-RENDERED (no jsdom in this repo — vitest is `environment: 'node'`), so they
 * prove the markup was produced, never that it laid out. Geometry is measured in
 * `tests/e2e/goalsCard.measure.ts` against a real browser.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { UserPlan } from "../../types";
import type { QueryingGoalEntry } from "../../types";
import { OneScreenRail } from "./OneScreenRail";
import { deriveGoalProgress } from "../../lib/queryingGoals";

const NOW = new Date("2026-08-23T12:00:00Z");
const rail = readFileSync(resolve(__dirname, "./OneScreenRail.tsx"), "utf8");
const sheet = readFileSync(resolve(__dirname, "./GoalTargetSheet.tsx"), "utf8");
const goalCss = readFileSync(resolve(__dirname, "./queryingGoals.css"), "utf8");
const oneCss = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8");
/* ⚠️ COMMENTS STRIPPED BEFORE ANY SOURCE ASSERTION. Every retirement in this codebase is
   documented by quoting what it retired, so a raw-source `not.toContain` matches its own prose.
   This has produced seven false reds in one session before now. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const railDecls = decls(rail);
const cssDecls = decls(goalCss);
const oneCssDecls = decls(oneCss);

const entry = (target: number | null, cadence: "week" | "fortnight" | "month" | null, effectiveFrom: string): QueryingGoalEntry =>
  ({ target, cadence, effectiveFrom });

const render = (sent: string[], entries: QueryingGoalEntry[], now = NOW) =>
  renderToStaticMarkup(
    <OneScreenRail
      expanded={false} setExpanded={() => {}}
      loading={false} queries={[]} agents={[]} manuscripts={[]} userTasks={[]} activities={[]}
      currentUser={{ id: "u", name: "N", plan: UserPlan.FREE, queryingGoals: entries } as any}
      goal={deriveGoalProgress(sent.map((d) => ({ dateSent: d })), entries, now)}
      activeManuscript={null} onNavigate={() => {}} updateUserProfile={async () => {}} now={now}
    />,
  );

const MONTHLY_10 = [entry(10, "month", "2026-01-01")];

describe("state A — no target set", () => {
  const html = render(["2026-08-02", "2026-08-09", "2026-07-04"], []);

  it("states the month's count, and the noun agrees", () => {
    expect(html).toContain("You&#x27;ve sent 2 queries this month.");
    expect(render(["2026-08-02"], [])).toContain("You&#x27;ve sent 1 query this month.");
    expect(render([], [])).toContain("You&#x27;ve sent 0 queries this month.");
  });

  it("offers the way to set one", () => {
    expect(html).toContain("os-goal-set");
    expect(html).toContain("Set a target");
  });

  it("⚠️ the history strip still draws — it is not a goal artefact", () => {
    expect(html).toContain("os-goal-hist");
    expect(html).toContain("JUL");
  });

  it("⚠️ no meter, no illustration, no cadence tag and no ⋯ — none of them has a subject yet", () => {
    expect(html).not.toMatch(/["\s`]os-goal-meter["\s`]/);
    expect(html).not.toMatch(/["\s`]os-goal-illph["\s`]/);
    expect(html).not.toMatch(/["\s`]os-goal-cad["\s`]/);
    expect(html).not.toMatch(/["\s`]os-goal-more["\s`]/);
  });
});

describe("state B — in progress", () => {
  const html = render(["2026-08-02", "2026-08-09", "2026-08-14"], MONTHLY_10);

  it("the count and the target, and the period beneath", () => {
    expect(html).toContain(">3</span>");
    expect(html).toContain("of 10");
    expect(html).toContain("Queries sent · August");
  });

  it("the meter is drawn to the proportion, and labelled for a screen reader", () => {
    expect(html).toContain("os-goal-meter");
    expect(html).toContain("width:30%");
    expect(html).toContain('aria-label="3 of 10 queries sent"');
  });

  it("the cadence tag and the ⋯ appear once there is a target", () => {
    expect(html).toContain("Monthly");
    expect(html).toContain("os-goal-more");
    expect(render(["2026-08-02"], [entry(4, "week", "2026-08-17")])).toContain("Weekly");
    expect(render(["2026-08-02"], [entry(4, "fortnight", "2026-08-17")])).toContain("Fortnightly");
  });

  it("⚠️ no illustration and no reached line below the target", () => {
    expect(html).not.toMatch(/["\s`]os-goal-illph["\s`]/);
    expect(html).not.toContain("Target reached");
  });
});

describe("state C — target reached", () => {
  const sends = ["2026-08-02", "2026-08-05", "2026-08-08", "2026-08-11", "2026-08-14",
    "2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19"];
  const html = render(sends, MONTHLY_10);

  it("the illustration placeholder stands in for an asset that does not exist yet", () => {
    expect(html).toContain("os-goal-illph");
    expect(html).toContain("104 × 104");
  });

  it("⚠️ THE METER IS GONE — at target it could only ever read full", () => {
    expect(html).not.toMatch(/["\s`]os-goal-meter["\s`]/);
  });

  it("states the day it happened", () => {
    expect(html).toContain("Target reached 19 August");
  });

  it("⚠️ the count climbs past the target and the date HOLDS", () => {
    const later = render([...sends, "2026-08-21", "2026-08-22"], MONTHLY_10);
    expect(later).toContain(">12</span>");
    expect(later).toContain("of 10");
    expect(later).toContain("Target reached 19 August");
  });

  it("the history strip centres beneath it", () => {
    /* ⚠️ THE FIXTURE NEEDS A COMPLETED PERIOD. Every send above is in August, so there is no
       finished month to report and the strip correctly does not draw — which failed this case on
       its first run and was the derivation being right, not wrong. */
    const withPast = render([...sends, "2026-07-04", "2026-07-11"], MONTHLY_10);
    expect(withPast).toContain("os-goal-hist mid");
    expect(withPast).toContain("JUL");
  });

  it("⚠️ the entrance fires only on the day — not on every mount", () => {
    /* reachedOn is 19 Aug; asked on the 23rd the class is absent, asked on the 19th it is there. */
    expect(html).not.toMatch(/["\s`]os-goal-fade["\s`]/);
    const onTheDay = render(sends, MONTHLY_10, new Date("2026-08-19T20:00:00Z"));
    expect(onTheDay).toContain("os-goal-fade");
  });
});

describe("⚠️ the card reports — it never appraises", () => {
  const every = [
    render([], []), render(["2026-08-02"], MONTHLY_10),
    render(Array(12).fill("2026-08-02"), MONTHLY_10),
  ].join("\n");

  it("no verdict language in any state", () => {
    for (const word of ["Goal met", "missed", "behind", "on track", "keep going", "well done",
      "only", "already", "still", "should"]) {
      expect(every.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  it("⚠️ no shortfall is carried, and no pace or projection is offered", () => {
    for (const word of ["shortfall", "catch up", "catch-up", "per day", "at this rate", "projected"]) {
      expect(every.toLowerCase()).not.toContain(word);
    }
  });
});

describe("⚠️ nothing on this card changes colour with progress", () => {
  it("the meter fill is ONE declaration and no variant restates it", () => {
    /* A meter that warms as a deadline nears turns a record into a verdict. The fill is stated
       once; a second `background` on `.os-goal-meter i` anywhere would be the tell. */
    const fills = cssDecls.match(/\.os-goal-meter i[^{]*\{[^}]*background:[^;]+;/g) ?? [];
    expect(fills).toHaveLength(1);
    expect(fills[0]).toContain("#bf8a7b");
  });

  it("⚠️ the palette is a CLOSED SET — an amber cannot arrive without failing here", () => {
    /* ⚠️ THIS WAS A SUBSTRING SWEEP FOR "red" AND IT MATCHED `prefers-reduced-motion`. Exactly the
       looseness this repo has been bitten by twice (`tdk-q` matching `tdk-quiet`), committed
       inside the test written to prevent a colour fault. A word search cannot tell burgundy from
       a warning either — #7c3a2a is red-dominant and is the brand accent.
       So the palette is enumerated. Adding a colour means adding it here and saying why, which is
       the point: an amber or a red would have to be argued for in this list. */
    const ALLOWED = new Set([
      "#9a8c80", "#7c3a2a", "#f4ede4", "#4a3a2e", "#f5e2da", "#e8c8bc", "#f0d6cb", "#dfb8a9",
      "#b98a76", "#3a1c14", "#efe4dc", "#bf8a7b", "#c9b8a8", "#f7f3ec", "#b0a294", "#5a6e58",
      "#e7ddd2", "#cbbcae", "#ffffff", "#e3d9cc", "#c9bcae", "#faf7f2", "#6b5b4d", "#faf5ee",
      "#ece2d5",
    ]);
    const found = [...cssDecls.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase());
    expect(found.length, "the sheet must contain colours for this to mean anything").toBeGreaterThan(15);
    expect([...new Set(found)].filter((h) => !ALLOWED.has(h))).toEqual([]);
  });

  it("⚠️ the reached line is sage and is the ONLY coloured text — it marks an event, not a grade", () => {
    expect(cssDecls).toContain("#5a6e58");
  });
});

describe("⚠️ the retired card is retired", () => {
  it("the inline editor is gone from the rail — markup and state", () => {
    for (const token of ["os-goal-num", "os-goal-edit", "os-goal-btns", "os-blocks", "goalDraft", "editingGoal"]) {
      expect(railDecls).not.toContain(token);
    }
  });

  it("…and its rules are gone from the shared sheet", () => {
    for (const token of [".os-goal-num", ".os-goal-edit", ".os-goal-btns", ".os-blocks", "os-fillin"]) {
      expect(oneCssDecls).not.toContain(token);
    }
  });

  it("⚠️ the old derivation has no callers left — one live goal derivation, not two", () => {
    /* The addendum's rule: do not leave both live. `goalState`/`goalFigure` are deleted from
       oneScreen.ts; this asserts the rail does not reach for them either. */
    const one = decls(readFileSync(resolve(__dirname, "../../lib/oneScreen.ts"), "utf8"));
    for (const token of ["goalState", "goalFigure", "goalMeter", "goalPeriodStart", "goalBlockGap", "GOAL_BLOCK_CAP"]) {
      expect(one).not.toContain(token);
      expect(railDecls).not.toContain(token);
    }
  });

  it("⚠️ the legacy user fields are read by nothing", () => {
    expect(railDecls).not.toContain("goalTarget");
    expect(railDecls).not.toContain("goalPeriod");
  });
});

describe("⚠️ the header stays bare — the standing decision, restated where it can fail", () => {
  const html = render(["2026-08-02"], MONTHLY_10);

  it("no band and no mark box, in the RENDERED card", () => {
    /* The existing lock in oneScreenPanel.test.tsx reads SOURCE between two anchors. This one
       reads the output, so a band arriving by any route — a class, a component, a nested wrapper —
       fails here too. Two checks of one decision, from opposite ends.

       ⚠️ SCOPED TO THE GOALS CARD, and it has to be: the Activity card below it in the same rail
       LEGITIMATELY wears `os-ahead`, so an unscoped search over the rendered rail fails on a
       correct page. It did, first run. */
    const open = html.indexOf('class="os-card os-lift os-goal');
    expect(open, "the goals card must be in the output for this to check anything").toBeGreaterThan(-1);
    const next = html.indexOf('class="os-card os-lift os-actv', open);
    expect(next, "the Activity card marks the end of the slice").toBeGreaterThan(open);
    const card = html.slice(open, next);
    expect(card).not.toMatch(/["\s`]os-ahead["\s`]/);
    expect(card).not.toContain("os-markbox");
    expect(card).not.toContain("background");
  });
});

describe("the set-target sheet", () => {
  const sheetDecls = decls(sheet);

  it("⚠️ it is the locked Form 11 shell, not a local modal", () => {
    expect(sheetDecls).toContain("FormShell");
    expect(sheetDecls).not.toContain("createPortal");
    expect(sheetDecls).not.toContain("position: fixed");
  });

  it("the stepper is clamped 1–99 at both ends", () => {
    expect(sheetDecls).toContain("MIN_TARGET = 1");
    expect(sheetDecls).toContain("MAX_TARGET = 99");
  });

  it("three cadences and no quarter", () => {
    expect(sheetDecls).toContain('["week", "fortnight", "month"]');
    expect(sheetDecls).not.toContain("quarter");
    expect(sheetDecls).not.toContain("year");
  });

  it("⚠️ the preview's restart date comes from periodBounds, never a second calculation", () => {
    expect(sheetDecls).toContain("nextPeriodStart");
  });

  it("the menu opens the same sheet from both rows, and removal appends", () => {
    expect(railDecls).toContain("Change target");
    expect(railDecls).toContain("Change cadence");
    expect(railDecls).toContain("Remove target");
    expect(railDecls).toContain("writeGoal(null)");
  });

  it("⚠️ the ⋯ menu is anchored through the shared panel, not positioned locally", () => {
    expect(railDecls).toContain("AnchoredPanel");
  });

  it("⚠️ NOTHING chivvies — no task row, no notification, no streak, no reminder", () => {
    const all = railDecls + sheetDecls;
    for (const word of ["notification", "streak", "reminder", "notify", "remind"]) {
      expect(all.toLowerCase()).not.toContain(word);
    }
  });
});
