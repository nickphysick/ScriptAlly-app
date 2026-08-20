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
/* ⚠️ THE PANE IS THE PORT NOW — `todoDock.css` is deleted. The calendar's own claims are about
   `todo.css`; the one case that read the pane's primary is re-pointed at `taskPane.css`, where the
   mockup's `.b-primary` carries the same grammar (pink fill, ink text). */
const dockCss = strip(readFileSync(join(here, "taskPane.css"), "utf8"));
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
    /* ⚠️ IT IS `.tdk-prime` NOW — the card FOOTER's primary. This read `.tdw-cbprim`, the command
       bar's copy, which is retired with the button: the deed belongs on the object it acts on. The
       grammar this case protects moved with it rather than being dropped. */
    /* ⚠️ RE-POINTED TO THE PORT'S `.b-primary`. The retired pane's `.tdk-prime` was an INK fill;
       the mockup's primary is a pink fill with ink text, and the port takes the mockup. The claim
       this case protects is the one that survives: the primary and its text move together, and the
       label is never the same colour as the fill. */
    const prim = rule(dockCss, ".tpn .ab.go {");
    /* ⚠️ PANE CONTRACT: pink fill, BURGUNDY label (the materials contract paired pink with ink).
       The grammar this case protects is unchanged and is what is asserted below — the fill and the
       text are both tokens, and they are never the same one. */
    /* ⚠️ `--ink-strong` IS DEFINED NOWHERE IN `src/`, so `var(--ink-strong, #241209)` was the hex
       doing the whole job and the token name was decoration. Four other sheets still read it
       (todo.css, forms.css, paneJourney.css, paneSweep.css) and are out of this pass's two files;
       this one now reads `--ink`, which resolves. The GRAMMAR the case protects — ink fill,
       parchment text — is what is asserted, not which name carries the ink. */
    expect(prim).toContain("background:var(--pink)");
    const cFill = /background:\s*var\(--([a-z-]+)/.exec(prim)?.[1];
    const cText = /(?:^|;)\s*color:\s*var\(--([a-z-]+)/.exec(prim)?.[1];
    expect(cFill).toBeTruthy();
    expect(cText).toBeTruthy();
    expect(cText, "the label is the same token as the fill").not.toBe(cFill);

    /* ⚠️ THE FILL AND THE TEXT MOVE TOGETHER OR NOT AT ALL. The first pass changed only the fill and
       left `color: #241209` — ink on ink, an invisible label, and a rule that still parsed. */
    expect(prim).not.toContain("color: #241209");
    expect(prim).not.toContain("background: var(--pink");
    /* and the bar's copy is gone from the stylesheet, not merely unrendered */
    expect(splitCss).not.toContain(".tdw-cbprim");
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

  it("⚠️ NO BURGUNDY FILL — the chosen day is INK, and hover is the parchment step", () => {
    /* the standing rule: no burgundy button fills anywhere. The chosen day wears the same grammar
       as the black primary, so "this is selected" and "this commits" read as one family. */
    expect(rule(todoCss, ".cal-d {")).toContain("border-radius: 8px");
    expect(rule(todoCss, ".cal-d.on {")).toContain("background: var(--ink-strong");
    expect(rule(todoCss, ".cal-d.on {")).not.toContain("--burg");
    expect(rule(todoCss, ".cal-d:hover:not(:disabled) {")).toContain("background: #f2ede7");
  });

  it("⚠️ NO BURGUNDY BUTTON FILL SURVIVES IN THE TWO SIBLING SURFACES EITHER", () => {
    /* the rule is app-wide, and `found.md` had recorded both of these as still breaking it: the
       note composer's save, and `BrandDatePicker`'s selected day — the exact fault fixed here, in
       the other date surface. */
    expect(rule(todoCss, ".tdb-nc-save {")).toContain("background: var(--ink-strong");
    const forms = strip(readFileSync(join(here, "../forms/forms.css"), "utf8"));
    expect(rule(forms, ".sa-dp-day.sel {")).toContain("background: var(--ink-strong");
    expect(rule(forms, ".sa-dp-day.sel {")).not.toContain("#7c3a2a");
    expect(rule(forms, ".sa-dp-day:hover {")).toContain("#f2ede7");
  });

  it("⚠️ EVERY TOKEN THE PORTALLED CARD READS HAS A LITERAL FALLBACK", () => {
    /* `RecordingCalendar` portals to `document.body`; the theme's properties are declared on a class
       inside `#root`. Outside that subtree `var(--paper)` resolves to nothing, and `var()` on an
       undefined property makes the whole declaration INVALID — which CSS drops in silence. Measured
       on the deployed page before the fix: computed background `rgba(0,0,0,0)`, border black,
       radius 0. The page read straight through the calendar. */
    const shell = rule(todoCss, ".cal {");
    expect(shell).toContain("background: var(--paper, #");
    expect(shell).toContain("border: 1px solid var(--line, #");
    expect(shell).toContain("border-radius: var(--r-lg, ");
    /* ⚠️ AND NO `var()` IN THIS COMPONENT'S RULES MAY BE FALLBACK-LESS — one bare token is enough to
       drop a declaration, and the failure is invisible. Scans every `.cal*` rule, not just the
       shell's. */
    const from = todoCss.indexOf(".cal {");
    const block = todoCss.slice(from, todoCss.indexOf(".cal-f button:disabled", from));
    const bare = [...block.matchAll(/var\((--[a-z0-9-]+)\)/gi)].map((m) => m[1]);
    expect(bare, `these read a token with no fallback: ${bare.join(", ")}`).toEqual([]);
  });

  it("⚠️ TODAY CARRIES A RING, NOT A FILL — a fill would read as chosen when nothing is", () => {
    const today = rule(todoCss, ".cal-d.today {");
    expect(today).toContain("box-shadow: inset 0 0 0 1px var(--sage,");
    expect(today).not.toContain("background:");
  });

  it("parchment card, Playfair month, burgundy nav, mono initials", () => {
    /* the tokens carry fallbacks now (see the portal case) — the VALUES are unchanged */
    expect(rule(todoCss, ".cal {")).toContain("background: var(--paper,");
    expect(rule(todoCss, ".cal-h .m {")).toContain("font-family: var(--f12-serif,");
    expect(rule(todoCss, ".cal-nav {")).toContain("color: var(--burg,");
    expect(rule(todoCss, ".cal-dow span {")).toContain("font-family: var(--f12-mono,");
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
