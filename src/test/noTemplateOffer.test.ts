/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TS1 (overnight fixes v1, Part 1): the import template is no longer offered (ruling of 14 Nov: Smart Import is
 * the one way to bring a list in, alongside adding by hand). This scans every non-test source file in `src/` and
 * `functions/src/`, with comments stripped so only code and copy are read, for a line that offers, links to or
 * downloads the template.
 *
 * What stays, and why it does not match:
 * - the parser, column matcher and headings route (`templateImport`, `templateColumns`, `importReadRoute`):
 *   identifiers only, no offer;
 * - public/QueryHawk-pipeline-import-template.xlsx: an old link must not 404;
 * - the two-door fork's quiet line "Download the headings" (two-door decision A): it names headings, not the
 *   template, and two-door's decisions stand.
 *
 * TWO NAMED EXEMPTIONS, their number asserted:
 * - `src/lib/planComparison.ts`: its "Spreadsheet template import" row also feeds the public pricing and landing
 *   pages, which this pass may not touch. It is in the report for Nick.
 * - `src/lib/templateFile.ts`: `TEMPLATE_FILENAME` ("QueryHawk-template.xlsx") is the file the fork's "Download the
 *   headings" line hands out (two-door decision A). The writer sees that file name when they save it.
 *
 * `TS1_ROOT` points the scan at another tree, which is how the red reading against the served tip was taken.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.env.TS1_ROOT ?? process.cwd();
const DIRS = ["src", "functions/src"];
const EXEMPT = new Set(["src/lib/planComparison.ts", "src/lib/templateFile.ts"]);

export const OFFER = [
  /download(?:able)? (?:the |our )?template/i,
  /\b(?:use|start from|fill in) (?:the|our) template/i,
  /\bour template\b/i,
  /upload my sheet/i,
  /QueryHawk-(?:pipeline-import-)?template\.xlsx/,
  /download-the-template/,
];

/** Comments out, strings kept: block comments, then a `//` that starts a line or follows whitespace (not a URL's). */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

function walk(dir: string, out: string[] = []): string[] {
  let names: string[];
  try { names = readdirSync(dir); } catch { return out; }
  for (const n of names) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n) && !/\.(test|spec|measure)\.(ts|tsx)$/.test(n) && !/\.d\.ts$/.test(n)) out.push(p);
  }
  return out;
}

export function offenders(root: string): string[] {
  const hits: string[] = [];
  const files = DIRS.flatMap((d) => walk(join(root, d)));
  for (const f of files) {
    const rel = relative(root, f);
    if (EXEMPT.has(rel)) continue;
    stripComments(readFileSync(f, "utf8")).split("\n").forEach((line, i) => {
      if (OFFER.some((re) => re.test(line))) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}

describe("TS1 · the import template is offered nowhere", () => {
  it("the scan reads a non-empty population", () => {
    expect(DIRS.flatMap((d) => walk(join(ROOT, d))).length).toBeGreaterThan(500);
  });
  it("finds a planted offer (the lock can see its subject)", () => {
    expect(OFFER.some((re) => re.test(stripComments('const x = <a href="/QueryHawk-pipeline-import-template.xlsx">Download the template</a>;')))).toBe(true);
    expect(OFFER.some((re) => re.test(stripComments("/* Download the template */ const y = 1;")))).toBe(false);
  });
  it("no non-test source line offers, links to or downloads the template", () => {
    expect(offenders(ROOT)).toEqual([]);
  });
  it("two exemptions, by name, and each still holds what it is exempt for", () => {
    expect([...EXEMPT]).toEqual(["src/lib/planComparison.ts", "src/lib/templateFile.ts"]);
    expect(readFileSync(join(ROOT, "src/lib/planComparison.ts"), "utf8")).toMatch(/Fill in our template/);
    expect(readFileSync(join(ROOT, "src/lib/templateFile.ts"), "utf8")).toMatch(/TEMPLATE_FILENAME = "QueryHawk-template\.xlsx"/);
  });
});
