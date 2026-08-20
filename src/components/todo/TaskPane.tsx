/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskPane — THE PORT of `design-refs/todo-materials-contract.html`'s pane.
 *
 * ⚠️ THE MARKUP IS THE MOCKUP'S, ELEMENT FOR ELEMENT. `.v` → `.fc` → `.rim` → `.band` + `.tiles`,
 * then `.workrow` as a SIBLING holding `.fc > .rim > .act` and `.fc > .rim > .tl-*`. Class names
 * are the mockup's words; nothing is renamed, nothing is added, and no class from the retired
 * `TodoDock` appears anywhere in this file.
 *
 * ⚠️ THE PROP CONTRACT IS THE MOCKUP'S OWN `DATA` SHAPE. Its render reads
 * `{cls, deed, sub, btns, tiles, actTitle, actSub, body, will, quiet, prim, tl}` and so
 * does this. That is what stops the structure bending to suit the data: a journey supplies those
 * fields or it supplies null, and `null` is what the hidden tile row and the hidden timeline card
 * are FOR. Nothing here branches on a task type.
 *
 * ⚠️ THE BAND'S FIGURE IS GONE, NOT HIDDEN (pane round, Phase 2). The materials contract drew a
 * Playfair numeral on the right of the band; the pane contract's band is deed + sub + arrows, and
 * nothing renders a figure. So `fig`/`figU` are deleted rather than left as props with no reader —
 * the whole chain went with them (`PanePresence.figure`, `JourneyInputs.figure`, `.bandfig`), which
 * is the sweep the retirement asks for rather than four dead symbols in four files. The FIGURE
 * ITSELF still reaches the reader: it is the list row's right-hand fragment, which is where the
 * "two panes read as one page" rule always wanted it.
 *
 * ⚠️ BEHAVIOUR IS CARRIED, PRESENTATION IS NOT. The callbacks below are the retired pane's
 * contracts — the completion path, snooze, dismiss, open query, task navigation — and nothing else
 * crossed over: no styles, no layout, no markup.
 */
import React from "react";
import "./taskPane.css";

/** One rung of the mockup's `tl` array: `['', 'Query sent', '3 Jun · via email']`. */
export interface TaskPaneEvent {
  key: string;
  /** the mockup's own four kinds — `''` outgoing · `in` incoming · `minor` quiet · `now` terminus */
  kind: "" | "in" | "minor" | "now";
  /** `.tl-e .t` — what happened */
  t: string;
  /** `.tl-e .d` — when, and how, in the mono beneath */
  d: string;
}

/** One cell of the mockup's `tiles` array: `['Send to', '<a>Jonathan Marsh</a>', 'j.marsh@…']`. */
export interface TaskPaneTile {
  /** `.tile .k` */
  k: string;
  /** `.tile .val` — or, when absent, the mono `.val.absent` the mockup states absence in */
  val: React.ReactNode;
  /** `.tile .val small` — the second line, where there is one */
  small?: React.ReactNode;
  /** renders `.val.absent`: the mockup's own grammar for a fact the record does not hold */
  absent?: boolean;
}

/**
 * The mockup's `DATA[task]`, as a type. A journey fills this in; the pane renders it.
 */
export interface TaskPaneJourney {
  /** `u-now` · `u-house` · `u-yours` — the band's paper, set on `.v` exactly as the mockup does */
  cls: "u-now" | "u-house" | "u-yours";
  /** `.deed` — may carry an `<em>`, which the mockup renders burgundy italic */
  deed: React.ReactNode;
  /** `.deed.hand` — the Caveat variant a note's own words are written in */
  hand?: boolean;
  /** `.b-sub` */
  sub: React.ReactNode;
  /** `.bandbtns` — the mockup's `btns` array, in order */
  btns?: { label: string; onPress: (anchor: HTMLElement) => void }[];
  /** `.tiles.n{N}` — `null` hides the row, as the mockup's render does */
  tiles: TaskPaneTile[] | null;
  /** `.act h3` */
  actTitle: string;
  /** `.act .sub` */
  actSub: React.ReactNode;
  /** the journey's own fields, between the sub-line and `.acts` */
  body: React.ReactNode;
  /** `.willrec b` — what pressing the primary will write */
  will: React.ReactNode;
  /** `.b-quiet` */
  quiet?: { label: string; onPress: () => void };
  /** `.b-primary` */
  prim: string;
  /** disables `.b-primary` — the mockup styles the state, so the pane can offer it */
  primDisabled?: boolean;
  /** the timeline card — `null` hides it, and the workrow drops to one column */
  tl: TaskPaneEvent[] | null;
  /** `.tl-foot a` */
  onOpenQuery?: () => void;
  /** ⚠️ THE ACTION BAR'S VERBS, on the pane because that is where the open task is (Phase 1/2).
   *  Absent means the journey does not offer it — the button is not rendered rather than disabled,
   *  because "this task cannot be snoozed" and "nothing is selected" are different sentences. */
  onSnooze?: (anchor: HTMLElement) => void;
  onDismiss?: () => void;
}

