/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Note editor — the small popover opened by clicking a note. Edit text / colour / due date (the
 * colour and date reuse the Form 11 BrandDropdown + BrandDatePicker), then Save, mark Done
 * (complete), or Delete. Rendered as a centred parchment card over a soft scrim; Esc or scrim closes.
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Trash2, X } from "lucide-react";
import type { Note, NoteColour } from "../../types";
import {
  parchment,
  insetBorder,
  burgundy,
  deepBurgundy,
  mutedInk,
  labelStyle,
  FONT_MONO,
} from "../../lib/designTokens";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { BrandDropdown } from "../forms/BrandDropdown";
import { NOTE_THEMES, NOTE_COLOURS, FONT_CAVEAT } from "./notesTheme";

export interface NoteEditorProps {
  note: Note;
  onSave: (id: string, fields: { text: string; colour: NoteColour; dueDate: string | null }) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const swatch = (c: NoteColour) => (
  <span
    style={{
      display: "inline-block",
      width: 13,
      height: 13,
      borderRadius: "50%",
      background: NOTE_THEMES[c].fill,
      border: "1px solid rgba(58,28,20,0.18)",
    }}
  />
);

const COLOUR_LABEL: Record<NoteColour, string> = { pink: "Pink", sage: "Sage", yellow: "Yellow" };

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onComplete, onDelete, onClose }) => {
  const [text, setText] = useState(note.text);
  const [colour, setColour] = useState<NoteColour>(note.colour);
  const [dueDate, setDueDate] = useState(note.dueDate ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(note.id, { text: trimmed, colour, dueDate: dueDate || null });
    onClose();
  };

  const theme = NOTE_THEMES[colour];

  // Portalled to <body> so the fixed overlay (and BrandDatePicker inside it) can't be captured by the
  // dashboard's transformed ancestor — the same containing-block trap that displaced the old popover.
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(45,32,26,0.52)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          background: parchment,
          border: insetBorder,
          borderRadius: 18,
          padding: "20px 20px 16px",
          boxShadow: "0 1px 3px rgba(58,28,20,0.08), 0 18px 50px rgba(58,28,20,0.30)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: mutedInk, cursor: "pointer", lineHeight: 0 }}
        >
          <X size={17} />
        </button>

        <div style={{ ...labelStyle, marginBottom: 12 }}>Edit note</div>

        {/* text — handwritten, on a faint tint of the chosen colour */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={280}
          autoFocus
          style={{
            width: "100%",
            resize: "vertical",
            background: theme.fill,
            color: theme.ink,
            border: "1px solid rgba(58,28,20,0.12)",
            borderRadius: 8,
            padding: "11px 12px",
            fontFamily: FONT_CAVEAT,
            fontSize: 20,
            fontWeight: 500,
            lineHeight: 1.25,
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Colour</div>
            <BrandDropdown
              value={colour}
              onChange={(v) => setColour(v as NoteColour)}
              options={NOTE_COLOURS.map((c) => ({ value: c, label: COLOUR_LABEL[c], icon: swatch(c) }))}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Due date</div>
            <BrandDatePicker value={dueDate} onChange={setDueDate} placeholder="Optional" />
          </div>
        </div>

        {/* actions: Delete (quiet, left) · Completed (dated tasks only) + Save (right) */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 18 }}>
          <button
            onClick={() => {
              onDelete(note.id);
              onClose();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: mutedInk,
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "8px 2px",
            }}
          >
            <Trash2 size={13} /> Delete
          </button>

          <div style={{ flex: 1 }} />

          {/* Only a dated task can be "Completed" — an undated reference note can't. */}
          {note.dueDate ? (
            <button
              onClick={() => {
                onComplete(note.id);
                onClose();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#fff",
                border: "0.5px solid #cdd5cb",
                color: "#5a6e58",
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                borderRadius: 9,
                padding: "9px 13px",
                cursor: "pointer",
                marginRight: 9,
              }}
            >
              <Check size={13} /> Completed
            </button>
          ) : null}

          <button
            onClick={save}
            disabled={!text.trim()}
            style={{
              background: burgundy,
              border: `0.5px solid ${deepBurgundy}`,
              color: "#fdfaf5",
              fontFamily: FONT_MONO,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              borderRadius: 9,
              padding: "9px 16px",
              cursor: text.trim() ? "pointer" : "default",
              opacity: text.trim() ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
