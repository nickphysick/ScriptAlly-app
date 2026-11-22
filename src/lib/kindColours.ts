/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plumage colours v1 (design-refs/plumage-colours-v1/plumage-colours-v1.json `kinds`) — THE KIND TILES: one colour per
 * kind of thing search finds, each taken from the hawk artwork. A query is the paper (a Queried band's colour; its status
 * is carried by the mark in ink and the chip beside it, never the tile); an agent the Scout's teal at 45%; a material
 * the Archivist's oxblood; a task the Courier's midnight wing.
 *
 * ⚠️ TILES ONLY. A kind colour never fills a band, a strip, a bar or a chip.
 * ⚠️ #903830 is allowed for the material tile and nowhere else (Burgundy #7c3a2a is still not a brand colour).
 * ⚠️ Search only, for now (shell/SearchDesk). kindColours.test.ts locks this table hex for hex.
 */
export type Kind = "query" | "agent" | "material" | "task";
export interface KindColour { tile: string; glyph: string; edge?: string }

export const KIND_COLOURS: Readonly<Record<Kind, KindColour>> = {
  query: { tile: "#efe6d6", glyph: "#1c130f", edge: "#e0d2bb" },
  agent: { tile: "#b0c1be", glyph: "#1c130f", edge: "#96aca9" },
  material: { tile: "#903830", glyph: "#ffffff" },
  task: { tile: "#2e3f4f", glyph: "#ffffff" },
};

/** a kind's tile as inline style: its colour, its glyph's colour and, where it has one, a 1px edge drawn inside */
export const kindTileStyle = (k: Kind): { background: string; color: string; boxShadow?: string } => {
  const c = KIND_COLOURS[k];
  return { background: c.tile, color: c.glyph, ...(c.edge ? { boxShadow: `inset 0 0 0 1px ${c.edge}` } : {}) };
};
