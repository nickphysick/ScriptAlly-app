/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactCards — Contact list v20 §B: what a paper card in the Cards view says, and how many cards sit in a row.
 *
 * ⚠️ A CARD SAYS ONLY WHAT THE LIST'S OWN FACTS SAY (`agentFacts`): the status chip is the row's query stage, or "Not yet
 *    queried" / "Closed to submissions" for an agent with no query. Nothing here is stored and nothing is guessed: a
 *    missing value is left null, and the card draws its own "+ Add …" pill for it.
 * ⚠️ "YOUR MOVE" IS `stand === "you"` — the same fact as the band's "your move" count and the row's YOUR MOVE tag
 *    (lib/contactList: a live query whose next step is the writer's). The card's pink band reads it and nothing else.
 */
import type { AgentFacts } from "./contactList";
import { STAGE_NAME } from "./qcSummary";
import { agentInitials, agentPrimary } from "./agentDisplay";
import { genreLabel, type PersonalGenre } from "./genres";
import { materialRowsFromAgent } from "./agentMaterials";
import { materialWords } from "./agentPanel";
import type { PaperCardData, PaperStatus } from "../components/shared/AgentPaperCard";

/** a card is never narrower than this, and the grid never holds more than `CARD_MAX_COLS` across */
export const CARD_MIN = 340;
export const CARD_GAP_COL = 22;
export const CARD_GAP_ROW = 24;
export const CARD_MAX_COLS = 3;

/** how many cards across a grid of this content width holds: as many 340px cards as fit with 22px between, 1 to 3 */
export function cardColumns(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 1;
  return Math.max(1, Math.min(CARD_MAX_COLS, Math.floor((width + CARD_GAP_COL) / (CARD_MIN + CARD_GAP_COL))));
}

/** the card's band: who holds the next step, and the chip's words */
export function cardStatus(x: AgentFacts): { status: PaperStatus; label: string } {
  if (x.standing.kind === "none") {
    return x.door === "closed" ? { status: "closed", label: "Closed to submissions" } : { status: "none", label: "Not yet queried" };
  }
  const st = x.q?.status;
  const label = st ? (STAGE_NAME[st as keyof typeof STAGE_NAME] ?? String(st)) : "Queried";
  const status: PaperStatus = x.stand === "you" ? "you" : x.stand === "closed" ? "closed" : "querying";
  return { status, label };
}

/** the paper card's data for one agent, from the list's own facts */
export function paperDataOf(x: AgentFacts, genreHit: (g: string) => boolean, personalGenres: PersonalGenre[] = []): PaperCardData {
  const a = x.agent;
  const { status, label } = cardStatus(x);
  const weeks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const genres = [...x.genres]
    .sort((g1, g2) => Number(genreHit(g2)) - Number(genreHit(g1)))
    .map((g) => ({ label: genreLabel(g, personalGenres), hit: genreHit(g) }));
  const named = (a.name ?? "").trim();
  return {
    status,
    statusLabel: label,
    stars: typeof a.starRating === "number" && a.starRating > 0 ? a.starRating : null,
    initials: agentInitials(a).slice(0, 2),
    name: agentPrimary(a),
    agency: named ? (a.agency ?? "").trim() || null : null,
    city: (a.city ?? "").trim() || null,
    weeks,
    website: (a.website ?? "").trim() || null,
    email: (a.email ?? "").trim() || null,
    genres,
    wishlist: (a.mswlNotes ?? "").trim() || null,
    materials: materialRowsFromAgent(a.materialsWanted).filter((r) => r.on)
      .map((r) => ({ label: materialWords(r), kind: r.key === "sample" ? "pages" as const : "doc" as const })),
  };
}
