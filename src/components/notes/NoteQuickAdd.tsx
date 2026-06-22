/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Quick-add — the frictionless note creator: a one-line Caveat input, three colour swatches
 * (default pink) and an optional due date tucked behind the custom date picker. Enter or the add
 * action saves via `onAdd`. The date stays optional so a plain desk note is one line + Enter.
 */
import React, { useState } from "react";
import { Plus, CalendarPlus, X } from "lucide-react";
import type { NoteColour } from "../../types";
import {
  parchment,
  insetBorder,
  burgundy,
  mutedInk,
  FONT_MONO,
  buttonPinkBg,
  buttonPinkBorder,
} from "../../lib/designTokens";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { NOTE_THEMES, NOTE_COLOURS, FONT_CAVEAT } from "./notesTheme";

export interface NoteQuickAddProps {
  onAdd: (fields: { text: string; colour: NoteColour; dueDate: string | null }) => void;
  autoFocus?: boolean;
  /** Optional dismiss affordance (shown when the quick-add lives in a popover). */
  onClose?: () => void;
}

export const NoteQuickAdd: React.FC<NoteQuickAddProps> = ({ onAdd, autoFocus, onClose }) => {
  const [text, setText] = useState("");
  const [colour, setColour] = useState<NoteColour>("pink");
  const [dueDate, setDueDate] = useState(""); // "YYYY-MM-DD" or ""
  const [showDate, setShowDate] = useState(false);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({ text: trimmed, colour, dueDate: dueDate || null });
    setText("");
    setDueDate("");
    setShowDate(false);
    setColour("pink");
  };

  return (
    <div
      style={{
        position: "relative",
        background: parchment,
        border: insetBorder,
        borderRadius: 14,
        padding: "14px 15px",
        boxShadow: "0 1px 3px rgba(58,28,20,0.06), 0 8px 26px rgba(58,28,20,0.10)",
      }}
    >
      {onClose ? (
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "none",
            border: "none",
            color: mutedInk,
            cursor: "pointer",
            lineHeight: 0,
          }}
        >
          <X size={16} />
        </button>
      ) : null}

      {/* one-line handwritten input */}
      <input
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Leave yourself a note…"
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: FONT_CAVEAT,
          fontSize: 22,
          fontWeight: 500,
          color: NOTE_THEMES[colour].ink,
          lineHeight: 1.2,
          padding: "2px 0 8px",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderTop: "1px solid #f0e6da",
          paddingTop: 11,
        }}
      >
        {/* colour swatches */}
        <div style={{ display: "flex", gap: 7 }}>
          {NOTE_COLOURS.map((c) => {
            const selected = c === colour;
            return (
              <button
                key={c}
                onClick={() => setColour(c)}
                aria-label={c}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: NOTE_THEMES[c].fill,
                  border: selected ? `2px solid ${burgundy}` : "1px solid rgba(58,28,20,0.18)",
                  boxShadow: selected ? "0 0 0 2px rgba(124,58,42,0.15)" : "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            );
          })}
        </div>

        {/* optional due date — tucked behind a toggle so the default path is one line + Enter */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {showDate ? (
            <BrandDatePicker value={dueDate} onChange={setDueDate} placeholder="Add a due date" />
          ) : (
            <button
              onClick={() => setShowDate(true)}
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
                padding: "4px 2px",
              }}
            >
              <CalendarPlus size={13} /> Add a date
            </button>
          )}
        </div>

        {/* add action */}
        <button
          onClick={submit}
          disabled={!text.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: buttonPinkBg,
            border: `0.5px solid ${buttonPinkBorder}`,
            color: burgundy,
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.05em",
            borderRadius: 10,
            padding: "9px 14px",
            cursor: text.trim() ? "pointer" : "default",
            opacity: text.trim() ? 1 : 0.5,
            flexShrink: 0,
          }}
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
};
