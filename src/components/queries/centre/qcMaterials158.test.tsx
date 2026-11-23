/**
 * Query card v158 §4 — the Materials tab's render locks (QC158-8/9's source halves; the measured halves are
 * tests/e2e/qc158.measure.ts). The grouping itself is locked in lib/qcThread152.test.ts.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MaterialsTab158 } from "./QcMaterials158";
import { materialGroups, type ThreadStepIn } from "../../../lib/qcThread152";
import { QueryStatus } from "../../../types";
import { STAGE_COLOURS } from "../../../lib/stageColours";

const NOW = new Date(2026, 10, 18, 12).getTime();
const DAY = 86_400_000;
const st = (key: string, status: QueryStatus, daysAgo: number, labels: string[], via: string | null = null): ThreadStepIn =>
  ({ key, activityId: key, status, kind: null, ms: NOW - daysAgo * DAY, chips: labels.map((label) => ({ label, detail: "" })), via, quote: "" } as unknown as ThreadStepIn);
const Q = st("q", QueryStatus.QUERIED, 60, ["Query letter", "Synopsis"], "by email");
const PR = st("pr", QueryStatus.PARTIAL_REQUESTED, 30, ["First 50 pages"]);
const PS = st("ps", QueryStatus.PARTIAL_SENT, 28, ["First 50 pages"]);
const FR = st("fr", QueryStatus.FULL_REQUESTED, 20, ["Full manuscript"]);
const FS = st("fs", QueryStatus.FULL_SENT, 18, ["Full manuscript"]);
const EDIT = { chips: () => null, busy: false, of: (g: { pending: boolean }) => (g.pending ? null : { mats: [], stepMs: NOW }), save: async () => true };
const html = (steps: ThreadStepIn[], pkg: string | null = "Autumn round", edit: typeof EDIT | null = null) =>
  renderToStaticMarkup(<MaterialsTab158 groups={materialGroups(steps, { nowMs: NOW })} packageName={pkg} edit={edit} />);

describe("QC158-8 (source) groups by what it went with", () => {
  it("a partial and a full sent: three groups, in order, each disc its stage's Band, the mark in ink", () => {
    const h = html([Q, PR, PS, FR, FS]);
    const heads = [...h.matchAll(/data-qc158="heading">([^<]+)/g)].map((m) => m[1]);
    expect(heads).toEqual(["With the query", "With the partial", "With the full"]);
    const discs = [...h.matchAll(/data-qc158="disc" style="--d:(#[0-9a-f]{6})"/g)].map((m) => m[1]);
    expect(discs).toEqual([STAGE_COLOURS.queried.band, STAGE_COLOURS.partial.band, STAGE_COLOURS.full.band]);
    expect(h).toContain('data-qc158="package">Autumn round</em>');
    expect(h).toMatch(/data-qc158="when">\d+ \w+, by email</);
    expect(h).toMatch(/With the partial<span class="r" data-qc158="when">\d+ \w+, asked \d+ \w+</);
    /* Query card v168 — re-pointed: the foot's "+ Add something you sent" and "Edit what went" are gone (each group edits
       its own items, in the tab); with editing on, every sent group with items carries its pencil, a pending one none */
    expect(h).not.toContain("Add something you sent");
    expect(h).not.toContain("Edit what went");
    expect(h).not.toContain('data-qc168="pen"');
    const ed = html([Q, PR, PS, FR], "Autumn round", EDIT);
    expect((ed.match(/data-qc168="pen"/g) ?? []).length).toBe(2);
    expect(ed).toContain('aria-label="Edit what went: With the query"');
    expect(h).not.toContain("mat-summary");
  });
  it("on the free plan (no package name passed) the query's group carries none", () => {
    expect(html([Q], null)).not.toContain('data-qc158="package"');
  });
});

describe("QC158-9 (source) a request not yet answered", () => {
  it("is its own group, outlined in navy, each item 'not sent yet'; once sent, one partial group and no outline", () => {
    const open = html([Q, PR]);
    expect(open).toMatch(/class="nx-grp pend"[^>]*data-kind="partial"[^>]*data-pending=""/);
    expect(open).toMatch(/First 50 pages<span class="r">not sent yet<\/span>/);
    const done = html([Q, PR, PS]);
    expect((done.match(/data-kind="partial"/g) ?? []).length).toBe(1);
    expect(done).not.toContain("pend");
    const css = readFileSync("src/components/queries/centre/qcv158.css", "utf8");
    expect(css).toMatch(/\.qc152 \.nx-grp\.pend \.nx-items \{ background: #fff; box-shadow: inset 0 0 0 1\.5px #2a3a52; \}/);
  });
});
