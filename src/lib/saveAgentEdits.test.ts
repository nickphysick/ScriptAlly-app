/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Foundation tests for the Edit Agent write path (Prompt 1):
 *   - sanitizeAgentPatch — pure validation/normalisation (undefined-strip, "Not set" → delete, guards).
 *   - Rule-TEXT assertions for the responseTimeWeeks relaxation. Behavioural rule tests need the
 *     Firestore emulator (no Java in this repo — see agentIdentityRule.test.ts), so this asserts the
 *     real rule artefact: GREEN once isValidAgent admits an absent responseTimeWeeks, while
 *     isValidCommunityAgent keeps the strict int form. The behavioural variants live in
 *     tests/rules/firestore.rules.test.ts (run via `npm run test:rules` on the emulator).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { sanitizeAgentPatch } from "./saveAgentEdits";
import { SubmissionStatus } from "../types";

describe("sanitizeAgentPatch", () => {
  it("omits keys whose value is undefined (never passes raw undefined to Firestore)", () => {
    const r = sanitizeAgentPatch({ name: "Sarah", agency: undefined, email: undefined });
    expect(r.errors).toEqual([]);
    expect(r.fields).toEqual({ name: "Sarah" });
    expect("agency" in r.fields).toBe(false);
    expect("email" in r.fields).toBe(false);
  });

  it("maps responseTimeWeeks: null ('Not set') to a delete, not a field", () => {
    const r = sanitizeAgentPatch({ responseTimeWeeks: null });
    expect(r.errors).toEqual([]);
    expect(r.deletes).toEqual(["responseTimeWeeks"]);
    expect("responseTimeWeeks" in r.fields).toBe(false);
  });

  it("keeps a present non-negative integer responseTimeWeeks as a field", () => {
    const r = sanitizeAgentPatch({ responseTimeWeeks: 8 });
    expect(r.errors).toEqual([]);
    expect(r.fields.responseTimeWeeks).toBe(8);
    expect(r.deletes).toEqual([]);
  });

  it("rejects a negative or non-integer responseTimeWeeks", () => {
    expect(sanitizeAgentPatch({ responseTimeWeeks: -1 }).errors.length).toBe(1);
    expect(sanitizeAgentPatch({ responseTimeWeeks: 6.5 }).errors.length).toBe(1);
  });

  it("rejects a submissionStatus outside the canonical enum", () => {
    const r = sanitizeAgentPatch({ submissionStatus: "Maybe" });
    expect(r.errors.length).toBe(1);
    expect("submissionStatus" in r.fields).toBe(false);
  });

  it("accepts each canonical submissionStatus", () => {
    for (const s of Object.values(SubmissionStatus)) {
      const r = sanitizeAgentPatch({ submissionStatus: s });
      expect(r.errors).toEqual([]);
      expect(r.fields.submissionStatus).toBe(s);
    }
  });

  it("guards starRating to an integer 1–5", () => {
    expect(sanitizeAgentPatch({ starRating: 0 }).errors.length).toBe(1);
    expect(sanitizeAgentPatch({ starRating: 6 }).errors.length).toBe(1);
    expect(sanitizeAgentPatch({ starRating: 3.5 }).errors.length).toBe(1);
    expect(sanitizeAgentPatch({ starRating: 4 }).fields.starRating).toBe(4);
  });

  it("caps materialsWanted at 20", () => {
    expect(sanitizeAgentPatch({ materialsWanted: Array(21).fill("x") }).errors.length).toBe(1);
    expect(sanitizeAgentPatch({ materialsWanted: ["Query Letter"] }).errors).toEqual([]);
  });

  it("passes private notes through (string field)", () => {
    const r = sanitizeAgentPatch({ notes: "Met at the 2025 festival." });
    expect(r.errors).toEqual([]);
    expect(r.fields.notes).toBe("Met at the 2025 festival.");
  });

  it("passes country/city through (string fields, v12 location)", () => {
    const r = sanitizeAgentPatch({ country: "United Kingdom", city: "London" });
    expect(r.errors).toEqual([]);
    expect(r.fields.country).toBe("United Kingdom");
    expect(r.fields.city).toBe("London");
  });

  it("passes a valid socials list + mirrored discrete handles through", () => {
    const r = sanitizeAgentPatch({
      socials: [{ platform: "X / Twitter", handle: "@a" }, { platform: "Bluesky", handle: "b.bsky" }],
      twitter: "@a", bluesky: "b.bsky", instagram: "",
    });
    expect(r.errors).toEqual([]);
    expect((r.fields.socials as unknown[]).length).toBe(2);
    expect(r.fields.twitter).toBe("@a");
    expect(r.fields.instagram).toBe("");
  });

  it("rejects a malformed socials list (caps at 30, requires platform+handle)", () => {
    expect(sanitizeAgentPatch({ socials: Array(31).fill({ platform: "X", handle: "y" }) }).errors.length).toBe(1);
    expect(sanitizeAgentPatch({ socials: [{ platform: "X" } as never] }).errors.length).toBe(1);
  });

  it("passes a full valid patch through cleanly", () => {
    const r = sanitizeAgentPatch({
      name: "Sarah Latham", agency: "Curtis Brown", email: "s@cb.com", website: "",
      genres: ["Fantasy"], mswlNotes: "loves voice", starRating: 5,
      submissionStatus: SubmissionStatus.OPEN, responseTimeWeeks: 12,
      noResponseMeansNo: true, submissionMethod: "Email", materialsWanted: ["Query Letter"],
    });
    expect(r.errors).toEqual([]);
    expect(r.deletes).toEqual([]);
    expect(r.fields.submissionStatus).toBe("Open");
    expect(r.fields.starRating).toBe(5);
    expect(r.fields.responseTimeWeeks).toBe(12);
  });
});

