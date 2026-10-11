/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Three things the import tells the writer, each stated once so it can be tested (import fixes,
 * 10 Oct): the agency line under a query in the review, the name of the path in the activity
 * line, and the sentence shown when the manuscript could not be created.
 */
import { agentAgencyLine } from "./agentDisplay";
import { manuscriptLimitError, FREE_MANUSCRIPT_LIMIT } from "./manuscripts";
import { UserPlan } from "../types";

/**
 * The line under a query's agent in the review. A named agent with no agency reads "No agency"
 * (`agentAgencyLine`, the helper the confirm step already uses). "Agency only" is kept for the one
 * record it is true of: an agency with no agent name. It used to be the fallback for a MISSING
 * agency too, which said the opposite of the truth about a named agent.
 */
export function queryOriginLine(agent: { name: string; agency: string; agencyOnly: boolean } | undefined): string {
  if (!agent) return "From your file";
  if (agent.agencyOnly || !agent.name.trim()) return "Agency only";
  return agentAgencyLine({ name: agent.name, agency: agent.agency });
}

/** Which import wrote the rows. */
export type ImportSource = "smart" | "template";
const SOURCE_NAME: Record<ImportSource, string> = { smart: "Smart import", template: "Template import" };
/** "Template import · 3 agents added, 3 queries logged" */
export const importActivityLine = (source: ImportSource, agents: number, queries: number): string =>
  `${SOURCE_NAME[source]} · ${agents} agents added, ${queries} queries logged`;

/** Shown when the manuscript could not be created for a reason that is not the plan's limit. */
export const MANUSCRIPT_ERROR = "Couldn't set up your manuscript. Nothing's lost. Try again, or use the Import page.";
/** The build's own limit message (lib/manuscripts), as the host raises it. */
export const MANUSCRIPT_LIMIT_MESSAGE = manuscriptLimitError(UserPlan.FREE, FREE_MANUSCRIPT_LIMIT) ?? "";
/** What to show: the host's limit message when that is what stopped it, else the sentence above. */
export function manuscriptErrorLine(hostError: string | null | undefined): string {
  return hostError && MANUSCRIPT_LIMIT_MESSAGE && hostError === MANUSCRIPT_LIMIT_MESSAGE ? hostError : MANUSCRIPT_ERROR;
}
