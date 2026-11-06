/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §3–§4 — THE PAGE'S ONE BATCHED WRITER (Nick, recon: "build a single batched writer for this page's
 * saves (record, fix, details). Anything that can't join the batch runs after it, best-effort, and Undo restores it
 * too. Don't move other pages onto it.").
 *
 * A save is a PLAN — documents to set, documents to delete, one query patch — built by the pure planners below from
 * the same builders the journeys use (`planResponse`, `closeRecord`, `buildNudgeWrites`, the send's own words), and
 * committed in ONE `writeBatch`. The derived fields (status, the pipeline dates) are computed over the log the batch
 * leaves behind by the one derivation (`computeRecomputedFields`) and ride in the same batch, so nothing can show a
 * new step with an old status.
 *
 * ⚠️ UNDO IS A SNAPSHOT (lib/queryActions/snapshot), taken before the batch: the query, both activity stores, its flags
 *    and tasks, put back whole. Never an inverse.
 * ⚠️ EVERY STEP CARRIES ITS MATERIALS on both stores (`materials`, a list of maps). A request carries what was asked;
 *    a send, what went. Steps written before v152 carry none.
 */
import { collection, deleteField, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc, writeBatch, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";
import { ActivityType, QueryStatus, type Agent, type EventKey, type Manuscript, type Query } from "../types";
import { planResponse, buildLegacyActivity, type RecordResponseData } from "./recordResponse";
import { closeRecord, noreplyAnswers } from "./queryActions/closeRecord";
import { buildNudgeWrites } from "./logNudge";
import { computeRecomputedFields, recomputedPatch, type RawActivityDoc } from "./recomputeFields";
import { getActivityTime } from "./queryDerivation";
import { takeSnapshot, type Snapshot } from "./queryActions/snapshot";
import { dayIso } from "./queryActions/dates";
import { UNIT_CFG } from "./agentMaterials";

const DAY = 86_400_000;

/* ── the materials on a step ────────────────────────────────────────────────────────────────────────────────── */

export type MatKind = "letter" | "synopsis" | "sample" | "full" | "other";
export type SampleUnit = "chapters" | "pages" | "words";
export interface StepMaterial {
  kind: MatKind;
  /** a saved letter or synopsis's name (Pro), or null for "not in QueryHawk" */
  name?: string | null;
  /** the synopsis's length, in pages (Free), or null for any length */
  pages?: number | null;
  unit?: SampleUnit;
  n?: number;
  /** the book version a sample or full was (Pro) */
  versionId?: string | null;
  text?: string;
}
/** the unit physics (§4.4): "the same control as the agent card", so its step, floor, default and ceiling are the agent
 *  card's own (`UNIT_CFG`, decision 11) — chapters step 1, pages 5, words 500; switching snaps to 3 / 10 / 5,000 */
export const UNIT: Record<SampleUnit, { step: number; min: number; def: number; max: number; label: string }> = {
  chapters: { ...UNIT_CFG.Chapters, label: "Chapters" },
  pages: { ...UNIT_CFG.Pages, label: "Pages" },
  words: { ...UNIT_CFG.Words, label: "Words" },
};
export const KIND_LABEL: Record<MatKind, string> = { letter: "Query letter", synopsis: "Synopsis", sample: "Opening sample", full: "Full manuscript", other: "Something else" };
/** a material's chip words; versions only for Pro, and never "Original" (§4.4) */
export function matLabel(m: StepMaterial, o: { free: boolean; versionName?: (id: string) => string | null; originalId?: string | null } = { free: false }): string {
  const vn = !o.free && m.versionId && m.versionId !== o.originalId ? o.versionName?.(m.versionId) ?? null : null;
  const vs = vn ? ` · ${vn}` : "";
  switch (m.kind) {
    case "letter": return !o.free && m.name ? m.name : "Query letter";
    case "synopsis": return !o.free && m.name ? m.name : m.pages ? `${m.pages}-page synopsis` : "Synopsis";
    case "sample": {
      const n = m.n ?? UNIT[m.unit ?? "chapters"].def;
      const w = m.unit === "pages" ? `${n} pages` : m.unit === "words" ? `${n.toLocaleString("en-GB")} words` : `First ${n} chapter${n === 1 ? "" : "s"}`;
      return w + vs;
    }
    case "full": return `Full manuscript${vs}`;
    default: return (m.text ?? "").trim() || "Something else";
  }
}
/** a stored list (maps, or the strings an older writer left) → chip words */
export function storedLabels(raw: unknown, o: Parameters<typeof matLabel>[1]): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (typeof x === "string" ? x : x && typeof x === "object" && "kind" in x ? matLabel(x as StepMaterial, o) : String((x as { label?: unknown })?.label ?? "")))
    .filter(Boolean);
}
/** the stored form: no undefined (Firestore refuses it inside a map) */
export function storeMats(ms: readonly StepMaterial[]): Record<string, unknown>[] {
  return ms.map((m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined && v !== null && v !== "")));
}

