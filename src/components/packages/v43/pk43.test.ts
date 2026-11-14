/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 — the source locks (the rendered ones are tests/e2e/pk43.measure.ts).
 *   P6 (source half)  the pinned Archivist is gone: Pk41Hawk.tsx no longer resolves, nothing imports it, no stylesheet
 *                     draws `.p41-perch`; v41's header (Pk41Header) is gone with it
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve(__dirname, "../../..");
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(SRC);
const page = readFileSync(resolve(SRC, "components/SubmissionPackages.tsx"), "utf8");

describe("PK43 P6 — the Archivist stands in the header; nothing is pinned", () => {
  it("finds the population it reads", () => {
    expect(files.filter((f) => f.endsWith(".css")).length).toBeGreaterThan(100);
    expect(page).toContain("Pk43Header");
  });
  it("Pk41Hawk no longer resolves, and nothing imports it", async () => {
    expect(existsSync(resolve(SRC, "components/packages/v41/Pk41Hawk.tsx"))).toBe(false);
    await expect(import("../v41/Pk41Hawk" as string)).rejects.toThrow();
    const importers = files.filter((f) => !f.endsWith("pk43.test.ts") && /\.(tsx?|mjs)$/.test(f) && /Pk41Hawk/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
    expect(importers).toEqual([]);
  });
  it("no stylesheet draws the pinned hawk", () => {
    const perch = files.filter((f) => f.endsWith(".css") && /\.p41-perch\b/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")));
    expect(perch).toEqual([]);
  });
  it("v41's header is gone with it: the page renders the shared OpenHeader through Pk43Header", () => {
    expect(existsSync(resolve(SRC, "components/packages/v41/Pk41Header.tsx"))).toBe(false);
    const hd = readFileSync(resolve(SRC, "components/packages/v43/Pk43Header.tsx"), "utf8");
    expect(hd).toMatch(/import \{ OpenHeader \} from "\.\.\/\.\.\/shell\/OpenHeader"/);
    expect(hd).toContain('className="qc151 qc153 pk43-hdw"');
    expect(hd).toMatch(/src=\{HAWK_STANDING\}/);
    expect(readFileSync(resolve(SRC, "lib/packagesV43.ts"), "utf8")).toContain('HAWK_STANDING = "/images/packages/packages-hawk-standing.png"');
  });
});
