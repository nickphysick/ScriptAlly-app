/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactEdit — the "Also changes" engine (v11 §7.3). For every field the pop-up can edit whose
 * value something OUTSIDE the agent card reads, a note names the real consumers — and where the
 * effect is a value, it is COMPUTED BY A DRY RUN THROUGH THE REAL CODE with the draft value,
 * never described from arithmetic.
 *
 * ⚠️ THE DRY RUN IS `expectedFor` — the Query Centre's own clock (qcSummary.ts), which composes
 * `resolveExpectedDate` with its D4 recency-and-floor law. `stage date + weeks × 7` is exactly
 * the mutation §11.7 aims at this file: on a query whose writer stated their own date, the two
 * DIFFER, and the lock's fixture carries one.
 *
 * ⚠️ A NOTE NAMING A PLACE THAT DOES NOT READ THE FIELD IS A FAULT (§7.3). The consumer lists
 * here are the P0 report's sweep, with its corrections applied: no exports line (nothing live
 * exports agents), no "rank higher in suggestions" (Discover scores COMMUNITY agents, never
 * yours — communityMatch.ts), and the dashboard-feed consequence of a rename stated
 * qualitatively (dashFeed resolves subjects by the CURRENT names and refuses what it cannot
 * resolve, so older entries naming the old name drop their link).
 */
import type { Agent, Query } from "../types";
import { expectedFor } from "./qcSummary";
import { isDoorOpen } from "./agentList";
import { isGenreMatch, matchGenre } from "./genreMatch";

const DAY = 86_400_000;
const dmy = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** The draft fields the engine compares — the form's own value shapes. */
export interface ContactDraft {
  name: string;
  agency: string;
  email: string;
  website: string;
  city: string;
  country: string;
  responseTimeWeeks: number | null;
  noResponseMeansNo: boolean | undefined;
  submissionStatus: Agent["submissionStatus"];
  reopensOn: string;
  genres: string[];
  mswlNotes: string;
  materialsWanted: string[];
  starRating: number | null;
}

/** A blank draft for the add card (§8) — born the way a new agent is born: optionals ABSENT
 *  (null weeks, undefined NRN, no rating), door open, nothing pre-answered for the writer. */
export const emptyContactDraft = (): ContactDraft => ({
  name: "", agency: "", email: "", website: "", city: "", country: "",
  responseTimeWeeks: null, noResponseMeansNo: undefined,
  submissionStatus: "Open" as Agent["submissionStatus"], reopensOn: "",
  genres: [], mswlNotes: "", materialsWanted: [], starRating: null,
});

export const draftFromAgentRecord = (a: Agent): ContactDraft => ({
  name: a.name ?? "",
  agency: a.agency ?? "",
  email: a.email ?? "",
  website: a.website ?? "",
  city: a.city ?? "",
  country: a.country ?? "",
  responseTimeWeeks: typeof a.responseTimeWeeks === "number" ? a.responseTimeWeeks : null,
  noResponseMeansNo: a.noResponseMeansNo,
  submissionStatus: a.submissionStatus,
  reopensOn: a.reopensOn ?? "",
  genres: [...(a.genres ?? [])],
  mswlNotes: a.mswlNotes ?? "",
  materialsWanted: Array.isArray(a.materialsWanted) ? [...(a.materialsWanted as string[])] : [],
  starRating: typeof a.starRating === "number" ? a.starRating : null,
});

export interface AlsoNote {
  /** which form section the note sits under */
  field: "reply" | "who" | "door" | "genres" | "nrn";
  lines: string[];
  /** the surfaces this note touches — the footer and the saved line union these */
  surfaces: string[];
}

