/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 (design-refs/record-a-response-v2/record-a-response-v2.html) — THE JOURNEY'S MODEL, beside Log a
 * query's (logStages). One question a screen: Who replied? → What did {First} say? → When did {First} reply? → the reply's
 * own steps → Record. Everything here is pure: the steps a reply takes, the likely replies first, the headline, the
 * track's values, what the save will write, and the two numbers.
 *
 * ⚠️ NO NEW WRITER. `planOfResponse` composes the page's existing plan (lib/qc152Write `planRecord`, and lib/qc1522Write
 *    `planTell`'s own marks) into one batch; `recomputeQuery`'s derivation (`withRecompute`) stays the only thing that sets a status.
 *    The reply time and the nudge are the query's existing `writerExpectedDate` / `nudgeDate` (the send form's own
 *    fields); the extras an agent asked for are the step's own materials (`kind: "other"`, its words in `text`).
 * ⚠️ "SOMETHING ELSE" AS A REPLY IS NOT HERE: no existing record holds a reply that changes nothing (every reply step
 *    sets a status). It is listed under "Not built, needs a ruling" in reports/record-a-response-v2/REPORT.md.
 */
import { QueryStatus, type Activity, type Query } from "../../types";
import { planRecord, withRecompute, type PlanCtx, type StepMaterial, type WritePlan } from "../qc152Write";
import { holdsPages, type OtherQ } from "../qc1522Write";
import type { RawActivityDoc } from "../recomputeFields";
import { dayIso } from "./dates";
import { MONTHS_SHORT } from "../dates";
import { WEEKDAY } from "./logStages";
import { capFirst, sampleName, type Sample } from "./sample";
import { STAGE_COLOURS, stageOf, statusBand } from "../stageColours";
import { liveCount } from "../dashBreakdown";
import { isRequest, isResponse } from "../packageMetrics";

export const DAY = 86_400_000;

/* ── the replies ───────────────────────────────────────────────────────────────────────────────────────────── */

export type RKind = "pr" | "fr" | "rr" | "of" | "no";
export type RStage = "who" | "reply" | "when" | "asked" | "sent" | "words" | "next" | "by" | "others" | "details" | "check";
export const KIND: Record<RKind, { t: string; s: string; short: string; stages: readonly RStage[]; to: QueryStatus }> = {
  pr: { t: "Asked for a partial", s: "Some pages or chapters", short: "Partial", stages: ["who", "reply", "when", "asked", "sent", "check"], to: QueryStatus.PARTIAL_REQUESTED },
  fr: { t: "Asked for the full manuscript", s: "The whole book", short: "Full", stages: ["who", "reply", "when", "asked", "sent", "check"], to: QueryStatus.FULL_REQUESTED },
  rr: { t: "Asked me to revise and resubmit", s: "Changes first, then another look", short: "R&R", stages: ["who", "reply", "when", "words", "next", "check"], to: QueryStatus.REVISE_RESUBMIT },
  of: { t: "Made an offer", s: "An offer of representation", short: "Offer", stages: ["who", "reply", "when", "by", "others", "check"], to: QueryStatus.OFFER },
  no: { t: "Passed", s: "It closes the query.", short: "Passed", stages: ["who", "reply", "when", "words", "check"], to: QueryStatus.REJECTED },
};
export const ALL_KINDS: readonly RKind[] = ["pr", "fr", "rr", "of", "no"];
/** the track before the reply is known */
export const GENERIC: readonly RStage[] = ["who", "reply", "when", "details", "check"];
export const STAGE_LABEL: Record<RStage, string> = {
  who: "Agent", reply: "Reply", when: "When", asked: "Asked for", sent: "Sent", words: "Their words", next: "Next", by: "Decide by", others: "Others", details: "Details", check: "Record",
};
export const stagesOf = (k: RKind | null): readonly RStage[] => (k ? KIND[k].stages : GENERIC);

/**
 * THE LIKELY REPLIES FIRST, by where the query stands: Queried → partial, full, passed; Partial sent → full, passed,
 * revise; Full sent (or a revision sent) → offer, revise, passed; with the writer already → passed. The rest sit behind
 * "Another kind of reply". A status with no likely list (an offer, a closed query) shows every reply.
 */
