/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FV2-E — Dashboard first visit v2, Part E: the example dashboard. "No Firestore write while it is open" and the way back
 * (the button and Escape) are FV2 E1, on the running page.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { ExampleDashboard } from "./ExampleDashboard";
import { EXAMPLE_BACK, EXAMPLE_BAR, exampleData } from "../../../lib/dashExample";
import { QueryStatus } from "../../../types";

const html = renderToStaticMarkup(<MemoryRouter initialEntries={["/dashboard"]}><ExampleDashboard onBack={() => {}} /></MemoryRouter>);

describe("FV2-E · the example dashboard", () => {
  it("says it is an example, with the way back", () => {
    expect(EXAMPLE_BAR).toBe("This is an example dashboard with made-up queries, so you can see where things go.");
    expect(EXAMPLE_BACK).toBe("Back to yours");
    expect(html).toContain(`>${EXAMPLE_BAR}<`);
    expect(html).toContain('data-fv2="example-back"');
  });
  it("is the real querying page, and every control in it is inert", () => {
    expect(html).toMatch(/data-fv2="example-body" inert=""/);
    expect(html.indexOf('data-fv2="example-back"')).toBeLessThan(html.indexOf('data-fv2="example-body"'));
    expect(html).toContain('data-fv2="querying"');
    expect(html).toContain('data-df1="queries"');
    expect(html).toContain('data-df1="goal"');
  });
  it("cannot open itself again, and strikes no stamp", () => {
    expect(html).not.toContain('data-fv2="example-link"');
    expect(readFileSync(resolve(__dirname, "../v58/Dash58.tsx"), "utf8")).toContain("!loading && !example && !rootRef.current?.closest");
  });
});

describe("FV2-E · the sample data", () => {
  const d = exampleData(new Date(2026, 9, 30, 12));
  it("is the reference's querying state, its own writer and nobody else's", () => {
    expect(d.manuscript.title).toBe("Murphy's Day Out");
    expect(d.user.id).toBe("example-writer");
    expect(new Set([...d.queries.map((q) => q.userId), ...d.agents.map((a) => a.userId), ...d.activities.map((a) => a.userId)])).toEqual(new Set(["example-writer"]));
    expect(d.queries.map((q) => q.status)).toContain(QueryStatus.OFFER);
    expect(d.queries.map((q) => q.status)).toContain(QueryStatus.FULL_REQUESTED);
  });
  it("is pure: the same moment gives the same data", () => {
    expect(JSON.stringify(exampleData(new Date(2026, 9, 30, 12)))).toBe(JSON.stringify(d));
  });
});
