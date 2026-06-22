/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NotesDesk — the hero's right-hand "desk". Compose happens IN PLACE (no floating popover): a resting
 * colour picker → grab a colour → write on that sticky → optionally anchor a date. Populated desks
 * show the recent-three fan with the newest front-and-centre and a "+" riding its top-right corner.
 *
 * Centring: every state renders a CONTENT-SIZED cluster — the front sticky sits in normal flow (so it
 * defines the height and is centred by the flex column), older stickies are absolutely positioned
 * behind it, bottom-aligned. No fixed-height stage, so there's no dead space leaving the notes low.
 */
import React, { useState } from "react";
import { Plus, X, Calendar, Maximize2 } from "lucide-react";
import type { Note, NoteColour } from "../../types";
import { FONT_MONO, burgundy, mutedInk, parchment, buttonPinkBorder } from "../../lib/designTokens";
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

const NOTE_W = 168;
const NOTE_MINH = 130;
const PICK_W = 152;
const PICK_MINH = 118;

/** Behind-the-front slots for older notes: left then right, slight tilt, lower z. */
const SIDE_SLOTS = [
  { x: -42, rot: -11, z: 1 },
  { x: 42, rot: 11, z: 2 },
];

/** Colour-picker fan — pink front, yellow/sage behind (spread out on hover to be hittable). */
const PICKER_SIDES: { colour: NoteColour; x: number; spreadX: number; rot: number; z: number }[] = [
  { colour: "yellow", x: -38, spreadX: -66, rot: -11, z: 1 },
  { colour: "sage", x: 38, spreadX: 66, rot: 11, z: 2 },
];

