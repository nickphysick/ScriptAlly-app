/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dev review surface for the notes pieces (reached via #/notes-lab, DEV only — same hatch pattern as
 * #/status-dots). Local React state stands in for the db helpers so the create → edit → complete →
 * delete loop is fully exercisable WITHOUT auth or a rules deploy. Not wired into the app.
 */
import React, { useState } from "react";
import type { Note, NoteColour } from "../../types";
import { pageGround, PAGE_GRAIN, FONT_SERIF, headingInk, mutedInk, FONT_MONO, burgundy } from "../../lib/designTokens";
import { PostIt } from "./PostIt";
import { NoteQuickAdd } from "./NoteQuickAdd";
import { NoteEditor } from "./NoteEditor";
import { HeroCard } from "../dashboard/HeroCard";
import { OverToYou } from "../dashboard/OverToYou";
import { byMostRecent, activeNotes } from "./notesUtils";

let seq = 0;
const mkId = () => `note-lab-${seq++}`;
const nowISO = () => new Date().toISOString();

const SEED: Note[] = [
  { id: mkId(), userId: "lab", text: "Polish the synopsis before the next batch goes out", colour: "pink", dueDate: "2026-06-23", done: false, doneAt: null, createdAt: nowISO(), updatedAt: nowISO() },
  { id: mkId(), userId: "lab", text: "Priya Anand loves slow-burn — lead with the romance", colour: "sage", dueDate: null, done: false, doneAt: null, createdAt: nowISO(), updatedAt: nowISO() },
  { id: mkId(), userId: "lab", text: "Idea: open chapter 1 on the clock, not the city", colour: "yellow", dueDate: null, done: false, doneAt: null, createdAt: nowISO(), updatedAt: nowISO() },
  { id: mkId(), userId: "lab", text: "Read Margaret's R&R notes before replying", colour: "pink", dueDate: "2026-06-30", done: false, doneAt: null, createdAt: nowISO(), updatedAt: nowISO() },
  { id: mkId(), userId: "lab", text: "Chase the Curtis Brown partial — overdue", colour: "sage", dueDate: "2026-06-18", done: false, doneAt: null, createdAt: nowISO(), updatedAt: nowISO() },
];

export const NotesLab: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(SEED);
  const [editing, setEditing] = useState<Note | null>(null);

  const addNote = (fields: { text: string; colour: NoteColour; dueDate: string | null }) => {
    const n: Note = { id: mkId(), userId: "lab", text: fields.text, colour: fields.colour, dueDate: fields.dueDate, done: false, doneAt: null, createdAt: nowISO(), updatedAt: nowISO() };
    setNotes((prev) => [...prev, n]);
  };
  const saveNote = (id: string, fields: { text: string; colour: NoteColour; dueDate: string | null }) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...fields, updatedAt: nowISO() } : n)));
  const completeNote = (id: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done: true, doneAt: nowISO(), updatedAt: nowISO() } : n)));
  const deleteNote = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const visible = byMostRecent(activeNotes(notes));

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "auto", background: pageGround }}>
      <div style={{ position: "fixed", inset: 0, background: PAGE_GRAIN, opacity: 0.25, pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 760, margin: "0 auto", padding: "48px 30px 80px" }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 500, color: headingInk }}>Notes — lab</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: mutedInk, marginTop: 6 }}>
          PostIt · quick-add · editor — local state, no persistence
        </div>

        <div style={{ marginTop: 28, maxWidth: 460 }}>
          <NoteQuickAdd onAdd={addNote} />
        </div>

        {/* Desk-in-hero preview (Prompt 3) — the REAL HeroCard, prop-driven (no auth needed) */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: burgundy, margin: "34px 0 14px", display: "flex", alignItems: "center", gap: 14 }}>
          Hero preview — hover the fan · + adds · See all spreads
          <button
            onClick={() => setNotes([])}
            style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: burgundy, background: "none", border: "0.5px solid #e8c8bc", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
          >
            Clear all (empty state)
          </button>
        </div>
        <HeroCard
          firstName="Writer"
          quote={{ text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" }}
          onSendQuery={() => {}}
          onRecordResponse={() => {}}
          onAddAgent={() => {}}
          onAddManuscript={() => {}}
          notes={notes}
          onAddNote={addNote}
          onSaveNote={saveNote}
          onCompleteNote={completeNote}
          onDeleteNote={deleteNote}
        />

        {/* To-do "Noted by you" group preview (Prompt 4) — OverToYou with no derived tasks */}
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: burgundy, margin: "34px 0 14px" }}>
          To-do "Noted by you" group — tick a dated note to complete it
        </div>
        <div style={{ maxWidth: 420, height: 460 }}>
          <OverToYou
            tasks={[]}
            queries={[]}
            agents={[]}
            notes={notes}
            onAction={() => {}}
            onNudge={() => {}}
            onSnooze={() => {}}
            onDismiss={() => {}}
            onAllTasks={() => {}}
            onOpenQuery={() => {}}
            onCompleteNote={completeNote}
          />
        </div>

        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: burgundy, margin: "34px 0 14px" }}>
          {visible.length} active — click one to edit
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 22 }}>
          {visible.map((n) => (
            <PostIt key={n.id} colour={n.colour} text={n.text} dueDate={n.dueDate} onClick={() => setEditing(n)} />
          ))}
          {visible.length === 0 ? (
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", color: mutedInk }}>All done — nothing on the desk.</div>
          ) : null}
        </div>
      </div>

      {editing ? (
        <NoteEditor
          note={editing}
          onSave={saveNote}
          onComplete={completeNote}
          onDelete={deleteNote}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
};
