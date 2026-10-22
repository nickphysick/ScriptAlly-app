/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import type { Manuscript, Query, SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import {
  activeVersionId, bannerLead, cardOrder, headerTitle, leader, leagueLead, leagueSort, numbered, packageForVersion,
  statusGroups, unversionedLive, versionStats,
} from "./versionsPage";
import { versionsUnlocked, VERSIONS_FOUNDING_ACCESS } from "./entitlements";
import { UserPlan } from "../types";

const ms = (bv: unknown[], extra: Partial<Manuscript> = {}) => ({ id: "m1", bookVersions: bv, ...extra }) as unknown as Manuscript;
const V = (id: string, n: number) => ({ id, name: `V${n}`, kind: n === 1 ? "initial" : "revision", createdDate: `2026-0${n}-01` });
const pkg = (id: string, bv?: string, extra: Partial<SubmissionPackage> = {}) =>
  ({ id, manuscriptId: "m1", packageName: id, status: "Active", createdDate: "2026-01-01", queryLetterVersionId: "", synopsisVersionId: "", samplePagesVersionId: "", ...(bv ? { bookVersionId: bv } : {}), ...extra }) as unknown as SubmissionPackage;
const q = (id: string, status: QueryStatus, packageId: string) => ({ id, manuscriptId: "m1", agentId: "a", packageId, status, dateSent: "2026-01-01" }) as unknown as Query;
const row = (r: Partial<AnalyticsRow>): AnalyticsRow => ({ respondedStatus: null, reachedRequest: false, reachedOffer: false, replyDays: null, sentMs: null, ...r }) as AnalyticsRow;

describe("the gate", () => {
  it("Pro, or anyone while founding access is on", () => {
    expect(VERSIONS_FOUNDING_ACCESS).toBe(true);
    expect(versionsUnlocked({ plan: UserPlan.FREE })).toBe(true);
    expect(versionsUnlocked({ plan: UserPlan.FREE }, false)).toBe(false);
    expect(versionsUnlocked({ plan: UserPlan.PRO }, false)).toBe(true);
  });
});

describe("numbering, the active version and Change", () => {
  const m = ms([V("a", 1), V("b", 2), V("c", 3)], { activePackageId: "p2" });
  it("newest first, numbered from the oldest, each from the one before", () => {
    const n = numbered(m);
    expect(n.map((x) => [x.v.id, x.n, x.parent?.id ?? null])).toEqual([["c", 3, "b"], ["b", 2, "a"], ["a", 1, null]]);
  });
  it("the active version is the active package's version; a retired package gives none", () => {
    expect(activeVersionId(m, [pkg("p2", "b")])).toBe("b");
    expect(activeVersionId(m, [pkg("p2", "b", { status: "Retired" } as Partial<SubmissionPackage>)])).toBe(null);
    expect(activeVersionId(ms([]), [pkg("p2", "b")])).toBe(null);
  });
  it("Change finds the newest live package stating the version, or none", () => {
    const ps = [pkg("old", "b", { createdDate: "2026-01-01" } as Partial<SubmissionPackage>), pkg("new", "b", { createdDate: "2026-05-01" } as Partial<SubmissionPackage>), pkg("r", "c", { status: "Retired" } as Partial<SubmissionPackage>)];
    expect(packageForVersion(m, "b", ps)?.id).toBe("new");
    expect(packageForVersion(m, "c", ps)).toBe(null);
  });
});

describe("per version, the banner and the league", () => {
  const m = ms([V("a", 1), V("b", 2)]);
  const ps = [pkg("pa", "a"), pkg("pb", "b"), pkg("pn")];
  const qs = [
    q("1", QueryStatus.PARTIAL_REQUESTED, "pa"), q("2", QueryStatus.REJECTED, "pa"), q("3", QueryStatus.NO_RESPONSE, "pa"), q("4", QueryStatus.REJECTED, "pa"), q("5", QueryStatus.QUERIED, "pa"),
    q("6", QueryStatus.QUERIED, "pb"),
    q("7", QueryStatus.QUERIED, "pn"), q("8", QueryStatus.QUERIED, ""), q("9", QueryStatus.REJECTED, ""),
  ];
  const rows = new Map(qs.map((x) => [x.id, row({ respondedStatus: x.status === QueryStatus.PARTIAL_REQUESTED ? QueryStatus.PARTIAL_REQUESTED : x.status === QueryStatus.REJECTED ? QueryStatus.REJECTED : x.status === QueryStatus.NO_RESPONSE ? QueryStatus.NO_RESPONSE : null, replyDays: x.id === "1" ? 10 : x.id === "2" ? 20 : null })]));
  const st = versionStats(numbered(m), ps, qs, rows);
  const a = st.find((s) => s.nv.v.id === "a")!;
  it("a query reaches a version only through its package's edition; none is folded in", () => {
    expect(a.split.sent).toBe(5);
    expect(st.find((s) => s.nv.v.id === "b")!.split.sent).toBe(1);
    expect(unversionedLive(qs, ps).map((x) => x.id)).toEqual(["7", "8"]);
  });
  it("asked for more is requests ÷ sent; rate is replies ÷ answered; the average reply is over dated replies", () => {
    expect(a.split.requests).toBe(1);
    expect(a.askedPct).toBe(20);
    expect(a.split.replies).toBe(3);
    expect(a.split.answered).toBe(4);
    expect(a.split.rate).toBeCloseTo(0.75);
    expect(a.avgReply).toBe(15);
    expect(a.replyN).toBe(2);
  });
  it("the glyph groups sum to Sent, in pipeline order with the closed set folded", () => {
    expect(a.groups.reduce((n, g) => n + g.n, 0)).toBe(a.split.sent);
    expect(a.groups.map((g) => g.title)).toEqual(["Queried", "Partial requested", "Closed: 2 passed, 1 no reply"]);
    expect(statusGroups([])).toEqual([]);
  });
  it("a leader needs 4 answered and no tie", () => {
    expect(leader(st)?.nv.v.id).toBe("a");
    expect(leader([st[0]].filter((s) => s.nv.v.id === "b"))).toBe(null);
  });
  it("cards rank by requests with unsent last; the league keeps thin rows last on every key", () => {
    expect(cardOrder(st).map((s) => s.nv.v.id)).toEqual(["a", "b"]);
    for (const k of ["sent", "replies", "rate", "requests", "avg"] as const) expect(leagueSort(st, k).map((s) => s.nv.v.id)).toEqual(["a", "b"]);
  });
  it("the lead's requests and sent are the sums of the rows", () => {
    const l = leagueLead(st);
    expect(l.requests).toBe(st.reduce((n, s) => n + s.split.requests, 0));
    expect(l.sent).toBe(st.reduce((n, s) => n + s.split.sent, 0));
  });
});

describe("copy", () => {
  it("the header and the banner count their nouns", () => {
    expect(headerTitle(0)).toBe("No versions yet");
    expect(headerTitle(1)).toBe("1 version on file");
    expect(headerTitle(3)).toBe("3 versions on file");
    expect(bannerLead(1)).toBe("1 query is");
    expect(bannerLead(2)).toBe("2 queries are");
  });
});
