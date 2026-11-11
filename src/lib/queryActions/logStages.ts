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
import { MONTHS_SHORT } from "../dates";
import { agentAgencyLine, agentInitials, agentPrimary } from "../agentDisplay";
import { closeDateIso, logPayload, pieceVersions, type IfNo, type LogPlan, type PieceVersions } from "./logSave";
import { addDays, reminderAnchors } from "./dates";
import { guidelineAsk, packageMatches, type GuidelineAsk, type PackageCard } from "./packages";
import { blankSample, sampleName, capFirst, type FromUnit, type Materials, type Sample } from "./sample";

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

export function stageAgents(agents: readonly Agent[], live: readonly Query[], nowMs: number): StageAgent[] {
  return agents.filter((a) => !a.setAside).map((a) => {
    const q = live.filter((x) => x.agentId === a.id);
    const sent = q.map((x) => Date.parse(String(x.dateSent ?? ""))).filter((t) => Number.isFinite(t));
    const name = agentPrimary(a);
    const reo = a.reopensOn ? Date.parse(a.reopensOn) : NaN;
    const wks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? Math.round(a.responseTimeWeeks) : null;
    return {
      id: a.id, name, first: firstName(name), agency: agentAgencyLine(a), initials: agentInitials(a),
      querying: q.length > 0, queriedMs: sent.length ? Math.max(...sent) : null,
      closed: doorOf(a) === "closed", reopens: Number.isFinite(reo) ? dayMonY(reo, nowMs) : null,
      via: (a.submissionMethod as SubmissionMethod) || null, email: a.email?.trim() || null,
      weeks: wks, nrmn: !!a.noResponseMeansNo, ask: guidelineAsk(a), agent: a,
    };
  });
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export interface WhoGroups { ready: StageAgent[]; closed: StageAgent[]; busy: StageAgent[]; busyHit: StageAgent[] }
/** Ready to query (open, not querying this book), Closed right now, and those already querying it */
export function whoGroups(list: readonly StageAgent[], find: string): WhoGroups {
  const q = norm(find.trim());
  const m = (a: StageAgent) => !q || norm(`${a.name} ${a.agency}`).includes(q);
  const by = (a: StageAgent, b: StageAgent) => a.name.localeCompare(b.name);
  const busy = list.filter((a) => a.querying).sort(by);
  return {
    ready: list.filter((a) => !a.querying && !a.closed && m(a)).sort(by),
    closed: list.filter((a) => !a.querying && a.closed && m(a)).sort(by),
    busy,
    busyHit: busy.filter(m),
  };
}
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
/** the pieces ticked from what the agent asks for; nothing stated → letter and synopsis */
export function piecesFromAsk(ask: GuidelineAsk, cur: Pieces, d: { letter: string | null; synopsis: string | null; book: string | null }): Pieces {
  const wantQl = ask.stated ? ask.ql : true, wantSyn = ask.stated ? ask.syn : true;
  return {
    letterId: wantQl ? cur.letterId ?? d.letter : null,
    synopsisId: wantSyn ? cur.synopsisId ?? d.synopsis : null,
    sample: ask.sample.unit !== "none" ? { unit: ask.sample.unit, amt: ask.sample.amt, bookVersionId: cur.sample?.bookVersionId ?? d.book } : null,
  };
}
export function piecesMatchAsk(ask: GuidelineAsk, p: Pieces): boolean {
  if (!ask.stated) return false;
  return !!p.letterId === ask.ql && !!p.synopsisId === ask.syn && sampleMatchesAsk(ask, p.sample);
}
/** ⚠️ a specific section never counts as matching an opening-pages ask, whatever its size */
export function sampleMatchesAsk(ask: GuidelineAsk, s: SampleChoice | null): boolean {
  return ask.sample.unit === "none" ? !s : !!s && !s.sect && s.unit === ask.sample.unit && s.amt === ask.sample.amt;
}
export const packageFits = (p: StagePackage, ask: GuidelineAsk): boolean => packageMatches(p.card, ask);

/* ── v1.2 · what {First} asks for ─────────────────────────────────────────────────────────────────────────────── */

/** how one ask stands against what is ticked: sent as asked, sent differently, not ticked — or a plain dot (packages) */
export type AskMark = "ok" | "diff" | "no" | "dot";
export interface AskItem { key: "ql" | "syn" | "sample"; label: string; mark: AskMark }
export type AskCard =
  /** nothing on the card: the quiet note, no button */
  | { kind: "nil" }
  /** over the packages: the asks as dots, and the package that matches (by `packageFits`), if one does */
  | { kind: "pkg"; items: AskItem[]; fit: string | null }
  /** over the pieces: each ask marked, and the lines that say what differs */
  | { kind: "pcs"; items: AskItem[]; ok: boolean; whys: string[]; extra: string | null };

const lowerFirst = (t: string): string => (t ? t[0].toLowerCase() + t.slice(1) : t);
const listWords = (b: string[]): string => (b.length > 1 ? `${b.slice(0, -1).join(", ")} and ${b[b.length - 1]}` : b[0] ?? "");

/**
 * The card at the top of the Materials stage. It reads the agent's card (`GuidelineAsk`) and what is ticked, and never
 * writes either: changing the materials here never changes the agent's card.
 * ⚠️ A SPECIFIC SECTION NEVER MATCHES AN OPENING-PAGES ASK (`sampleMatchesAsk`), so "pages 1–10" against "the first 10
 *    pages" is a difference, as the writer sent a section rather than the opening.
 */
export function askCard(ask: GuidelineAsk | null, view: "pkg" | "pcs", pieces: Pieces, packages: readonly StagePackage[], first: string): AskCard {
  if (!ask || !ask.stated) return { kind: "nil" };
  const sampleLabel = ask.sample.unit !== "none" ? sizeName(ask.sample) : "";
  if (view === "pkg") {
    const items: AskItem[] = [];
    if (ask.ql) items.push({ key: "ql", label: "Query letter", mark: "dot" });
    if (ask.syn) items.push({ key: "syn", label: "Synopsis", mark: "dot" });
    if (ask.sample.unit !== "none") items.push({ key: "sample", label: sampleLabel, mark: "dot" });
    return { kind: "pkg", items, fit: packages.find((x) => packageFits(x, ask))?.name ?? null };
  }
  const items: AskItem[] = [];
  const whys: string[] = [];
  if (ask.ql) items.push({ key: "ql", label: "Query letter", mark: pieces.letterId ? "ok" : "no" });
  if (ask.syn) items.push({ key: "syn", label: "Synopsis", mark: pieces.synopsisId ? "ok" : "no" });
  if (ask.sample.unit !== "none") {
    const s = pieces.sample;
    const mark: AskMark = !s ? "no" : sampleMatchesAsk(ask, s) ? "ok" : "diff";
    items.push({ key: "sample", label: sampleLabel, mark });
  }
  /* one line per difference, in the order of the asks */
  for (const it of items) {
    if (it.mark === "no") whys.push(`${it.label} isn't ticked.`);
    else if (it.mark === "diff" && pieces.sample) whys.push(`You're sending the ${lowerFirst(sizeName(pieces.sample))}, not the ${lowerFirst(sampleLabel)}.`);
  }
  const extraBits: string[] = [];
  if (pieces.letterId && !ask.ql) extraBits.push("a query letter");
  if (pieces.synopsisId && !ask.syn) extraBits.push("a synopsis");
  if (pieces.sample && ask.sample.unit === "none") extraBits.push("opening pages");
  const extra = extraBits.length ? `You're also sending ${listWords(extraBits)}, which ${first} doesn't ask for.` : null;
  return { kind: "pcs", items, ok: piecesMatchAsk(ask, pieces), whys, extra };
}

/* ── how ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

export const HOW: readonly { k: SubmissionMethod; label: string; word: string }[] = [
  { k: SubmissionMethod.EMAIL, label: "Email", word: "email" },
  { k: SubmissionMethod.QUERY_MANAGER, label: "QueryManager", word: "QueryManager" },
  { k: SubmissionMethod.ONLINE_FORM, label: "Online form", word: "online form" },
  { k: SubmissionMethod.POST, label: "Post", word: "post" },
];
export const howLabel = (k: SubmissionMethod | null): string => HOW.find((h) => h.k === k)?.label ?? "";

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
  note: string;
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

export function planOf(a: LogAnswers, ctx: PlanContext, id: string, requery: boolean): LogPlan | null {
  const agent = ctx.agents.find((x) => x.id === a.agentId);
  if (!agent) return null;
  const sent = new Date(a.sent);
  const { pkCard, mat, pieceV } = materialsOf(a, ctx);
  return { id, manuscriptId: ctx.manuscriptId, agent, sent, via: a.via, pkCard, mat, pieceV, basedOn: null, ...replyPlan(a.reply ?? replyDefaults(agent), agent, a.sent), requery };
}

/* ── v1.3 — the Nudge stage ───────────────────────────────────────────────────────────────────────────────────── */

/** the reminder chips: counted from the reply date, or from the day it was sent when the reply time is Unknown */
export type NudgeWhen = "w0" | "week" | "2w" | "6w" | "8w" | "12w" | "pick";
export type ReplyChoice = "nudge" | "close" | "none";
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

export interface NudgeChip { k: NudgeWhen; label: string; d: Date }
/** the chips, weekend-shifted as the old journey's were (`reminderAnchors`) */
export function nudgeChips(sentMs: number, wk: number | null): NudgeChip[] {
  const ex = expectOf(sentMs, wk);
  const list: [string, string, number][] = ex
    ? [["w0", "On the day", 0], ["week", "A week later", 7], ["2w", "Two weeks later", 14]]
    : [["6w", "In 6 weeks", 42], ["8w", "In 8 weeks", 56], ["12w", "In 12 weeks", 84]];
  return reminderAnchors(ex ?? new Date(sod(sentMs)), list).map((a) => ({ k: a.k as NudgeWhen, label: a.label, d: a.d! }));
}
/** the nudge day, or null (no reminder, Close it, or "Pick a date" with no day yet) */
export function nudgeDateOf(r: ReplyAnswers, sentMs: number): Date | null {
  if (r.ifNo !== "nudge") return null;
  if (r.nWhen === "pick") return r.nPick != null ? new Date(sod(r.nPick)) : null;
  const chips = nudgeChips(sentMs, r.wk);
  return (chips.find((c) => c.k === r.nWhen) ?? chips[1]).d;
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

const IF_NO_OF: Record<ReplyChoice, IfNo> = { nudge: "nudge", close: "close", none: "nothing" };
/**
 * The answers → the reply half of the log save's own `LogPlan` (the old journey's fields, unchanged). The reply date is
 * the WRITER'S whenever it is not the card's own weeks (`writerExpected`, as the old journey's "moved off the usual");
 * Unknown saves none. Close it needs a reply date, so with Unknown it falls back to no reminder.
 */
export function replyPlan(r: ReplyAnswers, agent: Pick<Agent, "responseTimeWeeks">, sentMs: number): Pick<LogPlan, "expect" | "writerExpected" | "ifNo" | "nudgeDate" | "nrmnOverride"> {
  const expect = expectOf(sentMs, r.wk);
  const choice: ReplyChoice = r.ifNo === "close" && !expect ? "none" : r.ifNo;
  return {
    expect,
    writerExpected: !!expect && r.wk !== cardWeeks(agent),
    ifNo: IF_NO_OF[choice],
    nudgeDate: nudgeDateOf({ ...r, ifNo: choice }, sentMs),
    nrmnOverride: null,
  };
}
/** the track's finished answer under Nudge */
export const nudgeAnswer = (r: ReplyAnswers, sentMs: number): string => {
  const d = nudgeDateOf(r, sentMs);
  return d ? dayMon(d.getTime()) : r.ifNo === "close" ? "Close it" : "None";
};

export const PREVIEW_ID = "__log-preview__";

export interface Preview { row: QcRow; packageName: string | null; agent: Agent; state: QueryState | undefined; expectMs: number | null; noWindow: boolean }
/** the unsaved query as the Query Centre will list it: the save's own record, through the list's own helpers */
export function previewOf(plan: LogPlan, nowMs: number, quietWeeks: number): Preview {
  const { payload, summary } = logPayload(plan);
  /* v1.3 — and the close date `saveLog` writes straight after, so the slip can say when it closes */
  const close = plan.ifNo === "close" && plan.expect ? { responseDeadline: closeDateIso(plan.expect) } : {};
  const q = { ...payload, ...close, status: QueryStatus.QUERIED, sentMaterials: summary } as unknown as Query;
  const [row0] = buildQcRows([q], [plan.agent], [], nowMs);
  const [row] = stampRows([row0], [plan.agent], { quietWeeks, nowMs });
  const noWindow = !plan.expect;
  return { row, packageName: plan.pkCard?.name ?? null, agent: plan.agent, state: row.qs, expectMs: plan.expect ? plan.expect.getTime() : null, noWindow };
}

/* ── the celebration ──────────────────────────────────────────────────────────────────────────────────────────── */

export const MILESTONE: Record<number, string> = {
  1: "Your first query. The hardest one's done.",
  10: "Ten queries out. You're properly in it now.",
  25: "Twenty-five queries. That takes some nerve.",
  50: "Fifty queries. Seriously impressive staying power.",
  100: "A hundred queries. Hats off.",
};

/**
 * The one line under "Off to {First}." — Gone quiet by the app's own rule (`stampRows`), else the reply window, else no
 * window on the card. ⚠️ A FOURTH CASE THE BRIEF DOES NOT NAME: a reply date already passed but not yet Gone quiet
 * (the app's "Nudge due"). "Expect something by {a past date}" would be false, so it says the window has passed.
 */
export function celebrationLine(p: Pick<Preview, "state" | "expectMs" | "noWindow">, first: string, weeks: number | null, nowMs: number): string {
  if (p.state === "quiet") return `It's been a while since it went, so ${first} goes straight into Gone quiet. Worth a nudge?`;
  if (p.noWindow || p.expectMs == null || !weeks) return `Add a reply window to ${first}'s card and we'll remind you when it's time to nudge.`;
  if (sod(p.expectMs) < sod(nowMs)) return `${first}'s reply window passed on ${dayMonY(p.expectMs, nowMs)}, so it's already worth a nudge.`;
  return `${first} usually replies within ${weeks} weeks, so expect something by ${dayMonY(p.expectMs, nowMs)}. We'll remind you if it goes quiet.`;
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
