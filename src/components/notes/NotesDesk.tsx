/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NotesDesk — the hero's right-hand "desk". Shows the 3 most recent active notes fanned (paper
 * planes kept as a faint accent above), a "+" to create, and a muted "See all" beneath that spreads
 * every active note over a dimmed overlay. Empty state holds the fan's shape with three example
 * post-its + a first-note CTA. Manages its own quick-add / editor / overlay. Locked to the mock.
 */
import React, { useState } from "react";
import { Plus, Maximize2 } from "lucide-react";
import type { Note, NoteColour } from "../../types";
import { FONT_MONO, burgundy, mutedInk, buttonPinkBg, buttonPinkBorder } from "../../lib/designTokens";
import { FONT_CAVEAT } from "./notesTheme";
import { PostIt } from "./PostIt";
import { NoteQuickAdd } from "./NoteQuickAdd";
import { NoteEditor } from "./NoteEditor";
import { NotesSeeAllOverlay } from "./NotesSeeAllOverlay";
import { byMostRecent, activeNotes } from "./notesUtils";
import "./notes.css";

export interface NotesDeskProps {
  notes: Note[];
  onAdd: (fields: { text: string; colour: NoteColour; dueDate: string | null }) => void;
  onSave: (id: string, fields: { text: string; colour: NoteColour; dueDate: string | null }) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

interface FanItem { note: Note; x: number; rot: number; z: number; front: boolean; }

/** Most-recent note takes the straight, readable, on-top slot; the rest tuck behind it. */
function buildFan(top: Note[]): FanItem[] {
  const n = top.length;
  if (n === 0) return [];
  if (n === 1) return [{ note: top[0], x: 0, rot: 0, z: 3, front: true }];
  if (n === 2) {
    return [
      { note: top[1], x: -30, rot: -9, z: 1, front: false },
      { note: top[0], x: 30, rot: 9, z: 2, front: true },
    ];
  }
  return [
    { note: top[1], x: -40, rot: -12, z: 1, front: false },
    { note: top[2], x: 40, rot: 12, z: 2, front: false },
    { note: top[0], x: 0, rot: 0, z: 3, front: true },
  ];
}

// Empty state — a calm, desk-sized three-sticky fan. Two blank pale backs hold the shape; the pale
// front sticky is the affordance (a "+" over one handwritten line). Pale tints applied inline.
const EMPTY_PALE = {
  yellow: { fill: "#f6efcf", fold: "#ebe1b9", ink: "#5a4a28", sheen: "rgba(110,90,40,.05)" },
  sage: { fill: "#e7ece3", fold: "#d7ddd2", ink: "#41513b", sheen: "rgba(60,80,55,.05)" },
  pink: { fill: "#f8e7e0", fold: "#eed7cd", ink: "#8a6256", sheen: "rgba(120,60,40,.05)" },
};
const EMPTY_BACK: { theme: typeof EMPTY_PALE.yellow; x: number; rot: number; z: number }[] = [
  { theme: EMPTY_PALE.yellow, x: -38, rot: -12, z: 1 },
  { theme: EMPTY_PALE.sage, x: 38, rot: 12, z: 2 },
];

const fanNoteBase = (x: number, rot: number, z: number, hovered: boolean): React.CSSProperties => ({
  position: "absolute",
  left: "50%",
  bottom: 8,
  marginLeft: -75,
  transformOrigin: "50% 100%",
  transform: hovered
    ? `translateX(${x}px) translateY(-16px) rotate(0deg) scale(1.05)`
    : `translateX(${x}px) rotate(${rot}deg)`,
  zIndex: hovered ? 60 : z,
  boxShadow: hovered ? "1px 12px 26px rgba(58,28,20,0.22)" : undefined,
});

export const NotesDesk: React.FC<NotesDeskProps> = ({ notes, onAdd, onSave, onComplete, onDelete }) => {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [seeAllOpen, setSeeAllOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [emptyHover, setEmptyHover] = useState(false);

  const active = byMostRecent(activeNotes(notes));
  const fan = buildFan(active.slice(0, 3));
  const isEmpty = active.length === 0;

  const handleAdd = (fields: { text: string; colour: NoteColour; dueDate: string | null }) => {
    onAdd(fields);
    setQuickAddOpen(false);
  };

  return (
    <div style={{ position: "relative", width: 296, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {/* "+" create affordance */}
      {!isEmpty ? (
        <button
          onClick={() => setQuickAddOpen(true)}
          aria-label="New note"
          style={{
            position: "absolute",
            top: 4,
            right: 2,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: buttonPinkBg,
            border: `0.5px solid ${buttonPinkBorder}`,
            color: burgundy,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 5,
          }}
        >
          <Plus size={15} />
        </button>
      ) : null}

      {isEmpty ? (
        /* ---- empty state: a calm three-sticky fan; the pale-pink front sticky is the affordance ---- */
        <div style={{ position: "relative", height: 188 }}>
          {/* two blank pale backs hold the fan's shape */}
          {EMPTY_BACK.map((ex, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                bottom: 8,
                marginLeft: -70,
                transformOrigin: "50% 100%",
                transform: `translateX(${ex.x}px) rotate(${ex.rot}deg)`,
                zIndex: ex.z,
              }}
            >
              <PostIt colour="yellow" theme={ex.theme} text="" width={140} minHeight={110} surfaced={false} />
            </div>
          ))}
          {/* front sticky — the whole note is clickable, opening the quick-add */}
          <div
            className="sa-fan-note"
            onMouseEnter={() => setEmptyHover(true)}
            onMouseLeave={() => setEmptyHover(false)}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 8,
              marginLeft: -70,
              transformOrigin: "50% 100%",
              transform: emptyHover ? "translateX(0px) translateY(-6px) rotate(0deg) scale(1.03)" : "translateX(0px) rotate(0deg)",
              zIndex: emptyHover ? 60 : 3,
            }}
          >
            <PostIt colour="pink" theme={EMPTY_PALE.pink} width={140} minHeight={110} surfaced={false} onClick={() => setQuickAddOpen(true)}>
              {/* a "+" over one handwritten line, centred; ink set explicitly (children don't inherit) */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 80, textAlign: "center", color: EMPTY_PALE.pink.ink }}>
                <Plus size={20} strokeWidth={2.25} />
                <div style={{ fontFamily: FONT_CAVEAT, fontSize: 16, fontWeight: 600, lineHeight: 1.15 }}>jot a note or create a task</div>
              </div>
            </PostIt>
          </div>
        </div>
      ) : (
        /* ---- fan ---- */
        <>
          <div style={{ position: "relative", height: 188 }}>
            {fan.map((f) => (
              <div
                key={f.note.id}
                className="sa-fan-note"
                style={fanNoteBase(f.x, f.rot, f.z, hoveredId === f.note.id)}
                onMouseEnter={() => setHoveredId(f.note.id)}
                onMouseLeave={() => setHoveredId((id) => (id === f.note.id ? null : id))}
              >
                <PostIt
                  colour={f.note.colour}
                  text={f.note.text}
                  dueDate={f.note.dueDate}
                  surfaced={f.front}
                  onClick={() => setEditing(f.note)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setSeeAllOpen(true)}
            style={{
              width: "100%",
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              background: "none",
              border: "none",
              color: mutedInk,
              fontFamily: FONT_MONO,
              fontSize: 9,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "4px 2px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = burgundy)}
            onMouseLeave={(e) => (e.currentTarget.style.color = mutedInk)}
          >
            {active.length > 3 ? `See all · ${active.length}` : "See all"} <Maximize2 size={11} />
          </button>
        </>
      )}

      {/* quick-add modal */}
      {quickAddOpen ? (
        <div
          onClick={() => setQuickAddOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(45,32,26,0.52)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420 }}>
            <NoteQuickAdd onAdd={handleAdd} onClose={() => setQuickAddOpen(false)} autoFocus />
          </div>
        </div>
      ) : null}

      {/* see-all overlay */}
      {seeAllOpen ? (
        <NotesSeeAllOverlay
          notes={notes}
          onEdit={(note) => {
            setSeeAllOpen(false);
            setEditing(note);
          }}
          onClose={() => setSeeAllOpen(false)}
        />
      ) : null}

      {/* editor */}
      {editing ? (
        <NoteEditor note={editing} onSave={onSave} onComplete={onComplete} onDelete={onDelete} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
};
