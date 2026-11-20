/**
 * Query Centre v157 — the slate ladder (lib/stageColours): one table, every status in one stage, and every hex a
 * stylesheet restates equal to it. QC157-1's source half; the computed colours are measured in tests/e2e/qc157.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus } from "../types";
import { OFFER_SHEEN, OFFER_SHEEN_LAYER, STAGE_COLOURS, STAGE_STATUSES, bandBackground, quietBackground, stageOf } from "./stageColours";
import { LEGACY_TONE_FILL_153, SLIP_TONE_FILL, sectionSwatch, slipTone } from "./qc153";
import { STATUS_FILL, STATUS_PALE } from "./qc1512";
import { RING_BUCKETS } from "./qc1531";
import { TAB_ACCENT_157, tabAccent157 } from "./qc1533";

const css = (f: string) => readFileSync(`src/components/queries/centre/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("v157 · the stage table (Stage colours v1: offer rose, and an edge)", () => {
  /* v163 added rim and rimHi (locked in their own block below): these locks read the four uses they were written for */
  const four = ({ band, tint, edge, mark }: { band: string; tint: string; edge: string; mark: string }) => ({ band, tint, edge, mark });
  it("is the pack's table, hex for hex", () => {
    expect(Object.fromEntries(Object.entries(STAGE_COLOURS).map(([k, c]) => [k, four(c)]))).toEqual({
      queried: { band: "#efe6d6", tint: "#f8f4ed", edge: "#e0d2bb", mark: "#dccdb3" },
      partial: { band: "#e4ebf2", tint: "#f3f6f9", edge: "#cbd7e4", mark: "#a9bdd2" },
      full: { band: "#b7c9de", tint: "#dfe7f0", edge: "#9db4cf", mark: "#7391b3" },
      offer: { band: "#efcdc9", tint: "#f8e8e5", edge: "#dfb1ac", mark: "#cf9a96" },
      closed: { band: "#eceae6", tint: "#f6f5f3", edge: "#dedbd5", mark: "#a8a199" },
    });
  });
  it("SC1-2 (source) the offer is rose under the one sheen; no other stage has it; quiet fades a band to white", () => {
    expect(four(STAGE_COLOURS.offer)).toEqual({ band: "#efcdc9", tint: "#f8e8e5", edge: "#dfb1ac", mark: "#cf9a96" });
    expect(OFFER_SHEEN).toBe(`${OFFER_SHEEN_LAYER}, #efcdc9`);
    expect(OFFER_SHEEN_LAYER).toBe("linear-gradient(112deg, rgba(255,255,255,0) 22%, rgba(255,255,255,.55) 40%, rgba(255,255,255,.12) 52%, rgba(255,255,255,0) 66%) 30% 0 / 260% 100% no-repeat");
    expect(bandBackground("offer")).toBe(OFFER_SHEEN);
    for (const s of ["queried", "partial", "full", "closed"] as const) expect(bandBackground(s)).toBe(STAGE_COLOURS[s].band);
    expect(quietBackground("queried")).toBe("linear-gradient(90deg, #efe6d6 0, #efe6d6 26%, #fff 82%)");
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

describe("Stage colours v1 · Phase 2 · the slide-out card", () => {
  const card = readFileSync("src/components/queries/centre/QcCard152.tsx", "utf8");
  const sheet = readFileSync("src/components/queries/centre/sc1card.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("the card publishes its stage's four colours, and its quiet test is the grid card's", () => {
    expect(card).toMatch(/\["--band" as string\]: sc\.band, \["--tint" as string\]: sc\.tint, \["--edge" as string\]: sc\.edge, \["--mark" as string\]: sc\.mark/);
    expect(card).toContain("isQuietCard(r, nowMs)");
    expect(card).toContain(`import "./sc1card.css";`);
    expect(card.indexOf(`import "./sc1card.css";`)).toBeGreaterThan(card.indexOf(`import "./qcv153thread.css";`));
  });
  it("the label: Tint, a 1px ink-at-9% line, 30px, 14px / 600; the mark ink with no disc", () => {
    expect(sheet).toMatch(/\.qc152-pill\[data-stage\] \{ height: 30px; background: var\(--tint\); box-shadow: inset 0 0 0 1px rgba\(28, 19, 15, 0\.09\); font: 600 14px\/1/);
    expect(card).toMatch(/<span className="qc152-cap"><StatusDot status=\{r\.status\} overrideSize=\{17\} tone="ink" decorative \/><\/span>/);
  });
  it("the seals are navy with paper initials", () => {
    expect(sheet).toContain(".qc152 .qc152-disc { background: #2a3a52; color: #f4eee5;");
    expect(sheet).toContain(".qc152 .qc152-av { background: #2a3a52; color: #f4eee5;");
  });
  it("only the agent's offer bubble has the sheen, and it is OFFER_SHEEN restated", () => {
    const m = sheet.match(/\.qc152 \.qc152-m\.them\[data-status="Offer"\]:not\(\.qc1522-draft\) \.qc152-bx \{\s*background:([^;]*);/);
    expect(m).not.toBeNull();
    const norm = (x: string) => x.replace(/\s+/g, "").replace(/0\.(\d)/g, ".$1");
    expect(norm(m![1])).toBe(norm(OFFER_SHEEN));
    expect(sheet.match(/linear-gradient\(112deg/g)?.length).toBe(1);
  });
  it("the To-do desk shows the same card: WsPreview renders QcQueryCard149, which renders QcCard152", () => {
    expect(readFileSync("src/components/todo/ws/WsPreview.tsx", "utf8")).toMatch(/<QcQueryCard149\b/);
    expect(readFileSync("src/components/queries/centre/QcQueryCard149.tsx", "utf8")).toMatch(/<QcCard152\b/);
    expect(readFileSync("src/components/todo/ws/todoWs.css", "utf8")).not.toMatch(/\.qc152-(band|pill|bx|disc|av|fg|fc)\b[^{]*\{[^}]*background/);
  });
});

describe("Stage colours v1 · Phase 4 · Dashboard and Responses", () => {
  it("SC1-15 (source) the Dashboard's week breakdown is the stage Bands; navy is not a stage", async () => {
    const { BREAKDOWN_COLOR } = await import("./dash2");
    const { WEEK_GROUPS } = await import("./dashHover");
    expect(BREAKDOWN_COLOR).toMatchObject({ queried: "#efe6d6", partial: "#e4ebf2", full: "#b7c9de" });
    expect(WEEK_GROUPS.map((g) => g.color)).toEqual(["#efe6d6", "#e4ebf2", "#b7c9de"]);
  });
  it("SC1-15 (source) the Dashboard feed tints an agent's move with its stage's Tint, not the old blue-grey or sand", () => {
    for (const f of ["src/components/dashboard/v2/dash2Feed.css", "src/components/dashboard/f1/df1.css"]) {
      const c = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect([f, c.match(/\[data-kind="request"\] \{ --t: (#[0-9a-f]{6}); \}/)?.[1]]).toEqual([f, STAGE_COLOURS.partial.tint]);
      expect([f, c.match(/\[data-kind="request"\]:is\([^)]*"Revise & Resubmit"\]\) \{ --t: (#[0-9a-f]{6}); \}/)?.[1]]).toEqual([f, STAGE_COLOURS.full.tint]);
      expect([f, c.match(/\[data-kind="offer"\] \{ --t: (#[0-9a-f]{6}); \}/)?.[1]]).toEqual([f, STAGE_COLOURS.offer.tint]);
      expect(c).not.toMatch(/#e2e7ef|#f6ecd6/);
    }
  });
  it("SC1-14 (source) Responses: each tone restates the table; R&R is full; the strip is the stage, never whose move", async () => {
    const r15 = readFileSync("src/components/responses/responses15.css", "utf8");
    const r5 = readFileSync("src/components/responses/responses5.css", "utf8");
    for (const [stage, c] of Object.entries(STAGE_COLOURS)) {
      expect([stage, r15.match(new RegExp(`\\[data-tone="${stage}"\\] \\{ --st: (#[0-9a-f]{6}); --sb: (#[0-9a-f]{6}); --dp: (#[0-9a-f]{6}); \\}`))?.slice(1)]).toEqual([stage, [c.tint, c.band, c.edge]]);
      const strip = r5.match(new RegExp(`\\.rsp5-dst\\[data-tone="${stage}"\\] \\{([^}]*)\\}`))?.[1] ?? "";
      expect([stage, strip.match(/#[0-9a-f]{6}/)?.[0]]).toEqual([stage, c.band]);
    }
    expect(r5).not.toMatch(/rsp5-dst\[data-tone="(you|ag|of|cl)"\]/);
    expect(r15).not.toMatch(/\[data-tone="[px]"\]/);
    const { stripTone } = await import("../components/responses/RspPanel");
    expect(stripTone({ group: "more", row: { status: QueryStatus.REVISE_RESUBMIT } } as never)).toBe("full");
    expect(stripTone({ group: "passed", row: { status: QueryStatus.REJECTED } } as never)).toBe("closed");
  });
});

describe("Stage colours v1 · Phase 5 · the phone", () => {
  it("SC1-16 (source) the phone's statusFill and disc are the stage Bands; Signed sits with the offer", async () => {
    const { statusFill } = await import("../components/phone/v3/V3Parts");
    const { phoneFill } = await import("../components/phone/PhoneDisc");
    for (const s of Object.values(QueryStatus)) {
      expect([s, statusFill(s)]).toEqual([s, STAGE_COLOURS[stageOf(s)].band]);
      expect([s, phoneFill(s)]).toEqual([s, STAGE_COLOURS[stageOf(s)].band]);
    }
    expect(statusFill(QueryStatus.PARTIAL_REQUESTED)).toBe("#e4ebf2");
    expect(statusFill(QueryStatus.SIGNED)).toBe("#efcdc9");
    expect(statusFill(null)).toBe("#efe6d6");
  });
  it("the phone query page's strip and the agent's bubbles are the stage band, the sheen on an offer", () => {
    const q = readFileSync("src/components/phone/v4/QueryPageV4.tsx", "utf8");
    expect(q).toContain("style={{ background: bandBackground(stageOf(String(v.row.status))), color: STAGE_INK }} data-pa4=\"band\"");
    expect(q).toContain("background: t.status ? bandBackground(stageOf(t.status)) : statusFill(t.status)");
    for (const f of ["src/components/phone/v5/BirdsBlockV5.tsx", "src/components/phone/v5/BirdsViewV5.tsx"])
      expect([f, /background: bandBackground\(stageOf(Status)?\(String\(cur\.status\)\)\)/.test(readFileSync(f, "utf8"))]).toEqual([f, true]);
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
    expect(sectionSwatch("attention", "offer")).toBe("#efcdc9");
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
    expect(tabAccent157(QueryStatus.SIGNED)).toMatchObject({ accent: "#dfb1ac", ink: "#7a3f3c" });
    expect(tabAccent157(QueryStatus.OFFER)).toMatchObject({ accent: "#dfb1ac", ink: "#7a3f3c", rest: "#92625f" });
    const mix = (h: string) => [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.82 + 255 * 0.18));
    for (const a of Object.values(TAB_ACCENT_157)) expect(mix(a.ink)).toEqual([1, 3, 5].map((i) => parseInt(a.rest.slice(i, i + 2), 16)));
    const card = readFileSync("src/components/queries/centre/QcCard154.tsx", "utf8");
    expect(card).toContain("accent={tabAccent157(r.status)}");
  });
});

describe("Stage colours v1 · Phase 3 · the rest of the Query Centre reads the table", () => {
  it("the unreachable stage ring keeps its own v153 fills (QcStageRing1531 is rendered by no route; AUDIT.md)", () => {
    expect(RING_BUCKETS.slice(0, 4).map((b) => b.fill)).toEqual(["#efe7da", "#ecd6d2", "#d9e1ea", "#e7d6dc"]);
    expect(LEGACY_TONE_FILL_153).toEqual({ sand: "#efe7da", rose: "#ecd6d2", blue: "#d9e1ea", heather: "#e7d6dc" });
  });
  it("STATUS_FILL and STATUS_PALE are the five stages' Band and Tint (Who replied's cap reads them)", () => {
    expect(STATUS_FILL).toEqual({ sand: "#efe6d6", pink: "#e4ebf2", navy: "#b7c9de", sage: "#efcdc9", grey: "#eceae6" });
    expect(STATUS_PALE).toEqual({ sand: "#f8f4ed", pink: "#f3f6f9", navy: "#dfe7f0", sage: "#f8e8e5", grey: "#f6f5f3" });
    expect(readFileSync("src/lib/qc1512.ts", "utf8").match(/export const STATUS_(FILL|PALE)[^;]*;/gs)!.join("")).not.toMatch(/#[0-9a-f]{6}/i);
  });
  it("the log-a-query slip and Birds-eye take the stage", () => {
    expect(readFileSync("src/components/queries/centre/QcSlip153.tsx", "utf8")).toContain("data-tone={slipTone(r.status)}");
    expect(readFileSync("src/components/Queries.tsx", "utf8")).toContain("barKind={(r) => stageOf(r.row.status)}");
    const v153 = css("qcv153.css");
    for (const [stage, c] of Object.entries(STAGE_COLOURS)) {
      expect([stage, v153.match(new RegExp(`\\.qc153-slip\\[data-tone="${stage}"\\]\\s*\\{\\s*--tone:\\s*(#[0-9a-f]{6})`))?.[1]]).toEqual([stage, c.band]);
      const bar = v153.match(new RegExp(`\\.qc150-bar--cur\\[data-sk="${stage}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? "";
      expect([stage, bar.match(/#[0-9a-f]{6}/)?.[0]]).toEqual([stage, c.band]);
    }
  });
  it("SC1-12 (source) one stage, one colour on Birds-eye: no watch-and-wait shade, no requested/sent tone; only the offer has the sheen", () => {
    const all = css("qcv150.css") + css("qcv151.css") + css("qcv153.css");
    expect(all).not.toMatch(/\.qc150-br--w\s+\.qc150-(bar--cur|t-)/);
    expect(all).not.toMatch(/\.qc150-t-[qrso]\s*\{/);
    expect(all).not.toMatch(/data-sk="(sand|rose|blue|heather|pink|navy|sage)"/);
    const sheen = all.match(/\.qc150-bar--cur\[data-sk="[a-z]+"\]\s*\{[^}]*112deg/g) ?? [];
    expect(sheen.map((r) => r.match(/data-sk="([a-z]+)"/)![1])).toEqual(["offer"]);
  });
});

/* Query card v163 — the rim's colours: the slide-in card's border breathes in `rim` and its landing light runs in
   `rim` → `rimHi` (qcMotion160). Deeper than `band`, so they read on the white rim. Used by that rim only. */
describe("Query card v163 — rim and rimHi, one pair per stage", () => {
  const RIM: Record<string, { rim: string; rimHi: string }> = {
    queried: { rim: "#bfa87e", rimHi: "#f3ead9" },
    partial: { rim: "#6f8fb3", rimHi: "#d6e1ee" },
    full: { rim: "#557aa3", rimHi: "#c5d4e6" },
    offer: { rim: "#c98f8a", rimHi: "#f6dedb" },
    closed: { rim: "#9a9389", rimHi: "#e6e3de" },
  };
  it("all five stages carry both keys, as literal lower-case hex, equal to the pack's table", () => {
    expect(Object.keys(STAGE_COLOURS).sort()).toEqual(Object.keys(RIM).sort());
    for (const [stage, c] of Object.entries(STAGE_COLOURS)) {
      expect([stage, c.rim, c.rimHi]).toEqual([stage, RIM[stage].rim, RIM[stage].rimHi]);
      expect(c.rim).toMatch(/^#[0-9a-f]{6}$/);
      expect(c.rimHi).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it("the source writes them as literals in the table, not computed", () => {
    const src = readFileSync("src/lib/stageColours.ts", "utf8");
    for (const [stage, c] of Object.entries(RIM)) {
      expect(src).toMatch(new RegExp(`\\b${stage}: \\{[^}]*rim: "${c.rim}", rimHi: "${c.rimHi}" \\}`));
    }
  });
});