/* ── what a step is ─────────────────────────────────────────────────────────────────────────────────────────── */

export type RecordKind = "partial_req" | "full_req" | "rr_req" | "offer" | "pass" | "partial_sent" | "full_sent" | "nudge" | "noresp" | "told"
  /** v152.2 §4.1 the revision sent; §4.3 / §6.1 a close as withdrawn (I withdrew it, declined, or accepted elsewhere) */
  | "resubmitted" | "withdrawn";
export const RECORD_STATUS: Record<RecordKind, QueryStatus | null> = {
  partial_req: QueryStatus.PARTIAL_REQUESTED, full_req: QueryStatus.FULL_REQUESTED, rr_req: QueryStatus.REVISE_RESUBMIT, offer: QueryStatus.OFFER, pass: QueryStatus.REJECTED,
  partial_sent: QueryStatus.PARTIAL_SENT, full_sent: QueryStatus.FULL_SENT, nudge: null, noresp: QueryStatus.NO_RESPONSE, told: null,
  resubmitted: QueryStatus.RESUBMITTED, withdrawn: QueryStatus.WITHDRAWN,
};
/** the agent's replies, which can carry what they said (v152.1 §2.6) */
export const REPLY_KINDS: readonly RecordKind[] = ["partial_req", "full_req", "rr_req", "offer", "pass"];
export const REPLY_NOTE_MAX = 500;

/**
 * v152.1 §2.5 — TOLD OTHER AGENTS ABOUT AN OFFER. A step on the offering query's own log (not a status: recompute ignores
 * it), carrying how many you told and the deadline you gave them.
 * ⚠️ ONE FACT, ONE SAVE (Nick): the step IS the record. Saving it writes the step AND the per-query marks on each other live
 *    query (`offerRefQueryId`, `offerTold`, `offerToldOn`, `offerReply` — the offer journey's fields) in the same batch;
 *    editing its date moves `offerToldOn`, removing it clears the marks, and Undo restores both from one snapshot.
 * ⚠️ IT HAS A FEED ROW (Nick: "one of the most important moments in a campaign"): "You told 6 agents about Tom's offer",
 *    the `offer_told` event key, no status — so nothing that counts offers counts it.
 */
export const TOLD_TYPE = "Told other agents";
export const TOLD_EVENT: EventKey = "offer_told";
/** the feed row's sentence: "You told 6 agents about Tom's offer" */
export const toldLine = (count: number, agentName: string | null | undefined) =>
  `You told ${count} agent${count === 1 ? "" : "s"} about ${(agentName ?? "").trim().split(/\s+/)[0] || "the agent"}’s offer`;
export interface ToldMarkTarget { id: string; offerReply?: string | null }
export interface RecordExtra {
  /** §2.6 what the agent said, on one of their replies */
  replyNote?: string;
  /** v152.2 §5 — fields over the reply's own answers (a deadline, an answer-by date, form or personal, what was asked) */
  resp?: Partial<RecordResponseData>;
  /** v152.2 — fields carried on the step itself, on both stores: `openToMore`, `offWall`, `askedFor`, `sentVia`, `tellLater` */
  step?: Record<string, unknown>;
  /** v152.2 §4.3 / §6.1 — a withdrawal's reason and its event: "withdrew" (I withdrew it), "offer_declined", "accepted_offer" */
  withdraw?: { token: "withdrew" | "offer_declined" | "accepted_offer"; event: EventKey; notes?: string };
  /** §2.5 told other agents: how many, the deadline you gave, and the other live queries to mark */
  told?: { count: number; deadlineMs: number; others: readonly ToldMarkTarget[] };
}
const markTold = (q: Query, others: readonly ToldMarkTarget[], tMs: number): NonNullable<WritePlan["update"]> =>
  others.map((o) => ({ path: `queries/${o.id}`, data: { offerRefQueryId: q.id, offerTold: true, offerToldOn: dayIso(new Date(tMs)), offerReply: o.offerReply || "wait" } }));
