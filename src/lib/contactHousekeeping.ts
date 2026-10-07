/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactHousekeeping — Housekeeping v2's gap model (Contact list v13 §6; HK v2 §1–§6). Every item
 * says three things in plain words: what to add, why it helps the writer, and where to find it.
 *
 * THE GAPS ARE reply · materials · genres · wishlist · reopen. `recheck` LEFT THE FEED: wishlist
 * freshness is a periodic check-in (`wishlistCheckin`), never an item, and a null `mswlCheckedAt`
 * is never due.
 *
 * ⚠️ THE REPLY GAP SUPERSEDES RULING (c) (Contact list v13 decision 7). An absent reply time IS a gap
 * until the writer sets one or presses "Say it's not stated" (`todoPrefs.contacts.settled`); the stub
 * `0` is a gap too. This is Housekeeping's rule only: To-do's data-quality task still reads
 * `agentDataQualityNeeds`, where absent counts as the writer's "Unknown" — the two surfaces
 * deliberately disagree about an absent reply time, and the report says so.
 *
 * ⚠️ THE REOPEN GAP IS RULING (b): a closed door with NO undone dated task carrying this agent's id.
 * The reminder IS a `UserTask`, so completing it in To-do reopens the gap here by construction.
 *
 * ⚠️ "HAS PASSED" IS RULING Q6: a query to this agent for this manuscript closed as Rejected, or as
 * No Response where the agent's `noResponseMeansNo` is true. Withdrawn does not count.
 */
import { QueryStatus, type Agent, type Query } from "../types";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { isDoorOpen } from "./agentList";
import { agentPrimary } from "./agentDisplay";
import { joinGenres } from "./genreNoun";
import { formatDate } from "./dates";
import { addMonths, dayKey, earliestLater, itemKey, type ContactPrefs } from "./contactPrefs";
import type { AgentCardField, AgentCardTab } from "./agentCardStore";

export type GapKey = "reply" | "materials" | "genres" | "wishlist" | "reopen";
export const GAP_ORDER: readonly GapKey[] = ["reply", "materials", "genres", "wishlist", "reopen"];

export type GroupKey = "dates" | "packages" | "matches" | "reminders";
export const GROUP_ORDER: readonly GroupKey[] = ["dates", "packages", "matches", "reminders"];
export const GAP_GROUP: Record<GapKey, GroupKey> = {
  reply: "dates", materials: "packages", genres: "matches", wishlist: "matches", reopen: "reminders",
};

/** the by-agent tags — one per gap */
export const GAP_LABEL: Record<GapKey, string> = {
  reply: "Reply time", materials: "What to send", genres: "Genres", wishlist: "Wishlist", reopen: "Reopening date",
};

/** where a gap's card link lands: the tab and the field focused there (HK v2 §1.5's table) */
export const GAP_TARGET: Record<GapKey, { tab: AgentCardTab; focus: AgentCardField }> = {
  reply: { tab: "work", focus: "reply" },
  materials: { tab: "want", focus: "materials" },
  genres: { tab: "want", focus: "genres" },
  wishlist: { tab: "want", focus: "wishlist" },
  reopen: { tab: "work", focus: "reopen" },
};

const WEIGHT: Record<GapKey, number> = { reply: 6, materials: 5, genres: 4, wishlist: 3, reopen: 1 };

/** A run of copy: plain text, the manuscript's title in italic, or a figure in bold. */
export type Run = string | { em: string } | { b: string };

/** What the page knows about one agent that the agent record does not. */
export interface HkAgentCtx {
  /** any LIVE query, whatever the manuscript (the reply window fans out to every query) */
  live: boolean;
  /** the agent's genres include the current manuscript's */
  fits: boolean;
  /** any query for the current manuscript */
  queried: boolean;
  /** ruling Q6 */
  passedOn: boolean;
  /** an undone, dated UserTask carrying this agent's id (ruling b) */
  hasReopenTask: boolean;
}

