/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD — the right column.
 *
 * DASHBOARD v71 (ref design-refs/dashboard-v71/): while querying the column is TWO CARDS and
 * nothing else — the task card filling the height, then the founding writer card at a fixed
 * height. v59's title ("What's on the list today?"), "All {n} →", the hairline and the Then rows
 * are retired. Before the first query the column is v60.1's, unchanged: "Ready for lift off?",
 * the hairline, then the founding writer card.
 *
 * ⚠️ THE DASHBOARD NEVER COMPLETES A TASK. The card's button reads "View task →" for every kind
 * and opens the place where the task is done properly (`viewTask` in Dash58).
 */
import React from "react";
import { AgentDisc } from "../../shared/AgentDisc";
import { StatusDot } from "../../StatusDot";
import { type ListAction, type ListItem, type ListPlan, type ListTone } from "../../../lib/dashList";

const BAND: Record<ListTone, string> = {
  you: "var(--state-you)", queried: "var(--state-queried)", agent: "var(--state-agent)",
  offer: "var(--state-offer)", closed: "var(--state-closed)", house: "#e4e9f0",
};
/** The task card's one button, for every kind (v59). */
export const VIEW_TASK = "View task";

const Say: React.FC<{ item: ListItem }> = ({ item }) => (
  <>{item.pre}{item.who && <b>{item.who}</b>}{item.post}</>
);

const DateTile: React.FC<{ date: { dow: string; day: string } }> = ({ date }) => (
  <div className="d58-cal" aria-hidden="true"><small>{date.dow}</small><b>{date.day}</b></div>
);

const FocusCard: React.FC<{
  item: ListItem; index: number; of: number; innerRef: React.Ref<HTMLDivElement>;
  onStep: (n: number) => void; onRun: (a: ListAction) => void; label: string;
}> = ({ item, index, of, innerRef, onStep, onRun, label }) => (
  <div className="d58-focus" data-d58="focus" data-group={item.group} data-key={item.key}
    data-query={item.action.kind === "drawer" && item.action.request.mode !== "log" ? item.action.request.queryId : undefined} ref={innerRef}>
    <div className="d58-fband" style={{ background: BAND[item.tone] }}>
      <span className="d58-fpill" data-d58="focus-label">{label.toUpperCase()}</span>
      {of > 1 && (
        <span className="d58-fpos" data-d58="focus-pos">
          {index + 1} OF {of}
          <button type="button" aria-label="Previous" data-d58="focus-prev" disabled={index === 0} onClick={() => onStep(index - 1)}>‹</button>
          <button type="button" aria-label="Next" data-d58="focus-next" disabled={index >= of - 1} onClick={() => onStep(index + 1)}>›</button>
        </span>
      )}
    </div>
    <div className="d58-fbody">
      <div className="d58-fwho">
        {item.date ? <DateTile date={item.date} /> : <AgentDisc initials={item.initials} standing="querying" tone={item.group === "house" ? "agency" : undefined} className="d58-disc" />}
        <div>
          <h3 className="d58-fsay" data-d58="focus-say"><Say item={item} /></h3>
          <small className="d58-ffact">{item.fact}</small>
        </div>
      </div>
      {item.stages ? (
        <div className="d58-stages" data-d58="focus-stages">
          {item.stages.map((s, i) => (
            <div className="d58-stage" key={`${s.status}-${i}`}>
              <i><StatusDot status={s.status} overrideSize={15} decorative /></i>
              <b>{s.name}</b>
              <small>{s.date}</small>
            </div>
          ))}
        </div>
      ) : item.note ? <p className="d58-fnote" data-d58="focus-note">{item.note}</p> : null}
    </div>
    <div className="d58-ffoot">
      <span>{item.foot}</span>
      <button type="button" className="d58-btn d58-btn--pri d58-btn--sm" data-d58="focus-act" onClick={() => onRun(item.action)}>{VIEW_TASK} →</button>
    </div>
  </div>
);

export const Dash58List: React.FC<{
  loading: boolean;
  focusH: number;
  plan: ListPlan;
  focus: { item: ListItem | null; index: number; of: number };
  focusRef: React.Ref<HTMLDivElement>;
  onStep: (n: number) => void;
  /** the task card's "View task →": opens where the task is completed, never writes */
  onView: (a: ListAction) => void;
  /** the founding writer card */
  panel: React.ReactNode;
  /** before the first query, "Ready for lift off?" takes the task card's place (v60) */
  lift?: React.ReactNode;
}> = ({ loading, focusH, plan, focus, focusRef, onStep, onView, panel, lift }) => {
  if (lift) {
    return (
      <section className="d58-right" data-d58="right" data-mode="pre" aria-label="Getting started">
        {lift}
        <hr className="d59-rule" data-d58="rule" />
        {panel}
      </section>
    );
  }
  const first = plan.groups[0];
  return (
    <section className="d58-right d71-right" data-d58="right" data-mode="q" aria-label="Your tasks">
      <div className="d71-taskslot" data-d71="task-slot">
        {loading ? (
          <div className="d58-focus is-loading d58-skcard" data-sk="card" data-d58="focus" style={{ height: focusH }} aria-hidden="true">
            <div className="d58-fband"><span className="d58-fpill d58-sk">LOADING</span></div>
          </div>
        ) : focus.item ? (
          <FocusCard item={focus.item} index={focus.index} of={focus.of} innerRef={focusRef} onStep={onStep} onRun={onView} label={first.label} />
        ) : (
          <div data-d58="focus-none"><p className="d58-quietline">No dates are set on your live queries yet. Add an agent to keep the list moving.</p></div>
        )}
      </div>
      <div className="d71-fwslot" data-d71="fw-slot">{panel}</div>
    </section>
  );
};
