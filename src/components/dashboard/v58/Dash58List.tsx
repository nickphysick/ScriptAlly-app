/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v59 — "What's on the list today?" (ref design-refs/dashboard-v59/dashboard-v59.html)
 *
 * No container: the title with "All {n} →", ONE item in focus as a card, a hairline, then the
 * founding writer panel. The rest of the list lives on the To-do page. The order and every item
 * come from `lib/dashList`.
 *
 * ⚠️ THE DASHBOARD NEVER COMPLETES A TASK. The focus card's button reads "View task →" for every
 * kind and opens the place where the task is done properly (`viewTask` in Dash58), where what was
 * sent, when to chase and any notes are recorded. The v58 rows and their tick are retired.
 */
import React from "react";
import { AgentDisc } from "../../shared/AgentDisc";
import { StatusDot } from "../../StatusDot";
import { type ListAction, type ListGroup, type ListItem, type ListPlan, type ListTone } from "../../../lib/dashList";
import { DISCOVER_LIVE } from "../../../lib/discoverShared";

export const LIST_TITLE = "What's on the list today?";

const BAND: Record<ListTone, string> = {
  you: "var(--state-you)", queried: "var(--state-queried)", agent: "var(--state-agent)",
  offer: "var(--state-offer)", closed: "var(--state-closed)", house: "#e4e9f0",
};
/** The focus card's one button, for every kind (v59). */
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
  focus: { item: ListItem | null; index: number; of: number; rest: ListGroup[] };
  focusRef: React.Ref<HTMLDivElement>;
  onStep: (n: number) => void;
  /** the focus card's "View task →": opens where the task is completed, never writes */
  onView: (a: ListAction) => void;
  onRun: (a: ListAction) => void;
  onAll: () => void;
  onAddAgent: () => void;
  /** the founding writer panel, below the hairline */
  panel: React.ReactNode;
}> = ({ loading, focusH, plan, focus, focusRef, onStep, onView, onRun, onAll, onAddAgent, panel }) => {
  const counts = Object.fromEntries(plan.groups.map((g) => [g.key, g.items.length]));
  const first = plan.groups[0];
  const coming = !loading && first?.key === "coming";
  /* "All {n} →" always goes to the To-do page: the full list lives there (v59) */
  const allLabel = `All ${plan.items.length}`;
  return (
    <section className="d58-right" data-d58="right" data-counts={JSON.stringify(counts)} aria-label="To-do list">
      <div className="d58-listhead" data-d58="list-head">
        <div className="d59-titlerow" data-d58="title-row">
          <h2 className="d58-listtitle" data-d58="list-title">{LIST_TITLE}</h2>
          {!loading && plan.items.length > 0 && (
            <button type="button" className="d59-all" data-d58="list-all" onClick={onAll}>{allLabel} →</button>
          )}
        </div>
        <span className="d58-listbar" data-d58="list-bar" aria-hidden="true" />
      </div>
      {loading ? (
        <div className="d58-focus is-loading" data-d58="focus" style={{ height: focusH }} aria-hidden="true">
          <div className="d58-fband"><span className="d58-fpill d58-sk">LOADING</span></div>
        </div>
      ) : focus.item ? (
        <FocusCard item={focus.item} index={focus.index} of={focus.of} innerRef={focusRef} onStep={onStep} onRun={onView} label={first.label} />
      ) : (
        <div data-d58="focus-none"><p className="d58-quietline">No dates are set on your live queries yet. Add an agent to keep the list moving.</p></div>
      )}
      {coming && (
        <div className="d58-extra" data-d58="coming-extra">
          <button type="button" className="d58-btn d58-btn--pri d58-btn--sm" onClick={onAddAgent}>Add an agent</button>
          <button type="button" className="d58-btn d58-btn--sm" disabled={!DISCOVER_LIVE} onClick={() => onRun({ kind: "route", tab: "agents", sub: "Discover" })}>
            Discover agents {!DISCOVER_LIVE && <span className="d58-soon">SOON</span>}
          </button>
        </div>
      )}
      <hr className="d59-rule" data-d58="rule" />
      {panel}
    </section>
  );
};
