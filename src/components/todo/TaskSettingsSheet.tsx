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
import React, { useRef, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { todoPrefs, STALE_MONTHS_CHOICES, staleLabel } from "../../lib/todoPrefs";
import { TagsSheet } from "./TagsSheet";
import { useOverlay } from "../shell/useOverlay";
import { TASK_SETTING_ROWS, GROUP_LABEL, TaskSettingGroup, typeIsOn, setTypeMute, hiddenItems, HiddenItem } from "../../lib/taskSettings";

const GROUPS: TaskSettingGroup[] = ["urgent", "housekeeping", "rituals"];

export const TaskSettingsSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, updateUserProfile, upsertTaskFlag, updateUserTask, userTasks, taskFlags, agents, queries } = useScriptAllyDb();
  const muted = currentUser?.mutedTaskRules;
  const rootRef = useRef<HTMLDivElement>(null);

  /* ⚠️ THE JOURNEY PRESENTATION IS THE SHARED PRIMITIVE NOW (§3) — focus capture and return, the
     stage-scroll lock, the Tab trap and the backdrop test all came out of this file and
     `FocusFlow.tsx`, where they were the same twenty lines twice. What is left here is the one
     thing that was genuinely this sheet's own: a backdrop click CLOSES, because every switch has
     already been written and there is nothing staged to lose. (FocusFlow's nudges instead.)

     The trap also gained `select` and `textarea`, which this copy was missing — an accidental
     difference rather than a decision, and it meant Tab walked out of this sheet the moment
     anything with a dropdown was added to it. */
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    onEscape: onClose,
    scrimClasses: ["tdb-ff", "tdb-ffstage"],
    onScrimClick: onClose,
  });

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

  /* ⚠️ THE TAG CRUD MOVED TO ITS OWN SHEET (board-optimise P5 — TagsSheet). What stays here is
     the DOOR and the figure on it; rename/recolour/delete are a different kind of work from the
     four fixed behaviours above, and a list that grows with the writer was pushing them off the
     first screen. Only the count is read here. */
  const tags = currentUser?.tags ?? [];
  /* board-optimise P5 — the four behaviours, read through the TOTAL reader (absent map, absent
     field and nonsense all resolve to the stated default) and written as one merged map. */
  const prefs = todoPrefs(currentUser?.todoPrefs);
  const setPref = async (patch: Partial<typeof prefs>) => {
    await updateUserProfile({ todoPrefs: { ...prefs, ...patch } });
  };
  const [tagsOpen, setTagsOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  return (
    <div className="tdb-ff" role="dialog" aria-modal="true" aria-labelledby="tdb-tset-heading" ref={rootRef} tabIndex={-1} onKeyDown={trapTab} onClick={scrimClick}>
      <div className="tdb-ffstage">
        {/* C1 — the corner exit rides the wrapper (outside the sheet's clip), after the sheet in
            DOM = the trap's last tab stop. This sheet has no staged model, so the exit is always
            the clean immediate close. The parchment band lands in C2. */}
        <div className="tdb-ffwrap">
          <div className="tdb-ffsheet tdb-tset">
          {/* C2 — the neutral parchment band (no lane, no colour): hairline base, same anatomy */}
          <div className="tdb-fband paper">
            <div className="tdb-fbtx">
              <div className="tdb-ffstream off">TASK SETTINGS</div>
              <div className="tdb-ffq tdb-fbh" id="tdb-tset-heading">What lands on your desk?</div>
              <div className="tdb-fbsub">Choose which kinds of work ScriptAlly puts in front of you. Types you switch off leave the board <b>and the post-it counts</b> — out of sight is out of mind, properly.</div>
            </div>
          </div>
          <div className="tdb-ffbody">

            {/* ⚠️ THE FOUR DESK BEHAVIOURS (board-optimise P5; ref board-optimised.html §3) —
                each with its plain-spoken subtitle, each persisted on the user doc through the
                ONE todoPrefs map, each actually driving something (the good-day row feeds the
                Today column's WIP line; a setting that changed nothing would be furniture). */}
            <div className="tdb-tsetgroup">
              <div className="tdb-tsetgl"><span className="tdb-tsetgd" aria-hidden />HOW THE DESK BEHAVES</div>

              <div className="tdb-tsetrow">
                <div className="tdb-tsettx"><div className="tdb-tsett">Stale threshold</div><div className="tdb-tsets">When a silent query becomes housekeeping</div></div>
                <select
                  className="tdb-tsetsel"
                  aria-label="Stale threshold"
                  value={prefs.staleMonths}
                  onChange={(e) => void setPref({ staleMonths: Number(e.target.value) })}
                >
                  {STALE_MONTHS_CHOICES.map((m) => (
                    <option key={m} value={m}>{staleLabel(m)}</option>
                  ))}
                </select>
              </div>

              {/* ⚠️ "A GOOD DAY IS {n}" IS RETIRED (tasks-consolidation P2 follow-up, 9 Aug).
                  It advised on the size of the day's COMMITMENT, and committing work to a day is
                  exactly what the consolidation removed — the ranked order of the one list is the
                  plan. Its reader went with the board's Today column; a control with no reader is
                  the fault board-optimise P5 fixed when it gave the line the writer's number, so
                  the control goes rather than standing over nothing. The stored `todoPrefs` map
                  keeps its rules entry: three other settings still write it. */}

              <div className="tdb-tsetrow">
                <div className="tdb-tsettx"><div className="tdb-tsett">Roll unfinished work forward</div><div className="tdb-tsets">At midnight, undone moves to today</div></div>
                <button
                  type="button" role="switch" aria-checked={prefs.rollForward} aria-label="Roll unfinished work forward"
                  className={`tdb-tsetsw${prefs.rollForward ? " on" : ""}`}
                  onClick={() => void setPref({ rollForward: !prefs.rollForward })}
                />
              </div>

              <div className="tdb-tsetrow">
                <div className="tdb-tsettx"><div className="tdb-tsett">Weekly review briefing</div><div className="tdb-tsets">Mondays, above the list</div></div>
                <button
                  type="button" role="switch" aria-checked={prefs.weeklyBriefing} aria-label="Weekly review briefing"
                  className={`tdb-tsetsw${prefs.weeklyBriefing ? " on" : ""}`}
                  onClick={() => void setPref({ weeklyBriefing: !prefs.weeklyBriefing })}
                />
              </div>
            </div>

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
              <div className="tdb-tsetgl"><span className="tdb-tsetgd" aria-hidden />TAGS</div>
              {/* ⚠️ TAGS MANAGE IN THEIR OWN SHEET (board-optimise P5; the ref gives them their
                  own frame). Rename/recolour/delete are a different KIND of work from "how the
                  desk behaves" — inlining them made this sheet two sheets wearing one heading,
                  and the tag rows grew with the writer while the behaviours never do. The door
                  states the count, exactly as the ledger's does. */}
              <button type="button" className="tdb-tsetdoor" onClick={() => setTagsOpen(true)}>
                <span className="tdb-tsettx">
                  <span className="tdb-tsett">Your tags</span>
                  <span className="tdb-tsets">{tags.length === 0 ? "None yet — created where you tag" : `${tags.length} tag${tags.length === 1 ? "" : "s"} · rename, recolour, retire`}</span>
                </span>
                <span className="tdb-tsetgo">Manage →</span>
              </button>
            </div>

            <div className="tdb-tsetgroup">
              <div className="tdb-tsetgl"><span className="tdb-tsetgd hidden" aria-hidden />DISMISSED ITEMS</div>
              {/* ⚠️ THE LEDGER'S DOOR STATES ITS COUNT (board-optimise P5; ref §3 "14 in the
                  ledger — restorable · Review →"). The list itself opens beneath it: the figure
                  is the thing a reader wants at a glance, and a sheet that unrolled every hidden
                  item before its four behaviours had been read was answering a question nobody
                  had asked yet. Nothing here is deleted — only set aside. */}
              <button type="button" className="tdb-tsetdoor" onClick={() => setLedgerOpen((v) => !v)} aria-expanded={ledgerOpen}>
                <span className="tdb-tsettx">
                  <span className="tdb-tsett">Dismissed items</span>
                  <span className="tdb-tsets">
                    {hidden.length === 0 ? "Nothing set aside" : `${hidden.length} in the ledger — restorable`}
                  </span>
                </span>
                {hidden.length > 0 && <span className="tdb-tsetgo">{ledgerOpen ? "Hide" : "Review →"}</span>}
              </button>
              {ledgerOpen && hidden.length > 0 && (
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
          {tagsOpen && <TagsSheet onClose={() => setTagsOpen(false)} />}
      <button type="button" className="tdb-ffx" aria-label="Back to my desk" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskSettingsSheet;
