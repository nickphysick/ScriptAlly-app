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
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Calendar, Maximize2 } from "lucide-react";
import type { Note, NoteColour } from "../../types";
import { FONT_MONO, burgundy, mutedInk, parchment, buttonPinkBorder } from "../../lib/designTokens";
import { FONT_CAVEAT, NOTE_THEMES, NOTE_COLOURS } from "./notesTheme";
import { PostIt } from "./PostIt";
import { DeskNote } from "./DeskNote";
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

const NOTE_W = 210; // created notes — 25% larger than the picker placeholders
const NOTE_MINH = 163;
const PICK_W = 152; // empty-state grab-a-colour placeholders (unchanged)
const PICK_MINH = 118;
/** Fixed desk height — sized for the tallest in-flow state (compose sticky + bar) so the hero never
 *  resizes across empty / fan / compose / add. Content is vertically centred within it. */
const DESK_H = 246;

/** Behind-the-front slots for older notes: left then right, slight tilt, lower z. */
const SIDE_SLOTS = [
  { x: -42, rot: -11, z: 1 },
  { x: 42, rot: 11, z: 2 },
];

/** Wider slots for the existing notes when they fan BEHIND the add-another compose sticky. */
const BEHIND_SLOTS = [
  { x: -58, rot: -9, z: 3 },
  { x: 64, rot: 10, z: 2 },
  { x: -108, rot: -13, z: 1 },
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
  const [deskHover, setDeskHover] = useState(false);

  // Compose-in-place state
  const [composeColour, setComposeColour] = useState<NoteColour | null>(null);
  const [composeText, setComposeText] = useState("");
  const [composeDue, setComposeDue] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [pickerHover, setPickerHover] = useState(false);
  const [hoverColour, setHoverColour] = useState<NoteColour | null>(null);

  // Floating date calendar: anchored to the compose sticky by MEASURED position and portalled to
  // <body>, so it overlays the cards below the hero without growing/clipping the hero — and isn't
  // mis-anchored by the dashboard's motion.div transform (a plain fixed layer would be).
  const stickyRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null);

  const openDate = () => {
    const r = stickyRef.current?.getBoundingClientRect();
    if (r) setCalPos({ top: r.bottom + 8, left: r.left });
    setDateOpen(true);
  };

  useEffect(() => {
    if (!dateOpen) return;
    const reposition = () => {
      const r = stickyRef.current?.getBoundingClientRect();
      if (r) setCalPos({ top: r.bottom + 8, left: r.left });
    };
    reposition();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (calRef.current && !calRef.current.contains(t) && stickyRef.current && !stickyRef.current.contains(t)) {
        setDateOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDateOpen(false);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [dateOpen]);

  const active = byMostRecent(activeNotes(notes));
  const top = active.slice(0, 3);
  const front = top[0];
  const sides = top.slice(1).map((note, i) => ({ note, ...SIDE_SLOTS[i] }));
  const isEmpty = active.length === 0;
  const lastUsedColour: NoteColour = front?.colour ?? "pink";

  const composing = composeColour !== null;
  // The full grab-a-colour picker is for the true empty state ONLY; "+" on a populated desk goes
  // straight to a fresh sticky (Option B).
  const showPicker = !composing && isEmpty;
  const showFan = !composing && !isEmpty;

  const grabColour = (c: NoteColour) => {
    setComposeColour(c);
    setComposeText("");
    setComposeDue(null);
    setDateOpen(false);
  };
  const addAnother = () => grabColour(lastUsedColour); // "+" → fresh sticky, last-used colour
  const resetCompose = () => {
    setComposeColour(null);
    setComposeText("");
    setComposeDue(null);
    setDateOpen(false);
  };
  const saveCompose = () => {
    const trimmed = composeText.trim();
    if (!trimmed || !composeColour) return;
    onAdd({ text: trimmed, colour: composeColour, dueDate: composeDue });
    resetCompose();
  };

  const composeTheme = composeColour ? NOTE_THEMES[composeColour] : NOTE_THEMES.pink;

  return (
    <div
      onMouseEnter={() => setDeskHover(true)}
      onMouseLeave={() => setDeskHover(false)}
      style={{ position: "relative", width: 296, height: DESK_H, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
    >
      {/* ---- COMPOSE: write on the sticky; existing notes fan behind (Option B) ---- */}
      {composing ? (
        <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
            {/* existing notes, dimmed, fanned behind — never blank the desk */}
            {!isEmpty ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", opacity: 0.5, filter: "saturate(0.82)", pointerEvents: "none", zIndex: 0 }}>
                <div style={{ position: "relative", width: NOTE_W }}>
                  {top.map((note, i) => {
                    const b = BEHIND_SLOTS[i] ?? BEHIND_SLOTS[BEHIND_SLOTS.length - 1];
                    return (
                      <div key={note.id} style={{ position: "absolute", bottom: 0, left: "50%", marginLeft: -NOTE_W / 2, transformOrigin: "50% 100%", transform: `translateX(${b.x}px) rotate(${b.rot}deg)`, zIndex: b.z }}>
                        <PostIt colour={note.colour} text={note.text} dueDate={note.dueDate} surfaced={false} metaRow createdAt={note.createdAt} clampLines={3} width={NOTE_W} minHeight={NOTE_MINH} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

          <div
            ref={stickyRef}
            style={{
              position: "relative",
              zIndex: 2,
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

            {/* colour dots — recolour the sticky (colour optional) */}
            <div style={{ display: "flex", gap: 7, marginTop: 6 }}>
              {NOTE_COLOURS.map((c) => (
                <button
                  key={c}
                  onClick={() => setComposeColour(c)}
                  aria-label={c}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: NOTE_THEMES[c].fill,
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    boxShadow: composeColour === c ? `0 0 0 1.5px ${composeTheme.ink}` : "inset 0 0 0 1px rgba(58,28,20,0.16)",
                  }}
                />
              ))}
            </div>

            {/* bottom bar: add a date · Add · × */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid rgba(58,28,20,0.1)", paddingTop: 9, marginTop: 6 }}>
              <button
                onClick={() => (dateOpen ? setDateOpen(false) : openDate())}
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
          </div>
        </div>
      ) : null}

      {/* floating date calendar — measured-position overlay portalled to <body> (never grows/clips the
          hero, dodges the dashboard motion.div transform) */}
      {composing && dateOpen && calPos
        ? createPortal(
            <div ref={calRef} style={{ position: "fixed", top: calPos.top, left: calPos.left, zIndex: 400 }}>
              <NoteComposeCalendar value={composeDue} onPick={(iso) => { setComposeDue(iso); setDateOpen(false); }} />
            </div>,
            document.body
          )
        : null}

      {/* ---- PICKER: grab a colour (pink front in flow, yellow/sage behind) ---- */}
      {showPicker ? (
        <div
          onMouseEnter={() => setPickerHover(true)}
          onMouseLeave={() => { setPickerHover(false); setHoverColour(null); }}
          style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}
        >
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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 88, textAlign: "center", color: NOTE_THEMES.pink.ink }}>
                <Plus size={20} strokeWidth={2.25} />
                <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.55 }}>Add a note</div>
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
                  <DeskNote note={s.note} width={NOTE_W} minHeight={NOTE_MINH} onOpen={() => setEditing(s.note)} onComplete={onComplete} onDelete={(n) => onDelete(n.id)} />
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
              <DeskNote note={front} width={NOTE_W} minHeight={NOTE_MINH} onOpen={() => setEditing(front)} onComplete={onComplete} onDelete={(n) => onDelete(n.id)} />
            </div>
          </div>

          {/* + (hover) and See all — absolute bottom group, so the fan alone is centred (behind the
              corkboard) and isn't pushed up by controls below it */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, zIndex: 8 }}>
            <button
              onClick={(e) => { e.stopPropagation(); addAnother(); }}
              onMouseEnter={() => setCornerHover(true)}
              onMouseLeave={() => setCornerHover(false)}
              aria-label="New note"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: cornerHover ? "#fff3ed" : parchment,
                color: burgundy,
                border: `0.5px solid ${buttonPinkBorder}`,
                boxShadow: "0 2px 6px rgba(58,28,20,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: deskHover ? 1 : 0,
                pointerEvents: deskHover ? "auto" : "none",
                transform: cornerHover ? "scale(1.08)" : "none",
                transition: "opacity 0.16s ease, transform 0.12s ease, background 0.12s ease",
              }}
            >
              <Plus size={15} />
            </button>

            {active.length > 1 ? (
              <button
                onClick={() => setSeeAllOpen(true)}
                style={{
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
                  padding: "2px 2px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = burgundy)}
                onMouseLeave={(e) => (e.currentTarget.style.color = mutedInk)}
              >
                {active.length > 3 ? `See all · ${active.length}` : "See all"} <Maximize2 size={11} />
              </button>
            ) : null}
          </div>
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
