/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The review shell's identity line — one component, both stages (ref:
 * design-refs/funnel/identity-line-hairline-locked.html, which is authoritative here and wins over
 * the two shell refs where they disagree).
 *
 * ⚠️ THE SEPARATOR IS ITS OWN FLEX CHILD, NEVER A BORDER OR A PSEUDO-ELEMENT ON EITHER TEXT.
 * A `border-left` on the agency, or a `::before` on it, moves WITH that text — so the moment the
 * agency truncates or the name changes length, the rule drifts off the position it is supposed to
 * hold. (The shell refs fake exactly that with a `::before` in their reconciliation block; that
 * block is a ref-only patch and is explicitly not the implementation.) As a sibling with
 * `flex: 0 0 auto` it holds its place whatever either side does.
 *
 * ⚠️ THE RULE RENDERS ONLY WHEN BOTH VALUES EXIST. A single value takes the Playfair slot at full
 * weight — no rule, no placeholder gap, nothing implying a missing field. An agency-less agent is a
 * complete, valid record in this app, so a dangling separator would be asserting an absence that
 * is not a fault.
 *
 * ⚠️ PRESENCE IS DECIDED BY `agentDisplay`, NOT BY THIS ROW. `agentPrimary` already encodes the
 * identity-anchor rule (name, else agency); duplicating that decision here is how two surfaces end
 * up disagreeing about what an agency-less record is called.
 */
import React from "react";
import { AgentLike, agentPrimary } from "../../lib/agentDisplay";

const SERIF = "'Playfair Display', serif";

/** 1px × 15px hairline, per the locked ref. */
const RULE_COLOUR = "#dbcfc0";
const MUTED = "#6f635b";
const INK = "#241711";

export const IdentityLine: React.FC<{ agent: AgentLike; className?: string }> = ({ agent, className }) => {
  const name = (agent.name || "").trim();
  const agency = (agent.agency || "").trim();

  /* The primary slot: the name when there is one, else the agency — the app's own precedence.
     With neither, there is no identity to draw (those records are set aside upstream). */
  const primary = agentPrimary(agent);
  if (!primary) return null;

  /* The rule and the secondary exist only when BOTH values do. When the agency has been promoted
     into the primary slot there is nothing left to put after it. */
  const showSecondary = !!name && !!agency;

  return (
    <span className={className} style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
      <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 16.5, lineHeight: 1.25, color: INK, flex: "0 0 auto" }}>
        {primary}
      </span>
      {showSecondary && (
        <>
          <span
            aria-hidden="true"
            style={{ width: 1, height: 15, background: RULE_COLOUR, margin: "0 11px", flex: "0 0 auto" }}
          />
          {/* Playfair ROMAN, not italic — italics would read as a quotation or an aside. Takes the
              remaining width and truncates; the name and the rule never move. */}
          <span
            style={{
              fontFamily: SERIF, fontSize: 15, color: MUTED, lineHeight: 1.25,
              minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {agency}
          </span>
        </>
      )}
    </span>
  );
};
