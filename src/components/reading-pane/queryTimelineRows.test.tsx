/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * P2 — the Tracking timeline renders the nudge node. Tests the pure row-builder extracted from
 * QueryTimeline (buildTimelineRows): a nudge activity in the authoritative store produces a
 * "Nudged" row (no pixel/layout assertions — jsdom can't verify those; in-browser check is Nick's).
 */
import { describe, it, expect, vi } from "vitest";

// QueryTimeline's F12Shell import chain reaches src/lib/firebase.ts (live getAuth — explodes in
// tests). Mock the shell shallowly; the row-builder under test is pure and doesn't touch it.
vi.mock("../shell/F12Shell", () => ({ F12Menu: () => null }));

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTimelineRows, TimelineRows } from "./QueryTimeline";
import { NUDGE_NESTED_TYPE } from "../../lib/logNudge";
import { QueryStatus, type Query } from "../../types";

const q = (over: Record<string, any> = {}): Query =>
  ({ id: "q1", userId: "u1", manuscriptId: "m1", agentId: "a1", packageId: "", sendMethod: "Email", status: QueryStatus.QUERIED, dateSent: "2026-05-01T00:00:00.000Z", ...over }) as unknown as Query;

const queried = { id: "e1", type: QueryStatus.QUERIED, createdAt: "2026-05-01T00:00:00.000Z" };
const nudge = (id: string, iso: string) => ({ id, type: NUDGE_NESTED_TYPE, createdAt: iso, note: "Follow-up reminder set for 29 Jul 2026" });

describe("buildTimelineRows — the nudge node (P2)", () => {
  /**
   * ⚠️ §5a — THE TITLE NOW STATES THE OUTCOME, and the two cases are asserted together because the
   * whole point is that nothing stores which one applies: an incoming event after the nudge IS the
   * answer. "Nudged — no reply" while the log holds nothing after it; plain "Nudged" once it does.
   */
  it("a nudge activity renders as an outgoing row stating its outcome, chronologically after the send", () => {
    const rows = buildTimelineRows([queried, nudge("n1", "2026-06-20T00:00:00.000Z")], q(), null);
    const nrow = rows.find((r) => r.kind === "nudge");
    expect(nrow).toBeDefined();
    expect(nrow!.title).toBe("Nudged — no reply");
    const answered = buildTimelineRows(
      [queried, nudge("n1", "2026-06-20T00:00:00.000Z"), { id: "a1", type: QueryStatus.FULL_REQUESTED, createdAt: "2026-06-25T00:00:00.000Z" }],
      q(), null,
    );
    expect(answered.find((r) => r.kind === "nudge")!.title, "a nudge that was answered still claims no reply").toBe("Nudged");
    expect(nrow!.sub).toBe("via Email");
    expect(nrow!.status).toBe(QueryStatus.QUERIED); // the OUTGOING glyph, decorative
    expect(rows.indexOf(nrow!)).toBeGreaterThan(rows.findIndex((r) => r.status === QueryStatus.QUERIED && !r.kind));
  });

  it("repeat nudges each render — never deduped (distinct outgoing touches)", () => {
    const rows = buildTimelineRows(
      [queried, nudge("n1", "2026-06-01T00:00:00.000Z"), nudge("n2", "2026-07-01T00:00:00.000Z")],
      q(), null,
    );
    expect(rows.filter((r) => r.kind === "nudge")).toHaveLength(2);
  });

  it("TWS P5 — nudge rows carry their activityId so the ⋯ edit/delete menu offers (row alignment + delete gap)", () => {
    const rows = buildTimelineRows([queried, nudge("n1", "2026-06-20T00:00:00.000Z")], q(), null);
    expect(rows.find((r) => r.kind === "nudge")!.activityId).toBe("n1");
  });

  it("the status dedupe is untouched: duplicate status events still collapse, unknown types still drop", () => {
    const rows = buildTimelineRows(
      [queried, { id: "e2", type: QueryStatus.QUERIED, createdAt: "2026-05-03T00:00:00.000Z" }, { id: "x", type: "Mystery event", createdAt: "2026-05-04T00:00:00.000Z" }],
      q(), null,
    );
    expect(rows.filter((r) => r.status === QueryStatus.QUERIED && !r.kind)).toHaveLength(1);
    expect(rows).toHaveLength(1); // the unknown type never renders
  });
});

/**
 * ⚠️ ONE MATERIALS LIST PER SEND EVENT (overnight §1) — asserted against the RENDERED output,
 * because the fault was two components each behaving correctly on its own. `row.pills` is the older
 * plain list; the Query Centre passes a richer `sentExtra` carrying sent state and `+ Attach`, and
 * both drew, three lines apart.
 */
describe("§1 · materials render once", () => {
  /* ⚠️ MATERIALS ON THE FIXTURE, because the pills only exist when the query has some — a fixture
     without them makes every case below pass by rendering nothing. The guard beneath says so. */
  const rows = buildTimelineRows([queried], q({ materialsWanted: ["Query letter", "Synopsis"] }), null);

  it("the fixture has pills to duplicate — otherwise every case below is vacuous", () => {
    expect(rows.find((r) => r.status === QueryStatus.QUERIED)!.pills?.length ?? 0).toBeGreaterThan(0);
  });

  it("with a caller's list, the row's own pills do not render", () => {
    const html = renderToStaticMarkup(<TimelineRows rows={rows} sentExtra={<div className="caller-materials" />} />);
    expect(html, "the caller's list is missing").toContain("caller-materials");
    expect(html, "the send event drew two materials lists").not.toContain("tl-pills");
  });

  /* ⚠️ AND WITHOUT ONE THEY STILL DO — To-do's focus sheet has no `sentExtra`, so these pills are
     its ONLY materials list. This is the half that stops the duplicate being "fixed" by deletion. */
  it("with no caller's list, the row's pills are the materials", () => {
    const html = renderToStaticMarkup(<TimelineRows rows={rows} />);
    expect(html, "To-do's copy lost its materials").toContain("tl-pills");
  });
});
