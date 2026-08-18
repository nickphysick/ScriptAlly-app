/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NotesThread — Notes read as a thread (§1, ref design-refs/159-notes-chat.html).
 *
 * ⚠️ OLDEST AT THE TOP, NEWEST AT THE FOOT, COMPOSER DOCKED BENEATH — the messaging arrangement,
 * and it is honest here rather than borrowed: the thread is a chronology of one relationship, so
 * reading it top to bottom is reading it in the order it happened. The card opened newest-first,
 * which put the oldest impression at the bottom of a list you scroll downwards.
 *
 * ⚠️ THIS CARD SCROLLS INTERNALLY — the deliberate exception to the page's no-inner-scroll rule,
 * the same one the to-do list makes. That costs two things, and they are the two exact faults a
 * browser pass found on the to-do board:
 *
 *   1. the `min-height: 0` chain must be COMPLETE from the card down to the scroller. A single
 *      flex item without it has an `auto` minimum equal to its content, so the scroller grows
 *      instead of scrolling and the card pushes the column open.
 *   2. the dock must be `flex: 0 0 auto`. As `flex: 1` or unset it is a flex item beside a growing
 *      scroller and gets squeezed — the composer shrinking as the thread fills.
 *
 * Neither is visible to jsdom, and neither is visible in the source: both are measured in
 * `qcNotes.measure.ts` against the running page.
 *
 * ⚠️ EXTRACTED FROM `Queries.tsx` RATHER THAN REWRITTEN IN IT. The behaviour below — a scroll
 * anchor, an autosizing composer, a settle timer, a pinned strip — is four pieces of state that
 * belong to one card, and inline in a 5,000-line page they would be four more entries in a
 * component that already holds sixty.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { dayLabel } from "../../lib/elapsed";

export interface ThreadNote {
  id: string;
  entryText: string;
  createdAt: string;
  /** §1c — stored per note; the strip above the scroller renders the newest pinned one. */
  pinned?: boolean;
}

export interface NotesThreadProps {
  notes: ThreadNote[];
  onAdd: (text: string) => void | Promise<void>;
  onEdit: (id: string, text: string) => void | Promise<void>;
  onDelete: (note: ThreadNote) => void;
  onPin: (id: string, pinned: boolean) => void | Promise<void>;
  /** Resets every piece of local state when the reader moves to another query. */
  resetKey?: string;
}

/** ⚠️ THE SETTLE IS A FIGURE, not a number typed twice — the CSS transition reads the same token. */
const SETTLE_MS = 2400;
/** A few lines, then the composer scrolls inside itself rather than pushing the thread off screen. */
const COMPOSER_MAX = 132;

