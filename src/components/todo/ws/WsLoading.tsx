/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do load v1 (design-refs/todo-load-v1/todo-load-v1.html, "Load: New", "Outline: Still") — THE TO-DO PAGE WHILE
 * ITS TASKS ARRIVE. The clock and the phases are lib/todoLoad (pure); this runs the clock and draws:
 *   · the tray's outline — two heading bars and six rows (a 32px disc, two lines, a figure stub);
 *   · the desk's outline — the title in its navy bar, the hawk's bubble, the first question and its tiles, the two later
 *     steps, and the card's frame, band, name and three bubbles;
 *   · "Still loading your tasks." under the tabs (from 3s), and the failed state in the tray (from 5s, or an error).
 * ⚠️ BUILT FROM THE REAL COMPONENTS' OWN CLASSES (`.tws-ti`, `.tws-av`, `.tws-tx`, `.tws-du`, `.tws-gbw`/`.tws-gb`,
 *    `.tws-wh`, `.tws-wbody`/`.tws-wcol`/`.tws-wq`, `.tws-mnote`, `.tws-rail`/`.tws-st`/`.tws-sn`, `.tws-tiles`,
 *    `.tws-wp`), so its rows, discs, paddings and columns are the loaded page's and cannot drift from them. Only the bars
 *    are new (todoWsLoad.css). Every outline is aria-hidden: the workspace says "Loading your tasks" once, politely.
 * ⚠️ STILL: no shimmer, no pulse (R8).
 */
import React, { useEffect, useRef, useState } from "react";
import { TODO_LOAD, todoLoadClock, type TodoLoadClock, type TodoLoadState } from "../../../lib/todoLoad";
import "./todoWsLoad.css";

/** the copy, exactly as ruled (R6, R7) — the only words this adds */
export const LOAD_WORDS = {
  live: "Loading your tasks",
  still: "Still loading your tasks.",
  failed: "Your tasks didn’t load.",
  failedSub: "Check your connection, then try again.",
  again: "Try again",
} as const;

export interface TodoLoad extends TodoLoadState {
  /** true for `TODO_LOAD.fadeInMs` after the tasks land over an outline that was shown (R5); never after a blank */
  entering: boolean;
  restart: () => void;
}

/** the load's phase for this mount: `ready` the tasks are in, `failed` a read this page needs has failed */
export function useTodoLoad(ready: boolean, failed: boolean, hold: number | null): TodoLoad {
  const [state, setState] = useState<TodoLoadState>(() => ({ phase: ready && hold == null ? "loaded" : "blank", still: false }));
  const clock = useRef<TodoLoadClock | null>(null);
  const shown = useRef(false);
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    const c = todoLoadClock(setState, { ready, failed, hold });
    clock.current = c;
    setState(c.get());
    return () => { c.dispose(); clock.current = null; };
  }, [hold]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { clock.current?.setReady(ready); }, [ready]);
  useEffect(() => { clock.current?.setFailed(failed); }, [failed]);
  /* the loaded page fades in over the outline — only when there was an outline to fade over */
  useEffect(() => {
    if (state.phase === "outline" || state.phase === "failed") shown.current = true;
    if (state.phase !== "loaded" || !shown.current) return undefined;
    shown.current = false;
    setEntering(true);
    const t = window.setTimeout(() => setEntering(false), TODO_LOAD.fadeInMs);
    return () => window.clearTimeout(t);
  }, [state.phase]);
  return { ...state, entering, restart: () => clock.current?.restart() };
}

/** a still bar (on cream: the shared skeleton colour; `on="navy"`: white at 13%) */
const Bar: React.FC<{ k: string; on?: "navy"; block?: boolean }> = ({ k, on, block }) => (
  <i className="twl-b" data-twl={k} data-on={on} data-block={block ? "" : undefined} />
);

/** one tray row's outline, on the real row's grid */
const Row: React.FC = () => (
  <div className="tws-ti twl-row" data-twl="row">
    <span className="tws-av twl-disc" />
    <span className="tws-tx"><Bar k="t1" /><Bar k="t2" /></span>
    <span className="tws-du"><Bar k="fig" /></span>
  </div>
);
const Head: React.FC<{ k: string }> = ({ k }) => (
  <div className="tws-gbw twl-gbw"><div className="tws-gb twl-gb"><Bar k={k} /><span className="tws58-rule" /></div></div>
);

/** the tray's outline: two heading bars and six rows (R4) */
export const TrayOutline: React.FC<{ on: boolean }> = ({ on }) => (
  <div className="twl-out" data-twl-out="tray" data-on={on ? "" : undefined} aria-hidden="true">
    <Head k="h1" /><Row /><Row /><Row />
    <Head k="h2" /><Row /><Row /><Row />
  </div>
);

/** one line under the tabs from 3s (R6) */
export const TrayStill: React.FC = () => <p className="twl-still" data-twl="still">{LOAD_WORDS.still}</p>;

/** the failed state, in the tray: two lines and one filled navy button (R7) */
export const TrayFailed: React.FC<{ onRetry: () => void; busy?: boolean }> = ({ onRetry, busy }) => (
  <div className="twl-err" data-twl="failed" role="alert">
    <h3>{LOAD_WORDS.failed}</h3>
    <p>{LOAD_WORDS.failedSub}</p>
    <button type="button" className="twl-again" data-twl="again" disabled={busy} onClick={onRetry}>{LOAD_WORDS.again}</button>
  </div>
);

/** the desk while loading: its navy bar at once (R2); the outline inside it from 150ms (R4) */
export const DeskOutline: React.FC<{ on: boolean }> = ({ on }) => (
  <div className="tws-wsx twl-desk" data-twl-out="desk" data-on={on ? "" : undefined} aria-hidden="true">
    <div className="tws-wh" data-band="wait">
      <h2 className="twl-in"><Bar k="dtitle" on="navy" /></h2>
      <span className="tws-sp" />
      <span className="twl-in"><Bar k="nav" on="navy" /><Bar k="nav" on="navy" /></span>
    </div>
    <div className="tws-wbody">
      <div className="tws-wcol">
        <div className="tws-wq twl-in">
          <div className="tws-mnote twl-mnote"><Bar k="hawk" /><Bar k="bubble" block /></div>
          <ol className="tws-rail">
            <li className="tws-st tws-q" data-st="open">
              <span className="tws-sn twl-sn" />
              <div className="tws-sx"><Bar k="qh" /><Bar k="hint" />
                <div className="tws-qbody"><div className="tws-tiles twl-tiles"><Bar k="tile" block /><Bar k="tile" block /><Bar k="tile" block /></div></div></div>
            </li>
            <li className="tws-st" data-st="todo"><span className="tws-sn twl-sn" /><div className="tws-sx"><Bar k="step2" /></div></li>
            <li className="tws-st" data-st="todo"><span className="tws-sn twl-sn" /><div className="tws-sx"><Bar k="step3" /></div></li>
          </ol>
        </div>
      </div>
      <div className="tws-wp twl-in">
        <div className="twl-card" data-twl="card">
          <Bar k="band" block />
          <div className="twl-cwho"><span className="twl-cdisc" /><span><Bar k="cname" /><Bar k="cagency" /></span><Bar k="cpill" block /></div>
          <Bar k="cms" block />
          <div className="twl-ctabs"><Bar k="ctab" /><Bar k="ctab" /><Bar k="ctab" /><Bar k="ctab" /></div>
          <Bar k="bub1" block /><Bar k="bub2" block /><Bar k="bub3" block />
        </div>
      </div>
    </div>
  </div>
);
