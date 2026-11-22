/**
 * Plumage colours v1 — the one table (lib/stageColours): the pack's hexes (design-refs/plumage-colours-v1/
 * plumage-colours-v1.json, the oracle) with Nick's one amendment, the offer navy; every status in one stage, its band
 * (two shades for partial and full), the with-you outline, no sheen anywhere in `src/`, and every hex a stylesheet
 * restates equal to the table. The computed colours are measured in tests/e2e/pc1.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus } from "../types";
import {
  ACCENT_INK, OFFER_INK, PLUMAGE_NAVY, STAGE_COLOURS, STAGE_INK, STAGE_STATUSES, WITH_YOU_OUTLINE_PX,
  bandBackground, bandInk, quietBackground, stageOf, statusBand, withYouOutline, withYouShadow,
} from "./stageColours";
import { LEGACY_TONE_FILL_153, SLIP_TONE_FILL, sectionSwatch, slipTone } from "./qc153";
import { STATUS_FILL, STATUS_PALE } from "./qc1512";
import { RING_BUCKETS } from "./qc1531";
import { TAB_ACCENT_157, tabAccent157 } from "./qc1533";

const css = (f: string) => readFileSync(`src/components/queries/centre/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const PACK = JSON.parse(readFileSync("design-refs/plumage-colours-v1/plumage-colours-v1.json", "utf8"));

/** Nick's amendment (22 Nov): the offer is the app's navy, not the pack's gold; the rest mixed from it by the pack's rules */
const OFFER_NAVY = { band: "#2a3a52", bandRequested: "#2a3a52", tint: "#d9dce0", edge: "#243247", mark: "#243247", rim: "#243247", rimHi: "#aab0ba" };
/** the pack's status names → the enum's */
const STATUS_OF: Record<string, QueryStatus> = {
  Queried: QueryStatus.QUERIED, "Partial requested": QueryStatus.PARTIAL_REQUESTED, "Partial sent": QueryStatus.PARTIAL_SENT,
  "Full requested": QueryStatus.FULL_REQUESTED, "Full sent": QueryStatus.FULL_SENT, "Revise and resubmit": QueryStatus.REVISE_RESUBMIT,
  Resubmitted: QueryStatus.RESUBMITTED, Offer: QueryStatus.OFFER, Signed: QueryStatus.SIGNED, Rejected: QueryStatus.REJECTED,
  "No response": QueryStatus.NO_RESPONSE, Withdrawn: QueryStatus.WITHDRAWN,
};

