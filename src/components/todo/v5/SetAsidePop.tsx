/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.1 §I.3 — THE SET-ASIDE POPOVER. "Set aside" on the desk card (an own task: "Move it"), S and D all open
 * it, INSIDE the card above its foot, its arrow on the button that opened it, no scrim. Snooze above (four presets and
 * "Pick a date"); Dismiss below; the rules from `lib/todoSetAside` decide what is offered — a passed date offers no
 * snooze and the door to change the date, a deadline disables what would pass it, an offer waits a day at most and is
 * never dismissed, requested material is never dismissed.
 *
 * ⚠️ IT WRITES NOTHING. Every choice is a callback the page performs through the existing writers, with Undo. No
 *    confirmation dialog: Undo replaces it.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { presets, type SetAsideRules } from "../../../lib/todoSetAside";
import { MonthCal, dayLabel } from "./ComposeCard";

const plusDays = (ymd: string, n: number) => { const [y, m, d] = ymd.split("-").map(Number); const x = new Date(y, m - 1, d + n, 12); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };

export type PopMode = "aside" | "move" | "change";
export interface SetAsidePopProps {
  /** v5.2 §H.3 — the one-time explainer at the top; GOT IT calls `onExplained` (stored on the user) */
  explain?: boolean;
  onExplained?: () => void;
  mode: PopMode;
  focus: "snooze" | "dismiss";
  todayYmd: string;
  /** null for an own task and on the Set aside tab: nothing caps a move or a new date but the past */
  rules: SetAsideRules | null;
  first: string;
  /** the dismissal's return line: "Back if Sophie replies, …" / "Back if X's profile changes." / "Back only if you bring it back" */
  backLine: string;
  /** a housekeeping task's rule, in plain words, for "Stop asking about …, for every agent" */
  rulePlain: string | null;
  /** the deed in plain words, for "If you've decided not to …" */
  deedPlain: string;
  onSnooze: (days: number, ymd: string) => void;
  onDismiss: () => void;
  onRule: () => void;
  onDelete: () => void;
  onDoor: (d: "sendby" | "offer" | "withdraw" | "plan") => void;
  onClose: () => void;
  /** the button that opened it (its arrow points there; a press on it is not "outside") */
  opener: HTMLElement | null;
}

