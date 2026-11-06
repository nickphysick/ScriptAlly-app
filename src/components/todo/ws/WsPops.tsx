/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 §8 — SNOOZE AND DISMISS, as pop-ups from their footer buttons (and the S and D keys).
 *
 * ⚠️ THEY WRITE NOTHING. Every choice is a callback the page performs through the existing writers (`snoozeCardWrites`,
 *    the task flags, `mutedTaskRules`, `deleteUserTask`), each with Undo.
 * ⚠️ AN OFFER CAN'T BE DISMISSED, AND REQUESTED MATERIAL ISN'T DISMISSED EITHER: the choices for a send lead back to
 *    logging it, to withdrawing the query, or to the card. That is To-do v5.1's rule, kept.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { addDays, dayDiff, fmt } from "../../../lib/queryActions/dates";
import type { WsTask } from "../../../lib/todoWs";
import { DatePick, ZZ } from "./WsControls";

export interface SnoozeLimit { ceiling: number; why: string | null }

const usePlace = (opener: HTMLElement | null) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: -9999, bottom: 0 });
  useLayoutEffect(() => {
    if (!opener || !ref.current) return;
    const b = opener.getBoundingClientRect();
    const w = ref.current.offsetWidth;
    setPos({ left: Math.max(8, Math.min(b.left, window.innerWidth - w - 8)), bottom: Math.max(8, window.innerHeight - b.top + 8) });
  }, [opener]);
  return { ref, pos };
};

export const SnoozePop: React.FC<{
  t: WsTask; today: Date; limit: SnoozeLimit; opener: HTMLElement | null; onClose: () => void;
  onSnooze: (days: number, until: Date) => void;
}> = ({ t, today, limit, opener, onClose, onSnooze }) => {
  const { ref, pos } = usePlace(opener);
  useEscapeLayer(true, onClose, ESC_LEVEL.page);
  const toSat = ((6 - today.getDay() + 7) % 7) || 7;
  const toMon = ((8 - today.getDay()) % 7) || 7;
  const opts: [string, string, number][] = [["tom", "Tomorrow", 1], ["wknd", "The weekend", toSat], ["next", "Next week", toMon], ["two", "In two weeks", 14]];
  const [pick, setPick] = useState<string | null>(null);
  const [cal, setCal] = useState<Date | null>(null);
  const days = pick === "cal" ? (cal ? dayDiff(cal, today) : 0) : (opts.find((o) => o[0] === pick)?.[2] ?? 0);
  const until = addDays(today, days);
  const ready = days > 0 && days <= limit.ceiling;
  const own = !!t.userTask;
  return createPortal(
    <div ref={ref} className="tws-layer tws-pop" role="dialog" aria-label="Snooze until" data-tws="snooze-pop" style={{ left: pos.left, bottom: pos.bottom }}>
      <div className="tws-ph"><b>{own ? "Move it to…" : "Snooze until…"}</b><button type="button" className="tws-px" aria-label="Close" onClick={onClose}>✕</button></div>
      {limit.ceiling <= 0 ? <p className="tws-pp">{limit.why ?? "This one can’t be snoozed."}</p> : (
        <>
          {opts.map(([k, label, d]) => (
            <button key={k} type="button" className="tws-po" role="radio" aria-checked={pick === k} disabled={d > limit.ceiling} onClick={() => setPick(k)}>
              <span>{label}</span><em>{d > limit.ceiling ? "Too far" : fmt(addDays(today, d))}</em>
            </button>
          ))}
          <button type="button" className="tws-po" role="radio" aria-checked={pick === "cal"} onClick={() => setPick("cal")}>
            <span>Pick a date</span><em>{cal ? fmt(cal) : "Calendar"}</em>
          </button>
          {pick === "cal" ? <div style={{ padding: "0 4px" }}><DatePick value={cal ?? addDays(today, 1)} today={today} dir="future" onPick={setCal} /></div> : null}
          {pick === "cal" && cal && days > limit.ceiling ? <div className="tws-warn">{limit.why ?? "That’s further than this task can wait."}</div> : null}
          {ready ? (
            <>
              <button type="button" className="tws-go" data-tws="snooze-go" onClick={() => onSnooze(days, until)}>{ZZ}{own ? `Move it to ${fmt(until)}` : `Snooze until ${fmt(until)}`}</button>
            </>
          ) : null}
        </>
      )}
    </div>,
    document.body,
  );
};

export type DismissChoice = "logit" | "withdraw" | "card" | "dismiss" | "rule" | "unknown" | "delete";
interface Reason { k: DismissChoice; label: string; sub: string; warn?: boolean }

