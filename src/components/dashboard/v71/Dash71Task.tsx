/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v71 — THE TASK CARD (ref design-refs/dashboard-v71/ `.nx`).
 *
 * One card, the full height of its row, cycling through the plan's items in the plan's order:
 * 7s each, with one progress segment per item. Hover or focus inside the card holds it (the
 * current segment shows full and stops); leaving starts that item's dwell again. ‹ › step by hand
 * and restart the dwell. Under reduced motion it never advances on its own.
 *
 * ⚠️ THE DASHBOARD NEVER COMPLETES A TASK. "View task →" opens where the task is done properly
 * (`viewTask` in Dash58) and writes nothing.
 * ⚠️ THE DASHED EDGE MEANS "NOT HAPPENED YET" — the step chip still to do, and nothing else on the
 * card. (The Query Centre timeline's grammar.)
 * ⚠️ THE CHANGE OF ITEM IS NOT ANNOUNCED: the region's `aria-live` is off, so a screen reader is not
 * interrupted every seven seconds.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ListAction, ListItem, ListPlan } from "../../../lib/dashList";
import { DWELL_MS, segmentWindow, taskCardModel, type TaskCardModel, type TaskCtx } from "../../../lib/dashTaskCard";

/** The card's one button, for every kind (v59). */
export const VIEW_TASK = "View task";

/** v60.1's caught-up line, in the same card */
export const CAUGHT_UP = "No dates are set on your live queries yet. Add an agent to keep the list moving.";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const Bar: React.FC<{ m: TaskCardModel }> = ({ m }) => {
  const b = m.bar!;
  const pct = (x: number) => `${(x * 100).toFixed(3)}%`;
  return (
    <div className="d71-win" data-d71="bar" data-sent={b.sentMs} data-expected={b.expectedMs ?? ""} data-close={b.closeMs ?? ""} data-today={b.todayMs}>
      <div className="d71-wbar">
        <i className="d71-ok" data-d71="bar-solid" style={{ width: pct(b.solid) }} />
        <i className="d71-ov" data-d71="bar-over" style={{ width: pct(1 - b.solid) }} />
        {b.close != null && (
          <span className={`d71-cmark${b.close > 0.72 ? " is-end" : b.close < 0.28 ? " is-start" : ""}`} data-d71="close-mark" style={{ left: pct(b.close) }}>
            {b.closeLabel && <em>{b.closeLabel}</em>}
          </span>
        )}
      </div>
      <div className="d71-wlab">
        <span data-d71="bar-sent">{b.sentLabel}</span>
        {b.expectedLabel && <span className="d71-wexp" data-d71="bar-expected" style={{ left: pct(b.solid) }}>{b.expectedLabel}</span>}
        <span className="d71-wtoday" data-d71="bar-today">{b.todayLabel}</span>
      </div>
    </div>
  );
};

const Body: React.FC<{ m: TaskCardModel }> = ({ m }) => (
  <>
    <div className="d71-who">
      {m.date ? (
        <div className="d58-cal d71-cal" aria-hidden="true"><small>{m.date.dow}</small><b>{m.date.day}</b></div>
      ) : (
        <span className={`d71-av d71-av--${m.kind}`} aria-hidden="true">{m.initials}</span>
      )}
      <div className="d71-whot">
        <h3 className="d71-title" data-d71="title">{m.pre}{m.who && <b>{m.who}</b>}{m.post}</h3>
        {m.sub && <small className="d71-sub" data-d71="sub">{m.sub}</small>}
      </div>
    </div>
    {m.line && <p className="d71-line" data-d71="line">{m.line}</p>}
    {m.bar && <Bar m={m} />}
    {m.steps && (
      <div className="d71-steps" data-d71="steps">
        {m.steps.map((s, i) => (
          <React.Fragment key={`${s.label}-${i}`}>
            {i > 0 && <b aria-hidden="true">›</b>}
            <span className={s.done ? "d71-step is-done" : "d71-step is-todo"} data-d71={s.done ? "step-done" : "step-todo"}>
              {s.label} <small>{s.date}</small>
            </span>
          </React.Fragment>
        ))}
      </div>
    )}
  </>
);

