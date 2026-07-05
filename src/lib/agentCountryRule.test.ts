/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rule-text locks for the agent-country allowlist (the repo's no-emulator pattern — assert the
 * real firestore.rules artefact). Keeps the rules' isKnownCountry() list in lockstep with the two
 * client-side sources it mirrors:
 *   • src/lib/territory.ts COUNTRIES_ISO — every canonical ISO code must be accepted;
 *   • src/lib/agentOptions.ts COUNTRIES — every legacy full name must stay accepted, because
 *     isValidAgent validates the whole merged document on update, so a pre-migration stored name
 *     must never wedge later edits to that agent.
 * Also locks that both validators route `country` through isKnownCountry, and that the hardened
 * communityAgents client-update allowlist (S1) was NOT widened by the location work.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { COUNTRIES_ISO } from "./territory";
import { COUNTRIES as LEGACY_COUNTRY_NAMES } from "./agentOptions";

const rules = readFileSync("firestore.rules", "utf8");

/** The body of the isKnownCountry() rules function. */
function isKnownCountryBody(): string {
  const start = rules.indexOf("function isKnownCountry(c)");
  expect(start).toBeGreaterThan(-1);
  const end = rules.indexOf("}", start);
  return rules.slice(start, end);
}

describe("firestore.rules · isKnownCountry allowlist", () => {
  it("accepts every canonical ISO code from territory.ts", () => {
    const body = isKnownCountryBody();
    for (const { code } of COUNTRIES_ISO) {
      expect(body, `rules isKnownCountry is missing ISO code ${code}`).toContain(`'${code}'`);
    }
  });

  it("accepts every legacy full name from agentOptions.COUNTRIES", () => {
    const body = isKnownCountryBody();
    for (const name of LEGACY_COUNTRY_NAMES) {
      expect(body, `rules isKnownCountry is missing legacy name ${name}`).toContain(`'${name}'`);
    }
  });

  it("tolerates '' (the drawer's cleared-select value)", () => {
    expect(isKnownCountryBody()).toContain("c == ''");
  });

  it("gates country through isKnownCountry in BOTH agent validators", () => {
    const clause = "(!data.keys().hasAll(['country']) || (data.country is string && isKnownCountry(data.country)))";
    const first = rules.indexOf(clause);
    const second = rules.indexOf(clause, first + 1);
    expect(first, "isValidAgent must validate country via isKnownCountry").toBeGreaterThan(-1);
    expect(second, "isValidCommunityAgent must validate country via isKnownCountry").toBeGreaterThan(first);
  });

  it("keeps city a plain bounded string on both validators", () => {
    const cityClause = "(!data.keys().hasAll(['city']) || (data.city is string && data.city.size() <= 128))";
    expect(rules.split(cityClause).length - 1).toBeGreaterThanOrEqual(2);
  });

  it("does NOT widen the hardened communityAgents client-update allowlist (S1 lock)", () => {
    expect(rules).toContain("affectedKeys().hasOnly(['contributedByCount'])");
  });
});
