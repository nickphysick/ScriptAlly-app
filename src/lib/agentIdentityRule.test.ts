/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lock for the agency-less-agent drop (the "Priya Raman" bug): the agent CREATE security rule must
 * admit a record with a NAME *or* an AGENCY (≥1 identity anchor), never hard-require agency.
 *
 * Why a rule-TEXT test and not a behavioural one: the drop happens server-side at the Firestore rule
 * `isValidAgent` (commitSmartImport calls addAgent → setDoc → the rule rejects agency:"" → silent
 * skip). Behavioural rule testing needs the Firestore emulator, which isn't available in this repo
 * (no Java). So this asserts the real rule artefact instead — it is RED on the buggy rule (which
 * gated `data.agency.size() >= 1`) and GREEN once the rule admits name-or-agency. The true end-to-end
 * (14/16, Priya present) is the live dev re-import after the rules are deployed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("firestore.rules · agent identity gate (empty-and-valid)", () => {
  const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  // Isolate the isValidAgent(...) function body so we don't match the community-agent variant.
  const start = rules.indexOf("function isValidAgent");
  const body = rules.slice(start, rules.indexOf("\n    }", start)).replace(/\s+/g, " ");

  it("admits a record with a NAME or an AGENCY (≥1 identity anchor)", () => {
    expect(body).toMatch(/data\.name\.size\(\) >= 1 \|\| data\.agency\.size\(\) >= 1/);
  });

  it("does NOT hard-require agency (a named agency-less agent like Priya is valid)", () => {
    // The exact clause that dropped Priya: agency independently required to be non-empty.
    expect(body).not.toMatch(/data\.agency is string && data\.agency\.size\(\) >= 1/);
  });
});
