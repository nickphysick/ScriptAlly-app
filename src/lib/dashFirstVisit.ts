/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — the pure rules behind the pre-query dashboard and its empty states
 * (ref design-refs/dashboard-first-visit-v1/; desktop only).
 *
 *  · `campaignEyebrow` — the header's live eyebrow: GETTING READY · QUERYING · BETWEEN ROUNDS.
 *  · `dashPrefsOf` and the path builders — the set-up answer, the tip position, the stamps already shown
 *    and whether Getting started was hidden. ⚠️ ONE SUB-MAP, `todoPrefs.dash`: `todoPrefs` is `is map` and
 *    unconstrained in the rules (the Noteboard, Manuscripts and Contact list precedent), so this ships with NO
 *    rules change, and every write is ONE dotted leaf so it never clobbers another page's prefs.
 *  · `gsOrder` / `GS_COPY` — the desktop Getting started card: its order follows the answer, and its wording is
 *    the card's own (the phone keeps `GETTING_STARTED`'s, untouched).
 *  · `nextTip` — each visit opens on the next tip.
 *  · the first-win stamp's copy.
 *
 * ⚠️ THE ANSWER ONLY CHOOSES A PATH. It changes no data, so a writer who picked "Not yet" and then imports a
 * tracker has lost nothing.
 */
import { ManuscriptStatus, QueryStatus, type Agent, type Query, type User } from "../types";
import { closedAt, sentAt } from "./oneScreen";
import { agentPrimary } from "./agentDisplay";
import type { UserPaths } from "./userPaths";
import type { QueryingStage } from "./onboardingStage";
import type { GettingStartedKey } from "./dashEmpty";
import { MONTHS_SHORT } from "./dates";

/* ── the header's eyebrow ───────────────────────────────────────────────────────────────────────── */

const CLOSED = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN, QueryStatus.SIGNED]);

export type CampaignStage = "ready" | "querying" | "between";

export const CAMPAIGN_EYEBROW: Record<CampaignStage, string> = {
  ready: "GETTING READY",
  querying: "QUERYING",
  between: "BETWEEN ROUNDS",
};

/** Before the first query on this manuscript; while any is active; queries exist and none is active. */
export const campaignStage = (scopedQueries: readonly Pick<Query, "status">[]): CampaignStage =>
  scopedQueries.length === 0 ? "ready" : scopedQueries.some((q) => !CLOSED.has(q.status)) ? "querying" : "between";

/** "— QUERYING —" — the header's established element, now read from the campaign rather than the stored status. */
export const campaignEyebrow = (scopedQueries: readonly Pick<Query, "status">[]): string =>
  `— ${CAMPAIGN_EYEBROW[campaignStage(scopedQueries)]} —`;

/** Dashboard feed v1 — the same campaign word in sentence case ("Querying", "Between rounds"), for the manuscript card. */
export const campaignLabel = (scopedQueries: readonly Pick<Query, "status">[]): string => {
  const w = CAMPAIGN_EYEBROW[campaignStage(scopedQueries)].toLowerCase();
  return w.charAt(0).toUpperCase() + w.slice(1);
};

/* ── Dashboard first visit v2 (Part A): the manuscript card's label and the page's state ─────────── */

/** The manuscript card's five labels, italic sentence case. */
export const BOOK_LABEL = {
  ready: "Getting ready",
  writing: "Still writing",
  revising: "In revision",
  querying: "Querying",
  between: "Between rounds",
} as const;

/**
 * The manuscript card's label. Once a query exists the campaign speaks (Querying / Between rounds); before it, the
 * book's own readiness does: still being written, in revision, or getting ready to query.
 * ⚠️ THE READINESS IS THE STORED `Manuscript.status`, the field sign-up's readiness question writes. Nothing here
 * infers it.
 */
export function bookLabel(scopedQueries: readonly Pick<Query, "status">[], msStatus: ManuscriptStatus | string | null | undefined): string {
  const stage = campaignStage(scopedQueries);
  if (stage === "querying") return BOOK_LABEL.querying;
  if (stage === "between") return BOOK_LABEL.between;
  if (msStatus === ManuscriptStatus.DRAFTING) return BOOK_LABEL.writing;
  if (msStatus === ManuscriptStatus.REVISING) return BOOK_LABEL.revising;
  return BOOK_LABEL.ready;
}

/**
 * Which first-visit state the page is in (Part A). `pre` and `resume` come before the first query on this manuscript
 * (`resume` when a Smart Import draft is waiting); `querying` while any query is live; `between` once every query is
 * closed. "All set up" is not a state of the page: it is the Getting started sheet's own finish line (Part H).
 */
