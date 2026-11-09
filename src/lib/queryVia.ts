/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add agent v1 — THE WAY A QUERY WAS SENT is one of four (the query rules' `sendMethod` enum: Email, Online Form,
 * Query Manager, Post), so an agent's "Other" method seeds no query: a log flow seeded from it would write a value the
 * rules deny. A legacy spelling reads as its enum value; anything else is null and the flow keeps its own default.
 * Its own module, importing only the types, so a lib can read it without pulling in the editor's draft.
 */
import { SubmissionMethod } from "../types";

export function queryViaOf(m: string | undefined | null): SubmissionMethod | null {
  const v = (m ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (v === "email") return SubmissionMethod.EMAIL;
  if (v === "querymanager") return SubmissionMethod.QUERY_MANAGER;
  if (v === "onlineform" || v === "agencyform") return SubmissionMethod.ONLINE_FORM;
  if (v === "post") return SubmissionMethod.POST;
  return null;
}
