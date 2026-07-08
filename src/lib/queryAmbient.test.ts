/**
 * Locks for the Queries command bar (ref design-refs/queries-workspace-v2.html): the shared
 * ambient-status derivation (waiting / each writer's-turn variant / closed), the bar's centre
 * text, plus artefact locks over Queries.tsx — the ONE-HOME-FOR-ACTIONS rule (old top toolbar
 * gone, command bar present, mark-sent trigger in the bar) and the ?q= deep-link regression.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { queryAmbientStatus, commandBarStatus } from "./queryAmbient";
import { QueryStatus } from "../types";

const NOW = new Date("2026-07-06T00:00:00Z").getTime();
const q = (over: Record<string, any> = {}): any => ({ id: "q", userId: "u", manuscriptId: "m", agentId: "a", packageId: "", sendMethod: "Email", status: QueryStatus.QUERIED, ...over });

describe("queryAmbientStatus — the shared open-state derivation", () => {
  it("agent's turn (Queried) → waiting, days + expected reply from the send date + 8-week window", () => {
    const sent = new Date("2026-06-16T00:00:00Z").toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: sent }), "agent", undefined, NOW);
    expect(a.mode).toBe("waiting");
    expect(a.nDays).toBe(20);
    expect(a.sentMs).toBe(new Date(sent).getTime());
    expect(a.expMs).toBe(new Date(sent).getTime() + 8 * 7 * 86400000); // +8 weeks
    expect(a.overdue).toBe(false);
  });

  it("undated waiting keeps mode but nulls the bar/date", () => {
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: undefined }), "agent", undefined, NOW);
    expect(a.mode).toBe("waiting");
    expect(a.sentMs).toBeNull();
    expect(a.expMs).toBeNull();
  });

  it("writer's turn — partial requested → event + days-ago from the request date", () => {
    const req = new Date("2026-06-12T00:00:00Z").toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: req }), "writer", "partial", NOW);
    expect(a.mode).toBe("writer");
    expect(a.sendWhat).toBe("partial");
    expect(a.eventLabel).toBe("partial requested");
    expect(a.writerDaysAgo).toBe(24);
  });

  it("writer's turn — full requested + R&R variants", () => {
    const full = queryAmbientStatus(q({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: new Date("2026-07-01T00:00:00Z").toISOString() }), "writer", "full", NOW);
    expect([full.sendWhat, full.eventLabel, full.writerDaysAgo]).toEqual(["full", "full requested", 5]);
    const rr = queryAmbientStatus(q({ status: QueryStatus.REVISE_RESUBMIT, dateSent: new Date("2026-07-04T00:00:00Z").toISOString() }), "writer", "resubmit", NOW);
    expect([rr.sendWhat, rr.eventLabel]).toEqual(["resubmission", "revise & resubmit"]);
  });

  it("closed / Offer (ballHolder null) → closed, no ambient", () => {
    const a = queryAmbientStatus(q({ status: QueryStatus.OFFER }), null, undefined, NOW);
    expect(a.mode).toBe("closed");
    expect(commandBarStatus(a)).toBeNull();
  });
});

describe("commandBarStatus — the bar's centre text", () => {
  it("waiting: WAITING TO HEAR BACK · N DAYS · EXPECTED ~date (singular-safe)", () => {
    const sent = new Date("2026-06-16T00:00:00Z").toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: sent }), "agent", undefined, NOW);
    const s = commandBarStatus(a)!;
    expect(s.bold).toBeUndefined();
    expect(s.text).toBe("Waiting to hear back · 20 days · expected ~11 Aug");
  });

  it("writer: burgundy 'Your move' fragment + the event/days-ago tail", () => {
    const req = new Date("2026-06-12T00:00:00Z").toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: req }), "writer", "partial", NOW);
    const s = commandBarStatus(a)!;
    expect(s.bold).toBe("Your move");
    expect(s.text).toBe("· partial requested 24 days ago");
  });
});

describe("Queries.tsx artefacts — one home for actions + regressions", () => {
  const src = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");

  it("the command bar exists (unified full-width bar) and the old top action toolbar is gone", () => {
    expect(src.includes("qp-controlbar")).toBe(true);
    // The unified control bar spans BOTH columns at the workspace foot via a two-zone subgrid,
    // not a pane-only strip. The retired toolbar's own markers must still be absent.
    expect(src.includes('gridColumn: "1 / -1"')).toBe(true);
    expect(src.includes('gridTemplateColumns: "subgrid"')).toBe(true);
    expect(src.includes("Actions toolbar")).toBe(false);
    expect(src.includes('gridRow: "1 / span 2"')).toBe(false); // the old list span (2-row grid)
  });

  it("the mark-sent trigger ref lives in the command bar (single home for the popover)", () => {
    // exactly one markSentTriggerRef attachment, and it's inside the command-bar IIFE region
    const attaches = src.match(/ref=\{markSentTriggerRef\}/g) ?? [];
    expect(attaches.length).toBe(1);
    const barIdx = src.indexOf("qp-controlbar");
    expect(src.indexOf("ref={markSentTriggerRef}")).toBeGreaterThan(barIdx);
  });

  it("the ?q= deep-link scroll-into-view is untouched (regression)", () => {
    expect(src).toContain("query-row-${activeSubPage}");
    expect(src).toContain('scrollIntoView({ block: "center" })');
  });
});

describe("command-bar theming — per-theme token smoke (rule-text lock)", () => {
  const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
  const themeBlock = (sel: string) => {
    const start = css.indexOf(`\n${sel} {`);
    expect(start).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("\n}", start));
  };

  it("Cappuccino: warm bar + centre-fill primary", () => {
    const b = themeBlock(".t-capp");
    expect(b).toContain("--cmd-bar-bg: #fffefb");
    expect(b).toContain("--cmd-bar-bd: #e7ddd2");
    expect(b).toContain("--cmd-primary-bg: #5d4037");
    expect(b).toContain("--qp-col-bg: #fffefb");
  });

  it("Bold Pastille: ink rule bar (1.5px)", () => {
    const b = themeBlock(".t-bold");
    expect(b).toContain("--cmd-bar-bd: #1d1712");
    expect(b).toContain("--cmd-bar-bdw: 1.5px");
    expect(b).toContain("--cmd-primary-bg: #eec9c3");
  });

  it("Editorial: hairline + soft shadow bar", () => {
    const b = themeBlock(".t-edn");
    expect(b).toContain("--cmd-bar-bd: #ececeb");
    expect(b).toContain("--cmd-bar-shadow: 0 -2px 10px rgba(20, 20, 20, 0.04)");
    expect(b).toContain("--cmd-primary-bg: #e9eaeb");
  });
});

describe("Queries height chain — structural guards (jsdom cannot verify flex/grid sizing)", () => {
  const src = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");

  it("the desk grid fills its first row; the populated grid appends a control-bar row", () => {
    // Every .queries-content-grid must template its rows explicitly — the bug was a MISSING
    // gridTemplateRows, so auto-rows split the two column-placed panes across rows. The first
    // row always fills (minmax(0,1fr)); the populated grid appends `auto` for the control bar.
    const grids = src.match(/className="queries-content-grid" style=\{\{[^}]*\}\}/g) ?? [];
    expect(grids.length).toBeGreaterThanOrEqual(2);
    for (const g of grids) expect(g).toContain('gridTemplateRows: "minmax(0, 1fr)');
  });

  it("the list and the workspace pane are both in gridRow 1 (tops flush beneath the slab)", () => {
    // the workspace pane must NOT carry the stale gridRow: 2 that bottom-anchored it
    expect(src.includes("gridColumn: 2, gridRow: 2")).toBe(false);
    expect(src.includes('className="qp-pane" style={{ gridColumn: 2, gridRow: 1')).toBe(true);
    expect(src.includes("gridColumn: 1, gridRow: 1")).toBe(true); // list card
  });

  it("no viewport-relative height or bottom-anchor in the workspace pane subtree", () => {
    // The stage bounds are the only place the viewport is known — the pane tree stretches
    // within the grid, never sizes to vh/dvh, and nothing margin-top:auto / flex-end pins it low.
    const paneStart = src.indexOf('className="qp-pane"');
    const paneEnd = src.indexOf("closes qp-pane", paneStart);
    const paneTree = src.slice(paneStart, paneEnd);
    expect(paneTree).not.toMatch(/100vh|100dvh|calc\(100v/);
    expect(paneTree).not.toMatch(/marginTop:\s*"auto"|alignSelf:\s*"flex-end"|alignSelf:\s*"end"/);
  });
});

describe("QueryTimeline artefact — move band keeps prose, loses its button", () => {
  const tl = readFileSync(resolve(__dirname, "../components/reading-pane/QueryTimeline.tsx"), "utf8");
  it("no send-materials button in the writer band (handler gone); the narrative remains", () => {
    expect(tl.includes("onMarkSent")).toBe(false); // the button + its handler are removed
    expect(tl.includes("Your move — send the")).toBe(true);
  });
});
