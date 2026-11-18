/**
 * Query Centre v157 — the slate ladder (lib/stageColours): one table, every status in one stage, and every hex a
 * stylesheet restates equal to it. QC157-1's source half; the computed colours are measured in tests/e2e/qc157.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus } from "../types";
import { STAGE_COLOURS, STAGE_STATUSES, stageOf } from "./stageColours";
import { LEGACY_TONE_FILL_153, SLIP_TONE_FILL, legacyTone153, sectionSwatch, slipTone } from "./qc153";
import { RING_BUCKETS } from "./qc1531";
import { TAB_ACCENT, TAB_ACCENT_157, tabAccent, tabAccent157 } from "./qc1533";

const css = (f: string) => readFileSync(`src/components/queries/centre/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("v157 · the stage table", () => {
  it("is the pack's table, hex for hex", () => {
    expect(STAGE_COLOURS).toEqual({
      queried: { band: "#efe6d6", tint: "#f8f4ed", mark: "#dccdb3" },
      partial: { band: "#e4ebf2", tint: "#f3f6f9", mark: "#a9bdd2" },
      full: { band: "#b7c9de", tint: "#dfe7f0", mark: "#7391b3" },
      offer: { band: "#8ea7c6", tint: "#ccd7e5", mark: "#46668f" },
      closed: { band: "#eceae6", tint: "#f6f5f3", mark: "#a8a199" },
    });
  });
  it("every status is in exactly one stage; R&R and Resubmitted are Full, Signed is Offer, closed is closed", () => {
    for (const s of Object.values(QueryStatus)) expect([s, Object.values(STAGE_STATUSES).filter((l) => l.includes(s)).length]).toEqual([s, 1]);
    expect(stageOf(QueryStatus.REVISE_RESUBMIT)).toBe("full");
    expect(stageOf(QueryStatus.RESUBMITTED)).toBe("full");
    expect(stageOf(QueryStatus.SIGNED)).toBe("offer");
    for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]) expect(stageOf(s)).toBe("closed");
  });
  it("slipTone is the stage, and the fill its band — a closed card is grey, not sand", () => {
    for (const s of Object.values(QueryStatus)) expect(slipTone(s)).toBe(stageOf(s));
    for (const [k, v] of Object.entries(SLIP_TONE_FILL)) expect(v).toBe(STAGE_COLOURS[k as keyof typeof STAGE_COLOURS].band);
    expect(SLIP_TONE_FILL[slipTone(QueryStatus.REJECTED)]).toBe("#eceae6");
  });
});

describe("v157 · the card's stylesheet restates the table", () => {
  const v154 = css("qcv154.css");
  it("each stage's --tone equals its band, and no v153 tone name is left on the card", () => {
    for (const [stage, c] of Object.entries(STAGE_COLOURS)) {
      const m = v154.match(new RegExp(`\\.qc154-card\\[data-tone="${stage}"\\]\\s*\\{[^}]*--tone:\\s*(#[0-9a-f]{6})`));
      expect([stage, m?.[1]]).toEqual([stage, c.band]);
    }
    expect(v154).not.toMatch(/\.qc154-card\[data-tone="(sand|rose|blue|heather)"\]/);
  });
});

describe("v157 · the page's swatches and the paperclip follow the stage", () => {
  it("group swatches: Offers, Materials, Nudge due, Watch and wait, Gone quiet (unchanged), Closed; a Status group its stage", () => {
    expect(sectionSwatch("attention", "offer")).toBe("#8ea7c6");
    expect(sectionSwatch("attention", "materials")).toBe("#e4ebf2");
    expect(sectionSwatch("attention", "nudge")).toBe("#efe6d6");
    expect(sectionSwatch("attention", "agent")).toBe("#efe6d6");
    expect(sectionSwatch("attention", "quiet")).toBe("#f4efe6");
    expect(sectionSwatch("attention", "closed")).toBe("#eceae6");
    expect(sectionSwatch("status", QueryStatus.FULL_SENT)).toBe(STAGE_COLOURS.full.band);
    expect(sectionSwatch("status", "closed")).toBe(STAGE_COLOURS.closed.band);
  });
  it("the grid card's paperclip accent by stage; the resting ink is the ink 82% over white", () => {
    expect(tabAccent157(QueryStatus.QUERIED)).toMatchObject({ accent: "#e0d2bb", ink: "#5e4c36" });
    expect(tabAccent157(QueryStatus.PARTIAL_SENT)).toMatchObject({ accent: "#cbd7e4", ink: "#3d5370" });
    expect(tabAccent157(QueryStatus.FULL_REQUESTED)).toMatchObject({ accent: "#9db4cf", ink: "#2a4666" });
    expect(tabAccent157(QueryStatus.SIGNED)).toMatchObject({ accent: "#7391b5", ink: "#1b3252" });
    const mix = (h: string) => [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.82 + 255 * 0.18));
    for (const a of Object.values(TAB_ACCENT_157)) expect(mix(a.ink)).toEqual([1, 3, 5].map((i) => parseInt(a.rest.slice(i, i + 2), 16)));
    const card = readFileSync("src/components/queries/centre/QcCard154.tsx", "utf8");
    expect(card).toContain("accent={tabAccent157(r.status)}");
  });
});

describe("v157 · surfaces not on the grid keep today's colours", () => {
  it("the stage ring keeps the v153 fills (its own copy)", () => {
    expect(RING_BUCKETS.slice(0, 4).map((b) => b.fill)).toEqual(["#efe7da", "#ecd6d2", "#d9e1ea", "#e7d6dc"]);
  });
  it("the log-a-query slip and Birds-eye keep the v153 tone names; the slip's paperclip its v153 accent", () => {
    expect(LEGACY_TONE_FILL_153).toEqual({ sand: "#efe7da", rose: "#ecd6d2", blue: "#d9e1ea", heather: "#e7d6dc" });
    expect(legacyTone153(QueryStatus.REJECTED)).toBe("sand");
    expect(legacyTone153(QueryStatus.OFFER)).toBe("heather");
    expect(tabAccent(QueryStatus.PARTIAL_REQUESTED)).toBe(TAB_ACCENT.rose);
    expect(readFileSync("src/components/queries/centre/QcSlip153.tsx", "utf8")).toContain("data-tone={legacyTone153(r.status)}");
    expect(readFileSync("src/components/Queries.tsx", "utf8")).toContain("barKind={(r) => legacyTone153(r.row.status)}");
  });
});
