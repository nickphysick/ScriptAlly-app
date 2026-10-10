/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lock N1 (onboarding v5 part 2) — the skipped-rows notice is the commit's own count, one row per
 * skipped row, each with the source's reason verbatim.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { QueryStatus } from "../types";
import { validateSmartImport } from "./smartImport";
import {
  buildImportNotice, saveImportNotice, readImportNotice, clearImportNotice, noticeHeadline, noticeWhy, noticeToggle, NO_NAME_REASON,
} from "./importNotice";

const agents = [
  { ref: "a1", name: "Clara Voss", agency: "Pemberton Literary" },
  { ref: "a2", name: "", agency: "" },
  { ref: "a3", name: "", agency: "Westbrook Literary" },
];
const q = (agentRef: string, status: QueryStatus | null, sentDate: string | null = null) => ({ agentRef, status, sentDate });

describe("N1 — buildImportNotice", () => {
  it("returns null when nothing was skipped", () => {
    expect(buildImportNotice([], { queriesSkipped: 0, errors: [] }, agents)).toBeNull();
    /* an error that is not a skip does not make a notice */
    expect(buildImportNotice([], { queriesSkipped: 0, errors: ["Couldn't save agent X."] }, agents)).toBeNull();
  });

  it("one skipped row → one row, with the validation's own reason", () => {
    const v = validateSmartImport({ agents, queries: [q("a1", QueryStatus.QUERIED, "2025-01-01"), q("a2", QueryStatus.REJECTED, "2024-06-01")] });
    expect(v.skipped.length).toBe(1);
    const n = buildImportNotice(v.skipped, { queriesSkipped: 1, errors: [] }, agents, 7)!;
    expect(n.count).toBe(1);
    expect(n.rows).toEqual([{ who: "", status: "Rejected", sentDate: "2024-06-01", reason: v.skipped[0].reason }]);
    expect(n.rows[0].reason).toBe(NO_NAME_REASON);
    expect(n.at).toBe(7);
  });

  it("three skipped rows, one of them at commit time → three rows; length is the commit's count", () => {
    const v = validateSmartImport({ agents, queries: [q("a2", QueryStatus.QUERIED), q("zz", QueryStatus.FULL_SENT, "2024-02-02"), q("a1", QueryStatus.QUERIED)] });
    expect(v.skipped.length).toBe(2);
    const commitLine = "Skipped a Partial Sent query — its agent couldn't be saved.";
    const outcome = { queriesSkipped: 3, errors: ["Couldn't save agent Westbrook Literary: boom", commitLine] };
    const n = buildImportNotice(v.skipped, outcome, agents)!;
    expect(n.rows.length).toBe(outcome.queriesSkipped);
    expect(n.rows.map((r) => r.reason)).toEqual([v.skipped[0].reason, v.skipped[1].reason, commitLine]);
    /* the commit-time row: nobody to name, the status as the commit read it, no date */
    expect(n.rows[2]).toEqual({ who: "", status: "Partial Sent", sentDate: null, reason: commitLine });
  });

  it("who is the agent's name, else the agency, else nothing", () => {
    const skipped = [
      { query: q("a1", null), reason: "No readable status" },
      { query: q("a3", null), reason: "No readable status" },
      { query: q("a2", null), reason: "No readable status" },
    ];
    const n = buildImportNotice(skipped, { queriesSkipped: 3, errors: [] }, agents)!;
    expect(n.rows.map((r) => r.who)).toEqual(["Clara Voss", "Westbrook Literary", ""]);
  });

  it("a list that cannot be made the count is not shown: the count alone", () => {
    const n = buildImportNotice([], { queriesSkipped: 2, errors: [] }, agents)!;
    expect(n.count).toBe(2);
    expect(n.rows).toEqual([]);
    expect(noticeWhy(n)).toBeNull();
  });
});

describe("the line's words", () => {
  const row = (reason: string) => ({ who: "", status: "Queried", sentDate: null, reason });
  it("singular and plural", () => {
    expect(noticeHeadline(1)).toBe("1 row from your file wasn't imported.");
    expect(noticeHeadline(3)).toBe("3 rows from your file weren't imported.");
    expect(noticeToggle(1, false)).toBe("Show the row");
    expect(noticeToggle(3, false)).toBe("Show the rows");
    expect(noticeToggle(1, true)).toBe("Hide the row");
    expect(noticeToggle(3, true)).toBe("Hide the rows");
  });
  it("the second sentence only when every row has the no-name reason", () => {
    expect(noticeWhy({ count: 1, rows: [row(NO_NAME_REASON)], at: 0 })).toBe("It had no agent or agency name.");
    expect(noticeWhy({ count: 2, rows: [row(NO_NAME_REASON), row(NO_NAME_REASON)], at: 0 })).toBe("They had no agent or agency name.");
    expect(noticeWhy({ count: 2, rows: [row(NO_NAME_REASON), row("Row didn't match an agent")], at: 0 })).toBeNull();
  });
  it("the no-name reason is the validator's own string", () => {
    const v = validateSmartImport({ agents, queries: [q("a2", QueryStatus.QUERIED)] });
    expect(v.skipped[0].reason).toBe(NO_NAME_REASON);
  });
});

describe("the notice is kept per account, on the device", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    };
  });
  const notice = { count: 1, rows: [{ who: "", status: "Queried", sentDate: null, reason: NO_NAME_REASON }], at: 5 };
  it("saves under sa.importSkipped.<uid> and reads back", () => {
    saveImportNotice("u1", notice);
    expect([...store.keys()]).toEqual(["sa.importSkipped.u1"]);
    expect(readImportNotice("u1")).toEqual(notice);
    expect(readImportNotice("u2")).toBeNull();
  });
  it("a null notice clears the key, and so does clear", () => {
    saveImportNotice("u1", notice); saveImportNotice("u1", null);
    expect(store.size).toBe(0);
    saveImportNotice("u1", notice); clearImportNotice("u1");
    expect(readImportNotice("u1")).toBeNull();
  });
  it("junk in storage reads as no notice", () => {
    store.set("sa.importSkipped.u1", "{not json");
    expect(readImportNotice("u1")).toBeNull();
    store.set("sa.importSkipped.u1", JSON.stringify({ count: 0, rows: [] }));
    expect(readImportNotice("u1")).toBeNull();
  });
  it("storage that throws is survived", () => {
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
    expect(() => saveImportNotice("u1", notice)).not.toThrow();
    expect(readImportNotice("u1")).toBeNull();
    expect(() => clearImportNotice("u1")).not.toThrow();
  });
});
