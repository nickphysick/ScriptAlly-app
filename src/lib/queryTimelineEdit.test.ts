/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { validateTimeline, appendNoteFor, ADVANCE_OPTIONS, RECLASSIFY_OPTIONS, TERMINAL_STATUSES } from "./queryTimelineEdit";
import { QueryStatus } from "../types";

const DAY = 86400000;
const NOW = 1_700_000_000_000; // fixed "now"
const SENT = NOW - 30 * DAY;

describe("validateTimeline", () => {
  it("passes a clean in-order log", () => {
    const errors = validateTimeline({
      dateSentMs: SENT,
      nowMs: NOW,
      rungs: [
        { id: "a", status: QueryStatus.PARTIAL_REQUESTED, timeMs: SENT + 10 * DAY },
        { id: "b", status: QueryStatus.PARTIAL_SENT, timeMs: SENT + 12 * DAY },
      ],
    });
    expect(errors).toEqual([]);
  });

  it("blocks a future send date", () => {
    const errors = validateTimeline({ dateSentMs: NOW + DAY, nowMs: NOW, rungs: [] });
    expect(errors.some((e) => e.code === "future_send")).toBe(true);
  });

  it("blocks an event dated in the future", () => {
    const errors = validateTimeline({
      dateSentMs: SENT, nowMs: NOW,
      rungs: [{ id: "a", status: QueryStatus.PARTIAL_REQUESTED, timeMs: NOW + DAY }],
    });
    expect(errors.some((e) => e.code === "future_event")).toBe(true);
  });

  it("blocks an event dated before the query was sent", () => {
    const errors = validateTimeline({
      dateSentMs: SENT, nowMs: NOW,
      rungs: [{ id: "a", status: QueryStatus.PARTIAL_REQUESTED, timeMs: SENT - DAY }],
    });
    expect(errors.some((e) => e.code === "before_send")).toBe(true);
  });

  it("blocks a Partial Sent dated before its Partial Request", () => {
    const errors = validateTimeline({
      dateSentMs: SENT, nowMs: NOW,
      rungs: [
        { id: "req", status: QueryStatus.PARTIAL_REQUESTED, timeMs: SENT + 10 * DAY },
        { id: "sent", status: QueryStatus.PARTIAL_SENT, timeMs: SENT + 5 * DAY },
      ],
    });
    expect(errors.some((e) => e.code === "sent_before_request")).toBe(true);
  });

  it("allows a Sent with no matching Request in the log", () => {
    const errors = validateTimeline({
      dateSentMs: SENT, nowMs: NOW,
      rungs: [{ id: "sent", status: QueryStatus.FULL_SENT, timeMs: SENT + 5 * DAY }],
    });
    expect(errors.some((e) => e.code === "sent_before_request")).toBe(false);
  });

  it("blocks a terminal status that is not the last event", () => {
    const errors = validateTimeline({
      dateSentMs: SENT, nowMs: NOW,
      rungs: [
        { id: "rej", status: QueryStatus.REJECTED, timeMs: SENT + 5 * DAY },
        { id: "full", status: QueryStatus.FULL_REQUESTED, timeMs: SENT + 10 * DAY },
      ],
    });
    expect(errors.some((e) => e.code === "terminal_not_last")).toBe(true);
  });

  it("allows a terminal status as the last event", () => {
    const errors = validateTimeline({
      dateSentMs: SENT, nowMs: NOW,
      rungs: [
        { id: "full", status: QueryStatus.FULL_REQUESTED, timeMs: SENT + 5 * DAY },
        { id: "rej", status: QueryStatus.REJECTED, timeMs: SENT + 10 * DAY },
      ],
    });
    expect(errors).toEqual([]);
  });
});

describe("appendNoteFor", () => {
  it("uses 'name at agency' when an agency is present", () => {
    expect(appendNoteFor(QueryStatus.PARTIAL_REQUESTED, "Eleanor Hart", "Hart & Quill"))
      .toBe("Eleanor Hart at Hart & Quill requested a partial manuscript");
  });
  it("falls back to name alone when agency is empty", () => {
    expect(appendNoteFor(QueryStatus.FULL_SENT, "Eleanor Hart", ""))
      .toBe("Full manuscript sent to Eleanor Hart");
  });
});

describe("option sets", () => {
  it("never offers Queried as an advance or reclassify (the root owns it)", () => {
    expect(ADVANCE_OPTIONS).not.toContain(QueryStatus.QUERIED);
    expect(RECLASSIFY_OPTIONS).not.toContain(QueryStatus.QUERIED);
  });
  it("treats offer/rejection/withdrawn/no-response as terminal", () => {
    expect([...TERMINAL_STATUSES].sort()).toEqual(
      [QueryStatus.NO_RESPONSE, QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN].sort()
    );
  });
});
