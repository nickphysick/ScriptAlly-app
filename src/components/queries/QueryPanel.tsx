/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryPanel — the detail slide-over. One query, over the grid it came from.
 *
 * ⚠️ IT DERIVES NOTHING. Every figure arrives as `facts` (from `cardFacts`) or as an explicit prop;
 * the rungs arrive already built. A panel that re-derived a date or a status would be a second
 * answer to a question the card behind it has already answered, and the two would drift.
 *
 * ⚠️ THE BAND IS THE CARD'S OWN LADDER TOKEN. The root carries `qcc--s-{stage}` — the same class
 * the card wears — so `--band-a` resolves to the same value on both. This is the surface
 * `query-tint-ladder.md` names third and pass 2 measured as painting no ladder token at all.
 *
 * ⚠️ ACTIONS CALL OUT, THEY DO NOT IMPLEMENT. Record response, Mark sent, Record decision, Nudge,
 * Mark closed, the correction fork — all of them are surfaces that already exist. This file knows
 * which one to ask for and nothing about what any of them does.
 */
import React, { useEffect, useRef, useState } from "react";
import "./queryCard.css";
import "./queryPanel.css";
import { StatusDot } from "../StatusDot";
import { IlloSlot } from "./IlloSlot";
import { queryVerbs } from "../../lib/queryRowFacts";
import { createPortal } from "react-dom";
import type { CardFacts } from "../../lib/queryCardFacts";
import type { QueryStatus } from "../../types";

/**
 * ⚠️ THE TAB PERSISTS PER SESSION, NOT PER QUERY AND NOT PER ACCOUNT. A reader stepping ←/→
 * through queries on the Agent tab is comparing agents; snapping each new query back to Tracking
 * would undo the comparison on every step. sessionStorage, not localStorage — "last used" is a
 * fact about this sitting, and next week's visit starts at Tracking like the brief says.
 */
export type PanelTab = "tracking" | "agent" | "notes";
const TAB_KEY = "sa.qpnTab";
const readTab = (): PanelTab => {
  try {
    const v = sessionStorage.getItem(TAB_KEY);
    return v === "agent" || v === "notes" ? v : "tracking";
  } catch { return "tracking"; }
};


/** Form mode's whole contract — the page owns every fact; the drawer owns none of them. */
export interface PanelFormProps {
  /** `Your {nth} query for {manuscript}` — N = existing count + 1, counted by the page. */
  nth: number;
  manuscriptTitle: string;
  /** The three tick marks: Agent · Date · Materials. */
  ticks: { agent: boolean; date: boolean; materials: boolean };
  /** The Playfair read-back sentence (or its placeholder) — built by the page. */
  sentence: React.ReactNode;
  canSave: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  onSaveAnother: () => void;
  body: React.ReactNode;
}

/** the stage FAMILY — the illustration key: out / in / offer / closed (drawer-3 §3) */
/** ⚠️ THE ILLUSTRATION KEY IS THE STATE ITSELF NOW (colours v2). It used to fold the eight-rung
 *  ladder into four families; five flat states ARE the families, so the fold is gone rather than
 *  rewritten — one fewer mapping between the status and the picture. */
export type StateArtKey = "queried" | "agent" | "you" | "offer" | "closed";

/** One artwork per stage family. EMPTY until the illustrator delivers — adding an entry here is
 *  the whole change (`out: <PlaneArt />`); the slot drops its placeholder chrome by itself. */
const STATE_ART: Partial<Record<StateArtKey, React.ReactNode>> = {};

