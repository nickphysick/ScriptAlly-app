/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FIVE TILES — what is on file, counted over the whole list.
 *
 * ⚠️ THE COUNTS ARE TOTALS AND THE FILTER DOES NOT TOUCH THEM. A tile counting what it would show
 * after clicking reads 0 for every section you are not in, which is the one number nobody needs;
 * and a row of tiles that changed as you filtered would stop being a census of the list and become
 * a second, quieter statement of the filter you can already see.
 *
 * ⚠️ THE GENRE TILE IS DERIVED FROM THE MANUSCRIPT IN SCOPE — its LABEL and its COUNT, both. A
 * hard-coded genre would be true of the ref's fixture and of nobody's actual desk; the ref says
 * "Seeking thrillers" because the mockup's writer wrote a thriller. When no manuscript is in
 * scope, or it records no genre, the tile is ABSENT rather than empty: a tile reading "Seeking —"
 * is a question with no subject.
 *
 * ⚠️ AND EVERY TILE IS A FILTER YOU CAN ALREADY EXPRESS. Each one sets a value the popover offers,
 * so a tile is a shortcut rather than a second filtering mechanism — which is what keeps the tile
 * row and the applied tags from ever disagreeing about what is being shown.
 */
import { Agent, Manuscript, Query } from "../types";
import { isDoorOpen } from "./agentList";
import { agentQueryStanding } from "./agentBoard";
import { AgentFilters, emptyFilters } from "./agentFilters";
import { isGenreMatch, matchGenre } from "./genreMatch";

export interface AgentTile {
  key: string;
  label: string;
  count: number;
  swatch: string;
  /** The filter this tile stands for. `All contacts` clears. */
  filters: AgentFilters;
}

/** The manuscript the page is scoped to, or null. Falls back to the only one when there is one. */
export function scopedManuscript(manuscripts: Manuscript[], activeId: string | null): Manuscript | null {
  return manuscripts.find((m) => m.id === activeId) ?? (manuscripts.length === 1 ? manuscripts[0] : null);
}

export function agentTiles(agents: Agent[], queries: Query[], manuscript: Manuscript | null): AgentTile[] {
  const open = agents.filter(isDoorOpen).length;
  const genre = (manuscript?.genre ?? "").trim();
  /* the SAME normalisation the chips tint through — one comparison, so a tile can never count an
     agent whose chip is not tinted, or miss one whose chip is */
  const match = matchGenre(genre);

  const tiles: AgentTile[] = [
    { key: "all", label: "All contacts", count: agents.length, swatch: "#efe9e0", filters: emptyFilters() },
    { key: "open", label: "Open to queries", count: open, swatch: "var(--agl-sage-band)", filters: { ...emptyFilters(), door: ["Open to queries"] } },
    { key: "shut", label: "Closed to queries", count: agents.length - open, swatch: "var(--agl-grey-band)", filters: { ...emptyFilters(), door: ["Closed to queries"] } },
  ];

  /* ⚠️ ABSENT, NOT EMPTY, when there is nothing to be seeking. */
  if (genre && match) {
    tiles.push({
      key: "genre",
      label: `Seeking ${genre.toLowerCase()}`,
      count: agents.filter((a) => a.genres.some((g) => isGenreMatch(g, match))).length,
      swatch: "#e3e9e0",
      filters: { ...emptyFilters(), genre: [genre] },
    });
  }

  tiles.push({
    key: "fresh",
    label: "Not yet queried",
    count: agents.filter((a) => agentQueryStanding(a.id, queries).kind === "none").length,
    swatch: "#f0e9e2",
    filters: { ...emptyFilters(), history: ["Never queried"] },
  });
  return tiles;
}

/**
 * Which tile the current filter set IS, or null when the filters say something no tile can.
 *
 * ⚠️ IT COMPARES THE SETS RATHER THAN REMEMBERING A CLICK. A remembered tile stays lit while the
 * reader edits the filter underneath it, and then lies about what is on screen; deriving it means
 * the row cannot disagree with the applied tags, ever.
 */
export function activeTile(tiles: AgentTile[], filters: AgentFilters): string | null {
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const eq = (a: AgentFilters, b: AgentFilters) =>
    same(a.door, b.door) && same(a.genre, b.genre) && same(a.history, b.history) && same(a.reply, b.reply);
  return tiles.find((t) => eq(t.filters, filters))?.key ?? null;
}