export function likelyKinds(status: QueryStatus | string): RKind[] {
  switch (status) {
    case QueryStatus.QUERIED: return ["pr", "fr", "no"];
    case QueryStatus.PARTIAL_SENT: return ["fr", "no", "rr"];
    case QueryStatus.FULL_SENT: case QueryStatus.RESUBMITTED: return ["of", "rr", "no"];
    case QueryStatus.PARTIAL_REQUESTED: case QueryStatus.FULL_REQUESTED: case QueryStatus.REVISE_RESUBMIT: return ["no"];
    default: return [...ALL_KINDS];
  }
}
export const otherKinds = (status: QueryStatus | string): RKind[] => { const l = likelyKinds(status); return ALL_KINDS.filter((k) => !l.includes(k)); };

/* ── the answers ───────────────────────────────────────────────────────────────────────────────────────────── */

export interface RespAnswers {
  kind: RKind;
  /** the reply's day (local midnight) */
  when: number;
  /* asked for (partial / full) */
  ask: { sample: boolean; full: boolean; syn: boolean; other: boolean };
  extras: readonly string[];
  otherTx: string;
  samp: Sample;
  /* sent */
  sentQ: "yes" | "no" | null;
  sentMs: number;
  /** what went: the sample or full, the synopsis (a named one's id), the extras ticked */
  went: { main: boolean; syn: boolean; x: readonly string[] } | null;
  wsamp: Sample | null;
  synName: string | null;
  verId: string | null;
  sendBy: number | null;
  expectBy: number | null;
  nudgeOn: number | null;
  /* their words, revise, offer */
  words: string;
  rrNext: "yes" | "unsure" | "close" | null;
  rrBy: number | null;
  ofBy: number | null;
  others: "task" | "no" | null;
}

/** the status the query lands on */
export function newStatus(a: Pick<RespAnswers, "kind" | "sentQ" | "rrNext">): QueryStatus {
  switch (a.kind) {
    case "pr": return a.sentQ === "yes" ? QueryStatus.PARTIAL_SENT : QueryStatus.PARTIAL_REQUESTED;
    case "fr": return a.sentQ === "yes" ? QueryStatus.FULL_SENT : QueryStatus.FULL_REQUESTED;
    case "rr": return a.rrNext === "close" ? QueryStatus.WITHDRAWN : QueryStatus.REVISE_RESUBMIT;
    case "of": return QueryStatus.OFFER;
    case "no": return QueryStatus.REJECTED;
    default: { const unhandled: never = a.kind; return unhandled; }
  }
}

/** the sample's name as the design words it: "First 50 pages", "10 chapters from chapter 4" */
export const sampleWords = (s: Sample): string => capFirst(sampleName(s));
export const EXTRAS = ["Author bio", "Series outline", "Comp titles", "Chapter outline"] as const;

/** what was asked for, as the review's tiles and the "what was asked" card list it */
export function askedList(a: Pick<RespAnswers, "kind" | "ask" | "extras" | "otherTx" | "samp">): string[] {
  const l: string[] = [];
  if (a.kind === "pr" && a.ask.sample) l.push(sampleWords(a.samp));
  if (a.kind === "fr" && a.ask.full) l.push("Full manuscript");
  if (a.ask.syn) l.push("Synopsis");
  if (a.ask.other) { for (const x of a.extras) l.push(x); if (a.otherTx.trim()) l.push(a.otherTx.trim()); }
  return l;
}
/** the extras asked for (the chips ticked, and the words typed) */
export const extrasAsked = (a: Pick<RespAnswers, "ask" | "extras" | "otherTx">): string[] =>
  a.ask.other ? [...a.extras, ...(a.otherTx.trim() ? [a.otherTx.trim()] : [])] : [];
/** what went, as the review lists it */
export function wentList(a: Pick<RespAnswers, "kind" | "went" | "wsamp" | "synName">): string[] {
  const w = a.went;
  if (!w) return [];
  const l: string[] = [];
  if (w.main) l.push(a.kind === "fr" ? "Full manuscript" : a.wsamp ? sampleWords(a.wsamp) : "A sample");
  if (w.syn) l.push(a.synName || "Synopsis");
  for (const x of w.x) l.push(x);
  return l;
}

/* ── the materials on the steps (the step's own `materials`, lib/qc152Write StepMaterial) ─────────────────────── */

