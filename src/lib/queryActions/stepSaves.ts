/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SENT AND NUDGE SAVES — moved out of SentJourney's and NudgeJourney's commits for Query Centre v149, so the
 * journeys and the query card's "+ Add a step" (C4) run one write each. Nothing here decides an answer: the caller
 * passes the dates; `sentDefaults` / `nudgeDefaults` are the journeys' own opening answers, for a step added with
 * only a type and a date.
 *
 * To-do list v51 adds THE OFFER DECISION (moved out of OfferJourney's commit, as the sent and nudge saves were): the
 * drawer's offer journey and the To-do workspace's desk record a decline or an accept through `saveOfferDecision`, and
 * "I asked for more time" through `saveOfferMoreTime`.
 */
import { deleteField, doc, setDoc } from "firebase/firestore";
import { db as fsdb } from "../firebase";
import type { useScriptAllyDb } from "../db";
import { ActivityType, QueryStatus, SubmissionMethod, type Agent, type EventKey, type Query } from "../../types";
import { buildNudgeWrites } from "../logNudge";
import { recomputeQuery } from "../recomputeQuery";
import { recordQueryResponse, type RecordResponseData } from "../recordResponse";
import { STAGE_RESPONSE_WINDOWS } from "../queryAmbient";
import { addDays, dayIso, futureWeeks, offWeekend } from "./dates";

type Db = ReturnType<typeof useScriptAllyDb>;
export type SentKind = "partial" | "full" | "rr";
const TARGET: Record<SentKind, QueryStatus> = { partial: QueryStatus.PARTIAL_SENT, full: QueryStatus.FULL_SENT, rr: QueryStatus.RESUBMITTED };
const KEY: Record<SentKind, EventKey> = { partial: "partial_sent", full: "full_sent", rr: "resubmitted" };

export interface SentPlan {
  kind: SentKind;
  sent: Date;
  /** when the reply is expected */
  exp: Date;
  /** the planned nudge, or null for "nothing" */
  nd: Date | null;
  /** the label stored as `lastSentLabel` */
  label: string;
  note?: string;
  bookVersionId?: string | null;
}

/** the sent journey's opening answers: the house reading window (STAGE_RESPONSE_WINDOWS: 12 weeks for a partial, 12 for
 *  a full — v152 moved the partial off its own 8, so the save and the page's clock read one source), then a nudge a week on */
export function sentDefaults(kind: SentKind, sent: Date): Pick<SentPlan, "exp" | "nd" | "label"> {
  const exp = addDays(sent, (kind === "partial" ? STAGE_RESPONSE_WINDOWS.partial : STAGE_RESPONSE_WINDOWS.full) * 7);
  return { exp, nd: offWeekend(addDays(exp, 7)), label: kind === "partial" ? "Partial" : kind === "full" ? "Full manuscript" : "Revised manuscript" };
}

export async function saveSent(db: Db, q: Query, p: SentPlan): Promise<void> {
  await db.recordMaterialsSent({
    queryId: q.id,
    targetStatus: TARGET[p.kind],
    sentDate: dayIso(p.sent),
    isResubmit: p.kind === "rr",
    writerExpectedDate: dayIso(p.exp),
    ...(p.nd ? { nudgeDate: dayIso(p.nd) } : {}),
    note: p.kind === "rr" ? p.note : undefined,
    ...(p.kind !== "partial" && p.bookVersionId ? { bookVersionId: p.bookVersionId } : {}),
    eventKey: KEY[p.kind],
  } as never);
  const extra: Record<string, unknown> = { lastSentLabel: p.label };
  if (q.expectedSendDate) extra.expectedSendDate = deleteField();
  if (q.sendReminderDate) extra.sendReminderDate = deleteField();
  if (!p.nd && q.nudgeDate) extra.nudgeDate = deleteField();
  await db.updateQuery(q.id, extra as Partial<Query>);
}

export interface NudgePlan { sent: Date; then: Date; said: string; via: SubmissionMethod; viaWords: string }

/** the nudge journey's opening answers: consider closing four weeks on, by the agent's own method */
export function nudgeDefaults(q: Query, agent: Agent | null, sent: Date): Pick<NudgePlan, "then" | "via"> {
  return {
    then: futureWeeks(sent, [["4w", "In four weeks", 28]])[0].d!,
    via: (agent?.submissionMethod as SubmissionMethod) || (q.sendMethod as SubmissionMethod) || SubmissionMethod.EMAIL,
  };
}

export async function saveNudgeSent(db: Db, q: Query, agent: Agent | null, p: NudgePlan): Promise<void> {
  if (!db.currentUser) throw new Error("Signed out");
  const uid = db.currentUser.id;
  const w = buildNudgeWrites(q, agent, { checkBackDate: dayIso(p.then), note: p.said, eventDate: dayIso(p.sent) } as never, new Date());
  const id = "act-" + Math.random().toString(36).slice(2, 11);
  const details = `${w.activity.details} · via ${p.viaWords}`;
  await setDoc(doc(fsdb, "users", uid, "queries", q.id, "activity", id), { ...w.nested, note: details, eventKey: "nudge_sent" });
  await setDoc(doc(fsdb, "users", uid, "activities", id), { ...w.activity, details, id, userId: uid, eventKey: "nudge_sent" });
  await db.updateQuery(q.id, { lastNudgeSentDate: w.queryUpdates.lastNudgeSentDate, closePlan: dayIso(p.then), nudgeDate: deleteField() } as unknown as Partial<Query>);
}

/* ── the offer (To-do list v51) ───────────────────────────────────────────────────────────────── */

/** a close recorded as "withdrawn": a declined offer, or another query withdrawn because an offer was accepted */
export const offerCloseData = (on: Date, token: string, key: "withdrawn_on_offer" | "offer_declined", notes = ""): RecordResponseData => ({
  responseType: "close", materialsType: "Pages", materialsQuantity: 0, materialsOtherText: "", expectedBy: "", sendReminderDate: "",
  dateReceived: dayIso(on), rrNotes: "", feedbackType: "Form", feedbackText: "", privateReflection: "", rejectionLesson: "",
  requeryPreference: "", offerDate: "", offerDeadline: "", offerNotes: "",
  closingReason: "Withdrew my submission", closingNotes: notes, eventKey: key, closeAs: "withdrawn", closingToken: token,
});

export interface OfferDecision {
  dec: "accept" | "decline";
  on: Date;
  /** accept: the other queries withdrawn */
  withdraw: readonly Query[];
  /** accept: a "Tell them you've signed" to-do on each withdrawn query */
  remindTell: boolean;
}

/** Decline closes the query as offer declined. Accept is a SIGNED rung, derived through recompute, and each chosen
 *  other query closes as "withdrawn — accepted an offer". Returns how many other queries were withdrawn. */
export async function saveOfferDecision(db: Db, q: Query, agent: Agent | null, d: OfferDecision): Promise<number> {
  if (!db.currentUser) throw new Error("Signed out");
  const uid = db.currentUser.id;
  const ms = db.manuscripts.find((m) => m.id === q.manuscriptId) || null;
  if (d.dec === "decline") {
    await recordQueryResponse({ userId: uid, query: q, agent, manuscript: ms }, offerCloseData(d.on, "offer_declined", "offer_declined"));
    return 0;
  }
  const id = "act-" + Math.random().toString(36).slice(2, 11);
  const nowIso = new Date().toISOString();
  const note = `Offer accepted — ${agent?.name || "the agent"} now represents this manuscript`;
  await setDoc(doc(fsdb, "users", uid, "queries", q.id, "activity", id), { type: QueryStatus.SIGNED, resultingStatus: QueryStatus.SIGNED, createdAt: nowIso, note, queryId: q.id, agentName: agent?.name || "The agent", eventKey: "signed" });
  await setDoc(doc(fsdb, "users", uid, "activities", id), { id, userId: uid, queryId: q.id, manuscriptId: q.manuscriptId, activityType: ActivityType.OFFER_ACCEPTED, description: note, date: nowIso, details: "", resultingStatus: QueryStatus.SIGNED, eventKey: "signed" });
  await recomputeQuery(uid, q.id);
  let n = 0;
  for (const o of d.withdraw) {
    await recordQueryResponse({ userId: uid, query: o, agent: db.agents.find((a) => a.id === o.agentId) || null, manuscript: ms }, offerCloseData(d.on, "accepted_offer", "withdrawn_on_offer"));
    const patch: Record<string, unknown> = {};
    if (d.remindTell) patch.withdrawTold = false;
    if (o.nudgeDate) patch.nudgeDate = deleteField();
    if (o.closePlan) patch.closePlan = deleteField();
    if (Object.keys(patch).length) await db.updateQuery(o.id, patch as Partial<Query>);
    n++;
  }
  const clear: Record<string, unknown> = {};
  if (q.nudgeDate) clear.nudgeDate = deleteField();
  if (q.closePlan) clear.closePlan = deleteField();
  if (Object.keys(clear).length) await db.updateQuery(q.id, clear as Partial<Query>);
  return n;
}

/** "I asked for more time": the answer-by date moves, and nothing else */
export async function saveOfferMoreTime(db: Db, q: Query, by: Date): Promise<void> {
  await db.updateQuery(q.id, { offerResponseDeadline: dayIso(by) } as Partial<Query>);
}
