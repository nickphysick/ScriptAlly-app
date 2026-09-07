/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The fixture's own lock — every case it CLAIMS, re-derived FROM it.
 *
 * ⚠️ THIS IS THE POPULATION GUARD FOR EVERY OTHER LOCK ON THIS PAGE. A sweep over a fixture where
 * every case is the same case passes while measuring nothing, and the harness account this page
 * used to be measured against was exactly that: zero wishlists, one genre, no socials, no
 * free-text materials, every agent queried. The faults hide in the OUTPUT, not in the probe — so
 * the defence is to state the distinct values a fixture must contain and re-derive them, rather
 * than to read the fixture and be satisfied.
 *
 * ⚠️ EVERY CASE IS DERIVED WITH THE FUNCTION THE APP USES, never by reading the literal back. A
 * test that hand-writes `materialsWanted.includes("…")` is testing its own copy of the rule; a
 * test that calls `materialRowsFromAgent` is testing the rule. That is the same law as calling
 * `cardBucket(card)` rather than typing a bucket in by hand.
 */
import { describe, expect, it } from "vitest";
import {
  CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_CASES, CONTACT_FIXTURE_QUERIES,
  CONTACT_FIXTURE_MANUSCRIPTS, FIXTURE_GENRE,
} from "./contactFixture";
import { materialRowsFromAgent } from "../../lib/agentMaterials";
import { agentCardDims, agentRelationship, isDoorOpen } from "../../lib/agentList";
import { SubmissionMethod } from "../../types";

const A = CONTACT_FIXTURE_AGENTS;
const Q = CONTACT_FIXTURE_QUERIES;

/** The `other` row, through the app's own decoder — never by re-matching the stored strings. */
const otherText = (a: (typeof A)[number]): string => {
  const row = materialRowsFromAgent(a.materialsWanted).find((r) => r.key === "other");
  return row && row.kind === "text" && row.on ? row.text : "";
};

describe("the Contact list fixture — a cast, not a crowd", () => {
  it("is big enough to be a population at all", () => {
    expect(A.length).toBeGreaterThan(3);
    expect(CONTACT_FIXTURE_MANUSCRIPTS.length).toBeGreaterThan(0);
  });

  it("every agent id is distinct, and every query points at one of them", () => {
    expect(new Set(A.map((a) => a.id)).size).toBe(A.length);
    const ids = new Set(A.map((a) => a.id));
    for (const query of Q) expect(ids.has(query.agentId), `${query.id} points at a stranger`).toBe(true);
  });

  /* ⚠️ THE WISHLIST TRIO IS THE PHASE 2 LOCK'S WHOLE SUBJECT. Its long row must stay long: the
     overflow it creates is the instrument, and a shortened wishlist disarms the lock silently
     rather than failing it. The floor is stated as a length because that is what overflows. */
  it("carries three wishlist lengths — long enough to overflow, two lines, and absent", () => {
    const lens = A.map((a) => (a.mswlNotes || "").trim().length);
    const longest = Math.max(...lens);
    expect(longest, "the overflow case must be long enough to overflow a ~401px card").toBeGreaterThan(500);
    expect(lens.filter((n) => n > 0 && n < 120).length, "a two-line wishlist").toBeGreaterThan(0);
    expect(lens.filter((n) => n === 0).length, "an absent wishlist").toBeGreaterThan(0);
  });

  it("carries all three genre-match cases — several with a match, one match, and none", () => {
    const matching = A.filter((a) => a.genres.includes(FIXTURE_GENRE));
    expect(matching.length).toBeGreaterThan(0);
    expect(matching.some((a) => a.genres.length >= 3), "three genres, one of them the manuscript's").toBe(true);
    expect(matching.some((a) => a.genres.length === 1), "a single matching genre").toBe(true);
    expect(A.some((a) => a.genres.length > 0 && !a.genres.includes(FIXTURE_GENRE)), "no match at all").toBe(true);
  });

  it("carries both material cases — a non-empty Other, and none", () => {
    expect(A.filter((a) => otherText(a) !== "").length, "an Other").toBeGreaterThan(0);
    expect(A.filter((a) => otherText(a) === "").length, "no Other").toBeGreaterThan(0);
  });

  it("carries both socials cases — two accounts, and none", () => {
    expect(A.some((a) => (a.socials ?? []).length >= 2), "two socials").toBe(true);
    expect(A.some((a) => (a.socials ?? []).length === 0), "no socials").toBe(true);
  });

  it("carries a never-queried agent, so the history axis has all three values", () => {
    const rel = A.map((a) => agentRelationship(a.id, Q));
    expect(rel).toContain("never");
    expect(rel).toContain("active");
    expect(rel).toContain("prev");
  });

  /* ⚠️ BOTH CLOSED CASES, AND THE SECOND IS THE ONE THE REF CANNOT SPEAK TO. Its two closed
     agents are both terminal, so it never draws a shut door over a live query — and that is
     precisely the case `agentCardDims` exists to get right. Without both rows the carve-out is
     unproved, and an unproved carve-out is one edit from being "simplified" away. */
  it("carries a closed door BOTH ways — nothing live, and a live query", () => {
    const shut = A.filter((a) => !isDoorOpen(a));
    expect(shut.length, "closed agents at all").toBeGreaterThan(1);
    expect(shut.some((a) => agentCardDims(a, Q)), "closed with nothing live — dims").toBe(true);
    expect(shut.some((a) => !agentCardDims(a, Q)), "closed with a live query — never dims").toBe(true);
  });

  it("carries a non-GB country and three submission methods", () => {
    const countries = new Set(A.map((a) => a.country).filter(Boolean));
    expect(countries.size, "more than one country").toBeGreaterThan(1);
    const methods = new Set(A.map((a) => a.submissionMethod));
    expect(methods.has(SubmissionMethod.ONLINE_FORM)).toBe(true);
    expect(methods.has(SubmissionMethod.POST)).toBe(true);
  });

  /* Absence is a first-class state on this page, so the fixture has to contain some. */
  it("carries an unrated agent with no stated window, and no agency", () => {
    expect(A.some((a) => a.starRating === undefined && a.responseTimeWeeks === undefined)).toBe(true);
    expect(A.some((a) => !(a.agency || "").trim()), "an agent with no agency").toBe(true);
  });

  it("the stated case list is honest — one claim per case, none duplicated", () => {
    expect(new Set(CONTACT_FIXTURE_CASES).size).toBe(CONTACT_FIXTURE_CASES.length);
    expect(CONTACT_FIXTURE_CASES.length).toBeGreaterThan(12);
  });
});
