/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 (design-refs/log-a-query-v1/) — THE STAGED JOURNEY'S MODEL, shared by its two hosts (the Query Centre
 * and the Contact list). Everything here is pure: what each agent, package and piece looks like to the stages, how the
 * writer's answers become the log save's own `LogPlan`, and the words the check stage and the celebration say.
 *
 * ⚠️ THE SAVE IS UNCHANGED. `planOf` builds exactly the `LogPlan` the old form built — v1.3's Nudge stage answers
 *    (`replyPlan`) fill the reply date and the nudge as the old journey's "Response expectations" did, `pieceVersions`
 *    a package — and adds nothing to the payload. A chosen book version rides
 *    in `pieceV.bookVersion` by NAME, because that is the field the plan has (it never stored an id).
 * ⚠️ THE PREVIEW IS THE SAVE: the check stage's slip is built from `logPayload(plan)` — the very record `saveLog` will
 *    write — through `buildQcRows` and `stampRows`, the list's own helpers. Nothing about the slip is re-derived here.
 */
import { QueryStatus, SubmissionMethod, type Agent, type Query } from "../../types";
import { buildQcRows, type QcRow } from "../qcSummary";
import { stampRows, type QueryState } from "../queryState";
import { doorOf } from "../agentList";
import { fitOrder } from "../agentFit";
import { queryViaOf } from "../queryVia";
import { MONTHS_SHORT } from "../dates";
import { agentAgencyLine, agentInitials, agentPrimary } from "../agentDisplay";
import { logPayload, materialsToQuery, pieceVersions, type IfNo, type LogPlan, type PieceVersions } from "./logSave";
import { formatQueryMaterial } from "../materials";
import { materialIconKind, type MaterialIconKind } from "../materialIcon";
import { addDays, reminderAnchors } from "./dates";
import { guidelineAsk, packageMatches, type GuidelineAsk, type PackageCard } from "./packages";
import { blankSample, sampleName, capFirst, type FromUnit, type Materials, type Sample } from "./sample";
import { liveCount } from "../dashBreakdown";
import { closedAt, sentAt } from "../oneScreen";
import { standWords } from "../qc153";

/** the calendar's heading month, through the platform rather than a second month table (lib/dates owns the one) */
export const monthLong = (year: number, month: number): string => new Date(year, month, 1).toLocaleString("en-GB", { month: "long" });
export const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const sod = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const sameDay = (a: number | null, b: number | null): boolean => a != null && b != null && sod(a) === sod(b);
export const dayMon = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
export const dayMonY = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  return dayMon(ms) + (d.getFullYear() !== new Date(nowMs).getFullYear() ? ` ${d.getFullYear()}` : "");
};
export const weekdayDay = (ms: number): string => `${WEEKDAY[new Date(ms).getDay()]} ${dayMon(ms)}`;
export const ordinal = (n: number): string => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] || "th");
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] || "the agent";

/* ── the stages ───────────────────────────────────────────────────────────────────────────────────────────────── */

export type StageKey = "who" | "when" | "what" | "how" | "nudge" | "check";
/** v1.3 — six nodes: the Nudge stage sits between How and Log, and always shows */
export const STAGES: readonly StageKey[] = ["who", "when", "what", "how", "nudge", "check"];
export const STAGE_LABEL: Record<StageKey, string> = { who: "Agent", when: "Sent", what: "Materials", how: "How", nudge: "Nudge", check: "Log" };

/**
 * v1.2 — THE FLOWHEAD'S LINE: one short line for the whole journey, the same on every stage (the question under the track
 * already says what each stage is). Two exceptions: after "Log and start another" it names the agent just logged, and a
 * step changed from the check says it goes straight back.
 */
export const FLOW_LINE = "Add as much detail as you can.";
export const CHANGE_LINE = "Change it and you'll go straight back.";
export const carriedLine = (lastFirst: string): string => `Same date and materials as ${lastFirst}.`;
export function flowLine(o: { carried: string | null; changing: boolean }): string {
  if (o.changing) return CHANGE_LINE;
  return o.carried ? carriedLine(o.carried) : FLOW_LINE;
}

/**
 * Log a query v2 (design-refs/log-a-query-v2/, mock v22) — THE HEADLINE: two lines in the navy header, the same on every
 * step, chosen by where the writer is. v2 replaces v1.2's title + FLOW_LINE in this journey (the exports above stay for
 * the files that still read them). Every case the journey can be in is a case here, so no string is scattered.
 *
 *   logged          "Logged. Off to {First}!" ("Logged." alone past 11 letters) / "That makes {n} active queries."
 *                   (or "It's on your Queries page." when the reply date has passed, or the count is not known yet)
 *   not sent yet    "Not out yet? No problem." / "It's on your to-do list."
 *   catching up     "Catching up." / "Let's log the details." — sent more than 7 days before today
 *   after "Log and start another"   "That's {n} logged." / "Who's next?" (then "Let's log the details." once an agent is chosen)
 *   otherwise       "Another query out. Great work!" / "Let's log the details."
 */
