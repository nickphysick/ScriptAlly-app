/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeskNote — a desk sticky in the four-corner layout: due (top-left, tasks only), dismiss × (top-
 * right), complete tick (bottom-left, tasks only), created stamp (bottom-right). Dismiss and complete
 * each open an on-sticky confirm (rendered in the note's own colour, no separate dialog). No fold-curl
 * — the created stamp owns that corner. Critical colours are inline (known Tailwind footgun).
 */
import React, { useState } from "react";
import { X, Check, Calendar } from "lucide-react";
import type { Note } from "../../types";
import { FONT_MONO, FONT_SERIF, FONT_SANS } from "../../lib/designTokens";
import { NOTE_THEMES, NOTE_DEEP_SHADE, FONT_CAVEAT } from "./notesTheme";
import { dueStage, dueChipLabel, formatCreatedStamp } from "./notesUtils";

export interface DeskNoteProps {
  note: Note;
  width?: number;
  minHeight?: number;
  clampLines?: number;
  onOpen: () => void; // click the body → editor
  onComplete: (id: string) => void; // confirmed complete (existing path)
  onDelete: (note: Note) => void; // confirmed delete (existing path)
}

type Confirm = "none" | "delete" | "complete";

export const DeskNote: React.FC<DeskNoteProps> = ({ note, width = 168, minHeight = 130, clampLines = 4, onOpen, onComplete, onDelete }) => {
  const theme = NOTE_THEMES[note.colour];
  const deep = NOTE_DEEP_SHADE[note.colour];
  const [confirm, setConfirm] = useState<Confirm>("none");
  const [dismissHover, setDismissHover] = useState(false);
  const isTask = !!note.dueDate;
  const overdue = dueStage(note.dueDate) === "over";

  const sticky: React.CSSProperties = {
    position: "relative",
    width,
    minHeight,
    background: theme.fill,
    color: theme.ink,
    padding: "10px 12px 9px",
    borderRadius: 1,
    boxShadow: "1px 5px 13px rgba(58,28,20,0.16), 0 1px 2px rgba(58,28,20,0.1)",
    display: "flex",
    flexDirection: "column",
  };

  // ---- confirm (on the sticky, its own colour) ----
  if (confirm !== "none") {
    const isDelete = confirm === "delete";
    const title = isDelete ? "Delete this note?" : "Mark complete?";
    const sub = isDelete
      ? isTask
        ? "This also removes the linked task from your to-do list."
        : ""
      : "This removes the task from your to-do list.";
    return (
      <div style={{ ...sticky, justifyContent: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 16, background: `linear-gradient(180deg, ${theme.sheen}, transparent)`, pointerEvents: "none" }} />
        <div style={{ fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 14.5, lineHeight: 1.15, color: theme.ink }}>{title}</div>
        {sub ? <div style={{ fontFamily: FONT_SANS, fontSize: 10.5, fontWeight: 300, lineHeight: 1.4, marginTop: 5, color: theme.ink, opacity: 0.78 }}>{sub}</div> : null}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setConfirm("none")}
            style={{ fontFamily: FONT_MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: theme.ink, background: "rgba(255,255,255,0.45)", border: "0.5px solid rgba(58,28,20,0.18)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { isDelete ? onDelete(note) : onComplete(note.id); setConfirm("none"); }}
            style={{ fontFamily: FONT_MONO, fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: deep.ink, background: deep.bg, border: "none", borderRadius: 8, padding: "6px 13px", cursor: "pointer" }}
          >
            {isDelete ? "Delete" : "Complete"}
          </button>
        </div>
      </div>
    );
  }

  // ---- four-corner note ----
  return (
    <div style={sticky}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 16, background: `linear-gradient(180deg, ${theme.sheen}, transparent)`, pointerEvents: "none" }} />

      {/* top row: due (TL) · dismiss × (TR) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, minHeight: 13 }}>
        {isTask ? (
          <span style={{ fontFamily: FONT_MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4, color: overdue ? "#9a3f2c" : theme.ink, opacity: overdue ? 0.95 : 0.6 }}>
            <Calendar size={8} strokeWidth={2} /> {dueChipLabel(note.dueDate)}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={() => setConfirm("delete")}
          onMouseEnter={() => setDismissHover(true)}
          onMouseLeave={() => setDismissHover(false)}
          aria-label="Dismiss note"
          style={{ background: "none", border: "none", padding: 0, lineHeight: 0, cursor: "pointer", color: theme.ink, opacity: dismissHover ? 0.85 : 0.34, transition: "opacity 0.12s ease", marginRight: -2, marginTop: -1 }}
        >
          <X size={13} strokeWidth={2.2} />
        </button>
      </div>

      {/* body */}
      <div
        onClick={onOpen}
        style={{
          flex: 1,
          cursor: "pointer",
          margin: "6px 0",
          fontFamily: FONT_CAVEAT,
          fontSize: 17.5,
          fontWeight: 500,
          lineHeight: 1.2,
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: clampLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {note.text}
      </div>

      {/* bottom row: complete tick (BL, tasks only) · created (BR) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8, minHeight: 16 }}>
        {isTask ? (
          <button
            onClick={() => setConfirm("complete")}
            aria-label="Complete task"
            style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${theme.ink}`, background: "rgba(255,255,255,0.4)", opacity: 0.65, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <Check size={10} strokeWidth={2.5} color={theme.ink} />
          </button>
        ) : (
          <span />
        )}
        <span style={{ fontFamily: FONT_MONO, fontSize: 7, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.42, color: theme.ink, whiteSpace: "nowrap" }}>
          Created {formatCreatedStamp(note.createdAt)}
        </span>
      </div>
    </div>
  );
};
