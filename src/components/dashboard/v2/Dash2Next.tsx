/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2 · Next up (Part B; ref design-refs/dashboard-v2, screens/01).
 *
 * The top task in a panel — its status mark in a white circle, the task, a muted reason with any time past the
 * expected date in rose — and "Open task", which goes where the task is done. Then the next two tasks as rows.
 *
 * ⚠️ THE PLAN AND THE WORDS ARE THE APP'S: the items and their order are `dashList`'s, the task sentence is
 * `taskCardModel`'s (Dashboard v71), the dates are the plan's own. ⚠️ THE DASHBOARD NEVER COMPLETES A TASK: every
 * control here calls `onView`, which opens the drawer, the agent card or a route.
 */
import React, { useMemo } from "react";
import type { ListAction, ListItem, ListPlan } from "../../../lib/dashList";
import { taskCardModel, type TaskCtx } from "../../../lib/dashTaskCard";
import { CAUGHT_UP } from "../v71/Dash71Task";
import { StatusDot } from "../../StatusDot";
import { Frame } from "./Frame";

const WEEK = 7 * 86_400_000;
const weeks = (ms: number) => Math.max(1, Math.round(ms / WEEK));
const wk = (n: number) => `${n} ${n === 1 ? "week" : "weeks"}`;

export const OPEN_TASK = "Open task";
export const SEE_ALL = "See all";
/** how many tasks the card shows: the top one and the next two */
export const NEXT_SHOWN = 3;

/**
 * The top task's reason, in two parts: what has happened, and (rose) how long since the expected date passed.
 * Both come from the Query Centre's own row for the query (`stageStartMs`/`sentMs`, `expectedMs`).
 */
export function nextReason(item: ListItem, ctx: TaskCtx, line: string | null): { said: string; past: string | null } {
  const qid = item.action.kind === "drawer" ? item.action.request.queryId ?? null : null;
  const qc = qid ? ctx.qcRows.find((r) => r.id === qid) : undefined;
  const sent = qc?.stageStartMs ?? qc?.sentMs ?? null;
  const exp = qc?.expectedMs ?? null;
  const waiting = item.group === "nudge" || item.group === "quiet";
  const first = line ? (line.split(/(?<=\.)\s/)[0] ?? "").replace(/\.$/, "") : "";
  const said = waiting && sent != null ? `no reply in ${wk(weeks(ctx.nowMs - sent))}` : first ? first.charAt(0).toLowerCase() + first.slice(1) : "";
  const past = waiting && exp != null && ctx.nowMs > exp ? `window ended ${wk(weeks(ctx.nowMs - exp))} ago` : null;
  return { said, past };
}

const Mark: React.FC<{ item: ListItem; size: number }> = ({ item, size }) => (item.status
  ? <StatusDot status={item.status} overrideSize={size} decorative />
  : <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>);

export const Dash2Next: React.FC<{
  loading: boolean;
  plan: ListPlan;
  ctx: TaskCtx;
  onView: (a: ListAction) => void;
  onSeeAll: () => void;
}> = ({ loading, plan, ctx, onView, onSeeAll }) => {
  const items = plan.items;
  const n = items.length;
  const top = items[0] ?? null;
  const label = plan.groups.find((g) => g.items.some((x) => x.key === top?.key))?.label ?? "";
  const model = useMemo(() => (top ? taskCardModel(top, label, ctx) : null), [top, label, ctx]);
  const reason = top && model ? nextReason(top, ctx, model.line) : null;
  const rest = items.slice(1, NEXT_SHOWN);
  const shown = Math.min(NEXT_SHOWN, n);
  return (
    <Frame tone="sand" title="Next up" label="Next up" probe="next" loading={loading}
      meta={n > 0 && !loading ? <>{shown} of {n} · <button type="button" className="d2-link" data-d2="see-all" onClick={onSeeAll}>{SEE_ALL}</button></> : null}>
      <div className="d2-body d2-next" data-d2="next" data-n={n}>
        {loading ? (
          <div className="d2-nup d2-sk" aria-hidden="true"><span className="d2-nic" /><span className="d2-skl" /></div>
        ) : !top || !model ? (
          <p className="d2-empty" data-d2="next-empty">{CAUGHT_UP}</p>
        ) : (
          <>
            <div className="d2-nup" data-d2="next-top" data-key={top.key}>
              <span className="d2-nic"><Mark item={top} size={22} /></span>
              <div className="d2-ntx">
                <b className="d2-ntitle">{model.pre}{model.who}{model.post}</b>
                <span className="d2-nwhy" data-d2="next-why">
                  {[model.sub, reason?.said].filter(Boolean).join(" · ")}{reason?.past ? <>{reason.said || model.sub ? ", " : ""}<em data-d2="next-past">{reason.past}</em></> : null}
                </span>
                <button type="button" className="d2-open" data-d2="open-task" onClick={() => onView(top.action)}>{OPEN_TASK}</button>
              </div>
            </div>
            {rest.length > 0 && (
              <ul className="d2-later" data-d2="next-rest">
                {rest.map((it) => (
                  <li key={it.key}>
                    <button type="button" className="d2-lrow" data-d2="next-row" onClick={() => onView(it.action)}>
                      <span className="d2-lmark"><Mark item={it} size={18} /></span>
                      <span className="d2-ltx">{it.pre}{it.who}{it.post}</span>
                      {it.when && <time>{it.when}</time>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Frame>
  );
};
