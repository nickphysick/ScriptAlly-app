/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * D5 · the close journey's SAVE, as a function (To-do v5.2 §G.3). `CloseJourney`'s commit calls it with the answers
 * the reader gave; the tray's bulk close calls it with the answers the journey OPENS with for a "No reply" close
 * (`noreplyAnswers`), once per query. One save, so a bulk close writes exactly what three single closes would.
 *
 * It writes through `recordQueryResponse` (the one path: the closure is a rung in the log and the status derives from
 * it), then takes off a planned nudge and a "Consider closing" plan, and records what the close leaves to do.
 */
import { deleteField } from "firebase/firestore";
import type { Agent, Manuscript, Query } from "../../types";
import { recordQueryResponse } from "../recordResponse";
import { addDays, dayIso } from "./dates";
import { closeRecord, type CloseAnswers } from "./closeRecord";

export { closeRecord, noreplyAnswers, type CloseAnswers, type CloseWhy } from "./closeRecord";

export interface CloseDb {
  currentUser: { id: string } | null | undefined;
  manuscripts: readonly Manuscript[];
  updateQuery: (id: string, data: Partial<Query>) => Promise<unknown>;
}

/** the save: the close through the one path, then what it takes off and leaves behind */
export async function saveClose(db: CloseDb, q: Query, agent: Agent | null, a: CloseAnswers, today: Date): Promise<void> {
  if (!db.currentUser) throw new Error("Not signed in");
  const ms = db.manuscripts.find((m) => m.id === q.manuscriptId) || null;
  await recordQueryResponse({ userId: db.currentUser.id, query: q, agent, manuscript: ms }, closeRecord(a));
  const recheckOn = a.recheck === "no" ? null : addDays(today, a.recheck === "3m" ? 91 : 182);
  const extra: Record<string, unknown> = {};
  if (q.nudgeDate) extra.nudgeDate = deleteField();
  if (q.closePlan) extra.closePlan = deleteField();
  if (a.why === "withdraw" && !a.told && a.remindTell) extra.withdrawTold = false;
  if (a.why === "gone" && recheckOn) extra.agentRecheckOn = dayIso(recheckOn);
  if (Object.keys(extra).length) await db.updateQuery(q.id, extra as Partial<Query>);
}