export interface HeadState {
  /** "Log and start another" this sitting: how many have gone in */
  sitting: number;
  agentChosen: boolean;
  /** the sent date chosen, if any (start of day, ms) */
  sentMs: number | null;
  nowMs: number;
  notSent?: boolean;
  /** the logged screen's facts */
  logged?: { first: string; passed: boolean; active: number | null } | null;
}
export const DETAILS_LINE = "Let’s log the details.";
/** calendar days from `ms` to today (0 = today) */
export const daysBefore = (ms: number, nowMs: number): number => Math.round((sod(nowMs) - sod(ms)) / 86_400_000);
/** more than a week back: 7 days ago is a normal log, 8 is catching up */
export const isCatchingUp = (sentMs: number | null, nowMs: number): boolean => sentMs != null && daysBefore(sentMs, nowMs) > 7;
/** the agent's first name stands in the headline up to 11 letters; longer reads "Logged." alone */
export const LOGGED_NAME_MAX = 11;
export function headline(s: HeadState): [string, string] {
  if (s.logged) {
    const f = s.logged.first;
    const a = f.length > LOGGED_NAME_MAX ? "Logged." : `Logged. Off to ${f}!`;
    const n = s.logged.active;
    return [a, s.logged.passed || n == null ? "It’s on your Queries page." : `That makes ${n} active ${n === 1 ? "query" : "queries"}.`];
  }
  if (s.notSent) return ["Not out yet? No problem.", "It’s on your to-do list."];
  if (isCatchingUp(s.sentMs, s.nowMs)) return ["Catching up.", DETAILS_LINE];
  if (s.sitting > 0) return [`That’s ${s.sitting} logged.`, s.agentChosen ? DETAILS_LINE : "Who’s next?"];
  return ["Another query out. Great work!", DETAILS_LINE];
}

/* ── the agents ───────────────────────────────────────────────────────────────────────────────────────────────── */

export interface StageAgent {
  id: string;
  name: string;
  first: string;
  agency: string;
  initials: string;
  /** already querying this book (a live query) — the day it went, for "queried {date}" */
  queriedMs: number | null;
  querying: boolean;
  /** v2.1 (D4) — any query for this book, active or closed: such an agent is never offered under "Not queried yet" */
  queried: boolean;
  /** v2.1 — where this book's latest query to them stands, in the Queries page's words (`standWords`); null if none */
  standing: string | null;
  /** v2.1 — when that query last moved (its close, else its send), for "most recent first" */
  lastMs: number | null;
  closed: boolean;
  /** "5 Jan" when the card records a reopening date */
  reopens: string | null;
  via: SubmissionMethod | null;
  email: string | null;
  weeks: number | null;
  nrmn: boolean;
  ask: GuidelineAsk;
  agent: Agent;
}

/**
 * The journey's agents, read against EVERY query for this book (v2.1, D4: the host used to pass only the active ones,
 * so an agent whose query had closed — a pass, no reply, withdrawn — came back under "Not queried yet").
 * ⚠️ `querying` stays "has an ACTIVE query for this book": a door that seeds an agent (the agent card's "Log query")
 *    still opens on one whose query closed — re-querying is out of scope (D5) and left exactly as it was.
 */
export function stageAgents(agents: readonly Agent[], book: readonly Query[], nowMs: number): StageAgent[] {
  return agents.filter((a) => !a.setAside).map((a) => {
    const all = book.filter((x) => x.agentId === a.id);
    const q = all.filter(isActiveQuery);
    const sent = q.map((x) => Date.parse(String(x.dateSent ?? ""))).filter((t) => Number.isFinite(t));
    const name = agentPrimary(a);
    const reo = a.reopensOn ? Date.parse(a.reopensOn) : NaN;
    const wks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? Math.round(a.responseTimeWeeks) : null;
    const latest = latestOf(all);
    return {
      id: a.id, name, first: firstName(name), agency: agentAgencyLine(a), initials: agentInitials(a),
      querying: q.length > 0, queriedMs: sent.length ? Math.max(...sent) : null,
      queried: all.length > 0, standing: latest ? standingOf(latest.q, latest.ms) : null, lastMs: latest?.ms ?? null,
      closed: doorOf(a) === "closed", reopens: Number.isFinite(reo) ? dayMonY(reo, nowMs) : null,
      via: queryViaOf(a.submissionMethod), email: a.email?.trim() || null,
      weeks: wks, nrmn: !!a.noResponseMeansNo, ask: guidelineAsk(a), agent: a,
    };
  });
}

const TERMINAL: ReadonlySet<string> = new Set([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.SIGNED]);
/** active: not finished (journeys/common `isLive`, the set the host filtered with before v2.1) */
const isActiveQuery = (q: Pick<Query, "status">): boolean => !TERMINAL.has(q.status);
/** the query that last moved: a closed one by its close (`closedAt`), an active one by its send */
function latestOf(all: readonly Query[]): { q: Query; ms: number | null } | null {
  let best: { q: Query; ms: number | null } | null = null;
  for (const q of all) {
    const ms = isActiveQuery(q) ? sentAt(q) : closedAt(q);
    if (!best || (ms ?? -Infinity) > (best.ms ?? -Infinity)) best = { q, ms };
  }
  return best;
}
/** "Queried · sent 3 Oct", "Partial requested", "Passed · 12 Sep", "No reply · closed 2 Nov" — the Queries page's own status word
 *  (`standWords`), with the send date on a plain query and the closing date on a closed one */