const timeOf = (n: ThreadNote) => new Date(n.createdAt).getTime();
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export const NotesThread: React.FC<NotesThreadProps> = ({ notes, onAdd, onEdit, onDelete, onPin, resetKey }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  /** §1f — the id that landed most recently, cleared on a timer. */
  const [landed, setLanded] = useState<string | null>(null);
  /**
   * ⚠️ THE NEW NOTE IS IDENTIFIED BY ARRIVAL, NOT BY A RETURNED ID. `addJournalEntry` resolves to
   * `void` and the note reaches this component through the account-wide snapshot, so there is no id
   * to hold onto at save time. This arms on save and claims the first id that was not there before
   * — which is also correct when two devices are writing, because a note this writer did not just
   * add is not the one to flash.
   */
  const armed = useRef(false);
  const knownRef = useRef<Set<string>>(new Set(notes.map((n) => n.id)));

  /* oldest first: the thread is read in the order it happened */
  const ordered = [...notes].sort((a, b) => timeOf(a) - timeOf(b));
  /* ⚠️ THE NEWEST PINNED ONE, not the first found — a writer who pins a second note means that one. */
  const pinned = ordered.filter((n) => n.pinned).slice(-1)[0] ?? null;

  /**
   * §1b — land at the foot.
   *
   * ⚠️ `scrollTop = scrollHeight`, NEVER `scrollIntoView` ON THE LAST NOTE. The day separators are
   * `position: sticky`, and `scrollIntoView` resolves against the nearest scrollport while they are
   * occupying its top edge — so the last note lands under a separator and the two fight. Setting
   * the scroll position asks nothing of the layout.
   *
   * ⚠️ AND ONLY WHEN IT ACTUALLY OVERFLOWS. On a short thread `scrollHeight === clientHeight` and
   * the assignment is a no-op, but saying so makes the intent readable — this is "show the newest",
   * not "scroll" — and it keeps the browser measure honest about which case it is in.
   */
  const toFoot = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
  }, []);

  /* ⚠️ LAYOUT EFFECT, so the first paint is already at the foot rather than jumping after it. */
  useLayoutEffect(() => { toFoot(); }, [toFoot, resetKey, ordered.length]);

  /* a query change is a different thread: nothing local survives it */
  useEffect(() => {
    setDraft(""); setEditingId(null); setEditText(""); setLanded(null); setFocused(false);
    armed.current = false;
    knownRef.current = new Set(notes.map((n) => n.id));
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- a new thread, not a changed one */
  }, [resetKey]);

  /* §1f — claim the arrival */
  useEffect(() => {
    const known = knownRef.current;
    const fresh = notes.filter((n) => !known.has(n.id)).map((n) => n.id);
    notes.forEach((n) => known.add(n.id));
    if (armed.current && fresh.length) { armed.current = false; setLanded(fresh[fresh.length - 1]); }
  }, [notes]);

  useEffect(() => {
    if (!landed) return;
    const t = window.setTimeout(() => setLanded(null), SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [landed]);

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX)}px`;
  };

  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (areaRef.current) { areaRef.current.style.height = "auto"; }
    armed.current = true;
    await onAdd(text);
    /* §1b — a saved note is the newest, so the thread returns to its foot */
    requestAnimationFrame(toFoot);
  };

  return (
    <div className="qn-wrap">
      {/**
        * §1c — THE PINNED NOTE SITS ABOVE THE SCROLLER, NOT INSIDE IT. In thread order the one note
        * a writer always wants — how to reach them, what to check before nudging — is buried by
        * everything written since. Held here it keeps its place while the thread scrolls, and it
        * unpins from its own control rather than from a menu somewhere else.
        */}
      {pinned && (
        <div className="qn-pinned">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z" /></svg>
          <span className="qn-pinnedtx">{pinned.entryText}</span>
          <button type="button" className="qn-unpin" onClick={() => onPin(pinned.id, false)}>Unpin</button>
        </div>
      )}

      {ordered.length === 0 ? (
        /* §1g — the composer stays docked and the space above teaches */
        <div className="qn-empty">
          <svg viewBox="0 0 48 38" aria-hidden="true"><path d="M8 6h26l6 6v20H8z" /><path d="M34 6v6h6" /><path d="M14 18h18M14 24h12" /></svg>
          <p>Nothing noted yet.<br />First impressions, what they said on the phone,<br />anything you&rsquo;ll want when they finally reply.</p>
        </div>
      ) : (
        <div className="qn-scroll" ref={scrollRef}>
          {ordered.map((n, i) => {
            const ms = timeOf(n);
            const prev = i > 0 ? timeOf(ordered[i - 1]) : null;
            const newDay = prev == null || new Date(prev).toDateString() !== new Date(ms).toDateString();
            const isEditing = editingId === n.id;
            return (
              <React.Fragment key={n.id}>
                {/* §1d — sticky, so the date of what you are reading stays visible */}
                {newDay && <div className="qn-day">{dayLabel(ms)}</div>}
                <div className={`qn-note${landed === n.id ? " qn-note--new" : ""}${n.pinned ? " qn-note--pin" : ""}`}>
                  {isEditing ? (
                    <div className="qn-edit">
                      <textarea
                        className="qn-editta"
                        value={editText}
                        autoFocus
                        rows={2}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setEditingId(null); } }}
                      />
                      <div className="qn-editrow">
                        <button type="button" className="qn-editx" onClick={() => setEditingId(null)}>Cancel</button>
                        <button
                          type="button"
                          className="qn-editgo"
                          disabled={!editText.trim()}
                          onClick={async () => { if (!editText.trim()) return; await onEdit(n.id, editText.trim()); setEditingId(null); }}
                        >Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="qn-body">{n.entryText}</div>
                      <div className="qn-meta">
                        <span>{hhmm(ms)}</span>
                        <span className="qn-acts">
                          <button type="button" onClick={() => { setEditingId(n.id); setEditText(n.entryText); }}>Edit</button>
                          <button type="button" onClick={() => onPin(n.id, !n.pinned)}>{n.pinned ? "Unpin" : "Pin"}</button>
                          <button type="button" onClick={() => onDelete(n)}>Delete</button>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/**
        * §1e — THE COMPOSER. White with a rim, sage on focus, growing with the text to a few lines
        * and then scrolling inside itself.
        *
        * ⚠️ THE PINK FILL AND THE CLIPPED SEND BUTTON BOTH GO. The field tinted pink at rest — the
        * page's one accent, spent on a text box — and its 32px round send button sat inside a
        * flex row that clipped it at narrow widths. A labelled Save cannot be clipped into a
        * mystery, and it says what it does.
        *
        * ⚠️ `flex: 0 0 auto` ON THE DOCK, in CSS rather than here, and it is load-bearing: beside a
        * growing scroller a dock that can shrink does.
        */}
      <div className="qn-dock">
        <div className={`qn-compose${focused ? " qn-compose--on" : ""}`}>
          <textarea
            ref={areaRef}
            className="qn-ta"
            rows={1}
            value={draft}
            placeholder="Write a note…"
            aria-label="Write a note"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => { setDraft(e.target.value); grow(e.target); }}
            onKeyDown={(e) => {
              /* ⚠️ ⌘/Ctrl+ENTER SAVES, PLAIN ENTER DOES NOT. A note is prose and wants its
                 paragraphs; the old field saved on bare Enter, so a line break ended the note. */
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(); }
              /* Esc clears — the field's own key, and it does not reach the page's one Escape
                 handler because there is nothing open for that to close from here. */
              if (e.key === "Escape" && draft) { e.preventDefault(); setDraft(""); if (areaRef.current) areaRef.current.style.height = "auto"; }
            }}
          />
          <div className="qn-crow">
            <span className="qn-hint">⌘ + Enter to save · Esc to clear</span>
            <button type="button" className="qn-send" disabled={!draft.trim()} onClick={() => void save()}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** The settle window, exported so the stylesheet's transition and this timer stay one figure. */
export const NOTES_SETTLE_MS = SETTLE_MS;
