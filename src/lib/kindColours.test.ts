/**
 * Plumage colours v1 — the kind tiles (lib/kindColours): the pack's `kinds`, hex for hex, and where they are drawn.
 * The computed tiles are measured in tests/e2e/pc1.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { KIND_COLOURS, kindTileStyle } from "./kindColours";

const PACK = JSON.parse(readFileSync("design-refs/plumage-colours-v1/plumage-colours-v1.json", "utf8"));

describe("Plumage colours v1 · the kind tiles", () => {
  it("is the pack's table, hex for hex", () => {
    expect(KIND_COLOURS).toEqual({
      query: { tile: "#efe6d6", glyph: "#1c130f", edge: "#e0d2bb" },
      agent: { tile: "#b0c1be", glyph: "#1c130f", edge: "#96aca9" },
      material: { tile: "#903830", glyph: "#ffffff" },
      task: { tile: "#2e3f4f", glyph: "#ffffff" },
    });
    for (const [k, c] of Object.entries(KIND_COLOURS)) {
      const p = PACK.kinds[k];
      expect([k, { tile: c.tile, glyph: c.glyph, edge: c.edge }]).toEqual([k, { tile: p.tile, glyph: p.glyph, edge: p.edge }]);
    }
  });
  it("a tile's style: tile, glyph, and a 1px inset edge where the kind has one", () => {
    expect(kindTileStyle("agent")).toEqual({ background: "#b0c1be", color: "#1c130f", boxShadow: "inset 0 0 0 1px #96aca9" });
    expect(kindTileStyle("task")).toEqual({ background: "#2e3f4f", color: "#ffffff" });
  });
  it("search's query, agent, material and task tiles read it at both sizes; note, action, page, help and more do not", () => {
    const s = readFileSync("src/components/shell/SearchDesk.tsx", "utf8");
    const tile = s.slice(s.indexOf("const Tile: React.FC"), s.indexOf("const Facts: React.FC"));
    for (const k of ["agent", "query", "task", "material"]) expect([k, new RegExp(`data-tile="${k}" style=\\{kindTileStyle\\("${k}"\\)\\}`).test(tile)]).toEqual([k, true]);
    for (const k of ["note", "action", "page", "help"]) expect([k, new RegExp(`data-tile="${k}"[^>]*kindTileStyle`).test(tile)]).toEqual([k, false]);
    /* one Tile draws both sizes (32px and the peek's 44px, by `big`) */
    expect(tile).toContain('const cls = `sv1-tile${big ? " sv1-tile--big" : ""}`;');
  });
  it("#903830 appears in src/ only in this table: never a band, never another surface", () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && /#903830/i.test(readFileSync(p, "utf8"))) hits.push(p);
      }
    };
    walk("src");
    expect(hits).toEqual(["src/lib/kindColours.ts"]);
  });
});
