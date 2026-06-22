/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * See-all overlay — dims the whole dashboard and spreads every active note in a gentle arc with a
 * staggered entrance. Title "On your desk" lives ONLY here. Close on ×, scrim click or Esc; clicking
 * a note opens the editor. Layout values locked to scriptally-dashboard-notes.html.
 */
import React, { useEffect } from "react";
import { X } from "lucide-react";
import type { Note } from "../../types";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";
import { PostIt } from "./PostIt";
import { byMostRecent, activeNotes } from "./notesUtils";
import "./notes.css";

export interface NotesSeeAllOverlayProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onClose: () => void;
}

export const NotesSeeAllOverlay: React.FC<NotesSeeAllOverlayProps> = ({ notes, onEdit, onClose }) => {
  const spread = byMostRecent(activeNotes(notes));
  const n = spread.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Mock step is 212px; tighten for larger sets so the arc keeps within the viewport.
  const step = n > 5 ? Math.max(132, 1180 / n) : 212;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250 }}>
      {/* scrim */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(45,32,26,0.52)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* heading */}
      <div style={{ position: "absolute", top: 40, left: 0, right: 0, textAlign: "center", zIndex: 2, pointerEvents: "none" }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 25, fontWeight: 500, color: "#fdfaf5" }}>On your desk</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,250,245,0.6)", marginTop: 7 }}>
          {n} note{n === 1 ? "" : "s"} pinned
        </div>
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 36,
          right: 40,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(253,250,245,0.14)",
          border: "0.5px solid rgba(253,250,245,0.3)",
          color: "#fdfaf5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 3,
        }}
      >
        <X size={18} />
      </button>

      {/* spread */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "53%", height: 0, zIndex: 2 }}>
        {spread.map((note, i) => {
          const x = (i - (n - 1) / 2) * step;
          const ang = (i - (n - 1) / 2) * 7;
          return (
            <div
              key={note.id}
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: `translate(calc(-50% + ${x}px), -50%) rotate(${ang}deg)`,
              }}
            >
              <div className="sa-ovpi" style={{ animationDelay: `${i * 70}ms` }}>
                <PostIt
                  colour={note.colour}
                  text={note.text}
                  dueDate={note.dueDate}
                  width={188}
                  minHeight={152}
                  bodyFontSize={21}
                  onClick={() => onEdit(note)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", bottom: 46, left: 0, right: 0, textAlign: "center", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(253,250,245,0.55)", zIndex: 2, pointerEvents: "none" }}>
        click anywhere to close
      </div>
    </div>
  );
};