export type DashState = "pre" | "resume" | "querying" | "between";
export function dashState(scopedQueries: readonly Pick<Query, "status">[], hasDraft: boolean): DashState {
  const stage = campaignStage(scopedQueries);
  if (stage === "ready") return hasDraft ? "resume" : "pre";
  return stage;
}

/* ── the stored preferences ─────────────────────────────────────────────────────────────────────── */

/**
 * The set-up path (first visit v2, Part B): already querying · ready but not querying · still writing · in revision.
 * It is READ FROM THE SIGN-UP ANSWERS (`answerFor`), never asked again on the dashboard.
 */
export type StartPath = "querying" | "ready" | "writing" | "revising";
/** First visit v1's stored dashboard answer, read only for an account that never answered the sign-up stage question. */
export type LegacyStart = "yes" | "notyet";
export type WinKind = "query" | "agent" | "import";

export interface DashPrefs {
  /** first visit v1's set-up answer per manuscript (legacy; see `answerFor`) */
  start: Record<string, LegacyStart>;
  /** the index of the tip shown on the last visit; null before the first */
  tip: number | null;
  /** stamps already shown, keyed by `winKey` */
  wins: Record<string, true>;
  /** Getting started hidden per manuscript (the band's "Hide") */
  gsHidden: Record<string, true>;
  /** first visit v2 (Part D): the first-visit tour has been decided — finished, skipped, or never to run */
  tour: boolean;
  /** first visit v2 (Part G): the nudge-email ask's answer, once given */
  reminder: "yes" | "not_now" | null;
}

const ROOT = "todoPrefs.dash";

/** A manuscript id as a field-path segment: only the characters a generated id ever carries. */
export const seg = (id: string): string => id.replace(/[^A-Za-z0-9_-]/g, "_");

/** Total reader: whatever is stored (or nothing), a well-formed value comes back. */
export function dashPrefsOf(user: Pick<User, "todoPrefs"> | null | undefined): DashPrefs {
  const raw = ((user?.todoPrefs as { dash?: Record<string, unknown> } | undefined)?.dash ?? {}) as {
    start?: Record<string, unknown>; tip?: unknown; wins?: Record<string, unknown>; gsHidden?: Record<string, unknown>; tour?: unknown; reminder?: unknown;
  };
  const start: Record<string, LegacyStart> = {};
  for (const [k, v] of Object.entries(raw.start ?? {})) if (v === "yes" || v === "notyet") start[k] = v;
  const flags = (m: Record<string, unknown> | undefined) => {
    const out: Record<string, true> = {};
    for (const [k, v] of Object.entries(m ?? {})) if (v === true) out[k] = true;
    return out;
  };
  return {
    start,
    tip: typeof raw.tip === "number" && Number.isInteger(raw.tip) && raw.tip >= 0 ? raw.tip : null,
    wins: flags(raw.wins),
    gsHidden: flags(raw.gsHidden),
    tour: raw.tour === "done",
    reminder: raw.reminder === "yes" || raw.reminder === "not_now" ? raw.reminder : null,
  };
}

/** First visit v1's stored answer for a manuscript, if any. */
export const legacyStartOf = (prefs: DashPrefs, msId: string | null): LegacyStart | null =>
  (msId ? prefs.start[seg(msId)] : undefined) ?? null;

/** The sign-up stages that mean "I've sent queries". */
const QUERYING_STAGES = new Set<QueryingStage>(["early", "deep", "interest"]);

/**
 * THE SET-UP PATH, READ FROM WHAT THE WRITER SAID AT SIGN-UP (first visit v2, Part B). In order:
 *  1. the querying stage (`User.queryingStage`): early / deep / interest → already querying;
 *  2. the book's readiness (`Manuscript.status`, the readiness question): Drafting → still writing, Revising → in revision;
 *  3. the stage "starting" → ready, not querying yet;
 *  4. an account that never answered the stage question: first visit v1's dashboard answer, if it gave one.
 * ⚠️ NULL WHEN NOTHING WAS SAID. The card then opens on the question rather than telling the writer something they
 * never said ("You said…" is a claim about their own words).
 */
export function answerFor(input: { stage: QueryingStage | null | undefined; status: ManuscriptStatus | string | null | undefined; legacy: LegacyStart | null }): StartPath | null {
  const { stage, status, legacy } = input;
  if (stage && QUERYING_STAGES.has(stage)) return "querying";
  if (status === ManuscriptStatus.DRAFTING) return "writing";
  if (status === ManuscriptStatus.REVISING) return "revising";
  if (stage === "starting") return "ready";
  if (legacy === "yes") return "querying";
  if (legacy === "notyet") return "ready";
  return null;
}

