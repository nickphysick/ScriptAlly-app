/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 §G — the two quiet states.
 *
 * NOTHING YET (no queries and no own tasks): no header card, no filters, no sheet. The navy panel with the Mentor,
 * "How it works" with one example task, and "Ways to get started" — built as the Query Centre's, Contact list's and
 * Packages' empty pages are (page-local copies of their values; a lift candidate).
 * ⚠️ THE EXAMPLE IS FIXED SAMPLE CONTENT. It is drawn, never written and never counted.
 *
 * ALL CAUGHT UP (an empty board, but queries): the armchair hawk, one fact line, "Query someone new", and on the
 * right "Coming up" (the next three dates a task lands) and "Done today".
 */
import React from "react";
import type { ClearedAct } from "../../../lib/todoCleared";
import type { Upcoming } from "../../../lib/todoTray";
import { dialFor } from "../../../lib/todoTray";
import { DoneToday, DueDial } from "./TrayDesk";

export const MENTOR_ART = "/images/dash/mentor-leaning.png";
export const ARMCHAIR_ART = "/images/make-querying-simple.png";

const exDial = (day: number, mon: string) => ({ kind: "late" as const, frac: 1, day, mon, ymd: "2000-01-01", title: "" });

export const TrayNothingYet: React.FC<{ msTitle: string | null; onLog: () => void; onImport: () => void; onAdd: () => void }> = ({ msTitle, onLog, onImport, onAdd }) => (
  <div className="td5-emptypage" data-td5="empty">
    <section className="td5-np" data-td5="empty-panel">
      <div>
        <span className="td5-ey2">— TO-DO LIST —</span>
        <h1 className="td5-nph" data-page-title="">Your next move,<br />always on top</h1>
        <p className="td5-npp">
          Log the queries you send for {msTitle ? <i>{msTitle}</i> : "your book"}, and QueryHawk puts what needs doing into your tray: partials to send,
          agents worth a nudge, and the ones it’s time to close.
        </p>
        <div className="td5-npa">
          <button type="button" className="td5-npb1" data-td5="empty-log" onClick={onLog}>+ Log your first query</button>
          <button type="button" className="td5-npb2" data-td5="empty-add" onClick={onAdd}>Add a task yourself</button>
        </div>
      </div>
      <img className="td5-npart" src={MENTOR_ART} alt="" aria-hidden="true" />
    </section>

    <div className="td5-sech"><h2>How it works</h2><span>One task, from ask to done</span></div>
    <section className="td5-how" data-td5="example" aria-label="An example task">
      <div className="td5-howt"><b>Greg Panetta asks for a partial</b><i>An example task</i></div>
      <div className="td5-flow">
        <div className="td5-mini">
          <div className="td5-mk">In your tray</div>
          <div className="td5-ml"><span className="td5-disc">GP</span><b>Send your partial</b><DueDial dial={exDial(26, "Jul")} size={30} /></div>
          <div className="td5-ml"><span className="td5-disc">SD</span><b>Worth a nudge</b><DueDial dial={exDial(17, "Sep")} size={30} /></div>
          <div className="td5-ml"><span className="td5-disc">EW</span><b>Consider closing</b><DueDial dial={exDial(9, "May")} size={30} /></div>
        </div>
        <div className="td5-ar" aria-hidden="true">→</div>
        <div className="td5-mini" data-desk="">
          <div className="td5-mhd">Your move</div>
          <div className="td5-mbd">
            <div className="td5-mdd">Send your partial</div>
            <p className="td5-mle">Greg asked for the first 50 pages on 28 June. Everything you need is on the card.</p>
            <span className="td5-mbt">Mark the partial sent</span>
          </div>
        </div>
        <div className="td5-ar" aria-hidden="true">→</div>
        <div className="td5-mini">
          <div className="td5-mk">Done today</div>
          <div className="td5-slip" style={{ boxShadow: "none", padding: "6px 2px", background: "transparent" }}>
            <span className="td5-ss">SENT</span><span className="td5-sw3"><b>Partial to Greg Panetta</b><small>The query moves on by itself</small></span><span />
          </div>
        </div>
      </div>
      <div className="td5-legend">
        <span><i style={{ background: "#f6e2d8" }} />Your move: something to send or answer</span>
        <span><i style={{ background: "#e2e7ef" }} />To chase: past the date you’d expect a reply</span>
        <span><i style={{ background: "#e3e8e1" }} />To tidy: gaps worth filling in</span>
      </div>
    </section>
    <div className="td5-feats">
      <div><div className="td5-fic"><svg viewBox="0 0 24 24" fill="none" stroke="#1c130f" strokeWidth="1.6"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg></div>
        <h4>It watches the clock</h4><p>Every query has a window. When an agent’s passes, a task lands in your tray. No diary, no spreadsheet.</p></div>
      <div><div className="td5-fic"><svg viewBox="0 0 24 24" fill="none" stroke="#1c130f" strokeWidth="1.6" strokeLinejoin="round"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 10h8M8 14h5" /></svg></div>
        <h4>One thing on the desk</h4><p>The task you’re working sits on the desk with everything it needs: who asked, what for, and what you sent before.</p></div>
      <div><div className="td5-fic"><svg viewBox="0 0 24 24" fill="none" stroke="#1c130f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></div>
        <h4>Done is recorded</h4><p>Finish a task and the query updates itself: the status, the date, the history. You never log the same thing twice.</p></div>
    </div>

    <div className="td5-sech"><h2>Ways to get started</h2><span>Pick whichever suits you</span></div>
    <div className="td5-ways" data-td5="ways">
      <div className="td5-way" data-q=""><span className="td5-tag">QUICKEST</span><h4>Log your first query</h4>
        <p>Tell QueryHawk who you’ve queried and when. The tray fills itself from there.</p>
        <button type="button" className="td5-go" onClick={onLog}>+ Log a query</button><div className="td5-sm">Takes about a minute</div></div>
      <div className="td5-way"><h4>Import the ones you’ve sent</h4>
        <p>Bring your existing queries over from a spreadsheet, and everything that’s already due shows up here straight away.</p>
        <button type="button" className="td5-go" onClick={onImport}>Import queries</button></div>
      <div className="td5-way"><h4>Add a task of your own</h4>
        <p>Rewrite the synopsis, read chapter one aloud. Your own tasks sit in the tray beside the ones QueryHawk raises.</p>
        <button type="button" className="td5-go" onClick={onAdd}>+ Add a task</button></div>
    </div>
  </div>
);

