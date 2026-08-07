/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TODAY, REDESIGNED (tasks-viewport pack, Phase 2; ref design-refs/today-redesign.html — which
 * WINS over tasks-viewport.html wherever the two draw this page differently).
 *
 * ⚠️ TWO COPY LAWS ARE ENFORCED HERE, not just written down:
 *   1. THE APP REPORTS, NEVER APPRAISES. No verdict on a writer's workload — no "well within the
 *      day", no encouragement, no judgement of how much is on the list.
 *   2. NO PRIVATE METAPHORS FOR FUNCTIONAL ELEMENTS. "The bench" meant something to whoever named
 *      it and nothing to a writer reading it for the first time. It is "Up next".
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { todayEyebrow, todayStats, todayListCount } from "../../lib/todoToday";

const here = __dirname;
const page = readFileSync(join(here, "TodoTodayPage.tsx"), "utf8");
const css = readFileSync(join(here, "todoToday.css"), "utf8");
const lib = readFileSync(join(here, "..", "..", "lib", "todoToday.ts"), "utf8");
const rule = (sel: string): string => {
  const i = css.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i)).replace(/\/\*[\s\S]*?\*\//g, "");
};

describe("⚠️ the header reads as the DASHBOARD's, not a board's", () => {
  it("the eyebrow is the two Dashboard derivations, joined — never reimplemented", () => {
    expect(todayEyebrow("Friday 7 August", "week fourteen"))
      .toBe("FRIDAY 7 AUGUST · WEEK FOURTEEN OF QUERYING");
    /* ⚠️ IMPORTED FROM dashboardStats, deliberately. A second date format or a second week count
       is how two pages come to disagree about what day it is. */
    expect(page).toContain('import { longDate, weekOfQuerying } from "../../lib/dashboardStats"');
    expect(page).toContain("todayEyebrow(longDate(new Date(now)), weekOfQuerying(queries, new Date(now)))");
    /* the EYEBROW must not grow its own date format — `clearedAtLabel` legitimately formats a
       time, so scope the check to the eyebrow's own function rather than the whole module */
    const eyebrowFn = lib.slice(lib.indexOf("export function todayEyebrow"));
    expect(lib.indexOf("export function todayEyebrow")).toBeGreaterThan(-1); // the anchor
    expect(eyebrowFn.slice(0, eyebrowFn.indexOf("}"))).not.toMatch(/toLocaleDateString|Intl\./);
  });

  it("the title takes the Dashboard's greeting scale, not the page-title scale", () => {
    expect(rule(".tpl-titlerow .tpl-title {")).toContain("font-size: 32px");
  });

  it("⚠️ THE STAT PILLS REPLACE THE PROSE SUBTITLE — and they report, never appraise", () => {
    expect(todayStats(4, 1, 35)).toEqual([
      { label: "Committed", value: "4" },
      { label: "Done today", value: "1" },
      { label: "Estimated", value: "35 min" },
    ]);
    // the page passes no subtitle at all — the row IS the subtitle now
    expect(page).not.toContain("subtitle={");
    expect(page).not.toContain("todaySubtitle");
    /* ⚠️ THE COPY LAW, ASSERTED: nothing on this page appraises the day. */
    for (const verdict of [
      "well within", "plenty of time", "good going", "nicely", "on track",
      "you can do", "manageable", "busy day", "light day",
    ]) {
      expect(page.toLowerCase(), verdict).not.toContain(verdict);
    }
  });

  it("⚠️ THE ESTIMATE PILL IS ABSENT WHEN NOTHING CARRIES ONE — 0 min is an absence, not a figure", () => {
    expect(todayStats(4, 1, 0)).toHaveLength(2);
    expect(todayStats(4, 1, 0).some((s) => s.label === "Estimated")).toBe(false);
    expect(todayStats(0, 0, 25)).toHaveLength(3); // and it appears the moment one exists
  });

  it("the pills are Playfair figures in rounded hairline pills — the Dashboard's chip grammar", () => {
    const pill = rule(".tdt-stat {");
    expect(pill).toContain("border-radius: 99px");
    expect(pill).toContain("border: 1px solid");
    expect(rule(".tdt-stat b {")).toContain("Playfair Display");
  });

  it("the ghost and ink pair share ONE height, and the ink one disables at zero", () => {
    expect(rule(".tdt-ghost, .tdt-ink {")).toContain("height: 36px");
    expect(page).toContain("disabled={committed.length === 0}");
    // the house disabled grammar, never opacity
    const dis = rule(".tdt-ink[disabled], .tdt-ghost[disabled] {");
    expect(dis).toContain("cursor: not-allowed");
    expect(dis).not.toContain("opacity");
  });
});

describe("⚠️ NO FILTER CONTROL, NO SIDEBAR — the absence is the design", () => {
  it("neither the side container nor a facet control renders", () => {
    expect(page).not.toContain("TodoSideContainer");
    expect(page).not.toContain("sidebar={");
    expect(page).not.toContain("tools={");
  });
});

