/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NotesDesk — the hero's right-hand "desk". Compose happens IN PLACE (no floating popover, which
 * escaped onto other cards under the dashboard's transformed ancestor): a resting colour picker →
 * grab a colour → write on that sticky → optionally anchor a date. Populated desks show the
 * recent-three fan + a "+" that returns to the picker. Vertically centred in the hero's column.
 */
import React, { useState } from "react";
import { Plus, X, Calendar, Maximize2 } from "lucide-react";
import type { Note, NoteColour } from "../../types";
import { FONT_MONO, burgundy, mutedInk, buttonPinkBg, buttonPinkBorder } from "../../lib/designTokens";
import { FONT_CAVEAT, NOTE_THEMES } from "./notesTheme";
import { PostIt } from "./PostIt";
import { NoteEditor } from "./NoteEditor";
import { NotesSeeAllOverlay } from "./NotesSeeAllOverlay";
import { NoteComposeCalendar } from "./NoteComposeCalendar";
import { byMostRecent, activeNotes, formatDueLabel } from "./notesUtils";
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

/* The colour picker fan — grab a colour to compose with it. Back two spread on hover to be hittable. */
const PICKER: { colour: NoteColour; x: number; spreadX: number; rot: number; z: number; front?: boolean }[] = [
  { colour: "yellow", x: -38, spreadX: -64, rot: -12, z: 1 },
  { colour: "sage", x: 38, spreadX: 64, rot: 12, z: 2 },
  { colour: "pink", x: 0, spreadX: 0, rot: 0, z: 3, front: true },
];

const STAGE_HEIGHT = 196;

