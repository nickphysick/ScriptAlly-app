/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Feed drawer v2 — the family table (FD2 B1), over every status and every activity type.
 */
import { describe, expect, it } from "vitest";
import { ActivityType, QueryStatus } from "../../../types";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FEED_FAMILIES, actModeFor, feedFamily, fellToClosed, isTinted } from "./feedFamily";
import { FeedRow } from "./Dash58Feed";
import type { DrawerEvent } from "../../../lib/dashFeedDrawer";

const e = (activityType: string, status: QueryStatus | null = null, app = false) => ({ activityType, status, app });
const STATUS = ActivityType.STATUS_CHANGED;

describe("feed drawer v2 — families", () => {
  it("the pack's table, row by row", () => {
    expect(feedFamily(e(STATUS, QueryStatus.OFFER))).toBe("offer");
    expect(feedFamily(e(STATUS, QueryStatus.SIGNED))).toBe("offer");
    expect(feedFamily(e(ActivityType.OFFER_ACCEPTED))).toBe("offer");
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]) expect(feedFamily(e(STATUS, s)), s).toBe("request");
    expect(feedFamily(e(ActivityType.QUERY_SENT, QueryStatus.QUERIED))).toBe("queried");
    for (const s of [QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED]) expect(feedFamily(e(ActivityType.MATERIALS_SENT, s)), s).toBe("sent");
    expect(feedFamily(e(ActivityType.NUDGE_SENT))).toBe("nudge");
    for (const s of [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) expect(feedFamily(e(STATUS, s)), s).toBe("closed");
    expect(feedFamily(e(ActivityType.OFFER_DECLINED, QueryStatus.WITHDRAWN))).toBe("closed");
    for (const t of [ActivityType.AGENT_ADDED, ActivityType.AGENT_UPDATED, ActivityType.AGENT_DELETED, ActivityType.MANUSCRIPT_ADDED, ActivityType.MANUSCRIPT_UPDATED, ActivityType.MANUSCRIPT_DELETED]) {
      expect(feedFamily(e(t, null, true)), t).toBe("housekeeping");
    }
  });

  it("every status has a row of its own: none reaches `closed` by default", () => {
    for (const s of Object.values(QueryStatus)) expect(fellToClosed(e(STATUS, s)), s).toBe(false);
  });

  it("the activity is asked before the status", () => {
    /* a declined offer carries Withdrawn; an accepted one may ride on a query still at Offer or carry none */
    expect(feedFamily(e(ActivityType.OFFER_ACCEPTED, QueryStatus.WITHDRAWN))).toBe("offer");
    expect(feedFamily(e(ActivityType.NUDGE_SENT, QueryStatus.QUERIED))).toBe("nudge");
    expect(feedFamily(e(ActivityType.AGENT_ADDED, QueryStatus.OFFER, true))).toBe("housekeeping");
  });

  it("an entry that fits nothing takes `closed`, and says so", () => {
    const odd = e(STATUS, null);
    expect(feedFamily(odd)).toBe("closed");
    expect(fellToClosed(odd)).toBe(true);
    expect(fellToClosed(e("Something New"))).toBe(true);
  });

  it("only offers and requests are tinted", () => {
    expect(FEED_FAMILIES.filter(isTinted)).toEqual(["offer", "request"]);
  });
});

const ev = (o: Record<string, unknown>): DrawerEvent => ({
  entry: { id: "e1", at: 0, time: "1:05pm", dir: "in", status: null, state: null, app: false, activityType: STATUS, queryId: "q1", need: null, met: null, isNew: false, who: "Ada", agency: "A&B", ...o } as never,
  say: [{ t: "Ada", who: true }, { t: " asked for pages of " }, { t: "The Book", em: true }], tag: "Full requested", meta: "A&B · QUERIED 1 SEP",
});
const html = (o: Record<string, unknown>, onAct = () => {}) => renderToStaticMarkup(React.createElement(FeedRow, { ev: ev(o), onAct }));

describe("feed drawer v2 — the row (FD2 B3, B4, B5)", () => {
  it("an open offer opens the offer journey; every other open request the send", () => {
    expect(actModeFor(QueryStatus.OFFER)).toBe("offer");
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]) expect(actModeFor(s), s).toBe("sent");
  });
  it("a request with `need` shows the action; one with `met` shows the day it went; never both", () => {
    const open = html({ status: QueryStatus.FULL_REQUESTED, need: { label: "Send the full" } });
    expect(open).toContain('data-family="request"');
    expect(open).toMatch(/<button[^>]*data-d58="ev-act"[^>]*>Send the full →<\/button>/);
    expect(open).not.toContain("ev-done");
    const met = html({ status: QueryStatus.FULL_REQUESTED, met: "28 Sep" });
    expect(met).toContain("✓ Sent on 28 Sep");
    expect(met).not.toContain("ev-act");
    const offer = html({ status: QueryStatus.OFFER, need: { label: "Decide on the offer" } });
    expect(offer).toContain('data-family="offer"');
    expect(offer).toContain("Decide on the offer →");
  });
  it("a row with a status holds the StatusDot; a nudge the bell; housekeeping the gear", () => {
    expect(html({ status: QueryStatus.QUERIED, dir: "out" })).not.toMatch(/ev-bell|ev-gear/);
    expect(html({ activityType: ActivityType.NUDGE_SENT, dir: "out" })).toContain('data-d58="ev-bell"');
    expect(html({ activityType: ActivityType.AGENT_ADDED, app: true, dir: "out" })).toContain('data-d58="ev-gear"');
  });
  it("housekeeping is one line: no tag, no meta, no action", () => {
    const h = html({ activityType: ActivityType.AGENT_ADDED, app: true, dir: "out", need: { label: "x" } });
    expect(h).not.toContain("d58-evtag");
    expect(h).not.toContain("d58-evmeta");
    expect(h).not.toContain("ev-act");
    expect(h).toContain("<time>1:05pm</time>");
  });
});
