/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { REGISTER, heroSituation, heroWait, heroLine, type HeroBucket } from "./paneHero";

/**
 * ⚠️ THE REGISTER SENTENCES ARE ASSERTED AGAINST THE CONTRACT FILE, NOT AGAINST LITERALS HERE.
 * A literal on both sides is a test that agrees with itself: it goes green the day someone edits
 * the app and the test together, which is precisely the edit it exists to catch. The ref is read,
 * its own sentences extracted, and the app's table required to contain each one.
 */
/**
 * ⚠️ THE REF'S ESCAPES ARE DECODED FIRST. Its copy lives inside single-quoted JS strings, so every
 * curly apostrophe and em dash is written `’` / `—` — six ASCII characters, not the
 * character. A raw `toContain` on the real punctuation therefore fails against a file that
 * genuinely contains it, and the tempting "fix" is to write the escape into the app's copy, which
 * would ship the literal text `It’s your turn.` to a reader. Decode, then compare.
 */
const REF = readFileSync("design-refs/todo-qc-style.html", "utf8")
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

describe("the hero's register sentences are the contract's own", () => {
  it("the three the contract writes are present, character for character", () => {
    /* the ref appends these in `renderAll`; each is a quoted JS string in its source */
    const wanted = Object.entries(REGISTER).filter(([, v]) => v);
    expect(wanted.map(([k]) => k).sort()).toEqual(["chase", "close", "send"]);
    for (const [bucket, sentence] of wanted) {
      expect(REF, `${bucket}'s register is not in the contract`).toContain(sentence);
    }
  });

  it("the three the contract leaves silent stay empty — an absent register is not an invented one", () => {
    expect(REGISTER.decide).toBe("");
    expect(REGISTER.fix).toBe("");
    expect(REGISTER.note).toBe("");
  });

  it("every bucket has an entry, so a new one cannot fall through to a neighbour's tone", () => {
    const all: HeroBucket[] = ["send", "decide", "chase", "close", "fix", "note"];
    for (const b of all) expect(typeof REGISTER[b]).toBe("string");
    expect(Object.keys(REGISTER).sort()).toEqual([...all].sort());
  });
});

describe("the situation clause is the ticket's derivation, stated as a sentence", () => {
  it("names what happened and when", () => {
    expect(heroSituation({ dateKey: "Asked on", dateValue: "1 August" })).toBe("Asked on 1 August.");
    expect(heroSituation({ dateKey: "Quiet since", dateValue: "14 March 2024" }))
      .toBe("Quiet since 14 March 2024.");
  });

  it("⚠️ says NOTHING where there is no date — never 'Asked on —.'", () => {
    expect(heroSituation({ dateKey: "Asked on", dateValue: "—" })).toBe("");
    expect(heroSituation({ dateKey: "Asked on", dateValue: "" })).toBe("");
  });
});

describe("the wait chip", () => {
  it("reads value then label, lowercased, as the contract prints it", () => {
    expect(heroWait({ spanKey: "Waiting", spanValue: "7 weeks" })).toBe("7 weeks waiting");
    expect(heroWait({ spanKey: "That’s", spanValue: "2½ years" })).toBe("2½ years that’s");
  });

  it("states the absence rather than a blank", () => {
    expect(heroWait({ spanKey: "Waiting", spanValue: "—" })).toBe("No date");
  });
});

describe("the line joins them, and a crossover drops the register", () => {
  it("situation then register", () => {
    expect(heroLine("send", { dateKey: "Asked on", dateValue: "1 August" }))
      .toBe("Asked on 1 August. It’s your turn.");
  });

  it("⚠️ a crossover suppresses the register — the deed above it belongs to another journey now", () => {
    expect(heroLine("send", { dateKey: "Asked on", dateValue: "1 August" }, { crossed: true }))
      .toBe("Asked on 1 August.");
  });

  it("a journey with no register is its situation alone, with no trailing space", () => {
    const line = heroLine("fix", { dateKey: "Noticed", dateValue: "12 August" });
    expect(line).toBe("Noticed 12 August.");
    expect(line).toBe(line.trim());
  });

  it("no date and no register is empty, not a stray full stop", () => {
    expect(heroLine("note", { dateKey: "Added", dateValue: "—" })).toBe("");
  });
});
