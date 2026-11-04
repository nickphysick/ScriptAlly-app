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
import { collection, deleteField, doc, getDocs, Timestamp, writeBatch, type DocumentData } from "firebase/firestore";
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

export type RecordKind = "partial_req" | "full_req" | "offer" | "pass" | "partial_sent" | "full_sent" | "nudge" | "noresp";
export const RECORD_STATUS: Record<RecordKind, QueryStatus | null> = {
  partial_req: QueryStatus.PARTIAL_REQUESTED, full_req: QueryStatus.FULL_REQUESTED, offer: QueryStatus.OFFER, pass: QueryStatus.REJECTED,
  partial_sent: QueryStatus.PARTIAL_SENT, full_sent: QueryStatus.FULL_SENT, nudge: null, noresp: QueryStatus.NO_RESPONSE,
};
const EVENT: Record<RecordKind, EventKey> = {
  partial_req: "partial_requested", full_req: "full_requested", offer: "offer", pass: "pass",
  partial_sent: "partial_sent", full_sent: "full_sent", nudge: "nudge_sent", noresp: "closed_no_reply",
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
}
export interface WritePlan {
  queryId: string;
  /** documents to set, by path below users/{uid} */
  set: { path: string; data: DocumentData }[];
  del: string[];
  /** the query's fields; undefined clears one */
  query: Record<string, unknown>;
}

const respData = (over: Partial<RecordResponseData>): RecordResponseData => ({
  responseType: "partial", materialsType: "Pages", materialsQuantity: 0, materialsOtherText: "", expectedBy: "", sendReminderDate: "",
  dateReceived: "", rrNotes: "", feedbackType: "Form", feedbackText: "", privateReflection: "", rejectionLesson: "", requeryPreference: "",
  offerDate: "", offerDeadline: "", offerNotes: "", closingReason: "Other", closingNotes: "", ...over,
});
const UNIT_NAME: Record<SampleUnit, RecordResponseData["materialsType"]> = { pages: "Pages", chapters: "Chapters", words: "Words" };

/** a new step, planned (§3): the activity in both stores and the query's fields after it */
export function planRecord(c: PlanCtx, kind: RecordKind, dayMs: number, materials: readonly StepMaterial[]): WritePlan {
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

  if (kind === "nudge") {
    const check = new Date(tMs + c.quietWeeks * 7 * DAY).toISOString();
    const w = buildNudgeWrites(q, agent, { eventDate: iso, checkBackDate: check }, new Date(c.nowMs));
    sub = { ...w.nested, ...base, createdAt: w.nested.createdAt, ...(mats.length ? { materials: mats } : {}), eventKey: EVENT.nudge };
    feed = { ...w.activity, id, userId: c.uid, eventKey: EVENT.nudge };
    Object.assign(query, w.queryUpdates);
  } else if (kind === "partial_sent" || kind === "full_sent") {
    const st = RECORD_STATUS[kind]!;
    const desc = st === QueryStatus.PARTIAL_SENT ? `Partial manuscript sent to ${name} at ${agency}` : `Full manuscript sent to ${name} at ${agency}`;
    const ver = materials.find((m) => (m.kind === "sample" || m.kind === "full") && m.versionId)?.versionId ?? null;
    sub = { type: st, resultingStatus: st, createdAt, note: desc, ...base, eventKey: EVENT[kind], ...(mats.length ? { materials: mats } : {}) };
    feed = { id, userId: c.uid, queryId: q.id, manuscriptId: q.manuscriptId || "", activityType: ActivityType.MATERIALS_SENT, description: desc, date: iso,
      details: "", resultingStatus: st, eventKey: EVENT[kind], ...(mats.length ? { materials: mats } : {}), ...(ver ? { bookVersionId: ver } : {}) };
    query.lastSentLabel = kind === "partial_sent" ? "Partial" : "Full manuscript";
    if (q.expectedSendDate) query.expectedSendDate = undefined;
    if (q.sendReminderDate) query.sendReminderDate = undefined;
    if (kind === "full_sent" && ver) query.bookVersionId = ver;
  } else {
    const day = dayIso(new Date(tMs));
    const sample = materials.find((m) => m.kind === "sample");
    const data: RecordResponseData = kind === "noresp" ? closeRecord(noreplyAnswers(new Date(tMs)))
      : kind === "partial_req" ? respData({ responseType: "partial", dateReceived: day, materialsType: sample?.unit ? UNIT_NAME[sample.unit] : "Pages", materialsQuantity: sample?.n ?? 0, eventKey: EVENT[kind] })
      : kind === "full_req" ? respData({ responseType: "full", dateReceived: day, eventKey: EVENT[kind] })
      : kind === "offer" ? respData({ responseType: "offer", dateReceived: day, offerDate: day, eventKey: EVENT[kind] })
      : respData({ responseType: "rejected", dateReceived: day, eventKey: EVENT[kind] });
    const p = planResponse({ query: q, agent, manuscript: c.ms }, data);
    for (const [k, v] of Object.entries(p.details)) query[k] = v;
    sub = { ...p.activityBase, createdAt, ...(mats.length ? { materials: mats } : {}) };
    const lg = buildLegacyActivity(p.newStatus, agent);
    feed = { id, userId: c.uid, queryId: q.id, manuscriptId: q.manuscriptId || "", activityType: ActivityType.STATUS_CHANGED, description: lg.description, date: iso,
      details: lg.details, resultingStatus: p.newStatus, ...(data.eventKey ? { eventKey: data.eventKey } : {}), logEntryId: id, ...(mats.length ? { materials: mats } : {}) };
  }
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
  const patch = Object.fromEntries(Object.entries(plan.query).map(([k, v]) => [k, v === undefined ? deleteField() : v]));
  if (Object.keys(patch).length) b.update(doc(db, `users/${uid}/queries/${plan.queryId}`), patch);
  await b.commit();
  if (after) { try { await after(); } catch (e) { console.error("v152: a follow-up write failed (non-fatal)", e); } }
  return snap;
}
