/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ NO BACKTICK MAY APPEAR INSIDE A `page.evaluate` TEMPLATE LITERAL.
 *
 * One backtick ends the string, and the file then fails to COLLECT — which Playwright reports as
 * "No tests found", i.e. as an absence rather than an error, while the previous run's report sits
 * on disk looking current. It has cost this pack three separate sessions, every time through a
 * COMMENT: a note written inside the evaluate body quoting a class name or an identifier in the
 * house style.
 *
 * The house rule already says a constraint worth a warning comment is worth a test. This is that
 * test — it reads the calendar's own measurement file and fails on the pattern rather than on its
 * consequence.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ⚠️ EVERY CALENDAR MEASURE FILE, NOT ONE OF THEM. This watched `calLook` alone, and the very next
 * calendar measure file written — `calText` — closed its own template on a backticked identifier
 * inside a comment, exactly the fault this exists for, and the lock could not see it. A guard
 * scoped to the file where the fault was first found guards the one place it has already been
 * fixed.
 */
const FILES = ["tests/e2e/calLook.measure.ts", "tests/e2e/calText.measure.ts"];

describe("the calendar's measurement files cannot terminate their own evaluate strings", () => {
  it("no backtick inside a page.evaluate template", () => {
    const src = FILES.map((f) => readFileSync(join(process.cwd(), f), "utf8")).join("\n/*FILE*/\n");
    /* every `page.evaluate(` … `)` body: from the opening backtick to the closing one */
    const offenders: string[] = [];
    const re = /page\.evaluate\(\s*(?:TAG \+ )?`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const start = m.index + m[0].length;
      /* the body ends at the FIRST unescaped backtick — which is exactly the fault we are hunting:
         if one appears early, this slice is short and the rest of the file is parsed as code */
      const end = src.indexOf("`", start);
      if (end < 0) { offenders.push("an evaluate template is never closed"); continue; }
      const body = src.slice(start, end);
      /* a well-formed body is substantial; a body cut short by a stray backtick is not, and the
         giveaway is that what follows the "close" is not a call terminator */
      const after = src.slice(end + 1, end + 40).replace(/\s/g, "");
      /* ⚠️ `,)` IS A TERMINATOR TOO, and adding it is a precise extension rather than a loosening.
         A multi-line call — evaluate(\n  `…`,\n) as any — puts a comma before the paren, and the
         checker flagged its own file for it. The house warning about this class of lock is that
         the temptation is to widen the pattern until the false positive stops, which widens it for
         every real offender as well; a body cut short by a stray backtick is followed by arbitrary
         JavaScript, and arbitrary JavaScript does not begin with a comma and a closing paren. */
      if (!/^,?\)|^\}\)\(\)|^asPromise|^as/.test(after) && body.length < 40_000) {
        offenders.push(`a template closes early at index ${end}; it is followed by ${JSON.stringify(after.slice(0, 30))}`);
      }
    }
    expect(offenders, offenders.join(" | ")).toEqual([]);
  });

  it("finds the templates to check — a sweep over none proves nothing", () => {
    for (const f of FILES) {
      expect(readFileSync(join(process.cwd(), f), "utf8").length, `${f} is missing or empty`)
        .toBeGreaterThan(500);
    }
    const src = FILES.map((f) => readFileSync(join(process.cwd(), f), "utf8")).join("\n");
    const n = [...src.matchAll(/page\.evaluate\(/g)].length;
    expect(n, "no page.evaluate calls found — the extraction is broken, not the file").toBeGreaterThan(4);
  });
});
