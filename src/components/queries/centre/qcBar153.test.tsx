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
  beGroup: "urgency", onBeGroup: () => {}, beSort: "due", onBeSort: () => {},
};
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
  it("its search words name only what the search matches: agent and agency, never a note", () => {
    expect(FIND_PLACEHOLDER).not.toMatch(/note/i);
    const row = { agentName: "Tom Ellery", agencyKey: "Curtis Vane" } as Parameters<typeof matchesFind>[0];
    expect(matchesFind(row, "ellery")).toBe(true);
    expect(matchesFind(row, "curtis")).toBe(true);
  });
});
