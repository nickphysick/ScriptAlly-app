/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Respond-nudge run · §2 — the ghost IS the saved rung, and the derived line speaks the
 * derivation's own word.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";
import { deriveQueryFields } from "../../lib/queryDerivation";
import { OUTCOME_STATUS } from "../../lib/responseDraft";
import { QueryStatus } from "../../types";

const q = { id: "q1", status: QueryStatus.QUERIED, dateSent: "2026-08-12T12:00:00.000Z" } as never;
const sent = { id: "a1", type: QueryStatus.QUERIED, createdAt: "2026-08-12T12:00:00.000Z" };
const proposal = (over: Record<string, unknown> = {}) => ({
  id: "__ghost", type: QueryStatus.PARTIAL_REQUESTED, resultingStatus: QueryStatus.PARTIAL_REQUESTED,
  createdAt: "2026-09-05T12:00:00.000Z", materialsType: "pages", materialsQuantity: "50", ...over,
});

describe("§2 · the ghost rung IS the saved rung — one builder, one renderer", () => {
  it("the ghost's text equals the saved rung's text for the same inputs", () => {
    /* the seam: the ONLY difference between drafting and saved is the activity's id */
    const ghostRows = buildTimelineRows([sent, proposal()], q, null);
    const savedRows = buildTimelineRows([sent, proposal({ id: "act-real" })], q, null);
    const strip = (rows: ReturnType<typeof buildTimelineRows>) =>
      renderToStaticMarkup(React.createElement(TimelineRows, { rows }))
        .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(strip(ghostRows)).toBe(strip(savedRows));
  });

  it("the ghost wears the dashed skin and the saved rung the pulse — skin only, additive", () => {
    const rows = buildTimelineRows([sent, proposal()], q, null);
    const ghostHtml = renderToStaticMarkup(React.createElement(TimelineRows, { rows, ghostId: "__ghost" }));
    expect(ghostHtml).toMatch(/tl-ev--ghost/);
    const freshHtml = renderToStaticMarkup(React.createElement(TimelineRows, { rows, freshId: "__ghost" }));
    expect(freshHtml).toMatch(/tl-ev--fresh/);
    /* and neither class renders when the prop is absent — To-do's bare render untouched */
    const bare = renderToStaticMarkup(React.createElement(TimelineRows, { rows }));
    expect(bare).not.toMatch(/tl-ev--ghost|tl-ev--fresh/);
  });
});

describe("§2 · the derived line speaks the derivation's word", () => {
  it("the status word equals deriveQueryFields' result over the proposed events", () => {
    for (const [outcome, status] of Object.entries(OUTCOME_STATUS)) {
      if (outcome === "offer") continue; /* offer routes to the existing journey */
      const derived = deriveQueryFields([
        { type: QueryStatus.QUERIED, createdAt: "2026-08-12T12:00:00.000Z" },
        { type: status, resultingStatus: status, createdAt: "2026-09-05T12:00:00.000Z" },
      ] as never);
      expect(derived.status, `${outcome}'s line would state a word the recompute does not`).toBe(status);
    }
  });

  it("the page builds the line from OUTCOME_STATUS and getPrimaryAction — never a second table", () => {
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(page).toContain("const st = deskProposed.resultingStatus as QueryStatus;");
    expect(page).toContain("const holder = getPrimaryAction(st).ballHolder;");
    expect(page).toMatch(/Status becomes <b>\{st\}<\/b>/);
  });
});

describe("§2 · one activity per save, through the one primitive", () => {
  it("saveDeskResponse calls recordQueryResponse exactly once and overlays only what it collected", () => {
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const at = page.indexOf("const saveDeskResponse = async");
    expect(at).toBeGreaterThan(-1);
    const body = page.slice(at, page.indexOf("const [deskFreshStatus", at));
    expect((body.match(/recordQueryResponse\(/g) ?? []).length).toBe(1);
    expect(body).toContain("...responseDraftToPayload(deskResp)");
    expect(body, "the quantity does not reach the payload").toContain("materialsQuantity: parseQty(deskQty.amount)");
    expect(body, "the close reason does not reach the payload").toContain('deskCloseReason === "withdrew"');
    expect(body).toContain("undo: () => res.undo()");
  });

  it("offer routes OUT to the existing journey — the desk collects no terms", () => {
    const desk = readFileSync(join(process.cwd(), "src/components/queries/RespondDesk.tsx"), "utf8");
    expect(desk).toContain('k.key === "offer" ? onOffer()');
    const page = readFileSync(join(process.cwd(), "src/components/Queries.tsx"), "utf8");
    expect(page).toMatch(/onOffer=\{\(\) => \{ setDeskVerb\(null\); openRecord\(activeQuery\); \}\}/);
  });
});
