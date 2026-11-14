/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2.4, lock 5 — the Top tip is gone and nothing is left of it: the component, every import and reader
 * of its storage key, and its rules in the page's stylesheet. (A browser's stored `scriptally_ql_tip` is left alone;
 * nothing reads or writes it.)
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
});

describe("v2.4: the Top tip is removed", () => {
  it("TopTip.tsx is gone", () => {
    expect(existsSync("src/components/letters/TopTip.tsx")).toBe(false);
  });
  it("nothing in src/ imports it or reads its key", () => {
    const files = walk("src").filter((f) => !f.endsWith("ql24.test.ts"));
    expect(files.length).toBeGreaterThan(500);
    const hits = files.filter((f) => /TopTip|TIP_KEY|scriptally_ql_tip/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
  it("no tip rules are left in the page's stylesheet", () => {
    const css = readFileSync("src/components/letters/queryLetters.css", "utf8");
    expect(css.length).toBeGreaterThan(1000);
    expect(css).not.toMatch(/\.qlp-(tip|tipd|wk|wkh|wkt)\b/);
  });
});
