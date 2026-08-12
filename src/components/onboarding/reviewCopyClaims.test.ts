/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE REVIEW SCREENS MUST NOT ASSERT THAT AN AGENCY IS REQUIRED.
 *
 * A name **or** an agency is enough — that is the app-wide validity rule, `agentTierOf` returns
 * "sharpen" for every agent flag (nothing blocks), and the fix panel on the agents screen offers
 * `agencyWaived` as an explicit way through. Two FAQ answers said the opposite ("each record needs
 * one", "Yes — every agent needs at least an agency"), one of them a few centimetres from the panel
 * contradicting it. A writer who believed the FAQ would delete good records to satisfy a rule that
 * does not exist.
 *
 * These are copy locks, so they read the source rather than a render: the strings live in two
 * const tables inside a 3000-line component, and pulling them out to be importable would be a
 * bigger change than the fix. Each slice restates and asserts its own anchor first — an anchor
 * that stopped matching would otherwise slice to "" and let every `.not.toMatch` pass.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const REVIEW = readFileSync(resolve(here, "SmartImportReview.tsx"), "utf8");

/**
 * Slice one FAQ table by its opening anchor, asserting the anchor exists before relying on it.
 *
 * ⚠️ `//` COMMENTS ARE STRIPPED, and that is not a convenience. The comments beside this copy
 * document the old wording verbatim ("each record needs one") so the next reader knows what was
 * wrong — and a lock that reads them would fail on its own explanation, which is a false alarm
 * that teaches people to weaken the lock. The copy itself lives in object literals; no answer
 * string is ever inside a `//` comment, so removing them can never hide a real regression.
 */
const faqBlock = (anchor: string, endMark: string): string => {
  expect(REVIEW).toContain(anchor);
  const from = REVIEW.slice(REVIEW.indexOf(anchor));
  const end = from.indexOf(endMark);
  expect(end).toBeGreaterThan(0);
  return from
    .slice(0, end)
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
};

/**
 * Phrases that assert a requirement.
 *
 * ⚠️ THESE ARE MATCHED AGAINST ANSWERS ONLY, never whole blocks. "Does an agent need an agency?"
 * is a perfectly good QUESTION and contains the words; it is the ANSWER that must not say yes.
 * A block-wide match failed on exactly that, which would have pushed the next person to weaken
 * the pattern rather than the claim.
 */
const ASSERTS_A_REQUIREMENT = [
  /needs? (at least )?an agency/i,
  /agency is required/i,
  /requires an agency/i,
  /must have an agency/i,
  /each record needs one/i,
  /^No\b(?![^.]*\bor\b)/i, // a bare "No" that never offers the alternative is half an answer
];

/** Every answer string in a block — `a: "…"` / `a: '…'`, which is how both tables are written. */
const answersIn = (block: string): string[] => {
  const found = [...block.matchAll(/\ba:\s*(["'])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]);
  expect(found.length).toBeGreaterThan(0); // anchor: a table with no answers proves nothing
  return found;
};

describe("the agents-stage banner FAQ", () => {
  const block = faqBlock("  agents: {\n    line:", "  queries: {");

  it("still carries an agency question at all", () => {
    // If this fails the question was renamed or removed; the checks below would be vacuous.
    expect(block).toMatch(/agency\?/i);
  });

  it("does not assert that an agency is required, in any answer", () => {
    for (const answer of answersIn(block)) {
      for (const pattern of ASSERTS_A_REQUIREMENT) {
        expect(answer).not.toMatch(pattern);
      }
    }
  });

  it("says a name or an agency is enough", () => {
    expect(block).toMatch(/a name or an agency is enough/i);
  });
});

describe("the agents-screen margin FAQ", () => {
  const block = faqBlock("      { q: 'What does “needs a look” mean?'", "    ];");

  it("still carries the agency question", () => {
    expect(block).toMatch(/Is the agency name required\?/);
  });

  it("does not answer it with a yes", () => {
    for (const answer of answersIn(block)) {
      for (const pattern of ASSERTS_A_REQUIREMENT) {
        expect(answer).not.toMatch(pattern);
      }
    }
  });

  it("says a name or an agency is enough", () => {
    expect(block).toMatch(/a name or an agency is enough/i);
  });
});

describe("the fix panel the FAQs used to contradict", () => {
  it("still offers carrying on without an agency", () => {
    // The other half of the pair: if this copy ever goes, the FAQs above become the only statement
    // on the subject and this whole lock loses its counterweight.
    expect(REVIEW).toMatch(/carry on without one/i);
  });

  it("still offers the waive route", () => {
    expect(REVIEW).toContain("agencyWaived: true");
  });
});
