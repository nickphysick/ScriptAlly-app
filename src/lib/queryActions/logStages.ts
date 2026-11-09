/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 (design-refs/log-a-query-v1/) — THE STAGED JOURNEY'S MODEL, shared by its two hosts (the Query Centre
 * and the Contact list). Everything here is pure: what each agent, package and piece looks like to the stages, how the
 * writer's answers become the log save's own `LogPlan`, and the words the check stage and the celebration say.
 *
 * ⚠️ THE SAVE IS UNCHANGED. `planOf` builds exactly the `LogPlan` the old form built — `logDefaults` for the reply
 *    date and the nudge, `pieceVersions` for a package — and adds nothing to the payload. A chosen book version rides
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
import { logDefaults, logPayload, pieceVersions, type LogPlan, type PieceVersions } from "./logSave";
import { guidelineAsk, packageMatches, type GuidelineAsk, type PackageCard } from "./packages";
import { blankSample, sampleName, capFirst, type Materials, type Sample } from "./sample";

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

export type StageKey = "who" | "when" | "what" | "how" | "check";
export const STAGES: readonly StageKey[] = ["who", "when", "what", "how", "check"];
export const STAGE_LABEL: Record<StageKey, string> = { who: "Agent", when: "Sent", what: "Materials", how: "How", check: "Log" };

/** the FlowHead's line on each stage (the Agent stage's is `FLOW_WORDS.log.line`, or the batch line) */
export const STAGE_LINE: Record<Exclude<StageKey, "who" | "check">, string> = {
  when: "When did you send it?",
  what: "What went with it?",
  how: "How did it go?",
};
export const batchWhoLine = (lastFirst: string): string => `${lastFirst} is logged. Who's next? We'll keep the same date and materials.`;
export const checkLine = (n: number, book: string): string => `Your ${ordinal(n)} query for ${book}.`;
export const batchCheckLine = (lastFirst: string): string => `Same date and materials as ${lastFirst}. Tap a step above to change anything.`;

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
export interface BookChoice extends Choice { current: boolean }
export interface SampleChoice { unit: Exclude<Sample["unit"], "none">; amt: number; bookVersionId: string | null }

export interface StagePackage { id: string; name: string; active: boolean; card: PackageCard; pieces: string[] }

/** the sizes the "How much?" menu offers: the ref's five, and the agent's own ask when it is not among them */
export const SAMPLE_SIZES: readonly { unit: SampleChoice["unit"]; amt: number }[] = [
  { unit: "pages", amt: 5 }, { unit: "pages", amt: 10 }, { unit: "pages", amt: 50 }, { unit: "chapters", amt: 1 }, { unit: "chapters", amt: 3 },
];
export function sizesFor(ask: GuidelineAsk): { unit: SampleChoice["unit"]; amt: number }[] {
  const out = [...SAMPLE_SIZES];
  const s = ask.sample;
  if (s.unit !== "none" && !out.some((x) => x.unit === s.unit && x.amt === s.amt)) out.push({ unit: s.unit, amt: s.amt });
  return out;
}
export const sizeName = (s: { unit: Sample["unit"]; amt: number }): string =>
  s.unit === "chapters" && s.amt === 1 ? "First chapter" : capFirst(sampleName({ ...blankSample(), unit: s.unit, amt: s.amt }));

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
  const s = p.sample;
  const sameS = ask.sample.unit === "none" ? !s : !!s && s.unit === ask.sample.unit && s.amt === ask.sample.amt;
  return !!p.letterId === ask.ql && !!p.synopsisId === ask.syn && sameS;
}
export const packageFits = (p: StagePackage, ask: GuidelineAsk): boolean => packageMatches(p.card, ask);

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
  const s: Sample = a.sample ? { ...blankSample(), unit: a.sample.unit, amt: a.sample.amt } : { ...blankSample(), unit: "none" };
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
  return { id, manuscriptId: ctx.manuscriptId, agent, sent, via: a.via, pkCard, mat, pieceV, basedOn: null, ...logDefaults(agent, sent), requery };
}

export const PREVIEW_ID = "__log-preview__";

export interface Preview { row: QcRow; packageName: string | null; agent: Agent; state: QueryState | undefined; expectMs: number | null; noWindow: boolean }
/** the unsaved query as the Query Centre will list it: the save's own record, through the list's own helpers */
export function previewOf(plan: LogPlan, nowMs: number, quietWeeks: number): Preview {
  const { payload, summary } = logPayload(plan);
  const q = { ...payload, status: QueryStatus.QUERIED, sentMaterials: summary } as unknown as Query;
  const [row0] = buildQcRows([q], [plan.agent], [], nowMs);
  const [row] = stampRows([row0], [plan.agent], { quietWeeks, nowMs });
  const noWindow = !(plan.agent.responseTimeWeeks && plan.agent.responseTimeWeeks > 0);
  return { row, packageName: plan.pkCard?.name ?? null, agent: plan.agent, state: row.qs, expectMs: noWindow ? null : plan.expect.getTime(), noWindow };
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
export const yesterday = (nowMs: number): number => { const d = new Date(sod(nowMs)); d.setDate(d.getDate() - 1); return d.getTime(); };
