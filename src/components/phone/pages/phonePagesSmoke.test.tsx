/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the phone's menu pages (Phone app v2, Part 7): Responses, Manuscript, Analytics and the new
 * `/goals` route. One distinctive string per state, enough to prove each page rendered. The populated state is smoked
 * too, or none of the derivations behind the figures would run.
 */
import { describe, it, expect, vi } from "vitest";
import { QueryStatus } from "../../../types";
import { renderPage, renderPageSeededWith } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { ResponsesPhone } from "./ResponsesPhone";
import { ManuscriptPhone } from "./ManuscriptPhone";
import { AnalyticsPhone } from "./AnalyticsPhone";
import { GoalsPhone } from "./GoalsPhone";

const base = { userId: "smoke-user", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "", sendMethod: "Email", materialsWanted: ["Query Letter"] };
const QUERIES = [
  { ...base, id: "q-pass", status: QueryStatus.REJECTED, dateSent: "2026-06-01T00:00:00.000Z", rejectedDate: "2026-06-20T00:00:00.000Z", lastStatusChange: "2026-06-20T00:00:00.000Z" },
  { ...base, id: "q-part", status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-07-01T00:00:00.000Z", partialRequestedDate: "2026-07-20T00:00:00.000Z" },
  { ...base, id: "q-out", status: QueryStatus.QUERIED, dateSent: "2026-09-01T00:00:00.000Z" },
];

describe("the phone's menu pages render", () => {
  it("Responses: empty, then with answers on file", () => {
    expect(renderPage(<ResponsesPhone />, "/queries/responses")).toContain("Wall of no");
    const html = renderPageSeededWith(<ResponsesPhone />, "/queries/responses", { queries: QUERIES });
    expect(html).toContain("on the wall");
    expect(html).toContain("Now: ");
  });
  it("Manuscript: no book yet, then the book's page", () => {
    expect(renderPage(<ManuscriptPhone />, "/manuscripts")).toContain("No manuscript yet");
    const html = renderPageSeededWith(<ManuscriptPhone />, "/manuscripts", { queries: QUERIES });
    expect(html).toContain("Comparable titles");
    expect(html).toContain("Synopses and samples");
  });
  it("Analytics: the stage track and the note, empty and populated", () => {
    expect(renderPage(<AnalyticsPhone />, "/queries/analytics")).toContain("Reading the numbers");
    const html = renderPageSeededWith(<AnalyticsPhone />, "/queries/analytics", { queries: QUERIES });
    expect(html).toContain("Where your queries got to");
    expect(html).toContain("got a request to read more");
  });
  it("/goals: the goal, the streak, the milestones and the ranks", () => {
    expect(renderPage(<GoalsPhone />, "/goals")).toContain("Milestones");
    const html = renderPageSeededWith(<GoalsPhone />, "/goals", { queries: QUERIES });
    expect(html).toContain("First request");
    expect(html).toContain("Founding writer ranks");
  });
});
