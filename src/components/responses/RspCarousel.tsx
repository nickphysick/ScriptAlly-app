/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses — the request words other surfaces share: the steps' words (`STEP_WORD`) and a request's own action
 * (`cardAct`), read by the answer panel (RspPanel), In their words and the phone's Responses screen.
 *
 * ⚠️ Responses v15 retired this file's carousel and its card (`ReqCard`): "Agents who want to read on" is RspReadOn.tsx,
 *    on the Query Centre's own grid card. The file keeps its name so the phone's import is untouched.
 */
import { QueryStatus } from "../../types";
import type { RespItem } from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import type { DrawerMode } from "../../lib/queryActions/drawerStore";

type Item = RespItem<QcRow>;

/** the steps' words (the reference's `WORD`) */
export const STEP_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial requested",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full requested",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "Revise & resubmit",
  [QueryStatus.RESUBMITTED]: "Resubmitted",
  [QueryStatus.OFFER]: "Offer",
  [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "No reply",
};

/**
 * The card's own action and the journey it runs. ⚠️ A revise and resubmit runs `sent`: the Query Centre's own door for
 * an owed revision (`cardDoors`), which records the resubmission. An offer runs `offer`; everything else `resp`.
 */
export function cardAct(i: Item): { label: string; mode: DrawerMode; navy: boolean } {
  if (i.state === "toSend") return { label: `Mark ${i.answer === "full" ? "full" : "partial"} sent`, mode: "sent", navy: true };
  if (i.state === "offer") return { label: "Answer the offer", mode: "offer", navy: true };
  if (i.state === "rr") return { label: "Record the resubmission", mode: "sent", navy: true };
  return { label: "Record a response", mode: "resp", navy: false };
}