const clearTold = (ids: readonly string[]): NonNullable<WritePlan["update"]> =>
  ids.map((id) => ({ path: `queries/${id}`, data: { offerRefQueryId: deleteField(), offerTold: deleteField(), offerToldOn: deleteField(), offerReply: deleteField() } }));

const EVENT: Record<Exclude<RecordKind, "told">, EventKey> = {
  partial_req: "partial_requested", full_req: "full_requested", rr_req: "rr_requested", offer: "offer", pass: "pass",
  partial_sent: "partial_sent", full_sent: "full_sent", nudge: "nudge_sent", noresp: "closed_no_reply",
  resubmitted: "resubmitted", withdrawn: "withdrawn",
};

/** the step's time: the chosen day at local noon (as the drawer dates a day), and after everything already logged */
export function stepTime(dayMs: number, existing: readonly RawActivityDoc[]): number {
  const d = new Date(dayMs); d.setHours(12, 0, 0, 0);
  const latest = Math.max(0, ...existing.map((x) => getActivityTime(x.data.createdAt)));
  return Math.max(d.getTime(), latest + 1);
}

export interface PlanCtx {
  uid: string;
  q: Query;
  agent: Agent | null;
  ms: Manuscript | null;
  /** the authoritative log as it stands */
  existing: RawActivityDoc[];
  nowMs: number;
  /** the quiet window, weeks: a nudge's check-back is the nudge plus it */
  quietWeeks: number;
  /** v152.1 §2.5 — the other queries marked as told about this one's offer (`offerRefQueryId` is this query) */
  marked?: readonly string[];
}
export interface WritePlan {
  queryId: string;
  /** documents to set, by path below users/{uid} */
  set: { path: string; data: DocumentData }[];
  del: string[];
  /** the query's fields; undefined clears one */
  query: Record<string, unknown>;
  /** fields merged into other documents in the same batch (a draft package's lock stamp, §4.5) */
  update?: { path: string; data: DocumentData }[];
}

const respData = (over: Partial<RecordResponseData>): RecordResponseData => ({
  responseType: "partial", materialsType: "Pages", materialsQuantity: 0, materialsOtherText: "", expectedBy: "", sendReminderDate: "",
  dateReceived: "", rrNotes: "", feedbackType: "Form", feedbackText: "", privateReflection: "", rejectionLesson: "", requeryPreference: "",
  offerDate: "", offerDeadline: "", offerNotes: "", closingReason: "Other", closingNotes: "", ...over,
});
const UNIT_NAME: Record<SampleUnit, RecordResponseData["materialsType"]> = { pages: "Pages", chapters: "Chapters", words: "Words" };

