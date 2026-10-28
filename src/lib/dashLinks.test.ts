/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v118 Part B — the two entry points the dashboard's hoops (and the phone's cards) open.
 */
import { describe, expect, it } from "vitest";
import { queriesForIds } from "./queriesFilterParam";
import { queriesForIds as phoneQueriesForIds } from "./dashPhone";
import { CONTACT_STATUS_GLANCE, contactListForStatus, glanceForParam } from "./contactList";
import { GLANCE_SETS } from "./contactV25";

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
  it("maps the dashboard's three groups onto the list's own At a glance cards", () => {
    expect(contactListForStatus("querying")).toBe("/agents?status=querying");
    expect(contactListForStatus("closed")).toBe("/agents?status=closed");
    expect(contactListForStatus("none")).toBe("/agents?status=notq");
    expect([glanceForParam("querying"), glanceForParam("closed"), glanceForParam("notq")]).toEqual(["querying", "closed", "none"]);
    expect(glanceForParam("bogus")).toBeNull();
    expect(glanceForParam(null)).toBeNull();
  });
  it("every group is one of the cards that filters", () => {
    for (const g of Object.values(CONTACT_STATUS_GLANCE)) expect(GLANCE_SETS[g]).not.toBeNull();
  });
});