const unitOf = (s: Sample): "chapters" | "pages" | "words" => (s.unit === "pages" ? "pages" : s.unit === "words" ? "words" : "chapters");
export function askedMaterials(a: RespAnswers): StepMaterial[] {
  const m: StepMaterial[] = [];
  if (a.kind === "pr" && a.ask.sample) m.push({ kind: "sample", unit: unitOf(a.samp), n: a.samp.amt });
  if (a.kind === "fr" && a.ask.full) m.push({ kind: "full" });
  if (a.ask.syn) m.push({ kind: "synopsis" });
  for (const x of extrasAsked(a)) m.push({ kind: "other", text: x.slice(0, 80) });
  return m;
}
export function wentMaterials(a: RespAnswers): StepMaterial[] {
  const w = a.went;
  if (!w) return [];
  const m: StepMaterial[] = [];
  if (w.main) m.push(a.kind === "fr" ? { kind: "full", versionId: a.verId } : { kind: "sample", unit: unitOf(a.wsamp ?? a.samp), n: (a.wsamp ?? a.samp).amt, versionId: a.verId });
  if (w.syn) m.push({ kind: "synopsis", name: a.synName });
  for (const x of w.x) m.push({ kind: "other", text: x.slice(0, 80) });
  return m;
}

/* ── the plan: the existing writers, composed into one batch ──────────────────────────────────────────────── */

const iso = (ms: number | null): string => (ms != null ? dayIso(new Date(ms)) : "");
/** the nested log after a plan: what the next plan's derivation must see */
function logAfter(existing: readonly RawActivityDoc[], plan: WritePlan): RawActivityDoc[] {
  const prefix = `queries/${plan.queryId}/activity/`;
  const add = plan.set.filter((s) => s.path.startsWith(prefix)).map((s) => ({ id: s.path.slice(prefix.length), data: s.data }));
  return [...existing, ...add];
}
function feedAfter(feed: readonly RawActivityDoc[], plan: WritePlan): RawActivityDoc[] {
  const add = plan.set.filter((s) => s.path.startsWith("activities/")).map((s) => ({ id: s.path.slice("activities/".length), data: s.data }));
  return [...feed, ...add];
}

/**
 * Every write the answers make, in order, for ONE `commitMany` (one snapshot, one batch, one Undo):
 *   1. the reply: its step (with what was asked for, their words, a send-by / resubmit-by / answer-by date);
 *   2. "it's gone": the send's step (what went, the version, the named synopsis), then the reply time and the nudge on the
 *      query (`writerExpectedDate` + `writerExpectedSetAt`, `nudgeDate`), each cleared when not wanted;
 *   3. revise and resubmit, "No, close the query": the close (as withdrawn — closed by you);
 *   4. an offer, "Put it on my to-do list": the offer step flagged as it is made, every other open query marked to tell.
 * Each later plan's derivation reads the log the earlier ones leave, so the last one's derived fields are the truth.
 */
