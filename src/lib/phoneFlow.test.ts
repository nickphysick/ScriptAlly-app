/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2, Part 4 — the flow layout's words.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHECK_QUESTION, LOG_SLOTS, firstOf, phoneQuestion } from "./phoneFlow";

describe("the flow's questions", () => {
  it("asks a step as a sentence, with the agent by first name", () => {
    expect(phoneQuestion("resp", "The response", "Hannah")).toBe("What did Hannah say?");
    expect(phoneQuestion("log", "What you sent", "Hannah")).toBe("What did you send Hannah?");
    expect(phoneQuestion("close", "Where it stands", "Hannah")).toBe("Why are you closing Hannah’s query?");
  });
  it("never guesses a pronoun: no first name reads 'the agent'", () => {
    const all = ["The response", "What you sent", "The nudge", "The request", "If they don't reply"].map((t) => phoneQuestion("resp", t, ""));
    for (const q of all) expect(q).not.toMatch(/\b(he|she|him|her|his|hers)\b/i);
    expect(phoneQuestion("resp", "The response", "")).toBe("What did the agent say?");
  });
  it("a step it does not know keeps the journey's own title", () => {
    expect(phoneQuestion("offer", "Something new", "Hannah")).toBe("Something new");
    expect(CHECK_QUESTION).toBe("Look right?");
    expect(firstOf("Hannah Cole")).toBe("Hannah");
  });
  it("Log's placeholder slots are Log's own step titles", () => {
    const src = readFileSync("src/components/queryActions/journeys/LogJourney.tsx", "utf8");
    for (const t of LOG_SLOTS) expect(src).toContain(`title: "${t}"`);
  });
});