export const NotesDesk: React.FC<NotesDeskProps> = ({ notes, onAdd, onSave, onComplete, onDelete }) => {
  const [seeAllOpen, setSeeAllOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Compose-in-place state
  const [pickerOpen, setPickerOpen] = useState(false); // populated desk: "+" opened the picker
  const [composeColour, setComposeColour] = useState<NoteColour | null>(null);
  const [composeText, setComposeText] = useState("");
  const [composeDue, setComposeDue] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [pickerHover, setPickerHover] = useState(false);
  const [hoverColour, setHoverColour] = useState<NoteColour | null>(null);

  const active = byMostRecent(activeNotes(notes));
  const fan = buildFan(active.slice(0, 3));
  const isEmpty = active.length === 0;

  const composing = composeColour !== null;
  const showPicker = !composing && (isEmpty || pickerOpen);
  const showFan = !composing && !showPicker;

  const grabColour = (c: NoteColour) => {
    setComposeColour(c);
    setComposeText("");
    setComposeDue(null);
    setDateOpen(false);
    setPickerOpen(false);
  };
  const resetCompose = () => {
    setComposeColour(null);
    setComposeText("");
    setComposeDue(null);
    setDateOpen(false);
    setPickerOpen(false);
  };
  const saveCompose = () => {
    const trimmed = composeText.trim();
    if (!trimmed || !composeColour) return;
    onAdd({ text: trimmed, colour: composeColour, dueDate: composeDue });
    resetCompose();
  };

  const composeTheme = composeColour ? NOTE_THEMES[composeColour] : NOTE_THEMES.pink;

  return (
    <div style={{ position: "relative", width: 296, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* "+" — only on the populated fan; opens the colour picker */}
      {showFan ? (
        <button
          onClick={() => setPickerOpen(true)}
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

      {/* ---- COMPOSE: write on the grabbed sticky ---- */}
      {composing ? (
        <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: STAGE_HEIGHT }}>
          <div
            style={{
              position: "relative",
              width: 248,
              background: composeTheme.fill,
              color: composeTheme.ink,
              padding: "13px 14px 12px",
              borderRadius: 1,
              boxShadow: "1px 8px 20px rgba(58,28,20,0.18), 0 1px 2px rgba(58,28,20,0.1)",
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 18, background: `linear-gradient(180deg, ${composeTheme.sheen}, transparent)`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 0, bottom: 0, width: 20, height: 20, background: composeTheme.fold, clipPath: "polygon(100% 0,100% 100%,0 100%)", boxShadow: "-2px -2px 4px rgba(58,28,20,0.13)" }} />

            <textarea
              autoFocus
              value={composeText}
              maxLength={280}
              onChange={(e) => setComposeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveCompose(); }
                if (e.key === "Escape") resetCompose();
              }}
              placeholder="Leave yourself a note…"
              style={{
                width: "100%",
                minHeight: 78,
                resize: "none",
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: FONT_CAVEAT,
                fontSize: 19,
                fontWeight: 500,
                lineHeight: 1.25,
                color: composeTheme.ink,
              }}
            />

            {composeDue ? (
              <div style={{ marginTop: 2, marginBottom: 4, fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.78, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Calendar size={9} /> {formatDueLabel(composeDue)}
              </div>
            ) : null}

            {/* bottom bar: add a date · Add · × */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid rgba(58,28,20,0.1)", paddingTop: 9, marginTop: 6 }}>
              <button
                onClick={() => setDateOpen((o) => !o)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: composeTheme.ink, opacity: composeDue ? 1 : 0.78, fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}
              >
                <Calendar size={12} /> {composeDue ? "change date" : "add a date"}
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={saveCompose}
                disabled={!composeText.trim()}
                style={{ background: "rgba(255,255,255,0.75)", border: "0.5px solid rgba(58,28,20,0.2)", color: composeTheme.ink, fontFamily: FONT_MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.05em", borderRadius: 8, padding: "7px 13px", cursor: composeText.trim() ? "pointer" : "default", opacity: composeText.trim() ? 1 : 0.5 }}
              >
                Add
              </button>
              <button onClick={resetCompose} aria-label="Cancel" style={{ background: "transparent", border: "none", color: composeTheme.ink, opacity: 0.7, cursor: "pointer", lineHeight: 0, padding: 2 }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* anchored calendar (in-flow, never a floating layer) */}
          {dateOpen ? (
            <div style={{ marginTop: 10, zIndex: 6 }}>
              <NoteComposeCalendar
                value={composeDue}
                onPick={(iso) => { setComposeDue(iso); setDateOpen(false); }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---- PICKER: grab a colour ---- */}
      {showPicker ? (
        <div
          onMouseEnter={() => setPickerHover(true)}
          onMouseLeave={() => { setPickerHover(false); setHoverColour(null); }}
          style={{ position: "relative", width: "100%", height: STAGE_HEIGHT }}
        >
          {/* back-to-fan affordance when reached via "+" on a populated desk */}
          {pickerOpen && !isEmpty ? (
            <button onClick={() => setPickerOpen(false)} aria-label="Back to notes" style={{ position: "absolute", top: 0, right: 2, background: "none", border: "none", color: mutedInk, cursor: "pointer", lineHeight: 0, zIndex: 7 }}>
              <X size={16} />
            </button>
          ) : null}

          {PICKER.map((p) => {
            const theme = NOTE_THEMES[p.colour];
            const hov = hoverColour === p.colour;
            const x = pickerHover ? p.spreadX : p.x;
            return (
              <div
                key={p.colour}
                className="sa-fan-note"
                onMouseEnter={() => setHoverColour(p.colour)}
                onMouseLeave={() => setHoverColour((c) => (c === p.colour ? null : c))}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 8,
                  marginLeft: -70,
                  transformOrigin: "50% 100%",
                  transform: hov ? `translateX(${x}px) translateY(-8px) rotate(0deg) scale(1.04)` : `translateX(${x}px) rotate(${p.rot}deg)`,
                  zIndex: hov ? 60 : p.z,
                }}
              >
                <PostIt colour={p.colour} theme={theme} width={140} minHeight={110} surfaced={false} onClick={() => grabColour(p.colour)}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 80, textAlign: "center", color: theme.ink }}>
                    <Plus size={p.front ? 20 : 17} strokeWidth={2.25} />
                    {p.front ? (
                      <div style={{ fontFamily: FONT_CAVEAT, fontSize: 16, fontWeight: 600, lineHeight: 1.15 }}>jot a note or create a task</div>
                    ) : null}
                  </div>
                </PostIt>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ---- POPULATED FAN ---- */}
      {showFan ? (
        <>
          <div style={{ position: "relative", width: "100%", height: STAGE_HEIGHT }}>
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
                  clampLines={4}
                  onClick={() => setEditing(f.note)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setSeeAllOpen(true)}
            style={{
              width: "100%",
              marginTop: 6,
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
      ) : null}

      {/* see-all overlay */}
      {seeAllOpen ? (
        <NotesSeeAllOverlay
          notes={notes}
          onEdit={(note) => {
            setSeeAllOpen(false);
            setEditing(note);
          }}
          onDelete={(note) => onDelete(note.id)}
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