export function planOfResponse(c: PlanCtx & { feed: RawActivityDoc[] }, a: RespAnswers, others: readonly OtherQ[]): WritePlan[] {
  const plans: WritePlan[] = [];
  let existing = [...c.existing];
  let feed = [...c.feed];
  const push = (p: WritePlan) => { plans.push(p); existing = logAfter(existing, p); feed = feedAfter(feed, p); };

  const kind = a.kind === "pr" ? "partial_req" : a.kind === "fr" ? "full_req" : a.kind === "rr" ? "rr_req" : a.kind === "of" ? "offer" : "pass";
  const resp = a.kind === "pr" || a.kind === "fr" ? (a.sentQ === "no" && a.sendBy != null ? { expectedBy: iso(a.sendBy) } : {})
    : a.kind === "rr" ? (a.rrNext === "yes" && a.rrBy != null ? { expectedBy: iso(a.rrBy) } : {})
    : a.kind === "of" ? { offerDeadline: iso(a.ofBy) }
    : { feedbackType: a.words.trim() ? "Yes" : "Form" };
  /* an offer whose telling goes on the to-do list carries the flag from the start (`tellLater`, the step's own field): the
     step is created in this batch, and a create cannot be followed by an update of it in the same batch */
  const tell = a.kind === "of" && a.others === "task" && others.length > 0;
  const reply = planRecord({ ...c, existing }, kind, a.when, askedMaterials(a), { replyNote: a.words, resp: resp as never, ...(tell ? { step: { tellLater: true } } : {}) });
  /* a partial's own request fields (the drawer's `saveResponse` writes these): the synopsis asked for, and a section */
  if (a.kind === "pr") {
    const q = c.q;
    reply.query.requestSynopsis = a.ask.syn;
    if (a.ask.sample && a.samp.sect) { reply.query.requestFrom = a.samp.from; reply.query.requestFromUnit = a.samp.fu ?? (a.samp.unit === "pages" ? "page" : "chapter"); }
    else { if (q.requestFrom != null) reply.query.requestFrom = undefined; if (q.requestFromUnit) reply.query.requestFromUnit = undefined; }
  }
  push(reply);

  if ((a.kind === "pr" || a.kind === "fr") && a.sentQ === "yes") {
    const sent = planRecord({ ...c, existing }, a.kind === "pr" ? "partial_sent" : "full_sent", a.sentMs, wentMaterials(a));
    if (a.expectBy != null) { sent.query.writerExpectedDate = iso(a.expectBy); sent.query.writerExpectedSetAt = new Date(c.nowMs).toISOString(); }
    else { sent.query.writerExpectedDate = undefined; sent.query.writerExpectedSetAt = undefined; }
    sent.query.nudgeDate = a.nudgeOn != null ? iso(a.nudgeOn) : undefined;
    push(sent);
  }
  if (a.kind === "rr" && a.rrNext === "close") {
    push(planRecord({ ...c, existing }, "withdrawn", a.when, [], { withdraw: { token: "withdrew", event: "withdrawn" } }));
  }
  /* the other open queries, marked to tell (lib/qc1522Write `planTell`'s own marks, `offerTold: false`): the To-do's
     "tell the others" card reads them, and completes itself when none is left */
  if (tell) {
    push({ queryId: c.q.id, set: [], del: [], query: {}, update: others.filter((o) => !o.told).map((o) => ({ path: `queries/${o.id}`, data: { offerRefQueryId: c.q.id, offerTold: false } })) });
  }
  return plans;
}

/** the query as it will be after the plans (their patches, in order; an undefined clears a field) */
export function queryAfter(q: Query, plans: readonly WritePlan[]): Query {
  const out: Record<string, unknown> = { ...q };
  for (const p of plans) {
    if (p.queryId !== q.id) continue;
    for (const [k, v] of Object.entries(p.query)) { if (v === undefined) delete out[k]; else out[k] = v; }
  }
  return out as unknown as Query;
}
/** the feed rows the plans add for this query, as the list's row derivation reads them */
export const feedRowsOf = (plans: readonly WritePlan[]): Activity[] =>
  plans.flatMap((p) => p.set.filter((s) => s.path.startsWith("activities/")).map((s) => s.data as unknown as Activity));

/** the other open queries on the same book an offer can tell (the composer's own rule) */
export function othersFor(q: Query, all: readonly Query[], isLive: (x: Query) => boolean): OtherQ[] {
  return all.filter((x) => x.id !== q.id && x.manuscriptId === q.manuscriptId && isLive(x) && x.status !== QueryStatus.OFFER)
    .map((x) => ({ id: x.id, told: x.offerRefQueryId === q.id && x.offerTold === true, offerReply: x.offerReply ?? null, holdsPages: holdsPages(x.status) }));
}

/* ── the two numbers ─────────────────────────────────────────────────────────────────────────────────────── */

export interface RespCounts {
  /** the first number: requests (lib/packageMetrics `isRequest`), offers, or the Dashboard's active count (`liveCount`) */
  lead: { k: "requests" | "offer" | "active"; label: string; n: number; d: number };
  /** replies in: lib/packageMetrics `isResponse` — each query counts once, however many replies it has had */
  replies: { n: number; d: number };
}
/**
 * ⚠️ NOT A NEW COUNT: each figure is an existing function's, over this book's queries as they are and with this query as the
 *    save leaves it. A query already counted (a second request, a second reply) changes nothing, and then no badge shows.
 */
