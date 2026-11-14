/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v156 §3 (design-refs/query-centre-v156.html) — THE COLLAPSED HEADER. Once the navy panel has scrolled
 * out from under the top of the scroll area, a slim 60px bar takes its place: "26 queries sent" and "for Murphy's Day
 * Out" on the left; "2 of 3 this week", the streak (hidden at 0) and a navy "+ Log a query" on the right. "Record a
 * response" is not in it.
 *
 * ⚠️ THE CONTACT LIST'S SLIM ROW'S READER AND OFFSET (shell/slimReveal, extracted from ContactSlimRow): the same moment
 *    (the panel's foot passing under the bar's line) and the same `--pin-cover` written on the list's columns
 *    (`.qc153-cl`), so the toolbar pins directly under the bar and the Views panel 14px under the toolbar. `extra` is
 *    the toolbar strip's 12px (its top is `--pin-cover` − 12, qcv154.css §6).
 * ⚠️ IT TAKES NO SPACE: sticky at the root's top with its own height given back in a negative margin, so the page at
 *    rest is exactly as it was. Its ground reaches the sheet's full width (`--qc156-bl` / `--qc156-br`, measured);
 *    its content stays inset to the page content's edges.
 * ⚠️ HIDDEN IS INERT: `inert` and `aria-hidden` while it is not shown, so its button is not in the Tab order.
 */
import React, { useLayoutEffect, useRef } from "react";
import { streakWords, type WeekGoal154 } from "../../../lib/qc154goal";
import { useSlimReveal } from "../../shell/slimReveal";
import { FIRST_TITLE_155 } from "../../../lib/qc155";
import { sentTitle } from "./QcHeader1531";
import { FLAME_156 } from "./QcLine156";
import "./qcv156.css";

const header = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > [data-qc1531='header']");
const cover = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > .qc153-cl");

export const QcSlim156: React.FC<{
  sent: number;
  /** the manuscript in scope, or none */
  ms: string | null;
  goal: WeekGoal154 | null;
  onLog: () => void;
  logDisabled?: boolean;
}> = ({ sent, ms, goal, onLog, logDisabled = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useSlimReveal(ref, { header, cover, extra: 12 });
  /* the ground's reach: from the page content's edges out to the scroller's (the sheet's) */
  useLayoutEffect(() => {
    const row = ref.current;
    const sc = row?.closest<HTMLElement>(".wpg-scroll");
    if (!row || !sc) return undefined;
    const put = () => {
      const r = row.getBoundingClientRect(), s = sc.getBoundingClientRect();
      row.style.setProperty("--qc156-bl", `${Math.max(0, r.left - s.left)}px`);
      row.style.setProperty("--qc156-br", `${Math.max(0, s.left + sc.clientWidth - r.right)}px`);
    };
    put();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(put);
    ro?.observe(sc);
    window.addEventListener("resize", put);
    return () => { ro?.disconnect(); window.removeEventListener("resize", put); };
  }, []);
  return (
    <div ref={ref} className="qc156-slim" data-qc156="slim" data-shown={shown ? "" : undefined}
      inert={!shown || undefined} aria-hidden={!shown || undefined}>
      <p className="qc156-st">
        <b data-qc156="slim-title">{sent === 0 ? FIRST_TITLE_155 : sentTitle(sent)}</b>
        {ms ? <i data-qc156="slim-for">for {ms}</i> : null}
      </p>
      <div className="qc156-sa">
        {goal ? <>
          <span className="qc156-sw" data-qc156="slim-week"><b>{goal.now} of {goal.goal}</b><em>this week</em></span>
          {!goal.empty && goal.streak > 0 ? <span className="qc156-sk" data-qc156="slim-streak">{FLAME_156}{streakWords(goal.streak)}</span> : null}
        </> : null}
        <button type="button" className="qc156-sb" data-qc156="slim-log" disabled={logDisabled} onClick={onLog}>+ Log a query</button>
      </div>
    </div>
  );
};