/** The three answers the card offers ("still writing or revising" is one answer, two paths). */
export type AnswerChoice = "querying" | "ready" | "writing";
export const choiceOf = (p: StartPath | null): AnswerChoice | null => (p === "revising" ? "writing" : p);

export interface AnswerWrite {
  /** `User.queryingStage` — the same field sign-up's stage question writes */
  queryingStage: QueryingStage;
  /** `Manuscript.status` — the same field sign-up's readiness question writes; null when it stays as it is */
  status: ManuscriptStatus | null;
}

/**
 * What changing the answer on the dashboard writes (Part B): THE SAME FIELDS SIGN-UP WROTE.
 *  · already querying → the stage becomes "early" (an existing early / deep / interest is kept); the book READY_TO_QUERY
 *  · ready, not querying → the stage "starting"; the book READY_TO_QUERY
 *  · still writing or revising → the stage "starting"; the book DRAFTING, unless it was already REVISING
 */
export function answerWrite(choice: AnswerChoice, stage: QueryingStage | null | undefined, status: ManuscriptStatus | string | null | undefined): AnswerWrite {
  const set = (s: ManuscriptStatus): ManuscriptStatus | null => (status === s ? null : s);
  if (choice === "querying") return { queryingStage: stage && QUERYING_STAGES.has(stage) ? stage : "early", status: set(ManuscriptStatus.READY_TO_QUERY) };
  if (choice === "ready") return { queryingStage: "starting", status: set(ManuscriptStatus.READY_TO_QUERY) };
  return { queryingStage: "starting", status: status === ManuscriptStatus.REVISING ? null : set(ManuscriptStatus.DRAFTING) };
}

/** The path a write leaves the book on (what the card shows straight after the click). */
export const pathAfter = (choice: AnswerChoice, status: ManuscriptStatus | string | null | undefined): StartPath =>
  choice === "writing" ? (status === ManuscriptStatus.REVISING ? "revising" : "writing") : choice;

export const tipWrite = (i: number): UserPaths => ({ [`${ROOT}.tip`]: i });
export const gsHideWrite = (msId: string): UserPaths => ({ [`${ROOT}.gsHidden.${seg(msId)}`]: true });

/** The key a stamp is remembered by: per kind and manuscript (an agent is the writer's, so it has none). */
export const winKey = (kind: WinKind, msId: string | null): string => (kind === "agent" ? "agent" : `${kind}_${seg(msId ?? "none")}`);
export const winWrite = (key: string): UserPaths => ({ [`${ROOT}.wins.${key}`]: true });

/* ── first visit v2, Part G: the nudge-email ask ── */

export const REMINDER = {
  title: "Want an email when a nudge is due?",
  text: (first: string) => `If ${first} hasn't replied in time, we'll email you so you can follow up. Only when there's something to do, never more than once a day.`,
  yes: "Yes, email me",
  notNow: "Not now",
  done: "We'll email you when a nudge is due.",
  settings: "Change in Settings",
} as const;

/**
 * Whether to ask (once per account): after the first query, while the account has not answered it, and never when the
 * writer has already turned nudge emails on. ⚠️ THE STORED LEAF, NOT THE SETTINGS READER: `NOTIFY_DEFAULT.nudges` is
 * true, so the reader says "on" for an account that never chose anything; only a stored `true` was the writer's choice.
 */
export const shouldAskReminder = (i: { queries: number; answered: DashPrefs["reminder"]; storedNudges: unknown }): boolean =>
  i.queries > 0 && i.answered === null && i.storedNudges !== true;

/** Yes: `notifyPrefs.nudges` as ONE leaf (Settings saves the whole map from its reader; every other key is kept). */
export const REMINDER_YES: UserPaths = { "notifyPrefs.nudges": true, [`${ROOT}.reminder`]: "yes" };
export const REMINDER_NOT_NOW: UserPaths = { [`${ROOT}.reminder`]: "not_now" };

/** "Tessa" — the first word of the agent's name, or "the agent" when the record has none. */
export const firstNameOf = (name: string | null | undefined): string => (name ?? "").trim().split(/\s+/)[0] || "the agent";

/* ── the tips ───────────────────────────────────────────────────────────────────────────────────── */

/** Each visit opens on the tip after the last one shown; the first visit opens on the first. */
export const nextTip = (last: number | null, n: number): number => (n <= 0 ? 0 : last === null ? 0 : (last + 1) % n);
/** ‹ › loop round. */
export const stepTip = (i: number, d: number, n: number): number => (n <= 0 ? 0 : ((i + d) % n + n) % n);

