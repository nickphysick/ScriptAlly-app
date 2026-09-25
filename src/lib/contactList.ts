/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v11 — the pure derivations (design authority: design-refs/contact-list-v11.html).
 *
 * ⚠️ THE ROWS COME FROM `buildQcRows` — the Query Centre's OWN derivation — so this page and the
 * QC cannot disagree about a court, an expected date or a past-the-date reading. This module
 * derives the AGENT-major view over those rows and adds exactly one page-local definition:
 *
 * ⚠️ "YOUR MOVE" ON THIS PAGE IS `tileCourt` ∪ (agent's court ∧ past the expected date) — Nick's
 * ruling (a), 25 Sep. The Query Centre's `courtOf` keeps a past-expected query in the agent's
 * court with `pastExpected` as a flag, and it is UNTOUCHED; this page groups by what the writer
 * should act on, which is the same reading the To-do board's nudge task already takes. Offer
 * folds into Your move exactly as `tileCourt` folds it. One function below owns the union.
 */
import type { Agent, Manuscript, Query, QueryStatus } from "../types";
import type { QcRow } from "./qcSummary";
import { isDoorOpen } from "./agentList";
import { isGenreMatch, matchGenre } from "./genreMatch";

/** The rail's breathing room from the viewport's edges, and its height clamp (mock: the rail's
 *  JS writes an inline height; CSS carries `position: sticky; top: 16px; max-height: 860px`).
 *  Measured on the rendered mock at 1440×900: load → top 92, height 792; scrolled 600 → top 16,
 *  height 860 (the cap binding — 900 − 16 − 16 = 868 → 860). The brief's bracket "16 → 884" is
 *  the one place its text and the render disagree; the mock wins. */
export const RAIL_TOP_GAP = 16;
export const RAIL_MIN = 360;
export const RAIL_MAX = 860;

/**
 * The rail's height from its own MEASURED top — never `100vh` with a constant offset (the house
 * viewport law: the offset is a guess about everything above the element, and the beta strip,
 * the bar and the hero all sit above this one).
 *
 * ⚠️ RETURNS NULL FOR A READING THAT CANNOT BE A LAYOUT — a zero/negative top with a zero-height
 * window is the page before layout or a container under the loading cover, and writing a height
 * from it publishes a wrong floor (the dashboard's −115 clamp is the standing example). The
 * caller keeps the previous height rather than storing the sentinel.
 */
export function railHeight(top: number, innerHeight: number): number | null {
  if (!Number.isFinite(top) || !Number.isFinite(innerHeight) || innerHeight <= 0) return null;
  const clampedTop = Math.max(RAIL_TOP_GAP, top);
  const room = innerHeight - clampedTop - RAIL_TOP_GAP;
  return Math.max(RAIL_MIN, Math.min(RAIL_MAX, room));
}

/* ── the manuscript in scope ──────────────────────────────────────────────────────────────── */
/* ⚠️ THERE IS NO SCOPE RESOLVER HERE, DELIBERATELY. The page reads the switcher's own —
   `resolveScopedManuscript` (lib/shellSidebar.ts) — because §10 says the manuscript IS the one
   in the switcher, and a second resolver with a different fallback put a null beside a chip
   showing a book. (agentTiles' only-one fallback retired with it.) */

/* ── where you stand, per agent, for the manuscript in scope ─────────────────────────────── */

/** THE page-local union (ruling a): the writer's move on a query. */
export const rowYourMove = (r: Pick<QcRow, "court" | "pastExpected">): boolean =>
  r.court === "you" || r.court === "offer" || (r.court === "agent" && r.pastExpected);

export type ContactStanding =
  | { kind: "none" }
  | { kind: "open"; yourMove: boolean }
  | { kind: "closed"; status: QueryStatus };

/** An agent's rows for the manuscript in scope — null scope means every query (one-manuscript
 *  accounts and unscoped views read the same either way). */
export const agentRows = (rows: readonly QcRow[], agentId: string, msId: string | null): QcRow[] =>
  rows.filter((r) => r.query.agentId === agentId && (msId == null || r.manuscriptId === msId));

/** Where things stand between the writer and this agent, for the manuscript in scope.
 *  Open beats closed; the latest close speaks for a wholly-closed history. */
export function contactStanding(rows: readonly QcRow[]): ContactStanding {
  if (rows.length === 0) return { kind: "none" };
  const open = rows.filter((r) => r.court !== "closed");
  if (open.length) return { kind: "open", yourMove: open.some(rowYourMove) };
  let last = rows[0];
  for (const r of rows.slice(1)) if (r.lastMs > last.lastMs) last = r;
  return { kind: "closed", status: last.status };
}

/* ── the three count cards (v11 §3.3) ─────────────────────────────────────────────────────── */

export type ContactCardKey = "active" | "never" | "closed";

export interface ContactCard {
  key: ContactCardKey;
  name: string;
  count: number;
  /** The mono fact line beneath the name. */
  fact: string;
  /** The fact carries ink 700 (the Active card's "N your move", only while N > 0). */
  urgent: boolean;
}

export interface ContactCensus {
  cards: ContactCard[];
  /** Agent id → standing, computed once — the rows, the bands and the filter all read it. */
  standing: Map<string, ContactStanding>;
}

/**
 * One pass over the agents. Counts are TOTALS over the whole list (the house tile law); the
 * cards' facts split their own population and never read the filtered view.
 */
export function contactCensus(agents: readonly Agent[], rows: readonly QcRow[], msId: string | null): ContactCensus {
  const standing = new Map<string, ContactStanding>();
  for (const a of agents) standing.set(a.id, contactStanding(agentRows(rows, a.id, msId)));

  const of = (k: ContactStanding["kind"]) => agents.filter((a) => standing.get(a.id)!.kind === k);
  const active = of("open");
  const never = of("none");
  const closed = of("closed");

  const yourMove = active.filter((a) => (standing.get(a.id) as { yourMove: boolean }).yourMove).length;
  const openNow = never.filter((a) => isDoorOpen(a)).length;
  /* ⚠️ THE SPLIT NAMES PASSED AND NO-REPLY ONLY (the mock's own line). A withdrawn close is in
     the COUNT — the card is "agents whose query closed" — and deliberately not in the split. */
  const passed = closed.filter((a) => (standing.get(a.id) as { status: QueryStatus }).status === "Rejected").length;
  const noReply = closed.filter((a) => (standing.get(a.id) as { status: QueryStatus }).status === "No Response").length;

  return {
    standing,
    cards: [
      { key: "active", name: "Active queries", count: active.length, fact: `${yourMove} your move`, urgent: yourMove > 0 },
      { key: "never", name: "Never queried", count: never.length, fact: `${openNow} open now · ${never.length - openNow} closed`, urgent: false },
      { key: "closed", name: "Query closed", count: closed.length, fact: `${passed} passed · ${noReply} no reply`, urgent: false },
    ],
  };
}

/** The card selection is a multi-select OR (v11 §3.3): empty set means everyone. */
export const matchesCards = (sel: ReadonlySet<ContactCardKey>, s: ContactStanding): boolean =>
  sel.size === 0 || sel.has(s.kind === "open" ? "active" : s.kind === "none" ? "never" : "closed");

/* ── the facts sentence (v11 §3.1) ────────────────────────────────────────────────────────── */

export interface HeroFacts {
  total: number;
  /** The manuscript's title, in the typewriter face — null drops the scope clause. */
  msTitle: string | null;
  /** The genre as the writer recorded it, lowercased for the sentence; null drops the tail. */
  genre: string | null;
  want: number;
  /** Genre matches the writer has never queried for this manuscript — the bold tail. */
  fresh: number;
}

export function heroFacts(
  agents: readonly Agent[],
  standing: ReadonlyMap<string, ContactStanding>,
  ms: Manuscript | null,
): HeroFacts {
  const match = matchGenre(ms?.genre);
  const wanters = match ? agents.filter((a) => (a.genres ?? []).some((g) => isGenreMatch(g, match))) : [];
  return {
    total: agents.length,
    msTitle: ms?.title ?? null,
    genre: ms?.genre && match ? ms.genre.toLowerCase() : null,
    want: wanters.length,
    fresh: wanters.filter((a) => standing.get(a.id)?.kind === "none").length,
  };
}

/* ── the hero's placement (v11 §3.1–3.2) — every number from the hero's own measured width ── */

/** The art file's geometry: 810×375, the drawing ends at x 752, the drawn card's right edge at
 *  x 398 (contact-list-hero-archivist.png — place art from its VISIBLE edge, not the image box). */
export const ART = { w: 810, h: 375, inkRight: 752, drawnCardRight: 398 } as const;
/** The live card's designed width at scale 1 (the mock's `.hart .ac.blank`). */
export const HERO_CARD_W = 300;
/** ⚠️ THE MOCK'S 760 IS A FACT ABOUT THE MOCK'S FRAME, NOT ABOUT THE DESIGN (the ref-breakpoint
 *  law, v65's own lesson). Its column is 804 at a 1440 window; the app's — behind the wider
 *  sidebar and the window's insets — is 758, so carrying 760 across stacked the hero at the
 *  everyday desktop width the design draws side by side. 700 keeps 1440 (758) side by side with
 *  margin and stacks the app's 1280 (~598); the side-by-side chain holds unpinned at 758
 *  (cardLeft 274.6 against a 273 floor) and the pin branch carries it below that. */
export const HERO_STACK_BELOW = 700;

export interface HeroLayout {
  stacked: boolean;
  /** The live card's scale, and the art's. */
  c: number;
  s: number;
  /** Whether the card was pinned to the text column's edge and s re-solved. */
  pinned: boolean;
  textW: number | null;
  cardLeft: number;
  cardTop: number;
  imgLeft: number;
  imgTop: number;
  imgW: number;
  heroH: number;
}

const clamp = (lo: number, v: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The whole hero from four measured facts: its width, the card's UNSCALED height (offsetHeight —
 * a transform never affects layout), the text column's height, and (stacked) the title row's
 * height. Pure, so the pin branch and the clamps are unit-locked rather than eyeballed.
 */
export function heroLayout(input: { W: number; cardH0: number; textH: number; titleRowH?: number }): HeroLayout {
  const { W, cardH0, textH } = input;
  const stacked = W < HERO_STACK_BELOW;
  const c = stacked ? 0.8 : clamp(0.78, W / 1000, 1);
  const textW = stacked ? null : Math.min(Math.round(W * 0.34), 330);
  const minCardLeft = stacked ? 0 : (textW as number) + Math.round(W * 0.02);
  let s = stacked ? 0.64 : clamp(0.34, (0.56 * W) / 804, 0.72);
  let imgLeft = W - ART.inkRight * s;
  let cardLeft = imgLeft + ART.drawnCardRight * s - 80 * c - HERO_CARD_W * c;
  let pinned = false;
  if (cardLeft < minCardLeft) {
    /* pin the card, solve the art's scale so the peek is kept: s = (W − cardRight − 80c) / 354 */
    pinned = true;
    cardLeft = minCardLeft;
    const cardRight = cardLeft + HERO_CARD_W * c;
    s = Math.max(0.34, (W - cardRight - 80 * c) / (ART.inkRight - ART.drawnCardRight));
    imgLeft = W - ART.inkRight * s;
  }
  const cardTop = stacked ? (input.titleRowH ?? 0) + 9 : 14;
  const imgTop = cardTop + (cardH0 * c - ART.h * s) / 2 + 18 * c;
  const heroH = stacked
    ? cardTop + cardH0 * c + 28
    : Math.max(cardTop + cardH0 * c + 28, textH + 28);
  return { stacked, c, s, pinned, textW, cardLeft, cardTop, imgLeft, imgTop, imgW: ART.w * s, heroH };
}
