import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, globMatcher, oracleReply, coverage, spendDecision, knobKeys } from "./run";
import { scoreFixture } from "./score";
import { mapSheet, type MapClient } from "../src/smartImportCore";
import { bufferToCsv } from "../../src/lib/sheetText";
import { repoRoot, FIXTURE_DIR, type ExpectedFile, type Manifest } from "./types";

const root = repoRoot();
const manifest: Manifest = JSON.parse(readFileSync(join(root, FIXTURE_DIR, "manifest.json"), "utf8"));
const stub = (text: string): MapClient => ({ messages: { create: async () => ({ content: [{ type: "text", text }], usage: {} }) } });

describe("the runner", () => {
  it("parses its flags, defaulting to dev, one run, four at a time", () => {
    expect(parseArgs([])).toMatchObject({ split: "dev", runs: 1, concurrency: 4, dryRun: false, confirmSpend: false });
    expect(parseArgs(["--split", "holdout", "--runs", "3", "--only", "kitchen-*", "--dry-run"])).toMatchObject({ split: "holdout", runs: 3, only: "kitchen-*", dryRun: true });
    expect(() => parseArgs(["--split", "everything"])).toThrow();
    expect(() => parseArgs(["--spend-freely"])).toThrow();
  });

  it("matches --only globs, with commas as alternatives", () => {
    const m = globMatcher("kitchen-*,clean-csv-10");
    expect(["kitchen-csv-50", "clean-csv-10", "clean-csv-50"].map(m)).toEqual([true, true, false]);
    expect(globMatcher(null)("anything")).toBe(true);
  });

  it("refuses a live run above the ceiling unless the spend is confirmed; a dry run always runs", () => {
    expect(spendDecision(5.01, { dryRun: false, confirmSpend: false })).toBe("refuse");
    expect(spendDecision(5.01, { dryRun: false, confirmSpend: true })).toBe("run");
    expect(spendDecision(4.99, { dryRun: false, confirmSpend: false })).toBe("run");
    expect(spendDecision(500, { dryRun: true, confirmSpend: false })).toBe("run");
  });

  it("keeps layouts out of the clean reference row", () => {
    expect(knobKeys({ layout: "standard", knobs: [], rows: 10 })).toEqual(["(no knobs)"]);
    expect(knobKeys({ layout: "events", knobs: [], rows: 10 })).toEqual(["layout:events"]);
    expect(knobKeys({ layout: "standard", knobs: ["slang"], rows: 50 })).toEqual(["slang"]);
    expect(knobKeys({ layout: "standard", knobs: [], rows: 300 })).toEqual(["size:300"]);
  });

  it("measures conversion coverage: a website dropped by the conversion is not visible", () => {
    const exp: ExpectedFile = { id: "x", queries: [{ label: "q", agentName: "Clara Voss", agency: "Pemberton", website: "https://www.pemberton.co.uk", status: "Queried", sentDate: null, timeline: [], reasons: [] }] };
    expect(coverage("Agent,Agency\nClara Voss,Pemberton", exp)).toEqual({ facts: 3, visible: 2, ratio: 2 / 3 });
  });

  // The harness's own self-check: a perfect model, run through the REAL conversion and the REAL
  // parse-and-assemble path, must score 100% on every fixture. If it does not, an expected answer
  // disagrees with what the pipeline can produce — the harness is wrong, not the model.
  it("scores 100% on every fixture against the oracle stub", async () => {
    let n = 0;
    for (const f of manifest.fixtures) {
      const expected: ExpectedFile = JSON.parse(readFileSync(join(root, f.expected), "utf8"));
      const text = bufferToCsv(readFileSync(join(root, f.file)));
      const out = await mapSheet(stub(oracleReply(expected)), text);
      const s = scoreFixture(expected, out.result);
      expect(s.pass, `${f.id}: ${JSON.stringify(s.wrong.slice(0, 2))}`).toBe(true);
      expect(s.fieldsCompared).toBeGreaterThan(0);
      n++;
    }
    expect(n).toBe(manifest.fixtures.length);
  });
});