/* ── Getting started, on the desktop task card ──────────────────────────────────────────────────── */

/** The answer decides the order: an existing querier brings their queries in before building a contact list. */
export const gsOrder = (path: StartPath | null): GsKey[] =>
  path === "querying" ? ["manuscript", "query", "agent", "materials", "comps"]
    : path === "writing" || path === "revising" ? ["manuscript", "comps", "agent", "letter", "ready"]
      : ["manuscript", "agent", "query", "materials", "comps"];

/**
 * The desktop's row keys: the shared five (`lib/dashEmpty`, which the phone reads too and which this pack leaves alone)
 * and the still-writing path's two of its own (first visit v2, Part C): start the query letter, and say it's ready.
 */
export type GsKey = GettingStartedKey | "letter" | "ready";

export interface GsDoneInput {
  /** the shared rows' done-states (`gettingStartedRows`) */
  shared: readonly { key: GettingStartedKey; done: boolean }[];
  /** a query-letter version is saved for this manuscript */
  letter: boolean;
}

/**
 * Each row's done-state, derived from records (Part C). The shared keys keep the shared rule — the comps row ticks at
 * `COMPS_TARGET` titles on either path. "Start your query letter" ticks once a query-letter version is saved; "Tell us
 * when it's ready" is never done on the writing path, because the moment it is true the path is the ready one.
 */
export const gsRowDone = (key: GsKey, i: GsDoneInput): boolean =>
  key === "letter" ? i.letter : key === "ready" ? false : i.shared.find((r) => r.key === key)?.done ?? false;

export type GsLink = "manuscript" | "agent" | "import" | "log" | "materials" | "comps" | "discover" | "letter" | "ready";

export interface GsRowCopy { deed: string; note: string; link: string; go: GsLink }

/**
 * The card's own wording (the ref's). ⚠️ THE MATERIALS ROW SAYS "LETTER AND SYNOPSIS" because that is what its
 * tick checks (`PACKAGE_MATERIALS`, two since D9) — the shared deed still names an opening sample the tick no
 * longer asks for, and is the phone's to change.
 */
export const gsCopy = (key: GsKey, path: StartPath | null): GsRowCopy => {
  const writing = path === "writing" || path === "revising";
  switch (key) {
    case "manuscript": return { deed: "Add your first manuscript", note: "Even a working title and a word count is enough to start.", link: "Add a manuscript", go: "manuscript" };
    case "agent": if (writing) return { deed: "Shortlist your first agent", note: "Browse Discover for agents who take on books like yours.", link: "Browse Discover", go: "discover" };
      return { deed: "Add an agent to your contact list", note: "Even one is enough to start. Discover has UK agents to browse.", link: "Add an agent", go: "agent" };
    case "query": return path === "querying"
      ? { deed: "Import or log your queries", note: "Bring your tracker across, or log each query as you send it.", link: "Import your tracker", go: "import" }
      : { deed: "Log your first query", note: "When you've sent it, log the date and what went with it.", link: "Log a query", go: "log" };
    case "materials": return { deed: "Add your query letter and synopsis", note: "So each query records exactly what was sent.", link: "Add materials", go: "materials" };
    case "comps": return writing
      ? { deed: "Add three comparable titles", note: "Books like yours, out in the last few years. Agents ask for them, and they shape your shortlist.", link: "Add comparable titles", go: "comps" }
      : { deed: "Add three comparable titles", note: "Most agents ask for them; they go straight into your packages.", link: "Add comps", go: "comps" };
    case "letter": return { deed: "Start your query letter", note: "A first draft is plenty. You can keep versions as it changes.", link: "Start a letter", go: "letter" };
    case "ready": return { deed: "Tell us when it's ready to query", note: "Then the dashboard switches to sending and tracking queries.", link: "It's ready", go: "ready" };
    default: {
      const unhandled: never = key;
      return unhandled;
    }
  }
};

/* ── the first-win stamp ────────────────────────────────────────────────────────────────────────── */

