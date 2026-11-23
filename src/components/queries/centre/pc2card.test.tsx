/**
 * Plumage colours v2 — the grid card's status label (pc2card.css, QcCard154). Source and markup only; the label's place,
 * clipping and overlap are measured on the rendered page in tests/e2e/pc2.measure.ts (locks 6 and 7).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus } from "../../../types";
import { STAGE_COLOURS, stageOf } from "../../../lib/stageColours";
import { standWords } from "../../../lib/qc153";
import { card154, row154 } from "./qc154.fixture";

const sheet = readFileSync(new URL("./pc2card.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (sel: string) => sheet.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

describe("Plumage colours v2 · the grid card's status label", () => {
  it("every status: one label, the card's own word, its edge the stage's edge from the table", () => {
    for (const st of Object.values(QueryStatus)) {
      const h = card154(row154(st, "agent"));
      const labs = h.match(/<span class="pc2-lbl"[^>]*>[^<]*<\/span>/g) ?? [];
      expect([st, labs.length]).toEqual([st, 1]);
      expect(labs[0]).toContain(`>${standWords({ status: st }).replace("&", "&amp;")}<`);
      expect(labs[0]).toContain(`--pc2-edge:${STAGE_COLOURS[stageOf(st)].edge}`);
    }
  });
  it("22px high, radius 11, white, 1px inset edge, Special Elite 13px in ink, one line, 14px from the band's left, centred on its bottom edge", () => {
    const l = rule(".qc154-card .pc2-lbl");
    expect(l).toMatch(/position: absolute; left: 14px; bottom: -11px;/);
    expect(l).toMatch(/height: 22px;/);
    expect(l).toMatch(/border-radius: 11px; background: #fff; box-shadow: inset 0 0 0 1px var\(--pc2-edge\)/);
    expect(l).toMatch(/font: 400 13px\/22px var\(--sp-type/);
    expect(l).toMatch(/color: #1c130f;/);
    expect(l).toMatch(/white-space: nowrap;/);
    /* no stage hex is restated: the edge comes from the table through --pc2-edge */
    const stageHexes = Object.values(STAGE_COLOURS).flatMap((c) => Object.values(c));
    for (const h of stageHexes) expect([h, sheet.toLowerCase().includes(h)]).toEqual([h, false]);
  });
  it("the frame no longer clips; the band keeps its rounded top corners; the facts get 18px above them", () => {
    expect(rule(".qc154-card .qc154-in")).toMatch(/overflow: visible;/);
    expect(rule(".qc154-card .qc154-hd")).toMatch(/border-radius: 12px 12px 0 0;/);
    expect(rule(".qc154-card .qc154-fx")).toMatch(/padding-top: 18px;/);
    const card = readFileSync(new URL("./QcCard154.tsx", import.meta.url), "utf8");
    expect(card.indexOf('import "./pc2card.css";')).toBeGreaterThan(card.indexOf('import "./qcv157.css";'));
  });
  it("gone quiet cards carry it; the slide-in card does not", () => {
    expect(readFileSync(new URL("./QcCard154.tsx", import.meta.url), "utf8")).not.toMatch(/quiet \?[^:]*pc2-lbl|!quiet && <span className="pc2-lbl"/);
    expect(readFileSync(new URL("./QcCard152.tsx", import.meta.url), "utf8")).not.toContain("pc2-lbl");
  });
});