describe("⚠️ two named regions, each scrolling under its own hem", () => {
  it("Today's list states its own figures; Up next states NONE", () => {
    expect(todayListCount(3, 1)).toBe("3 open · 1 done");
    expect(page).toContain("todayListCount(committed.length, done.length)");
    /* ⚠️ NO COUNT ON UP NEXT, ANYWHERE. A number invites you to work through a pile; these are
       the most pressing few, and the list above is the only one with a length worth stating. */
    const rail = page.slice(page.indexOf('aria-label="Up next"'));
    expect(page.indexOf('aria-label="Up next"')).toBeGreaterThan(-1); // the anchor, per the slice law
    expect(rail).not.toContain("tdt-seccount");
    expect(rail).not.toContain("benchHeading");
  });

  it("⚠️ 'UP NEXT', AND 'THE BENCH' IS DEAD — no private metaphors for functional elements", () => {
    expect(page).toContain("Up next");
    expect(page).toContain("Suggested items from your to-do list");
    /* The user-facing STRING is what the law governs. The internal identifier (`bench`, the
       derivation's own name) and the prose in this file's comments may survive — renaming a
       variable is not what stops a reader meeting a private metaphor. So: no rendered label. */
    const labels = [...page.matchAll(/>([^<>{}]{3,})</g)].map((m) => m[1]);
    for (const l of labels) expect(l.toLowerCase(), l).not.toContain("bench");
    expect(page).not.toContain("Suggested for today");
  });

  it("each region owns a zone, and the rail is 320px behind a left hairline", () => {
    expect(page).toContain('<TplZone label="Today’s list"');
    expect(page).toContain('<TplZone label="Up next"');
    const split = rule(".tdt-split {");
    /* ⚠️ 360px SINCE 7 Aug (was 320): at 320 a real suggestion title had nowhere to go once the
       ＋Add took its share of the row, so it truncated. The rail's WIDTH is not the law — the law
       is that the title is never truncated, and the width is what pays for it. */
    expect(split).toContain("360px");
    expect(split).toContain("min-height: 0");
    expect(rule(".tdt-rail {")).toContain("border-left: 1px solid");
  });

  it("the section head: 18px line icon at 1.8 stroke, on the cap-height, plain subtitle", () => {
    expect(page).toContain("<ListChecks size={18} strokeWidth={1.8}");
    expect(page).toContain("<LoaderCircle size={18} strokeWidth={1.8}");
    /* ⚠️ `align-items: center`, NOT baseline — a baseline-aligned icon hangs below the letters */
    expect(rule(".tdt-sechead {")).toContain("align-items: center");
    const sub = rule(".tdt-secsub {");
    expect(sub).toContain("font-style: normal"); // NEVER italic
    expect(sub).toContain("padding-left: 28px"); // indented to the title's text, not the icon's
  });

  it("the quick-add sits OUTSIDE the zone — it never scrolls away from the list it adds to", () => {
    const zoneEnd = page.indexOf("</TplZone>");
    expect(page.indexOf('id="tdt-add"')).toBeGreaterThan(zoneEnd);
    expect(rule(".tdt-add {")).toContain("flex: 0 0 auto");
  });

  it("cleared items settle IN PLACE, struck, with their time and a way back", () => {
    expect(page).toContain('className="tdt-row done"');
    expect(page).toContain("clearedAtLabel(c.whenMs)");
    expect(page).toContain("Undo");
    expect(rule(".tdt-row.done .tdt-t {")).toContain("line-through");
  });

  it("⚠️ THE ACTION CORNER IS RESERVED — rows do not shuffle as you read down them", () => {
    expect(page).toContain('className="tdt-act"');
    expect(page).toContain("tdt-dots");
    expect(rule(".tdt-act {")).toContain("flex: 0 0 auto");
  });

  it("suggestions carry a why-line each and are draggable across", () => {
    expect(page).toContain("{b.why}");
    expect(page).toContain("draggable");
    expect(page).toContain("Drag an item across to add it.");
  });
});

describe("⚠️ the plan card dismisses FOR THE DAY, and is a UI preference", () => {
  it("it stores the DAY, not a boolean — a flag would need an owner to clear it", () => {
    expect(lib).toContain('const PLAN_KEY = "sa.todoPlanUsed"');
    expect(lib).toContain("localStorage.getItem(PLAN_KEY) === todayYmd");
    /* ⚠️ NEVER TASK DATA — nothing about this reaches Firestore, so no rules or types change */
    expect(lib).not.toContain("updateUserTask");
    const types = readFileSync(join(here, "..", "..", "types.ts"), "utf8");
    expect(types).not.toContain("planUsed");
  });

  it("a corrupt or unreadable store shows the card — the harmless direction to fail in", () => {
    expect(lib).toMatch(/catch \{\s*return false;/);
  });

  it("it renders only when there is something to plan FROM, and carries the one real asset", () => {
    expect(page).toContain("{!planUsed && bench.length > 0 && (");
    expect(page).toContain('<ArtSlot name="seize-the-day" maxWidth={62}');
    expect(page).toContain("Seize the day");
    expect(page).toContain("Populate today’s list with your most pressing actions, then get them done.");
    expect(page).toContain("Start →");
  });
});
