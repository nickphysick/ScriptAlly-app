/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CALENDAR'S TINT LADDER IS A COPY, AND THIS IS WHAT STOPS IT DRIFTING.
 *
 * `f12.css` declares the ladder on `.t-f12` — the Query Centre's theme class, which the Calendar
 * does not sit under. A `var(--stage-out-1)` on a calendar band would therefore paint NOTHING,
 * silently, through a clean build; so `todoCalendar.css` carries its own `--tl-stage-*` set.
 *
 * ⚠️ THE ASSERTION IS AGAINST THE OTHER FILE, NEVER A LITERAL ON BOTH SIDES. A test that pinned
 * `#e6eae3` in two places would go green while the two surfaces disagreed — which is the whole
 * failure a copy invites, and the reason `--mk-hero-ground` is locked exactly this way.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const cal = readFileSync(join(here, "todoCalendar.css"), "utf8");
const f12 = readFileSync(join(here, "../shell/f12.css"), "utf8");

/** every `--name: value` in a file, comments stripped so a commented example cannot answer */
const tokens = (src: string, prefix: string) => {
  const out = new Map<string, string>();
  const decls = src.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of decls.matchAll(new RegExp(`(${prefix}[a-z0-9-]+)\\s*:\\s*([^;]+);`, "g"))) {
    out.set(m[1].replace(prefix, ""), m[2].trim());
  }
  return out;
};

describe("the calendar's copy of the tint ladder", () => {
  it("⚠️ agrees with `.t-f12`'s, rung for rung — read from that file, not restated here", () => {
    const mine = tokens(cal, "--tl-stage-");
    const theirs = tokens(f12, "--stage-");
    /* ⚠️ THE POPULATION FIRST. If either sweep found nothing the comparison below is vacuous and
       passes — an empty map equals an empty map. */
    expect(mine.size, "the calendar declares no ladder").toBe(8);
    expect(theirs.size, "`.t-f12` declares no ladder — did the tokens move?").toBe(8);
    expect([...mine.keys()].sort(), "the rungs differ").toEqual([...theirs.keys()].sort());
    for (const [rung, hex] of mine) {
      expect(hex, `rung ${rung}: the calendar says ${hex}, .t-f12 says ${theirs.get(rung)}`)
        .toBe(theirs.get(rung));
    }
  });

  it("⚠️ and the calendar NEVER reads `--stage-*` directly — that would paint nothing", () => {
    const decls = cal.replace(/\/\*[\s\S]*?\*\//g, "");
    /* the defining scope is `.t-f12`, which is not an ancestor of this page: a read here resolves
       to nothing at all, and the band would be transparent with the rule looking perfectly correct */
    expect(decls, "the calendar reads the Query Centre's own token")
      .not.toMatch(/var\(\s*--stage-/);
  });

  it("⚠️ `.t-f12` is still where the ladder is declared — the copy names a real source", () => {
    /* if the tokens move to `:root`, this copy becomes unnecessary and the consolidation the CSS
       comment flags is owed; the lock fails so somebody decides rather than drifting */
    const decls = f12.replace(/\/\*[\s\S]*?\*\//g, "");
    const block = decls.slice(decls.indexOf(".t-f12 {"), decls.indexOf("--stage-closed"));
    expect(block, "the ladder left `.t-f12` — re-point or retire the calendar's copy")
      .toContain("--stage-out-1");
  });
});