export function respCounts(book: readonly Query[], before: Query, after: Query, kind: RKind): RespCounts {
  const withIt = book.map((x) => (x.id === before.id ? after : x));
  const was = book.some((x) => x.id === before.id) ? book : [...book, before];
  const now = book.some((x) => x.id === before.id) ? withIt : [...book, after];
  const cnt = (l: readonly Query[], f: (x: Query) => boolean) => l.filter(f).length;
  const offer = (x: Query) => x.status === QueryStatus.OFFER || x.status === QueryStatus.SIGNED;
  const lead = kind === "of"
    ? { k: "offer" as const, label: cnt(now, offer) === 1 ? "offer" : "offers", n: cnt(now, offer), d: cnt(now, offer) - cnt(was, offer) }
    : kind === "pr" || kind === "fr"
      ? { k: "requests" as const, label: "requests so far", n: cnt(now, isRequest), d: cnt(now, isRequest) - cnt(was, isRequest) }
      : { k: "active" as const, label: "active queries", n: liveCount(now), d: liveCount(now) - liveCount(was) };
  return { lead, replies: { n: cnt(now, isResponse), d: cnt(now, isResponse) - cnt(was, isResponse) } };
}

/* ── the head, the track, the colour ─────────────────────────────────────────────────────────────────────── */

/** the headline, by where the writer is (the design's `head()`); line two in the head's blush */
export function headline(o: { kind: RKind | null; first: string; recorded: boolean; sitting: number; picked: boolean; requests: number | null; activeLeft: number | null; offers: number | null; rrNext: RespAnswers["rrNext"]; sentQ?: RespAnswers["sentQ"] }): [string, string] {
  const { kind: k, first: f } = o;
  if (o.recorded) {
    /* v2.1 — once what was asked for has gone, the head is about the send (the card beneath says Partial / Full sent) */
    const sent = o.sentQ === "yes";
    if (k === "pr" || k === "fr") return [`Recorded. ${k === "pr" ? (sent ? "Partial sent!" : "A partial request!") : (sent ? "Full sent!" : "A full request!")}`, o.requests != null ? `That’s ${o.requests} ${o.requests === 1 ? "request" : "requests"} so far.` : "Let’s keep going."];
    if (k === "of") return ["Recorded. An offer!", o.offers === 1 ? "Your first. Enjoy it." : "Enjoy it."];
    if (k === "rr") return ["Recorded.", o.rrNext === "close" ? "The query is closed." : `${f} wants another look.`];
    if (k === "no") return ["Recorded.", o.activeLeft != null ? `${o.activeLeft} ${o.activeLeft === 1 ? "query" : "queries"} still out.` : "On to the next."];
    return ["Recorded.", "Nothing else changes."];
  }
  if (o.sitting && !o.picked) return [`That’s ${o.sitting} recorded.`, "Who else replied?"];
  const a = k === "pr" ? "A partial request. Great work!" : k === "fr" ? "A full request. Great work!" : k === "of" ? "An offer. Congratulations!"
    : k === "rr" ? "A revise and resubmit." : k === "no" ? "A pass this time." : "You’ve heard back.";
  return [a, "Let’s record the details."];
}

/**
 * THE FORM'S COLOUR (the design's TONE: disc, wash, mark), from the app's stage colour table (lib/stageColours): the
 * query's own status once it is picked, then the status the reply moves it to. Disc: the status band (the requested shade
 * while pages are asked for); wash: the stage's tint; mark: the stage's rim.
 */
export function toneOf(status: QueryStatus | string | null): { disc: string; wash: string; mark: string } | null {
  if (!status) return null;
  const st = STAGE_COLOURS[stageOf(status)];
  const requestedShade = stageOf(status) === "partial" || stageOf(status) === "full" ? st.bandRequested : statusBand(status);
  return { disc: requestedShade, wash: st.tint, mark: st.rim };
}
/** the status the form takes its colour from: the query's, until a reply is picked; a revision reads as full */
export function toneStatus(qStatus: QueryStatus | string | null, kind: RKind | null, rrNext: RespAnswers["rrNext"]): QueryStatus | string | null {
  if (!qStatus) return null;
  if (!kind) return qStatus;
  if (kind === "rr") return rrNext === "close" ? QueryStatus.WITHDRAWN : QueryStatus.REVISE_RESUBMIT;
  return KIND[kind].to;
}

/* ── dates ─────────────────────────────────────────────────────────────────────────────────────────────── */

/* the app's one month table (lib/dates) and Log a query's weekday names */
const MON = MONTHS_SHORT;
const WD = WEEKDAY;
export const sod = (ms: number): number => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
export const addDaysMs = (ms: number, n: number): number => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); };
export const dm = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]}`; };
export const wdm = (ms: number): string => `${WD[new Date(ms).getDay()]} ${dm(ms)}`;
export const w3dm = (ms: number): string => `${WD[new Date(ms).getDay()].slice(0, 3)} ${dm(ms)}`;
export const daysSince = (ms: number, nowMs: number): number => Math.max(0, Math.round((sod(nowMs) - sod(ms)) / DAY));
export const whenWord = (ms: number, nowMs: number): string => (sod(ms) === sod(nowMs) ? "Today" : sod(ms) === addDaysMs(nowMs, -1) ? "Yesterday" : dm(ms));
export const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? "" : "s"}`;

