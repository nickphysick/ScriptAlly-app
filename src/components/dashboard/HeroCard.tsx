/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard hero — parchment MountCard with the serif greeting, rotating quote, action
 * buttons and the line-SVG paper-plane corner motif. (The date / day-of-journey caption
 * was dropped in the June 2026 refinement.)
 */
import React, { useState } from "react";
import { Send, UserPlus, BookOpen } from "lucide-react";
import { MountCard } from "../MountCard";
import {
  headingInk,
  burgundy,
  labelStyle,
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

/** Inline line-SVG paper plane in brand colours with a dashed flight path. */
const PlaneMotif: React.FC = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    aria-hidden="true"
    style={{ position: "absolute", right: 14, bottom: 6, zIndex: 1, opacity: 0.85, pointerEvents: "none" }}
  >
    <path d="M30 110 C 60 80, 110 60, 168 38" fill="none" stroke="#c9a89e" strokeWidth="1.2" strokeDasharray="3 5" />
    <g transform="translate(150,22) rotate(18)">
      <path d="M0 16 L44 0 L18 30 Z" fill="#f5e2da" stroke="#7c3a2a" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M0 16 L18 30 L16 42 L22 27" fill="#efd5ca" stroke="#7c3a2a" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M44 0 L18 30" fill="none" stroke="#7c3a2a" strokeWidth="1.4" />
    </g>
    <circle cx="52" cy="96" r="2" fill="#c9a89e" />
    <circle cx="92" cy="74" r="2" fill="#c9a89e" />
    <circle cx="130" cy="56" r="2" fill="#c9a89e" />
  </svg>
);

export interface HeroCardProps {
  firstName: string;
  quote: { text: string; author: string };
  onSendQuery: () => void;
  onAddAgent: () => void;
  onAddManuscript: () => void;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  firstName,
  quote,
  onSendQuery,
  onAddAgent,
  onAddManuscript,
}) => {
  return (
    <MountCard className="flex flex-col">
      {/* Body */}
      <div style={{ padding: "33px 31px 31px", margin: "6px 6px 6px", position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ position: "relative", zIndex: 4, maxWidth: 520 }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 38, fontWeight: 500, color: headingInk, lineHeight: 1.1 }}>
            Welcome back, <em style={{ color: burgundy, fontStyle: "italic" }}>{firstName}</em>
          </div>

          {quote.text && (
            <>
              <div
                style={{
                  fontFamily: FONT_SERIF,
                  fontStyle: "italic",
                  fontSize: 14.5,
                  color: "#6a5a50",
                  borderLeft: `2px solid ${burgundy}`,
                  paddingLeft: 14,
                  lineHeight: 1.6,
                  margin: "16px 0 6px",
                }}
              >
                {quote.text}
              </div>
              <div style={{ ...labelStyle, marginBottom: 20, paddingLeft: 16 }}>
                — {quote.author || "Unknown"}
              </div>
            </>
          )}

          <div className="flex gap-[10px] flex-wrap">
            <PinkButton onClick={onSendQuery}>
              <Send className="w-3 h-3 shrink-0" />
              Send query
            </PinkButton>
            <GhostButton onClick={onAddAgent}>
              <UserPlus className="w-3 h-3 shrink-0" />
              Add agent
            </GhostButton>
            <GhostButton onClick={onAddManuscript}>
              <BookOpen className="w-3 h-3 shrink-0" />
              Add manuscript
            </GhostButton>
          </div>
        </div>

        <PlaneMotif />
      </div>
    </MountCard>
  );
};
