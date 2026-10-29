/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2, Part 1D — the shell's three phone sheets, all on `MobileSheet` (`pa`), all opening what already exists.
 *
 *  - THE + SHEET (ref v2.js `ovAction`, ACT C): "What happened?" — two big rows (I sent a query · An agent replied),
 *    then pills (Add an agent · Task or note · Import). Each door is today's: the log-a-query drawer, the record-a-
 *    response journey, the add-agent editor, the To-do composer, /import. Part 4 restyles the journeys themselves.
 *  - THE MENU (ref menuv.js `ovMenu`, MV B): behind your initials on every page. A navy head (your name, the plan line,
 *    the book chip), a grid of tiles with live lines, Help and tools, Account, Sign out and the sign-off. It replaces
 *    the "you" sheet; every row that sheet offered is still here (the report lists where).
 *  - THE BOOK SWITCHER (ref overlays.js `ovMs`): the writer's manuscripts, current then shelved as the sidebar's
 *    `BarSwitcher` lists them, writing the same key and re-routing as the desktop picker does, plus "Add a manuscript"
 *    marked coming soon during the beta.
 *
 * ⚠️ A TILE'S LINE IS AN EXISTING FIGURE OR NOTHING. Where the app already computes the number (Responses' replies,
 *    the book's word count, its comps) the tile states it; where it does not, the tile shows its name alone. Never a
 *    number this file invents.
 */
import React from "react";
import { MobileSheet } from "../shell/MobileSheet";
import { PI } from "./phoneIcons";
import { PHONE_ART } from "./phoneArt";
import { PhoneDisc } from "./PhoneDisc";
import { QueryStatus, type Manuscript } from "../../types";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { switcherMeta } from "../shell/BarSwitcher";

const Chev = () => <span className="pa-chev">{PI.chev}</span>;

/* ── the + sheet ─────────────────────────────────────────────────────────────────────────────── */

export interface PlusDoors {
  onSent: () => void;
  onReplied: () => void;
  onAgent: () => void;
  onTask: () => void;
  onImport: () => void;
}

export const PhonePlusSheet: React.FC<{ open: boolean; onClose: () => void; doors: PlusDoors }> = ({ open, onClose, doors }) => {
  const go = (f: () => void) => () => { onClose(); f(); };
  return (
    <MobileSheet open={open} onClose={onClose} ariaLabel="What happened?"
      pa={{ height: "auto", drag: false, z: 1000, bodyPadBottom: 100, className: "pa-plussheet", inertPage: false }}>
      <h2 className="pa-sht">What happened?</h2>
      <div className="pa-actrows">
        <button type="button" className="pa-actrow" data-pa="plus-sent" onClick={go(doors.onSent)}>
          <PhoneDisc status={QueryStatus.QUERIED} size={44} />
          <span className="pa-lt"><b>I sent a query</b><small>Log it in a few taps</small></span><Chev />
        </button>
        <button type="button" className="pa-actrow" data-pa="plus-replied" onClick={go(doors.onReplied)}>
          <PhoneDisc status={QueryStatus.FULL_REQUESTED} size={44} />
          <span className="pa-lt"><b>An agent replied</b><small>A request, a pass or an offer</small></span><Chev />
        </button>
      </div>
      <div className="pa-pills">
        <button type="button" className="pa-chip" data-pa="plus-agent" onClick={go(doors.onAgent)}>{PI.agents}Add an agent</button>
        <button type="button" className="pa-chip" data-pa="plus-task" onClick={go(doors.onTask)}>{PI.todo}Task or note</button>
        <button type="button" className="pa-chip" data-pa="plus-import" onClick={go(doors.onImport)}>{PI.upload}Import</button>
      </div>
    </MobileSheet>
  );
};

/* ── the menu ────────────────────────────────────────────────────────────────────────────────── */

export interface MenuTile {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** an existing figure, or null for the name alone */
  line: string | null;
  /** a route; null with `disabledLine` = present but not yet built */
  onOpen: (() => void) | null;
  disabledLine?: string;
}

