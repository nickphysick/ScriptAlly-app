/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskSettingsSheet — "What lands on your desk?" (design ref design-refs/todo-task-settings-v2.html).
 * A NEW sheet in the journey PRESENTATION (the shared `.tdb-ff*` scrim/sheet + lockStageScroll +
 * a focus trap), but NOT a FocusFlow journey — no items, no staged model. Every switch applies
 * IMMEDIATELY (updateUserProfile on the shared `mutedTaskRules`); the board behind the dimmed
 * scrim re-derives live, which is the feedback. HIDDEN RIGHT NOW restores via existing primitives
 * only (rule removal / flag unset). Home is the board (per the pack), not Account Settings.
 */
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { lockStageScroll } from "../../lib/stageScroll";
import { TASK_SETTING_ROWS, GROUP_LABEL, TaskSettingGroup, typeIsOn, setTypeMute, hiddenItems, HiddenItem } from "../../lib/taskSettings";

const GROUPS: TaskSettingGroup[] = ["urgent", "housekeeping", "rituals"];

export const TaskSettingsSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, updateUserProfile, upsertTaskFlag, taskFlags, agents, queries } = useScriptAllyDb();
  const muted = currentUser?.mutedTaskRules;
  const rootRef = useRef<HTMLDivElement>(null);

  // journey presentation: capture focus, lock scroll, trap Tab, return focus on close
  useLayoutEffect(() => {
    const invoker = document.activeElement as HTMLElement | null;
    const release = lockStageScroll();
    rootRef.current?.focus();
    return () => { release(); invoker?.focus?.(); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const scrimClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.classList.contains("tdb-ff") || t.classList.contains("tdb-ffstage")) onClose(); // no staged model — closing is safe
  };

  const setSwitch = (key: NonNullable<(typeof TASK_SETTING_ROWS)[number]["key"]>, on: boolean) => {
    void updateUserProfile({ mutedTaskRules: setTypeMute(key, muted, on) });
  };
  const restore = (item: HiddenItem) => {
    const r = item.restore;
    if ("rule" in r) {
      void updateUserProfile({ mutedTaskRules: (muted ?? []).filter((k) => k !== r.rule) });
    } else {
      void upsertTaskFlag(r.flag, { snoozedUntil: null });
    }
  };

  const hidden = hiddenItems(muted, taskFlags, agents, queries, Date.now());

  return (
    <div className="tdb-ff" role="dialog" aria-modal="true" aria-labelledby="tdb-tset-heading" ref={rootRef} tabIndex={-1} onKeyDown={trapTab} onClick={scrimClick}>
      <div className="tdb-ffstage">
        <div className="tdb-ffsheet tdb-tset">
          <div className="tdb-ffbar">
            <span className="tdb-sp" />
            <button type="button" className="tdb-ffexit" onClick={onClose}>✕&nbsp;&nbsp;Back to my desk</button>
          </div>
          <div className="tdb-ffbody">
            <div className="tdb-ffstream off">TASK SETTINGS</div>
            <div className="tdb-ffq" id="tdb-tset-heading">What lands on your desk?</div>
            <div className="tdb-ffqsub">Choose which kinds of work ScriptAlly puts in front of you. Types you switch off leave the board <b>and the post-it counts</b> — out of sight is out of mind, properly.</div>

            {GROUPS.map((g) => (
              <div key={g} className="tdb-tsetgroup">
                <div className="tdb-tsetgl"><span className={`tdb-tsetgd ${g}`} aria-hidden />{GROUP_LABEL[g].toUpperCase()}</div>
                {TASK_SETTING_ROWS.filter((r) => r.group === g).map((r) => {
                  const on = r.locked ? true : typeIsOn(r.key!, muted);
                  return (
                    <div key={r.title} className={`tdb-tsetrow${r.locked ? " locked" : ""}`}>
                      <div className="tdb-tsettx"><div className="tdb-tsett">{r.title}</div><div className="tdb-tsets">{r.sub}</div></div>
                      {r.locked ? (
                        <span className="tdb-tsetlock">ALWAYS ON</span>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={r.title}
                          className={`tdb-tsetsw${on ? " on" : ""}`}
                          onClick={() => setSwitch(r.key!, !on)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="tdb-tsetgroup">
              <div className="tdb-tsetgl"><span className="tdb-tsetgd hidden" aria-hidden />HIDDEN RIGHT NOW</div>
              {hidden.length === 0 ? (
                <div className="tdb-tsetempty">Nothing set aside.</div>
              ) : (
                <div className="tdb-tsethid">
                  {hidden.map((h) => (
                    <div key={h.id} className="tdb-tsethrow">
                      <span className="tdb-tsethx"><b>{h.label}</b><span className="tdb-tsethm">{h.meta}</span></span>
                      <button type="button" className="tdb-tsetrestore" onClick={() => restore(h)}>Restore</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="tdb-tsetfoot">Restoring puts it straight back on the board. Nothing here is deleted — only set aside.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSettingsSheet;