export interface TaskPaneProps {
  journey: TaskPaneJourney;
  onPrimary: () => void;
  /** carried behaviour: where you are in the queue, and how to move */
  nav?: { index: number; total: number; label: string; onPrev: () => void; onNext: () => void };
}

/**
 * ⚠️ THE MOCKUP COUNTS ENTRIES EXCLUDING THE TERMINUS — `d.tl.filter(e => e[0] !== 'now').length`.
 * Ported rather than reasoned about: "3 entries" beside a rail whose last rung is "Your turn" is a
 * count of things that happened, and the terminus is not one of them.
 */
const entryCount = (tl: TaskPaneEvent[]): number => tl.filter((e) => e.kind !== "now").length;

export const TaskPane: React.FC<TaskPaneProps> = ({ journey: d, onPrimary, nav }) => {
  return (
    <div className="tpn">
      {/* ⚠️ THE COUNTER ROW IS GONE AND ITS HEIGHT WENT TO THE PANE (pane round, Phase 1). It said
          "TASK 11 OF 14 · YOUR TASKS" above the card — a number the list's own footer already
          states, spending ~40px to hold the pane's top edge below the list's. The arrows survive,
          in the band, where the contract puts them; the count does not survive at all, because the
          one that mattered is beside the rows it counts. */}
      {/* ⚠️ ONE CARD, THREE ZONES (pane round, Phase 2) — the pane contract's chassis, which
          supersedes the materials contract's card-in-card. That drew `.v` → `.fc` → `.rim` around
          the band, then a `.workrow` of two more framed cards; this draws a fixed band, a middle
          that scrolls, and an action bar pinned to the foot. The rims went with it. */}
      <div className={`pane ${d.cls}`}>
        <div className="band">
          <div style={{ minWidth: 0 }}>
            <div className={d.hand ? "deed hand" : "deed"}>{d.deed}</div>
            <div className="b-sub">{d.sub}</div>
          </div>
          {/* ⚠️ THE ARROWS LIVE HERE, not in a counter row above the card — Phase 1's retirement. */}
          {nav && (
            <div className="b-nav">
              <button type="button" onClick={nav.onPrev} aria-label="Previous task">‹</button>
              <button type="button" onClick={nav.onNext} aria-label="Next task">›</button>
            </div>
          )}
        </div>

        {/* ⚠️ ABSENT, NOT EMPTY, WHERE A JOURNEY HAS NOTHING TO SUMMARISE. The bulk journey has no
            single query behind it, so it renders no tile row at all rather than a row of dashes. */}
        {d.tiles && d.tiles.length > 0 && (
          <div className="tiles">
            {d.tiles.map((t, i) => (
              <div className="tile" key={`${t.k}-${i}`}>
                <div className="k">{t.k}</div>
                {t.absent
                  ? <div className="v absent">{t.val}</div>
                  : <div className="v">{t.val}{t.small && <small>{t.small}</small>}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ⚠️ THE ONLY SCROLLING ELEMENT IN THE PANE. `flex: 1 1 auto; min-height: 0; overflow-y:
            auto` — the band above and the bar below are `flex: 0 0 auto`, so a long form scrolls
            between them and never takes the primary off screen. */}
        <div className="mid">
          <div className="formcol">
            {d.actTitle && <div className="f-h">{d.actTitle}</div>}
            {d.actSub && <div className="f-sub">{d.actSub}</div>}
            {d.body}
          </div>
          {d.tl && (
            <div className="storycol">
              <div className="story">
                {d.tl.map((e) => (
                  <div className={e.kind ? `tl-e ${e.kind}` : "tl-e"} key={e.key}>
                    <span className="dot" />
                    <div className="t">{e.t}</div>
                    <div className="d">{e.d}</div>
                  </div>
                ))}
                {d.onOpenQuery && (
                  <div className="tl-foot">
                    <a href="#" onClick={(ev) => { ev.preventDefault(); d.onOpenQuery?.(); }}>
                      Open the full query →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ⚠️ THE ACTION BAR IS FIXED, and it is where Snooze and Dismiss live now — they act on
            the OPEN TASK, and this is where the open task is. The will-record strip states the
            actual values the primary will write, so the button is never the only description of
            what pressing it does. */}
        <div className="actbar">
          <span className="willrec">Will record: <b>{d.will}</b></span>
          {d.onSnooze && (
            <button type="button" className="ab quiet"
              onClick={(e) => d.onSnooze?.(e.currentTarget)}>Snooze</button>
          )}
          {d.onDismiss && (
            <button type="button" className="ab quiet" onClick={d.onDismiss}>Dismiss</button>
          )}
          <button type="button" className="ab go" disabled={d.primDisabled} onClick={onPrimary}>
            {d.prim}
          </button>
        </div>
      </div>
    </div>
  );
};
