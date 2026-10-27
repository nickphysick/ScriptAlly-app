/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.4 (design-refs/contact-list-v25-4/) — the List row's words, pure: the one-line query status and
 * the sparse-profile link.
 *
 *   Your query     "Queried" while the latest stage is Queried, else "Queried · {stage}" in the app's own stage names
 *                  (STAGE_NAME: "Partial requested", "Full sent", "Offer", "Passed")
 *   the link       an agent with no genres: "Fill in {first}'s profile →" ("Fill in this profile →" for an agency-only
 *                  record); with no reply time either, its cell spans What they want and Replies in
 */
import { QueryStatus, type Agent } from "../types";
import { STAGE_NAME } from "./qcSummary";

/** the one-line query status: the head ("Queried") and the stage after the dot, or none */
export function queryLine(status: QueryStatus): { head: "Queried"; stage: string | null } {
  return { head: "Queried", stage: status === QueryStatus.QUERIED ? null : STAGE_NAME[status] ?? null };
}
/** the words in full, as a reader hears them ("Queried · Full sent") */
export const queryLineText = (status: QueryStatus): string => {
  const l = queryLine(status);
  return l.stage ? `${l.head} · ${l.stage}` : l.head;
};

const hasGenres = (a: Pick<Agent, "genres">) => (a.genres ?? []).some((g) => String(g ?? "").trim().length > 0);
const hasReply = (a: Pick<Agent, "responseTimeWeeks">) => typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0;

/** the sparse-profile link, or null when the agent has genres: its words and whether it spans Replies in too */
export function profileLink(a: Pick<Agent, "name" | "agency" | "genres" | "responseTimeWeeks">): { words: string; span2: boolean } | null {
  if (hasGenres(a)) return null;
  const first = (a.name ?? "").trim().split(/\s+/)[0];
  return { words: first ? `Fill in ${first}’s profile →` : "Fill in this profile →", span2: !hasReply(a) };
}
