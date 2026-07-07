/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import {
  isRequest,
  isResponse,
  isInFlight,
  reachedFull,
  packageMetrics,
  packageFunnel,
  packageStages,
  avgReplyDays,
  componentMetrics,
  packagesUsingVersion,
  formatRate,
  barWidth,
  versionSnippet,
  versionMeta,
  meetsSampleThreshold,
  MIN_SENDS_FOR_CLAIM,
  materialsLinkWrites,
  editMaterialsUpdate,
  resolveActivePackage,
  overallAttachStats,
  rankPackagesByRequests,
  strongestPackage,
  bestVersionOfType,
  mostUsedVersionOfType,
} from "./packageMetrics";
import { Query, QueryStatus, SubmissionMethod, SubmissionPackage, ManuscriptVersion, ComponentType, QueryMaterial, Manuscript, ManuscriptStatus } from "../types";

const ms = (over: Partial<Manuscript>): Manuscript =>
  ({
    id: "m",
    userId: "u",
    title: "T",
    genre: "Fantasy",
    ageCategory: "Adult",
    wordCount: 90000,
    logline: "",
    comps: [],
    status: ManuscriptStatus.QUERYING,
    statusChangedDate: "2026-01-01",
    ...over,
  }) as Manuscript;

const q = (over: Partial<Query>): Query =>
  ({
    id: "q",
    userId: "u",
    manuscriptId: "m",
    agentId: "a",
    packageId: "",
    status: QueryStatus.QUERIED,
    dateSent: "2026-01-01",
    personalisationNotes: "",
    sendMethod: SubmissionMethod.EMAIL,
    ...over,
  }) as Query;

const pkg = (over: Partial<SubmissionPackage>): SubmissionPackage =>
  ({
    id: "p",
    manuscriptId: "m",
    userId: "u",
    packageName: "P",
    queryLetterVersionId: "",
    synopsisVersionId: "",
    samplePagesVersionId: "",
    status: "Active",
    createdDate: "2026-01-01",
    ...over,
  }) as SubmissionPackage;

const ver = (over: Partial<ManuscriptVersion>): ManuscriptVersion =>
  ({
    id: "v",
    manuscriptId: "m",
    userId: "u",
    componentType: ComponentType.QUERY_LETTER,
    versionName: "V",
    fileAttached: false,
    createdDate: "2026-01-01",
    ...over,
  }) as ManuscriptVersion;

describe("isRequest", () => {
  it("is false for a plain Queried", () => {
    expect(isRequest(q({ status: QueryStatus.QUERIED }))).toBe(false);
  });
  it("is true for request-or-beyond statuses", () => {
    for (const s of [
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.PARTIAL_SENT,
      QueryStatus.FULL_REQUESTED,
      QueryStatus.FULL_SENT,
      QueryStatus.REVISE_RESUBMIT,
      QueryStatus.OFFER,
    ]) {
      expect(isRequest(q({ status: s }))).toBe(true);
    }
  });
  it("counts a query that reached a request even after a later rejection (via the request date)", () => {
    expect(isRequest(q({ status: QueryStatus.REJECTED, partialRequestedDate: "2026-02-01" }))).toBe(true);
    expect(isRequest(q({ status: QueryStatus.REJECTED }))).toBe(false);
  });
});

describe("isResponse", () => {
  it("reflects the derived hasAgentResponded flag", () => {
    expect(isResponse(q({ hasAgentResponded: true }))).toBe(true);
    expect(isResponse(q({ hasAgentResponded: false }))).toBe(false);
    expect(isResponse(q({}))).toBe(false);
  });
});

