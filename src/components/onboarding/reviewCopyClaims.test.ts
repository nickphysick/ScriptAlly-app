/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE REVIEW MUST NOT ASSERT THAT AN AGENCY IS REQUIRED.
 *
 * A name **or** an agency is enough — that is the app-wide validity rule, and the agency question
 * on the agents step offers `agencyWaived` ("Carry on without an agency") as an answer in its own
 * right (onboarding v9: the question must be answered, and that IS an answer). Two FAQ answers once said the opposite ("each record needs one", "Yes —
 * every agent needs at least an agency"), one of them a few centimetres from the row contradicting
 * it. A writer who believed the FAQ would delete good records to satisfy a rule that does not exist.
 *
 * The questions are exported lists now (onboarding v5 part 2), so this reads them rather than
 * slicing a component's source. The retired half: the bottom banner's own FAQ table (`BANNER`) was
 * unmounted and is deleted, so its three cases went with it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { AGENT_FAQS, QUERY_FAQS, DUP_FAQS } from "./SmartImportReview";
import { DECK_WORDS } from "./v9/DeckQuestions";

const REQUIRED = /\b(needs? (at least )?an agency|agency (is|name is) required|must (have|add) an agency|every agent needs)\b/i;

describe("the agents step's questions", () => {
  const agency = AGENT_FAQS.find((f) => /agency name required/i.test(f.q));
  it("still carry the agency question", () => { expect(agency).toBeTruthy(); });
  it("do not answer it with a yes", () => { expect(agency!.a).not.toMatch(/^yes\b/i); });
  /* RE-POINTED (v9 follow-up): the answer is Nick's new one. It still opens on "No", and names the way through. */
  it("say no, and name the way through", () => { expect(agency!.a).toBe('No. Add it if you know it, or choose "Carry on without an agency". Either counts as an answer.'); });
  it("no answer on any step asserts an agency is required", () => {
    const all = [...AGENT_FAQS, ...QUERY_FAQS, ...DUP_FAQS];
    expect(all.length).toBeGreaterThan(10);
    for (const f of all) expect(f.a, f.q).not.toMatch(REQUIRED);
  });
  /* RE-POINTED (onboarding v9): the guide card is gone. The sentence that stands beside the
     agency question now is the deck's "why", and it says outright that an agency is not required. */
  it("nor does the deck's own line about the agency", () => {
    expect(DECK_WORDS.agencyWhy).not.toMatch(REQUIRED);
    expect(DECK_WORDS.agencyWhy).toMatch(/isn't required/);
  });
});

describe("the row the questions used to contradict", () => {
  const dir = resolve(process.cwd(), "src/components/onboarding");
  /* v9: the question is asked in the deck, so its words and its waive are read there */
  const rows = ["SmartImportReview.tsx", "reviewRows.tsx", "v9/DeckQuestions.tsx"]
    .map((f) => { try { return readFileSync(resolve(dir, f), "utf8"); } catch { return ""; } })
    .join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("still offers carrying on without an agency", () => { expect(rows).toContain("Carry on without an agency"); });
  it("still offers the waive route", () => { expect(rows).toContain("agencyWaived: true"); });
});
