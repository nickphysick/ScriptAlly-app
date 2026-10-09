/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — "What's on the list today?"
 *
 * No container: the title, one item in focus as a card, then the rest of the list as floating row
 * cards that scroll inside the column. The order and every item come from `lib/dashList`.
 *
 * ⚠️ THE TICK NEVER WRITES. It opens the flow, and only the flow writes.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { groupHeading, type ListAction, type ListGroup, type ListItem, type ListPlan, type ListTone } from "../../../lib/dashList";
import { DISCOVER_LIVE } from "../../../lib/discoverShared";

export const LIST_TITLE = "What's on the list today?";

const BAND: Record<ListTone, string> = {
  you: "var(--state-you)", queried: "var(--state-queried)", agent: "var(--state-agent)",
  offer: "var(--state-offer)", closed: "var(--state-closed)", house: "#e4e9f0",
};
const EDGE: Record<ListTone, string> = {
  you: "var(--state-you-deep)", queried: "var(--state-queried-deep)", agent: "var(--state-agent-deep)",
  offer: "var(--state-offer-deep)", closed: "var(--state-closed-deep)", house: "#c9d2df",
};

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
  <div className="d58-focus" data-d58="focus" data-group={item.group} data-key={item.key} ref={innerRef}>
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
        {item.date ? <DateTile date={item.date} /> : <span className={`d58-disc${item.group === "house" ? " d58-disc--house" : ""}`} aria-hidden="true">{item.initials}</span>}
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
      <button type="button" className="d58-btn d58-btn--pri d58-btn--sm" data-d58="focus-act" onClick={() => onRun(item.action)}>{item.actLabel} →</button>
    </div>
  </div>
);

const Row: React.FC<{ item: ListItem; onRun: (a: ListAction) => void }> = ({ item, onRun }) => {
  const style = { ["--d58-edge" as string]: EDGE[item.tone], ["--d58-tone" as string]: BAND[item.tone] } as React.CSSProperties;
  const lead = item.group === "house" ? <span className="d58-rowdisc" aria-hidden="true">{item.initials}</span>
    : item.group === "ready" ? <span className="d58-rowdisc d58-rowdisc--agent" aria-hidden="true">{item.initials}</span>
      : item.date ? <DateTile date={item.date} />
        : <button type="button" className="d58-tick" data-d58="tick" aria-label={`${item.pre}${item.who}${item.post}: open`} onClick={() => onRun(item.action)} />;
  return (
    <div className="d58-row" data-d58="row" data-key={item.key} data-group={item.group} style={style}>
      {lead}
      <div style={{ minWidth: 0 }}>
        <p className="d58-rowsay"><Say item={item} /></p>
        <div className="d58-rowmeta">
          {item.status && item.group !== "coming" && (
            <span className="d58-pill"><StatusDot status={item.status} overrideSize={12} decorative />{STAGE_NAME[item.status]}</span>
          )}
          <span>{item.agency}</span>
        </div>
      </div>
      {item.group === "house" ? <button type="button" className="d58-chip" data-d58="row-act" onClick={() => onRun(item.action)}>Fill in</button>
        : item.group === "ready" ? <button type="button" className="d58-chip d58-chip--line" data-d58="row-act" onClick={() => onRun(item.action)}>Log a query</button>
          : <span className="d58-when">{item.group === "coming" ? item.foot : item.when}</span>}
    </div>
  );
};

export const Dash58List: React.FC<{
  loading: boolean;
  focusH: number;
  plan: ListPlan;
  focus: { item: ListItem | null; index: number; of: number; rest: ListGroup[] };
  focusRef: React.Ref<HTMLDivElement>;
  onStep: (n: number) => void;
  onRun: (a: ListAction) => void;
  onAll: () => void;
  onAddAgent: () => void;
}> = ({ loading, focusH, plan, focus, focusRef, onStep, onRun, onAll, onAddAgent }) => {
  const restCount = focus.rest.reduce((n, g) => n + g.items.length, 0);
  const counts = Object.fromEntries(plan.groups.map((g) => [g.key, g.items.length]));
  const first = plan.groups[0];
  const coming = !loading && first?.key === "coming";
  return (
    <section className="d58-right" data-d58="right" data-counts={JSON.stringify(counts)} aria-label="To-do list">
      <div className="d58-listhead" data-d58="list-head">
        <h2 className="d58-listtitle" data-d58="list-title">{LIST_TITLE}</h2>
        <span className="d58-listbar" data-d58="list-bar" aria-hidden="true" />
      </div>
      {loading ? (
        <div className="d58-focus is-loading" data-d58="focus" style={{ height: focusH }} aria-hidden="true">
          <div className="d58-fband"><span className="d58-fpill d58-sk">LOADING</span></div>
        </div>
      ) : focus.item ? (
        <FocusCard item={focus.item} index={focus.index} of={focus.of} innerRef={focusRef} onStep={onStep} onRun={onRun} label={first.label} />
      ) : (
        <div data-d58="focus-none"><p className="d58-quietline">No dates are set on your live queries yet. Add an agent to keep the list moving.</p></div>
      )}
      <div className="d58-then" data-d58="then">
        {!loading && (focus.item || restCount > 0) && (
          <>
            <span>{plan.thenLabel}</span>
            <b>{restCount}</b>
            <button type="button" className="d58-link" onClick={onAll}>
              {plan.all.label === "All" ? `All ${plan.items.length}` : plan.all.label} →
            </button>
          </>
        )}
      </div>
      <div className="d58-list" data-d58="list">
        {!loading && focus.rest.map((g) => (
          <React.Fragment key={g.key}>
            <div className={`d58-group d58-group--${g.key}`} data-d58="group" data-group={g.key}>
              <span>{groupHeading(g, focus.item)}</span><b>{g.items.length}</b>
            </div>
            {g.items.map((it) => <Row key={it.key} item={it} onRun={onRun} />)}
          </React.Fragment>
        ))}
        {coming && (
          <div className="d58-extra" data-d58="coming-extra">
            <button type="button" className="d58-btn d58-btn--pri d58-btn--sm" onClick={onAddAgent}>Add an agent</button>
            <button type="button" className="d58-btn d58-btn--sm" disabled={!DISCOVER_LIVE} onClick={() => onRun({ kind: "route", tab: "agents", sub: "Discover" })}>
              Discover agents {!DISCOVER_LIVE && <span className="d58-soon">SOON</span>}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