export const PhoneMenu: React.FC<{
  open: boolean;
  onClose: () => void;
  name: string;
  initials: string;
  planLine: string;
  book: string | null;
  onBook: () => void;
  tiles: MenuTile[];
  onImport: () => void;
  onHelp: () => void;
  onFeedback: () => void;
  onSettings: () => void;
  onPlan: () => void;
  planChip: string | null;
  onSignOut: () => void;
}> = (p) => {
  const go = (f: () => void) => () => { p.onClose(); f(); };
  const head = (
    <>
      <div className="pa-me">
        <span className="pa-avring" aria-hidden="true">{p.initials}</span>
        <div className="pa-me-tx">
          <div className="pa-me-nm" data-pa="menu-name">{p.name}</div>
          <div className="pa-me-pl" data-pa="menu-plan">{p.planLine}</div>
        </div>
        <button type="button" className="pa-ring" aria-label="Close" onClick={p.onClose}>{PI.close}</button>
      </div>
      {p.book ? (
        <button type="button" className="pa-bchip" data-pa="menu-book" onClick={go(p.onBook)}>
          {PI.book}<span className="pa-mt">{p.book}</span>{PI.down}
        </button>
      ) : null}
    </>
  );
  return (
    <MobileSheet open={p.open} onClose={p.onClose} ariaLabel="Menu"
      pa={{ height: "94%", head, grabOnNavy: true, className: "pa-menu" }}>
      <div className="pa-mtiles" data-pa="menu-tiles">
        {p.tiles.map((t) => (
          <button key={t.key} type="button" className="pa-mtile" data-pa="menu-tile" data-key={t.key}
            disabled={!t.onOpen} onClick={t.onOpen ? go(t.onOpen) : undefined}>
            <span className="pa-mi">{t.icon}</span>
            <b>{t.label}</b>
            {t.onOpen ? (t.line ? <span className="pa-sub" data-pa="tile-line">{t.line}</span> : null)
              : <span className="pa-sub" data-pa="tile-line">{t.disabledLine}</span>}
          </button>
        ))}
      </div>
      <h3 className="pa-gl">Help and tools</h3>
      <div className="pa-group">
        <button type="button" className="pa-li" data-pa="menu-import" onClick={go(p.onImport)}><span className="pa-ico">{PI.upload}</span><span className="pa-lt">Import queries</span><Chev /></button>
        <button type="button" className="pa-li" data-pa="menu-help" onClick={go(p.onHelp)}><span className="pa-ico">{PI.help}</span><span className="pa-lt">Help centre</span><Chev /></button>
        <button type="button" className="pa-li" data-pa="menu-feedback" onClick={go(p.onFeedback)}><span className="pa-ico">{PI.chat}</span><span className="pa-lt">Send feedback</span><Chev /></button>
      </div>
      <h3 className="pa-gl">Account</h3>
      <div className="pa-group">
        <button type="button" className="pa-li" data-pa="menu-settings" onClick={go(p.onSettings)}><span className="pa-ico">{PI.gear}</span><span className="pa-lt">Settings</span><span className="pa-rt"><Chev /></span></button>
        <button type="button" className="pa-li" data-pa="menu-plan-row" onClick={go(p.onPlan)}><span className="pa-ico">{PI.card}</span><span className="pa-lt">Plan &amp; billing</span><span className="pa-rt">{p.planChip ? <span className="pa-lock" data-pa="founding-chip">{p.planChip}</span> : null}<Chev /></span></button>
      </div>
      <button type="button" className="pa-btn sec blk" style={{ marginTop: 20 }} data-pa="menu-signout" onClick={go(p.onSignOut)}>{PI.signout}Sign out</button>
      <div className="pa-msign" data-pa="menu-sign">
        <img src={PHONE_ART.mark.src} alt="" />
        <img className="wm" src={PHONE_ART.wordmark.src} alt="QueryHawk" />
        <span>Beta · made in the UK</span>
      </div>
    </MobileSheet>
  );
};

/* ── the book switcher ───────────────────────────────────────────────────────────────────────── */

export const PhoneBookSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  manuscripts: Manuscript[];
  activeId: string | null;
  onPick: (id: string) => void;
}> = ({ open, onClose, manuscripts, activeId, onPick }) => {
  /* current then shelved, as the sidebar's BarSwitcher lists them */
  const ordered = [...manuscripts.filter((m) => !isShelvedPresentation(m)), ...manuscripts.filter((m) => isShelvedPresentation(m))];
  return (
    <MobileSheet open={open} onClose={onClose} ariaLabel="Your manuscripts" pa={{ height: "auto", drag: false }}>
      <h2 className="pa-sht">Your manuscripts</h2>
      <div className="pa-group" data-pa="books">
        {ordered.map((m) => {
          const on = m.id === activeId;
          const meta = switcherMeta(m);
          return (
            <button key={m.id} type="button" className="pa-li" role="menuitemradio" aria-checked={on} data-pa="book" data-id={m.id}
              onClick={() => { onClose(); if (!on) onPick(m.id); }}>
              <span className="pa-ico">{PI.book}</span>
              <span className="pa-lt"><b style={{ fontWeight: 600 }}>{m.title}</b>{meta ? <span className="pa-lsub">{meta}</span> : null}</span>
              {on ? <span className="pa-rt" style={{ color: "var(--pa-navy)" }}>{PI.check}</span> : null}
            </button>
          );
        })}
        <div className="pa-li" style={{ opacity: 0.6, cursor: "default" }} data-pa="book-add">
          <span className="pa-ico">{PI.plus}</span><span className="pa-lt">Add a manuscript</span><span className="pa-lock">Coming soon</span>
        </div>
      </div>
      <p className="pa-sub" style={{ margin: "14px 4px 6px" }}>During the beta, QueryHawk tracks one manuscript per writer.</p>
    </MobileSheet>
  );
};
