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
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { TAG_PALETTE } from "../../lib/todoFamily";
import { TAG_COLOURS, normaliseTagLabel, tagUsageCounts } from "../../lib/todoTags";
import { TagColour } from "../../types";
import { lockStageScroll } from "../../lib/stageScroll";
import { TASK_SETTING_ROWS, GROUP_LABEL, TaskSettingGroup, typeIsOn, setTypeMute, hiddenItems, HiddenItem } from "../../lib/taskSettings";

const GROUPS: TaskSettingGroup[] = ["urgent", "housekeeping", "rituals"];

export const TaskSettingsSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, updateUserProfile, upsertTaskFlag, updateUserTask, userTasks, taskFlags, agents, queries } = useScriptAllyDb();
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

  /* ⚠️ TAGS CRUD (tasks-pages P5). Rename and recolour edit the DEFINITION (one user-doc write);
     ⚠️ DELETE DETACHES, NEVER DELETES ITEMS: the def leaves the user doc and the id is removed
     from every task carrying it — the tasks themselves are untouched. Arm-then-confirm inline
     (no native dialogs). Usage counts are derived live. */
  const tags = currentUser?.tags ?? [];
  const tagCounts = tagUsageCounts(userTasks);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  const renameTag = async (id: string) => {
    const label = normaliseTagLabel(renameDraft);
    if (!label || tags.some((t) => t.id !== id && t.label === label)) return;
    await updateUserProfile({ tags: tags.map((t) => (t.id === id ? { ...t, label } : t)) });
    setRenaming(null);
  };
  const recolourTag = async (id: string, colour: TagColour) => {
    await updateUserProfile({ tags: tags.map((t) => (t.id === id ? { ...t, colour } : t)) });
  };
  const deleteTag = async (id: string) => {
    setArmedDelete(null);
    // detach from every item first, then drop the definition — the items survive whole
    for (const t of userTasks) {
      if (t.tags?.includes(id)) {
        const rest = t.tags.filter((x) => x !== id);
        await updateUserTask(t.id, { tags: rest.length ? rest : null });
      }
    }
    await updateUserProfile({ tags: tags.filter((t) => t.id !== id) });
  };

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
              {tags.length === 0 ? (
                <div className="tdb-tsetempty">No tags yet — create them where you tag: the composer, an item’s sheet, or a card’s ⋯ menu.</div>
              ) : (
                tags.map((t) => (
                  <div key={t.id} className="tdb-tsetrow tdb-tsettag">
                    <span className="tdb-tsettagsw" style={{ background: TAG_PALETTE[t.colour].bg, borderColor: TAG_PALETTE[t.colour].tx }} aria-hidden />
                    {renaming === t.id ? (
                      <input
                        className="tdb-tsettagin"
                        value={renameDraft}
                        autoFocus
                        aria-label={`Rename #${t.label}`}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void renameTag(t.id);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        onBlur={() => void renameTag(t.id)}
                      />
                    ) : (
                      <button type="button" className="tdb-tsettagl" title="Rename" onClick={() => { setRenaming(t.id); setRenameDraft(t.label); }}>
                        #{t.label}
                      </button>
                    )}
                    <span className="tdb-tsettagct">{tagCounts.get(t.id) ?? 0}</span>
                    <span className="tdb-tsettagpal" role="group" aria-label={`Colour for #${t.label}`}>
                      {TAG_COLOURS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`tdb-tsettagc${t.colour === c ? " on" : ""}`}
                          style={{ background: TAG_PALETTE[c].bg, borderColor: TAG_PALETTE[c].tx }}
                          aria-label={c}
                          aria-pressed={t.colour === c}
                          onClick={() => void recolourTag(t.id, c)}
                        />
                      ))}
                    </span>
                    {armedDelete === t.id ? (
                      <button type="button" className="tdb-tsettagdel armed" onClick={() => void deleteTag(t.id)}>Sure?</button>
                    ) : (
                      <button type="button" className="tdb-tsettagdel" onClick={() => setArmedDelete(t.id)}>Delete</button>
                    )}
                  </div>
                ))
              )}
              <div className="tdb-tsetfoot">Deleting a tag detaches it from notes and tasks — it never deletes them.</div>
            </div>

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
          <button type="button" className="tdb-ffx" aria-label="Back to my desk" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskSettingsSheet;