export interface EditCtx {
  queries: readonly Query[];
  agents: readonly Agent[];
  /** the manuscript in scope, for the genre-match count */
  msGenre: string | null;
  msTitle: string | null;
  nowMs: number;
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

const LIVE = (q: Query) => !["Rejected", "Withdrawn", "No Response"].includes(String(q.status));

/**
 * The notes for the current draft — recomputed as the draft changes (§7.3: the note appears as
 * soon as the draft differs, and names only real consumers).
 */
export function alsoChanges(orig: Agent, draft: ContactDraft, ctx: EditCtx): AlsoNote[] {
  const notes: AlsoNote[] = [];

  /* ── reply time: dry-run the engine per live query ─────────────────────────────────────── */
  const weeksChanged = draft.responseTimeWeeks !== (typeof orig.responseTimeWeeks === "number" ? orig.responseTimeWeeks : null);
  if (weeksChanged) {
    const lines: string[] = [];
    const draftAgent: Agent = { ...orig, responseTimeWeeks: draft.responseTimeWeeks ?? undefined };
    if (draft.responseTimeWeeks == null) delete (draftAgent as Partial<Agent>).responseTimeWeeks;
    const live = ctx.queries.filter((q) => q.agentId === orig.id && LIVE(q));
    for (const q of live) {
      const before = expectedFor(q, orig);
      const after = expectedFor(q, draftAgent);
      /* only queries whose expected date actually depends on the window move (agent-side kinds) */
      if (before.ms === after.ms) continue;
      const from = before.ms != null ? dmy(before.ms) : "no date";
      const to = after.ms != null ? dmy(after.ms) : "no date";
      /* the crossing clause appears only when the date crosses TODAY, in either direction */
      const wasPast = before.ms != null && before.ms < ctx.nowMs;
      const isPast = after.ms != null && after.ms < ctx.nowMs;
      const crossing = wasPast && !isPast
        ? ", so it is no longer past the date and leaves Your move"
        : !wasPast && isPast
          ? ", so it becomes past the date and moves to Your move"
          : "";
      lines.push(`Query Centre and Birds-eye view: your query's reply expected ${from} → ${to}${crossing}.`);
    }
    lines.push("To-do list and Dashboard: when to nudge, and the reply-window bar, read this window.");
    lines.push(`Analytics: ${orig.name.trim() || "this agent"}'s stated window feeds your expected-reply figures.`);
    notes.push({ field: "reply", lines, surfaces: ["the Query Centre", "the To-do list", "the Dashboard", "Analytics"] });
  }

  /* ── name / agency: only an agent with queries is named anywhere else ──────────────────── */
  const nameChanged = draft.name.trim() !== (orig.name ?? "").trim() || draft.agency.trim() !== (orig.agency ?? "").trim();
  if (nameChanged && ctx.queries.some((q) => q.agentId === orig.id)) {
    notes.push({
      field: "who",
      lines: [
        `Query Centre and To-do list: the new name shows on your quer${ctx.queries.filter((q) => q.agentId === orig.id).length === 1 ? "y" : "ies"} and across their history.`,
        "Dashboard feed: older entries that use the old name will no longer link to this agent.",
      ],
      surfaces: ["the Query Centre", "the To-do list", "the Dashboard feed"],
    });
  }

  /* ── open to queries ───────────────────────────────────────────────────────────────────── */
  if (draft.submissionStatus !== orig.submissionStatus) {
    const opening = draft.submissionStatus === "Open";
    const openNow = ctx.agents.filter((a) => a.id !== orig.id && isDoorOpen(a)).length + (opening ? 1 : 0);
    notes.push({
      field: "door",
      lines: [
        `This page's counts move: Open to queries becomes ${openNow}.`,
        `The log-a-query sheet and the Query Centre's agent panel show them as ${opening ? "open" : "closed"} to queries.`,
      ],
      surfaces: ["this page's counts", "the log-a-query sheet", "the Query Centre's agent panel"],
    });
  }

  /* ── genres: only when the manuscript's own genre joins or leaves ──────────────────────── */
  if (!sameList(draft.genres, orig.genres ?? []) && ctx.msGenre) {
    const match = matchGenre(ctx.msGenre);
    if (match) {
      const had = (orig.genres ?? []).some((g) => isGenreMatch(g, match));
      const has = draft.genres.some((g) => isGenreMatch(g, match));
      if (had !== has) {
        const others = ctx.agents.filter((a) => a.id !== orig.id && (a.genres ?? []).some((g) => isGenreMatch(g, match))).length;
        const n = others + (had ? 1 : 0);
        const n2 = others + (has ? 1 : 0);
        const g = ctx.msGenre.toLowerCase();
        notes.push({
          field: "genres",
          lines: [
            `Want ${g}: ${n} → ${n2}. They'll be ${has ? "marked" : "no longer marked"} as a ${g} match on this page, in the log-a-query sheet's agent panel, and in the Dashboard's "Seeking" line.`,
          ],
          surfaces: ["this page", "the log-a-query sheet", "the Dashboard's agent panel"],
        });
      }
    }
  }

  /* ── no-response-means-no (ruling e): the nudge and close flows read it ────────────────── */
  if (draft.noResponseMeansNo !== orig.noResponseMeansNo) {
    notes.push({
      field: "nrn",
      lines: ["To-do list and Query Centre: when to nudge, and when a quiet query suggests closing, read whether silence counts as their answer."],
      surfaces: ["the To-do list", "the Query Centre"],
    });
  }

  /* wishlist, materials, links, location, rating, notes: no reader outside the card (the P0
     sweep's answer), so no note — the footer then says "Only this card changes." */
  return notes;
}

/** The footer's one-line summary (§7.3). */
export function alsoSummary(notes: readonly AlsoNote[]): string {
  const surfaces = [...new Set(notes.flatMap((n) => n.surfaces))];
  if (surfaces.length === 0) return "Only this card changes.";
  const list = surfaces.length === 1 ? surfaces[0]
    : `${surfaces.slice(0, -1).join(", ")} and ${surfaces[surfaces.length - 1]}`;
  return `Saving also updates ${list}.`;
}

/** The sage line the card returns to view mode with. */
export function savedLine(notes: readonly AlsoNote[]): string {
  const surfaces = [...new Set(notes.flatMap((n) => n.surfaces))];
  if (surfaces.length === 0) return "Saved.";
  const list = surfaces.length === 1 ? surfaces[0]
    : `${surfaces.slice(0, -1).join(", ")} and ${surfaces[surfaces.length - 1]}`;
  return `Saved. Also updated ${list}.`;
}

/** How far a date-only string is from now, for the reopen field's own display. */
export const daysUntil = (iso: string, nowMs: number): number => Math.round((Date.parse(iso) - nowMs) / DAY);
