/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard hero — parchment MountCard with the serif greeting, rotating quote, action
 * buttons and the three-planes artwork on the right (50% of the card height). (The date /
 * day-of-journey caption was dropped in the June 2026 refinement.)
 */
import React from "react";
import { Send, UserPlus, BookOpen, CornerUpLeft } from "lucide-react";
import { MountCard } from "../MountCard";
import { NotesDesk } from "../notes/NotesDesk";
import type { Note, NoteColour } from "../../types";
import "./heroRim.css";
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

export interface HeroCardProps {
  firstName: string;
  quote: { text: string; author: string };
  onSendQuery: () => void;
  onRecordResponse: () => void;
  onAddAgent: () => void;
  onAddManuscript: () => void;
  /** User notes for the desk fan (the paper-plane motif is kept as a faint accent above it). */
  notes: Note[];
  onAddNote: (fields: { text: string; colour: NoteColour; dueDate: string | null }) => void;
  onSaveNote: (id: string, fields: { text: string; colour: NoteColour; dueDate: string | null }) => void;
  onCompleteNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  firstName,
  quote,
  onSendQuery,
  onRecordResponse,
  onAddAgent,
  onAddManuscript,
  notes,
  onAddNote,
  onSaveNote,
  onCompleteNote,
  onDeleteNote,
}) => {
  return (
    <MountCard className="flex flex-col">
      {/* Ambient sage rim wave (decorative; z1 — above card bg, below frame z3 and content z4) */}
      <div className="hero-rim" aria-hidden="true"><div className="hero-band" /></div>

      {/* Body — left content + the notes desk on the right */}
      <div style={{ padding: "33px 31px 31px", margin: "6px 6px 6px", position: "relative", flex: 1, display: "flex", gap: 20, alignItems: "stretch" }}>
        <div style={{ position: "relative", zIndex: 4, flex: 1, minWidth: 0, maxWidth: 620, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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

        {/* Right: the notes desk (fan of 3 most recent active notes, planes a faint accent above) */}
        <div style={{ position: "relative", zIndex: 4, display: "flex", alignItems: "center" }}>
          <NotesDesk
            notes={notes}
            onAdd={onAddNote}
            onSave={onSaveNote}
            onComplete={onCompleteNote}
            onDelete={onDeleteNote}
          />
        </div>
      </div>
    </MountCard>
  );
};
