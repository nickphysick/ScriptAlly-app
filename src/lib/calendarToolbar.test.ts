/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CLAIMS ARE PROPERTIES, NOT A TABLE OF EXAMPLES. Four grouping options, four sort keys and
 * a nine-way filter is a space no list of cases covers; what can be asserted is that every option
 * is reachable, that the two groupings agree about what "closed" means, and that the empty filter
 * is a no-op rather than a board-emptying one.
 */
import { describe, it, expect } from "vitest";
import {
  GROUP_BY_ORDER, GROUP_BY_LABEL, ACTION_ORDER, ACTION_LABEL, actionBucketOf,
  SORT_BY_ORDER, SORT_BY_LABEL, STATUS_LADDER, statusRank, matchesStatus, anythingApplied,
} from "./calendarToolbar";
import { CAL_SECTION_CASCADE } from "./calendarSections";
import { QueryStatus } from "../types";

describe("the board's view options", () => {
  it("every option carries a label, and the orders name the same members", () => {
    expect(GROUP_BY_ORDER.length).toBe(4);
    expect(Object.keys(GROUP_BY_LABEL).sort()).toEqual([...GROUP_BY_ORDER].sort());
    expect(Object.keys(SORT_BY_LABEL).sort()).toEqual([...SORT_BY_ORDER].sort());
    expect(Object.keys(ACTION_LABEL).sort()).toEqual([...ACTION_ORDER].sort());
  });

  it("⚠️ every section maps to an action bucket, and every bucket is reachable", () => {
    const seen = new Set(CAL_SECTION_CASCADE.map(actionBucketOf));
    for (const sec of CAL_SECTION_CASCADE) {
      expect(ACTION_ORDER, `${sec} maps outside the buckets`).toContain(actionBucketOf(sec));
    }
    /* a bucket no section can reach is a heading for nothing — the same rule the dividers follow */
    const unreachable = ACTION_ORDER.filter((b) => !seen.has(b));
    expect(unreachable, `buckets nothing maps to: ${unreachable.join(", ")}`).toEqual([]);
  });

  it("⚠️ the two groupings agree about what is closed", () => {
    /* urgency's `shut` and action's `closed` are the same rows by different names; if they parted,
       a reader switching the Group control would see a row change what it IS rather than where it
       sits. */
    expect(actionBucketOf("shut")).toBe("closed");
    for (const sec of CAL_SECTION_CASCADE) {
      if (sec !== "shut") expect(actionBucketOf(sec)).not.toBe("closed");
    }
  });

  it("the status ladder is the pipeline's order and holds every status once", () => {
    expect([...STATUS_LADDER].sort()).toEqual([...Object.values(QueryStatus)].sort());
    expect(new Set(STATUS_LADDER).size).toBe(STATUS_LADDER.length);
    /* the journey's shape: a request precedes what answers it */
    expect(statusRank(QueryStatus.FULL_REQUESTED)).toBeLessThan(statusRank(QueryStatus.FULL_SENT));
    expect(statusRank(QueryStatus.QUERIED)).toBeLessThan(statusRank(QueryStatus.OFFER));
    /* ⚠️ AN UNRECOGNISED STATUS SINKS. `indexOf` gives −1, and −1 as a rank would float every
       status the app has not been told about to the top of the board. */
    expect(statusRank("Something New")).toBeGreaterThan(statusRank(QueryStatus.NO_RESPONSE));
    expect(statusRank(null)).toBeGreaterThan(statusRank(QueryStatus.NO_RESPONSE));
  });

  it("⚠️ an empty status filter means everything, never nothing", () => {
    for (const s of Object.values(QueryStatus)) {
      expect(matchesStatus([], s), `${s} was excluded by an empty filter`).toBe(true);
    }
    /* and a tick narrows to exactly what is ticked */
    expect(matchesStatus([QueryStatus.OFFER], QueryStatus.OFFER)).toBe(true);
    expect(matchesStatus([QueryStatus.OFFER], QueryStatus.QUERIED)).toBe(false);
    /* a row with no status cannot satisfy a filter that names statuses */
    expect(matchesStatus([QueryStatus.OFFER], null)).toBe(false);
    expect(matchesStatus([], null)).toBe(true);
  });

  it("⚠️ `Clear all` appears only when it has something to clear", () => {
    expect(anythingApplied({ view: null, statuses: [] })).toBe(false);
    expect(anythingApplied({ view: "over", statuses: [] })).toBe(true);
    expect(anythingApplied({ view: null, statuses: [QueryStatus.OFFER] })).toBe(true);
    expect(anythingApplied({ view: "over", statuses: [QueryStatus.OFFER] })).toBe(true);
  });
});
