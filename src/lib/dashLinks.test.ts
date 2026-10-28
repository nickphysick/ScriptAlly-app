/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v118 Part B — the two entry points the dashboard's hoops (and the phone's cards) open.
 */
import { describe, expect, it } from "vitest";
import { queriesForIds } from "./queriesFilterParam";
import { queriesForIds as phoneQueriesForIds } from "./dashPhone";
import { CONTACT_STATUS_KEYS, contactListForStatus, statusKeysForParam, STATUS_CHOICES } from "./contactList";

describe("the Query Centre on exactly these queries", () => {
  it("carries the ids, and what they are when it is given", () => {
    expect(queriesForIds(["a", "b"], "Passed on query")).toBe("/queries?ids=a%2Cb&from=Passed%20on%20query");
    expect(queriesForIds(["a", "b"])).toBe("/queries?ids=a%2Cb");
    expect(queriesForIds([], "Passed on query")).toBe("/queries");
  });
  it("is ONE helper: the phone's cards read the same function", () => {
    expect(phoneQueriesForIds).toBe(queriesForIds);
  });
});

describe("the Contact list's ?status=", () => {
  it("maps the dashboard's three groups onto the list's own status filter", () => {
    expect(contactListForStatus("querying")).toBe("/agents?status=querying");
    expect(contactListForStatus("closed")).toBe("/agents?status=closed");
    expect(contactListForStatus("none")).toBe("/agents?status=notq");
    expect(statusKeysForParam("notq")).toEqual(["none"]);
    expect(statusKeysForParam("bogus")).toBeNull();
    expect(statusKeysForParam(null)).toBeNull();
  });
  it("the three groups partition every status the list knows, so each agent lands in exactly one", () => {
    const all = Object.values(CONTACT_STATUS_KEYS).flat();
    expect([...all].sort()).toEqual(STATUS_CHOICES.map((c) => c.key).sort());
    expect(new Set(all).size).toBe(all.length);
  });
});