const dayMonth = (iso: string | null | undefined): string => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1] ?? ""}` : "";
};

/** "{agent} · {agency}", never the same words twice (a nameless agent is called by its agency). */
const whoLine = (name: string, agency: string): string => {
  const n = name.trim(), a = agency.trim();
  return [n, a && a.toLowerCase() !== n.toLowerCase() ? a : ""].filter(Boolean).join(" · ");
};

export interface WinCopy { title: string; sub: string }

/** The stamp records the event; it never congratulates. */
export const winCopy = {
  query: (name: string, agency: string, sentIso: string | null | undefined): WinCopy => ({
    title: "First query logged",
    sub: [whoLine(name, agency), dayMonth(sentIso)].filter(Boolean).join(" · "),
  }),
  agent: (name: string, agency: string): WinCopy => ({ title: "First agent added", sub: whoLine(name, agency) }),
  import: (n: number): WinCopy => ({
    title: `${n.toLocaleString("en-GB")} ${n === 1 ? "query" : "queries"} imported`,
    sub: "Your campaign is on the dashboard",
  }),
};

/**
 * The triggers, stated once (Part B). A LOGGED query is a first win when this manuscript had none before it; an
 * imported query never is (the import records one stamp for the file). An agent is a first win when the writer
 * had none — an agent belongs to the writer, not to a manuscript, so a second manuscript never re-raises it.
 */
export const isFirstQueryWin = (before: readonly Pick<Query, "manuscriptId">[], msId: string | null | undefined, imported: boolean): boolean =>
  !imported && !!msId && !before.some((q) => q.manuscriptId === msId);
export const isFirstAgentWin = (agentsBefore: number): boolean => agentsBefore === 0;

/**
 * Which pending stamp to strike now: the oldest whose key is not already recorded (in the prefs, or struck on this
 * mount). Everything before it that WAS already recorded is dropped, never repeated.
 */
export function pickStamp<W extends { kind: WinKind; msId: string | null }>(
  pending: readonly W[], shown: Readonly<Record<string, true>>, struck: ReadonlySet<string>,
): { strike: W | null; key: string | null; drop: W[] } {
  const drop: W[] = [];
  for (const w of pending) {
    const key = winKey(w.kind, w.msId);
    if (shown[key] || struck.has(key)) { drop.push(w); continue; }
    return { strike: w, key, drop };
  }
  return { strike: null, key: null, drop };
}

/** How long the stamp holds before it fades (the ref's 2.2s). */
export const STAMP_HOLD_MS = 2200;

/* ── D1 · the chart's two empty treatments ──────────────────────────────────────────────────────── */

const dm = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()] ?? ""}`; };
const WEEK = 7 * 86_400_000;

export const FIRST_POINT = {
  title: "Your first query is out.",
  line: "The line starts here and grows each week as you send more. Replies, requests and passes show up on it as they happen.",
} as const;
export const BETWEEN = {
  title: "Between rounds.",
  line: (n: number) => `All ${n.toLocaleString("en-GB")} ${n === 1 ? "query is" : "queries are"} closed. Log a query when you're ready to start the next round.`,
} as const;

/** Between rounds the line is drawn against 1.6x its peak, so the plateau sits under the two-line headline: measured,
 *  at 1512×900 the headline ends 96px into a 235px plot and the plateau now runs at 108 (it ran at 42, through it). */
export const BETWEEN_HEADROOM = 1.6;

export type ChartEmpty =
  | { kind: "first"; who: string; sub: string; weeks: string[] }
  | { kind: "between"; n: number; mark: string };

/**
 * What the chart says instead of a blank plot (Part D1), or null for an ordinary chart.
 *  · "between" — queries exist and none is active (and none is waiting undated): the history stays, its last point
 *    marked "All closed · {d MMM}" (the latest close).
 *  · "first" — under two days of data: the first point on the baseline, labelled "Queried {agent}" over
 *    "{agency} · {d MMM}", and the week axis that follows it.
 */
export function chartEmpty(input: {
  queries: readonly Query[]; agents: readonly Agent[]; activeCount: number | null; undatedCount: number; sparse: boolean;
}): ChartEmpty | null {
  const { queries, agents, activeCount, undatedCount, sparse } = input;
  if (queries.length === 0 || activeCount === null) return null;
  if (activeCount === 0 && undatedCount === 0) {
    const last = Math.max(...queries.map((q) => closedAt(q) ?? -Infinity));
    return { kind: "between", n: queries.length, mark: Number.isFinite(last) ? `All closed · ${dm(last)}` : "All closed" };
  }
  if (!sparse) return null;
  const dated = queries.map((q) => ({ q, at: sentAt(q) })).filter((x): x is { q: Query; at: number } => x.at !== null).sort((a, b) => a.at - b.at);
  const first = dated[0];
  if (!first) return null;
  const agent = agents.find((a) => a.id === first.q.agentId) ?? null;
  const name = agent ? agentPrimary(agent) : "";
  const agency = (agent?.agency ?? "").trim();
  return {
    kind: "first",
    who: name ? `Queried ${name}` : "Queried",
    sub: [agency && agency.toLowerCase() !== name.toLowerCase() ? agency : "", dm(first.at)].filter(Boolean).join(" · "),
    weeks: [0, 1, 2, 3].map((k) => dm(first.at + k * WEEK)),
  };
}
