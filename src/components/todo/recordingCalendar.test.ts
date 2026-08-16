/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Item 10 — the black primary grammar, and the recording calendar's confirm.
 *
 * ⚠️ THE CALENDAR WAS ALREADY BUILT. `RecordingCalendar` and `lib/recordingCalendar.ts` shipped with
 * the journeys pack and already carry the parchment card, the Playfair month, the burgundy nav, the
 * mono Monday-first initials, the 8px day radii with a pink hover and a burgundy chosen state, the
 * sage ring on today, the `min`/`max` range with the forward arrow stopping at the bound, and the
 * three-date-surfaces header. This file locks the two things that were NOT right — the confirm's
 * colour and its words — and the values that were, so a rebuild cannot quietly lose them.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WEEKDAY_INITIALS } from "../../lib/recordingCalendar";

const here = __dirname;
/* ⚠️ COMMENTS STRIPPED BEFORE ANY `not.toContain` — this file's subjects all carry prose naming the
   values they replaced, which is exactly what a raw read trips over. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const todoCss = strip(readFileSync(join(here, "todo.css"), "utf8"));
const splitCss = strip(readFileSync(join(here, "todoSplit.css"), "utf8"));
const calSrc = readFileSync(join(here, "RecordingCalendar.tsx"), "utf8");

const rule = (css: string, sel: string): string => {
  const i = css.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};

describe("⚠️ A BLACK BUTTON ALWAYS MEANS 'THIS ADVANCES' — one grammar, both surfaces", () => {
  /**
   * ⚠️ WHY PINK WAS WRONG RATHER THAN MERELY DIFFERENT. On this page pink is the colour of a CHOSEN
   * segment, of a hover, and of an offer's band. A control wearing it reads as one more selected
   * thing; the button that commits has to be the one thing on the card that cannot be mistaken for
   * a state.
   */
  it("the card's Action is ink-filled with parchment text", () => {
    const prim = rule(splitCss, ".tdw-cbprim {");
    expect(prim).toContain("background: var(--ink-strong");
    expect(prim).toContain("color: var(--paper");
    /* ⚠️ THE FILL AND THE TEXT MOVE TOGETHER OR NOT AT ALL. The first pass changed only the fill and
       left `color: #241209` — ink on ink, an invisible label, and a rule that still parsed. */
    expect(prim).not.toContain("color: #241209");
    expect(prim).not.toContain("background: var(--pink");
  });

  it("the calendar's confirm is the same button", () => {
    const btn = rule(todoCss, ".cal-f button {");
    expect(btn).toContain("background: var(--ink-strong");
    expect(btn).toContain("color: var(--paper");
    expect(btn).not.toContain("background: var(--pink-btn)");
  });

  it("⚠️ AND IT IS DISABLED UNTIL A DATE IS PICKED — it can never apply nothing", () => {
    expect(calSrc).toContain("disabled={!picked}");
    expect(rule(todoCss, ".cal-f button:disabled {")).toContain("cursor: default");
  });

  it("the confirm NAMES WHAT IT DOES rather than saying the dialogue is over", () => {
    expect(calSrc).toContain(">Use this date</button>");
    expect(strip(calSrc)).not.toContain(">Done</button>");
  });
});

describe("the calendar's settled values — locked so a rebuild cannot lose them", () => {
  it("⚠️ MONDAY FIRST, and the two S's are Saturday then Sunday", () => {
    /* a week that starts on Sunday puts the weekend either side of the row and is the one thing
       about a calendar a British writer notices immediately */
    expect([...WEEKDAY_INITIALS]).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  });

  it("days are 8px radii, pink on hover, burgundy when chosen", () => {
    expect(rule(todoCss, ".cal-d {")).toContain("border-radius: 8px");
    expect(rule(todoCss, ".cal-d:hover:not(:disabled) {")).toContain("background: var(--pink-btn)");
    expect(rule(todoCss, ".cal-d.on {")).toContain("background: var(--burg)");
  });

  it("⚠️ TODAY CARRIES A RING, NOT A FILL — a fill would read as chosen when nothing is", () => {
    const today = rule(todoCss, ".cal-d.today {");
    expect(today).toContain("box-shadow: inset 0 0 0 1px var(--sage)");
    expect(today).not.toContain("background:");
  });

  it("parchment card, Playfair month, burgundy nav, mono initials", () => {
    expect(rule(todoCss, ".cal {")).toContain("background: var(--paper)");
    expect(rule(todoCss, ".cal-h .m {")).toContain("font-family: var(--f12-serif)");
    expect(rule(todoCss, ".cal-nav {")).toContain("color: var(--burg)");
    expect(rule(todoCss, ".cal-dow span {")).toContain("font-family: var(--f12-mono)");
  });

  it("⚠️ IT IS A GENERAL min/max COMPONENT — the CALLER makes it past-only, not the component", () => {
    /* the journey passes `max = today` because "you cannot have sent something tomorrow" is a fact
       about RECORDING, not about dates. A picker that hardcoded the past could never be reused. */
    expect(calSrc).toContain("min?: string;");
    expect(calSrc).toContain("max?: string;");
    expect(calSrc).not.toContain("todayISO()");
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    expect(flow).toContain("max={todayISO()}");
  });

  it("⚠️ THE HEADER NAMES ALL THREE DATE SURFACES, and defers the fourth question", () => {
    /* SnoozeDial picks a future INTERVAL; this names a DAY in a range; BrandDatePicker is the
       native fallback. Whether this replaces BrandDatePicker is deliberately unasked. */
    expect(calSrc).toContain("SnoozeDial");
    expect(calSrc).toContain("BrandDatePicker");
    expect(calSrc).toContain("DELIBERATELY DEFERRED");
  });
});