describe("Plumage colours v1 · the table", () => {
  it("is the pack's table hex for hex (partial and full: band = the sent shade), the offer navy by Nick's amendment", () => {
    for (const k of ["queried", "partial", "full", "closed"] as const) {
      const p = PACK.stages[k];
      const band = p.band ?? p.bandSent;
      expect([k, STAGE_COLOURS[k]]).toEqual([k, { band, bandRequested: p.bandRequested ?? band, tint: p.tint, edge: p.edge, mark: p.mark, rim: p.rim, rimHi: p.rimHi }]);
    }
    expect(STAGE_COLOURS.offer).toEqual(OFFER_NAVY);
    expect(STAGE_COLOURS.offer.band).toBe(PACK.navy);
  });
  it("the navy offer's tint, edge and rimHi are the navy mixed by the pack's own rules (which give the pack's gold values from the beak)", () => {
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const hex = (a: number[]) => `#${a.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
    const white = (h: string, pc: number) => hex(rgb(h).map((c) => 255 - pc * (255 - c)));
    const dark = (h: string, pc: number) => hex(rgb(h).map((c) => c * pc));
    /* the rules, proved on the beak first */
    expect([white("#e49c54", 0.18), dark("#e49c54", 0.86), white("#e49c54", 0.4)]).toEqual([PACK.stages.offer.tint, PACK.stages.offer.edge, PACK.stages.offer.rimHi]);
    expect([white(PACK.navy, 0.18), dark(PACK.navy, 0.86), white(PACK.navy, 0.4)]).toEqual([OFFER_NAVY.tint, OFFER_NAVY.edge, OFFER_NAVY.rimHi]);
  });
  it("Queried and Closed are unchanged", () => {
    expect(STAGE_COLOURS.queried).toMatchObject({ band: "#efe6d6", tint: "#f8f4ed", edge: "#e0d2bb", mark: "#dccdb3", rim: "#bfa87e", rimHi: "#f3ead9" });
    expect(STAGE_COLOURS.closed).toMatchObject({ band: "#eceae6", tint: "#f6f5f3", edge: "#dedbd5", mark: "#a8a199", rim: "#857e74", rimHi: "#e6e3de" });
  });
  it("every status is in exactly one stage; R&R and Resubmitted are Full, Signed is Offer, closed is closed", () => {
    for (const s of Object.values(QueryStatus)) expect([s, Object.values(STAGE_STATUSES).filter((l) => l.includes(s)).length]).toEqual([s, 1]);
    expect(stageOf(QueryStatus.REVISE_RESUBMIT)).toBe("full");
    expect(stageOf(QueryStatus.RESUBMITTED)).toBe("full");
    expect(stageOf(QueryStatus.SIGNED)).toBe("offer");
    for (const s of [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]) expect(stageOf(s)).toBe("closed");
  });
});

describe("Plumage colours v1 · the status band", () => {
  it("is the pack's statusBand for every status (the offer's navy), and covers every status", () => {
    expect(Object.keys(PACK.statusBand).map((k) => STATUS_OF[k]).sort()).toEqual([...Object.values(QueryStatus)].sort());
    for (const [name, hex] of Object.entries(PACK.statusBand as Record<string, string>)) {
      const s = STATUS_OF[name];
      expect([name, statusBand(s)]).toEqual([name, stageOf(s) === "offer" ? PLUMAGE_NAVY : hex]);
    }
  });
  it("partial and full have two shades; every other stage one", () => {
    expect([statusBand(QueryStatus.PARTIAL_REQUESTED), statusBand(QueryStatus.PARTIAL_SENT)]).toEqual(["#f1d9cf", "#e8c0af"]);
    expect([statusBand(QueryStatus.FULL_REQUESTED), statusBand(QueryStatus.FULL_SENT)]).toEqual(["#d4d4da", "#b5b6c0"]);
    expect([statusBand(QueryStatus.REVISE_RESUBMIT), statusBand(QueryStatus.RESUBMITTED)]).toEqual(["#b5b6c0", "#b5b6c0"]);
    expect([statusBand(QueryStatus.OFFER), statusBand(QueryStatus.SIGNED)]).toEqual(["#2a3a52", "#2a3a52"]);
    for (const s of ["queried", "offer", "closed"] as const) expect(STAGE_COLOURS[s].bandRequested).toBe(STAGE_COLOURS[s].band);
    expect(statusBand(null)).toBe("#efe6d6");
    expect(statusBand("not a status")).toBe("#efe6d6");
  });
  it("bandBackground is the flat status band; quiet fades it to white", () => {
    for (const s of Object.values(QueryStatus)) expect([s, bandBackground(s)]).toEqual([s, statusBand(s)]);
    expect(quietBackground(QueryStatus.QUERIED)).toBe("linear-gradient(90deg, #efe6d6 0, #efe6d6 26%, #fff 82%)");
    expect(quietBackground(QueryStatus.PARTIAL_SENT)).toBe("linear-gradient(90deg, #e8c0af 0, #e8c0af 26%, #fff 82%)");
  });
  it("text and marks: ink on every band, the paper on the offer's navy", () => {
    expect([STAGE_INK, OFFER_INK]).toEqual([PACK.ink, "#f4eee5"]);
    for (const s of Object.values(QueryStatus)) expect([s, bandInk(s)]).toEqual([s, stageOf(s) === "offer" ? OFFER_INK : STAGE_INK]);
  });
});

describe("Plumage colours v1 · the with-you outline", () => {
  it("is the pack's map: Partial requested and Full requested in the sent shade, R&R navy; nothing else", () => {
    expect(WITH_YOU_OUTLINE_PX).toBe(3);
    expect(PACK.withYouOutline.width).toMatch(/^3px/);
    for (const name of ["Partial requested", "Full requested", "Revise and resubmit"]) expect([name, withYouOutline(STATUS_OF[name])]).toEqual([name, PACK.withYouOutline[name]]);
    expect(withYouOutline(QueryStatus.PARTIAL_REQUESTED)).toBe(STAGE_COLOURS.partial.band);
    expect(withYouOutline(QueryStatus.FULL_REQUESTED)).toBe(STAGE_COLOURS.full.band);
    expect(withYouOutline(QueryStatus.REVISE_RESUBMIT)).toBe(PACK.navy);
    const with3 = Object.values(QueryStatus).filter((s) => withYouOutline(s));
    expect(with3.sort()).toEqual([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT].sort());
    expect(withYouShadow(QueryStatus.REVISE_RESUBMIT)).toBe("inset 0 0 0 3px #2a3a52");
    expect(withYouShadow(QueryStatus.FULL_SENT)).toBe("none");
    expect(withYouOutline(null)).toBeNull();
  });
  it("the accent inks are the pack's, but the offer's, which is the paper on navy", () => {
    expect({ partial: ACCENT_INK.partial, full: ACCENT_INK.full }).toEqual({ partial: PACK.accentInk.partial, full: PACK.accentInk.full });
    expect(ACCENT_INK.offer).toBe(OFFER_INK);
  });
});

describe("Plumage colours v1 · no sheen anywhere in src/", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk("src");
  it("the OFFER_SHEEN names and the sheen's gradient are gone", () => {
    expect(files.length).toBeGreaterThan(500);
    const hits = files.filter((f) => /OFFER_SHEEN|linear-gradient\(112deg, rgba\(255, ?255, ?255, ?0\) 22%/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
  it("no stylesheet still writes the old ladder's partial, full or rose offer bands", () => {
    const OLD = /#(e4ebf2|b7c9de|efcdc9)\b/i;
    const allowed = new Set(["src/components/analytics/a26.css"]); /* Analytics' own blue, not a stage (AUDIT.md: no stage fill) */
    const hits = files.filter((f) => !allowed.has(f) && OLD.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")));
    expect(hits).toEqual([]);
  });
});

describe("Plumage colours v1 · the slide-out card's stylesheet", () => {
  const card = readFileSync("src/components/queries/centre/QcCard152.tsx", "utf8");
  const sheet = readFileSync("src/components/queries/centre/sc1card.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("the card publishes its stage's four colours, and its quiet test is the grid card's", () => {
    expect(card).toMatch(/\["--band" as string\]: [a-zA-Z.()]+, \["--tint" as string\]: sc\.tint, \["--edge" as string\]: sc\.edge, \["--mark" as string\]: sc\.mark/);
    expect(card).toContain("isQuietCard(r, nowMs)");
    expect(card).toContain(`import "./sc1card.css";`);
    expect(card.indexOf(`import "./sc1card.css";`)).toBeGreaterThan(card.indexOf(`import "./qcv153thread.css";`));
  });
  it("the label: Tint, a 1px ink-at-9% line, 30px, 14px / 600; the mark ink with no disc", () => {
    expect(sheet).toMatch(/\.qc152-pill\[data-stage\] \{ height: 30px; background: var\(--tint\); box-shadow: inset 0 0 0 1px rgba\(28, 19, 15, 0\.09\); font: 600 14px\/1/);
    expect(card).not.toContain(`data-qc152="pill"`);
    expect(card).toContain(`<Track153 t={ss.track} status={r.status} />`);
  });
  it("the seals are navy with paper initials", () => {
    expect(sheet).toContain(".qc152 .qc152-disc { background: #2a3a52; color: #f4eee5;");
    expect(sheet).toContain(".qc152 .qc152-av { background: #2a3a52; color: #f4eee5;");
  });
  it("the To-do desk shows the same card: WsPreview renders QcQueryCard149, which renders QcCard152", () => {
    expect(readFileSync("src/components/todo/ws/WsPreview.tsx", "utf8")).toMatch(/<QcQueryCard149\b/);
    expect(readFileSync("src/components/queries/centre/QcQueryCard149.tsx", "utf8")).toMatch(/<QcCard152\b/);
    expect(readFileSync("src/components/todo/ws/todoWs.css", "utf8")).not.toMatch(/\.qc152-(band|pill|bx|disc|av|fg|fc)\b[^{]*\{[^}]*background/);
  });
});

describe("Plumage colours v1 · Dashboard and Responses restate the table", () => {
  it("the Dashboard's week breakdown is the stages' (sent) bands", async () => {
    const { BREAKDOWN_COLOR } = await import("./dash2");
    const { WEEK_GROUPS } = await import("./dashHover");
    expect(BREAKDOWN_COLOR).toMatchObject({ queried: "#efe6d6", partial: "#e8c0af", full: "#b5b6c0" });
    expect(WEEK_GROUPS.map((g) => g.color)).toEqual(["#efe6d6", "#e8c0af", "#b5b6c0"]);
  });
  it("the Dashboard feed tints an agent's move with its stage's Tint", () => {
    for (const f of ["src/components/dashboard/v2/dash2Feed.css", "src/components/dashboard/f1/df1.css"]) {
      const c = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect([f, c.match(/\[data-kind="request"\] \{ --t: (#[0-9a-f]{6}); \}/)?.[1]]).toEqual([f, STAGE_COLOURS.partial.tint]);
      expect([f, c.match(/\[data-kind="request"\]:is\([^)]*"Revise & Resubmit"\]\) \{ --t: (#[0-9a-f]{6}); \}/)?.[1]]).toEqual([f, STAGE_COLOURS.full.tint]);
      expect([f, c.match(/\[data-kind="offer"\] \{ --t: (#[0-9a-f]{6}); \}/)?.[1]]).toEqual([f, STAGE_COLOURS.offer.tint]);
    }
  });
  it("Responses: each tone restates the table; R&R is full; the strip is the stage, never whose move", async () => {
    const r15 = readFileSync("src/components/responses/responses15.css", "utf8");
    const r5 = readFileSync("src/components/responses/responses5.css", "utf8");
    for (const [stage, c] of Object.entries(STAGE_COLOURS)) {
      expect([stage, r15.match(new RegExp(`\\[data-tone="${stage}"\\] \\{ --st: (#[0-9a-f]{6}); --sb: (#[0-9a-f]{6}); --dp: (#[0-9a-f]{6}); \\}`))?.slice(1)]).toEqual([stage, [c.tint, c.band, c.edge]]);
      const strip = r5.match(new RegExp(`\\.rsp5-dst\\[data-tone="${stage}"\\] \\{([^}]*)\\}`))?.[1] ?? "";
      expect([stage, strip.match(/#[0-9a-f]{6}/)?.[0]]).toEqual([stage, c.band]);
    }
    const { stripTone } = await import("../components/responses/RspPanel");
    expect(stripTone({ group: "more", row: { status: QueryStatus.REVISE_RESUBMIT } } as never)).toBe("full");
    expect(stripTone({ group: "passed", row: { status: QueryStatus.REJECTED } } as never)).toBe("closed");
  });
});

describe("Plumage colours v1 · the phone", () => {
  it("Phase 4: the phone's statusFill and disc are the status bands; Signed sits with the offer", async () => {
    const { statusFill } = await import("../components/phone/v3/V3Parts");
    const { phoneFill } = await import("../components/phone/PhoneDisc");
    for (const s of Object.values(QueryStatus)) {
      expect([s, statusFill(s)]).toEqual([s, statusBand(s)]);
      expect([s, phoneFill(s)]).toEqual([s, statusBand(s)]);
    }
    expect(statusFill(null)).toBe("#efe6d6");
  });
  it("the phone query page's strip and the agent's bubbles are the flat status band", () => {
    const q = readFileSync("src/components/phone/v4/QueryPageV4.tsx", "utf8");
    expect(q).toContain("background: bandBackground(String(v.row.status)), color: bandInk(String(v.row.status))");
    expect(q).toContain("background: t.status ? bandBackground(t.status) : statusFill(t.status)");
    for (const f of ["src/components/phone/v5/BirdsBlockV5.tsx", "src/components/phone/v5/BirdsViewV5.tsx"])
      expect([f, /background: bandBackground\(String\(cur\.status\)\)/.test(readFileSync(f, "utf8"))]).toEqual([f, true]);
  });
});

describe("Plumage colours v1 · the Query Centre's stylesheets restate the table", () => {
  it("Phase 2: the grid card and the slip take --tone inline from statusBand, with the outline from withYouOutline; no stylesheet restates a stage's tone", () => {
    const card = readFileSync("src/components/queries/centre/QcCard154.tsx", "utf8");
    expect(card).toContain("const band = statusBand(r.status);");
    expect(card).toContain("const wy = withYouOutline(r.status);");
    expect(card).toContain('style={{ "--tone": band, ...(wy ? { "--wy": wy } : {}) } as React.CSSProperties}');
    const slip = readFileSync("src/components/queries/centre/QcSlip153.tsx", "utf8");
    expect(slip).toContain('style={{ "--tone": statusBand(r.status), ...(withYouOutline(r.status) ? { "--wy": withYouOutline(r.status) } : {}) } as React.CSSProperties}');
    expect(css("qcv154.css")).not.toMatch(/data-tone="[a-z]+"\]\s*\{\s*--tone/);
    expect(css("qcv153.css")).not.toMatch(/data-tone="[a-z]+"\]\s*\{\s*--tone/);
  });
  it("Phase 2: the outline is 3px inside the band, top corners the frame's inner radius, bottom square", () => {
    expect(css("qcv154.css")).toContain(".qc154-card[data-wy] .qc154-hd { box-shadow: inset 0 0 0 3px var(--wy); border-radius: 12px 12px 0 0; }");
    expect(css("qcv154.css")).toMatch(/\.qc154-in \{[^}]*border: 1px solid #e3d5c9; border-radius: 13px;/);
    expect(css("qcv153.css")).toContain(".qc153-slip[data-wy] .qc153-top { box-shadow: inset 0 0 0 3px var(--wy); border-radius: 13px 13px 0 0; }");
    expect(readFileSync("src/components/containers/framedSlip.css", "utf8")).toMatch(/\.sa-slip-in \{[^}]*border: 1px solid #e3d5c9;\s*border-radius: 14px;/);
  });
  it("slipTone is the stage, and the fill its band — a closed card is grey, not sand", () => {
    for (const s of Object.values(QueryStatus)) expect(slipTone(s)).toBe(stageOf(s));
    for (const [k, v] of Object.entries(SLIP_TONE_FILL)) expect(v).toBe(STAGE_COLOURS[k as keyof typeof STAGE_COLOURS].band);
    expect(SLIP_TONE_FILL[slipTone(QueryStatus.REJECTED)]).toBe("#eceae6");
  });
  it("group swatches: Offers, Materials, Nudge due, Watch and wait, Gone quiet (unchanged), Closed; a Status group its stage", () => {
    expect(sectionSwatch("attention", "offer")).toBe("#2a3a52");
    expect(sectionSwatch("attention", "materials")).toBe("#f1d9cf"); /* Phase 2: the Partial requested band */
    expect(sectionSwatch("attention", "nudge")).toBe("#efe6d6");
    expect(sectionSwatch("attention", "agent")).toBe("#efe6d6");
    expect(sectionSwatch("attention", "quiet")).toBe("#f4efe6");
    expect(sectionSwatch("attention", "closed")).toBe("#eceae6");
    expect(sectionSwatch("status", QueryStatus.FULL_SENT)).toBe(STAGE_COLOURS.full.band);
    expect(sectionSwatch("status", QueryStatus.FULL_REQUESTED)).toBe("#d4d4da"); /* Phase 2: a Status group its status's band */
    expect(sectionSwatch("status", "closed")).toBe(STAGE_COLOURS.closed.band);
  });
  it("the paperclip accent is the stage's edge and the pack's accent ink; the resting ink is the ink 82% over white", () => {
    expect(tabAccent157(QueryStatus.QUERIED)).toMatchObject({ accent: "#e0d2bb", ink: "#5e4c36" });
    for (const k of ["partial", "full", "offer"] as const) expect([k, TAB_ACCENT_157[k].accent, TAB_ACCENT_157[k].ink]).toEqual([k, STAGE_COLOURS[k].edge, ACCENT_INK[k]]);
    expect(tabAccent157(QueryStatus.SIGNED)).toEqual(TAB_ACCENT_157.offer);
    const mix = (h: string) => [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.82 + 255 * 0.18));
    for (const a of Object.values(TAB_ACCENT_157)) expect(mix(a.ink)).toEqual([1, 3, 5].map((i) => parseInt(a.rest.slice(i, i + 2), 16)));
    expect(readFileSync("src/components/queries/centre/QcCard154.tsx", "utf8")).toContain("accent={tabAccent157(r.status)}");
  });
  it("the unreachable stage ring keeps its own v153 fills (QcStageRing1531 is rendered by no route; AUDIT.md)", () => {
    expect(RING_BUCKETS.slice(0, 4).map((b) => b.fill)).toEqual(["#efe7da", "#ecd6d2", "#d9e1ea", "#e7d6dc"]);
    expect(LEGACY_TONE_FILL_153).toEqual({ sand: "#efe7da", rose: "#ecd6d2", blue: "#d9e1ea", heather: "#e7d6dc" });
  });
  it("STATUS_FILL and STATUS_PALE are the five stages' band and tint (Who replied's cap reads them)", () => {
    expect(STATUS_FILL).toEqual({ sand: "#efe6d6", pink: "#e8c0af", navy: "#b5b6c0", sage: "#2a3a52", grey: "#eceae6" });
    expect(STATUS_PALE).toEqual({ sand: "#f8f4ed", pink: "#f9f0ec", navy: "#ededef", sage: "#d9dce0", grey: "#f6f5f3" });
    expect(readFileSync("src/lib/qc1512.ts", "utf8").match(/export const STATUS_(FILL|PALE)[^;]*;/gs)!.join("")).not.toMatch(/#[0-9a-f]{6}/i);
  });
  it("Phase 2: the log-a-query slip keeps its stage tone; each Birds-eye current bar takes its status's band inline", () => {
    expect(readFileSync("src/components/queries/centre/QcSlip153.tsx", "utf8")).toContain("data-tone={slipTone(r.status)}");
    expect(readFileSync("src/components/Queries.tsx", "utf8")).toContain("barFill={(r) => statusBand(r.row.status)}");
    expect(readFileSync("src/components/queries/centre/QcBirds150.tsx", "utf8")).toContain("...(barFill ? { background: barFill(r) } : {})");
    expect(css("qcv153.css")).not.toMatch(/\.qc150-bar--cur\[data-sk="[a-z]+"\]\s*\{[^}]*#[0-9a-f]{6}/);
    const all = css("qcv150.css") + css("qcv151.css") + css("qcv153.css");
    expect(all).not.toMatch(/\.qc150-br--w\s+\.qc150-(bar--cur|t-)/);
    expect(all).not.toMatch(/data-sk="(sand|rose|blue|heather|pink|navy|sage)"/);
  });
});

/* Query card v163 — the rim's colours: the slide-in card's border breathes in `rim` and its landing light runs in
   `rim` → `rimHi` (qcMotion160). Plumage colours v1 gives them new values; they stay literals in the table. */
describe("rim and rimHi, one pair per stage", () => {
  it("the source writes them as literals in the table, not computed", () => {
    const src = readFileSync("src/lib/stageColours.ts", "utf8");
    for (const [stage, c] of Object.entries(STAGE_COLOURS)) {
      expect(src).toMatch(new RegExp(`\\b${stage}: \\{[^}]*rim: "${c.rim}", rimHi: "${c.rimHi}" \\}`));
      expect(c.rim).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("Plumage colours v1 · Phase 4 · the outline is on card bands and strips only", () => {
  const read = (f: string) => readFileSync(f, "utf8");
  it("these draw it: the grid card, the slip, the slide-out strip, the phone query page band, the Responses strip, Next up's head", () => {
    for (const f of [
      "src/components/queries/centre/QcCard154.tsx", "src/components/queries/centre/QcSlip153.tsx", "src/components/queries/centre/QcCard152.tsx",
      "src/components/phone/v4/QueryPageV4.tsx", "src/components/responses/RspPanel.tsx", "src/components/dashboard/v2/Dash2Next.tsx",
    ]) expect([f, read(f).includes("withYouOutline(")]).toEqual([f, true]);
  });
  it("these never do: bars, bubbles, chips, discs and chart segments", () => {
    for (const f of [
      "src/lib/qcThread152.ts", "src/components/phone/PhoneDisc.tsx", "src/components/phone/v3/V3Parts.tsx", "src/components/phone/v5/BirdsBlockV5.tsx",
      "src/components/phone/v5/BirdsViewV5.tsx", "src/components/queries/centre/QcBirds150.tsx", "src/components/shell/SearchDesk.tsx",
      "src/components/shell/StageFilter.tsx", "src/components/shell/AppliedRow.tsx", "src/lib/dash2.ts", "src/lib/dashHover.ts",
    ]) expect([f, /withYouOutline|withYouShadow|--wy/.test(read(f))]).toEqual([f, false]);
  });
  it("the To-do desk takes the status band where it knows the status; Versions' chart takes the marks", () => {
    expect(read("src/components/todo/ws/TodoWorkspace.tsx")).toContain("stageVars(stage, t.query?.status)");
    expect(read("src/components/versions/v6/versionsV6.css")).toContain(`--v6-chart-queried: ${STAGE_COLOURS.queried.mark}; --v6-chart-partial: ${STAGE_COLOURS.partial.mark}; --v6-chart-full: ${STAGE_COLOURS.full.mark};`);
    expect(read("src/components/versions/v6/versionsV6.css")).toContain(`--v6-stage-queried: ${STAGE_COLOURS.queried.band}; --v6-stage-partial: ${STAGE_COLOURS.partial.band}; --v6-stage-full: ${STAGE_COLOURS.full.band};`);
  });
});