export const SetAsidePop: React.FC<SetAsidePopProps> = ({ explain = false, onExplained, mode, focus, todayYmd, rules, first, backLine, rulePlain, deedPlain, onSnooze, onDismiss, onRule, onDelete, onDoor, onClose, opener }) => {
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [cal, setCal] = useState(false);
  const ps = presets(todayYmd);
  const ceiling = rules ? rules.ceiling : 3650;
  const max = rules ? plusDays(todayYmd, ceiling) : null;
  const canSnooze = !rules || ceiling > 0;

  /* placed above the card's foot, its body never taller than the card above that foot, its arrow on the opener */
  useLayoutEffect(() => {
    const pop = ref.current;
    const card = pop?.closest<HTMLElement>(".td5-dcard");
    const foot = card?.querySelector<HTMLElement>('[data-td5="card-foot"]');
    if (!pop || !card) return;
    const fh = foot?.offsetHeight ?? 0;
    pop.style.bottom = `${fh + 10}px`;
    const room = card.clientHeight - fh - 22;
    const pf = pop.querySelector<HTMLElement>(".td5-pfoot")?.offsetHeight ?? 0;
    if (bodyRef.current) bodyRef.current.style.maxHeight = `${Math.max(140, room - pf)}px`;
    if (opener) {
      const pb = pop.getBoundingClientRect(), ob = opener.getBoundingClientRect();
      pop.style.setProperty("--ax", `${Math.max(14, Math.min(pb.width - 28, ob.left + ob.width / 2 - pb.left - 7))}px`);
    }
  });
  /* focus the section the key asked for, without moving the page */
  useEffect(() => {
    const p = ref.current;
    /* D focuses the Dismiss section's first control — its "Dismiss this task", or the door that replaces it (an offer, a
       request); S the first snooze it allows, else the section's door */
    const f = p?.querySelector<HTMLElement>(focus === "dismiss" ? '[data-td5="pop-dismiss"] button' : '[data-td5="pop-snooze"] button:not(:disabled)') ?? p?.querySelector<HTMLElement>("button");
    f?.focus({ preventScroll: true });
  }, [focus]);
  /* a press outside closes it; the opener is not outside */
  useEffect(() => {
    const on = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || opener?.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", on, true);
    return () => document.removeEventListener("pointerdown", on, true);
  }, [onClose, opener]);
  /* Escape: the calendar first, then the popover */
  useEscapeLayer(true, () => { if (cal) setCal(false); else onClose(); }, ESC_LEVEL.pageModal);
  /* 1–4 pick the presets */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!/^[1-4]$/.test(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const b = ref.current?.querySelectorAll<HTMLButtonElement>("[data-snz]")[Number(e.key) - 1];
      if (b && !b.disabled) { e.preventDefault(); e.stopPropagation(); b.click(); }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, []);

  const head = mode === "move" ? "Move it to" : mode === "change" ? "Bring it back on" : "Snooze";
  const sub = mode === "move" ? "Changes its due date. It stays on your corkboard." : mode === "change" ? "Pick a new day." : "It leaves your tray and comes back on the day.";
  const dl = rules?.deadline ?? null;

  return (
    <div ref={ref} className="td5-sapop" role="dialog" aria-label={mode === "move" ? "Move it" : "Set aside"} data-td5="aside-pop" data-mode={mode}>
      <div ref={bodyRef} className="td5-pbody">
        {explain && mode === "aside" ? (
          <div className="td52-explain" data-td52="explain">
            <span><b>Snooze</b> brings it back on the date you pick. <b>Dismiss</b> keeps it away until something changes on the query. Either way, nothing is lost.</span>
            <button type="button" data-td52="got-it" onClick={onExplained}>GOT IT</button>
          </div>
        ) : null}
        <div className="td5-psec" data-td5="pop-snooze">
          <div className="td5-ph"><b>{head}</b><span>{sub}</span></div>
          {canSnooze ? (
            <>
              <div className="td5-pchips">
                {ps.map((p) => (
                  <button key={p.k} type="button" className="td5-chp" data-snz={p.k} data-days={p.days} disabled={p.days > ceiling} onClick={() => onSnooze(p.days, p.ymd)}>
                    {p.label}<small>{dayLabel(p.ymd)}</small>
                  </button>
                ))}
                <button type="button" className="td5-chp" data-pick="" aria-expanded={cal} onClick={() => setCal((o) => !o)}>Pick a date</button>
              </div>
              {cal ? <MonthCal todayYmd={todayYmd} value={null} min={plusDays(todayYmd, 1)} max={max} onPick={(ymd) => {
                const days = Math.round((Date.parse(`${ymd}T12:00:00`) - Date.parse(`${todayYmd}T12:00:00`)) / 86400000);
                onSnooze(days, ymd);
              }} /> : null}
              {rules?.offer ? <p className="td5-pnote" data-td5="pop-offer">An offer can wait a day at most.{dl ? ` ${first || "The agent"} asked for an answer by ${dayLabel(dl.ymd)}.` : ""}</p>
                : dl && !dl.passed ? <p className="td5-pnote" data-td5="pop-cap">Can’t go past {dayLabel(dl.ymd)}, your {dl.what}.</p> : null}
              {rules?.nudge && mode === "aside" ? (
                <p className="td5-pnote" data-td5="pop-plan">Planning to nudge later? <button type="button" className="td5-plnk" onClick={() => onDoor("plan")}>Schedule the nudge instead</button>, so it’s kept on {first ? `${first}’s` : "the"} query.</p>
              ) : null}
              {rules && rules.putOff >= 2 && mode === "aside" ? (
                <div className="td5-pjn" data-td5="pop-putoff"><b>Put off {rules.putOff === 2 ? "twice" : `${rules.putOff} times`}</b>If you’ve decided not to {deedPlain}, dismissing keeps it out of the way until something changes.</div>
              ) : null}
            </>
          ) : (
            <div className="td5-pjn td5-pjn--check" data-td5="pop-passed">
              <b>Can’t be snoozed</b>Your {dl?.what ?? "date"} {dl && dl.ymd < todayYmd ? `passed on ${dayLabel(dl.ymd)}` : "is today"}. Snoozing would hide a date that’s already gone.{" "}
              {dl?.what === "send-by date" ? <button type="button" className="td5-plnk" data-td5="pop-sendby" onClick={() => onDoor("sendby")}>Set a new send-by date →</button>
                : <button type="button" className="td5-plnk" onClick={() => onDoor("offer")}>Record where you are →</button>}
            </div>
          )}
        </div>
        {mode === "aside" ? (
          <div className="td5-psec" data-td5="pop-dismiss">
            <div className="td5-ph"><b>Dismiss</b>{rules?.noDismiss ? null : <span>It comes back only if something changes</span>}</div>
            {rules?.noDismiss === "offer" ? (
              <p className="td5-pnote" data-td5="pop-nodismiss">An offer can’t be dismissed. It needs an answer. <button type="button" className="td5-plnk" onClick={() => onDoor("offer")}>Record where you are →</button></p>
            ) : rules?.noDismiss === "material" ? (
              <p className="td5-pnote" data-td5="pop-nodismiss">{first || "The agent"} asked for this, so it stays until it’s sent or the query ends. Not sending it? <button type="button" className="td5-plnk" onClick={() => onDoor("withdraw")}>Withdraw the query →</button></p>
            ) : (
              <>
                <button type="button" className="td5-pdis" data-dis="one" onClick={onDismiss}><b>Dismiss this task</b><small>{backLine}</small></button>
                {rulePlain ? (
                  <button type="button" className="td5-pdis" data-dis="rule" onClick={onRule}><b>Stop asking about {rulePlain}, for every agent</b><small>Switches it off for everyone. Turn it back on from Set aside.</small></button>
                ) : null}
              </>
            )}
          </div>
        ) : mode === "move" ? (
          <div className="td5-psec"><button type="button" className="td5-plnk td5-del" data-td5="pop-delete" onClick={onDelete}>Delete the task</button></div>
        ) : null}
      </div>
      <div className="td5-pfoot"><span className="td5-pkeys">{mode === "aside" ? <><kbd>S</kbd> or <kbd>D</kbd> opens this · </> : null}<kbd>1</kbd>–<kbd>4</kbd> pick · <kbd>Esc</kbd> close</span></div>
    </div>
  );
};
