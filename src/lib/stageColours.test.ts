/**
 * Plumage colours v3 — the one table (lib/stageColours): Queried, Partial and Closed from design-refs/plumage-colours-v1/
 * plumage-colours-v1.json, the Offer from plumage-colours-v2.json, Full and the R&R stripes from plumage-colours-v3.json
 * (the oracles);
 * every status in one stage, its band (two shades for partial and full), no outline, ink on every band, no sheen
 * anywhere in `src/`, and every hex a stylesheet restates equal to the table. Measured in tests/e2e/pc3.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus } from "../types";
import {
  ACCENT_INK, RR_STRIPES, STAGE_COLOURS, STAGE_INK, STAGE_STATUSES,
  bandBackground, bandInk, quietBackground, stageInk, stageOf, statusBand,
} from "./stageColours";
import * as TABLE from "./stageColours";
import { LEGACY_TONE_FILL_153, SLIP_TONE_FILL, sectionSwatch, slipTone } from "./qc153";
import { STATUS_FILL, STATUS_PALE } from "./qc1512";
import { RING_BUCKETS } from "./qc1531";
import { TAB_ACCENT_157, tabAccent157 } from "./qc1533";

const css = (f: string) => readFileSync(`src/components/queries/centre/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const PACK = JSON.parse(readFileSync("design-refs/plumage-colours-v1/plumage-colours-v1.json", "utf8"));
const V2 = JSON.parse(readFileSync("design-refs/plumage-colours-v2/plumage-colours-v2.json", "utf8"));
const V3 = JSON.parse(readFileSync("design-refs/plumage-colours-v3/plumage-colours-v3.json", "utf8"));
/** v3's status bands: v1's, the Offer from v2, Full from v3 (R&R on the Full requested band, Resubmitted on Full sent) */
const V2_BAND: Record<string, string> = {
  ...PACK.statusBand, "Full requested": V3.stages.full.bandRequested, "Full sent": V3.stages.full.band,
  "Revise and resubmit": V3.stages.full.bandRequested, Resubmitted: V3.stages.full.band, Offer: V2.stages.offer.band, Signed: V2.stages.offer.band,
};
/** the pack's status names → the enum's */
const STATUS_OF: Record<string, QueryStatus> = {
  Queried: QueryStatus.QUERIED, "Partial requested": QueryStatus.PARTIAL_REQUESTED, "Partial sent": QueryStatus.PARTIAL_SENT,
  "Full requested": QueryStatus.FULL_REQUESTED, "Full sent": QueryStatus.FULL_SENT, "Revise and resubmit": QueryStatus.REVISE_RESUBMIT,
  Resubmitted: QueryStatus.RESUBMITTED, Offer: QueryStatus.OFFER, Signed: QueryStatus.SIGNED, Rejected: QueryStatus.REJECTED,
  "No response": QueryStatus.NO_RESPONSE, Withdrawn: QueryStatus.WITHDRAWN,
};

