/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 (design-refs/manuscripts-v27) — the page's pure half: the details card's rows, the book view's rows,
 * the cover's kicker, the three "Where it's been" counts, and the Getting started guide's done flags.
 *
 * ⚠️ NOTHING HERE APPRAISES. Every value is a fact read from the manuscript or its queries; an absent value is omitted
 *    in the book view (never a dash) and reads "Not set" on the details card, which has fixed rows.
 * ⚠️ THE COUNTS REUSE THE HOUSE DERIVATIONS, never a restatement: "asked for more" is Analytics' `reachedRequest`
 *    (`analytics.buildRows`), "with agents" is the Query Centre's `tileCourt(status) === "agent"`.
 */
import { ManuscriptStatus } from "../types";
import type { Activity, Agent, Manuscript, Query } from "../types";
import { STATUS_WORDS } from "./manuscriptV21";
import { buildRows } from "./analytics";
import { tileCourt } from "./qcSummary";
import type { MsGuideKey } from "./pageChecklist";

import { MONTHS_SHORT } from "./dates";

/** "3 Mar 2026" from an ISO date or timestamp, read from the date part (never `new Date()`, which shifts a day). */
export const sinceDay = (iso: string | null | undefined): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  const month = MONTHS_SHORT[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : null;
};

/** The status the page shows: a shelved flag reads Shelved whatever the workflow status says. */
export const statusWord = (ms: Pick<Manuscript, "status" | "shelved">): string => {
  const s = ms.status === ManuscriptStatus.SHELVED || ms.shelved === true ? ManuscriptStatus.SHELVED : ms.status;
  return STATUS_WORDS[s] ?? String(s);
};

const clean = (s: string | null | undefined): string => (s ?? "").trim();
const genresOf = (ms: Pick<Manuscript, "genre" | "subGenres">): string[] => {
  const main = clean(ms.genre);
  const subs = (ms.subGenres ?? []).map(clean).filter((g) => g && g !== main);
  return main ? [main, ...subs] : subs;
};

/** The card's genre: the primary, plus the first sub-genre if there is one. */
export const cardGenre = (ms: Pick<Manuscript, "genre" | "subGenres">): string => genresOf(ms).slice(0, 2).join(" · ");
/** The book view's genre: the primary and every sub-genre. */
export const allGenres = (ms: Pick<Manuscript, "genre" | "subGenres">): string => genresOf(ms).join(" · ");

export const wordsOf = (ms: Pick<Manuscript, "wordCount">): number => Math.max(0, Number(ms.wordCount) || 0);
export const wordsText = (n: number): string => n.toLocaleString("en-GB");

export interface CardRow { key: "genre" | "age" | "status" | "since" | "words"; label: string; value: string; muted?: boolean; dot?: boolean }

/** The details card's five rows. The fifth (Words) shows only on a narrow sheet; the wide card draws the count large. */
export const cardRows = (ms: Pick<Manuscript, "genre" | "subGenres" | "ageCategory" | "status" | "shelved" | "wordCount">, since: string | null): CardRow[] => {
  const g = cardGenre(ms);
  const age = clean(ms.ageCategory);
  const day = sinceDay(since);
  const w = wordsOf(ms);
  return [
    { key: "genre", label: "Genre", value: g || "Not set", muted: !g },
    { key: "age", label: "Age", value: age || "Not set", muted: !age },
    { key: "status", label: "Status", value: statusWord(ms), dot: true },
    { key: "since", label: "Since", value: day ?? "Not querying yet", muted: !day },
    { key: "words", label: "Words", value: w > 0 ? wordsText(w) : "Not set", muted: w <= 0 },
  ];
};

export interface BookRow { key: string; label: string; value: string; dot?: boolean }

/** The book view's left page: every row whose value exists, in the mock's order. No row is ever a dash. */
export const bookRows = (
  ms: Pick<Manuscript, "genre" | "subGenres" | "ageCategory" | "status" | "shelved" | "wordCount" | "setting" | "series">,
  since: string | null,
): BookRow[] => {
  const w = wordsOf(ms);
  const rows: (BookRow | null)[] = [
    allGenres(ms) ? { key: "genre", label: "Genre", value: allGenres(ms) } : null,
    clean(ms.ageCategory) ? { key: "age", label: "Age", value: clean(ms.ageCategory) } : null,
    w > 0 ? { key: "words", label: "Words", value: wordsText(w) } : null,
    { key: "status", label: "Status", value: statusWord(ms), dot: true },
    clean(ms.setting) ? { key: "setting", label: "Setting", value: clean(ms.setting) } : null,
    clean(ms.series) ? { key: "series", label: "Series", value: clean(ms.series) } : null,
    sinceDay(since) ? { key: "since", label: "Since", value: sinceDay(since)! } : null,
  ];
  return rows.filter((r): r is BookRow => !!r);
};

/** The cover's kicker: "A thriller", "An upmarket novel"… from the primary genre; null with no genre (the line drops). */
export const coverKicker = (genre: string | null | undefined): string | null => {
  const g = clean(genre).toLowerCase();
  if (!g) return null;
  return `${/^[aeiou]/.test(g) ? "An" : "A"} ${g}`;
};

/** A stored text split into paragraphs on line breaks; blank lines dropped. */
export const paragraphs = (s: string | null | undefined): string[] => clean(s).split(/\n+/).map((p) => p.trim()).filter(Boolean);

export interface WhereItsBeen { sent: number; askedForMore: number; withAgents: number }

/** The book view's three counts, over this manuscript's queries only (the caller scopes them). */
export const whereItsBeen = (queries: Query[], activities: Activity[], agents: Agent[], nowMs: number): WhereItsBeen => {
  const ids = new Set(queries.map((q) => q.id));
  const rows = buildRows(queries, activities.filter((a) => !a.queryId || ids.has(a.queryId)), agents, nowMs);
  return {
    sent: queries.length,
    askedForMore: rows.filter((r) => r.reachedRequest).length,
    withAgents: queries.filter((q) => tileCourt(q.status) === "agent").length,
  };
};

/* ══ the Getting started guide (Part D) ═══════════════════════════════════════════════════════ */

export type { MsGuideKey };

/**
 * ⚠️ DONE IS READ FROM THE SAVED MANUSCRIPT, NEVER FROM THE CLICK THAT STARTED A STEP. A step whose drawer was opened
 *    and cancelled stays undone; a save that fills three fields ticks three.
 */
export const msGuideDone = (
  ms: Pick<Manuscript, "genre" | "ageCategory" | "wordCount" | "logline" | "elevatorPitch" | "synopsis"> | null | undefined,
): Partial<Record<MsGuideKey, boolean>> => {
  if (!ms) return {};
  const d: Partial<Record<MsGuideKey, boolean>> = {};
  if (clean(ms.genre) && clean(ms.ageCategory) && wordsOf(ms) > 0) d.details = true;
  if (clean(ms.logline)) d.logline = true;
  if (typeof ms.elevatorPitch === "string" && clean(ms.elevatorPitch)) d.pitch = true;
  if (typeof ms.synopsis === "string" && clean(ms.synopsis)) d.synopsis = true;
  return d;
};
