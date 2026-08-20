/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PlanComparison — the two plan columns, side by side, rendered from `lib/planComparison`.
 *
 * ⚠️ ONE COMPONENT, TWO SURFACES. The settings card and the plans page render this same element,
 * so a change to what Pro includes lands on both or on neither. Before this, `PlansPage` held the
 * only table and settings had nothing; building settings its own would have been the second copy
 * that eventually disagrees.
 *
 * ⚠️ THE COLUMNS KEEP AN IDENTICAL SHAPE. Same labels, same order, same row heights, and a CTA
 * slot on both — one holding a button, the other holding the words "Your plan". The eye reads
 * button-versus-no-button, which is the whole comparison; a column that simply omitted its CTA
 * would make the rows stop lining up and turn a comparison into two lists.
 *
 * ⚠️ NO PERSUASION AND NO USAGE. No badge, no "most popular", no strikethrough, no meter, no
 * count against a limit. The card answers "what do I get" — position against a limit is not what
 * anyone opens this page for, and a plan table that argues is a plan table nobody trusts.
 */
import React from "react";
import { Check } from "lucide-react";
import {
  PLAN_ROWS, PlanCell, PLAN_CTA_LABEL, CURRENT_PLAN_CHIP, CURRENT_PLAN_CTA,
} from "../../lib/planComparison";
import { PRICING_TIERS } from "../../marketing/landingCopy";
import { FONT_SERIF, FONT_SANS, FONT_MONO, bodyInk, mutedInk, sageAccent, burgundy } from "../../lib/designTokens";
import "./planComparison.css";

/** The one place a cell becomes pixels. A figure is mono; a mark is sage tick or muted dash. */
const Cell: React.FC<{ cell: PlanCell }> = ({ cell }) => {
  if (cell.kind === "figure") {
    return <span className="plc-figure">{cell.text}</span>;
  }
  if (cell.kind === "included") {
    return (
      <span className="plc-mark plc-mark--yes">
        <Check aria-hidden="true" />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  /* ⚠️ AN EM DASH, NOT AN EMPTY CELL. A blank says "we forgot"; a dash says "not on this plan",
     which is the fact. Screen readers get the word rather than the punctuation. */
  return (
    <span className="plc-mark plc-mark--no" aria-hidden="true">
      —<span className="sr-only">Not included</span>
    </span>
  );
};

const Column: React.FC<{
  tierKey: "free" | "pro";
  current: boolean;
  onSeePlans?: () => void;
}> = ({ tierKey, current, onSeePlans }) => {
  /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
  const tier = PRICING_TIERS.find((t) => t.key === tierKey)!;
  return (
    <div className={`plc-col${current ? " plc-col--current" : ""}`}>
      <div className="plc-head">
        <span className="plc-name" style={{ fontFamily: FONT_SERIF, color: bodyInk }}>{tier.name}</span>
        {current && <span className="plc-chip" style={{ fontFamily: FONT_MONO }}>{CURRENT_PLAN_CHIP}</span>}
      </div>

      {/* ⚠️ THE PRICE IS THE LOCKED MARKETING COPY'S, WORD FOR WORD. Today that is "Price to be
          confirmed", with its own note saying there is no payment path — and the card must never
          be the one surface in the app quoting a figure nobody can pay. */}
      <p className="plc-price" style={{ fontFamily: FONT_SERIF, color: bodyInk }}>{tier.price}</p>
      {/* ⚠️ THE NOTE'S LINE IS RESERVED IN BOTH COLUMNS, EVEN WHEN EMPTY — the same rule as the CTA
          slot below, and the one I missed first time. Only Pro carries a note today ("no payment
          path yet"), and rendering it conditionally pushed the Pro column's rows 16.75px down:
          browser-measured, every row offset by exactly the note's height, so the two feature lists
          could not be read across. The heights of the rows themselves were already identical — it
          was one optional line above them that sheared the lot. */}
      <p className="plc-pricenote" style={{ fontFamily: FONT_MONO }}>{tier.priceNote ?? "\u00a0"}</p>

      <ul className="plc-rows">
        {PLAN_ROWS.map((r) => (
          <li key={r.label} className="plc-row">
            <span className="plc-rowhead">
              <span className="plc-label" style={{ fontFamily: FONT_SANS, color: bodyInk }}>{r.label}</span>
              {r.sub && <span className="plc-sub" style={{ fontFamily: FONT_SANS, color: mutedInk }}>{r.sub}</span>}
            </span>
            <Cell cell={tierKey === "free" ? r.free : r.pro} />
          </li>
        ))}
      </ul>

      {/* The CTA slot exists in BOTH columns — see the header note.
          ⚠️ THREE FILLINGS, ONE SLOT. Your own plan states "Your plan"; the other plan offers a way
          to read about it; and on the plans page ITSELF — where a "See Pro plans" button would
          point at the page you are standing on — the slot falls back to the LOCKED marketing
          copy's own word for that tier, which today is "Coming soon". Every path keeps the slot
          occupied, because an empty one shears the two columns' rows apart. */}
      <div className="plc-cta">
        {current ? (
          <span className="plc-yours" style={{ fontFamily: FONT_MONO, color: sageAccent }}>{CURRENT_PLAN_CTA}</span>
        ) : onSeePlans ? (
          <button type="button" className="plc-btn" onClick={onSeePlans} style={{ fontFamily: FONT_SERIF, color: burgundy }}>
            {PLAN_CTA_LABEL}
          </button>
        ) : (
          <span className="plc-yours" style={{ fontFamily: FONT_MONO, color: mutedInk }}>{tier.action}</span>
        )}
      </div>
    </div>
  );
};

export const PlanComparison: React.FC<{
  /** The plan the reader is on — the column that wears the sage edge and the chip. */
  currentPlan: "free" | "pro";
  /** Opens the plans page. OMIT on the plans page itself, where the CTA would point at itself —
   *  the slot then states the tier's own locked action word instead. */
  onSeePlans?: () => void;
}> = ({ currentPlan, onSeePlans }) => (
  <div className="plc-grid">
    <Column tierKey="free" current={currentPlan === "free"} onSeePlans={onSeePlans} />
    <Column tierKey="pro" current={currentPlan === "pro"} onSeePlans={onSeePlans} />
  </div>
);
