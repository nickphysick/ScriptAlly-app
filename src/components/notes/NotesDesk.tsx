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

// Empty state: two faint blank post-its hold the fan's shape behind the front one, which carries
// the "Note to self?" copy. Only the CTA sits beneath the fan.
const EMPTY_BACK: { colour: NoteColour; x: number; rot: number; z: number }[] = [
  { colour: "sage", x: -40, rot: -12, z: 1 },
  { colour: "yellow", x: 40, rot: 12, z: 2 },
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
        /* ---- empty state: the whole copy + CTA live on the topmost post-it ---- */
        <div style={{ position: "relative", paddingTop: 8 }}>
          <div style={{ position: "relative", height: 232 }}>
            {/* two faint blank post-its hold the fan's shape */}
            {EMPTY_BACK.map((ex, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 8,
                  marginLeft: -82,
                  transformOrigin: "50% 100%",
                  transform: `translateX(${ex.x}px) rotate(${ex.rot}deg)`,
                  zIndex: ex.z,
                  opacity: 0.5,
                  filter: "saturate(0.85)",
                }}
              >
                <PostIt colour={ex.colour} text="" width={164} minHeight={134} surfaced={false} />
              </div>
            ))}
            {/* front post-it carries the copy AND the CTA — the whole note is clickable */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 8,
                marginLeft: -108,
                transformOrigin: "50% 100%",
                transform: "translateX(0px) rotate(0deg)",
                zIndex: 3,
              }}
            >
              <PostIt colour="pink" width={216} minHeight={208} surfaced={false} onClick={() => setQuickAddOpen(true)}>
                {/* fontFamily set explicitly — JSX element children don't inherit the post-it's Caveat */}
                <div style={{ display: "flex", flexDirection: "column", minHeight: 178 }}>
                  <div style={{ fontFamily: FONT_CAVEAT, fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Note to self?</div>
                  <div style={{ fontFamily: FONT_CAVEAT, fontSize: 19, fontWeight: 500, lineHeight: 1.22, marginTop: 11, opacity: 0.85 }}>
                    Leave a note or create a task and it'll be pinned here, front and centre.
                  </div>
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: FONT_CAVEAT,
                      fontSize: 20,
                      fontWeight: 700,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    <Plus size={16} strokeWidth={2.5} /> Write your first note
                  </div>
                </div>
              </PostIt>
            </div>
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