export const NotesDesk: React.FC<NotesDeskProps> = ({ notes, onAdd, onSave, onComplete, onDelete }) => {
  const [seeAllOpen, setSeeAllOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cornerHover, setCornerHover] = useState(false);

  // Compose-in-place state
  const [pickerOpen, setPickerOpen] = useState(false); // populated desk: "+" opened the picker
  const [composeColour, setComposeColour] = useState<NoteColour | null>(null);
  const [composeText, setComposeText] = useState("");
  const [composeDue, setComposeDue] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [pickerHover, setPickerHover] = useState(false);
  const [hoverColour, setHoverColour] = useState<NoteColour | null>(null);

  const active = byMostRecent(activeNotes(notes));
  const top = active.slice(0, 3);
  const front = top[0];
  const sides = top.slice(1).map((note, i) => ({ note, ...SIDE_SLOTS[i] }));
  const isEmpty = active.length === 0;

  const composing = composeColour !== null;
  const showPicker = !composing && (isEmpty || pickerOpen);
  const showFan = !composing && !showPicker;

  const openPicker = () => setPickerOpen(true);
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
      {/* ---- COMPOSE: write on the grabbed sticky (content-sized → centred) ---- */}
      {composing ? (
        <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
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

      {/* ---- PICKER: grab a colour (pink front in flow, yellow/sage behind) ---- */}
      {showPicker ? (
        <div
          onMouseEnter={() => setPickerHover(true)}
          onMouseLeave={() => { setPickerHover(false); setHoverColour(null); }}
          style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}
        >
          {/* back-to-fan affordance when reached via "+" on a populated desk */}
          {pickerOpen && !isEmpty ? (
            <button onClick={() => setPickerOpen(false)} aria-label="Back to notes" style={{ position: "absolute", top: -6, right: 2, background: "none", border: "none", color: mutedInk, cursor: "pointer", lineHeight: 0, zIndex: 12 }}>
              <X size={16} />
            </button>
          ) : null}

          {/* sides — absolute, bottom-aligned behind the front */}
          {PICKER_SIDES.map((p) => {
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
                  bottom: 0,
                  left: "50%",
                  marginLeft: -PICK_W / 2,
                  transformOrigin: "50% 100%",
                  transform: hov ? `translateX(${x}px) translateY(-8px) rotate(0deg) scale(1.04)` : `translateX(${x}px) rotate(${p.rot}deg)`,
                  zIndex: hov ? 60 : p.z,
                }}
              >
                <PostIt colour={p.colour} theme={theme} width={PICK_W} minHeight={PICK_MINH} surfaced={false} onClick={() => grabColour(p.colour)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 88, color: theme.ink }}>
                    <Plus size={17} strokeWidth={2.25} />
                  </div>
                </PostIt>
              </div>
            );
          })}

          {/* front pink — in flow → defines height + centred */}
          <div
            className="sa-fan-note"
            onMouseEnter={() => setHoverColour("pink")}
            onMouseLeave={() => setHoverColour((c) => (c === "pink" ? null : c))}
            style={{ position: "relative", zIndex: 3, transformOrigin: "50% 100%", transform: hoverColour === "pink" ? "translateY(-6px) scale(1.03)" : "none" }}
          >
            <PostIt colour="pink" theme={NOTE_THEMES.pink} width={PICK_W} minHeight={PICK_MINH} surfaced={false} onClick={() => grabColour("pink")}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 88, textAlign: "center", color: NOTE_THEMES.pink.ink }}>
                <Plus size={20} strokeWidth={2.25} />
                <div style={{ fontFamily: FONT_CAVEAT, fontSize: 16, fontWeight: 600, lineHeight: 1.15 }}>jot a note or create a task</div>
              </div>
            </PostIt>
          </div>
        </div>
      ) : null}

      {/* ---- POPULATED FAN: newest front-and-centre, older behind ---- */}
      {showFan && front ? (
        <>
          <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
            {/* older notes — absolute, bottom-aligned behind */}
            {sides.map((s) => {
              const hov = hoveredId === s.note.id;
              return (
                <div
                  key={s.note.id}
                  className="sa-fan-note"
                  onMouseEnter={() => setHoveredId(s.note.id)}
                  onMouseLeave={() => setHoveredId((id) => (id === s.note.id ? null : id))}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    marginLeft: -NOTE_W / 2,
                    transformOrigin: "50% 100%",
                    transform: hov ? `translateX(${s.x}px) translateY(-12px) rotate(0deg) scale(1.04)` : `translateX(${s.x}px) rotate(${s.rot}deg)`,
                    zIndex: hov ? 60 : s.z,
                    boxShadow: hov ? "1px 12px 26px rgba(58,28,20,0.22)" : undefined,
                  }}
                >
                  <PostIt colour={s.note.colour} text={s.note.text} dueDate={s.note.dueDate} surfaced={false} clampLines={4} width={NOTE_W} minHeight={NOTE_MINH} onClick={() => setEditing(s.note)} />
                </div>
              );
            })}

            {/* newest — in flow, front-and-centre, carries the corner "+" */}
            <div
              className="sa-fan-note"
              onMouseEnter={() => setHoveredId(front.id)}
              onMouseLeave={() => setHoveredId((id) => (id === front.id ? null : id))}
              style={{ position: "relative", zIndex: 3, transformOrigin: "50% 100%", transform: hoveredId === front.id ? "translateY(-12px) scale(1.04)" : "none" }}
            >
              <PostIt colour={front.colour} text={front.text} dueDate={front.dueDate} surfaced clampLines={4} width={NOTE_W} minHeight={NOTE_MINH} onClick={() => setEditing(front)} />

              {/* "+" riding the front note's top-right corner — opens the colour picker */}
              <button
                onClick={(e) => { e.stopPropagation(); openPicker(); }}
                onMouseEnter={() => setCornerHover(true)}
                onMouseLeave={() => setCornerHover(false)}
                aria-label="New note"
                style={{
                  position: "absolute",
                  top: -11,
                  right: -11,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: cornerHover ? "#fff3ed" : parchment,
                  color: burgundy,
                  border: `0.5px solid ${buttonPinkBorder}`,
                  boxShadow: "0 1px 4px rgba(58,28,20,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transform: cornerHover ? "scale(1.08)" : "none",
                  transition: "transform 0.12s ease, background 0.12s ease",
                  zIndex: 10,
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {active.length > 1 ? (
            <button
              onClick={() => setSeeAllOpen(true)}
              style={{
                width: "100%",
                marginTop: 12,
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
          ) : null}
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
