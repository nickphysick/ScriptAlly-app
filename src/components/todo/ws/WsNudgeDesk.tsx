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
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { addDays } from "../../../lib/queryActions/dates";
import { nudgeAnswers, nudgeDayWord, nudgeHawkLine, nudgeTimeline, type TimelineShape } from "../../../lib/todoNudgeDesk";
import { stageVars, type WsTask } from "../../../lib/todoWs";
import type { Stage } from "../../../lib/stageColours";
import { DatePick, DeskTiles } from "./WsControls";
import type { NudgeDesk } from "./wsFlows";

const MENTOR = "/images/todo/mentor.webp";
/** the timeline's arrival, from the pick to the close-it label's fade (1.40s + 0.30s), rounded up */
const ARRIVAL_MS = 1800;
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
  /* Phase 4: the timeline's arrival plays once, the first time a day is picked on this task (this desk is keyed by it).
     Held as state for the sequence's length (1.6s, rounded up), so a re-render meanwhile never cuts it short, and a
     later change of day only moves the marker. Before paint (a layout effect), so the card never shows unarrived. */
  const entered = useRef(false);
  const [entering, setEntering] = useState(false);
  const enterTimer = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!nd.picked || entered.current) return;
    entered.current = true;
    if (reducedMotion()) return;
    setEntering(true);
    enterTimer.current = window.setTimeout(() => setEntering(false), ARRIVAL_MS);
  }, [nd.picked]);
  useEffect(() => () => { if (enterTimer.current) window.clearTimeout(enterTimer.current); }, []);
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
      {/* Phase 4 — nothing until a day is picked; then the updated timeline, centred in the room left above the footer */}
      <div className="twn-tlwrap" data-twn="tlwrap">
        {nd.picked ? <NudgeTimeline first={first} shape={nudgeTimeline(nd.facts, nd.picked, nd.then, today)} stageStyle={stageStyle} stage={stage} enter={entering} /> : null}
      </div>
    </div>
  );
};

/**
 * Phase 4 — THE UPDATED TIMELINE, ON A BANDED CARD. A white card, its head a band in the query's stage colour (the card
 * head's own, `stageVars`), "{First}'s updated timeline". The line is to scale (lib/todoNudgeDesk `nudgeTimeline`): solid
 * from the send to the expected date, hatched to the nudge, dashed to the close-it date. It arrives once, as one
 * sequence (`twn-enter`, todoNudgeDesk.css); a later change of day moves the marker and the dashed run (0.45s ease).
 */
const NudgeTimeline: React.FC<{ first: string; shape: TimelineShape; stageStyle: Record<string, string> | undefined; stage: Stage | null; enter: boolean }> = ({ first, shape: s, stageStyle, stage, enter }) => {
  const pc = (n: number) => `${n}%`;
  return (
    <div className={enter ? "twn-tl twn-enter" : "twn-tl"} data-twn="timeline" data-tws58-stage={stage ?? undefined} style={stageStyle as React.CSSProperties | undefined}>
      <h5 className="twn-band" data-twn="band">{first}’s updated timeline</h5>
      <div className="twn-line" data-twn="line">
        <span className="twn-seg twn-s1" style={{ left: pc(s.solid.from), width: pc(s.solid.to - s.solid.from) }} />
        {s.hatch ? <span className="twn-seg twn-s2" style={{ left: pc(s.hatch.from), width: pc(s.hatch.to - s.hatch.from) }} /> : null}
        <span className="twn-seg twn-s3" style={{ left: pc(s.dashed.from), width: pc(s.dashed.to - s.dashed.from) }} />
        <span className="twn-p twn-p-start" data-twn-pt="start" style={{ left: pc(s.start.x) }} />
        <span className="twn-l twn-dn twn-lft" data-twn-lab="start" style={{ left: pc(s.start.x) }}>{s.start.label}<b>{s.start.date}</b></span>
        {s.due ? <>
          <span className="twn-p twn-p-due" data-twn-pt="due" style={{ left: pc(s.due.x) }} />
          <span className="twn-l twn-dn" data-twn-lab="due" style={{ left: pc(s.due.x) }}>{s.due.label}<b>{s.due.date}</b></span>
        </> : null}
        {s.hatch ? <span className="twn-l twn-up twn-ago" data-twn-lab="ago" style={{ left: pc((s.hatch.from + s.hatch.to) / 2) }}><i>No reply for {s.hatch.ago}</i></span> : null}
        <span className="twn-p twn-nud" data-twn-pt="nudge" style={{ left: pc(s.nudge.x) }} />
        <span className="twn-l twn-dn twn-nw" data-twn-lab="nudge" style={{ left: pc(s.nudge.x) }}>You nudged<b>{s.nudge.date}</b></span>
        <span className="twn-p twn-fut" data-twn-pt="close" style={{ left: pc(s.close.x) }} />
        <span className="twn-l twn-up twn-end" data-twn-lab="close" style={{ left: `calc(${pc(s.close.x)} + 8px)` }}>If nothing by then<b>{s.close.date}, close it?</b></span>
      </div>
    </div>
  );
};
