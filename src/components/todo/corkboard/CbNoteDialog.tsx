/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbNoteDialog — the note pop-up, for a new note and for editing one (Corkboard v2, Part E; ref
 * design-refs/corkboard-v13/, `openComposer`, screen 04). On the left, the post-it drawn live, typed straight onto;
 * on the right, Colour (five swatches, the name beneath), Tag, "Link it to" (optional; the To-do composer's own
 * finder, `linkOptions`), then Cancel and "Pin it" / "Save". ⌘ Enter pins, Esc closes.
 *
 * ⚠️ IT WRITES NOTHING ITSELF: Save hands the draft to the page, whose `pinNote` / `saveEdit` write it.
 * ⚠️ IT PORTALS TO `document.body` (outside `.cb2`), so its root carries `.cb2-layer`, which declares the page's
 *    tokens again.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Agent, Manuscript, NoteColour, Query } from "../../../types";
import { NOTE_PAPERS, paperHex, paperName } from "../../../lib/noteboard";
import type { NoteLink } from "../../../lib/corkboard";
import { linkOptions } from "../../../lib/corkboard";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { PostIt, type PostItLink } from "./CbPostIt";

export interface NoteDraftV2 {
  id?: string;
  body: string;
  colour: NoteColour;
  tag: string;
  link: NoteLink | null;
}

export interface CbNoteDialogProps {
  draft: NoteDraftV2;
  setDraft: (d: NoteDraftV2) => void;
  saving: boolean;
  /** today's "Added {d Mon}", for the live post-it */
  added: string;
  /** what the link chip and the linked row say about a link */
  linkView: (l: NoteLink) => PostItLink & { sub: string };
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  /** open with the tag field focused (the ⋯ menu's Change tag…) */
  focusTag?: boolean;
  onSave: () => void;
  onClose: () => void;
}

const tagWords = (raw: string) => {
  const t = raw.replace(/#/g, " ").trim();
  return t ? t.split(/\s+/).slice(0, 1) : [];
};

export const CbNoteDialog: React.FC<CbNoteDialogProps> = ({ draft, setDraft, saving, added, linkView, queries, agents, manuscripts, focusTag, onSave, onClose }) => {
  const d = draft;
  const ta = useRef<HTMLTextAreaElement | null>(null);
  const tagIn = useRef<HTMLInputElement | null>(null);
  const opener = useRef<Element | null>(typeof document !== "undefined" ? document.activeElement : null);
  const [linking, setLinking] = useState(false);
  const [find, setFind] = useState("");
  const options = useMemo(() => linkOptions(queries, agents, manuscripts, find), [queries, agents, manuscripts, find]);
  const set = (p: Partial<NoteDraftV2>) => setDraft({ ...d, ...p });
  const can = !!d.body.trim() && !saving;

  /* focused on open (the words, or the tag for Change tag…), and focus goes back to the opener on close */
  useEffect(() => {
    if (focusTag) { tagIn.current?.focus(); tagIn.current?.select(); }
    else { const el = ta.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
    const back = opener.current;
    return () => { if (back instanceof HTMLElement) back.focus(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* the post-it grows with its words */
  useLayoutEffect(() => { const el = ta.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }, [d.body, d.colour]);

  useEscapeLayer(linking, () => setLinking(false), ESC_LEVEL.pageModal);
  useEscapeLayer(true, onClose, ESC_LEVEL.pageDrawer);

  const keys = (e: React.KeyboardEvent) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (can) onSave(); } };
  const lv = d.link ? linkView(d.link) : null;

  return createPortal(
    <div className="cb2-layer cb2-scrim" data-cb2="note-dialog" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cb2-dlg" role="dialog" aria-modal="true" aria-labelledby="cb2-dlg-h" onKeyDown={keys}>
        <div className="cb2-stage">
          <h2 id="cb2-dlg-h" className="cb2-dh">{d.id ? "Edit note" : "New note"}</h2>
          <div className="cb2-stagein">
            <div className="cb2-prev cb2-note">
              <PostIt
                hex={paperHex(d.colour)}
                body={<textarea ref={ta} rows={1} value={d.body} placeholder="Write it down before it goes…" aria-label="Note" data-cb2="note-text"
                  onChange={(e) => set({ body: e.target.value })} />}
                link={lv}
                tags={tagWords(d.tag)}
                added={added}
              />
            </div>
          </div>
        </div>
        <div className="cb2-side2">
          <div>
            <h4 className="cb2-h4">Colour</h4>
            <div className="cb2-sws2" role="group" aria-label="Colour">
              {NOTE_PAPERS.map((p) => (
                <button key={p.v} type="button" className="cb2-sw2" data-paper={p.v} aria-label={p.name} aria-pressed={d.colour === p.v}
                  style={{ background: p.hex }} onClick={() => set({ colour: p.v })} />
              ))}
            </div>
            <div className="cb2-swname" data-cb2="paper-name">{paperName(d.colour)}</div>
          </div>
          <div>
            <h4 className="cb2-h4">Tag</h4>
            <input ref={tagIn} className="cb2-tagin" value={d.tag ? `#${d.tag.replace(/^#/, "")}` : ""} placeholder="#synopsis" aria-label="Tag" data-cb2="tag"
              onChange={(e) => set({ tag: e.target.value.replace(/^#/, "") })} />
          </div>
          <div>
            <h4 className="cb2-h4">Link it to <small>optional</small></h4>
            {lv ? (
              <div className="cb2-lnk" data-cb2="linked">
                <span className={`cb2-dn${lv.kind === "manuscript" ? " cb2-ms" : ""}`} aria-hidden="true">{lv.initials}</span>
                <span><b>{lv.name}</b><small>{lv.sub}</small></span>
                <button type="button" aria-label="Remove the link" onClick={() => set({ link: null })}>×</button>
              </div>
            ) : (
              <>
                <button type="button" className="cb2-addlnk" data-cb2="add-link" aria-expanded={linking} onClick={() => setLinking((o) => !o)}>
                  + An agent, a query or your manuscript
                </button>
                {linking ? (
                  <div className="cb2-lpop" data-cb2="link-find">
                    <input autoFocus value={find} placeholder="Find an agent, a query or a manuscript" aria-label="Find something to link" onChange={(e) => setFind(e.target.value)} />
                    <div className="cb2-lpoplist">
                      {options.map((o) => (
                        <button key={`${o.kind}-${o.id}`} type="button" data-link={`${o.kind}:${o.id}`}
                          onClick={() => { set({ link: { kind: o.kind, id: o.id } }); setLinking(false); setFind(""); }}>
                          <b>{o.label}</b><small>{o.sub}</small>
                        </button>
                      ))}
                      {options.length ? null : <p>Nothing matches.</p>}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="cb2-dacts">
            <button type="button" className="cb2-btn" data-cb2="cancel" onClick={onClose}>Cancel</button>
            <button type="button" className="cb2-btn cb2-btn--navy" data-cb2="save" disabled={!can} onClick={onSave}>{d.id ? "Save" : "Pin it"}</button>
          </div>
          <div className="cb2-keys">⌘ Enter to {d.id ? "save" : "pin"} · Esc to close</div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
