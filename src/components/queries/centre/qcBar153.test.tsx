/** Query Centre v153 — the slim bar: its count reads "26 queries" or "5 of 26", and the search says what it searches. */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QcBar153, type QcBar153Props } from "./QcBar153";
import { FIND_PLACEHOLDER } from "../../../lib/qc153";
import { matchesFind } from "../../../lib/qcSummary";

const base: QcBar153Props = {
  view: "list", onView: () => {}, loading: false, showing: 26, total: 26, find: "", onFind: () => {},
  sort: { key: "due", desc: false }, onSort: () => {}, group: "attention", onGroup: () => {}, packageOk: false,
  beGroup: "urgency", onBeGroup: () => {}, beSort: "due", onBeSort: () => {}, onExport: () => {},
};
const html = (p: Partial<QcBar153Props>) => renderToStaticMarkup(<QcBar153 {...base} {...p} />);
const text = (p: Partial<QcBar153Props>) => renderToStaticMarkup(<QcBar153 {...base} {...p} />).replace(/<[^>]+>/g, "");

describe("the slim bar", () => {
  it("counts the whole list, or how many of it are showing", () => {
    expect(text({})).toContain("26 queries");
    expect(text({ showing: 5 })).toContain("5 of 26");
  });
  it("shows Sort's and Group's current values", () => {
    expect(text({})).toContain("Next due");
    expect(text({})).toContain("Action");
  });
  it("List filters v1 — Sort is the labelled SortChip on Sort151: \"Sort:\", the field, its arrow and title, a caret", () => {
    const h = html({});
    expect(h).toMatch(/data-qc153="sort"[^>]*aria-label="Sorted by Next due, soonest first\. Change the order"/);
    expect(h).toMatch(/<em class="sc-sby sc-lab lf-lab">Sort:<\/em><b class="sc-f" data-sc="field">Next due<\/b><i class="sc-dir" data-sc="dir" data-reversed="false" title="Soonest first">↑<\/i><svg class="sc-cv"/);
    expect(html({ sort: { key: "queried", desc: true } })).toMatch(/>Queried<\/b><i[^>]*title="Newest first">↓</);
    /* a sort the menu does not offer, set elsewhere, is still named */
    expect(html({ sort: { key: "agency", desc: false } })).toMatch(/data-sc="field">Agency</);
  });
  it("List filters v1 — Group is labelled; ungrouped reads None; Birds-eye's two buttons take the same look", () => {
    expect(html({})).toMatch(/data-qc153="group"[^>]*><span class="lf-ic" aria-hidden="true">▤<\/span><em class="lf-lab">Group:<\/em><b>Action<\/b><svg class="lf-cv"/);
    expect(html({ group: "none" })).toMatch(/<em class="lf-lab">Group:<\/em><b>None<\/b>/);
    const be = html({ view: "birds" });
    expect(be).toMatch(/data-qc153="sort"[^>]*><span class="lf-ic" aria-hidden="true">⇅<\/span><em class="lf-lab">Sort:<\/em><b>Due date<\/b>/);
  });
  it("List filters v1 — Export is in the bar: \"↓ Export\", named by the old label, disabled at 0", () => {
    expect(html({ showing: 12 })).toMatch(/<button type="button" class="qc153-dd lf-exp" data-qc153="export" aria-label="Export 12 queries" title="Export 12 queries"><span aria-hidden="true">↓<\/span><b class="lf-expw" aria-hidden="true">Export<\/b><\/button>/);
    expect(html({ showing: 0 })).toMatch(/aria-label="Export 0 queries"[^>]*disabled=""/);
  });
  it("its search words name only what the search matches: agent and agency, never a note", () => {
    expect(FIND_PLACEHOLDER).not.toMatch(/note/i);
    const row = { agentName: "Tom Ellery", agencyKey: "Curtis Vane" } as Parameters<typeof matchesFind>[0];
    expect(matchesFind(row, "ellery")).toBe(true);
    expect(matchesFind(row, "curtis")).toBe(true);
  });
});
