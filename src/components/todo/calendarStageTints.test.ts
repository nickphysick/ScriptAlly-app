/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CALENDAR READS THE APP'S FIVE STATE COLOURS AND DECLARES NONE OF ITS OWN.
 *
 * This file used to lock the opposite: the calendar carried a COPY of the eight-rung tint ladder
 * (`--tl-stage-*`), asserted rung-for-rung against `f12.css`'s `--stage-*`. That copy existed
 * because `--stage-*` is declared on `.t-f12` and the Calendar was believed not to sit under it —
 * a read would then paint nothing at all, silently, through a clean build.
 *
 * ⚠️ THE PREMISE WAS FALSE BY THE TIME IT MATTERED, and the old third case predicted exactly this:
 * *"if the tokens move to `:root`, this copy becomes unnecessary and the consolidation the CSS
 * comment flags is owed; the lock fails so somebody decides rather than drifting."* The Calendar's
 * own root is `t-f12 spine-root cal-timeline`, so it DOES sit under `.t-f12`; and the five state
 * colours are declared at `:root`, so they resolve on both calendars regardless. Measured before
 * the change: `--panel`, declared on `.t-f12`, resolves on To-do's calendar and Query Centre's.
 *
 * ⚠️ SO THE LAW ASSERTED HERE IS THE INVERSE OF THE OLD ONE, deliberately, and it is a stronger
 * claim: there is no copy to keep in step, so there is nothing that can drift. What must not come
 * back is a local declaration — that is the regression this file now guards.
 *
 * The RENDERED claim — that a band actually paints its state's colour — is not a fact about a file
 * and does not live here. `tests/e2e/calBar63.measure.ts` (d2) asks the browser.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STATE_TOKEN, stateFor } from "../../lib/queryCardFacts";
import { QueryStatus } from "../../types";

const here = new URL(".", import.meta.url).pathname;
const cal = readFileSync(join(here, "todoCalendar.css"), "utf8");
const f12 = readFileSync(join(here, "../shell/f12.css"), "utf8");
/** comments name what was retired; naming a token is not declaring one */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("the calendar's state colours", () => {
  it("⚠️ declares no local copy — the ladder and its tokens are retired", () => {
    expect(decls(cal), "the calendar has re-declared the retired ladder")
      .not.toMatch(/--tl-stage-[a-z0-9-]+\s*:/);
  });

  it("reads `--state-*` for every one of the five, and never a hex of its own", () => {
    const body = decls(cal);
    for (const state of ["queried", "agent", "you", "offer", "closed"] as const) {
      const rule = new RegExp(`\\.tl-st-${state}\\s*\\{[^}]*background:\\s*var\\(--state-${state}\\)`);
      expect(body, `.tl-st-${state} does not read var(--state-${state})`).toMatch(rule);
      const st = new RegExp(`\\.tl-p:has\\(>\\s*\\.tl-st-${state}\\)\\s*\\{[^}]*--st:\\s*var\\(--state-${state}\\)`);
      expect(body, `--st for ${state} does not read var(--state-${state})`).toMatch(st);
    }
  });

  it("⚠️ and the eight rung classes are gone — a stale rule would paint nothing", () => {
    /* the components emit `tl-st-${stateFor(...)}`, so a surviving `.tl-st-out-2` rule has no
       subject: the fault this repo records as a class the stylesheet selects on and nobody emits */
    expect(decls(cal), "a retired rung still has a rule").not.toMatch(/\.tl-st-(out|in)-[123]\b/);
  });

  it("⚠️ `--state-*` is declared at `:root`, which is what makes the direct read safe", () => {
    /* the whole reason the copy existed was a defining scope that was not an ancestor. If these
       ever move under a theme class, the calendar's read silently paints nothing again. */
    const root = decls(f12).slice(decls(f12).indexOf(":root {"));
    const block = root.slice(0, root.indexOf("}"));
    for (const state of ["queried", "agent", "you", "offer", "closed"] as const) {
      expect(block, `--state-${state} is not declared at :root`).toMatch(new RegExp(`--state-${state}\\s*:\\s*#`));
    }
  });

  it("⚠️ the five states the CSS serves are exactly the five `stateFor` can return", () => {
    /* two derivations against each other, never a literal on both sides: the CSS is asserted to
       carry a rule for every state the mapping can produce, over every status the app has */
    const produced = new Set(Object.values(QueryStatus).map((s) => stateFor(s as QueryStatus)));
    expect([...produced].sort(), "stateFor produces a state the sheet does not serve")
      .toEqual(["agent", "closed", "offer", "queried", "you"]);
    expect(Object.keys(STATE_TOKEN).sort()).toEqual([...produced].sort());
  });
});
