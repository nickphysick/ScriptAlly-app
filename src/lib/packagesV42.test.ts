/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v42 — the stat tiles' foot, in each stage's words, from v41's `railLine` (so the figures are
 * packageReplies' and the threshold is the real constant). The rendered half is SP42 L2 (tests/e2e/pk42.measure.ts).
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MIN_SENDS_FOR_CLAIM } from "./packagesV38";
import { railLine } from "./packagesV41";
import { HOW_STATIONS, HOW_TITLE, retiredLink, tileFoot } from "./packagesV42";

const f = (sent: number, answered: number, ranked: boolean, pct: number | null) => ({ sent, answered, ranked, pct });
const both = { version: true, letter: true };
const foot = (st: "draft" | "ready" | "out" | "retired", fig: ReturnType<typeof f>, has = both) => tileFoot(railLine(st, fig, has, MIN_SENDS_FOR_CLAIM), has);

describe("v42 C · a tile's foot", () => {
  it("out with agents and ranked: the rate, asked for more", () => {
    expect(foot("out", f(5, 4, true, 40))).toEqual({ big: "40%", label: "asked for more" });
  });
  it("out with agents, not yet ranked: the answers in, against the real constant", () => {
    expect(MIN_SENDS_FOR_CLAIM).toBe(4);
    expect(foot("out", f(3, 1, false, 33))).toEqual({ big: "1 of 4", label: "answers in" });
  });
  it("ready: Ready to send", () => {
    expect(foot("ready", f(0, 0, false, null))).toEqual({ big: "Ready", label: "to send" });
  });
  it("draft: the pieces in, of the version and the letter it needs", () => {
    expect(foot("draft", f(0, 0, false, null), { version: true, letter: false })).toEqual({ big: "1 of 2", label: "pieces in" });
    expect(foot("draft", f(0, 0, false, null), { version: false, letter: false })).toEqual({ big: "0 of 2", label: "pieces in" });
  });
  it("retired: its figures if it went out, else the word", () => {
    expect(foot("retired", f(5, 5, true, 20))).toEqual({ big: "20%", label: "asked for more" });
    expect(foot("retired", f(0, 0, false, null))).toEqual({ big: "Retired", label: "" });
  });
  it("the retired link", () => {
    expect(retiredLink(2, false)).toBe("Retired (2)");
    expect(retiredLink(2, true)).toBe("Hide retired");
  });
});

describe("v42 G · How it works", () => {
  it("the title and the four stations are the pack's", () => {
    expect(HOW_TITLE).toBe("How packages work");
    expect(HOW_STATIONS.map(([t]) => t)).toEqual(["Choose what goes in", "Give it a name", "Send it with a query", "See what’s working"]);
  });
});

describe("v42 E · package colours are not shown anywhere", () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : []; });
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("nothing outside lib/packagesV39 reads a package's stored colour for display (colourOf / hexOf / PACKAGE_COLOURS)", () => {
    const files = walk("src");
    expect(files.length).toBeGreaterThan(200);
    const readers = files.filter((f) => f !== join("src", "lib", "packagesV39.ts") && /\b(colourOf|hexOf|PACKAGE_COLOURS|firstFreeColour)\b/.test(strip(readFileSync(f, "utf8"))));
    expect(readers).toEqual([]);
  });
  it("the Query Centre and the log-a-query journey take no package colour at all", () => {
    const qc = walk(join("src", "components", "queries")), qa = walk(join("src", "components", "queryActions"));
    expect(qc.length + qa.length).toBeGreaterThan(20);
    const hits = [...qc, ...qa].filter((f) => /\bpcStyle\b|--pc\b|\.colour\b/.test(strip(readFileSync(f, "utf8"))));
    expect(hits).toEqual([]);
  });
});
