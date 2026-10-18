/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * R2 · No writer, and no AI model, is told the product is called ScriptAlly.
 *
 * The product is QueryHawk. "ScriptAlly" survives only as code identifiers (`useScriptAllyDb`,
 * `ScriptAllyLogo`), in comments recording history, and in Firebase ids. None of those is read by a
 * person using the app. This lock reads every shipping .ts/.tsx/.html file with comments stripped,
 * and finds the bare word, which is text, not an identifier.
 *
 * The identifier set is asserted EXACTLY. A new identifier is a decision to make in review, not
 * something to absorb silently.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const isTest = (p: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(p) || /(^|\/)test\//.test(p);

/* `//` inside a URL string is not a comment, so it is kept (see D0 in domain.test.ts). */
const stripCode = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\w])\/\/[^\n]*/g, "$1");
const stripHtml = (s: string) => stripCode(s.replace(/<!--[\s\S]*?-->/g, ""));

const sources = (): Array<[string, string]> => {
  const files = [
    ...walk(join(ROOT, "src")), ...walk(join(ROOT, "functions/src")), ...walk(join(ROOT, "public")),
    ...(existsSync(join(ROOT, "index.html")) ? [join(ROOT, "index.html")] : []),
  ];
  return files
    .map((f) => [relative(ROOT, f), f] as const)
    .filter(([rel]) => /\.(ts|tsx|html)$/.test(rel) && !isTest(rel))
    .map(([rel, f]) => [rel, (rel.endsWith(".html") ? stripHtml : stripCode)(readFileSync(f, "utf8"))]);
};

/** The word on its own: not the middle of an identifier such as useScriptAllyDb. */
const BARE = /(?<![\w$])ScriptAlly(?![\w$])/;
/** The identifiers the §0.2 recon listed (17 Oct). Exactly these, and no others. */
const IDENTIFIERS = ["ScriptAllyLogo", "useScriptAllyDb"];

describe("R2 · the product is called QueryHawk wherever a person or a model reads it", () => {
  const all = sources();

  it("the sweep read a real population, prompts and dev pages included", () => {
    expect(all.length).toBeGreaterThan(500);
    for (const f of ["functions/src/smartImportPrompt.ts", "functions/src/emailImportCore.ts", "public/theme-editor.html", "index.html"])
      expect(all.some(([n]) => n === f), f).toBe(true);
  });

  it("no string, JSX text or HTML text says ScriptAlly", () => {
    expect(all.filter(([, s]) => BARE.test(s)).map(([n]) => n)).toEqual([]);
  });

  it("the identifiers that keep the old name are exactly the recorded set", () => {
    const ids = new Set(all.flatMap(([, s]) => s.match(/[\w$]*ScriptAlly[\w$]*/g) ?? []).filter((t) => t !== "ScriptAlly"));
    expect([...ids].sort()).toEqual(IDENTIFIERS);
  });
});
