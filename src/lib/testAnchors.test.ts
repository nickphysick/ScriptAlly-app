/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ SOURCE-STRING ANCHORS MUST BE SCOPED TO A JOURNEY BEFORE THEY MATCH.
 *
 * This repo's tests read SOURCE (`vitest.config.ts` is `environment: 'node'` — no jsdom), so they
 * locate what they assert on by `indexOf`. That works until a second thing in the same file happens
 * to share a spelling, at which point the anchor silently starts describing whichever one is
 * declared EARLIER — and the test keeps passing, because the two things usually agree about
 * whatever was being asserted. It only begins to lie later.
 *
 * It has happened three times in one session:
 *   · `closeCreate();` first occurs in the ESCAPE handler ~2,000 lines above the handler the lock
 *     meant to read, so the range ran BACKWARDS, every extraction was "" and `.not.toContain`
 *     passed on nothing.
 *   · `onAnimationEnd={(e) => {` matches the ROW's handler before the PANE's, so a motion lock
 *     spent a while describing a different element.
 *   · `const leave = () => {` gained a second declaration when the response takeover arrived —
 *     declared earlier than create's — so four suites quietly swapped journeys.
 *
 * THE RULE: anchor through a journey-unique symbol first (`closeCreate`, `closeRecord`, "Logging
 * new query", "Recording a response"), then search WITHIN that region — `s.indexOf(x, journey)`.
 * Assert the region was found, and that the range runs forwards.
 *
 * ⚠️ THIS IS A TEST RATHER THAN A COMMENT IN CLAUDE.md BECAUSE COMMENTS ARE NOT GUARDS. A note
 * stops nobody; this fails the moment someone writes an ambiguous anchor, and names the file, the
 * line and how many things the spelling matches.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname, normalize } from "path";

const ROOT = normalize(join(dirname(new URL(import.meta.url).pathname), ".."));

const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
};

/**
 * Anchors that are ambiguous but deliberately so — the assertion is about EVERY occurrence, not a
 * particular one. Kept as an explicit list rather than a pattern, so adding to it is a decision
 * somebody makes on purpose.
 */
const ALLOWED = new Set<string>([]);

interface Finding { file: string; line: number; literal: string; matches: number }

const scan = (): Finding[] => {
  const found: Finding[] = [];
  for (const file of walk(ROOT)) {
    /* ⚠️ READ THE CODE, NOT THE PROSE — this scanner caught its own warning. A comment in
       `createSaveMotion.test.ts` QUOTES `indexOf("closeCreate();")` as an example of the mistake
       this file exists to prevent, and the scanner reported that quotation as an ambiguous anchor.
       The same trap is recorded twice already in this repo, for `position: sticky` and for
       `querySelector` in shell comments; a rule about code must be asserted against code. */
    const src = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    /* `const NAME = read("REL")` — the repo's one idiom for pulling a source file into a test. */
    const vars = new Map<string, string>();
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*read\("([^"]+)"\)/g)) {
      const p = normalize(join(dirname(file), m[2]));
      try { statSync(p); vars.set(m[1], p); } catch { /* not a real file — ignore */ }
    }
    if (vars.size === 0) continue;
    const cache = new Map<string, string>();
    const bodyOf = (p: string) => {
      if (!cache.has(p)) cache.set(p, readFileSync(p, "utf8"));
      return cache.get(p)!;
    };
    /* A BARE indexOf: exactly one argument. `indexOf(x, from)` is the scoped form and is fine. */
    for (const m of src.matchAll(/(\w+)\.indexOf\((["'])((?:[^"'\\]|\\.)*)\2\s*\)/g)) {
      const [, v, , raw] = m;
      const target = vars.get(v);
      if (!target) continue;
      const literal = raw.replace(/\\(.)/g, "$1");
      if (ALLOWED.has(literal)) continue;
      const matches = bodyOf(target).split(literal).length - 1;
      if (matches > 1) {
        found.push({
          file: file.slice(ROOT.length + 1),
          line: src.slice(0, m.index).split("\n").length,
          literal: literal.length > 60 ? `${literal.slice(0, 57)}…` : literal,
          matches,
        });
      }
    }
  }
  return found;
};

describe("source-string anchors are scoped before they match", () => {
  it("no test anchors on a spelling that occurs more than once in the file it reads", () => {
    const found = scan();
    const report = found
      .map((f) => `  ${f.file}:${f.line} — indexOf(${JSON.stringify(f.literal)}) matches ${f.matches}×`)
      .join("\n");
    expect(
      found,
      found.length === 0 ? "" :
        `\n\nAmbiguous source-string anchors — each will silently describe whichever occurrence is\n` +
        `declared first, and keep passing until the two disagree.\n\n${report}\n\n` +
        `Fix: anchor through a journey-unique symbol first, then search within it —\n` +
        `  const journey = src.indexOf("Recording a response");\n` +
        `  expect(journey).toBeGreaterThan(-1);\n` +
        `  const at = src.indexOf("<the thing>", journey);\n` +
        `  expect(at).toBeGreaterThan(journey);\n`,
    ).toHaveLength(0);
  });

  /* A guard on the guard: if the scanner stops finding the files it is meant to police — a renamed
     idiom, a moved directory — it would report zero findings and read as a clean bill of health. */
  it("and the scanner is actually reading this repo's tests", () => {
    const files = walk(ROOT);
    expect(files.length, "no test files found — the scanner has lost the tree").toBeGreaterThan(100);
    const withReads = files.filter((f) => /const\s+\w+\s*=\s*read\("/.test(readFileSync(f, "utf8")));
    expect(withReads.length, "no source-reading tests found — the idiom moved").toBeGreaterThan(20);
  });
});
