import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildFixture, SPECS, seedFor } from "./generate";
import { repoRoot, FIXTURE_DIR, type Manifest } from "./types";

const root = repoRoot();
const manifest: Manifest = JSON.parse(readFileSync(join(root, FIXTURE_DIR, "manifest.json"), "utf8"));
const asBytes = (b: Uint8Array | string) => (typeof b === "string" ? Buffer.from(b, "utf8") : Buffer.from(b));

describe("the fixture generator", () => {
  it("is deterministic: the same seed gives byte-identical files", () => {
    for (const spec of SPECS.filter((s) => s.rows <= 50)) {
      const a = buildFixture(spec, seedFor(spec.id)), b = buildFixture(spec, seedFor(spec.id));
      expect(asBytes(a.bytes).equals(asBytes(b.bytes)), spec.id).toBe(true);
      expect(a.expected).toEqual(b.expected);
    }
  });

  it("the committed fixtures are exactly what the generator writes (none hand-edited, none stale)", () => {
    expect(manifest.fixtures.map((f) => f.id)).toEqual(SPECS.map((s) => s.id));
    for (const spec of SPECS) {
      const { bytes, expected } = buildFixture(spec, seedFor(spec.id));
      const entry = manifest.fixtures.find((f) => f.id === spec.id)!;
      expect(asBytes(bytes).equals(readFileSync(join(root, entry.file))), spec.id).toBe(true);
      expect(JSON.parse(readFileSync(join(root, entry.expected), "utf8"))).toEqual(expected);
    }
  });

  it("every fixture's expected answer has one query per truth row", () => {
    for (const spec of SPECS) expect(buildFixture(spec, seedFor(spec.id)).expected.queries.length, spec.id).toBe(spec.rows);
  });

  it("the set is ~50, about a third held out, and spreads both splits across knobs", () => {
    expect(manifest.fixtures.length).toBeGreaterThanOrEqual(45);
    const hold = manifest.fixtures.filter((f) => f.split === "holdout");
    expect(hold.length / manifest.fixtures.length).toBeGreaterThan(0.25);
    expect(hold.length / manifest.fixtures.length).toBeLessThan(0.4);
    const layoutsIn = (split: string) => new Set(manifest.fixtures.filter((f) => f.split === split).map((f) => f.layout));
    expect(layoutsIn("dev").size).toBeGreaterThanOrEqual(7);
    expect(layoutsIn("holdout").size).toBeGreaterThanOrEqual(4);
  });

  it("never moves an existing fixture between splits (new ones are appended and pinned)", () => {
    // The 50 fixtures of the evaluation pack, by position: every third held out. A change to the
    // ordering would silently invalidate every report measured before it.
    manifest.fixtures.slice(0, 50).forEach((f, i) => expect(f.split, f.id).toBe(i % 3 === 2 ? "holdout" : "dev"));
  });

  it("writes the accents fixtures as UTF-8 with no byte-order mark, accents intact", () => {
    for (const id of ["utf8-nobom-csv-10", "utf8-nobom-csv-50"]) {
      const bytes = readFileSync(join(root, FIXTURE_DIR, `${id}.csv`));
      expect([bytes[0], bytes[1], bytes[2]], id).not.toEqual([0xef, 0xbb, 0xbf]);
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      expect(/[^\x00-\x7f]/.test(text), id).toBe(true);
    }
  });

  it("marks every layout the current pipeline cannot read, with a reason", () => {
    for (const f of manifest.fixtures) {
      if (f.layout !== "standard") expect(f.expectedToFail, f.id).toBe(true);
      if (f.expectedToFail) expect(f.failReason, f.id).toBeTruthy();
    }
    // 300 rows stopped being expected to fail when the output ceiling rose to 32k (quick-fixes pack).
    expect(manifest.fixtures.filter((f) => f.rows === 300).some((f) => f.expectedToFail)).toBe(false);
  });

  it("covers every messiness knob the pack names", () => {
    const knobs = new Set(manifest.fixtures.flatMap((f) => f.knobs));
    for (const k of ["preamble", "dupHeader", "totals", "blankRows", "placeholders", "agentNotes", "slang", "dateStyles", "serials", "usDates", "notesDates", "whitespace", "unusualColumns", "emoji", "tabs", "merged", "links", "colour", "accents"]) {
      expect(knobs.has(k), k).toBe(true);
    }
    expect(new Set(manifest.fixtures.map((f) => f.rows))).toEqual(new Set([10, 50, 150, 200, 250, 300]));
  });
});
