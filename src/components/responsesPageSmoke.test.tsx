/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Responses v5 (`/queries/responses`). See `src/test/pageSmoke.tsx` for why these exist and why they
 * assert almost nothing: one distinctive string per state, enough to prove the page rendered rather than merely did
 * not crash.
 *
 * ⚠️ THE POPULATED STATE IS SMOKED TOO, as the house rule asks of a page that branches to a first-run panel: with no
 *    answer the page renders "Nothing back yet" and none of the populated derivations (the brackets, the showcase, the
 *    wall) would ever run.
 */
import { describe, it, expect, vi } from "vitest";
import { QueryStatus } from "../types";
import { renderPage, renderPageSeeded, renderPageSeededWith, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("./toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { ResponsesPage } from "./responses/ResponsesPage";

const page = () => <ResponsesPage onNavigate={noNavigate} routeActive />;
const base = { userId: "smoke-user", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "", sendMethod: "Email", materialsWanted: ["Query Letter"] };
const ANSWERED = [
  { ...base, id: "q-pass", status: QueryStatus.REJECTED, dateSent: "2026-06-01T00:00:00.000Z", rejectedDate: "2026-06-20T00:00:00.000Z",
    lastStatusChange: "2026-06-20T00:00:00.000Z", rejectionFeedbackType: "detailed", rejectionFeedbackText: "A lovely voice." },
  { ...base, id: "q-quiet", status: QueryStatus.NO_RESPONSE, dateSent: "2026-05-01T00:00:00.000Z", lastStatusChange: "2026-07-01T00:00:00.000Z" },
  { ...base, id: "q-part", status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-07-01T00:00:00.000Z", partialRequestedDate: "2026-07-20T00:00:00.000Z" },
  { ...base, id: "q-out", status: QueryStatus.QUERIED, dateSent: "2026-09-01T00:00:00.000Z" },
];

describe("/queries/responses renders", () => {
  it("renders without throwing on an empty account, on the Nothing back yet page", () => {
    const html = renderPage(page(), "/queries/responses");
    expect(html).toContain("While you wait");
  });

  it("renders the Nothing back yet page with a query out", () => {
    const html = renderPageSeeded(page(), "/queries/responses");
    expect(html).toContain("What this page will show you");
    expect(html).toContain("query out with an agent");
  });

  it("renders the populated page once an answer is on file, through every section's derivation", () => {
    const html = renderPageSeededWith(page(), "/queries/responses", { queries: ANSWERED });
    expect(html).toContain("At a glance");
    expect(html).toContain("Agents who want to read on");
    expect(html).toContain("What your answers tell you");
    expect(html).toContain("How long agents took");
    expect(html).toContain("Your wall of no");
    expect(html).not.toContain("While you wait");
  });
});