describe("firestore.rules · responseTimeWeeks relaxation (rule-text)", () => {
  const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  const isolate = (fn: string) => {
    const start = rules.indexOf(`function ${fn}`);
    return rules.slice(start, rules.indexOf("\n    }", start)).replace(/\s+/g, " ");
  };
  const agentBody = isolate("isValidAgent");
  const communityBody = isolate("isValidCommunityAgent");

  it("isValidAgent makes responseTimeWeeks optional (absent OR non-negative int)", () => {
    expect(agentBody).toMatch(
      /!data\.keys\(\)\.hasAll\(\['responseTimeWeeks'\]\) \|\| \(data\.responseTimeWeeks is int && data\.responseTimeWeeks >= 0\)/
    );
  });

  it("isValidAgent no longer hard-requires responseTimeWeeks to be an int", () => {
    // The strict, unconditional form (the field directly preceded by `&&`) must be gone.
    expect(agentBody).not.toMatch(/&& data\.responseTimeWeeks is int/);
  });

  it("isValidCommunityAgent KEEPS the strict int form (relaxation scoped to isValidAgent only)", () => {
    expect(communityBody).toMatch(/&& data\.responseTimeWeeks is int && data\.responseTimeWeeks >= 0/);
  });

  it("the agents update allowlist still includes responseTimeWeeks (so a deleteField passes affectedKeys)", () => {
    expect(rules).toMatch(/hasOnly\(\[[\s\S]*'responseTimeWeeks'[\s\S]*\]\)/);
  });

  it("isValidAgent admits optional country/city (country allowlisted via isKnownCountry, city a bounded string)", () => {
    // AMENDED by the location build: country tightened from any-string to the isKnownCountry
    // allowlist (ISO codes + tolerated legacy names — full sync locks in agentCountryRule.test.ts).
    expect(agentBody).toMatch(
      /!data\.keys\(\)\.hasAll\(\['country'\]\) \|\| \(data\.country is string && isKnownCountry\(data\.country\)\)/
    );
    expect(agentBody).toMatch(
      /!data\.keys\(\)\.hasAll\(\['city'\]\) \|\| \(data\.city is string && data\.city\.size\(\) <= 128\)/
    );
  });

  it("the agents update allowlist includes country + city (so the drawer can write them)", () => {
    expect(rules).toMatch(/hasOnly\(\[[\s\S]*'country'[\s\S]*\]\)/);
    expect(rules).toMatch(/hasOnly\(\[[\s\S]*'city'[\s\S]*\]\)/);
  });

  it("isValidCommunityAgent admits optional country/city with the same idiom (location build — supersedes the v12 user-agents-only scoping)", () => {
    expect(communityBody).toMatch(
      /!data\.keys\(\)\.hasAll\(\['country'\]\) \|\| \(data\.country is string && isKnownCountry\(data\.country\)\)/
    );
    expect(communityBody).toMatch(
      /!data\.keys\(\)\.hasAll\(\['city'\]\) \|\| \(data\.city is string && data\.city\.size\(\) <= 128\)/
    );
  });
});
