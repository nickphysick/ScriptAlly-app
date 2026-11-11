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
  /** Phone round two v1 (2B): To-do left the tab bar; the sheet keeps a door to the page */
  onTodo?: () => void;
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
        {doors.onTodo ? <button type="button" className="pa-chip" data-pa="plus-todo" onClick={go(doors.onTodo)}>{PI.todo}Your to-do list</button> : null}
      </div>
    </MobileSheet>
  );
};
