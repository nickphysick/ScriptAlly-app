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
 * `{cls, deed, sub, fig, figU, btns, tiles, actTitle, actSub, body, will, quiet, prim, tl}` and so
 * does this. That is what stops the structure bending to suit the data: a journey supplies those
 * fields or it supplies null, and `null` is what the `.nofig` modifier and the hidden timeline card
 * are FOR. Nothing here branches on a task type.
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
  /** `.bandfig .n` — `null` puts `.nofig` on the band, which is the mockup's own handling */
  fig: string | null;
  /** `.bandfig .u` */
  figU?: string;
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
  const fig = d.fig;
  return (
    <div className="tpn">
      {/* ⚠️ THE COUNTER ROW IS GONE AND ITS HEIGHT WENT TO THE PANE (pane round, Phase 1). It said
          "TASK 11 OF 14 · YOUR TASKS" above the card — a number the list's own footer already
          states, spending ~40px to hold the pane's top edge below the list's. The arrows survive,
          in the band, where the contract puts them; the count does not survive at all, because the
          one that mattered is beside the rows it counts. */}
      <div className={`v ${d.cls}`}>
        <div className="fc">
          <div className="rim">
            <div className={fig ? "band" : "band nofig"}>
              <div>
                <div className={d.hand ? "deed hand" : "deed"}>{d.deed}</div>
                <div className="b-sub">{d.sub}</div>
              </div>
              <div>
                {fig && (
                  <div className="bandfig">
                    <div className="n">{fig}</div>
                    <div className="u">{d.figU}</div>
                  </div>
                )}
                <div className="bandbtns">
                  {(d.btns ?? []).map((b) => (
                    <button key={b.label} type="button" className="b-onband"
                      onClick={(e) => b.onPress(e.currentTarget)}>{b.label}</button>
                  ))}
                  {/* ⚠️ THE ARROWS, IN THE BAND — the contract's 28px squares. They moved here from
                      the retired counter row: navigation belongs beside the thing it navigates. */}
                  {nav && (
                    <>
                      <button type="button" className="navsq" onClick={nav.onPrev}
                        aria-label="Previous task">‹</button>
                      <button type="button" className="navsq" onClick={nav.onNext}
                        aria-label="Next task">›</button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ⚠️ `n{N}` FROM THE COUNT, exactly as the mockup's render sets it. */}
            {d.tiles && d.tiles.length > 0 && (
              <div className={`tiles n${d.tiles.length}`}>
                {d.tiles.map((t, i) => (
                  <div className="tile" key={`${t.k}-${i}`}>
                    <div className="k">{t.k}</div>
                    {t.absent
                      ? <div className="val absent">{t.val}</div>
                      : <div className="val">{t.val}{t.small && <small>{t.small}</small>}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ⚠️ A SIBLING OF THE HEADER CARD, never a descendant — the whole of the contract's
            structure, and the one thing a reader can check at a glance. */}
        <div className="workrow">
          <div className="fc"><div className="rim">
            <div className="act">
              {/* ⚠️ NO HEADING ELEMENT WHEN THERE IS NO HEADING. Nudge has nothing to fill in, so
                  an empty `h3` would leave a gap where a question should be. */}
              {d.actTitle && <h3>{d.actTitle}</h3>}
              <div className="sub">{d.actSub}</div>
              {d.body}
              <div className="acts">
                <span className="willrec">Will record: <b>{d.will}</b></span>
                {d.quiet && (
                  <button type="button" className="b-quiet" onClick={d.quiet.onPress}>{d.quiet.label}</button>
                )}
                <button type="button" className="b-primary" disabled={d.primDisabled} onClick={onPrimary}>
                  {d.prim}
                </button>
              </div>
            </div>
          </div></div>

          {d.tl && (
            <div className="fc"><div className="rim">
              <div>
                <div className="tl-head">
                  <span className="t">The story so far</span>
                  <span className="c">{entryCount(d.tl)} {entryCount(d.tl) === 1 ? "entry" : "entries"}</span>
                </div>
                <div className="tl-in">
                  <div className="tl">
                    {d.tl.map((e) => (
                      <div className={e.kind ? `tl-e ${e.kind}` : "tl-e"} key={e.key}>
                        <span className="dot" />
                        <div className="t">{e.t}</div>
                        <div className="d">{e.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {d.onOpenQuery && (
                  <div className="tl-foot">
                    <a href="#" onClick={(ev) => { ev.preventDefault(); d.onOpenQuery?.(); }}>
                      Open the full query →
                    </a>
                  </div>
                )}
              </div>
            </div></div>
          )}
        </div>
      </div>
    </div>
  );
};
