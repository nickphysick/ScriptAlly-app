/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v1 (design-refs/todo-nudge-desk-v1/) — THE DESKTOP NUDGE DESK: one step. The hawk's line, the sentence
 * "I nudged {First} ___." and three clean answers (Today, Yesterday, Another day, each with its day and a number key);
 * "Another day" opens the app's own date picker. Once a day is picked: the day fills the sentence and one quiet line
 * says what happens. Nothing is saved here: the footer's Log it runs the flow's own commit (`saveNudgeSent`).
 * The words and shapes are lib/todoNudgeDesk's (pure, locked).
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { addDays } from "../../../lib/queryActions/dates";
import { nudgeAnswers, nudgeDayWord, nudgeHawkLine } from "../../../lib/todoNudgeDesk";
import { stageVars, type WsTask } from "../../../lib/todoWs";
import type { Stage } from "../../../lib/stageColours";
import { DatePick, DeskTiles } from "./WsControls";
import type { NudgeDesk } from "./wsFlows";

const MENTOR = "/images/todo/mentor.webp";
const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

export const WsNudgeDesk: React.FC<{ t: WsTask; nd: NudgeDesk; today: Date; stage: Stage | null }> = ({ t, nd, today, stage }) => {
  const first = nd.facts.first;
  const answers = nudgeAnswers(today, nd.when === "other" ? nd.picked : null);
  /* Phase 3 — THE HAWK FOLDS AWAY on the first pick (0.34s: it fades and lifts over the first 45%, then its height closes,
     so the sentence glides up into its place) and stays gone while the task is open. This desk is keyed by the task, so
     the hawk is back when the task is opened again. Reduced motion: it is simply not drawn once a day is picked. */
  const [hawk, setHawk] = useState<"shown" | "folding" | "gone">("shown");
  const hawkRef = useRef<HTMLDivElement>(null);
  const [hawkH, setHawkH] = useState(0);
  useLayoutEffect(() => {
    if (!nd.when || hawk !== "shown") return;
    if (reducedMotion()) { setHawk("gone"); return; }
    setHawkH(hawkRef.current?.offsetHeight ?? 0);
    setHawk("folding");
  }, [nd.when, hawk]);
  const stageStyle = stageVars(stage, t.query?.status) as Record<string, string> | undefined;
  return (
    <div className="twn-desk" data-twn="desk">
      {hawk === "gone" ? null : (
        <div ref={hawkRef} className={hawk === "folding" ? "tws-mnote twn-hawk twn-bye" : "tws-mnote twn-hawk"} data-tws="hawk" data-twn="hawk" data-twn-hawk={hawk}
          data-tws58-stage={stage ?? undefined} style={{ ...(stageStyle ?? {}), ...(hawk === "folding" ? { "--twn-h": `${hawkH}px` } : {}) } as React.CSSProperties}
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) setHawk("gone"); }}>
          <img src={MENTOR} alt="" /><p>{nudgeHawkLine(nd.facts)}</p>
        </div>
      )}
      <p className="twn-sent" data-twn="sentence">I nudged {first}{" "}
        {nd.picked ? <><u data-twn="day">{nudgeDayWord(nd.picked, today)}</u>.</> : <span className="twn-blank" aria-label="a day, not picked yet" />}
      </p>
      <div className="twn-chs" role="radiogroup" aria-label={`When did you nudge ${first}?`} data-twn="answers">
        {answers.map((a) => (
          <button key={a.k} type="button" className="twn-ch" role="radio" aria-checked={nd.when === a.k} data-twn-when={a.k}
            onClick={() => nd.pick(a.k)}>
            <b>{a.title}</b><small>{a.sub}</small><kbd aria-hidden="true">{a.key}</kbd>
          </button>
        ))}
      </div>
      {nd.when === "other" ? (
        /* the app's own picker, as the date question uses it (past); outside the desk's tile context, so it is the strip
           and the month, not a second Today / Yesterday */
        <div className="twn-other" data-twn="other">
          <DeskTiles.Provider value={false}>
            <DatePick value={nd.picked ?? addDays(today, -2)} today={today} dir="past" onPick={(d) => nd.pick("other", d)} />
          </DeskTiles.Provider>
        </div>
      ) : null}
      {nd.picked ? <p className="twn-quiet" data-twn="quiet">It goes on {first}’s card and this task leaves your list.</p> : null}
    </div>
  );
};
