/**
 * Query card v167 §C step 3 — "What {first} asks for" round-trips through the agent materials encoder without loss, on
 * the spellings actually stored (tests/emulator-seed/harness.json and the classifier's legacy forms).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { asksAny, asksFromStored, asksToStored, asksUnchanged, otherText } from "./qcAsks167";
import { materialRowsFromAgent, parseAgentMaterials } from "./agentMaterials";

/** what the profile holds after a save, read back the way the agent's full card reads it */
const asCard = (stored: string[]) => JSON.stringify(materialRowsFromAgent(stored));
const roundTrip = (stored: string[]) => asksToStored(asksFromStored(stored));

describe("QC167-7 (unit) the asks drawer saves through the encoder, losing nothing", () => {
  it("the harness's own spellings load, and an untouched drawer writes what the full card already reads", () => {
    for (const stored of [
      ["Query Letter", "Synopsis", "Sample Pages"], ["Query letter", "Synopsis"], ["Query Letter", "Synopsis"], [], ["Query letter"],
      ["Query Letter", "Sample Pages"], ["Query letter", "Sample chapters"],
    ]) {
      expect(asCard(roundTrip(stored)), JSON.stringify(stored)).toBe(asCard(stored));
      expect(asksUnchanged(asksFromStored(stored), stored)).toBe(true);
    }
  });
  it("a stored synopsis page count is kept", () => {
    expect(roundTrip(["Query letter", "Synopsis (2 pages)", "First 3 chapters"])).toEqual(["Query letter", "Synopsis (2 pages)", "First 3 chapters"]);
  });
  it("legacy: more than one sample unit keeps every unit, and the first is the one edited", () => {
    const stored = ["Query letter", "First 50 pages", "First 3 chapters", "5,000 words"];
    expect(asCard(roundTrip(stored))).toBe(asCard(stored));
    const d = asksFromStored(stored);
    expect(d.sampleRow?.unit).toBe("Chapters");
    expect(d.moreSamples.map((r) => r.unit)).toEqual(["Pages", "Words"]);
    const edited = asksToStored({ ...d, edited: { unit: "chapters", amt: 5, from: 1, sect: false, fu: null } });
    expect(edited).toEqual(["Query letter", "First 50 pages", "First 5 chapters", "5,000 words"]);
  });
  it("legacy: strings that parse as Other keep their words; Author bio shows as its suggestion; Full manuscript rides along", () => {
    const stored = ["Query letter", "Author bio", "A one-page CV", "Full manuscript", "Chapters"];
    const d = asksFromStored(stored);
    expect(d.picks).toEqual(["Author bio"]);
    expect(d.free).toBe("A one-page CV");
    expect(d.kept).toEqual(["Full manuscript"]);
    const out = roundTrip(stored);
    expect(out).toContain("Full manuscript");
    expect(out).toContain("Sample chapters");
    expect(parseAgentMaterials(out).otherText).toBe("Author bio · A one-page CV");
    /* and it is stable from there */
    expect(roundTrip(out)).toEqual(out);
  });
  it("suggestions and free words are one Other text, in the offered order", () => {
    expect(otherText({ picks: ["Comparable titles", "Author bio"], free: " A writing CV " })).toBe("Author bio · Comparable titles · A writing CV");
    const d = { ...asksFromStored(["Query letter"]), other: true, picks: ["One-line pitch"], free: "" };
    expect(asksToStored(d)).toEqual(["Query letter", "One-line pitch"]);
    expect(asksFromStored(asksToStored(d)).picks).toEqual(["One-line pitch"]);
  });
  it("a sample ticked fresh writes the picker's blank (3 chapters) through the encoder", () => {
    expect(asksToStored({ ...asksFromStored(["Query letter"]), sample: true })).toEqual(["Query letter", "First 3 chapters"]);
  });
  it("nothing ticked: Save stays off", () => {
    expect(asksAny(asksFromStored([]))).toBe(false);
  });
  it("no hand-built strings and no fixed amounts in the drawer or its lib", () => {
    const ui = readFileSync("src/components/queries/centre/QcAsks167.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const lib = readFileSync("src/lib/qcAsks167.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const s of [ui, lib]) {
      expect(s).not.toMatch(/`First \$\{|"First \d+ (pages|chapters)"|ASK_POOL/);
    }
    expect(lib).toMatch(/materialsWantedFromRows\(rows\)/);
    expect(ui).toMatch(/<SampleControl [^>]*openingOnly/);
  });
});
