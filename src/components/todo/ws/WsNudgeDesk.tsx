/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v2 (design-refs/todo-nudge-desk-v2/) — THE DESKTOP NUDGE DESK, round the three things the writer
 * needs, top to bottom: it's overdue (the hawk beside one headline); you send the nudge yourself and confirm it ("I've
 * sent it"); tell us when (Today / Yesterday / Another day). Nothing folds, glides or moves position. Nothing is saved
 * here: the footer's Log it runs the flow's own commit (`saveNudgeSent`), enabled once both steps are done.
 * The words and shapes are lib/todoNudgeDesk's (pure, locked).
 */
import React from "react";
import { addDays } from "../../../lib/queryActions/dates";
import { nudgeAnswers, nudgeDayWord, shortDate } from "../../../lib/todoNudgeDesk";
import type { WsTask } from "../../../lib/todoWs";
import type { Stage } from "../../../lib/stageColours";
import { DatePick, DeskTiles } from "./WsControls";
import type { NudgeDesk } from "./wsFlows";

const MENTOR = "/images/todo/mentor.webp";
const TICK = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" /></svg>;
/** the answers' plain navy outline icons (no tile behind them): sun, history clock, calendar */
const ICON: Record<"today" | "yesterday" | "other", React.ReactNode> = {
  today: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></svg>,
  yesterday: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /><path d="M12 8v4l3 2" /></svg>,
  other: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>,
};

export const WsNudgeDesk: React.FC<{ t: WsTask; nd: NudgeDesk; today: Date; stage: Stage | null; otherOpen: boolean; setOtherOpen: (o: boolean) => void }> = ({ nd, today, otherOpen, setOtherOpen }) => {
  const first = nd.facts.first;
  const answers = nudgeAnswers(today, nd.when === "other" ? nd.picked : null);
  /* "Another day" opens the picker (the page holds whether it is open, so key 3 can open it); nothing changes until a
     day is set there */
  const choose = (k: "today" | "yesterday" | "other") => {
    if (!nd.sent) return;
    if (k === "other") { setOtherOpen(true); return; }
    setOtherOpen(false);
    nd.pick(k);
  };
  const s1 = nd.sent ? "done" : "on";
  const s2 = !nd.sent ? "off" : nd.picked ? "done" : "on";
  return (
    <div className="twn2" data-twn="desk">
      {/* 1 · it's overdue: the hawk beside one headline, no speech bubble */}
      <div className="twn2-ctx" data-twn="context">
        <img src={MENTOR} alt="" />
        <div><h2>{first}’s reply is <em>overdue</em>.</h2><p>Send a nudge, then log it below.</p></div>
      </div>

      {/* 2 and 3 · you send it yourself and confirm it; then tell us when */}
      <div className="twn2-steps" data-twn="steps">
        <div className="twn2-stp" data-st={s1} data-twn-step="send">
          <span className="twn2-num" aria-hidden="true">{nd.sent ? TICK : "1"}</span>
          <div className="twn2-tx"><b>Send {first} a nudge</b><small>From your own email, the way you sent the query: a short note asking if it reached them.</small></div>
          <button type="button" className={nd.sent ? "sp-btn sp-btn--fill twn2-sent" : "sp-btn sp-btn--line twn2-sent"} data-twn="sent" aria-pressed={nd.sent} onClick={nd.confirm}>
            {nd.sent ? <>{TICK}Sent</> : "I’ve sent it"}
          </button>
        </div>
        <div className="twn2-stp" data-st={s2} data-twn-step="when" aria-disabled={!nd.sent || undefined}>
          <span className="twn2-num" aria-hidden="true">{nd.picked ? TICK : "2"}</span>
          <div className="twn2-tx">
            <b>When did you send it?</b>
            {nd.picked ? <small data-twn="nudged">You nudged {first} <b>{nudgeDayWord(nd.picked, today)}</b>. Next reminder <b>{shortDate(nd.then)}</b>.</small> : null}
          </div>
          <span />
          <div className="twn2-chs" role="radiogroup" aria-label={`When did you send ${first} the nudge?`} data-twn="answers">
            {answers.map((a) => (
              <button key={a.k} type="button" className="twn2-ch" role="radio" aria-checked={nd.when === a.k} data-twn-when={a.k}
                disabled={!nd.sent} tabIndex={nd.sent ? 0 : -1} onClick={() => choose(a.k)}>
                <span className="twn2-ic">{ICON[a.k]}</span><b>{a.title}</b><small>{a.sub}</small>
              </button>
            ))}
          </div>
          {nd.sent && otherOpen ? (
            <div className="twn2-other" data-twn="other">
              <DeskTiles.Provider value={false}>
                <DatePick value={nd.when === "other" && nd.picked ? nd.picked : addDays(today, -2)} today={today} dir="past" onPick={(d) => { setOtherOpen(false); nd.pick("other", d); }} />
              </DeskTiles.Provider>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
