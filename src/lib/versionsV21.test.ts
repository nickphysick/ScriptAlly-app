/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2.1 — Tracking & performance warming up (design-refs/versions-v2-1): when the section shows, how many
 * queries are still needed, the pace, the weeks, and the order of the progress rows. Each case was proved red by
 * removing its fix.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import type { BookVersion, Manuscript, Query } from "../types";
import type { AnalyticsRow } from "./analytics";
import { MIN_SENT_FOR_RATE, trackingState, versionsModel, warmNeed, warmOrder, warmPace, warmWeeks } from "./versionsV2";

const V = (id: string, num: number, extra: Partial<BookVersion> = {}): BookVersion =>
  ({ id, name: id, kind: num ? "revision" : "initial", createdDate: "2026-03-03", num, ...(num ? { parentId: "o", changes: ["c"] } : { original: true }), ...extra } as BookVersion);
const ms = (bv: BookVersion[]): Manuscript => ({ id: "ms", userId: "u", title: "T", genre: "", ageCategory: "", wordCount: 0, logline: "", status: "Querying" as never, bookVersions: bv, inUseBookVersionId: bv[bv.length - 1]?.id } as unknown as Manuscript);
let qn = 0;
const q = (v: string | null, day = "2026-10-20", status = QueryStatus.QUERIED): Query =>
  ({ id: `q${qn++}`, userId: "u", manuscriptId: "ms", agentId: "a", packageId: "", status, dateSent: `${day}T12:00:00.000Z`, ...(v ? { bookVersionId: v } : {}) } as Query);
const many = (v: string, n: number, day?: string) => Array.from({ length: n }, () => q(v, day));
const model = (bv: BookVersion[], qs: Query[]) => versionsModel(ms(bv), qs, [], [], new Map<string, AnalyticsRow>());
const facts = (m: ReturnType<typeof model>) => m.live.map((v) => m.facts.get(v.id)!);

describe("B1 — when the section shows", () => {
  it("hidden with no live versions", () => expect(trackingState(model([], []))).toBe("hidden"));
  it("warming up with one ready version, full with two; exactly 5 counts as ready", () => {
    expect(trackingState(model([V("o", 0), V("a", 1)], [...many("o", 7), ...many("a", 4)]))).toBe("warming");
    expect(trackingState(model([V("o", 0), V("a", 1)], [...many("o", 7), ...many("a", MIN_SENT_FOR_RATE)]))).toBe("full");
  });
  it("withdrawn queries do not count towards ready", () => {
    const qs = [...many("o", 7), ...many("a", 4), q("a", "2026-10-20", QueryStatus.WITHDRAWN)];
    expect(trackingState(model([V("o", 0), V("a", 1)], qs))).toBe("warming");
  });
  it("an archived version does not count, however much it sent", () => {
    const m = model([V("o", 0), V("a", 1, { archived: true }), V("b", 2)], [...many("o", 7), ...many("a", 9), ...many("b", 1)]);
    expect(trackingState(m)).toBe("warming");
    expect(facts(m).map((f) => f.v.id)).toEqual(["o", "b"]);
  });
});

describe("B2 — need, pace, weeks and the rows", () => {
  it("the two versions with the most sent decide need", () => {
    const m = model([V("o", 0), V("a", 1), V("b", 2)], [...many("o", 1), ...many("a", 3), ...many("b", 4)]);
    expect(warmNeed(facts(m))).toBe(2 + 1);
  });
  it("only one live version: its shortfall plus 5 for the missing second", () => {
    const m = model([V("o", 0)], many("o", 2));
    expect(warmNeed(facts(m))).toBe(3 + 5);
  });
  it("a ready version needs nothing (never negative)", () => {
    const m = model([V("o", 0), V("a", 1)], [...many("o", 7), ...many("a", 2)]);
    expect(warmNeed(facts(m))).toBe(3);
  });
  it("pace counts the last 30 London days, withdrawn excluded, any version or none", () => {
    const qs = [q("o", "2026-10-23"), q(null, "2026-09-24"), q("a", "2026-09-23"), q("a", "2026-10-01", QueryStatus.WITHDRAWN), q("a", "2026-10-24")];
    expect(warmPace(qs, "2026-10-23")).toBe(2);
  });
  it("a send late on a summer evening counts on its London day", () => {
    expect(warmPace([{ ...q(null), dateSent: "2026-07-31T23:30:00.000Z" } as Query], "2026-08-30")).toBe(1);
    expect(warmPace([{ ...q(null), dateSent: "2026-07-31T23:30:00.000Z" } as Query], "2026-08-31")).toBe(0);
  });
  it("weeks round up and are at least 1; pace 0 gives none", () => {
    expect(warmWeeks(3, 2)).toBe(7);
    expect(warmWeeks(1, 30)).toBe(1);
    expect(warmWeeks(8, 0)).toBeNull();
  });
  it("rows run by sent, high first, ties by version number", () => {
    /* listed out of number order, so a stable sort alone cannot pass: only the tie-break puts "a" before "c" */
    const m = model([V("o", 0), V("c", 3), V("b", 2), V("a", 1)], [...many("b", 5), ...many("c", 2), ...many("a", 2)]);
    expect(warmOrder(facts(m)).map((f) => f.v.id)).toEqual(["b", "a", "c", "o"]);
  });
});
