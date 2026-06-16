/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import {
  isRequest,
  isResponse,
  packageMetrics,
  componentMetrics,
  packagesUsingVersion,
  formatRate,
  barWidth,
  versionSnippet,
  versionMeta,
} from "./packageMetrics";
import { Query, QueryStatus, SubmissionMethod, SubmissionPackage, ManuscriptVersion, ComponentType } from "../types";

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
