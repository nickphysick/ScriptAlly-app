/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drawer cut 2 · §2 — the send's materials render under the SEND rung, in one of three states.
 *
 * ⚠️ THE BRIEF'S FIXTURE ("a packaged send and a loose send" on one timeline) IS UNREPRESENTABLE:
 * D11 — a query holds a package OR its own list, never both, and `materialsWanted` is one list on
 * the QUERY, not per-send. The honest translation, asserted here: a packaged query renders ONE
 * strip and no loose row; a loose query renders ONE floating row and no strip; and the extra hangs
 * off the send rung only — never a request or the waiting rung.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SentMaterials } from "./SentMaterials";
import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";
import { QueryStatus } from "../../types";

const pkg = { id: "p1", packageName: "Standard UK package" } as never;
const packagedQuery = {
  packageId: "p1",
  dateSent: "2026-04-03",
  materialsWanted: [
    { material: "Query Letter", fromPackageId: "p1", fromPackageName: "Standard UK package" },
    { material: "Synopsis", fromPackageId: "p1", fromPackageName: "Standard UK package" },
  ],
} as never;
const looseQuery = { packageId: undefined, dateSent: "2026-04-03", materialsWanted: ["Query Letter", "Synopsis"] } as never;
const portion = { kind: "none" } as never;

const draw = (q: never, base: readonly unknown[]) =>
  renderToStaticMarkup(
    React.createElement(SentMaterials, { query: q, base: base as never, packages: [pkg], portion }),
  );

describe("§2 · one strip, one floating row, or the prompt — never two answers", () => {
  it("a packaged query renders the strip and no loose row", () => {
    const html = draw(packagedQuery, (packagedQuery as { materialsWanted: unknown[] }).materialsWanted);
    expect(html).toContain("qc-pstrip");
    expect(html, "a packaged send must not also draw the floating row").not.toMatch(/["\s]qc-loose["\s]/);
    expect(html).toContain("Standard UK package");
  });

  it("a loose query renders the floating row and no strip", () => {
    const html = draw(looseQuery, (looseQuery as { materialsWanted: unknown[] }).materialsWanted);
    expect(html).toMatch(/["\s]qc-loose["\s]/);
    expect(html, "a loose send must not draw a package strip").not.toContain("qc-pstrip");
  });

  it("nothing recorded renders the dashed prompt — a statement, no buttons", () => {
    const html = draw(looseQuery, []);
    expect(html).toContain("qpn-whatwent");
    expect(html).not.toContain("<button");
  });

  it("the chips are read-only — no popover, no ×, no ＋ Attach (decision 2)", () => {
    const html = draw(looseQuery, (looseQuery as { materialsWanted: unknown[] }).materialsWanted);
    expect(html).not.toContain("qc-mchip-add");
    expect(html).not.toContain("aria-haspopup");
  });
});

describe("§2 · the extra hangs off the send rung only", () => {
  const q = { id: "q1", status: QueryStatus.PARTIAL_REQUESTED, dateSent: "2026-04-03T12:00:00.000Z" } as never;
  const events = [
    { id: "a1", type: QueryStatus.QUERIED, createdAt: "2026-04-03T12:00:00.000Z" },
    { id: "a2", type: QueryStatus.PARTIAL_REQUESTED, createdAt: "2026-05-01T12:00:00.000Z" },
  ];
  it("one marker, after the send title and before the request title", () => {
    const rows = buildTimelineRows(events, q, null);
    const html = renderToStaticMarkup(
      React.createElement(TimelineRows, { rows, sentExtra: React.createElement("i", { className: "x-sent-extra" }) }),
    );
    const hits = html.split("x-sent-extra").length - 1;
    expect(hits, `the extra rendered ${hits} times`).toBe(1);
    expect(html.indexOf("x-sent-extra"), "the extra sits before the send title").toBeGreaterThan(html.indexOf("Query sent"));
    expect(html.indexOf("x-sent-extra"), "the extra leaked past the request rung").toBeLessThan(html.indexOf("Partial requested"));
  });
});
