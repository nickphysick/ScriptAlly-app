/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Evening-run sheet locks (Parts B/C). Logic-only test policy → source/rule-text layer;
 * derivation tests live beside their pure modules (todoWalk / queryTimelineRows).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
const hub = readFileSync(join(here, "..", "reading-pane", "QueryTimeline.tsx"), "utf8");
const css = readFileSync(join(here, "todo.css"), "utf8");

describe("B2 — the sheet renders the HUB'S timeline (reuse, not imitation)", () => {
  it("FocusFlow imports the shared TimelineRows + buildTimelineRows from the reading pane", () => {
    expect(flow).toContain('import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";');
    expect(flow).toContain("<TimelineRows rows={rows} />");
  });
  it("condensed to the most recent 3–4, newest first; Open the full query sits directly beneath", () => {
    expect(flow).toContain(".slice(-4).reverse()");
    const sheet = flow.slice(flow.indexOf("{sheetTimeline(q, ag)}"));
    expect(sheet.indexOf("{openQueryLink(q)}")).toBeGreaterThan(0);
    expect(sheet.indexOf("{openQueryLink(q)}")).toBeLessThan(120); // the very next mount in the step body
    expect(flow).toContain("Open the full query →"); // the link's copy (helper definition)
  });
  it("the old chips are GONE (component + CSS); the shape-adapter maps the twinned nudge type", () => {
    expect(flow).not.toContain("timelineChips");
    expect(flow).not.toContain("buildAgentTimeline");
    expect(css).not.toContain("tdb-fftl");
    expect(flow).toContain("a.activityType === ActivityType.NUDGE_SENT ? NUDGE_NESTED_TYPE : a.resultingStatus");
  });
  it("the Hub consumes the MOVED component verbatim — same rows, same ⋯ wiring, extraction only", () => {
    expect(hub).toContain("export const TimelineRows");
    expect(hub).toContain("onMenuOpen={onEditEntry || onDeleteEntry ? (entry, style) => setMenu({ entry, style }) : undefined}");
    expect(hub).toContain("row.activityId && onMenuOpen"); // the ⋯ condition, equivalence preserved
    expect(hub).toContain('StatusDot status={row.status} overrideSize={28} decorative={row.kind === "nudge"}');
  });
});