describe("requests are always a subset of responses (local widening)", () => {
  it("counts Partial Sent / Full Sent as BOTH a request and a response, even with no hasAgentResponded flag", () => {
    for (const s of [QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      const query = q({ status: s }); // hasAgentResponded undefined
      expect(isRequest(query)).toBe(true);
      expect(isResponse(query)).toBe(true);
    }
  });
  it("never lets requests exceed responses in aggregate", () => {
    const queries = [
      q({ packageId: "P1", status: QueryStatus.PARTIAL_SENT }), // request + response (no flag set)
      q({ packageId: "P1", status: QueryStatus.FULL_SENT }), // request + response (no flag set)
      q({ packageId: "P1", status: QueryStatus.REJECTED, hasAgentResponded: true }), // response only
      q({ packageId: "P1", status: QueryStatus.QUERIED }), // neither
    ];
    const m = packageMetrics("P1", queries);
    expect(m.requests).toBe(2);
    expect(m.responses).toBe(3);
    expect(m.requests).toBeLessThanOrEqual(m.responses);
  });
});

describe("packageMetrics", () => {
  it("derives sent / requests / responses / rates (Comp-heavy: 4 sent, 2 requests, 3 responses)", () => {
    const queries = [
      q({ packageId: "P1", status: QueryStatus.FULL_REQUESTED, hasAgentResponded: true }),
      q({ packageId: "P1", status: QueryStatus.PARTIAL_REQUESTED, hasAgentResponded: true }),
      q({ packageId: "P1", status: QueryStatus.REJECTED, hasAgentResponded: true }),
      q({ packageId: "P1", status: QueryStatus.QUERIED }),
      q({ packageId: "OTHER", status: QueryStatus.OFFER, hasAgentResponded: true }), // different package
    ];
    const m = packageMetrics("P1", queries);
    expect(m).toEqual({ sent: 4, requests: 2, responses: 3, requestRate: 0.5, responseRate: 0.75 });
  });
  it("guards against divide-by-zero (no queries → null rates)", () => {
    const m = packageMetrics("EMPTY", [q({ packageId: "P1" })]);
    expect(m).toEqual({ sent: 0, requests: 0, responses: 0, requestRate: null, responseRate: null });
  });
});

describe("isInFlight (awaiting the agent's first move)", () => {
  it("is true only for a plain Queried with no outcome yet", () => {
    expect(isInFlight(q({ status: QueryStatus.QUERIED }))).toBe(true);
  });
  it("is false once any outcome lands (request, response, rejection, withdrawal, no-response)", () => {
    expect(isInFlight(q({ status: QueryStatus.PARTIAL_REQUESTED }))).toBe(false);
    expect(isInFlight(q({ status: QueryStatus.PARTIAL_SENT }))).toBe(false); // already a request → resolved
    expect(isInFlight(q({ status: QueryStatus.REJECTED }))).toBe(false);
    expect(isInFlight(q({ status: QueryStatus.WITHDRAWN }))).toBe(false);
    expect(isInFlight(q({ status: QueryStatus.NO_RESPONSE }))).toBe(false);
    expect(isInFlight(q({ status: QueryStatus.QUERIED, hasAgentResponded: true }))).toBe(false);
  });
});

describe("packageFunnel (resolved-only rates; in-flight excluded)", () => {
  it("splits in-flight out and divides the resolved rates by resolved, not by every send", () => {
    const queries = [
      q({ packageId: "P1", status: QueryStatus.FULL_REQUESTED, hasAgentResponded: true }), // request + response
      q({ packageId: "P1", status: QueryStatus.REJECTED, hasAgentResponded: true }), // response, no request
      q({ packageId: "P1", status: QueryStatus.QUERIED }), // in flight
      q({ packageId: "P1", status: QueryStatus.QUERIED }), // in flight
      q({ packageId: "OTHER", status: QueryStatus.OFFER, hasAgentResponded: true }),
    ];
    const f = packageFunnel("P1", queries);
    expect(f.sent).toBe(4);
    expect(f.inFlight).toBe(2);
    expect(f.resolved).toBe(2);
    expect(f.requests).toBe(1);
    expect(f.responses).toBe(2);
    // sent-denominator (legacy) request rate would be 1/4 = 25%; resolved is 1/2 = 50%
    expect(f.requestRate).toBe(0.25);
    expect(f.requestRateResolved).toBe(0.5);
    expect(f.responseRateResolved).toBe(1);
  });
  it("guards divide-by-zero: all sends in flight → resolved 0 → null resolved rates (never NaN)", () => {
    const f = packageFunnel("P1", [q({ packageId: "P1", status: QueryStatus.QUERIED }), q({ packageId: "P1", status: QueryStatus.QUERIED })]);
    expect(f).toMatchObject({ sent: 2, inFlight: 2, resolved: 0, requestRateResolved: null, responseRateResolved: null });
  });
});

describe("packageStages (cumulative funnel, monotonic, resolved-only)", () => {
  it("counts each stage as reached-at-least and never widens", () => {
    const queries = [
      q({ packageId: "P1", status: QueryStatus.OFFER, hasAgentResponded: true }), // reaches every stage
      q({ packageId: "P1", status: QueryStatus.FULL_REQUESTED, hasAgentResponded: true }), // ≤ full
      q({ packageId: "P1", status: QueryStatus.PARTIAL_REQUESTED, hasAgentResponded: true }), // ≤ partial
      q({ packageId: "P1", status: QueryStatus.REJECTED, hasAgentResponded: true }), // responded only
      q({ packageId: "P1", status: QueryStatus.NO_RESPONSE }), // resolved, no reply
      q({ packageId: "P1", status: QueryStatus.QUERIED }), // in flight — excluded
    ];
    const s = packageStages("P1", queries);
    expect(s).toEqual({ queried: 5, responded: 4, partial: 3, full: 2, offer: 1 });
    // monotonic non-increasing
    expect(s.queried >= s.responded && s.responded >= s.partial && s.partial >= s.full && s.full >= s.offer).toBe(true);
  });
  it("reachedFull is true for full-or-beyond status or a recorded full-request date", () => {
    expect(reachedFull(q({ status: QueryStatus.FULL_SENT }))).toBe(true);
    expect(reachedFull(q({ status: QueryStatus.PARTIAL_REQUESTED }))).toBe(false);
    expect(reachedFull(q({ status: QueryStatus.REJECTED, fullRequestedDate: "2026-03-01" }))).toBe(true);
  });
});

describe("avgReplyDays (send → first agent move, responded only)", () => {
  it("averages whole-days to the earliest of partial/full request or rejection", () => {
    const queries = [
      q({ packageId: "P1", status: QueryStatus.PARTIAL_REQUESTED, hasAgentResponded: true, dateSent: "2026-01-01", partialRequestedDate: "2026-01-11" }), // 10d
      q({ packageId: "P1", status: QueryStatus.REJECTED, hasAgentResponded: true, dateSent: "2026-01-01", rejectedDate: "2026-01-21" }), // 20d
      q({ packageId: "P1", status: QueryStatus.QUERIED, dateSent: "2026-01-01" }), // no reply → ignored
    ];
    expect(avgReplyDays("P1", queries)).toBe(15);
  });
  it("returns null when nothing qualifies", () => {
    expect(avgReplyDays("P1", [q({ packageId: "P1", status: QueryStatus.QUERIED, dateSent: "2026-01-01" })])).toBeNull();
  });
});

describe("componentMetrics", () => {
  it("aggregates across every package that uses the version", () => {
    const packages = [
      pkg({ id: "P1", queryLetterVersionId: "QL" }),
      pkg({ id: "P2", queryLetterVersionId: "QL" }),
      pkg({ id: "P3", queryLetterVersionId: "OTHER" }),
    ];
    const queries = [
      q({ packageId: "P1", status: QueryStatus.FULL_REQUESTED, hasAgentResponded: true }),
      q({ packageId: "P2", status: QueryStatus.QUERIED }),
      q({ packageId: "P3", status: QueryStatus.OFFER, hasAgentResponded: true }), // not using QL
    ];
    const m = componentMetrics("QL", packages, queries);
    expect(m.sent).toBe(2);
    expect(m.requests).toBe(1);
    expect(m.requestRate).toBe(0.5);
  });
});

describe("packagesUsingVersion", () => {
  it("matches a version in any of the three slots", () => {
    const packages = [
      pkg({ id: "a", queryLetterVersionId: "V" }),
      pkg({ id: "b", synopsisVersionId: "V" }),
      pkg({ id: "c", samplePagesVersionId: "V" }),
      pkg({ id: "d" }),
    ];
    expect(packagesUsingVersion("V", packages).map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

describe("materialsLinkWrites (guard #1 — exactly one source of truth)", () => {
  it("package attached → writes packageId and clears materialsWanted", () => {
    expect(materialsLinkWrites({ packageId: "pkg-1", materials: ["Query Letter", { material: "Sample Pages", type: "pages", quantity: 10 }] }))
      .toEqual({ packageId: "pkg-1", materialsWanted: [] });
  });
  it("clears even an agent-seeded materials list when a package is attached (never persisted)", () => {
    expect(materialsLinkWrites({ packageId: "pkg-1", materials: ["Query Letter", "Synopsis", "First 10 pages"] }))
      .toEqual({ packageId: "pkg-1", materialsWanted: [] });
  });
  it("free text (no package) → writes materialsWanted and clears packageId", () => {
    const mats: (string | QueryMaterial)[] = ["Query Letter", { material: "Sample Pages", type: "pages", quantity: 10 }];
    expect(materialsLinkWrites({ packageId: "", materials: mats })).toEqual({ packageId: "", materialsWanted: mats });
  });
  it("detach (packageId cleared) → writes the free-text materials, packageId empty", () => {
    expect(materialsLinkWrites({ packageId: "", materials: ["Query Letter"] })).toEqual({ packageId: "", materialsWanted: ["Query Letter"] });
  });
});

describe("editMaterialsUpdate (edit-save omit-when-untouched gating)", () => {
  it("touched + package → { packageId, materialsWanted: [] }", () => {
    expect(editMaterialsUpdate({ touched: true, packageId: "pkg-1", materials: ["Query Letter", "Synopsis"] }))
      .toEqual({ packageId: "pkg-1", materialsWanted: [] });
  });
  it("touched + free → { packageId: \"\", materialsWanted }", () => {
    expect(editMaterialsUpdate({ touched: true, packageId: "", materials: ["Query Letter"] }))
      .toEqual({ packageId: "", materialsWanted: ["Query Letter"] });
  });
  it("untouched → {} — both keys OMITTED (status-only edit of a packaged query keeps its packageId; touch-nothing keeps both)", () => {
    const r = editMaterialsUpdate({ touched: false, packageId: "pkg-1", materials: ["Query Letter"] });
    expect(r).toEqual({});
    expect("packageId" in r).toBe(false);
    expect("materialsWanted" in r).toBe(false);
  });
});

describe("resolveActivePackage (user-chosen default, graceful)", () => {
  const active = pkg({ id: "p-active", manuscriptId: "m", status: "Active" });
  const retired = pkg({ id: "p-retired", manuscriptId: "m", status: "Retired" });
  const otherMs = pkg({ id: "p-other", manuscriptId: "m2", status: "Active" });

  it("returns null when no active package is set", () => {
    expect(resolveActivePackage(ms({}), [active])).toBeNull();
  });
  it("returns null for a null/undefined manuscript", () => {
    expect(resolveActivePackage(null, [active])).toBeNull();
    expect(resolveActivePackage(undefined, [active])).toBeNull();
  });
  it("resolves a valid active package on the same manuscript", () => {
    expect(resolveActivePackage(ms({ activePackageId: "p-active" }), [active, retired])).toBe(active);
  });
  it("returns null when the active package is retired", () => {
    expect(resolveActivePackage(ms({ activePackageId: "p-retired" }), [active, retired])).toBeNull();
  });
  it("returns null when the active package id is missing from the list", () => {
    expect(resolveActivePackage(ms({ activePackageId: "p-gone" }), [active])).toBeNull();
  });
  it("returns null when the active package belongs to a different manuscript", () => {
    expect(resolveActivePackage(ms({ id: "m", activePackageId: "p-other" }), [otherMs])).toBeNull();
  });
});

describe("meetsSampleThreshold", () => {
  it("requires at least MIN_SENDS_FOR_CLAIM sends before a claim is allowed", () => {
    expect(meetsSampleThreshold(MIN_SENDS_FOR_CLAIM)).toBe(true);
    expect(meetsSampleThreshold(MIN_SENDS_FOR_CLAIM + 5)).toBe(true);
    expect(meetsSampleThreshold(MIN_SENDS_FOR_CLAIM - 1)).toBe(false);
    expect(meetsSampleThreshold(1)).toBe(false);
    expect(meetsSampleThreshold(0)).toBe(false);
  });
});

describe("formatRate / barWidth", () => {
  it("renders — for null and whole percents otherwise", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(0.5)).toBe("50%");
    expect(formatRate(0.166)).toBe("17%");
  });
  it("keeps a visible sliver for 0% and null, real width otherwise", () => {
    expect(barWidth(null)).toBe("0%");
    expect(barWidth(0)).toBe("2%");
    expect(barWidth(0.75)).toBe("75%");
  });
});

describe("versionSnippet / versionMeta (derived, never stored)", () => {
  it("takes the first line of the draft, truncating past ~120 chars", () => {
    expect(versionSnippet(ver({ contentDraft: "For readers of Clarke and Morgenstern…\nrest" }))).toBe(
      "For readers of Clarke and Morgenstern…",
    );
    const long = "x".repeat(200);
    expect(versionSnippet(ver({ contentDraft: long }))!.endsWith("…")).toBe(true);
    expect(versionSnippet(ver({ contentDraft: "" }))).toBeNull();
    expect(versionSnippet(ver({}))).toBeNull();
  });
  it("derives a word count, else falls back to the file name, else null", () => {
    expect(versionMeta(ver({ contentDraft: "one two three" }))).toBe("~3 words");
    expect(versionMeta(ver({ contentDraft: "solo" }))).toBe("~1 word");
    expect(versionMeta(ver({ fileAttached: true, fileName: "draft.docx" }))).toBe("draft.docx");
    expect(versionMeta(ver({}))).toBeNull();
  });
});

// A package with N sends, of which R reached a request — the leaderboard's raw material.
const sends = (packageId: string, n: number, r: number): Query[] =>
  Array.from({ length: n }, (_, i) =>
    q({ id: `${packageId}-${i}`, packageId, status: i < r ? QueryStatus.FULL_REQUESTED : QueryStatus.REJECTED, hasAgentResponded: true }),
  );

describe("overallAttachStats (See what wins — page headline over all attached queries)", () => {
  it("aggregates every query attached to any of the packages; ignores unattached/other", () => {
    const packages = [pkg({ id: "A" }), pkg({ id: "B" })];
    const queries = [
      ...sends("A", 4, 2), // 4 sent, 2 requests
      ...sends("B", 2, 1), // 2 sent, 1 request
      q({ id: "loose", packageId: "" }), // unattached — excluded
      q({ id: "other", packageId: "Z" }), // different package — excluded
    ];
    const s = overallAttachStats(packages, queries);
    expect(s.sent).toBe(6);
    expect(s.requests).toBe(3);
    expect(s.requestRate).toBe(0.5);
  });
});

describe("rankPackagesByRequests (leaderboard order + ranked flag)", () => {
  it("orders by request rate desc; below-threshold packages carry ranked:false; no-send sinks last", () => {
    const packages = [pkg({ id: "low" }), pkg({ id: "high" }), pkg({ id: "empty" })];
    const queries = [
      ...sends("low", 4, 1), // 25%, ranked
      ...sends("high", 4, 3), // 75%, ranked
      ...sends("empty", 0, 0), // no sends
    ];
    const ranked = rankPackagesByRequests(packages, queries);
    expect(ranked.map((r) => r.pkg.id)).toEqual(["high", "low", "empty"]);
    expect(ranked[0].ranked).toBe(true);
    expect(ranked[2].stat.requestRate).toBeNull();
    expect(ranked[2].ranked).toBe(false);
  });
  it("a lucky 1-of-1 (100%) is NOT ranked — below the sample threshold", () => {
    const packages = [pkg({ id: "lucky" })];
    const ranked = rankPackagesByRequests(packages, sends("lucky", 1, 1));
    expect(ranked[0].stat.requestRate).toBe(1);
    expect(ranked[0].ranked).toBe(false);
  });
});

describe("strongestPackage (crowns only a threshold-meeting leader)", () => {
  it("returns the top ranked package by request rate", () => {
    const packages = [pkg({ id: "a" }), pkg({ id: "b" })];
    const queries = [...sends("a", 4, 1), ...sends("b", 5, 4)];
    expect(strongestPackage(packages, queries)!.pkg.id).toBe("b");
  });
  it("returns null when no package meets the sample threshold (no false crown on thin data)", () => {
    const packages = [pkg({ id: "a" }), pkg({ id: "b" })];
    const queries = [...sends("a", 3, 3), ...sends("b", 2, 2)]; // both 100% but < MIN_SENDS_FOR_CLAIM
    expect(strongestPackage(packages, queries)).toBeNull();
    expect(MIN_SENDS_FOR_CLAIM).toBe(4);
  });
});

describe("bestVersionOfType (best material of a type by request rate, threshold-gated)", () => {
  const versions = [
    ver({ id: "QL1", componentType: ComponentType.QUERY_LETTER }),
    ver({ id: "QL2", componentType: ComponentType.QUERY_LETTER }),
    ver({ id: "SY1", componentType: ComponentType.SYNOPSIS }),
  ];
  const packages = [
    pkg({ id: "p1", queryLetterVersionId: "QL1", synopsisVersionId: "SY1" }),
    pkg({ id: "p2", queryLetterVersionId: "QL2" }),
  ];
  it("picks the higher-rate version once both clear the threshold", () => {
    const queries = [...sends("p1", 4, 3), ...sends("p2", 4, 1)]; // QL1 75% vs QL2 25%
    expect(bestVersionOfType(ComponentType.QUERY_LETTER, versions, packages, queries)!.version.id).toBe("QL1");
  });
  it("returns null for a type whose versions are all below threshold", () => {
    const queries = [...sends("p1", 2, 2), ...sends("p2", 1, 1)];
    expect(bestVersionOfType(ComponentType.QUERY_LETTER, versions, packages, queries)).toBeNull();
    expect(bestVersionOfType(ComponentType.SAMPLE_PAGES, versions, packages, queries)).toBeNull();
  });
});

describe("mostUsedVersionOfType (the de-facto default material — derived from package membership)", () => {
  const versions = [
    ver({ id: "QL1", componentType: ComponentType.QUERY_LETTER }),
    ver({ id: "QL2", componentType: ComponentType.QUERY_LETTER }),
  ];
  it("returns the version used in the most packages", () => {
    const packages = [
      pkg({ id: "p1", queryLetterVersionId: "QL1" }),
      pkg({ id: "p2", queryLetterVersionId: "QL1" }),
      pkg({ id: "p3", queryLetterVersionId: "QL2" }),
    ];
    expect(mostUsedVersionOfType(ComponentType.QUERY_LETTER, versions, packages)!.id).toBe("QL1");
  });
  it("returns null on a usage tie (no single default to star) and when unused", () => {
    const tie = [pkg({ id: "p1", queryLetterVersionId: "QL1" }), pkg({ id: "p2", queryLetterVersionId: "QL2" })];
    expect(mostUsedVersionOfType(ComponentType.QUERY_LETTER, versions, tie)).toBeNull();
    expect(mostUsedVersionOfType(ComponentType.SYNOPSIS, versions, tie)).toBeNull();
  });
});
