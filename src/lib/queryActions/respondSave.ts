/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE RESPONSE SAVE — moved out of ResponseJourney's commit (D2) for Query Centre v149, so the journey and the query
 * card's in-card "What did they say?" (C3) run ONE write and cannot come to record a response differently.
 *
 * `recordQueryResponse` is the one response path; around it this adds only the drawer's own flat fields: the request's
 * section, the resubmit-by date, the planned nudge and close plan cleared, the offer's "tell the others" marks, and —
 * for a late reply to a query closed as no reply — the closure replaced (AFTER the reply, never before; see below).
 * The practice query is not handled here: its stand-in write stays in the journey.
 */
import { collection, deleteDoc, deleteField, doc, getDocs, query as fsQuery, where } from "firebase/firestore";
import { db as fsdb } from "../firebase";
import type { useScriptAllyDb } from "../db";
import { QueryStatus, type Agent, type EventKey, type Manuscript, type Query } from "../../types";
import { recordQueryResponse, type RecordResponseData } from "../recordResponse";
import { sendByAnswer } from "./sendBy";
import { addDays, dayIso, futureWeeks, offWeekend } from "./dates";
import type { Sample } from "./sample";

export type RespType = "partial" | "full" | "rr" | "pass" | "offer";
export const RESP_KEY: Record<RespType, EventKey> = { partial: "partial_requested", full: "full_requested", rr: "rr_requested", pass: "pass", offer: "offer" };
export const RESP_SAVED: Record<RespType, string> = { partial: "Partial requested", full: "Full requested", rr: "Revise & resubmit", pass: "Passed", offer: "Offer" };

type Db = ReturnType<typeof useScriptAllyDb>;

/** everything the write needs, already resolved to dates */
export interface RespondPlan {
  type: RespType;
  recv: Date;
  s: Sample;
  syn: boolean;
  /** null when "No date given" */
  sendBy: Date | null;
  /** the to-do date used when no send-by date was given */
  noDateTask: Date;
  remindOn: Date | null;
  fb: "form" | "personal";
  note: string;
  rrNote: string;
  offerBy: Date;
  notify: boolean;
  /** the other live queries an offer tells (the journey's own selection) */
  others: readonly Query[];
}

/** the other live queries on the same book an offer tells (the journey's own rule) */
export function offerOthers(q: Query, all: readonly Query[], isLive: (x: Query) => boolean): Query[] {
  return all.filter((x) => x.id !== q.id && x.manuscriptId === q.manuscriptId && isLive(x) && x.status !== QueryStatus.OFFER);
}

/**
 * The journey's own defaults for a response chosen and dated, and nothing else answered: the opening fifty pages, no
 * synopsis, send by in two weeks with a reminder two days before, a form pass unless a note was kept, an offer to be
 * answered in two weeks with the others told. The query card's quick form (C3) saves exactly this.
 */
export function respondDefaults(type: RespType, recv: Date, note: string, others: readonly Query[]): RespondPlan {
  const sb = sendByAnswer(recv, "2w", null, "2d");
  const offerBy = futureWeeks(recv, [["2w", "In two weeks", 14]])[0].d!;
  return {
    type, recv, s: { unit: "pages", amt: 50, from: 1, sect: false, fu: null }, syn: false,
    sendBy: sb.sendBy, noDateTask: offWeekend(addDays(recv, 3)), remindOn: sb.reminder,
    fb: type === "pass" && note.trim() ? "personal" : "form", note: type === "pass" ? note.trim() : "", rrNote: type === "rr" ? note.trim() : "",
    offerBy, notify: true, others,
  };
}

export async function saveResponse(db: Db, ctx: { q: Query; agent: Agent | null; ms: Manuscript | null }, p: RespondPlan): Promise<void> {
  const { q, agent, ms } = ctx;
  if (!db.currentUser) throw new Error("Signed out");
  const { type, recv, s, syn, sendBy, noDateTask, remindOn, fb, note, rrNote, offerBy, notify, others } = p;
  const none = !sendBy;
  const unit = s.unit === "words" ? "Words" : s.unit === "chapters" ? "Chapters" : "Pages";
  const data: RecordResponseData = {
    responseType: type === "pass" ? "rejected" : type,
    materialsType: unit, materialsQuantity: s.amt, materialsOtherText: "",
    expectedBy: type !== "pass" && type !== "offer" && sendBy ? dayIso(sendBy) : "",
    sendReminderDate: type === "partial" || type === "full" || type === "rr" ? (none ? dayIso(noDateTask) : remindOn ? dayIso(remindOn) : "") : "",
    dateReceived: dayIso(recv),
    rrNotes: rrNote,
    feedbackType: fb === "personal" ? "Yes" : "Form",
    feedbackText: fb === "personal" ? note : "",
    privateReflection: "", rejectionLesson: "", requeryPreference: "",
    offerDate: type === "offer" ? dayIso(recv) : "",
    offerDeadline: type === "offer" ? dayIso(offerBy) : "",
    offerNotes: "",
    closingReason: "Other", closingNotes: "",
    eventKey: RESP_KEY[type],
  };
  const closedNoReply = q.status === QueryStatus.NO_RESPONSE;
  await recordQueryResponse({ userId: db.currentUser.id, query: q, agent, manuscript: ms }, data);
  /* A late reply to a query closed as NO REPLY replaces that ending.
     AFTER THE REPLY, NEVER BEFORE IT, so the query never reads No Response with no closure step in between. A closure
     step may be a reconstructed one (`act-status-no-response-<qid>`). The status is unchanged by its going: the reply is
     the last rung.
     ⚠️ NOT `db.deleteActivity`: it finds its target in the FEED, and a closure written only to the query's own log has
     no feed row. Both stores are cleared here, by id and by the projection's status; the undo snapshot holds every
     document either delete touches. */
  if (closedNoReply) {
    const uid = db.currentUser.id;
    const log = await db.readQueryActivity(q.id);
    const closures = log.filter((e) => (e.data.resultingStatus ?? e.data.type) === QueryStatus.NO_RESPONSE);
    for (const c of closures) await deleteDoc(doc(fsdb, "users", uid, "queries", q.id, "activity", c.id));
    const feed = await getDocs(fsQuery(collection(fsdb, "users", uid, "activities"), where("queryId", "==", q.id)));
    for (const f of feed.docs) if (closures.some((c) => c.id === f.id) || f.data().resultingStatus === QueryStatus.NO_RESPONSE) await deleteDoc(f.ref);
  }
  const extra: Record<string, unknown> = {};
  if (q.nudgeDate) extra.nudgeDate = deleteField();
  if (q.closePlan) extra.closePlan = deleteField();
  if (type === "rr" && sendBy) extra.expectedSendDate = dayIso(sendBy);
  if (type === "partial") {
    extra.requestSynopsis = syn;
    if (s.sect) { extra.requestFrom = s.from; extra.requestFromUnit = s.fu ?? (s.unit === "pages" ? "page" : "chapter"); }
    else { if (q.requestFrom != null) extra.requestFrom = deleteField(); if (q.requestFromUnit) extra.requestFromUnit = deleteField(); }
  }
  if (Object.keys(extra).length) await db.updateQuery(q.id, extra as Partial<Query>);
  if (type === "offer" && notify) {
    for (const o of others) await db.updateQuery(o.id, { offerRefQueryId: q.id, offerTold: false } as Partial<Query>);
  }
}