/** The manuscript the copy names: its title and genre, either of which may be absent. */
/** the book in scope: its title, its MAIN genre (said in brackets, and the genre chips suggest), and its
 *  whole genre list — main plus subGenres (Contact list v14, ruling Q5) — which "takes …" copy names */
export interface HkBook { title: string | null; genre: string | null; genres: readonly string[] }

export interface HkItem {
  agent: Agent;
  gap: GapKey;
  group: GroupKey;
  /** "{agentId}:{gap}" — the later/settled key, and the row's identity */
  key: string;
  score: number;
  live: boolean;
  fits: boolean;
}

const hasWeeks = (a: Agent) => typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0;

/** The agent's gaps, in table order. `settled` is the writer's "Say it's not stated" list. */
export function agentGaps(a: Agent, ctx: Pick<HkAgentCtx, "hasReopenTask">, settled: readonly string[]): GapKey[] {
  const gaps: GapKey[] = [];
  if (!hasWeeks(a) && !settled.includes(itemKey(a.id, "reply"))) gaps.push("reply");
  if (agentDataQualityNeeds(a).includes("materials")) gaps.push("materials");
  if ((a.genres ?? []).length === 0) gaps.push("genres");
  if (!(a.mswlNotes ?? "").trim()) gaps.push("wishlist");
  if (!isDoorOpen(a) && !ctx.hasReopenTask) gaps.push("reopen");
  return gaps;
}

/** HK v2 §3: the most useful first. */
export function gapScore(ctx: Pick<HkAgentCtx, "live" | "fits" | "queried">, gap: GapKey): number {
  return (ctx.live && (gap === "reply" || gap === "materials") ? 30 : 0)
    + (ctx.fits && !ctx.queried ? 20 : 0)
    + WEIGHT[gap];
}

/** Ruling Q6, over the queries for the current manuscript (all of them when none is chosen). */
export function hasPassedOn(a: Pick<Agent, "id" | "noResponseMeansNo">, queries: readonly Query[], msId: string | null): boolean {
  return queries.some((q) => q.agentId === a.id
    && (!msId || q.manuscriptId === msId)
    && (q.status === QueryStatus.REJECTED || (q.status === QueryStatus.NO_RESPONSE && a.noResponseMeansNo === true)));
}

const nameOf = (a: Agent) => agentPrimary(a);
/** "{f}": the agent's first name, or the agency for a nameless record */
export const firstNameOf = (a: Agent): string => ((a.name ?? "").trim().split(/\s+/)[0] || (a.agency ?? "").trim() || "this agent");

const dayLabel = (iso: string): string => {
  const ms = Date.parse(`${iso}T00:00:00`);
  return Number.isNaN(ms) ? iso : formatDate(new Date(ms), { day: "numeric", month: "short" });
};
export const longDayLabel = (iso: string): string => {
  const ms = Date.parse(`${iso}T00:00:00`);
  return Number.isNaN(ms) ? iso : formatDate(new Date(ms), { day: "numeric", month: "short", year: "numeric" });
};

/* ── the copy (HK v2 §4, final) ─────────────────────────────────────────────────────────────── */

export interface GapCopy { title: string; why: Run[]; where: string }