/** the reasons offered, by kind of task (the mock's table, less what the app cannot honour) */
export function dismissReasons(t: WsTask, ruleWord: string | null): Reason[] | null {
  const a = t.first;
  switch (t.kind) {
    case "offer": return null;
    case "send": case "rr": return [
      { k: "logit", label: "I’ve already sent it", sub: "Log it properly so the dates stay right" },
      { k: "withdraw", label: "I’ve decided not to send it", sub: `This withdraws your query to ${a}`, warn: true },
      { k: "card", label: "Something’s wrong with this task", sub: `The query’s details look off. Fix them on ${a}’s card` },
    ];
    case "nudge": return [
      { k: "logit", label: `I’ve already nudged ${a}`, sub: "Log it so the reply date resets" },
      { k: "dismiss", label: `I’d rather not nudge ${a}`, sub: "The query stays as it is. It comes back if anything changes" },
    ];
    case "quiet": return [
      { k: "dismiss", label: `Stop reminding me about ${a}`, sub: "The query stays in Gone quiet. It comes back if anything changes" },
      { k: "card", label: "Something’s wrong with this task", sub: "The dates look off. Fix them on the query card" },
    ];
    case "fix": return [
      ...(t.need === "responseTime" ? [{ k: "unknown" as const, label: `${a} doesn’t publish it`, sub: `Saved as “Not stated”, so ${a}’s card counts it as answered` }] : []),
      { k: "dismiss", label: `I don’t need this for ${a}`, sub: `Stops asking about ${a}’s details until you bring it back` },
      ...(ruleWord ? [{ k: "rule" as const, label: `Stop asking about ${ruleWord} for all agents`, sub: "You can turn it back on from the Done tab" }] : []),
    ];
    case "own": return [{ k: "delete", label: "Delete this task", sub: "It goes for good once the undo has gone", warn: true }];
    default: return [{ k: "dismiss", label: "This doesn’t need doing", sub: "It comes off your list until you bring it back" }];
  }
}

export const DismissPop: React.FC<{
  t: WsTask; ruleWord: string | null; opener: HTMLElement | null; onClose: () => void; onSnoozeInstead: () => void;
  onChoose: (c: DismissChoice) => void;
}> = ({ t, ruleWord, opener, onClose, onSnoozeInstead, onChoose }) => {
  const { ref, pos } = usePlace(opener);
  useEscapeLayer(true, onClose, ESC_LEVEL.page);
  const R = dismissReasons(t, ruleWord);
  const [sel, setSel] = useState<DismissChoice | null>(null);
  const chosen = R?.find((r) => r.k === sel) ?? null;
  const btn = !chosen ? "" : chosen.k === "logit" ? "Log it →" : chosen.k === "card" ? "Open the card ↗" : chosen.k === "withdraw" ? "Withdraw it →" : chosen.k === "delete" ? "Delete" : chosen.k === "unknown" ? "Save it" : chosen.k === "rule" ? "Stop asking" : "Dismiss";
  return createPortal(
    <div ref={ref} className="tws-layer tws-pop" role="dialog" aria-label="Dismiss" data-tws="dismiss-pop" style={{ left: pos.left, bottom: pos.bottom }}>
      {!R ? (
        <>
          <div className="tws-ph"><b>Offers can’t be dismissed</b><button type="button" className="tws-px" aria-label="Close" onClick={onClose}>✕</button></div>
          <p className="tws-pp">An offer needs an answer, even if that answer is “I need more time”.</p>
          <button type="button" className="tws-po" onClick={onSnoozeInstead}><span>Snooze it instead</span><em>→</em></button>
        </>
      ) : (
        <>
          <div className="tws-ph"><b>{t.kind === "own" ? "Delete this task?" : "Why doesn’t it need doing?"}</b><button type="button" className="tws-px" aria-label="Close" onClick={onClose}>✕</button></div>
          {R.map((r) => (
            <button key={r.k} type="button" className="tws-po" role="radio" aria-checked={sel === r.k} data-warn={r.warn ? "" : undefined} onClick={() => setSel(r.k)}>
              <i className="tws-rd" /><span>{r.label}<small>{r.sub}</small></span>
            </button>
          ))}
          {chosen?.k === "withdraw" ? <div className="tws-warn">{t.first}’s query moves to Closed as withdrawn. You can reopen it from the query card.</div> : null}
          {chosen ? <button type="button" className="tws-go" data-red={chosen.warn ? "" : undefined} onClick={() => onChoose(chosen.k)}>{btn}</button> : null}
        </>
      )}
    </div>,
    document.body,
  );
};
