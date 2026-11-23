/**
 * Plumage colours v3 — the grid card's label on its top edge at the right, the frame's clipping restored, the agency
 * line at 66%, and the materials tile in the Sent box (pc3card.css, pc3tile.css, QcCard154, QcMatTile). Source and
 * markup only; the label's place and clipping, the tile's box and the hover's place are measured on the rendered page in
 * tests/e2e/pc3.measure.ts (PC3-4 … PC3-8, PC3-11, PC3-12). Supersedes pc2card.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus } from "../../../types";
import { STAGE_COLOURS, stageOf } from "../../../lib/stageColours";
import { materialGroups } from "../../../lib/qc1533";
import { standWords } from "../../../lib/qc153";
import { card154, row154 } from "./qc154.fixture";
import { HOVER_GAP, HOVER_OVER_RIGHT, HOVER_W, POINTER_RIGHT, placeHover } from "./QcMatTile";

const V3 = JSON.parse(readFileSync("design-refs/plumage-colours-v3/plumage-colours-v3.json", "utf8"));
const strip = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const card = strip("./pc3card.css"), tile = strip("./pc3tile.css"), v154 = strip("./qcv154.css");
const rule = (sheet: string, sel: string) => sheet.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
const src = readFileSync(new URL("./QcCard154.tsx", import.meta.url), "utf8");

describe("Plumage colours v3 · the label on the card's top edge", () => {
  it("every status: one label, the card's own word, its edge the stage's edge from the table, outside the frame", () => {
    for (const st of Object.values(QueryStatus)) {
      const h = card154(row154(st, "agent"));
      const labs = h.match(/<span class="pc3-lbl"[^>]*>[^<]*<\/span>/g) ?? [];
      expect([st, labs.length]).toEqual([st, 1]);
      expect(labs[0]).toContain(`>${standWords({ status: st }).replace("&", "&amp;")}<`);
      expect(labs[0]).toContain(`--pc3-edge:${STAGE_COLOURS[stageOf(st)].edge}`);
      /* outside the frame: the label comes after the facts, the frame's last child, so it is the card's own child */
      expect([st, h.indexOf("pc3-lbl") > h.indexOf('data-qc154="facts"')]).toEqual([st, true]);
      expect([st, /pc2-lbl|data-pc2=/.test(h)]).toEqual([st, false]);
    }
  });
  it("its centre on the frame's top edge, 14px in from the band's right edge; the JSON's look", () => {
    const l = rule(card, ".qc154-card > .pc3-lbl");
    /* the frame is 6px inside the card with a 1px edge: the band's top is 7px down, its right edge 7px in */
    expect(l).toMatch(/position: absolute; top: -4px; right: 21px;/);
    expect(7 - Number(V3.statusLabel.height.replace("px", "")) / 2).toBe(-4);
    expect(l).toMatch(/height: 22px;/);
    expect(l).toMatch(/border-radius: 11px; background: #fff; box-shadow: inset 0 0 0 1px var\(--pc3-edge\), 0 1px 2px rgba\(28, 19, 15, 0\.08\);/);
    expect(l).toMatch(/font: 400 13px\/22px var\(--sp-type\) !important; color: #1c130f;/);
    expect(l).toMatch(/white-space: nowrap;/);
    const stageHexes = Object.values(STAGE_COLOURS).flatMap((c) => Object.values(c));
    /* the label's sheet restates no stage hex (the hover's chip fill #f8f4ed is the JSON's chip, not Queried's tint) */
    for (const h of stageHexes) expect([h, card.toLowerCase().includes(h)]).toEqual([h, false]);
  });
  it("the frame clips again (qcv154's overflow hidden, no override); the facts keep their 18px", () => {
    expect(rule(v154, ".qc154-in")).toMatch(/overflow: hidden;/);
    expect(card + tile).not.toMatch(/qc154-in[^{]*\{[^}]*overflow: visible/);
    expect(rule(card, ".qc154-card .qc154-fx")).toMatch(/padding-top: 18px;/);
    expect(src.indexOf('import "./pc3card.css";')).toBeGreaterThan(src.indexOf('import "./qcv157.css";'));
  });
  it("gone quiet cards carry it; the slide-in card does not", () => {
    expect(src).not.toMatch(/quiet \?[^:]*pc3-lbl|!quiet && <span className="pc3-lbl"/);
    expect(readFileSync(new URL("./QcCard152.tsx", import.meta.url), "utf8")).not.toMatch(/pc3-lbl|pc2-lbl/);
  });
  it("the agency line is the JSON's ink at 66%", () => {
    expect(V3.agencyLine).toBe("rgba(28,19,15,.66)");
    expect(rule(v154, ".qc151 .qc154-ag")).toMatch(/color: rgba\(28, 19, 15, 0\.66\);/);
  });
});

describe("Plumage colours v3 · the materials tile replaces the paperclip", () => {
  it("is shown exactly when there are materials (the paperclip's own test: materialGroups non-null)", () => {
    expect(src).toContain("{mats ? <MatTile ");
    expect(src).not.toMatch(/MatTab1533|qc154-clipw|data-qc154="clip"/);
    for (const st of Object.values(QueryStatus)) {
      const r = row154(st, "agent");
      const has = materialGroups(r.query, r.status, "Spring round", r.stageStartMs, Date.now()) !== null;
      const h = card154(r);
      expect([st, h.includes('data-pc3="tile"')]).toEqual([st, has]);
    }
  });
  it("sits in the Sent box, a real button named as the paperclip was, with the paperclip's glyph over the count", () => {
    const h = card154(row154(QueryStatus.FULL_REQUESTED, "you"));
    const sent = h.slice(h.indexOf('data-k="sent"'), h.indexOf('data-k="next"'));
    expect(sent).toMatch(/<button type="button" class="pc3-tile" data-qc1533="tab" data-pc3="tile" aria-label="\d+ materials?" aria-expanded="false">/);
    expect(sent).toMatch(/<svg viewBox="0 0 16 16"[^>]*>.*<\/svg><i>\d+<\/i><\/button>/);
  });
  it("the tile's box, place, fill, glyph and count are the JSON's", () => {
    const t = V3.attachmentsTile;
    expect([t.size, t.radius, t.fill, t.fillOpen, t.ink, t.count]).toEqual(["44px wide, 50px high", "10px", "rgba(28,19,15,.055)", "rgba(28,19,15,.10)", "rgba(28,19,15,.82)", "Special Elite 16px"]);
    expect(rule(tile, ".qc154-card .pc3-tw")).toMatch(/position: absolute; top: 50%; right: 12px; transform: translateY\(-50%\);/);
    const b = rule(tile, ".qc154-card .pc3-tile.pc3-tile");
    expect(b).toMatch(/flex-direction: column;[^;]*;[^;]*;\s*gap: 4px;/);
    expect(b).toMatch(/width: 44px; height: 50px; border-radius: 10px; background: rgba\(28, 19, 15, 0\.055\); color: rgba\(28, 19, 15, 0\.82\);/);
    expect(tile).toMatch(/\.pc3-tile\.is-open \{ background: rgba\(28, 19, 15, 0\.1\); \}/);
    expect(rule(tile, ".qc154-card .pc3-tile > svg")).toMatch(/width: 18px; height: 18px; stroke-width: 1\.7;/);
    expect(rule(tile, ".qc154-card .pc3-tile > i")).toMatch(/font: normal 400 16px\/1 var\(--sp-type\) !important;/);
  });
});

describe("Log a query v2.3 · Phase 2 (D2) · the compact tile on a narrow card", () => {
  const raw = readFileSync(new URL("./pc3tile.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const m = raw.match(/@container \(max-width: (\d+)px\) \{([\s\S]*)\}\s*$/);
  const body = m?.[2] ?? "";
  it("is a container query on the card (not the window), at the measured width: 340px outside, 328px of content", () => {
    /* the container query reads the content box: the card's 6px padding (qcv154.css) on each side */
    expect(v154).toMatch(/\.qc154-card \{\s*--navy: #2a3a52;\s*position: relative; overflow: visible; margin: 0 0 12px; padding: 6px;/);
    expect(m?.[1]).toBe("328");
    expect(raw).not.toMatch(/@media[^{]*\{[^}]*pc3-tile/);
    /* the card is the container (qcv154.css, desk widths) */
    expect(v154).toMatch(/\.qc154-card \{ container-type: inline-size; \}/);
  });
  it("the same button: the markup is unchanged (no second element, the hooks and the name stay)", () => {
    const t = readFileSync(new URL("./QcMatTile.tsx", import.meta.url), "utf8");
    expect(t.match(/<button /g)?.length).toBe(1);
    expect(t).toMatch(/className=\{`pc3-tile\$\{open \? " is-open" : ""\}`\} data-qc1533="tab" data-pc3="tile" aria-label=\{name\}/);
  });
  it("a 24px pill on the label's line at its right-hand end, glyph and count side by side, nothing under 12px", () => {
    expect(body).toMatch(/\.qc154-card \.pc3-tw \{ position: relative; z-index: 1; top: auto; right: auto; transform: none; order: -1; align-self: flex-end; margin: -4px -2px -22px 0; \}/);
    expect(body).toMatch(/flex-direction: row; gap: 3px; width: auto; min-width: 24px; height: 24px;/);
    expect(body).toMatch(/\.pc3-tile > svg \{ width: 14px; height: 14px; \}/);
    expect(body).toMatch(/\.pc3-tile > i \{ font: normal 400 13px\/1 var\(--sp-type\) !important; \}/);
    for (const px of [...body.matchAll(/font[^;]*?(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]))) expect(px).toBeGreaterThanOrEqual(12);
  });
  it("the Sent box gives back the tile's 64px", () => {
    expect(body).toMatch(/\[data-k="sent"\]:has\(\.pc3-tile\) \{ display: flex; flex-direction: column; gap: 2px; padding-right: 8px; \}/);
  });
  it("the wide card's tile is untouched: 44 × 50, vertically centred, 12px in", () => {
    const wide = raw.slice(0, raw.indexOf("@container"));
    expect(rule(wide, ".qc154-card .pc3-tw")).toMatch(/top: 50%; right: 12px; transform: translateY\(-50%\);/);
    expect(rule(wide, ".qc154-card .pc3-tile.pc3-tile")).toMatch(/width: 44px; height: 50px;/);
  });
});

describe("Plumage colours v3 · the materials hover's place", () => {
  const vp = { l: 8, t: 8, r: 1504, b: 974 };
  const tile = (x: number, y: number) => ({ left: x, top: y, right: x + 44, bottom: y + 50, width: 44, height: 50, x, y } as DOMRect);
  it("is the JSON's: 284 wide, 12px from the tile, its right edge 10px past the tile's, the pointer 25px from its right", () => {
    expect([HOVER_W, HOVER_GAP, HOVER_OVER_RIGHT, POINTER_RIGHT]).toEqual([284, 12, 10, 25]);
    const p = placeHover(tile(600, 300), 200, vp);
    expect(p).toEqual({ left: 600 + 44 + 10 - 284, top: 300 + 50 + 12, up: false, pointer: 25 });
  });
  it("opens upwards when there is no room below, and stays inside its bounds sideways, its pointer still over the tile", () => {
    const up = placeHover(tile(600, 800), 200, vp);
    expect(up).toMatchObject({ up: true, top: 800 - 12 - 200 });
    const left = placeHover(tile(40, 300), 200, vp);
    expect(left.left).toBe(8);
    expect(left.pointer).toBe(25 + (8 + 284 - (40 + 44 + 10)));
    const right = placeHover(tile(1480, 300), 200, vp);
    expect(right.left + 284).toBe(1504);
  });
});
