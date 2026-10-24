/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SENT AND NUDGE SAVES — moved out of SentJourney's and NudgeJourney's commits for Query Centre v149, so the
 * journeys and the query card's "+ Add a step" (C4) run one write each. Nothing here decides an answer: the caller
 * passes the dates; `sentDefaults` / `nudgeDefaults` are the journeys' own opening answers, for a step added with
 * only a type and a date.
 */
import { deleteField, doc, setDoc } from "firebase/firestore";
import { db as fsdb } from "../firebase";
import type { useScriptAllyDb } from "../db";
import { QueryStatus, SubmissionMethod, type Agent, type EventKey, type Query } from "../../types";
import { buildNudgeWrites } from "../logNudge";
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

/** the sent journey's opening answers: the usual reading window (8 weeks for a partial, 12 for a full), then a nudge a week on */
export function sentDefaults(kind: SentKind, sent: Date): Pick<SentPlan, "exp" | "nd" | "label"> {
  const exp = addDays(sent, (kind === "partial" ? 8 : 12) * 7);
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
