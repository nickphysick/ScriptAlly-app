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
import React from "react";
import { addDays } from "../../../lib/queryActions/dates";
import { nudgeAnswers, nudgeDayWord, nudgeHawkLine } from "../../../lib/todoNudgeDesk";
import { stageVars, type WsTask } from "../../../lib/todoWs";
import type { Stage } from "../../../lib/stageColours";
import { DatePick, DeskTiles } from "./WsControls";
import type { NudgeDesk } from "./wsFlows";

const MENTOR = "/images/todo/mentor.webp";

export const WsNudgeDesk: React.FC<{ t: WsTask; nd: NudgeDesk; today: Date; stage: Stage | null }> = ({ t, nd, today, stage }) => {
  const first = nd.facts.first;
  const answers = nudgeAnswers(today, nd.when === "other" ? nd.picked : null);
  return (
    <div className="twn-desk" data-twn="desk">
      <div className="tws-mnote twn-hawk" data-tws="hawk" data-twn="hawk" data-tws58-stage={stage ?? undefined} style={stageVars(stage, t.query?.status) as React.CSSProperties | undefined}>
        <img src={MENTOR} alt="" /><p>{nudgeHawkLine(nd.facts)}</p>
      </div>
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
