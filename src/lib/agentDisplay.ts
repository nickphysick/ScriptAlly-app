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

/**
 * The canonical missing-name string (app-wide display rule): "Unnamed agent" / "Unknown agent"
 * must never be an agent's PRIMARY field anywhere. When a record has no agent name, the AGENCY
 * becomes the primary field and the secondary line reads this string instead.
 */
export const AGENT_NOT_SPECIFIED = "Agent not specified";

/** Single-line label: "Name — Agency" when both present, else whichever exists, else a quiet fallback.
 *  Never leaves a dangling separator for an agency-less (but named) agent. */
export function agentLabel(a: AgentLike, fallback = AGENT_NOT_SPECIFIED): string {
  const name = nm(a), agency = ag(a);
  if (name && agency) return `${name} — ${agency}`;
  return name || agency || fallback;
}

/** The primary display field: the name, else the agency (the identity-anchor rule — name OR agency
 *  always exists on a valid record, so this is never empty in practice). Compact single-line
 *  surfaces show only this — they must never render "Unnamed agent". */
export const agentPrimary = (a: AgentLike): string => nm(a) || ag(a);

/** The secondary line beneath the primary: the agency for a named agent (may be "" — surfaces keep
 *  their own empty treatment, e.g. "Independent"), or the canonical "Agent not specified" once the
 *  agency has been promoted to primary. Supersedes agentAgencyLine for new call sites. */
export const agentSecondary = (a: AgentLike): string => (nm(a) ? ag(a) : AGENT_NOT_SPECIFIED);

/** Avatar initials from the PRIMARY field (the agency's initials when unnamed — never a bare "?"
 *  for any valid record; "?" survives only for the rules-impossible anchor-less one). */
export function agentInitials(a: AgentLike): string {
  const parts = agentPrimary(a).split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

/** The secondary "agency" line shown beneath a name — the parameterised base agentSecondary sits on.
 *  For a named agent: the agency, or a gentle "No agency" when it's empty (never blank, never
 *  "agency only"). For a name-less agency-only agent: the canonical missing-name kicker. */
export function agentAgencyLine(a: AgentLike, opts: { noAgency?: string; agencyOnly?: string } = {}): string {
  const name = nm(a), agency = ag(a);
  if (name) return agency || (opts.noAgency ?? "No agency");
  return agency ? (opts.agencyOnly ?? AGENT_NOT_SPECIFIED) : "";
}

/** Whether this agent has no agency yet (and a name to stand on) — the empty-and-valid state. */
export const isAgencyLess = (a: AgentLike) => !ag(a) && !!nm(a);
