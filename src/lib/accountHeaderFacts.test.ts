/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountHeaderFacts — the omission rule, the singulars, and what "out" means.
 */
import { describe, it, expect } from "vitest";
import { joinedLabel, queryingLabel, sentCount, accountFacts } from "./accountHeaderFacts";

describe("joinedLabel", () => {
  it("spells the date the way the rest of the app does", () => {
    expect(joinedLabel("2026-03-04T09:00:00.000Z")).toBe("4 March 2026");
  });

  /* ⚠️ NULL, SO THE CALLER CAN DROP THE ROW. "Joined —" states nothing and "Joined Invalid Date"
     states something false; both are worse than two rows. */
  it("returns null for anything it cannot read, rather than a placeholder", () => {
    expect(joinedLabel(undefined)).toBeNull();
    expect(joinedLabel(null)).toBeNull();
    expect(joinedLabel("")).toBeNull();
    expect(joinedLabel("not a date")).toBeNull();
  });
});

describe("queryingLabel", () => {
  it("agrees with itself on one manuscript", () => {
    expect(queryingLabel(1, 9)).toBe("1 manuscript · 9 out");
    expect(queryingLabel(2, 9)).toBe("2 manuscripts · 9 out");
  });

  it("states a true zero rather than hiding it", () => {
    expect(queryingLabel(0, 0)).toBe("0 manuscripts · 0 out");
  });
});

/* ⚠️ "OUT" IS THE POINT OF THIS FUNCTION. An undated query is one that has not been sent — the
   type says so — and counting it would put unsent letters in the post. */
describe("sentCount counts what has gone out, not what is on file", () => {
  it("excludes queries with no dateSent", () => {
    expect(sentCount([{ dateSent: "2026-01-01" }, {}, { dateSent: "2026-02-02" }])).toBe(2);
  });

  it("excludes an empty-string date too", () => {
    expect(sentCount([{ dateSent: "" }, { dateSent: "2026-01-01" }])).toBe(1);
  });

  it("is zero on an empty list", () => {
    expect(sentCount([])).toBe(0);
  });
});

describe("accountFacts — order, and the omission", () => {
  const base = { plan: "Free", creationTime: "2026-03-04T09:00:00.000Z", manuscriptCount: 1, sentCount: 9 };

  it("states Plan, Joined and Querying, in that order", () => {
    expect(accountFacts(base).map((f) => f.key)).toEqual(["Plan", "Joined", "Querying"]);
    expect(accountFacts(base).map((f) => f.value)).toEqual(["Free", "4 March 2026", "1 manuscript · 9 out"]);
  });

  it("drops Joined entirely when the date is unavailable — never renders it empty", () => {
    const rows = accountFacts({ ...base, creationTime: null });
    expect(rows.map((f) => f.key)).toEqual(["Plan", "Querying"]);
    for (const r of rows) expect(r.value.length).toBeGreaterThan(0);
  });

  it("never emits a row with an empty value", () => {
    for (const c of [null, undefined, "", "rubbish"]) {
      for (const row of accountFacts({ ...base, creationTime: c })) {
        expect(row.value.trim(), row.key).not.toBe("");
      }
    }
  });
});
