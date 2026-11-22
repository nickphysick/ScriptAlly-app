/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Status marks v3 — SM3-8 "one drawing": a status mark is drawn in one place.
 *
 *   · No file under src/ but StatusDot.tsx and marketingMarks.tsx holds the seal's path, and none holds any of the
 *     three retired offer pages (StatusDot's, TrackNode's, the landing's) in full.
 *   · TrackNode is gone, and StageGlyph is imported only by the four files below, none of which renders it on a page:
 *     the desktop Query Centre hands QcCentre `bodyless`, so QcList138 (its peek, its bands via bandMarks, and the
 *     applied-filters row it is given) is never drawn; QcHeader138's GlyphRow is mounted nowhere; and in
 *     QcFilterMenu140 only QcAppliedRow140 (reached solely through QcList138) still draws it. The premises are
 *     asserted below, so the day one of them stops being true this goes red.
 *
 * ⚠️ THE OLD PAGES ARE MATCHED IN FULL, NOT BY THE BRIEF'S SEARCH FRAGMENTS: `h7l4 4` also matches two document icons
 * that are not status marks (the agent card's doc link, AgentCardParts255; the phone's file icon, v3Icons).
 * ⚠️ A source-scanning lock matches its own search terms: this file and statusMarksV3.test.tsx (which reads the
 * reference and names the old page to assert it is gone) are skipped by name.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = new URL("..", import.meta.url).pathname;
const SKIP = new Set(["test/statusMarksV3Sources.test.ts", "components/statusMarksV3.test.tsx"]);
const files: string[] = [];
const walk = (d: string) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css|html)$/.test(n)) files.push(relative(SRC, p));
  }
};
walk(SRC);
const read = (f: string) => readFileSync(join(SRC, f), "utf8");

const SEAL_SOLID_HEAD = "M12.00 2.40A2.78 2.78 0 0 1 16.80 3.69";
const OLD_PAGES = ["M7 3.5h7l4 4V20.5H7z", "M10 5h14l7 7v23H10z", "M5.5 2.5h9l4.5 4.5v14.5h-13.5z"];

describe("SM3-8 one drawing", () => {
  it("scans the tree it claims to", () => {
    expect(files.length).toBeGreaterThan(500);
    expect(files).toContain("components/StatusDot.tsx");
    expect(files).toContain("marketing/marketingMarks.tsx");
  });

  it("the seal is drawn only by StatusDot and the landing's glyph row; no old page survives", () => {
    const seal = files.filter((f) => !SKIP.has(f) && read(f).includes(SEAL_SOLID_HEAD));
    expect(seal.sort()).toEqual(["components/StatusDot.tsx", "marketing/marketingMarks.tsx"]);
    const pages = files.filter((f) => !SKIP.has(f) && OLD_PAGES.some((p) => read(f).includes(p)));
    expect(pages, "an old offer page is still drawn").toEqual([]);
  });

  it("TrackNode is gone, and StageGlyph is imported only by the four unrendered places", () => {
    expect(files.filter((f) => /\bTrackNode\b/.test(read(f)) && !/statusMarksV3/.test(f) && !/qcTrackMarks/.test(f) && f !== "components/queries/centre/StageGlyph.tsx")).toEqual([]);
    expect(read("components/queries/centre/StageGlyph.tsx")).not.toMatch(/export const TrackNode/);
    const importers = files.filter((f) => /import\s*\{[^}]*\bStageGlyph\b[^}]*\}\s*from\s*"\.\/StageGlyph"/.test(read(f)));
    expect(importers.sort()).toEqual([
      "components/queries/centre/QcFilterMenu140.tsx",
      "components/queries/centre/QcHeader138.tsx",
      "components/queries/centre/QcList138.tsx",
      "components/queries/centre/bandMarks.tsx",
    ]);
  });

  it("in QcFilterMenu140 only QcAppliedRow140 still draws StageGlyph; the filter panel's chips draw StatusDot", () => {
    const src = read("components/queries/centre/QcFilterMenu140.tsx");
    const a = src.indexOf("export const QcAppliedRow140");
    expect(a).toBeGreaterThan(0);
    const next = src.indexOf("\nexport ", a + 10);
    const applied = src.slice(a, next < 0 ? undefined : next);
    const uses = (s: string) => (s.match(/<StageGlyph\b/g) ?? []).length;
    expect(uses(applied)).toBe(1);
    expect(uses(src), "a second StageGlyph drawing in the filter menu").toBe(1);
    expect(src).toMatch(/<span className="qc142-fgl" aria-hidden="true"><StatusDot status=\{row\.statuses\[0\]\}/);
  });

  it("the premises: QcList138 and GlyphRow are not drawn on the desktop page", () => {
    const q = read("components/Queries.tsx");
    expect(q, "the desktop page draws QcCentre's body").toMatch(/bodyless=\{qcDesk\}/);
    expect((q.match(/<QcList138\b/g) ?? []).length).toBe(1);
    /* the one <QcList138 sits in QcCentre's `body`, under `qcDesk ?` — the branch `bodyless` drops */
    const i = q.indexOf("<QcList138");
    expect(q.lastIndexOf("body={", i)).toBeGreaterThan(q.lastIndexOf("bodyless={qcDesk}", i));
    expect(q.slice(q.lastIndexOf("body={", i), i)).toMatch(/qcDesk \? \(\s*<QcList138|qcDesk \?\s*\(?\s*$/m);
    expect(read("components/queries/centre/QcCentre.tsx")).toMatch(/\{bodyless \? null : \(/);
    const glyphRowUses = files.filter((f) => !SKIP.has(f) && /<GlyphRow\b/.test(read(f)));
    expect(glyphRowUses, "GlyphRow is mounted").toEqual([]);
    const bandMarkUses = files.filter((f) => !SKIP.has(f) && /<BandMark\b/.test(read(f)));
    expect(bandMarkUses).toEqual(["components/queries/centre/QcList138.tsx"]);
    const appliedUses = files.filter((f) => !SKIP.has(f) && /<QcAppliedRow140\b/.test(read(f)));
    expect(appliedUses).toEqual(["components/Queries.tsx"]);
    const ai = q.indexOf("<QcAppliedRow140");
    expect(ai, "the applied row is a prop of the one QcList138").toBeGreaterThan(i);
    expect(q.indexOf("/>", i) === -1 || q.slice(i, ai).includes("applied={")).toBe(true);
  });
});