export interface QueryPanelProps {
  open: boolean;
  /**
   * ⚠️ FORM MODE REPLACES THE BODY, NOT THE DRAWER (log-sheet run, §1). One aside, two modes:
   * `detail` is everything below; `form` widens to 660px, swaps the top bar for the sheet's title
   * + tick progress, drops the band/identity/tabs entirely, and pins the read-back footer. A
   * second drawer component would be a second Escape, a second scrim and a second width to keep
   * in step — the exact drift the tabs rebuild just removed.
   */
  mode?: "detail" | "form";
  form?: PanelFormProps;
  facts: CardFacts;
  status: QueryStatus;
  name: string;
  agency: string;
  initials: string;
  sentLabel: string;
  viaLabel: string;
  manuscriptTitle?: string | null;
  /** Mono `{genre} · {words} words`, beside the title on the header's manuscript line. */
  manuscriptMeta?: string | null;
  /**
   * `Version 2 · Mar 2026`, right-aligned on the manuscript line — ONLY when the query records a
   * sent version (manuscriptHeld, falling back to the package's opening read). Absent = omitted:
   * a version label on a query that never named one would state a fact nobody recorded.
   */
  versionLabel?: string | null;
  /** `3 OF 44` — position in the CURRENT filtered/sorted order. */
  position: { index: number; total: number } | null;
  primaryLabel: string;
  /**
   * §1 (respond-nudge run) — the handlers receive their BUTTON, because the desk notches to it.
   * `liveAction` marks which button the desk is currently open on: it wears the accent ring, the
   * same `--stage-accent` every desk surface reads.
   */
  onPrimary?: (anchor: HTMLElement) => void;
  onNudge?: (anchor: HTMLElement) => void;
  liveAction?: "primary" | "nudge" | "closed" | "snooze" | null;
  /** §2 (correction pass 3): carries the clicked control so the desk can notch to it. */
  onMarkClosed?: (anchor: HTMLElement) => void;
  /**
   * ⚠️ SNOOZE IS A FOURTH VERB, NOT A SECOND NUDGE (§4.5). Nudging writes a Nudged rung and hands
   * the writer a draft; snoozing moves the reminder and records nothing. Merging them would make
   * one control mean "chase them" and "don't chase them yet" depending on a sub-choice, which is
   * how a verb row stops being readable. Same availability as Nudge — a query with nobody to
   * chase has no reminder to move.
   */
  onSnooze?: (anchor: HTMLElement) => void;
  onClose: () => void;
  onStep: (delta: 1 | -1) => void;
  /** The two trays: elapsed, and the expected reply. */
  elapsed: { value: string; unit: string; caption: string };
  expectedLabel: string;
  /**
   * ⚠️ THE REMINDER CLAUSE, WORD FOR WORD FROM THE ROW'S OWN CAPTION (§4.2) — passed in rather
   * than rebuilt, because this is the same sentence the list states and two spellings of one
   * fact is how the drawer and the list come to disagree about when you asked to be reminded.
   * Absent where the query carries no reminder clause; a control only where Snooze is offered.
   */
  reminderLabel?: string | null;
  /**
   * ⚠️ THE TABS' BODIES ARRIVE AS NODES, BUILT BY THE PAGE. The Tracking tab is the shared
   * QueryTimeline with the page's own correction/nudge/record wiring; building it in here would
   * mean threading fifteen handlers through this component to a renderer that already exists.
   * The drawer owns WHICH tab shows and nothing about what any tab does.
   */
  tracking: React.ReactNode;
  agentTab?: React.ReactNode;
  notesTab?: React.ReactNode;
  noteCount: number;
}

