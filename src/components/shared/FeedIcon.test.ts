/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1.1 — Part 4: one icon per kind of event (ref design-refs/feed-icons-v1/feed-icons-v1.json).
 * The drawings are the JSON's, byte for byte; each event type renders its own key; no gear is left in the feed.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToString } from "react-dom/server";
import { FeedIcon, FEED_ICON_INNER, FEED_ICON_STROKE_WIDTH, FEED_ICON_VIEWBOX } from "./FeedIcon";
import { feedIconKind } from "../../lib/feedIcon";
import { ActivityType, QueryStatus, type Activity, type Agent, type Manuscript, type Query } from "../../types";
import { feedEntries } from "../../lib/dashFeed";
import { drawerEvents } from "../../lib/dashFeedDrawer";
import { f1Days, type F1Mini } from "../../lib/dashF1Feed";

const REF = JSON.parse(readFileSync("design-refs/feed-icons-v1/feed-icons-v1.json", "utf8")) as {
  viewBox: string; strokeWidth: number; strokeLinecap: string; strokeLinejoin: string; stroke: string; fill: string; size: number; icons: Record<string, { inner: string }>;
};

describe("Part 4 — the drawings are the ref's, byte for byte", () => {
  it("the same keys", () => {
    expect(Object.keys(FEED_ICON_INNER).sort()).toEqual(Object.keys(REF.icons).sort());
    expect(Object.keys(REF.icons).length).toBeGreaterThan(10);
  });
  it.each(Object.keys(REF.icons))("%s", (k) => {
    expect(FEED_ICON_INNER[k as keyof typeof FEED_ICON_INNER]).toBe(REF.icons[k].inner);
  });
  it("on the ref's viewBox, stroke width, caps and joins; currentColor only; aria-hidden", () => {
    expect(FEED_ICON_VIEWBOX).toBe(REF.viewBox);
    expect(FEED_ICON_STROKE_WIDTH).toBe(REF.strokeWidth);
    const html = renderToString(React.createElement(FeedIcon, { kind: "agent_added" }));
    expect(html).toContain(`viewBox="${REF.viewBox}"`);
    expect(html).toContain(`stroke-linecap="${REF.strokeLinecap}"`);
    expect(html).toContain(`stroke-linejoin="${REF.strokeLinejoin}"`);
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('fill="none"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(`width="${REF.size}"`);
    const src = readFileSync("src/components/shared/FeedIcon.tsx", "utf8");
    expect(src.match(/#[0-9a-f]{3,6}\b/gi) ?? []).toEqual([]);
  });
});

/* every event type in the brief's table, through the real resolver, as the dashboard feed draws it */
const NOW = new Date(2026, 10, 24, 15, 0, 0);
const at = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const agent = { id: "ag1", name: "Nadia Hussain", agency: "Hussain Literary" } as Agent;
const ms = { id: "m1", title: "Tidewrack" } as Manuscript;
const q = { id: "q1", agentId: "ag1", manuscriptId: "m1", status: QueryStatus.OFFER, dateSent: at(60 * 24 * 30) } as Query;
let n = 0;
const a = (over: Partial<Activity>, mins: number): Activity => ({ id: `fi${++n}`, userId: "u", queryId: "", manuscriptId: "", details: "", description: "x", date: at(mins), ...over } as Activity);
const TABLE: [string, Activity, string][] = [
  ["Agent added", a({ id: "act-added-agent-ag1", activityType: ActivityType.AGENT_ADDED, subjectName: "Nadia Hussain", subjectId: "ag1" }, 300), "agent_added"],
  ["Agent updated", a({ activityType: ActivityType.AGENT_UPDATED, subjectName: "Nadia Hussain", subjectId: "ag1", changed: ["fit"] }, 280), "agent_updated"],
  ["Agent renamed", a({ activityType: ActivityType.AGENT_UPDATED, subjectName: "Nadia Hussain", previousName: "Nadia H", subjectId: "ag1", changed: ["name"] }, 260), "agent_updated"],
  ["Agent removed", a({ activityType: ActivityType.AGENT_DELETED, subjectName: "Ruth Gone" }, 240), "agent_removed"],
  ["Sweep", a({ activityType: ActivityType.AGENT_UPDATED, batchCount: 4 }, 220), "agents_several"],
  ["Manuscript added", a({ activityType: ActivityType.MANUSCRIPT_ADDED, manuscriptId: "m1", subjectName: "Tidewrack" }, 200), "manuscript_added"],
  ["Manuscript updated", a({ activityType: ActivityType.MANUSCRIPT_UPDATED, manuscriptId: "m1", subjectName: "Tidewrack", changed: ["status"], changedTo: "Querying" }, 180), "manuscript_updated"],
  ["Manuscript removed", a({ activityType: ActivityType.MANUSCRIPT_DELETED, subjectName: "Saltmarsh" }, 160), "manuscript_removed"],
  ["Others told", a({ queryId: "q1", manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED, eventKey: "offer_told", toldCount: 3 }, 140), "others_told"],
  ["Offer call", a({ queryId: "q1", manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED, eventKey: "offer_call" }, 120), "call_booked"],
  ["Nudge", a({ queryId: "q1", manuscriptId: "m1", activityType: ActivityType.NUDGE_SENT }, 100), "nudge"],
  ["Import", a({ activityType: "Imported" as never, eventKey: "imported" as never, manuscriptId: "m1", importCounts: { agents: 2, queries: 3, withAgents: 1, withYou: 1, closed: 1 }, importRoute: "smart" } as never, 80), "import"],
];

describe("Part 4 — each event type renders its own key", () => {
  const entries = feedEntries({ activities: TABLE.map((t) => t[1]), queries: [q], agents: [agent], manuscripts: [ms], now: NOW, seenAt: null });
  const minis = f1Days(drawerEvents(entries, []), "all", { queries: [q], agents: [agent], manuscripts: [ms], qcRows: [], userName: "", now: NOW })
    .flatMap((d) => d.items).filter((x): x is F1Mini => x.type === "mini");
  it("population: every type in the table is on the feed", () => expect(minis).toHaveLength(TABLE.length));
  it.each(TABLE.map(([label, act, key]) => [label, act.id, key]))("%s → %s", (_l, id, key) => {
    const m = minis.find((x) => x.id === id)!;
    expect(m, String(id)).toBeDefined();
    expect(m.icon).toBe(key);
  });
  it("Holding Reply / Agent Reply map to holding_reply (their rows drop at feedPill until controls-entry-v1)", () => {
    for (const t of ["Holding Reply", "Agent Reply"]) expect(feedIconKind({ activityType: t, eventKey: null, status: null, imported: null, who: "Nadia", app: false })).toBe("holding_reply");
  });
  it("a row about a query's status keeps its StatusDot", () => {
    expect(feedIconKind({ activityType: ActivityType.STATUS_CHANGED, eventKey: "partial_requested", status: QueryStatus.PARTIAL_REQUESTED, imported: null, who: "Nadia", app: false })).toBeNull();
  });
});

describe("Part 4 — no gear in the feed; search matches the feed", () => {
  const GEAR = "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1";
  it("no feed file draws the gear or names GearGlyph", () => {
    for (const f of ["src/components/dashboard/f1/F1Feed.tsx", "src/components/dashboard/v58/Dash58Feed.tsx", "src/lib/dashF1Feed.ts"]) {
      const s = readFileSync(f, "utf8");
      expect(s, f).not.toContain(GEAR);
      expect(s, f).not.toContain("GearGlyph");
    }
  });
  it("the feed's marks are FeedIcon or the StatusDot", () => {
    const s = readFileSync("src/components/dashboard/f1/F1Feed.tsx", "utf8");
    expect(s).toContain("<FeedIcon kind={m.icon} />");
    expect(s).not.toMatch(/<svg[^>]*viewBox="0 0 24 24"[^>]*>\s*<path d="M14 3H7/);
  });
  it("search's Add a manuscript draws manuscript_added, both palettes", () => {
    for (const f of ["src/components/shell/SearchDesk.tsx", "src/components/shell/SearchPalette.tsx"]) {
      const s = readFileSync(f, "utf8");
      expect(s, f).toContain('"act:manuscript": <FeedIcon kind="manuscript_added" bare />');
      expect(s, f).toContain('"act:agent": <UserPlus aria-hidden="true" />');
    }
  });
});