export function gapCopy(item: Pick<HkItem, "agent" | "gap" | "live" | "fits">, book: HkBook): GapCopy {
  const a = item.agent;
  const f = firstNameOf(a);
  const ms: Run = book.title ? { em: book.title } : "your book";
  switch (item.gap) {
    case "reply":
      return {
        title: `How long ${f} takes to reply`,
        why: [item.live
          ? `You’ve queried ${f}. Add this and you’ll see the date their answer is due, and when it’s fair to follow up.`
          : `Add this and, once you query ${f}, you’ll see when to expect an answer.`],
        where: "Most agencies say on their submissions page, something like “we aim to reply within 8 weeks”.",
      };
    case "materials":
      return {
        title: `What ${f} wants you to send`,
        why: [item.live
          ? `You’ve queried ${f}. Note what they ask for so you can check it matches what you sent.`
          : `Note what they ask for, and it’ll be listed for you when you’re ready to query ${f}.`],
        where: "Their submissions page will say, for example “query letter, one-page synopsis and the first three chapters”.",
      };
    case "genres":
      return {
        title: `Which genres ${f} takes`,
        why: [`Add these so QueryHawk can tell you whether ${f} is a fit for `, ms, book.genre ? ` (${book.genre}).` : "."],
        where: "Listed on their agency profile, their MSWL page or the agency’s website.",
      };
    case "wishlist":
      return {
        title: `What ${f} is hoping to find`,
        why: item.fits && book.genre
          ? [`${f} takes ${joinGenres(book.genres.length ? book.genres : [book.genre])}. Their wishlist tells you whether a book like `, ms, " is what they want right now."]
          : ["In their own words, what they’re looking for. It helps you judge whether to query them."],
        where: "Copy a line or two from their MSWL or agency profile, for example “twisty thrillers set outside London”.",
      };
    case "reopen": {
      const until = (a.reopensOn ?? "").trim();
      return {
        title: `When ${f} reopens to queries`,
        why: [`${f} isn’t taking new queries at the moment${until ? ` (until around ${dayLabel(until)})` : ""}. Pick a date and we’ll put a reminder on your To-do list.`],
        where: "If their page gives a reopening date, use that. If not, checking back in a month is a good default.",
      };
    }
    default: {
      const unhandled: never = item.gap;
      return unhandled;
    }
  }
}

export const GROUP_COPY: Record<GroupKey, { heading: string; explainer: (book: HkBook) => Run[] }> = {
  dates: {
    heading: "Know when replies are due",
    explainer: () => ["How long each agent takes to answer. With it, every query you send shows the date a reply is due and when it’s fair to follow up."],
  },
  packages: {
    heading: "Know what to send",
    explainer: () => ["Every agent asks for something slightly different: a letter, a synopsis, a few chapters. Record it once and it’s there when you query."],
  },
  matches: {
    heading: "Know who fits your book",
    explainer: (b) => ["The genres agents take and what they’re hoping to find. It’s how QueryHawk tells you who suits ", b.title ? { em: b.title } : "your book", "."],
  },
  reminders: {
    heading: "Catch agents when they reopen",
    explainer: () => ["Some agents pause new queries. Set a reminder and you’ll know when to check back."],
  },
};

export const HK_EMPTY = (b: HkBook): Run[] => [
  { b: "Every profile is filled in." },
  " Every query will show when a reply is due, you’ll know what each agent wants you to send, and QueryHawk can tell you who fits ",
  b.title ? { em: b.title } : "your book", ".",
];
export const HK_FOOT = "We only ask for details that make QueryHawk more useful to you.";
export const HK_LATER_LINE = (untilIso: string): string => `Hidden until ${dayLabel(untilIso)}. It comes back on its own then.`;

/* ── the model ──────────────────────────────────────────────────────────────────────────────── */

export interface HkAgentRow { agent: Agent; items: HkItem[]; best: number }

export interface HkModel {
  /** visible items, most useful first */
  items: HkItem[];
  /** put off with "Later", still hidden */
  hidden: HkItem[];
  /** the earliest day a hidden item returns */
  laterUntil: string | null;
  total: number;
  /** agents with no gap at all (a hidden gap is still a gap) */
  complete: number;
  /** agents with a visible gap */
  gapAgents: number;
  /** complete ÷ total, 0 on an empty list */
  share: number;
  byAgent: HkAgentRow[];
  gapsById: Map<string, GapKey[]>;
}

const byName = (x: Agent, y: Agent) => nameOf(x).toLowerCase().localeCompare(nameOf(y).toLowerCase());