const Icon: React.FC<{ d: string; size?: number; stroke?: string; width?: number }> = ({ d, size = 13, stroke = "currentColor", width = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const QueryPanel: React.FC<QueryPanelProps> = ({
  open, mode = "detail", form,
  facts, status, name, agency, initials, sentLabel, viaLabel,
  manuscriptTitle, manuscriptMeta, versionLabel,
  position, primaryLabel, onPrimary, onNudge, liveAction = null, onMarkClosed, onSnooze, onClose, onStep,
  elapsed, expectedLabel, reminderLabel, tracking, agentTab, notesTab, noteCount,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<PanelTab>(readTab);
  const pickTab = (t: PanelTab) => {
    setTab(t);
    try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private windows: the default is fine */ }
  };

  /**
   * ⚠️ ESCAPE AND THE ARROWS ARE BOUND WHILE OPEN AND ONLY WHILE OPEN, and both skip an editable.
   * The panel sits over a page that owns its own keys; a listener that outlived the open state
   * would swallow Escape for whatever the reader opened next.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      if (typing) return;
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      /* stepping between queries is a DETAIL gesture — mid-form it would discard nothing and
         confuse everything, so the arrows are simply not bound there */
      if (mode === "form") return;
      if (e.key === "ArrowRight") { e.preventDefault(); onStep(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); onStep(-1); }
    };
    window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onStep]);

  const stepper = (delta: 1 | -1, d: string, label: string) => (
    <button type="button" className="qpn-icb" aria-label={label}
      disabled={!position || position.total < 2} onClick={() => onStep(delta)}>
      <Icon d={d} size={14} width={2.2} />
    </button>
  );

  /* ⚠️ ONE PREDICATE (v14 §3). The label lived in the page and the two gates lived here — two
     files deciding what a row offers. `queryVerbs` is that decision, and the list imports it. */
  const verbs = queryVerbs(facts.turn);

  return (
    <>
      {/**
        * ⚠️ THE SCRIM PORTALS TO THE BODY (v14 §4), for the reason the desk already learned: a
        * `position: fixed` element inside a transformed ancestor is CONTAINED by it, and this page
        * has transforms above the drawer (the stage's enter animation among them). Inside the
        * tree it covered the content and left the rail and the masthead lit — which reads as the
        * drawer belonging to the page rather than sitting over the whole app.
        *
        * It stays a button so a pointer AND a keyboard can dismiss it.
        */}
      {typeof document !== "undefined"
        ? createPortal(
            <button type="button" className="qpn-scrim" data-on={open} aria-label="Close query" tabIndex={-1} onClick={onClose} />,
            document.body,
          )
        : null}
      <aside
        ref={panelRef}
        /* ⚠️ THE LADDER CLASS IS THE CARD'S — same class, same `--band-a`, so the two cannot
           disagree about the colour of one query. */
        className={`qpn qcc--st-${facts.state}${mode === "form" ? " qpn--wide qpn--form" : ""}`}
        data-on={open}
        data-qpn-mode={mode}
        data-qpn-state={facts.state}
        aria-hidden={!open}
        aria-label={mode === "form" ? "Logging new query" : `${name}, ${agency}`}
      >
        {mode === "form" && form ? (
          <>
            {/* ══ FORM MODE — the sheet's own chrome; NONE of the detail actions ══ */}
            <div className="qpn-bar qpn-fbar">
              <span className="qpn-quill" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2e3a2c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 4c-6 0-11 4-13 10l-3 6 6-3c6-2 10-7 10-13z" /><path d="M7 14l-3 6" /></svg>
              </span>
              <div className="qpn-ftt">
                <h2>Logging new query</h2>
                <div className="qpn-fnth">Your {form.nth}{form.nth % 10 === 1 && form.nth !== 11 ? "st" : form.nth % 10 === 2 && form.nth !== 12 ? "nd" : form.nth % 10 === 3 && form.nth !== 13 ? "rd" : "th"} query for {form.manuscriptTitle}</div>
              </div>
              <span className="qpn-spacer" />
              <div className="qpn-ticks" aria-label="Progress">
                {([["agent", "Agent"], ["date", "Date"], ["materials", "Materials"]] as const).map(([k, l]) => (
                  <span key={k} className={form.ticks[k] ? "qpn-tick qpn-tick--ok" : "qpn-tick"}>
                    <i aria-hidden="true">{form.ticks[k] ? "✓" : ""}</i>{l}
                  </span>
                ))}
              </div>
              <button type="button" className="qpn-icb" aria-label="Close" onClick={form.onCancel}>
                <Icon d="M18 6L6 18M6 6l12 12" size={14} width={2.2} />
              </button>
            </div>
            <div className="qpn-inner">
              <div className="qpn-body qpn-fbody">{form.body}</div>
            </div>
            <div className="qpn-ffoot">
              <div className="qpn-fsent">{form.sentence}</div>
              <div className="qpn-fbtns">
                <span className="qpn-esc" aria-hidden="true">esc</span>
                <button type="button" className="qpn-fb qpn-fb--ghost" onClick={form.onCancel}>Cancel</button>
                <button type="button" className="qpn-fb qpn-fb--text" disabled={!form.canSave || form.saving} onClick={form.onSaveAnother}>Save &amp; log another</button>
                <button type="button" className="qpn-fb qpn-fb--go" disabled={!form.canSave || form.saving} onClick={form.onSave}>Save query</button>
              </div>
            </div>
          </>
        ) : (
        <>
        <div className="qpn-bar">
          {stepper(-1, "M15 6l-6 6 6 6", "Previous query")}
          {stepper(1, "M9 6l6 6-6 6", "Next query")}
          {position && <span className="qpn-pos">{position.index + 1} of {position.total}</span>}
          <span className="qpn-spacer" />
          {/* ⚠️ NAVIGATION ONLY (v14 §3). The verbs moved to the foot of the stage block, beneath
              the manuscript line — where they sit on the query's own colour, beside the sentence
              that says what it needs, rather than in a bar that is about moving between records. */}
          <button type="button" className="qpn-icb" aria-label="Close" onClick={onClose}>
            <Icon d="M18 6L6 18M6 6l12 12" size={14} width={2.2} />
          </button>
        </div>

        <div className="qpn-inner">
          <div className="qpn-band">
            <StatusDot status={status} overrideSize={28} />
            <span className="qpn-word">{status}</span>
            <span className="qpn-turn">{facts.turnWord}</span>
          </div>

          <div className="qpn-head">
            <span className="qpn-avatar" aria-hidden="true">{initials}</span>
            <div className="qpn-headtx">
              <div className="qpn-nm">{name}</div>
              <div className="qpn-ag">{agency}</div>
            </div>
            {/* §3 (drawer-3) — the stage-family illustration slot: one image per FAMILY (out / in /
                offer / closed), keyed off the same stage the band wears. STAGE_ART holds the
                artwork when it exists; until then the slot renders the ref's named placeholder.
                The Sent/via caption sits beneath it, absolute in the same reserved column. */}
            <IlloSlot className="qpn-illo" name={`state-specific · ${facts.state}`}
              width={130} height={78} art={STATE_ART[facts.state]} />
          </div>

          {/**
            * ⚠️ THE MANUSCRIPT LINE LIVES IN THE HEADER, ONCE. It used to sit inside the Tracking
            * section, which made it a fact about the timeline rather than about the query — and it
            * vanished with the tab. Here it is true on every tab, and the assertion that the title
            * appears EXACTLY once in the drawer is what keeps a second copy from creeping back.
            */}
          {manuscriptTitle && (
            <div className="qpn-ms">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth="1.8" aria-hidden="true"><path d="M4 19V5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zm0 0a2 2 0 012-2h13" /></svg>
              <span className="qpn-mst">{manuscriptTitle}</span>
              {manuscriptMeta && <span className="qpn-msm">{manuscriptMeta}</span>}
              {versionLabel && <span className="qpn-msv">{versionLabel}</span>}
            </div>
          )}

          {/**
            * ⚠️ THE VERB ROW, ON THE STAGE BLOCK'S OWN GROUND (v14 §3). It closes the block rather
            * than sitting in the navigation bar: the verbs are about THIS query, and the bar is
            * about which query you are looking at. The `Sent / via` caption comes with them,
            * right-aligned on the same line, because it is the one fact that belongs to the act
            * rather than to the identity.
            *
            * ⚠️ THE VERBS ARE `queryVerbs`', NOT THIS COMPONENT'S. The primary's label, the
            * agent-side Nudge gate and the open-row Mark-closed gate lived here while the label
            * itself lived in the page — two files deciding one thing. One predicate now, and the
            * list's action grid imports the same one.
            */}
          {(onPrimary || onNudge || onSnooze || onMarkClosed) && (
            <div className="qpn-verbs">
              {onPrimary && verbs.primary.enabled && (
                <button type="button" className={`qpn-act qpn-act--pink${liveAction === "primary" ? " qpn-act--live" : ""}`}
                  onClick={(e) => onPrimary(e.currentTarget)}>{primaryLabel || verbs.primary.label}</button>
              )}
              {onNudge && verbs.nudge && (
                <button type="button" className={`qpn-act${liveAction === "nudge" ? " qpn-act--live" : ""}`}
                  onClick={(e) => onNudge(e.currentTarget)}>Nudge</button>
              )}
              {onSnooze && verbs.nudge && (
                <button type="button" className={`qpn-act${liveAction === "snooze" ? " qpn-act--live" : ""}`}
                  onClick={(e) => onSnooze(e.currentTarget)}>Snooze</button>
              )}
              {/* ⚠️ `Close`, NOT `Mark closed` (§4.5). "Mark" is the vocabulary of the composing
                  verbs — Mark sent records what you did — and this one asks a question and takes
                  one answer. The row now reads as four verbs rather than three and a phrase. */}
              {onMarkClosed && verbs.markClosed && (
                <button type="button" className={`qpn-act${liveAction === "closed" ? " qpn-act--live" : ""}`}
                  onClick={(e) => onMarkClosed(e.currentTarget)}>Close</button>
              )}
              <div className="qpn-snt">Sent {sentLabel}<br />via {viaLabel}</div>
            </div>
          )}

          <div className="qpn-tabs" role="tablist" aria-label="Query detail">
            {(["tracking", "agent", "notes"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`qpn-tab${tab === t ? " qpn-tab--on" : ""}`}
                onClick={() => pickTab(t)}
              >
                {t === "tracking" ? "Tracking" : t === "agent" ? "Agent" : "Notes"}
                {/* the count pill omits itself at zero — "0 notes" is a sentence about nothing */}
                {t === "notes" && noteCount > 0 && <span className="qpn-tabn">{noteCount}</span>}
              </button>
            ))}
          </div>

          <div className="qpn-body">
            {tab === "tracking" && (
              <>
                <div className="qpn-stats">
                  <div className="qpn-stat">
                    <Icon d="M12 7v5l3 2" stroke="#8a9e88" width={1.8} size={15} />
                    <div>
                      <div className="qpn-big">{elapsed.value}<span>{elapsed.unit}</span></div>
                      <div className="qpn-cap">{elapsed.caption}</div>
                    </div>
                  </div>
                  <div className="qpn-stat">
                    <Icon d="M3 9h18M8 3v4M16 3v4" stroke="#c98f78" width={1.8} size={15} />
                    <div>
                      <div className="qpn-big">{expectedLabel}</div>
                      <div className="qpn-cap">reply expected by</div>
                      {/* the third anchor's second half — the same popover the verb row's Snooze
                          opens, reached by pressing the phrase that states the date */}
                      {reminderLabel && onSnooze && verbs.nudge && (
                        <button
                          type="button" className="qpn-snz"
                          onClick={(e) => onSnooze(e.currentTarget)}
                        >{reminderLabel}</button>
                      )}
                    </div>
                  </div>
                </div>
                {/* ⚠️ STRAIGHT ON PARCHMENT — no frame, no band. The timeline is the tab. */}
                <div className="qpn-track">{tracking}</div>
                <div className="qpn-hint">← → move between queries · esc closes</div>
              </>
            )}
            {tab === "agent" && <div className="qpn-agent">{agentTab}</div>}
            {tab === "notes" && <div className="qpn-notes">{notesTab}</div>}
          </div>
        </div>
        </>
        )}
      </aside>
    </>
  );
};
