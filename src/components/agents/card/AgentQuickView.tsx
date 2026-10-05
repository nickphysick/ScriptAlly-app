/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's QUICK VIEW (Agent card v1 §3; ref design-refs/agent-card-housekeeping-v7.html,
 * Journeys "Open the quick view" → "Add a note from the quick view"). The landing page's agent
 * card made live: one slate band for every agent, the head, the query section — the only part that
 * changes colour — and what they want, materials, the wishlist and notes.
 *
 * ⚠️ EVERY FACT IS lib/agentCard's, and every one of those is the engine the Contact list's rows
 * read, so the card and the row behind it cannot disagree. A status is drawn only by StatusDot.
 *
 * ⚠️ ESCAPE IS ONE HANDLER (§9): an open ⋯ menu closes first, then an open note composer (its
 * words are kept while the card is open), then the delete confirm, then the card. Nothing answers
 * while a delete is under way.
 *
 * ⚠️ WHAT WAS SENT STAYS ON THE CARD (the clean-up pass's materials-everywhere law, which the
 * old pop-up carried). The mock's face has no room for it, so the shared chip and box ride at the
 * top of the History disclosure — above the steps, where the record of what happened lives.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Agent, QueryStatus, SubmissionPackage } from "../../../types";
import { StatusDot } from "../../StatusDot";
import { SentBox, SentChip } from "../../queryActions/SentHow";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import type { AgentFacts } from "../../../lib/contactList";
import type { QcRow } from "../../../lib/qcSummary";
import type { AgentNote } from "../../../lib/agentNotes";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import type { AgentEditPatch } from "../../../lib/saveAgentEdits";
import { hrefFor } from "../../../lib/quickAdd";
import { genreLabel, type PersonalGenre } from "../../../lib/genres";
import { formatDate } from "../../../lib/dates";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../../lib/shortcuts";
import {
  type AlsoQueried, type CardAct, type SavedPulse, howLine, materialChips, mswlLinkOf, nextLine, nowLine, primaryFor,
  queryTone, seqPosition, trailOf, whereLine, wishStamp,
} from "../../../lib/agentCard";
import { canDestroy } from "../../../lib/cascade";

/* the mock's own marks — line drawings in the ink, inheriting the link's colour */
const ICO = {
  web: <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="7" cy="7" r="5.5" /><path d="M1.5 7h11M7 1.5c2 2 2 9 0 11M7 1.5c-2 2-2 9 0 11" /></svg>,
  mail: <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="1.5" y="3" width="11" height="8" rx="1" /><path d="M1.5 3.5l5.5 4 5.5-4" /></svg>,
  list: <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M4 3.5h8M4 7h8M4 10.5h8" /><circle cx="1.8" cy="3.5" r=".6" /><circle cx="1.8" cy="7" r=".6" /><circle cx="1.8" cy="10.5" r=".6" /></svg>,
  ql: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="2.5" y="1.5" width="9" height="11" rx="1" /><path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3" /></svg>,
  syn: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 1.5h5.5L11 4v8.5H3z" /><path d="M8.5 1.5V4H11" /></svg>,
  smp: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M4.5 3.5h7v9h-7z" /><path d="M2.5 10.5v-9h7" /></svg>,
  oth: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" /></svg>,
  pen: <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M9.5 2l2.5 2.5L5 11.5 2 12l.5-3z" /></svg>,
};