export const TrayCaughtUp: React.FC<{
  holding: number;
  pastReply: number;
  upcoming: Upcoming[];
  now: number;
  done: readonly ClearedAct[];
  undoFor: (a: ClearedAct) => (() => void) | null;
  onQuery: () => void;
}> = ({ holding, pastReply, upcoming, now, done, undoFor, onQuery }) => {
  const who = holding === 1 ? "One agent is" : `${holding} agents are`;
  const past = pastReply === 0
    ? (holding === 1 ? "it is not past its reply date" : "none is past its reply date")
    : `${pastReply} ${pastReply === 1 ? "is" : "are"} past the reply date`;
  const line = holding === 0 ? "No agent is holding your work at the moment." : `${who} holding your work and ${past}.`;
  return (
    <div className="td5-clear" data-td5="caught">
      <div className="td5-cl">
        <img src={ARMCHAIR_ART} alt="" aria-hidden="true" />
        <div>
          <h2 className="td5-clh">The desk is clear.</h2>
          <p className="td5-clp" data-td5="caught-line">{line}</p>
          <button type="button" className="td5-b1" style={{ height: 48 }} data-td5="query-new" onClick={onQuery}>Query someone new</button>
        </div>
      </div>
      <div className="td5-cr">
        <div className="td5-subh"><b>Coming up</b><span>Next three dates</span></div>
        <div data-td5="upcoming">
          {upcoming.length ? upcoming.map((u) => (
            <div key={`${u.ymd}-${u.name}`} className="td5-up" data-td5="up" data-ymd={u.ymd}>
              <DueDial dial={dialFor(u.ymd, u.anchorMs, now)} size={44} />
              <div><b>{u.name}</b><small>{u.line}</small></div>
            </div>
          )) : <div className="td5-noslips">No dates ahead.</div>}
        </div>
        <div style={{ marginTop: 28 }}><DoneToday acts={done} fresh={null} undoFor={undoFor} /></div>
      </div>
    </div>
  );
};
