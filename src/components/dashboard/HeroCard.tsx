/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard hero — parchment MountCard with the serif greeting, the aggregate querying
 * pipeline strip (HeroPipelineStrip, in the old author-quote slot), the action buttons, and
 * the three-planes artwork on the right. (The date / day-of-journey caption was dropped in
 * the June 2026 refinement; the single line-SVG paper plane was replaced by the artwork.)
 */
import React from "react";
import { Send, UserPlus, BookOpen, CornerUpLeft } from "lucide-react";
import { MountCard } from "../MountCard";
import { HeroPipelineStrip } from "./HeroPipelineStrip";
import { Query } from "../../types";
import "./heroRim.css";
import {
  headingInk,
  burgundy,
  FONT_SERIF,
  FONT_MONO,
  buttonPinkBg,
  buttonPinkBorder,
  buttonPinkHoverBg,
  buttonPinkHoverBorder,
  ghostButtonBg,
  ghostButtonBorder,
  ghostButtonText,
} from "../../lib/designTokens";

const btnBase: React.CSSProperties = {
  cursor: "pointer",
  fontFamily: FONT_MONO,
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: "0.07em",
  borderRadius: 10,
  padding: "10px 20px",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  transition: "all 0.2s",
};

/** Tighter padding for the hero's four-button row so they all stay on one line. */
const heroBtnCompact: React.CSSProperties = { padding: "9px 13px" };

/** Pink primary button (hero actions, task sends). */
export const PinkButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      ...btnBase,
      background: buttonPinkBg,
      color: burgundy,
      border: `0.5px solid ${buttonPinkBorder}`,
      ...style,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = buttonPinkHoverBg;
      e.currentTarget.style.borderColor = buttonPinkHoverBorder;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = (style?.background as string) || buttonPinkBg;
      e.currentTarget.style.borderColor = (style?.borderColor as string) || buttonPinkBorder;
    }}
  >
    {children}
  </button>
);

/** White ghost button. */
export const GhostButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      ...btnBase,
      background: ghostButtonBg,
      color: ghostButtonText,
      border: `0.5px solid ${ghostButtonBorder}`,
      ...style,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = buttonPinkBg;
      e.currentTarget.style.color = burgundy;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = ghostButtonBg;
      e.currentTarget.style.color = ghostButtonText;
    }}
  >
    {children}
  </button>
);

/** Three-planes hero artwork — right-hand side, vertically centred at 50% of the hero's
 *  (content-driven) height. The wrapper resolves "50%" against the auto-height card via
 *  top/bottom:25%, and the image fills that height keeping its aspect ratio. Decorative. */
const PlanesArt: React.FC = () => (
  <div
    aria-hidden="true"
    style={{ position: "absolute", top: "25%", bottom: "25%", right: 24, zIndex: 1, pointerEvents: "none" }}
  >
    <img src="/Sent_queries_final.png" alt="" style={{ height: "100%", width: "auto", display: "block", objectFit: "contain" }} />
  </div>
);

export interface HeroCardProps {
  firstName: string;
  /** Every query across all manuscripts — drives the aggregate pipeline strip + heading variant. */
  queries: Query[];
  onSendQuery: () => void;
  onRecordResponse: () => void;
  onAddAgent: () => void;
  onAddManuscript: () => void;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  firstName,
  queries,
  onSendQuery,
  onRecordResponse,
  onAddAgent,
  onAddManuscript,
}) => {
  const hasJourney = queries.length > 0;
  return (
    <MountCard className="flex flex-col">
      {/* Ambient sage rim wave (decorative; z1 — above card bg, below frame z3 and content z4) */}
      <div className="hero-rim" aria-hidden="true"><div className="hero-band" /></div>

      {/* Body */}
      <div style={{ padding: "33px 31px 31px", margin: "6px 6px 6px", position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ position: "relative", zIndex: 4, maxWidth: 780 }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 38, fontWeight: 500, color: headingInk, lineHeight: 1.1 }}>
            {hasJourney ? (
              <>Your journey so far, <em style={{ color: burgundy, fontStyle: "italic" }}>{firstName}</em>…</>
            ) : (
              <>Your journey starts here, <em style={{ color: burgundy, fontStyle: "italic" }}>{firstName}</em></>
            )}
          </div>

          {/* Aggregate querying pipeline — the animated single-row tour, in the old quote slot.
              §8 spacing: equal margins above (heading → row) and below (caption reserve →
              buttons) so the strip reads as deliberately centred between them. */}
          <div style={{ margin: "22px 0" }}>
            <HeroPipelineStrip queries={queries} />
          </div>

          {/* Two halves of the querying loop (Send query · Record a response), then a divider before the
              setup actions. Compact padding keeps all four on one line at the hero's width. */}
          <div className="flex gap-[8px] flex-wrap items-center">
            <PinkButton onClick={onSendQuery} style={heroBtnCompact}>
              <Send className="w-3 h-3 shrink-0" />
              Send query
            </PinkButton>
            <PinkButton onClick={onRecordResponse} style={heroBtnCompact}>
              <CornerUpLeft className="w-3 h-3 shrink-0" />
              Record a response
            </PinkButton>
            <span aria-hidden="true" style={{ width: 1, alignSelf: "stretch", minHeight: 22, background: "rgba(124,58,42,0.15)", margin: "0 1px" }} />
            <GhostButton onClick={onAddAgent} style={heroBtnCompact}>
              <UserPlus className="w-3 h-3 shrink-0" />
              Add agent
            </GhostButton>
            <GhostButton onClick={onAddManuscript} style={heroBtnCompact}>
              <BookOpen className="w-3 h-3 shrink-0" />
              Add manuscript
            </GhostButton>
          </div>
        </div>

        <PlanesArt />
      </div>
    </MountCard>
  );
};