export function standingOf(q: Pick<Query, "status">, ms: number | null): string {
  const word = standWords({ status: q.status as QueryStatus });
  if (ms == null) return word;
  if (q.status === QueryStatus.QUERIED) return `${word} · sent ${dayMon(ms)}`;
  if (q.status === QueryStatus.NO_RESPONSE) return `${word} · closed ${dayMon(ms)}`;
  return TERMINAL.has(q.status) ? `${word} · ${dayMon(ms)}` : word;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export interface WhoGroups { ready: StageAgent[]; closed: StageAgent[]; busy: StageAgent[]; busyHit: StageAgent[] }
/**
 * Not queried yet (open, no query for this book), Closed right now (closed to queries, none for this book), and
 * Already queried — v2.1 (D4): every agent with a query for this book, active OR closed, most recent first.
 */
export function whoGroups(list: readonly StageAgent[], find: string): WhoGroups {
  const q = norm(find.trim());
  const m = (a: StageAgent) => !q || norm(`${a.name} ${a.agency}`).includes(q);
  /* Add agent v1 Phase 6 — the agents you can query are in fit order: Agent fit high first (unrated last), then the
     shorter response time, then the name (lib/agentFit) */
  const fit = (a: StageAgent, b: StageAgent) => fitOrder({ starRating: a.agent.starRating, responseTimeWeeks: a.agent.responseTimeWeeks, name: a.name }, { starRating: b.agent.starRating, responseTimeWeeks: b.agent.responseTimeWeeks, name: b.name });
  const recent = (a: StageAgent, b: StageAgent) => (b.lastMs ?? -Infinity) - (a.lastMs ?? -Infinity) || a.name.localeCompare(b.name);
  const busy = list.filter((a) => a.queried).sort(recent);
  return {
    ready: list.filter((a) => !a.queried && !a.closed && m(a)).sort(fit),
    closed: list.filter((a) => !a.queried && a.closed && m(a)).sort(fit),
    busy,
    busyHit: busy.filter(m),
  };
}
/** the already-queried list, open: the ten most recent, then "and {n} more" */
export const BUSY_SHOWN = 10;
/** "jane doe" → "Jane Doe" for "+ Add Jane Doe as a new agent" */
export const titleName = (s: string): string => s.trim().replace(/\s+/g, " ").replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

/* ── the pieces ───────────────────────────────────────────────────────────────────────────────────────────────── */

export interface Choice { id: string; name: string }
export interface BookChoice extends Choice {
  current: boolean;
  /** v1.2 — the version's number as the packages page shows it ("V2", or "Original"), for the opening pages' pill */
  short?: string;
}
/**
 * The opening pages as the stages hold them: the sample control's whole `Sample` (unit, amount, and — v1.2 — a specific
 * section's start and its unit), plus the book version it came from. A choice with no `sect` is "from the opening".
 */
export interface SampleChoice {
  unit: Exclude<Sample["unit"], "none">;
  amt: number;
  bookVersionId: string | null;
  /** v1.2 — a specific section rather than the opening */
  sect?: boolean;
  /** the section's first unit (1 = the opening) */
  from?: number;
  /** the unit `from` counts in; null takes the unit's default */
  fu?: FromUnit | null;
}
/** the choice as the sample control's own `Sample`, which is what the save records */
export const sampleOfChoice = (c: SampleChoice): Sample =>
  ({ ...blankSample(), unit: c.unit, amt: c.amt, sect: !!c.sect, from: c.sect ? (c.from ?? 1) : 1, fu: c.sect ? (c.fu ?? null) : null });
/** a choice from the control's `Sample`, keeping the book version */
export const choiceOfSample = (s: Sample, bookVersionId: string | null): SampleChoice | null =>
  s.unit === "none" ? null : { unit: s.unit, amt: s.amt, bookVersionId, ...(s.sect ? { sect: true, from: s.from, fu: s.fu } : {}) };

export interface StagePackage { id: string; name: string; active: boolean; card: PackageCard; pieces: string[] }

/** "First 10 pages", "First chapter", "Pages 40–64": the sample's own name (`sampleName`), capitalised */
export const sizeName = (s: { unit: Sample["unit"]; amt: number; sect?: boolean; from?: number; fu?: FromUnit | null }): string =>
  !s.sect && s.unit === "chapters" && s.amt === 1 ? "First chapter"
    : capFirst(sampleName({ ...blankSample(), unit: s.unit, amt: s.amt, sect: !!s.sect, from: s.sect ? (s.from ?? 1) : 1, fu: s.sect ? (s.fu ?? null) : null }));

/** "a query letter, a synopsis and the first 10 pages", or null when the card says nothing */
export function askWords(ask: GuidelineAsk): string | null {
  if (!ask.stated) return null;
  const b: string[] = [];
  if (ask.ql) b.push("a query letter");
  if (ask.syn) b.push("a synopsis");
  if (ask.sample.unit !== "none") b.push(`the ${sampleName(ask.sample)}`);
  return b.length > 1 ? `${b.slice(0, -1).join(", ")} and ${b[b.length - 1]}` : b[0];
}

export interface Pieces { letterId: string | null; synopsisId: string | null; sample: SampleChoice | null }
export const packageFits = (p: StagePackage, ask: GuidelineAsk): boolean => packageMatches(p.card, ask);

/** stand-ins for a piece the book has no named version of: ticked, but recorded with no version id (as before v2) */
export const NO_LETTER = "__letter";
export const NO_SYN = "__synopsis";

/* ── v2 · what {First} asks for ───────────────────────────────────────────────────────────────────────────────── */

/** the card's asks as the Materials step lists them: "Query letter", "Synopsis", "First 3 chapters"; empty when the card
 *  says nothing (the step's nil line, and no button) */
export function askItems(ask: GuidelineAsk | null): string[] {
  if (!ask || !ask.stated) return [];
  return [ask.ql ? "Query letter" : null, ask.syn ? "Synopsis" : null, ask.sample.unit !== "none" ? sizeName(ask.sample) : null].filter((x): x is string => !!x);
}

export type AskFill =
  /** a saved package is exactly what the card asks for: the package, with the sample at the size asked for */
  | { kind: "pkg"; pkg: StagePackage; pieces: Pieces }
  /** no package matches: the pieces the card names, the sample at the size asked for */
  | { kind: "pieces"; pieces: Pieces };

/**
 * D9 — "I sent what {First} asks for": the materials that match the agent's card, in one tap. Null when the card says
 * nothing (no button then). A package matches EXACTLY when it has the letter and the synopsis the card asks for and no
 * others (`packageMatches`), carries opening pages exactly when the card asks for a sample, and holds nothing else; a
 * package states no sample size, so the size is always the card's.
 * ⚠️ The pieces take the writer's named letter, synopsis and current book version where they have saved some, else the
 *    generic stand-ins — the same choices the pieces screen starts from.
 */
export function askFill(ask: GuidelineAsk | null, packages: readonly StagePackage[], d: { letter: string | null; synopsis: string | null; book: string | null }): AskFill | null {
  if (!askItems(ask).length) return null;
  const a = ask!;
  const wantSample = a.sample.unit !== "none";
  const size = wantSample ? { unit: a.sample.unit as SampleChoice["unit"], amt: a.sample.amt } : null;
  const exact = packages.find((p) => packageFits(p, a) && !!p.card.bookVersion === wantSample && !p.card.other);
  if (exact) return { kind: "pkg", pkg: exact, pieces: { letterId: exact.card.qlId, synopsisId: exact.card.synId, sample: size ? { ...size, bookVersionId: null } : null } };
  return { kind: "pieces", pieces: {
    letterId: a.ql ? d.letter ?? NO_LETTER : null,
    synopsisId: a.syn ? d.synopsis ?? NO_SYN : null,
    sample: size ? { ...size, bookVersionId: d.book } : null,
  } };
}

/* ── how ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

export const HOW: readonly { k: SubmissionMethod; label: string; word: string }[] = [
  { k: SubmissionMethod.EMAIL, label: "Email", word: "email" },
  { k: SubmissionMethod.QUERY_MANAGER, label: "QueryManager", word: "QueryManager" },
  { k: SubmissionMethod.ONLINE_FORM, label: "Online form", word: "online form" },
  { k: SubmissionMethod.POST, label: "Post", word: "post" },
];
export const howLabel = (k: SubmissionMethod | null): string => HOW.find((h) => h.k === k)?.label ?? "";

/* ── v2.2 · Phase 2: the review's notes ───────────────────────────────────────────────────────────────────────── */

/** a note added on the review, before the query exists: drawn as the Notes tab's own note ("You · Today") */
export interface JourneyNote { id: string; text: string; ms: number }
/** the notes the review is holding: the list, the one being edited (its words so far), the writing box's words */
export interface NotesState { notes: readonly JourneyNote[]; edit: { id: string; text: string } | null; draft: string }

let noteSeq = 0;
/** a new note, dated now: blank words add nothing */
export const addNote = (n: readonly JourneyNote[], text: string, ms: number): JourneyNote[] =>
  text.trim() ? [...n, { id: `jn-${ms}-${++noteSeq}`, text: text.trim(), ms }] : [...n];
/** an edit saved in place: blank words change nothing (Save is disabled for them) */
export const editNote = (n: readonly JourneyNote[], id: string, text: string): JourneyNote[] =>
  text.trim() ? n.map((x) => (x.id === id ? { ...x, text: text.trim() } : x)) : [...n];
export const deleteNote = (n: readonly JourneyNote[], id: string): JourneyNote[] => n.filter((x) => x.id !== id);
/**
 * WHAT "Log query" SAVES: every note, oldest first, as typed. Nothing the writer typed is lost: an edit still open
 * saves its words so far (when not blank) in that note's place, and words still sitting in the writing box are added
 * as the last note.
 */
export function notesToSave(st: NotesState): string[] {
  const out = st.notes.map((x) => (st.edit && st.edit.id === x.id && st.edit.text.trim() ? st.edit.text.trim() : x.text));
  if (st.draft.trim()) out.push(st.draft.trim());
  return out;
}

/* ── the answers, and the plan they make ─────────────────────────────────────────────────────────────────────── */

export interface LogAnswers {
  agentId: string;
  sent: number;
  via: SubmissionMethod;
  /** the package chosen, or null for pieces chosen one by one */
  packageId: string | null;
  letterId: string | null;
  synopsisId: string | null;
  sample: SampleChoice | null;
  /** v2.2 · Phase 2 — the notes added on the review, oldest first, each saved as a journal entry on the query (the
   *  record the query card's Notes tab lists); words left unsaved in the writing box are the last of them */
  notes: string[];
  /** v1.3 — the Nudge stage's answers; absent takes `replyDefaults` for the agent */
  reply?: ReplyAnswers;
}

export interface PlanContext {
  manuscriptId: string;
  agents: readonly Agent[];
  packages: readonly StagePackage[];
  letters: readonly Choice[];
  synopses: readonly Choice[];
  bookVersions: readonly BookChoice[];
}

/** the answers → the materials and versions the save records, in the shape `saveLog` already takes */
export function materialsOf(a: LogAnswers, ctx: PlanContext): { pkCard: PackageCard | null; mat: Materials; pieceV: PieceVersions } {
  const pk = a.packageId ? ctx.packages.find((p) => p.id === a.packageId)?.card ?? null : null;
  const s: Sample = a.sample ? sampleOfChoice(a.sample) : { ...blankSample(), unit: "none" };
  if (pk) {
    const mat: Materials = { ql: pk.ql, syn: pk.syn, s };
    return { pkCard: pk, mat, pieceV: pieceVersions(pk, mat, null, null) };
  }
  const mat: Materials = { ql: !!a.letterId, syn: !!a.synopsisId, s };
  const ql = ctx.letters.find((l) => l.id === a.letterId) ?? null;
  const syn = ctx.synopses.find((l) => l.id === a.synopsisId) ?? null;
  const pieceV = pieceVersions(null, mat, ql ? { id: ql.id, versionName: ql.name } : null, syn ? { id: syn.id, versionName: syn.name } : null);
  const bv = a.sample?.bookVersionId ? ctx.bookVersions.find((b) => b.id === a.sample!.bookVersionId)?.name ?? null : null;
  return { pkCard: null, mat, pieceV: { ...pieceV, bookVersion: bv } };
}

export function planOf(a: LogAnswers, ctx: PlanContext, id: string, requery: boolean, nowMs: number = a.sent): LogPlan | null {
  const agent = ctx.agents.find((x) => x.id === a.agentId);
  if (!agent) return null;
  const sent = new Date(a.sent);
  const { pkCard, mat, pieceV } = materialsOf(a, ctx);
  return { id, manuscriptId: ctx.manuscriptId, agent, sent, via: a.via, pkCard, mat, pieceV, basedOn: null, ...replyPlan(a.reply ?? replyDefaults(agent), agent, a.sent, nowMs), requery };
}

/* ── v1.3 — the Nudge stage ───────────────────────────────────────────────────────────────────────────────────── */

/** the reminder chips: counted from the reply date while it is ahead; otherwise from TODAY (v2): with Unknown, and once the
 *  reply date has passed or the query went more than a week ago with no reply date ("n1" / "n2" / "n4") */
export type NudgeWhen = "w0" | "week" | "2w" | "6w" | "8w" | "12w" | "n1" | "n2" | "n4" | "pick";
/** v2 — "now": the reply date has already passed on the date given, and the writer will nudge today */
export type ReplyChoice = "nudge" | "close" | "none" | "now";
export interface ReplyAnswers {
  /** the slider: weeks, or null for Unknown */
  wk: number | null;
  /** the card offer's tick */
  saveWk: boolean;
  ifNo: ReplyChoice;
  nWhen: NudgeWhen;
  /** the picked day (start of day, ms), for "Pick a date" */
  nPick: number | null;
}
/** the card's weeks as the slider shows them (whole weeks, as `stageAgents` rounds them), or null */
export const cardWeeks = (agent: Pick<Agent, "responseTimeWeeks"> | null | undefined): number | null =>
  agent?.responseTimeWeeks && agent.responseTimeWeeks > 0 ? Math.round(agent.responseTimeWeeks) : null;
export const WINDOW_CHIPS: readonly NudgeWhen[] = ["w0", "week", "2w"];
export const SENT_CHIPS: readonly NudgeWhen[] = ["6w", "8w", "12w"];

/** the stage's opening answers: the card's weeks (or Unknown), close where no reply means no and there is a window */
export function replyDefaults(agent: Pick<Agent, "responseTimeWeeks" | "noResponseMeansNo">): ReplyAnswers {
  const wk = cardWeeks(agent);
  return { wk, saveWk: false, ifNo: agent.noResponseMeansNo && wk ? "close" : "nudge", nWhen: wk ? "week" : "8w", nPick: null };
}
/** the slider moved: the offer's tick is the default for its kind (blank card → ticked, a changed one → unticked) */
export function withWeeks(r: ReplyAnswers, wk: number, agentWk: number | null): ReplyAnswers {
  return { ...r, wk, saveWk: agentWk == null, nWhen: r.nWhen === "pick" || WINDOW_CHIPS.includes(r.nWhen) ? r.nWhen : "week" };
}
/** Unknown pressed (or pressed again, which puts the card's weeks back, else 8) */
export function toggleUnknown(r: ReplyAnswers, agentWk: number | null): ReplyAnswers {
  if (r.wk != null) {
    return { ...r, wk: null, saveWk: false, ifNo: r.ifNo === "close" ? "nudge" : r.ifNo, nWhen: WINDOW_CHIPS.includes(r.nWhen) ? "8w" : r.nWhen };
  }
  return { ...r, wk: agentWk ?? 8, saveWk: false, nWhen: r.nWhen === "pick" ? "pick" : "week" };
}

/** the reply date: sent + weeks, or null with Unknown */
export const expectOf = (sentMs: number, wk: number | null): Date | null => (wk ? addDays(new Date(sod(sentMs)), wk * 7) : null);

/** v2 — the reply date has already gone by on the sent date given (a reply date today has not) */
export const isPastReply = (sentMs: number, wk: number | null, nowMs: number): boolean => {
  const ex = expectOf(sentMs, wk);
  return !!ex && sod(ex.getTime()) < sod(nowMs);
};

export interface NudgeChip { k: NudgeWhen; label: string; d: Date }
/**
 * The chips, weekend-shifted as the old journey's were (`reminderAnchors`).
 * ⚠️ v2 — NEVER A DATE IN THE PAST: counted from the reply date only while it is still ahead; with Unknown they count
 *    from today (v1.3 counted from the sent date, so a query sent 60 days ago offered "In 6 weeks" 18 days back), and
 *    once the reply date has passed, or the query went over a week ago with no reply date, they are a week, two weeks
 *    and a month from today (the mock's). `nowMs` defaults to the sent day (logging on the day it went).
 */
export function nudgeChips(sentMs: number, wk: number | null, nowMs: number = sentMs): NudgeChip[] {
  const ex = expectOf(sentMs, wk);
  const today = new Date(sod(nowMs));
  if ((ex && sod(ex.getTime()) < today.getTime()) || (!ex && isCatchingUp(sentMs, nowMs))) {
    return reminderAnchors(today, [["n1", "In a week", 7], ["n2", "In two weeks", 14], ["n4", "In a month", 30]]).map((a) => ({ k: a.k as NudgeWhen, label: a.label, d: a.d! }));
  }
  const list: [string, string, number][] = ex
    ? [["w0", "On the day", 0], ["week", "A week later", 7], ["2w", "Two weeks later", 14]]
    : [["6w", "In 6 weeks", 42], ["8w", "In 8 weeks", 56], ["12w", "In 12 weeks", 84]];
  return reminderAnchors(ex ?? today, list).map((a) => ({ k: a.k as NudgeWhen, label: a.label, d: a.d! }));
}
/** the chip on show: the one chosen if it is in today's set, else the middle one (the mock's) */
export const chipOn = (r: ReplyAnswers, chips: readonly NudgeChip[]): NudgeWhen =>
  r.nWhen === "pick" || chips.some((c) => c.k === r.nWhen) ? r.nWhen : chips[1].k;
/** the nudge day, or null (no reminder, Close it, or "Pick a date" with no day yet); "now" is today */
export function nudgeDateOf(r: ReplyAnswers, sentMs: number, nowMs: number = sentMs): Date | null {
  if (r.ifNo === "now") return new Date(sod(nowMs));
  if (r.ifNo !== "nudge") return null;
  if (r.nWhen === "pick") return r.nPick != null ? new Date(sod(r.nPick)) : null;
  const chips = nudgeChips(sentMs, r.wk, nowMs);
  return (chips.find((c) => c.k === r.nWhen) ?? chips[1]).d;
}
/**
 * v2 — the answers as they stand against the dates: "now" exists only while the reply date has passed, and Close it only
 * with a reply date (each falls back to "Remind me to nudge"); the first time the date is past, "now" is the default.
 */
export function settleReply(r: ReplyAnswers, sentMs: number, nowMs: number, fresh: boolean): ReplyAnswers {
  const past = isPastReply(sentMs, r.wk, nowMs);
  if (past && fresh) return { ...r, ifNo: "now" };
  if (r.ifNo === "now" && !past) return { ...r, ifNo: "nudge" };
  if (r.ifNo === "close" && (past || !expectOf(sentMs, r.wk))) return { ...r, ifNo: past ? "now" : "nudge" };
  return r;
}
/** Continue waits only while "Pick a date" has no day */
export const replyReady = (r: ReplyAnswers): boolean => !(r.ifNo === "nudge" && r.nWhen === "pick" && r.nPick == null);

export type CardOffer = { kind: "save"; n: number } | { kind: "update"; n: number; was: number } | null;
/** the offer to save the reply time to the agent's card: a blank card, or a card the slider moved off; else none */
export function cardOffer(agentWk: number | null, wk: number | null): CardOffer {
  if (wk == null) return null;
  if (agentWk == null) return { kind: "save", n: wk };
  return wk !== agentWk ? { kind: "update", n: wk, was: agentWk } : null;
}
/** the weeks to save to the card when the query is logged, or null */
export const cardWeeksToSave = (r: ReplyAnswers, agentWk: number | null): number | null => (cardOffer(agentWk, r.wk) && r.saveWk ? r.wk : null);

const IF_NO_OF: Record<ReplyChoice, IfNo> = { nudge: "nudge", close: "close", none: "nothing", now: "nudge" };
/**
 * The answers → the reply half of the log save's own `LogPlan` (the old journey's fields, unchanged). The reply date is
 * the WRITER'S whenever it is not the card's own weeks (`writerExpected`, as the old journey's "moved off the usual");
 * Unknown saves none. Close it needs a reply date, so with Unknown it falls back to no reminder.
 */
export function replyPlan(r: ReplyAnswers, agent: Pick<Agent, "responseTimeWeeks">, sentMs: number, nowMs: number = sentMs): Pick<LogPlan, "expect" | "writerExpected" | "ifNo" | "nudgeDate" | "nrmnOverride"> {
  const expect = expectOf(sentMs, r.wk);
  const choice: ReplyChoice = r.ifNo === "close" && !expect ? "none" : r.ifNo;
  return {
    expect,
    writerExpected: !!expect && r.wk !== cardWeeks(agent),
    ifNo: IF_NO_OF[choice],
    /* v2 — "I'll nudge {First} now": a nudge reminder for today, the same field the chips set */
    nudgeDate: nudgeDateOf({ ...r, ifNo: choice }, sentMs, nowMs),
    nrmnOverride: null,
  };
}
/** the track's finished answer under Nudge */
export const nudgeAnswer = (r: ReplyAnswers, sentMs: number, nowMs: number = sentMs): string => {
  if (r.ifNo === "now") return "Now";
  const d = nudgeDateOf(r, sentMs, nowMs);
  return d ? dayMon(d.getTime()) : r.ifNo === "close" ? "Close it" : "None";
};

export const PREVIEW_ID = "__log-preview__";

export interface Preview { row: QcRow; packageName: string | null; agent: Agent; state: QueryState | undefined; expectMs: number | null; noWindow: boolean;
  /** v2 — the record the save will write, as a Query (the review's two numbers read it) */
  query: Query;
  /** v2.1 — "What went": one item per material (`whatWent`) */
  went: WentItem[] }

/* ── v2.1 · Phase 1 — "What went" under the review card ───────────────────────────────────────────────────────── */

export interface WentItem { name: string; kind: MaterialIconKind | null }
/**
 * One item per material the save records, in the save's own order (`materialsToQuery`). The icon kind is the item's
 * (`materialIconKind`), never read from the name; a letter or synopsis is named by the version that went when one is
 * named (the package's or the one picked), else by the material's own words. A material with no icon kind keeps its tile.
 */
export function whatWent(plan: Pick<LogPlan, "mat" | "pieceV">): WentItem[] {
  return materialsToQuery(plan.mat).map((item) => {
    const kind = materialIconKind(item);
    const own = formatQueryMaterial(item);
    const name = kind === "letter" ? plan.pieceV.qlVersion?.trim() || own : kind === "synopsis" ? plan.pieceV.synVersion?.trim() || own : own;
    return { name, kind };
  });
}
/** the unsaved query as the Query Centre will list it: the save's own record, through the list's own helpers */
export function previewOf(plan: LogPlan, nowMs: number, quietWeeks: number): Preview {
  const { payload, summary } = logPayload(plan);
  const q = { ...payload, status: QueryStatus.QUERIED, sentMaterials: summary } as unknown as Query;
  const [row0] = buildQcRows([q], [plan.agent], [], nowMs);
  const [row] = stampRows([row0], [plan.agent], { quietWeeks, nowMs });
  const noWindow = !plan.expect;
  return { row, packageName: plan.pkCard?.name ?? null, agent: plan.agent, state: row.qs, expectMs: plan.expect ? plan.expect.getTime() : null, noWindow, query: q, went: whatWent(plan) };
}

/* ── v2 · Phase 6 — the review's two numbers ──────────────────────────────────────────────────────────────────── */

export interface ReviewCounts {
  /** the Dashboard's active count for this book (its header's `liveCount`), before and with this query */
  active: [number, number];
  /** the Queries page's "{n} queries sent" (`queriesSentOf`, v2.2), before and with this query */
  sent: [number, number];
}
/**
 * ⚠️ NOT A NEW COUNT: each figure is an existing page's own, run over this book's queries as they are and with the
 *    unsaved query added (`previewOf`'s record — the save's own). "active queries" is the Dashboard's `liveCount`, so it
 *    steps up only when the Dashboard would count it, and shows only then; "queries sent" is the Queries page's.
 */
/**
 * v2.2 · Phase 3 (D5) — "QUERIES SENT" AS THE QUERIES PAGE COUNTS IT: one per query of the book, dated or not (the
 * page's header is its rows for the book, Queries.tsx `sent: qcScoped.length`, one row per query). The logged screen's
 * "Query number {n}" is this plus the query just logged (the host's `count`), so the two always agree.
 * ⚠️ NOT the Dashboard's `sentAllTime` (dash2), which leaves out a query with no sent date or a future one. The two
 *    "sent" counts still differ on the Dashboard and the Queries page; that is for Nick to rule on (v2.2 REPORT).
 */
export const queriesSentOf = (book: readonly Query[]): number => book.length;

/* `_now` is kept for the callers: since v2.2 neither figure reads the clock */
export function reviewCounts(book: readonly Query[], unsaved: Query | null, _now: Date): ReviewCounts {
  const withIt = unsaved ? [...book, unsaved] : [...book];
  return {
    active: [liveCount(book), liveCount(withIt)],
    /* v2.2 · Phase 3 — the Queries page's count (the active figure stays the Dashboard's own) */
    sent: [queriesSentOf(book), queriesSentOf(withIt)],
  };
}
/** v2.1 · Phase 1 — the big numbers: "active queries" only when the Dashboard would count this query as active */
export const showsActive = (c: ReviewCounts): boolean => c.active[1] > c.active[0];

/* ── the celebration ──────────────────────────────────────────────────────────────────────────────────────────── */

export const MILESTONE: Record<number, string> = {
  1: "Your first query. The hardest one's done.",
  10: "Ten queries out. You're properly in it now.",
  25: "Twenty-five queries. That takes some nerve.",
  50: "Fifty queries. Seriously impressive staying power.",
  100: "A hundred queries. Hats off.",
};

/**
 * v2 · Phase 7 — THE ONE LINE UNDER "Off to {First}.", by the reminder the writer chose (the mock's `ending()`):
 *
 *   past the reply date   now  → a nudge is on today's to-do list · nudge → reminded on {day} · none → it waits
 *   no reply date         nudge → reminded on {day} · otherwise → no date and no reminder, it waits
 *   a reply date ahead    "{First} usually replies within {n} weeks, so expect something by {day}." then
 *                         nudge → reminded on {day} · close → closed for you the day after · none → keep an eye on it
 *
 * ⚠️ NO PROMISE THE APP WILL NOT KEEP: a nudge is the query's own `nudgeDate` (it goes on the To-do list on the day),
 *    "we'll close it for you" is `ifNo: "close"`'s auto-close the day after the reply date (`closeDateIso`), and the
 *    rest promise nothing.
 */
export interface EndingFacts { first: string; wk: number | null; sentMs: number; nowMs: number; reply: ReplyAnswers }
/** v2.2 · Phase 4 — a date never breaks across lines ("11 Jan 2027" stays whole): its spaces are no-break spaces */
export const unbroken = (d: string): string => d.replace(/ /g, "\u00a0");

export function celebrationLine(f: EndingFacts): string {
  const { first, nowMs } = f;
  /* every date this line names goes through `unbroken` */
  const date = (ms: number) => unbroken(dayMonY(ms, nowMs));
  const ex = expectOf(f.sentMs, f.wk);
  const nd = nudgeDateOf(f.reply, f.sentMs, nowMs);
  const n = nd ? date(nd.getTime()) : null;
  const choice = f.reply.ifNo;
  if (ex && sod(ex.getTime()) < sod(nowMs)) {
    if (choice === "now") return `It’s past ${first}’s usual reply time, so a nudge is on your to-do list for today.`;
    if (choice === "nudge" && n) return `It’s past ${first}’s usual reply time. We’ll remind you to nudge on ${n}.`;
    return `It’s past ${first}’s usual reply time, and there’s no reminder set. It’s waiting on your Queries page.`;
  }
  if (!ex) {
    return choice === "nudge" && n
      ? `There’s no reply date for ${first}, so we’ll remind you to nudge on ${n}.`
      : `No reply date and no reminder for ${first}. It’s waiting on your Queries page.`;
  }
  const lead = `${first} usually replies within ${f.wk} weeks, so expect something by ${date(ex.getTime())}. `;
  if (choice === "nudge" && n) return `${lead}We’ll remind you to nudge on ${n}.`;
  if (choice === "close") return `${lead}If there’s nothing by ${date(addDays(ex, 1).getTime())} we’ll close it for you.`;
  return `${lead}There’s no reminder set, so keep an eye on it.`;
}

/* ── the inline calendar ──────────────────────────────────────────────────────────────────────────────────────── */

export interface CalCell { ms: number; day: number; future: boolean; today: boolean }
/** a Monday-first month: leading blanks, then each day, days after today disabled */
export function calMonth(year: number, month: number, nowMs: number): { lead: number; days: CalCell[]; canNext: boolean } {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const n = new Date(year, month + 1, 0).getDate();
  const t = sod(nowMs);
  const days: CalCell[] = [];
  for (let d = 1; d <= n; d++) {
    const ms = new Date(year, month, d).getTime();
    days.push({ ms, day: d, future: ms > t, today: ms === t });
  }
  return { lead, days, canNext: new Date(year, month + 1, 1).getTime() <= t };
}
/** v1.3 — the nudge's "Pick a date": a Monday-first month with today and every day before it disabled */
export function calMonthAhead(year: number, month: number, nowMs: number): { lead: number; days: CalCell[]; canPrev: boolean } {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const n = new Date(year, month + 1, 0).getDate();
  const t = sod(nowMs);
  const days: CalCell[] = [];
  for (let d = 1; d <= n; d++) {
    const ms = new Date(year, month, d).getTime();
    days.push({ ms, day: d, future: ms > t, today: ms === t });
  }
  const now = new Date(t);
  return { lead, days, canPrev: year * 12 + month > now.getFullYear() * 12 + now.getMonth() };
}
export const yesterday = (nowMs: number): number => { const d = new Date(sod(nowMs)); d.setDate(d.getDate() - 1); return d.getTime(); };