/** what goes on the to-do list because of this reply: [the task, its day] (the design's `taskLine`) */
export function taskLine(a: RespAnswers, first: string): [string, string] | null {
  const noun = a.kind === "fr" ? "your full" : "your partial";
  if ((a.kind === "pr" || a.kind === "fr") && a.sentQ === "no") return [`Send ${noun} to ${first}`, a.sendBy != null ? w3dm(a.sendBy) : "No date"];
  if ((a.kind === "pr" || a.kind === "fr") && a.sentQ === "yes") return a.nudgeOn != null ? [`Nudge ${first} if there’s no reply`, w3dm(a.nudgeOn)] : null;
  if (a.kind === "rr" && a.rrNext === "yes") return [`Revise and resubmit to ${first}`, a.rrBy != null ? w3dm(a.rrBy) : "No date"];
  if (a.kind === "of") return [`Answer ${first}’s offer`, a.ofBy != null ? w3dm(a.ofBy) : "No date"];
  return null;
}

/**
 * Record a response v2.1 — THE RECORDED SCREEN'S WORDS, from what was saved (design-refs/record-a-response-v2-1,
 * `recordedHtml`). PURE, so every kind and branch is locked against the status the card beneath shows (`newStatus`).
 *   slot  the illustration slot's label
 *   big   the big line
 *   line  the sentence beneath: [before, bold, after] (bold is null when nothing is bold)
 * ⚠️ NO SENTENCE NARRATES THE STATUS CHANGE ("It went today, so the query is now partial sent" is gone): the card beneath
 *    already shows it. A request that has gone talks about the send; one not yet sent is unchanged.
 */
export interface RecordedCopy { slot: string; big: string; line: [string, string | null, string] }
export function recordedCopy(a: RespAnswers, first: string, o: { othersN: number; activeLeft: number | null }): RecordedCopy {
  const f = first, k = a.kind, t = taskLine(a, f);
  if (k === "pr" || k === "fr") {
    const noun = k === "pr" ? "partial" : "full";
    if (a.sentQ === "yes") {
      const line: RecordedCopy["line"] = t ? ["We’ll remind you to nudge on ", t[1], "."]
        : a.expectBy != null ? ["A reply is expected by ", w3dm(a.expectBy), "."] : ["There’s no reply date yet.", null, ""];
      return { slot: `celebration · ${noun} sent`, big: `Your ${noun} is with ${f}.`, line };
    }
    return {
      slot: `celebration · ${noun} request`, big: k === "pr" ? `${f} wants to read more.` : `${f} wants the whole book.`,
      line: a.sendBy != null && t ? [`Sending your ${noun} is on your to-do list for `, t[1], "."] : [`Sending your ${noun} is on your to-do list.`, null, ""],
    };
  }
  if (k === "of") {
    const tell = a.others === "task" ? ` So is telling the other ${plural(o.othersN, "agent")}.` : "";
    return { slot: "celebration · offer", big: `${f} has made an offer.`,
      line: a.ofBy != null && t ? ["Answering it is on your to-do list for ", t[1], `.${tell}`] : [`Answering it is on your to-do list.${tell}`, null, ""] };
  }
  const left = o.activeLeft;
  if (k === "rr") {
    const line: RecordedCopy["line"] = a.rrNext === "yes" ? (a.rrBy != null && t ? ["Resubmitting is on your to-do list for ", t[1], "."] : ["Resubmitting is on your to-do list.", null, ""])
      : a.rrNext === "close" ? [`The query is closed.${left != null ? ` ${left} ${left === 1 ? "is" : "are"} still out.` : ""}`, null, ""]
      : ["The query stays open, with you.", null, ""];
    return { slot: "the mentor · revise and resubmit", big: `${f} asked for changes.`, line };
  }
  return { slot: "the mentor · a pass", big: `${f} passed.`,
    line: [`The query is closed and in your Rejection collection.${left != null ? ` ${left} ${left === 1 ? "query is" : "queries are"} still with agents.` : ""}`, null, ""] };
}
