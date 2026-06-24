/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical agent display labels. With empty-and-valid agencies (a named agent whose agency you don't
 * know yet is a complete, valid record), every surface must render an agency-less agent cleanly — by
 * NAME, never a dangling "Name — " / "Name ()" / a blank line, and never the inverted "agency only"
 * (that's the no-name case). One helper so the rule lives in exactly one place.
 *
 * Identity precedence: name is the primary anchor; agency follows it. A name-less record falls back to
 * its agency (an "agency-only" agent). Only a record with neither is genuinely unidentifiable.
 */
export interface AgentLike { name?: string | null; agency?: string | null }

const nm = (a: AgentLike) => (a.name || "").trim();
const ag = (a: AgentLike) => (a.agency || "").trim();

/** Single-line label: "Name — Agency" when both present, else whichever exists, else a quiet fallback.
 *  Never leaves a dangling separator for an agency-less (but named) agent. */
export function agentLabel(a: AgentLike, fallback = "Unnamed agent"): string {
  const name = nm(a), agency = ag(a);
  if (name && agency) return `${name} — ${agency}`;
  return name || agency || fallback;
}

/** The secondary "agency" line shown beneath a name. For a named agent: the agency, or a gentle
 *  "No agency" when it's empty (never blank, never "agency only"). For a name-less agency-only agent:
 *  the agency-only kicker so the record reads honestly. */
export function agentAgencyLine(a: AgentLike, opts: { noAgency?: string; agencyOnly?: string } = {}): string {
  const name = nm(a), agency = ag(a);
  if (name) return agency || (opts.noAgency ?? "No agency");
  return agency ? (opts.agencyOnly ?? "Agency · no named agent") : "";
}

/** Whether this agent has no agency yet (and a name to stand on) — the empty-and-valid state. */
export const isAgencyLess = (a: AgentLike) => !ag(a) && !!nm(a);