/** a new step, planned (§3): the activity in both stores and the query's fields after it */
export function planRecord(c: PlanCtx, kind: RecordKind, dayMs: number, materials: readonly StepMaterial[], extra: RecordExtra = {}): WritePlan {
  const { q, agent } = c;
  const id = `act-${Math.random().toString(36).slice(2, 11)}`;
  const tMs = stepTime(dayMs, c.existing);
  const createdAt = Timestamp.fromMillis(tMs);
  const iso = new Date(tMs).toISOString();
  const mats = storeMats(materials);
  const name = agent?.name || "the agent", agency = agent?.agency || "agency";
  const base = { queryId: q.id, agentName: agent?.name || agent?.agency || "", manuscriptTitle: c.ms?.title ?? "" };
  let sub: DocumentData, feed: DocumentData;
  const query: Record<string, unknown> = {};

  if (kind === "told") {
    const t = extra.told;
    if (!t) throw new Error("Told other agents needs a count and a deadline");
    const count = Math.max(1, Math.min(30, Math.round(t.count)));
    const sub: DocumentData = { type: TOLD_TYPE, createdAt, note: `Told ${count} other agent${count === 1 ? "" : "s"} about ${name}’s offer`, ...base,
      eventKey: TOLD_EVENT, toldCount: count, toldDeadline: dayIso(new Date(t.deadlineMs)) };
    const feedRow: DocumentData = { id, userId: c.uid, queryId: q.id, manuscriptId: q.manuscriptId || "", activityType: ActivityType.STATUS_CHANGED,
      description: toldLine(count, agent?.name || agent?.agency), date: iso, details: "", eventKey: TOLD_EVENT, logEntryId: id };
    return { queryId: q.id, set: [{ path: `queries/${q.id}/activity/${id}`, data: sub }, { path: `activities/${id}`, data: feedRow }], del: [], query: {}, update: markTold(q, t.others, tMs) };
  }
  const note = REPLY_KINDS.includes(kind) ? (extra.replyNote ?? "").trim().slice(0, REPLY_NOTE_MAX) : "";
  if (kind === "nudge") {
    const check = new Date(tMs + c.quietWeeks * 7 * DAY).toISOString();
    const w = buildNudgeWrites(q, agent, { eventDate: iso, checkBackDate: check }, new Date(c.nowMs));
    sub = { ...w.nested, ...base, createdAt: w.nested.createdAt, ...(mats.length ? { materials: mats } : {}), eventKey: EVENT.nudge };
    feed = { ...w.activity, id, userId: c.uid, eventKey: EVENT.nudge };
    Object.assign(query, w.queryUpdates);
  } else if (kind === "partial_sent" || kind === "full_sent" || kind === "resubmitted") {
    const st = RECORD_STATUS[kind]!;
    const desc = st === QueryStatus.PARTIAL_SENT ? `Partial manuscript sent to ${name} at ${agency}`
      : st === QueryStatus.RESUBMITTED ? `Revised manuscript sent to ${name} at ${agency}` : `Full manuscript sent to ${name} at ${agency}`;
    const ver = materials.find((m) => (m.kind === "sample" || m.kind === "full") && m.versionId)?.versionId ?? null;
    sub = { type: st, resultingStatus: st, createdAt, note: desc, ...base, eventKey: EVENT[kind], ...(mats.length ? { materials: mats } : {}) };
    feed = { id, userId: c.uid, queryId: q.id, manuscriptId: q.manuscriptId || "", activityType: ActivityType.MATERIALS_SENT, description: desc, date: iso,
      details: "", resultingStatus: st, eventKey: EVENT[kind], ...(mats.length ? { materials: mats } : {}), ...(ver ? { bookVersionId: ver } : {}) };
    query.lastSentLabel = kind === "partial_sent" ? "Partial" : kind === "resubmitted" ? "Revised manuscript" : "Full manuscript";
    if (q.expectedSendDate) query.expectedSendDate = undefined;
    if (q.sendReminderDate) query.sendReminderDate = undefined;
    if (kind === "full_sent" && ver) query.bookVersionId = ver;
  } else {
    const day = dayIso(new Date(tMs));
    const sample = materials.find((m) => m.kind === "sample");
    const wd = extra.withdraw ?? { token: "withdrew" as const, event: EVENT.withdrawn };
    const data0: RecordResponseData = kind === "noresp" ? closeRecord(noreplyAnswers(new Date(tMs)))
      : kind === "withdrawn" ? respData({ responseType: "close", dateReceived: day, closingReason: "Withdrew my submission", closingNotes: wd.notes ?? "", eventKey: wd.event, closeAs: "withdrawn", closingToken: wd.token })
      : kind === "partial_req" ? respData({ responseType: "partial", dateReceived: day, materialsType: sample?.unit ? UNIT_NAME[sample.unit] : "Pages", materialsQuantity: sample?.n ?? 0, eventKey: EVENT[kind] })
      : kind === "full_req" ? respData({ responseType: "full", dateReceived: day, eventKey: EVENT[kind] })
      /* an R&R is asked as the full is: what they asked for, and what they said (the reply note, never the old rrNotes) */
      : kind === "rr_req" ? respData({ responseType: "rr", dateReceived: day, eventKey: EVENT[kind] })
      : kind === "offer" ? respData({ responseType: "offer", dateReceived: day, offerDate: day, eventKey: EVENT[kind] })
      : respData({ responseType: "rejected", dateReceived: day, eventKey: EVENT[kind] });
    const data: RecordResponseData = { ...data0, ...(extra.resp ?? {}) };
    const p = planResponse({ query: q, agent, manuscript: c.ms }, data);
    for (const [k, v] of Object.entries(p.details)) query[k] = v;
    sub = { ...p.activityBase, createdAt, ...(mats.length ? { materials: mats } : {}), ...(note ? { replyNote: note } : {}) };
    const lg = buildLegacyActivity(p.newStatus, agent);
    feed = { id, userId: c.uid, queryId: q.id, manuscriptId: q.manuscriptId || "", activityType: ActivityType.STATUS_CHANGED, description: lg.description, date: iso,
      details: lg.details, resultingStatus: p.newStatus, ...(data.eventKey ? { eventKey: data.eventKey } : {}), logEntryId: id, ...(mats.length ? { materials: mats } : {}) };
  }
  /* v152.2 — the step's own fields ride on both stores (the nested log's allowlist names them) */
  const stepX = Object.fromEntries(Object.entries(extra.step ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  if (Object.keys(stepX).length) { sub = { ...sub, ...stepX }; feed = { ...feed, ...stepX }; }
  const plan: WritePlan = { queryId: q.id, set: [{ path: `queries/${q.id}/activity/${id}`, data: sub }, { path: `activities/${id}`, data: feed }], del: [], query };
  return withRecompute(plan, c.existing);
}

/** the derived fields over the log the plan leaves behind, folded into its query patch */
export function withRecompute(plan: WritePlan, existing: readonly RawActivityDoc[]): WritePlan {
  const prefix = `queries/${plan.queryId}/activity/`;
  const kept = existing.filter((x) => !plan.del.includes(`${prefix}${x.id}`));
  const map = new Map(kept.map((x) => [x.id, x]));
  for (const s of plan.set) if (s.path.startsWith(prefix)) { const id = s.path.slice(prefix.length); map.set(id, { id, data: s.data }); }
  /* the derived fields' keys live in the derivation's own file (the single-writer law); this only carries them */
  return { ...plan, query: { ...plan.query, ...recomputedPatch(computeRecomputedFields([...map.values()])) } };
}

/** the authoritative log, read once */
export async function readLog(uid: string, queryId: string): Promise<RawActivityDoc[]> {
  const snap = await getDocs(collection(db, "users", uid, "queries", queryId, "activity"));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

/**
 * Commit a plan: snapshot first, then ONE batch. Returns the snapshot for Undo. `after` runs once the batch has
 * landed, best-effort (anything that cannot join it); its failure never fails the save, and Undo restores it too,
 * because the snapshot was taken before either.
 */
export async function commitPlan(uid: string, plan: WritePlan, after?: () => Promise<void>, extraQueryIds: string[] = []): Promise<Snapshot> {
  const snap = await takeSnapshot(uid, [plan.queryId, ...extraQueryIds]);
  const b = writeBatch(db);
  for (const s of plan.set) b.set(doc(db, `users/${uid}/${s.path}`), s.data);
  for (const p of plan.del) b.delete(doc(db, `users/${uid}/${p}`));
  for (const u of plan.update ?? []) b.update(doc(db, `users/${uid}/${u.path}`), u.data);
  const patch = Object.fromEntries(Object.entries(plan.query).map(([k, v]) => [k, v === undefined ? deleteField() : v]));
  if (Object.keys(patch).length) b.update(doc(db, `users/${uid}/queries/${plan.queryId}`), patch);
  await b.commit();
  if (after) { try { await after(); } catch (e) { console.error("v152: a follow-up write failed (non-fatal)", e); } }
  return snap;
}

/* ── §4.2 Fix a mistake: the record corrected, nothing new on the timeline ────────────────────────────────────── */

export interface FixStep {
  /** the activity's id; a step added here ("+ Add a step I missed") has `isNew` and a fresh id */
  id: string;
  isNew?: boolean;
  /** the step's kind as the record form names it (a nudge, a send, a request, a close) */
  kind: RecordKind | "queried" | "withdrawn";
  dayMs: number;
  materials: StepMaterial[];
  /** v152.1 §2.5 a told step's count and the deadline you gave */
  told?: { count: number; deadlineMs: number } | null;
}
export interface PkgPatch {
  /** the package now on Query sent, or null for none (a one-off) */
  id: string | null;
  name: string | null;
  edition: number | null;
  /** was there one before (so clearing it records what it was based on) */
  was: { id: string; edition: number | null } | null;
}
const STATUS_OF: Record<FixStep["kind"], QueryStatus | null> = { ...RECORD_STATUS, queried: QueryStatus.QUERIED, withdrawn: QueryStatus.WITHDRAWN };

/** the feed's twin of a log entry: the same id, else the row that names it (`logEntryId`) */
const twinOf = (feed: readonly RawActivityDoc[], id: string) => feed.find((f) => f.id === id) ?? feed.find((f) => f.data.logEntryId === id) ?? null;
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

export function planFix(c: PlanCtx & { feed: RawActivityDoc[] }, draft: readonly FixStep[], removed: readonly string[], pkg: PkgPatch | null): WritePlan {
  const set: WritePlan["set"] = [], del: string[] = [];
  const query: Record<string, unknown> = {};
  const qid = c.q.id;
  for (const id of removed) {
    del.push(`queries/${qid}/activity/${id}`);
    const tw = twinOf(c.feed, id);
    if (tw) del.push(`activities/${tw.id}`);
  }
  let log = c.existing.filter((x) => !removed.includes(x.id));
  const update: NonNullable<WritePlan["update"]> = [];
  /* §2.5 a told step removed clears the marks it made; its date moved moves them (the marks are the step's, one fact) */
  const toldGone = c.existing.some((x) => removed.includes(x.id) && x.data.type === TOLD_TYPE) && !log.some((x) => x.data.type === TOLD_TYPE);
  if (toldGone) update.push(...clearTold(c.marked ?? []));
  for (const s of draft) {
    const st = STATUS_OF[s.kind];
    if (s.isNew) {
      if (s.kind === "queried" || s.kind === "withdrawn") continue;
      const p = planRecord({ ...c, existing: log }, s.kind, s.dayMs, s.materials);
      set.push(...p.set);
      for (const [k, v] of Object.entries(p.query)) if (!(k in query)) query[k] = v;
      log = [...log, ...p.set.filter((x) => x.path.startsWith(`queries/${qid}/activity/`)).map((x) => ({ id: x.path.split("/").pop()!, data: x.data }))];
      continue;
    }
    const cur = c.existing.find((x) => x.id === s.id);
    if (!cur) continue;
    const t0 = getActivityTime(cur.data.createdAt);
    const next: DocumentData = { ...cur.data };
    let changed = false;
    if (s.kind !== "nudge" && st && cur.data.resultingStatus !== st && cur.data.type !== st) { next.type = st; next.resultingStatus = st; changed = true; }
    if (!sameDay(t0, s.dayMs)) {
      const d = new Date(s.dayMs); d.setHours(12, 0, 0, 0);
      next.createdAt = typeof cur.data.createdAt === "string" ? d.toISOString() : Timestamp.fromMillis(d.getTime());
      changed = true;
    }
    const mats = storeMats(s.materials);
    if (JSON.stringify(cur.data.materials ?? []) !== JSON.stringify(mats)) { if (mats.length) next.materials = mats; else delete next.materials; changed = true; }
    if (s.kind === "told" && s.told) {
      const n = Math.max(1, Math.min(30, Math.round(s.told.count))), dl = dayIso(new Date(s.told.deadlineMs));
      if (cur.data.toldCount !== n) { next.toldCount = n; next.note = `Told ${n} other agent${n === 1 ? "" : "s"} about ${c.agent?.name || c.agent?.agency || "the agent"}’s offer`; changed = true; }
      if (cur.data.toldDeadline !== dl) { next.toldDeadline = dl; changed = true; }
      if (!sameDay(t0, s.dayMs)) for (const id of c.marked ?? []) update.push({ path: `queries/${id}`, data: { offerToldOn: dayIso(new Date(s.dayMs)) } });
    }
    if (!changed) continue;
    set.push({ path: `queries/${qid}/activity/${s.id}`, data: next });
    log = log.map((x) => (x.id === s.id ? { id: x.id, data: next } : x));
    const tw = twinOf(c.feed, s.id);
    if (tw) {
      const f: DocumentData = { ...tw.data };
      if (next.resultingStatus && f.resultingStatus !== undefined) f.resultingStatus = next.resultingStatus;
      f.date = new Date(getActivityTime(next.createdAt)).toISOString();
      if (mats.length) f.materials = mats; else delete f.materials;
      /* a told step's feed row keeps its count in its words */
      if (s.kind === "told" && typeof next.toldCount === "number") f.description = toldLine(next.toldCount, c.agent?.name || c.agent?.agency);
      set.push({ path: `activities/${tw.id}`, data: f });
    }
  }
  /* a nudge removed or moved: the query's nudge dates follow the nudges left (the reconcile the timeline delete uses) */
  const nudges = log.filter((x) => x.data.type === "Nudge sent").map((x) => getActivityTime(x.data.createdAt)).sort((a, b) => a - b);
  const lastN = nudges.length ? new Date(nudges[nudges.length - 1]).toISOString() : undefined;
  if ((c.q.lastNudgeSentDate ?? undefined) !== lastN) query.lastNudgeSentDate = lastN;
  if (pkg) {
    if (pkg.id) Object.assign(query, { sentHow: "package", sentPackageId: pkg.id, packageId: pkg.id, sentPackageEdition: pkg.edition ?? 1, sentPackageName: pkg.name ?? undefined, basedOnPackageId: undefined, basedOnPackageEdition: undefined });
    else Object.assign(query, { sentHow: "individual", sentPackageId: undefined, packageId: "", sentPackageEdition: undefined, sentPackageName: undefined,
      ...(pkg.was ? { basedOnPackageId: pkg.was.id, basedOnPackageEdition: pkg.was.edition ?? 1 } : {}) });
  }
  return withRecompute({ queryId: qid, set, del, query, ...(update.length ? { update } : {}) }, c.existing);
}

/**
 * v152.1 — WHICH OTHER QUERIES REFUSE A TOLD SAVE'S MARKS. Called only after the save's one batch was refused. A query
 * document at the rules' ceiling (about 24 stored fields: firestore.rules' `isValidQuery` checks every stored field on
 * every write, and the request runs out of expressions) refuses ANY write that adds a field, while a no-op write to it is
 * accepted — so the only honest probe is the real write. Each sibling's marks are tried on their own; the accepted ones
 * are put back exactly as they were (their documents were read first), and the refused ones were never changed.
 * Nick's ruling: the step and every accepted sibling then save in one batch, and the refused ones are named, never
 * dropped silently.
 */
export async function refusedMarks(uid: string, plan: WritePlan): Promise<string[]> {
  const marks = (plan.update ?? []).filter((u) => /^queries\/[^/]+$/.test(u.path));
  const refused: string[] = [];
  for (const u of marks) {
    const ref = doc(db, `users/${uid}/${u.path}`);
    const before = (await getDoc(ref)).data();
    try {
      await updateDoc(ref, u.data);
      if (before) await setDoc(ref, before);
    } catch (e) {
      if ((e as { code?: string })?.code === "permission-denied") refused.push(u.path.split("/")[1]);
      else throw e;
    }
  }
  return refused;
}

/** the feed's rows for one query (for twins) */
export async function readFeed(uid: string, queryId: string): Promise<RawActivityDoc[]> {
  const { query: fq, where } = await import("firebase/firestore");
  const snap = await getDocs(fq(collection(db, "users", uid, "activities"), where("queryId", "==", queryId)));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

/* ── §4.6 Edit the query's details: who it went to, how it went ──────────────────────────────────────────────── */

export function planDetails(q: Query, next: { agentId: string; sendMethod: string }): WritePlan {
  const query: Record<string, unknown> = {};
  if (next.agentId !== q.agentId) query.agentId = next.agentId;
  if (next.sendMethod !== (q.sendMethod ?? "")) query.sendMethod = next.sendMethod;
  return { queryId: q.id, set: [], del: [], query };
}

/**
 * v152.2 §6.1 — SEVERAL QUERIES' PLANS IN ONE BATCH: accepting an offer writes the offer's Signed step and closes every
 * other open query as withdrawn, all undoable together. One snapshot of every query touched, then one `writeBatch`.
 */
export async function commitMany(uid: string, plans: readonly WritePlan[], extraQueryIds: string[] = []): Promise<Snapshot> {
  const ids = [...new Set([...plans.map((p) => p.queryId), ...extraQueryIds])];
  const snap = await takeSnapshot(uid, ids);
  const b = writeBatch(db);
  for (const plan of plans) {
    for (const s of plan.set) b.set(doc(db, `users/${uid}/${s.path}`), s.data);
    for (const p of plan.del) b.delete(doc(db, `users/${uid}/${p}`));
    for (const u of plan.update ?? []) b.update(doc(db, `users/${uid}/${u.path}`), u.data);
    const patch = Object.fromEntries(Object.entries(plan.query).map(([k, v]) => [k, v === undefined ? deleteField() : v]));
    if (Object.keys(patch).length) b.update(doc(db, `users/${uid}/queries/${plan.queryId}`), patch);
  }
  await b.commit();
  return snap;
}
