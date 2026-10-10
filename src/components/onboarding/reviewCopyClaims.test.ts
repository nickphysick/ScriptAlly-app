/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE REVIEW MUST NOT ASSERT THAT AN AGENCY IS REQUIRED.
 *
 * A name **or** an agency is enough — that is the app-wide validity rule, every agent flag is an
 * optional sharpen (nothing blocks), and the row on the agents step offers `agencyWaived` as an
 * explicit way through. Two FAQ answers once said the opposite ("each record needs one", "Yes —
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
import { AGENT_FAQS, QUERY_FAQS, DUP_FAQS, GUIDE } from "./SmartImportReview";

const REQUIRED = /\b(needs? (at least )?an agency|agency (is|name is) required|must (have|add) an agency|every agent needs)\b/i;

describe("the agents step's questions", () => {
  const agency = AGENT_FAQS.find((f) => /agency name required/i.test(f.q));
  it("still carry the agency question", () => { expect(agency).toBeTruthy(); });
  it("do not answer it with a yes", () => { expect(agency!.a).not.toMatch(/^yes\b/i); });
  it("say a name or an agency is enough", () => { expect(agency!.a).toMatch(/a name or an agency is enough/i); });
  it("no answer on any step asserts an agency is required", () => {
    const all = [...AGENT_FAQS, ...QUERY_FAQS, ...DUP_FAQS];
    expect(all.length).toBeGreaterThan(10);
    for (const f of all) expect(f.a, f.q).not.toMatch(REQUIRED);
  });
  it("nor does the guide card", () => {
    for (const g of Object.values(GUIDE)) expect(`${g.head} ${g.text}`).not.toMatch(REQUIRED);
    /* The old margin note said an agency's name was something "we need". */
    expect(GUIDE.agents.text).not.toMatch(/we need/i);
  });
});

describe("the row the questions used to contradict", () => {
  const dir = resolve(process.cwd(), "src/components/onboarding");
  const rows = ["SmartImportReview.tsx", "reviewRows.tsx"]
    .map((f) => { try { return readFileSync(resolve(dir, f), "utf8"); } catch { return ""; } })
    .join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("still offers carrying on without an agency", () => { expect(rows).toContain("Carry on without an agency"); });
  it("still offers the waive route", () => { expect(rows).toContain("agencyWaived: true"); });
});