export const Dash71Task: React.FC<{
  loading: boolean;
  plan: ListPlan;
  ctx: TaskCtx;
  /** opens where the task is completed, never writes */
  onView: (a: ListAction) => void;
  innerRef?: React.Ref<HTMLElement>;
}> = ({ loading, plan, ctx, onView, innerRef }) => {
  const items: ListItem[] = plan.items;
  const labelOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of plan.groups) for (const it of g.items) map.set(it.key, g.label);
    return map;
  }, [plan]);
  const models = useMemo(() => items.map((it) => taskCardModel(it, labelOf.get(it.key) ?? "", ctx)), [items, labelOf, ctx]);
  const n = models.length;
  /* the plan's group counts, for the order lock (DB58 R2) */
  const counts = useMemo(() => JSON.stringify(Object.fromEntries(plan.groups.map((g) => [g.key, g.items.length]))), [plan]);

  const [index, setIndex] = useState(0);
  const at = n ? Math.min(index, n - 1) : 0;
  /* a plan that shrinks under the reader never leaves the card pointing past its end */
  useEffect(() => { if (index !== at) setIndex(at); }, [index, at]);
  const [held, setHeld] = useState(false);
  /* bumped on every manual step and on every release of a hold: the dwell starts again */
  const [run, setRun] = useState(0);
  const cardRef = useRef<HTMLElement | null>(null);

  const auto = n > 1 && !held && !reduced();
  useEffect(() => {
    if (!auto || loading) return undefined;
    const t = window.setTimeout(() => { setIndex((i) => (i + 1) % n); setRun((r) => r + 1); }, DWELL_MS);
    return () => window.clearTimeout(t);
  }, [auto, loading, n, at, run]);

  const step = (d: number) => { setIndex((i) => ((i + d) % n + n) % n); setRun((r) => r + 1); };
  const hold = () => setHeld(true);
  const release = () => { setHeld(false); setRun((r) => r + 1); };
  const onBlur = (e: React.FocusEvent) => {
    if (cardRef.current && !cardRef.current.contains(e.relatedTarget as Node | null) && !cardRef.current.matches(":hover")) release();
  };
  const onLeave = () => { if (!cardRef.current?.contains(document.activeElement)) release(); };

  const setRefs = (el: HTMLElement | null) => {
    cardRef.current = el;
    if (typeof innerRef === "function") innerRef(el);
    else if (innerRef) (innerRef as React.MutableRefObject<HTMLElement | null>).current = el;
  };

  if (loading) {
    return (
      <section className="d71-task is-loading d58-skcard" data-sk="card" data-d71="task" data-loading="1" aria-hidden="true">
        <div className="d71-th"><span className="d71-kick">LOADING</span></div>
        <div className="d71-tb" />
        <div className="d71-tf" />
      </section>
    );
  }

  if (n === 0) {
    return (
      <section className="d71-task" data-d71="task" data-loading="0" data-kind="none" data-counts={counts} role="region" aria-label="Your tasks" aria-live="off" ref={setRefs}>
        <div className="d71-tb d71-tb--none"><p className="d58-quietline" data-d58="focus-none">{CAUGHT_UP}</p></div>
      </section>
    );
  }

  const m = models[at];
  const next = n > 1 ? models[(at + 1) % n] : null;
  const win = segmentWindow(n, at);
  return (
    <section
      ref={setRefs}
      className="d71-task"
      data-d71="task"
      data-loading="0"
      data-kind={m.kind}
      data-key={m.key}
      data-group={items[at].group}
      data-counts={counts}
      data-query={m.queryId ?? undefined}
      data-index={at}
      data-held={held ? "1" : "0"}
      role="region"
      aria-label="Your tasks"
      aria-live="off"
      style={{ ["--d71-tint" as string]: m.tint, ["--d71-accent" as string]: m.accent } as React.CSSProperties}
      onMouseEnter={hold}
      onMouseLeave={onLeave}
      onFocus={hold}
      onBlur={onBlur}
    >
      <div className="d71-th" data-d71="head">
        <span className="d71-kick" data-d71="kicker">{m.kicker}</span>
        {n > 1 && (
          <span className="d71-pos" data-d71="pos">
            <button type="button" aria-label="Previous task" data-d71="prev" onClick={() => step(-1)}>‹</button>
            <span data-d71="pos-text">{at + 1} OF {n}</span>
            <button type="button" aria-label="Next task" data-d71="next" onClick={() => step(1)}>›</button>
          </span>
        )}
      </div>
      {n > 1 && (
        <div className="d71-prog" data-d71="segments" aria-hidden="true">
          {Array.from({ length: win.count }, (_, k) => {
            const i = win.start + k;
            return (
              <i key={i} className={i < at ? "is-past" : i === at ? "is-now" : undefined} data-d71="segment">
                {i === at && <b key={`${at}-${run}`} className={auto ? "is-running" : "is-full"} style={{ animationDuration: `${DWELL_MS}ms` }} />}
              </i>
            );
          })}
        </div>
      )}
      <div className="d71-tb" key={`${m.key}-${at}`} data-d71="body">
        <Body m={m} />
      </div>
      <div className="d71-tf" data-d71="foot">
        <button type="button" className="d71-view" data-d71="view" onClick={() => onView(items[at].action)}>{VIEW_TASK} →</button>
        {next && <span className="d71-then" data-d71="then">Then: {next.plain}</span>}
      </div>
    </section>
  );
};
