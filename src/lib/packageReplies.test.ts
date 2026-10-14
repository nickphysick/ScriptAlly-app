/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PK3 E1 (unit) and the derivations under v4 Part E. Every expectation here is derived from the fixture by a
 * second route (packageResults, or counting by hand from the fixture's own statuses), never typed twice.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Query, type SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import { packageResults } from "./packageResults";
import {
  creditedTo, leadOf, materialSplit, missingEditions, overall, packageSplit, ranked, sortRows, split, splitLabel, tally,
  type RankRow, type Split,
} from "./packageReplies";

const pkg = (over: Partial<SubmissionPackage>): SubmissionPackage => ({
  id: "p", userId: "u", manuscriptId: "m", packageName: "P", queryLetterVersionId: "L2", synopsisVersionId: "S1",
  samplePagesVersionId: "", status: "Active", createdDate: "2026-01-01", ...over,
});

/* one package, two editions: the 1st held letter L1 and no version, the 2nd holds L2 and version V1 */
const P = pkg({
  id: "p1", packageName: "Standard UK", bookVersionId: "V1", firstSentAt: "2026-02-01", edition: 2,
  editions: [
    { n: 1, startedAt: "2026-01-01", summary: "", versions: ["L1", "S1"], queryLetterVersionId: "L1", synopsisVersionId: "S1" },
    { n: 2, startedAt: "2026-03-01", summary: "", versions: ["L2", "S1"], queryLetterVersionId: "L2", synopsisVersionId: "S1", bookVersionId: "V1" },
  ],
});
const Q2 = pkg({ id: "p2", packageName: "Comps-forward", queryLetterVersionId: "L1", synopsisVersionId: "" });

const q = (id: string, status: QueryStatus, packageId: string, edition: number): Query =>
  ({ id, status, packageId, sentHow: "package", sentPackageId: packageId, sentPackageEdition: edition } as unknown as Query);

const queries: Query[] = [
  q("a", QueryStatus.PARTIAL_REQUESTED, "p1", 1), // ed 1 → L1, request
  q("b", QueryStatus.REJECTED, "p1", 2), //          ed 2 → L2, pass
  q("c", QueryStatus.WITHDRAWN, "p1", 2), //         withdrawn before an answer
  q("d", QueryStatus.QUERIED, "p1", 2), //           still out
  q("e", QueryStatus.NO_RESPONSE, "p2", 1), //       p2 → L1, no reply
  { id: "x", status: QueryStatus.QUERIED, sentHow: "individual" } as unknown as Query, // not credited anywhere
];
/* the first answer comes from Analytics' rows: a's first act was the partial request */
const rows = new Map<string, AnalyticsRow>([["a", { respondedStatus: QueryStatus.PARTIAL_REQUESTED, reachedRequest: true } as unknown as AnalyticsRow]]);

describe("split", () => {
  it("excludes still out and withdrawn from answered, and the rate is null with nothing answered", () => {
    const s = split({ sent: 3, requests: 0, passes: 0, out: 2, noReply: 0, withdrawnEarly: 1 });
    expect(s.answered).toBe(0);
    expect(s.rate).toBeNull();
    const t = split({ sent: 5, requests: 1, passes: 2, out: 1, noReply: 1, withdrawnEarly: 0 });
    expect(t.replies).toBe(3);
    expect(t.answered).toBe(4);
    expect(t.rate).toBeCloseTo(0.75);
  });
});

describe("packageSplit agrees with packageResults", () => {
  for (const ed of [undefined, 1, 2] as const) {
    it(`edition ${ed ?? "all"}`, () => {
      const r = packageResults("p1", ed ?? null, queries, rows);
      expect(packageSplit(P, queries, rows, ed)).toEqual(split(r));
    });
  }
});

describe("E1 · materialSplit is edition-true", () => {
  it("credits each letter only with its own edition's queries", () => {
    const l1 = materialSplit("L1", "letter", [P, Q2], queries, rows);
    const l2 = materialSplit("L2", "letter", [P, Q2], queries, rows);
    /* L1: query a (p1 ed 1) and e (p2) — counted from the fixture by hand */
    expect(l1.sent).toBe(2);
    expect(l1.requests).toBe(1);
    expect(l1.noReply).toBe(1);
    /* L2: b, c, d — p1's 2nd edition */
    expect(l2.sent).toBe(3);
    expect(l2.otherReplies).toBe(1);
    expect(l2.withdrawnEarly).toBe(1);
    expect(l2.out).toBe(1);
    expect(l2.answered).toBe(1);
    /* the sum over letters is every credited query, and nothing is double-counted */
    expect(l1.sent + l2.sent).toBe(overall([P, Q2], queries, rows).sent);
  });
  it("puts a credited edition with no version in the Not recorded bucket", () => {
    const nr = materialSplit(null, "version", [P, Q2], queries, rows);
    const v1 = materialSplit("V1", "version", [P, Q2], queries, rows);
    expect(nr.sent).toBe(2); // a (p1 ed 1) and e (p2)
    expect(v1.sent).toBe(3);
  });
  it("a synopsis slot left empty is no synopsis, never a material", () => {
    expect(materialSplit("S1", "synopsis", [P, Q2], queries, rows).sent).toBe(4);
  });
  it("reports a credited edition the package does not record, and falls back to the current contents", () => {
    const extra = [...queries, q("z", QueryStatus.QUERIED, "p1", 7)];
    expect(missingEditions([P, Q2], extra)).toBe(1);
    expect(materialSplit("L2", "letter", [P, Q2], extra, rows).sent).toBe(4);
  });
});

describe("overall", () => {
  it("is every query credited to one of the manuscript's packages", () => {
    const o = overall([P, Q2], queries, rows);
    expect(o).toEqual(tally([...creditedTo("p1", queries), ...creditedTo("p2", queries)], rows));
    expect(o.sent).toBe(5);
  });
});

const row = (name: string, s: Partial<Split>): RankRow => ({ name, s: { ...split({ sent: 0, requests: 0, passes: 0, out: 0, noReply: 0, withdrawnEarly: 0 }), ...s } as Split });
const fixRate = (r: RankRow): RankRow => ({ ...r, s: split({ sent: r.s.sent, requests: r.s.requests, passes: r.s.otherReplies, out: r.s.out, noReply: r.s.noReply, withdrawnEarly: 0 }) });

describe("ranked and sortRows", () => {
  const few = fixRate(row("Few", { sent: 9, requests: 9, otherReplies: 0, noReply: 0 })); // 9 answered → qualifies
  const tiny = fixRate(row("Tiny", { sent: 3, requests: 3, otherReplies: 0, noReply: 0 })); // 3 answered → not
  const mid = fixRate(row("Mid", { sent: 10, requests: 2, otherReplies: 4, noReply: 0 }));
  const big = fixRate(row("Big", { sent: 12, requests: 2, otherReplies: 1, noReply: 3 }));
  it("puts rows under 4 answered last, then requests, rate, sent, A–Z", () => {
    expect(ranked([tiny, big, mid, few]).map((r) => r.name)).toEqual(["Few", "Mid", "Big", "Tiny"]);
  });
  it("a heading sort keeps the under-4 rows last in either direction", () => {
    for (const dir of ["desc", "asc"] as const) {
      for (const key of ["requests", "rate", "sent", "name", "replies"] as const) {
        const out = sortRows([tiny, big, mid, few], key, dir).map((r) => r.name);
        expect(out[out.length - 1]).toBe("Tiny");
      }
    }
    expect(sortRows([tiny, big, mid, few], "rate", "desc").map((r) => r.name)).toEqual(["Few", "Mid", "Big", "Tiny"]);
  });
  it("a lead cell ignores rows under 4 answered, and names none when none qualify", () => {
    /* Mid and Big tie on 2 requests; the tie goes to more sent (Big, 12); Tiny's 3 would win and is ignored */
    expect(leadOf([tiny, mid, big], (s) => s.requests)?.name).toBe("Big");
    expect(leadOf([tiny], (s) => s.requests)).toBeNull();
  });
});

describe("splitLabel", () => {
  it("names all four counts", () => {
    expect(splitLabel(split({ sent: 4, requests: 1, passes: 1, out: 1, noReply: 1, withdrawnEarly: 0 }))).toBe("1 request, 1 other reply, 1 still waiting, 1 no reply");
  });
});
