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

import { buildTimelineRows } from "./QueryTimeline";
import { NUDGE_NESTED_TYPE } from "../../lib/logNudge";
import { QueryStatus, type Query } from "../../types";

const q = (over: Record<string, any> = {}): Query =>
  ({ id: "q1", userId: "u1", manuscriptId: "m1", agentId: "a1", packageId: "", sendMethod: "Email", status: QueryStatus.QUERIED, dateSent: "2026-05-01T00:00:00.000Z", ...over }) as unknown as Query;

const queried = { id: "e1", type: QueryStatus.QUERIED, createdAt: "2026-05-01T00:00:00.000Z" };
const nudge = (id: string, iso: string) => ({ id, type: NUDGE_NESTED_TYPE, createdAt: iso, note: "Follow-up reminder set for 29 Jul 2026" });

describe("buildTimelineRows — the nudge node (P2)", () => {
  it("a nudge activity renders as an outgoing 'Nudged' row, chronologically after the send", () => {
    const rows = buildTimelineRows([queried, nudge("n1", "2026-06-20T00:00:00.000Z")], q(), null);
    const nrow = rows.find((r) => r.kind === "nudge");
    expect(nrow).toBeDefined();
    expect(nrow!.title).toBe("Nudged");
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

  it("nudge rows carry NO activityId — the correction ⋯ never offers on them", () => {
    const rows = buildTimelineRows([queried, nudge("n1", "2026-06-20T00:00:00.000Z")], q(), null);
    expect(rows.find((r) => r.kind === "nudge")!.activityId).toBeUndefined();
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