export function hkModel(agents: readonly Agent[], ctxOf: (a: Agent) => HkAgentCtx, prefs: ContactPrefs): HkModel {
  const all: HkItem[] = [];
  const gapsById = new Map<string, GapKey[]>();
  let complete = 0;
  for (const a of agents) {
    const ctx = ctxOf(a);
    const gaps = agentGaps(a, ctx, prefs.settled);
    gapsById.set(a.id, gaps);
    if (gaps.length === 0) complete += 1;
    for (const gap of gaps) {
      all.push({ agent: a, gap, group: GAP_GROUP[gap], key: itemKey(a.id, gap), score: gapScore(ctx, gap), live: ctx.live, fits: ctx.fits });
    }
  }
  const order = (x: HkItem, y: HkItem) => y.score - x.score || byName(x.agent, y.agent) || GAP_ORDER.indexOf(x.gap) - GAP_ORDER.indexOf(y.gap);
  all.sort(order);
  const items = all.filter((i) => !prefs.later[i.key]);
  const hidden = all.filter((i) => !!prefs.later[i.key]);
  const rows = new Map<string, HkAgentRow>();
  for (const it of items) {
    const r = rows.get(it.agent.id) ?? { agent: it.agent, items: [], best: 0 };
    r.items.push(it);
    r.best = Math.max(r.best, it.score);
    rows.set(it.agent.id, r);
  }
  const byAgent = [...rows.values()].sort((x, y) => y.best - x.best || y.items.length - x.items.length || byName(x.agent, y.agent));
  return {
    items, hidden, laterUntil: hidden.length ? earliestLater(prefs) : null,
    total: agents.length, complete, gapAgents: rows.size,
    share: agents.length ? complete / agents.length : 0,
    byAgent, gapsById,
  };
}

/** "Best place to start" (Contact list v13 §2 order), or null when there are no gaps. */
export function bestPlaceToStart(items: readonly HkItem[], book: HkBook): Run[] | null {
  if (!items.length) return null;
  const n = (g: GapKey) => items.filter((i) => i.gap === g).length;
  const liveReply = items.filter((i) => i.gap === "reply" && i.live).length;
  const ag = (k: number) => `${k} agent${k === 1 ? "" : "s"}`;
  if (liveReply) return ["You’ve queried ", { b: ag(liveReply) }, " without knowing how long they take to reply. Add it and we’ll show you when each answer is due."];
  if (n("materials")) return [{ b: ag(n("materials")) }, ` ${n("materials") === 1 ? "has" : "have"} no record of what they want you to send. Add it once and it’s ready when you query.`];
  if (n("genres") + n("wishlist")) return ["Add genres or wishlists for ", { b: String(n("genres") + n("wishlist")) }, " and QueryHawk can tell you who fits ", book.title ? { em: book.title } : "your book", "."];
  return ["Just a few quick checks left."];
}

/** "13 to go · about 5 minutes · stop whenever you like" */
export const sessionMinutes = (n: number): number => Math.max(1, Math.round(n * 0.4));
export const sessionLine = (n: number): string => `${n} to go · about ${sessionMinutes(n)} minute${sessionMinutes(n) === 1 ? "" : "s"} · stop whenever you like`;

/** The tab's counts line: "14 GAPS · 31 OF 41 FILLED IN" (uppercased by the sheet). */
export const tabCounts = (m: Pick<HkModel, "items" | "complete" | "total">): string =>
  `${m.items.length} gap${m.items.length === 1 ? "" : "s"} · ${m.complete} of ${m.total} filled in`;

/* ── the fixes' facts ───────────────────────────────────────────────────────────────────────── */

/**
 * The reopen chips (HK v2 §5): the 1st of each of the next three months — 1 January moving to the
 * first Monday after it — and "In a month" (today + 1 month). On 4 Oct 2026: 1 Nov · 1 Dec · 4 Jan.
 */
export function reopenChips(today: Date): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let k = 1; k <= 3; k += 1) {
    let d = new Date(today.getFullYear(), today.getMonth() + k, 1);
    if (d.getMonth() === 0) {
      const toMonday = ((8 - d.getDay()) % 7) || 7;
      d = new Date(d.getFullYear(), 0, 1 + toMonday);
    }
    out.push({ value: dayKey(d), label: dayLabel(dayKey(d)) });
  }
  out.push({ value: dayKey(addMonths(today, 1)), label: "In a month" });
  return out;
}

