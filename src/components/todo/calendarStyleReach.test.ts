/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ EVERY CLASS THE CALENDAR RENDERS HAS A RULE — the check that would have caught the chip.
 *
 * `.tl-chip` and `.tl-band` were declared as ONE GROUPED RULE: the base box, the bullet, four kind
 * treatments, the struck state and the hover. The bars pack retired the band, and a grouped
 * selector is one rule — so killing the band killed the chip with it, while the chip was still
 * being rendered. It shipped as an unstyled `inline-flex` with no padding, border or radius, which
 * renders its parts as bare concatenated text.
 *
 * ⚠️ THIS IS THE THIRD FACE OF A HAZARD CLAUDE.md ALREADY RECORDS TWICE — as a READ fault (a lock's
 * `indexOf` slicing the wrong block) and as a REMOVAL fault (a regex matching more than it meant).
 * Neither describes this one: the regex matched exactly what it was pointed at, and the block it
 * was pointed at was serving two elements. **A grouped selector means a removal aimed at one member
 * takes them all**, and nothing about the diff looks wrong.
 *
 * ⚠️ IT IS A SOURCE CLAIM AND IT IS STATED AS ONE. "A rule exists for this class" is a fact about
 * the file, which is the right thing for a file to be asked. Whether the rule REACHES the element —
 * cascade, specificity, a parent that never renders — is a question for the rendered page, and
 * `calRowWords55.measure.ts` asks it there. This catches the regression that actually happened; it does
 * not pretend to catch every one that could.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const page = readFileSync(join(here, "TodoCalendarPage.tsx"), "utf8");
const css = readFileSync(join(here, "todoCalendar.css"), "utf8");

/** comments explain what was retired, and naming it is not declaring it */
const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");
/** rules inside a media block are OVERRIDES; a class needs a rule that applies unconditionally */
const base = decls.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");

const classesIn = (src: string): Set<string> => {
  const out = new Set<string>();
  /* every `tl-…` token inside a className, however the page builds it — a literal, a template, a
     ternary arm or an array entry. The page writes all four. */
  for (const m of src.matchAll(/\btl-[a-z0-9-]+/g)) out.add(m[0]);
  return out;
};

/** what the page draws: only the class tokens that appear inside a className expression */
const rendered = (): Set<string> => {
  const out = new Set<string>();
  /* ⚠️ THE 600-CHARACTER BOUND IS LOAD-BEARING AND FAILS BY ABSENCE. A `className={…}` longer
     than this simply stops matching, so its classes go missing and every assertion below reports
     them as unrendered rather than as unextracted — an absence, not an error. It happened: two
     comments added inside the bar's class list pushed it past the bound and the sweep stopped
     seeing `tl-seg`. The floor cases below are what caught it, which is why they exist. */
  for (const m of page.matchAll(/className=(?:"([^"]*)"|\{([\s\S]{0,900}?)\}(?=\s|\n|>))/g)) {
    for (const c of classesIn(m[1] ?? m[2] ?? "")) out.add(c);
  }
  return out;
};

const hasBaseRule = (cls: string) => new RegExp(`\\.${cls}(?![a-z0-9-])`).test(base);

describe("⚠️ every class the Calendar renders has a base rule in its own stylesheet", () => {
  const drawn = [...rendered()].sort();

  it("finds the classes to check — a sweep over an empty set proves nothing", () => {
    /* ⚠️ THE POPULATION FLOOR. This whole case is a negative, and a negative is satisfied by an
       empty set: an extraction that silently matched nothing would go green for ever. */
    expect(drawn.length, "no classes extracted — the extraction is broken, not the page")
      .toBeGreaterThan(15);
    /* ⚠️ THE TWO NAMED HERE ARE THE FLOOR ON THE SWEEP ITSELF — a sweep that found nothing would
       report no offenders for ever. They are the chip and the bar under their Porcelain names
       (`tl-seg`/`tl-chip` were the grid era's). */
    expect(drawn, "the sweep is not seeing the chip").toContain("tl-tchip");
    expect(drawn, "the sweep is not seeing the bar").toContain("tl-p");
  });

  it("⚠️ none of them is styled ONLY inside a media block, which is how the chip shipped", () => {
    /* `.tl-chip` survived in the `prefers-reduced-motion` block alone — present in the file,
       absent from the page. A grep for the class would have found it and said nothing was wrong. */
    const mediaOnly = drawn.filter((c) => new RegExp(`\\.${c}(?![a-z0-9-])`).test(decls) && !hasBaseRule(c));
    expect(mediaOnly, "these classes exist only as a media-query override").toEqual([]);
  });

  it("every rendered class has a rule that applies unconditionally", () => {
    expect(drawn.filter((c) => !hasBaseRule(c)), "rendered with no rule at all").toEqual([]);
  });
});

describe("⚠️ the chip is declared ALONE, so it cannot be retired as somebody else's member", () => {
  it("no rule groups `.tl-tchip` with another top-level class", () => {
    /* ⚠️ THE RULE THIS ENFORCES IS NOT "never group selectors" — `.tl-seg, .tl-over` share one and
       that is right, because they are two states of one object and neither can outlive the other.
       It is that the chip may not share a rule with something that CAN be retired independently,
       which is exactly what `.tl-band` was. */
    for (const m of base.matchAll(/(?:^|\n)([^{}\n]*\.tl-tchip[^{}\n]*)\{/g)) {
      const sel = m[1].trim();
      const others = [...sel.matchAll(/\.(tl-[a-z0-9-]+)/g)]
        .map((x) => x[1])
        .filter((c) => c !== "tl-tchip" && c !== "tl-at2" && c !== "sq");
      expect(others, `\`${sel}\` groups the chip with something that can be retired without it`)
        .toEqual([]);
    }
  });
});