const dmy = (ms: number) => formatDate(new Date(ms), { day: "numeric", month: "short" });
/** "1 Nov", with the year only when it is not this year's */
const dayLabel = (iso: string, nowMs: number) => {
  const t = Date.parse(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (!Number.isFinite(t)) return iso;
  const sameYear = new Date(t).getFullYear() === new Date(nowMs).getFullYear();
  return formatDate(new Date(t), sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
};

export interface QuickFoot {
  text: string;
  /** may answer with what to say next ("Undone.", or why it could not) */
  undo?: () => void | Promise<void | QuickFoot | null>;
}

/** What a delete takes with it — the destroy manifest's own counts, so the confirm cannot promise
 *  less than the cascade removes. */
export interface DeleteFacts { queries: number; history: number; msTitle: string | null }

export interface AgentQuickViewProps {
  agent: Agent;
  facts: AgentFacts;
  /** the query the card speaks about (`cardQuery`) */
  q: QcRow | null;
  nowMs: number;
  msTitle: string | null;
  genreHit: (g: string) => boolean;
  /** the writer's own genres, so a stored id reads as its label (ruling 1) */
  personal?: PersonalGenre[];
  also: AlsoQueried[];
  /** committed notes, any order */
  notes: AgentNote[];
  packages: readonly SubmissionPackage[];
  /** the order ‹ › step through — absent, the arrows hide */
  sequence?: readonly string[];
  /** "direction of travel" for the body's slide, set by the host when it steps */
  slide: "l" | "r" | null;
  /** a message the host hands over (a save from the editor) */
  initialFoot?: QuickFoot | null;
  /** after a save, the parts that changed pulse once (the mock's map, lib/agentCard `savedPulse`) */
  pulse?: SavedPulse[];
  /** back from a journey the drawer SAVED (§6.1): the query section pulses — a new number each time,
   *  so a second save pulses again rather than leaving the first animation's class in place */
  queryPulse?: number;
  deleteFacts?: DeleteFacts | null;
  /** ⋯ → Delete agent…, once confirmed — absent, the menu offers no delete */
  onDelete?: () => Promise<void>;
  /** the menu's first item, when the card is open over a page other than the Contact list */
  showOpenInContactList: boolean;
  /** the sole writer — through commitAgentEdits (no activity, so an undo appends nothing) */
  write: (patch: AgentEditPatch) => Promise<boolean>;
  onStep: (dir: 1 | -1) => void;
  onEdit: (tab: AgentCardTab, focus?: AgentCardField) => void;
  onClose: () => void;
  /** a primary or secondary button; resolves to a foot message when the act stays on the card */
  onAct: (act: CardAct) => Promise<QuickFoot | null> | void;
  onOpenInContactList: () => void;
  /** resolves to whether the note landed */
  onAddNote: (text: string) => Promise<boolean>;
}

export const AgentQuickView: React.FC<AgentQuickViewProps> = ({
  agent, facts, q, nowMs, msTitle, genreHit, personal, also, notes, packages, sequence, slide, initialFoot = null,
  pulse, queryPulse = 0, deleteFacts = null, onDelete, showOpenInContactList, write, onStep, onEdit, onClose, onAct, onOpenInContactList,
  onAddNote,
}) => {
  const tone = queryTone(facts, q);
  const primary = primaryFor(facts, q);
  const where = whereLine(agent);
  const how = howLine(agent);
  const pos = seqPosition(sequence, agent.id);
  const site = hrefFor(agent.website ?? "");
  const email = (agent.email ?? "").trim();
  const mswl = mswlLinkOf(agent);
  const mats = useMemo(() => materialChips(agent.materialsWanted as string[] | undefined), [agent.materialsWanted]);
  /* the manuscript's genre first, ticked — the row's own order */
  const genres = useMemo(
    () => (agent.genres ?? []).map((g) => genreLabel(g, personal)).sort((a, b) => Number(genreHit(b)) - Number(genreHit(a))),
    [agent.genres, genreHit, personal],
  );
  const wish = (agent.mswlNotes ?? "").trim();
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)),
    [notes],
  );
  const latest = sortedNotes[0] ?? null;
  const rating = typeof agent.starRating === "number" ? agent.starRating : 0;

  /* ── the foot: one message at a time, six seconds, Undo where the act can be taken back ── */
  const [foot, setFoot] = useState<QuickFoot | null>(initialFoot);
  const footTimer = useRef<number>(0);
  const say = useCallback((f: QuickFoot | null) => {
    window.clearTimeout(footTimer.current);
    setFoot(f);
    if (f) footTimer.current = window.setTimeout(() => setFoot(null), 6000);
  }, []);
  useEffect(() => {
    if (initialFoot) footTimer.current = window.setTimeout(() => setFoot(null), 6000);
    return () => window.clearTimeout(footTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the handed-over message times out once
  }, []);

  /* ── the ⋯ menu ─────────────────────────────────────────────────────────────────────────── */
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || moreRef.current?.contains(t)) return;
      setMenu(false);
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [menu]);
  const menuItems: { key: string; label: string; run: () => void; danger?: boolean }[] = [];
  if (showOpenInContactList) menuItems.push({ key: "contacts", label: "Open in Contact list", run: onOpenInContactList });
  if (q) menuItems.push({ key: "qc", label: "Open in Query Centre", run: () => void onAct("qc") });
  if (email) {
    menuItems.push({
      key: "copy", label: "Copy email address",
      run: () => {
        const done = (ok: boolean) => say({ text: ok ? "Email address copied." : "Couldn’t copy the address." });
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(email).then(() => done(true), () => done(false));
        else done(false);
      },
    });
  }

  /* ── ⋯ → Delete agent…: the foot becomes the confirm (§7). With queries, their name is typed. ── */
  const [confirmDel, setConfirmDel] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const delName = (agent.name ?? "").trim() || (agent.agency ?? "").trim();
  const delHeavy = !!deleteFacts && deleteFacts.queries > 0;
  /* the mock's gate: the name as typed, case aside — through the house's own type-to-confirm */
  const delReady = !delHeavy || canDestroy(typed.toLowerCase(), delName.toLowerCase(), false);
  const openDelete = () => {
    window.clearTimeout(footTimer.current);
    setFoot(null);
    setTyped("");
    setConfirmDel(true);
  };
  if (onDelete) menuItems.push({ key: "delete", label: "Delete agent…", run: openDelete, danger: true });

  /* ── the note composer — composes in place, without the editor ─────────────────────────── */
  const [composing, setComposing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const saveNote = async () => {
    const t = noteText.trim();
    if (!t || savingNote) return;
    setSavingNote(true);
    const ok = await onAddNote(t);
    setSavingNote(false);
    /* a note that did not land keeps its words in the composer */
    if (!ok) { say({ text: "Couldn’t save the note. Try again." }); return; }
    setNoteText("");
    setComposing(false);
    say({ text: "Note saved." });
  };

  /* ── Escape: one handler, the cascade inside it ────────────────────────────────────────── */
  const state = useRef({ menu, composing, confirmDel, deleting });
  state.current = { menu, composing, confirmDel, deleting };
  useEscapeLayer(true, () => {
    if (state.current.deleting) return;
    if (state.current.menu) { setMenu(false); moreRef.current?.focus(); return; }
    if (state.current.composing) { setComposing(false); return; }
    if (state.current.confirmDel) { setConfirmDel(false); return; }
    onClose();
  }, ESC_LEVEL.card);

  /* ── the card's keys: E edits, ← → step — never in a field, and never reaching the page ─── */
  const keys = useRef({ onEdit, onStep, pos });
  keys.current = { onEdit, onStep, pos };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (matchesShortcut(SHORTCUTS.cardEdit, e)) {
        e.preventDefault(); e.stopImmediatePropagation();
        keys.current.onEdit("who");
      } else if (keys.current.pos && matchesShortcut(SHORTCUTS.cardPrev, e)) {
        e.preventDefault(); e.stopImmediatePropagation();
        keys.current.onStep(-1);
      } else if (keys.current.pos && matchesShortcut(SHORTCUTS.cardNext, e)) {
        e.preventDefault(); e.stopImmediatePropagation();
        keys.current.onStep(1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  /* replay a one-shot animation on an element WITHOUT remounting it — a remount would take focus
     off the star or the stamp a keyboard user just pressed */
  const replay = (el: HTMLElement | null, cls: string) => {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  /* ── the stars: save at once, Undo in the foot ─────────────────────────────────────────── */
  const starsRef = useRef<HTMLSpanElement>(null);
  const rate = async (n: number) => {
    const prev = typeof agent.starRating === "number" ? agent.starRating : null;
    const next = n === rating ? null : n;
    if (!(await write({ starRating: next }))) { say({ text: "Couldn’t save the rating. Try again." }); return; }
    replay(starsRef.current, "pop");
    say({
      text: next ? `Rated ${next} star${next > 1 ? "s" : ""}.` : "Rating cleared.",
      undo: async () => { await write({ starRating: prev }); },
    });
  };

  /* ── the wishlist stamp ─────────────────────────────────────────────────────────────────── */
  const stampRef = useRef<HTMLSpanElement>(null);
  const markChecked = async () => {
    const prev = agent.mswlCheckedAt ?? null;
    if (!(await write({ mswlCheckedAt: new Date(nowMs).toISOString() }))) { say({ text: "Couldn’t save that. Try again." }); return; }
    replay(stampRef.current, "stamped");
    say({ text: "Wishlist marked as checked today.", undo: async () => { await write({ mswlCheckedAt: prev }); } });
  };

  const act = async (a: CardAct) => {
    const f = await onAct(a);
    if (f) say(f);
  };

  const name = agentPrimary(agent);
  const showAgency = !!(agent.name ?? "").trim() && !!(agent.agency ?? "").trim();

  return (
    <>
      <div className="ac-band" data-ac="band">
        {pos && (
          <span className="ac-nav">
            <button type="button" className="ac-ib" data-ac="prev" aria-label="Previous agent" title="Previous (←)" disabled={pos.index <= 0} onClick={() => onStep(-1)}>‹</button>
            <span className="ac-cnt" data-ac="count">{pos.index + 1} of {pos.total}</span>
            <button type="button" className="ac-ib" data-ac="next" aria-label="Next agent" title="Next (→)" disabled={pos.index >= pos.total - 1} onClick={() => onStep(1)}>›</button>
          </span>
        )}
        <span className="sp" />
        <span ref={starsRef} className="ac-stars" title="Your rating" data-ac="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={n <= rating ? "on" : undefined} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={n <= rating} onClick={() => void rate(n)}>★</button>
          ))}
        </span>
        <button type="button" className="ac-ib" data-ac="edit" aria-label="Edit" title="Edit (E)" onClick={() => onEdit("who")}>{ICO.pen}</button>
        {menuItems.length > 0 && (
          <button ref={moreRef} type="button" className="ac-ib" data-ac="more" aria-label="More" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>⋯</button>
        )}
        <button type="button" className="ac-ib" data-ac="close" aria-label="Close" title="Close (Esc)" onClick={onClose}>✕</button>
      </div>

      {menu && (
        <div ref={menuRef} className="ac-menu" role="menu" data-ac="menu">
          {menuItems.map((m, i) => (
            <React.Fragment key={m.key}>
              {m.danger && i > 0 && <hr />}
              <button type="button" role="menuitem" className={m.danger ? "del" : undefined} data-ac={`menu-${m.key}`} onClick={() => { setMenu(false); m.run(); }}>{m.label}</button>
            </React.Fragment>
          ))}
        </div>
      )}

      <div key={agent.id} className={`ac-body${slide ? ` slide-${slide}` : ""}`} data-ac="body">
        <div className={`acq-head${pulse?.includes("head") ? " ac-pulse" : ""}`} data-ac="head">
          <span className="acq-ini" aria-hidden="true">{agentInitials(agent)}</span>
          <div className="acq-id">
            <h3 id="ac-name">{name}</h3>
            {showAgency && <div className="acq-agy">{agent.agency.trim()}</div>}
            <div className="acq-mt" data-ac="where">
              {where.flag && <span className={where.flag} aria-hidden="true" />}
              {[where.place, where.reply].filter(Boolean).join(" · ")}
            </div>
            {how && <div className="acq-mt" data-ac="how">{how}</div>}
            <div className="acq-links" data-ac="links">
              {site
                ? <a href={site} target="_blank" rel="noreferrer">{ICO.web}Website</a>
                : <button type="button" className="miss" data-ac="add-website" onClick={() => onEdit("who", "website")}>+ Website</button>}
              {email
                ? <a href={`mailto:${email}`} title={email}>{ICO.mail}Email</a>
                : <button type="button" className="miss" data-ac="add-email" onClick={() => onEdit("who", "email")}>+ Email</button>}
              {mswl && <a href={mswl} target="_blank" rel="noreferrer">{ICO.list}MSWL</a>}
            </div>
          </div>
        </div>

        <div key={`q${queryPulse}`} className={`acq-q${queryPulse ? " ac-pulse" : ""}`} data-tone={tone.tone} data-ac="q">
          <div className="acq-qh">
            <span className="acq-chip" data-ac="tone">{tone.label}</span>
            {/* the title sits beside the chip, not at the far edge — the mock's spacer has no rule */}
            {msTitle && <small>{msTitle}</small>}
          </div>
          {q ? <QueriedBlock q={q} nowMs={nowMs} primary={primary} packages={packages} onAct={act} /> : (
            <div className="acq-qrow">
              <span className="acq-qtx">
                {facts.door === "closed"
                  ? (agent.reopensOn ?? "").trim()
                    ? <>Their door is closed until <b>{dayLabel(agent.reopensOn!.trim(), nowMs)}</b>.</>
                    : "Their door is closed, reopening not announced."
                  : msTitle ? "You haven’t queried them for this book." : "You haven’t queried them yet."}
              </span>
              <button type="button" className="ac-btn sm" data-ac="primary" data-act={primary.act} onClick={() => void act(primary.act)}>{primary.label}</button>
            </div>
          )}
          {also.map((x) => (
            <div key={x.title} className="acq-other" data-ac="also">Also queried for <i>{x.title}</i> · {x.status}, {x.when}</div>
          ))}
        </div>

        <div className={`acq-s${pulse?.includes("genres") ? " ac-pulse" : ""}`} data-ac="s-genres">
          <h4 className="acq-lab">Genres sought</h4>
          {genres.length ? (
            <div className="acq-gch">
              {genres.map((g) => <span key={g} className={genreHit(g) ? "hit" : undefined}>{g}</span>)}
            </div>
          ) : <Torn text="Not recorded" clv="torn-genres" onAdd={() => onEdit("want", "genres")} />}
        </div>

        <div className="acq-s" data-ac="s-wishlist">
          <h4 className="acq-lab">
            Manuscript wishlist
            {wish && (
              <span ref={stampRef} className="acq-stamp" data-ac="stamp" title="When you last looked at their wishlist">
                {wishStamp(agent.mswlCheckedAt, nowMs)}
                <button type="button" data-ac="mark-checked" aria-label="Mark as checked today" onClick={() => void markChecked()}>✓ mark checked</button>
              </span>
            )}
          </h4>
          {wish ? <p className="acq-wish">{wish}</p> : <Torn text="No wishlist yet" clv="torn-wishlist" onAdd={() => onEdit("want", "wishlist")} />}
        </div>

        <div className="acq-s" data-ac="s-materials">
          <h4 className="acq-lab">Materials requested</h4>
          {mats.length ? (
            <div className="acq-mats">
              {mats.map((m) => <span key={`${m.kind}-${m.label}`} className="acq-mat">{ICO[m.kind]}{m.label}</span>)}
            </div>
          ) : <Torn text="Not recorded" clv="torn-materials" onAdd={() => onEdit("want", "materials")} />}
        </div>

        <div className="acq-s" data-ac="s-notes">
          <h4 className="acq-lab">
            Your notes
            {sortedNotes.length > 1 && (
              <button type="button" className="acq-more" data-ac="all-notes" onClick={() => onEdit("notes")}>{sortedNotes.length} notes</button>
            )}
          </h4>
          {latest && (
            <div className="acq-note" data-ac="latest-note">
              <p>{latest.text}</p>
              {Date.parse(latest.createdAt) ? <time>{dmy(Date.parse(latest.createdAt))}</time> : null}
            </div>
          )}
          <div className="acq-compose" data-ac="compose">
            {composing ? (
              <>
                <textarea
                  className="ac-in" value={noteText} autoFocus placeholder="Add a note…" aria-label="A note about this agent"
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void saveNote(); } }}
                />
                <div className="acq-cbtn">
                  <button type="button" className="ac-btn gh sm" onClick={() => setComposing(false)}>Cancel</button>
                  <button type="button" className="ac-btn sm" data-ac="save-note" disabled={!noteText.trim() || savingNote} onClick={() => void saveNote()}>Save note</button>
                </div>
              </>
            ) : (
              <button type="button" className="ac-mini" data-ac="open-compose" onClick={() => setComposing(true)}>
                {latest ? "+ Add a note" : "+ Add your first note"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`ac-foot${foot || confirmDel ? " on" : ""}${confirmDel ? " warn" : ""}`} data-ac="foot" role="status">
        <div>
          {confirmDel ? (
            <>
              <span className="msg" data-ac="delete-ask">
                {delHeavy ? (
                  <>Delete <b>{delName}</b>? {deleteFacts!.queries === 1 && deleteFacts!.msTitle
                    ? <>Their query for <i>{deleteFacts!.msTitle}</i></>
                    : <>Their {deleteFacts!.queries} quer{deleteFacts!.queries === 1 ? "y" : "ies"}</>}
                  {" "}and {deleteFacts!.history} history entr{deleteFacts!.history === 1 ? "y" : "ies"} go too. Type their name to confirm.</>
                ) : (
                  <>Delete <b>{delName}</b> from your Contact list? No queries go with them.</>
                )}
              </span>
              {delHeavy && (
                <input
                  className="ac-in ac-confirm-in" data-ac="delete-name" value={typed} placeholder={delName} autoComplete="off" autoFocus
                  aria-label={`Type ${delName} to confirm`} onChange={(e) => setTyped(e.target.value)}
                />
              )}
              <button type="button" className="ac-btn gh sm" data-ac="delete-cancel" disabled={deleting} onClick={() => setConfirmDel(false)}>Cancel</button>
              <button
                type="button" className="ac-btn sm danger" data-ac="delete-go" disabled={!delReady || deleting}
                onClick={async () => { if (!onDelete || !delReady) return; setDeleting(true); await onDelete(); }}
              >Delete</button>
            </>
          ) : foot && (
            <>
              <span className="tick" aria-hidden="true">✓</span>
              <span className="msg">{foot.text}</span>
              {foot.undo && (
                <button
                  type="button" className="ac-btn gh sm" data-ac="undo"
                  onClick={async () => { const u = foot.undo!; say(null); const next = await u(); if (next) say(next); }}
                >Undo</button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

const Torn: React.FC<{ text: string; clv: string; onAdd: () => void }> = ({ text, clv, onAdd }) => (
  <span className="ac-torn" data-ac={clv}>
    {text} <button type="button" className="ac-mini" onClick={onAdd}>Add</button>
  </span>
);

/** The section for a queried agent: where it stands now, what comes next, the button by stage,
 *  and the steps under a disclosure. */
const QueriedBlock: React.FC<{
  q: QcRow;
  nowMs: number;
  primary: ReturnType<typeof primaryFor>;
  packages: readonly SubmissionPackage[];
  onAct: (a: CardAct) => void;
}> = ({ q, nowMs, primary, packages, onAct }) => {
  const [open, setOpen] = useState(false);
  const now = nowLine(q);
  const next = nextLine(q, nowMs);
  const trail = trailOf(q);
  return (
    <>
      <div className="acq-now" data-ac="now">
        <span className="acq-dot"><StatusDot status={now.status as QueryStatus} overrideSize={14} /></span>
        <b>{now.label}</b>
        <time>{now.when}</time>
      </div>
      <div className="acq-qrow">
        <span className={`acq-qtx${next?.over ? " late" : ""}`} data-ac="next">{next?.text ?? ""}</span>
        {primary.secondary && (
          <button type="button" className="ac-btn gh sm" data-ac="secondary" data-act={primary.secondary.act} onClick={() => onAct(primary.secondary!.act)}>{primary.secondary.label}</button>
        )}
        <button type="button" className={`ac-btn sm${primary.ghost ? " gh" : ""}`} data-ac="primary" data-act={primary.act} onClick={() => onAct(primary.act)}>{primary.label}</button>
      </div>
      <button type="button" className="acq-hist" data-ac="hist" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        History · {trail.length} step{trail.length === 1 ? "" : "s"} <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="acq-histbody" data-ac="histbody">
          <div className="acq-sent">
            <span><SentChip q={q.query} packages={packages} /></span>
            <SentBox q={q.query} packages={packages} />
          </div>
          <ul className="acq-trail" data-ac="trail">
            {trail.map((s, i) => (
              <li key={`${s.status}-${i}`} className={s.current ? "cur" : undefined}>
                <span className="acq-dot"><StatusDot status={s.status} overrideSize={14} /></span>
                <span>{s.label}</span>
                <time>{s.when}</time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};