/** The genre chips (HK v2 §5): up to eight — the manuscript's genre first, then the writer's own
 *  list, most used first. `pool` is the genres on the writer's agents, in any order. */
export function genreChips(msGenre: string | null, pool: readonly string[], cap = 8): string[] {
  const counts = new Map<string, number>();
  for (const g of pool) { const t = g.trim(); if (t) counts.set(t, (counts.get(t) ?? 0) + 1); }
  const ranked = [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([g]) => g);
  const out: string[] = [];
  const push = (g: string) => { if (g && !out.some((x) => x.toLowerCase() === g.toLowerCase())) out.push(g); };
  if (msGenre) push(msGenre.trim());
  ranked.forEach(push);
  return out.slice(0, cap);
}

/** The foot's line after a fix — what was written, in the writer's words (the Undo sits beside it). */
export function savedLine(item: Pick<HkItem, "agent" | "gap" | "live">, what: {
  weeks?: number; settled?: boolean; genres?: string[]; fitsAfter?: boolean; remindOn?: string; book?: HkBook;
}): string {
  const n = nameOf(item.agent);
  switch (item.gap) {
    case "reply":
      return what.settled
        ? `${n}: reply time not stated. We won’t ask again.`
        : `${n} replies in about ${what.weeks} week${what.weeks === 1 ? "" : "s"}.${item.live ? " Your reply-due date is set." : ""}`;
    case "materials": return `Saved what ${n} wants you to send.`;
    case "genres": return `${n}: ${(what.genres ?? []).join(", ")}.${what.fitsAfter && what.book?.title ? ` Now matches ${what.book.title}.` : ""}`;
    case "wishlist": return `${n}: wishlist saved.`;
    case "reopen": return `Reminder on your To-do list for ${what.remindOn ? dayLabel(what.remindOn) : "that day"}.`;
    default: {
      const unhandled: never = item.gap;
      return unhandled;
    }
  }
}

/* ── the wishlist check-in (HK v2 §6) ───────────────────────────────────────────────────────── */

export interface Checkin {
  /** agents due, in order: live first, then fits, then the oldest stamp */
  due: Agent[];
  /** the card shows: today ≥ wishlistNextOn (or none) and at least one agent is due */
  show: boolean;
  /** the quiet line's day, when the card is not showing and a next check-in is set */
  nextOn: string | null;
}

export function wishlistCheckin(agents: readonly Agent[], ctxOf: (a: Agent) => HkAgentCtx, prefs: ContactPrefs, today: Date): Checkin {
  const now = dayKey(today);
  const due = agents.filter((a) => {
    if (!(a.mswlNotes ?? "").trim()) return false;
    const stamp = (a.mswlCheckedAt ?? "").trim();
    if (!stamp) return false; // a null stamp is never due
    const ms = Date.parse(stamp);
    if (Number.isNaN(ms)) return false;
    if (dayKey(addMonths(new Date(ms), prefs.wishlistEvery)) > now) return false;
    if (!isDoorOpen(a)) return false;
    return !ctxOf(a).passedOn;
  }).sort((x, y) => {
    const cx = ctxOf(x), cy = ctxOf(y);
    return Number(cy.live) - Number(cx.live) || Number(cy.fits) - Number(cx.fits)
      || Date.parse(x.mswlCheckedAt ?? "") - Date.parse(y.mswlCheckedAt ?? "");
  });
  const open = !prefs.wishlistNextOn || prefs.wishlistNextOn <= now;
  return { due, show: open && due.length > 0, nextOn: !open ? prefs.wishlistNextOn : null };
}

/** "LAST CHECKED FEBRUARY 2026" (uppercased by the sheet) */
export const lastCheckedLine = (stamp: string | undefined): string => {
  const ms = Date.parse(stamp ?? "");
  return Number.isNaN(ms) ? "Last checked" : `Last checked ${formatDate(new Date(ms), { month: "long", year: "numeric" })}`;
};
