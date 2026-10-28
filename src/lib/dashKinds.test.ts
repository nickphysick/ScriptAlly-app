/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v118.1 Part D — "Your move" in burgundy from ONE map shared with the phone, the kind from the task's group,
 * and the send card's step chips in order with one dashed to-do.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { KIND_STYLE, kindOf, sendSteps } from "./dashTaskCard";
import { PHONE_KIND, phoneKindOf } from "./dashPhone";
import { TASK_KIND, kindForGroup } from "./taskKinds";
import type { StageSpan } from "./qcStages";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 5, 3, 12); // 3 Jun
const span = (status: QueryStatus, day: number, current = false): StageSpan => ({ status, startMs: T0 + day * DAY, endMs: null, current });

describe("one map for both surfaces", () => {
  it("'Your move' is burgundy on the desktop: band, accent, past segments, pager", () => {
    expect(KIND_STYLE.send).toMatchObject({ title: "Your move", band: "#6e3426", bandInk: "#ffffff", accent: "#6e3426", past: "rgba(110, 52, 38, 0.4)", pager: "rgba(255, 255, 255, 0.18)" });
  });
  it("the other kinds keep their colours", () => {
    expect([KIND_STYLE.nudge.band, KIND_STYLE.close.band, KIND_STYLE.other.band]).toEqual(["#2a3a52", "#e4dfd7", "#5f7591"]);
  });
  it("the desktop and the phone read the same map; the phone's 'your move' stays soft pink", () => {
    expect(KIND_STYLE.send.band).toBe(TASK_KIND.send.desktop.band);
    expect(PHONE_KIND.move).toEqual(TASK_KIND.send.phone);
    expect(PHONE_KIND.house).toEqual(TASK_KIND.other.phone);
    expect(PHONE_KIND.move.tint).toBe("#f5e2da");
  });
  it("the kind is the task's group on both surfaces: an offer is 'your move'", () => {
    for (const g of ["req", "nudge", "quiet", "house", "ready", "coming"] as const) {
      const k = kindForGroup(g);
      expect(kindOf({ group: g, taskType: null })).toBe(k);
      expect(phoneKindOf({ group: g })).toBe(({ send: "move", nudge: "nudge", close: "close", other: "house" } as const)[k]);
    }
    expect(kindOf({ group: "req", taskType: "offer_received" })).toBe("send");
    expect(kindOf({ group: "req", taskType: "offer_tell" })).toBe("send");
  });
});

const chips = (s: ReturnType<typeof sendSteps>) => s.map((x) => (x.done ? `${x.label} ${x.date}`.trim() : `[${x.label}]`)).join(" › ");

describe("the send card's step chips", () => {
  it("partial requested", () => {
    expect(chips(sendSteps([span(QueryStatus.QUERIED, 0), span(QueryStatus.PARTIAL_REQUESTED, 40, true)], "partial"))).toBe("Queried 3 Jun › Partial requested 13 Jul › [Partial sent]");
  });
  it("full requested — and a stale Full sent dated the same day as the request is never shown as done", () => {
    expect(chips(sendSteps([span(QueryStatus.QUERIED, 0), span(QueryStatus.FULL_SENT, 77), span(QueryStatus.FULL_REQUESTED, 77, true)], "full"))).toBe("Queried 3 Jun › Full requested 19 Aug › [Full sent]");
  });
  it("full requested after a partial was sent", () => {
    expect(chips(sendSteps([span(QueryStatus.QUERIED, 0), span(QueryStatus.PARTIAL_REQUESTED, 20), span(QueryStatus.PARTIAL_SENT, 30), span(QueryStatus.FULL_REQUESTED, 77, true)], "full"))).toBe("Queried 3 Jun › Partial requested 23 Jun › Partial sent 3 Jul › Full requested 19 Aug › [Full sent]");
  });
  it("a request with no dated history", () => {
    expect(chips(sendSteps([], "full"))).toBe("Full requested › [Full sent]");
  });
  it("never a stage both done and to do; never a done stage after the request", () => {
    const s = sendSteps([span(QueryStatus.QUERIED, 0), span(QueryStatus.FULL_REQUESTED, 50), span(QueryStatus.PARTIAL_SENT, 60, true)], "full");
    expect(s.filter((x) => !x.done).length).toBe(1);
    expect(s.filter((x) => x.done).map((x) => x.label)).not.toContain("Full sent");
    expect(chips(s)).toBe("Queried 3 Jun › Full requested 23 Jul › [Full sent]");
  });
});