describe("Plumage colours v3 · the table", () => {
  it("Queried, Partial and Closed are v1's pack hex for hex (band = the sent shade); the Offer is v2's; Full is v3's", () => {
    for (const k of ["queried", "partial", "closed"] as const) {
      const p = PACK.stages[k];
      const band = p.band ?? p.bandSent;
      expect([k, STAGE_COLOURS[k]]).toEqual([k, { band, bandRequested: p.bandRequested ?? band, tint: p.tint, edge: p.edge, mark: p.mark, rim: p.rim, rimHi: p.rimHi }]);
    }
    expect(STAGE_COLOURS.offer).toEqual(V2.stages.offer);
    expect(STAGE_COLOURS.full).toEqual(V3.stages.full);
    expect(STAGE_COLOURS.full).toEqual({ band: "#b9c9da", bandRequested: "#d3deea", tint: "#eff3f7", edge: "#9fb3c8", mark: "#6f8fb0", rim: "#6f8fb0", rimHi: "#d3deea" });
    expect(STAGE_COLOURS.offer).toEqual({ band: "#c5e0d8", bandRequested: "#c5e0d8", tint: "#eef6f3", edge: "#a9cdc2", mark: "#7fb3a5", rim: "#7fb3a5", rimHi: "#e2f0ec" });
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

describe("Plumage colours v3 · the status band", () => {
  it("is v1's statusBand with the Offer from v2 and Full from v3, and covers every status", () => {
    expect(Object.keys(V2_BAND).map((k) => STATUS_OF[k]).sort()).toEqual([...Object.values(QueryStatus)].sort());
    for (const [name, hex] of Object.entries(V2_BAND)) expect([name, statusBand(STATUS_OF[name])]).toEqual([name, hex]);
  });
  it("partial and full have two shades; every other stage one", () => {
    expect([statusBand(QueryStatus.PARTIAL_REQUESTED), statusBand(QueryStatus.PARTIAL_SENT)]).toEqual(["#f1d9cf", "#e8c0af"]);
    expect([statusBand(QueryStatus.FULL_REQUESTED), statusBand(QueryStatus.FULL_SENT)]).toEqual(["#d3deea", "#b9c9da"]);
    expect([statusBand(QueryStatus.REVISE_RESUBMIT), statusBand(QueryStatus.RESUBMITTED)]).toEqual(["#d3deea", "#b9c9da"]);
    expect([statusBand(QueryStatus.OFFER), statusBand(QueryStatus.SIGNED)]).toEqual(["#c5e0d8", "#c5e0d8"]);
    for (const s of ["queried", "offer", "closed"] as const) expect(STAGE_COLOURS[s].bandRequested).toBe(STAGE_COLOURS[s].band);
    expect(statusBand(null)).toBe("#efe6d6");
    expect(statusBand("not a status")).toBe("#efe6d6");
  });
  it("quiet fades the status band to white", () => {
    expect(quietBackground(QueryStatus.QUERIED)).toBe("linear-gradient(90deg, #efe6d6 0, #efe6d6 26%, #fff 82%)");
    expect(quietBackground(QueryStatus.PARTIAL_SENT)).toBe("linear-gradient(90deg, #e8c0af 0, #e8c0af 26%, #fff 82%)");
  });
  it("text and marks: ink on every band, the offer's included", () => {
    expect([STAGE_INK, V2.ink, V2.offerInk, V3.ink]).toEqual(["#1c130f", "#1c130f", "#1c130f", "#1c130f"]);
    for (const s of Object.values(QueryStatus)) expect([s, bandInk(s)]).toEqual([s, STAGE_INK]);
    for (const s of Object.keys(STAGE_COLOURS) as (keyof typeof STAGE_COLOURS)[]) expect([s, stageInk(s)]).toEqual([s, STAGE_INK]);
  });
  it("the accent inks are v2's", () => {
    expect(ACCENT_INK).toEqual(V2.accentInk);
  });
});

/* LOCK 1 (source half) — Plumage colours v2: the with-you outline is gone. The three exports, the navy offer's paper
   ink and PLUMAGE_NAVY no longer exist, and nothing in src/ draws an inset 3px band outline or reads --wy. */
describe("Plumage colours v2 · no with-you outline", () => {
  it("the table exports no outline, no paper offer ink and no plumage navy", () => {
    for (const n of ["withYouOutline", "withYouShadow", "WITH_YOU_OUTLINE_PX", "OFFER_INK", "PLUMAGE_NAVY"]) expect([n, n in TABLE]).toEqual([n, false]);
  });
  it("no source file reads them, sets --wy or data-wy, or draws an inset 3px outline on a band or strip", () => {
    const all: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f)) all.push(p); } };
    walk("src");
    const code = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(all.length).toBeGreaterThan(500);
    expect(all.filter((f) => /withYouOutline|withYouShadow|WITH_YOU_OUTLINE_PX|OFFER_INK|PLUMAGE_NAVY|data-wy|--wy\b/.test(code(f)))).toEqual([]);
    /* an inset 3px shadow in any rule on a band or strip (the grid card's band, the slip's top, the slide-in strip, the
       Responses strip, the phone query band, a Dashboard head); a radio's or a timeline node's ring is not a band */
    const BAND = /(qc154-hd|qc152-band|qc153-top|rsp5-dst|pa4-band|os-band|d2-band)/;
    const ringed = all.filter((f) => f.endsWith(".css")).flatMap((f) => [...code(f).matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter((m) => BAND.test(m[1]) && /inset 0 0 0 3px/.test(m[2])).map((m) => `${f}: ${m[1].trim()}`));
    expect(ringed).toEqual([]);
    /* and no inline one in a band's style */
    expect(all.filter((f) => /\.tsx$/.test(f) && /inset 0 0 0 3px/.test(code(f)))).toEqual([]);
  });
});

/* LOCK 2 (source half) — Plumage colours v3: the stripes mean Revise & Resubmit. They are the JSON's, built from the
   table's two Full shades, and drawn by the two card bands only (QcCard154's band, QcCard152's strip, through
   bandBackground); every other surface is flat. The offer's v2 stripes and their paper are gone. */
describe("Plumage colours v3 · Revise & Resubmit's stripes, on two card bands only", () => {
  it("are the JSON's stripes, character for character, built from the table's two Full shades", () => {
    expect(RR_STRIPES).toBe(V3.reviseResubmit.stripes);
    expect(RR_STRIPES).toContain(`${STAGE_COLOURS.full.bandRequested} 0 22px`);
    expect(RR_STRIPES).toContain(`${STAGE_COLOURS.full.band} 22px 44px`);
    expect(readFileSync("src/lib/stageColours.ts", "utf8")).toContain("${STAGE_COLOURS.full.bandRequested} 0 22px,${STAGE_COLOURS.full.band} 22px 44px");
  });
  it("the offer's stripes and their paper are deleted", () => {
    for (const n of ["OFFER_STRIPES", "STRIPE_PAPER"]) expect([n, n in TABLE]).toEqual([n, false]);
  });
  it("bandBackground is the stripes for Revise & Resubmit only, the flat status band for every other status", () => {
    for (const s of Object.values(QueryStatus)) expect([s, bandBackground(s)]).toEqual([s, s === QueryStatus.REVISE_RESUBMIT ? RR_STRIPES : statusBand(s)]);
    for (const s of [QueryStatus.OFFER, QueryStatus.SIGNED]) expect([s, bandBackground(s)]).toEqual([s, "#c5e0d8"]);
    expect(bandBackground(QueryStatus.RESUBMITTED)).toBe("#b9c9da");
    expect(bandBackground(null)).toBe("#efe6d6");
  });
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p); } };
  walk("src");
  const code = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  it("only the grid card and the slide-in card call bandBackground or name RR_STRIPES; nothing names the offer's", () => {
    expect(files.length).toBeGreaterThan(500);
    const users = files.filter((f) => f !== "src/lib/stageColours.ts" && /\bbandBackground\(|\bRR_STRIPES\b/.test(code(f))).sort();
    expect(files.filter((f) => /\bOFFER_STRIPES\b|\bSTRIPE_PAPER\b/.test(code(f)))).toEqual([]);
    expect(users).toEqual(["src/components/queries/centre/QcCard152.tsx", "src/components/queries/centre/QcCard154.tsx"]);
  });
  it("the grid card puts it on its band only, when not quiet; the slide-in card on its strip", () => {
    const g = code("src/components/queries/centre/QcCard154.tsx");
    expect(g.match(/bandBackground\(/g)?.length).toBe(1);
    expect(g).toContain("const bandBg = quiet ? null : bandBackground(r.status);");
    expect(g).toContain('className="qc154-hd" data-qc154="band" style={striped ? { background: bandBg! } : undefined}');
    expect(g).toContain("const bandNow = { band, grad: quiet || striped };");
    const c = code("src/components/queries/centre/QcCard152.tsx");
    expect(c.match(/bandBackground\(/g)?.length).toBe(1);
    expect(c).toContain("const bandBg = quiet ? quietBackground(r.status) : bandBackground(r.status);");
  });
  it("no stylesheet draws the stripes, and no offer rule anywhere carries a gradient, an animation or a transition", () => {
    const sheets = files.filter((f) => f.endsWith(".css"));
    /* the stripes by their colours, v2's offer's and v3's R&R's (Comps' own 118° stripes, #edd8cd/#e6cec1, are neither) */
    expect(sheets.filter((f) => /repeating-linear-gradient\(\s*118deg[^;]*(#f6f0e5|#f1d9cf|#dbe4ee|#d3deea|#b9c9da)/i.test(code(f)))).toEqual([]);
    const offerRules = sheets.flatMap((f) => [...code(f).matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter((m) => /data-(tone|stage|sk)="offer"|"Offer"|"Signed"|\[data-offer\]/.test(m[1]) && /gradient|animation|transition/.test(m[2]))
      .map((m) => `${f}: ${m[1].trim()}`));
    expect(offerRules).toEqual([]);
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
  it("the seals are navy with paper initials (the agent's seal, not a stage: unchanged by v2)", () => {
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
    expect(BREAKDOWN_COLOR).toMatchObject({ queried: "#efe6d6", partial: "#e8c0af", full: "#b9c9da" });
    expect(WEEK_GROUPS.map((g) => g.color)).toEqual(["#efe6d6", "#e8c0af", "#b9c9da"]);
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
  it("the phone query sheet's strip and the agent's bubbles are the flat status band", () => {
    /* Phone query sheet v1 retires v4's query page; the sheet draws the strip and the bubbles */
    const q = readFileSync("src/components/phone/qsheet/QuerySheet.tsx", "utf8");
    expect(q).toContain("style={{ background: statusBand(status), color: bandInk(status) }}");
    expect(q).toContain("background: t.status ? statusBand(t.status) : undefined, color: bandInk(t.status)");
    const f = "src/components/phone/v5/BirdsBlockV5.tsx";
    expect([f, /background: statusBand\(String\(cur\.status\)\)/.test(readFileSync(f, "utf8"))]).toEqual([f, true]);
    /* Phone Birds-eye world v1 (BirdsViewV5's successor): each stage's bar is its status band, read through the engine */
    expect(readFileSync("src/lib/birdsWorld.ts", "utf8")).toContain("export const bandOf = (status: string): string => statusBand(status);");
    expect(readFileSync("src/components/phone/birds/drawWorld.ts", "utf8")).toContain("background:${bandOf(s.st)}");
  });
});

describe("Plumage colours v1 · the Query Centre's stylesheets restate the table", () => {
  it("Phase 2: the grid card and the slip take --tone inline from statusBand (v2: no outline); no stylesheet restates a stage's tone", () => {
    const card = readFileSync("src/components/queries/centre/QcCard154.tsx", "utf8");
    expect(card).toContain("const band = statusBand(r.status);");
    expect(card).toContain('style={{ "--tone": band } as React.CSSProperties}');
    const slip = readFileSync("src/components/queries/centre/QcSlip153.tsx", "utf8");
    expect(slip).toContain('style={{ "--tone": statusBand(r.status) } as React.CSSProperties}');
    expect(css("qcv154.css")).not.toMatch(/data-tone="[a-z]+"\]\s*\{\s*--tone/);
    expect(css("qcv153.css")).not.toMatch(/data-tone="[a-z]+"\]\s*\{\s*--tone/);
  });
  it("slipTone is the stage, and the fill its band — a closed card is grey, not sand", () => {
    for (const s of Object.values(QueryStatus)) expect(slipTone(s)).toBe(stageOf(s));
    for (const [k, v] of Object.entries(SLIP_TONE_FILL)) expect(v).toBe(STAGE_COLOURS[k as keyof typeof STAGE_COLOURS].band);
    expect(SLIP_TONE_FILL[slipTone(QueryStatus.REJECTED)]).toBe("#eceae6");
  });
  it("group swatches: Offers, Materials, Nudge due, Watch and wait, Gone quiet (unchanged), Closed; a Status group its stage", () => {
    expect(sectionSwatch("attention", "offer")).toBe("#c5e0d8");
    expect(sectionSwatch("attention", "materials")).toBe("#f1d9cf"); /* Phase 2: the Partial requested band */
    expect(sectionSwatch("attention", "nudge")).toBe("#efe6d6");
    expect(sectionSwatch("attention", "agent")).toBe("#efe6d6");
    expect(sectionSwatch("attention", "quiet")).toBe("#f4efe6");
    expect(sectionSwatch("attention", "closed")).toBe("#eceae6");
    expect(sectionSwatch("status", QueryStatus.FULL_SENT)).toBe(STAGE_COLOURS.full.band);
    expect(sectionSwatch("status", QueryStatus.FULL_REQUESTED)).toBe("#d3deea"); /* Phase 2: a Status group its status's band */
    expect(sectionSwatch("status", "closed")).toBe(STAGE_COLOURS.closed.band);
  });
  it("the paperclip accent is the stage's edge and the pack's accent ink; the resting ink is the ink 82% over white", () => {
    expect(tabAccent157(QueryStatus.QUERIED)).toMatchObject({ accent: "#e0d2bb", ink: "#5e4c36" });
    for (const k of ["partial", "full", "offer"] as const) expect([k, TAB_ACCENT_157[k].accent, TAB_ACCENT_157[k].ink]).toEqual([k, STAGE_COLOURS[k].edge, ACCENT_INK[k]]);
    expect(tabAccent157(QueryStatus.SIGNED)).toEqual(TAB_ACCENT_157.offer);
    const mix = (h: string) => [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.82 + 255 * 0.18));
    for (const a of Object.values(TAB_ACCENT_157)) expect(mix(a.ink)).toEqual([1, 3, 5].map((i) => parseInt(a.rest.slice(i, i + 2), 16)));
    /* Plumage colours v3: the grid card no longer draws the paperclip (its materials are a tile, QcMatTile, in ink);
       the accent is the unrendered slip's (QcSlip153 MatTab1533) */
    expect(readFileSync("src/components/queries/centre/QcCard154.tsx", "utf8")).not.toMatch(/tabAccent157|MatTab1533/);
  });
  it("the unreachable stage ring keeps its own v153 fills (QcStageRing1531 is rendered by no route; AUDIT.md)", () => {
    expect(RING_BUCKETS.slice(0, 4).map((b) => b.fill)).toEqual(["#efe7da", "#ecd6d2", "#d9e1ea", "#e7d6dc"]);
    expect(LEGACY_TONE_FILL_153).toEqual({ sand: "#efe7da", rose: "#ecd6d2", blue: "#d9e1ea", heather: "#e7d6dc" });
  });
  it("STATUS_FILL and STATUS_PALE are the five stages' band and tint (Who replied's cap reads them)", () => {
    expect(STATUS_FILL).toEqual({ sand: "#efe6d6", pink: "#e8c0af", navy: "#b9c9da", sage: "#c5e0d8", grey: "#eceae6" });
    expect(STATUS_PALE).toEqual({ sand: "#f8f4ed", pink: "#f9f0ec", navy: "#eff3f7", sage: "#eef6f3", grey: "#f6f5f3" });
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

describe("Plumage colours v1 · Phase 4 · the To-do desk and Versions", () => {
  const read = (f: string) => readFileSync(f, "utf8");
  it("the To-do desk takes the status band where it knows the status; Versions' chart takes the marks", () => {
    expect(read("src/components/todo/ws/TodoWorkspace.tsx")).toContain("stageVars(stage, t.query?.status)");
    expect(read("src/components/versions/v6/versionsV6.css")).toContain(`--v6-chart-queried: ${STAGE_COLOURS.queried.mark}; --v6-chart-partial: ${STAGE_COLOURS.partial.mark}; --v6-chart-full: ${STAGE_COLOURS.full.mark};`);
    expect(read("src/components/versions/v6/versionsV6.css")).toContain(`--v6-stage-queried: ${STAGE_COLOURS.queried.band}; --v6-stage-partial: ${STAGE_COLOURS.partial.band}; --v6-stage-full: ${STAGE_COLOURS.full.band};`);
  });
});
