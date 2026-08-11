/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoNoteboardPage — /todo/noteboard (tasks-pages pack, Phase 4; ref design-refs/tasks-pages.html,
 * the NOTEBOARD frame).
 *
 * ⚠️ NOTES ONLY — NOTHING DERIVED REACHES THIS BOARD. A note is the app's only user-owned,
 * dateless, chase-free object (the two-natures law): userTasks with no dueDate and no tick.
 * Derived work has other rooms.
 *
 * ⚠️ NO PAGE SIDEBAR, deliberately (the pack's word over the ref's drawing): the Noteboard's only
 * filter dimension is TAGS, and that control lives in the tool row — a FILTERS panel of work
 * facets beside a board that can never contain work would be chrome describing another page.
 *
 * ⚠️ THE DATE IS THE DOOR. "Give it a date…" converts a note to a task with ONE write (dueDate):
 * it leaves this board, joins the To-do list's Your-tasks group and appears on the Calendar — one
 * object, three rooms. Nothing copies, nothing moves; the derivation reads the new fact.
 *
 * ⚠️ DELETE IS REAL HERE — user content is the only deletable kind — so it asks first (the styled
 * confirm) and holds an 8s undo that re-creates the SAME document id through addUserTask.
 */
import React, { useMemo, useState } from "react";
import { Plus, Search, AlignLeft, MoreHorizontal } from "lucide-react";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { PortalMenu } from "./PortalMenu";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { useConfirmAsk } from "./ConfirmAsk";
import { useTodoToast } from "./useTodoToast";
import { useScriptAllyDb } from "../../lib/db";
import { noteMenu, MenuLeaf } from "../../lib/todoMenu";
import { TagPicker } from "./TagPicker";
import { ArtSlot } from "./ArtSlot";
import { useTagWrites } from "./useTagWrites";
import { toggleTagSel } from "../../lib/todoTags";
import { TAG_PALETTE } from "../../lib/todoFamily";
import { spellNumber } from "../../lib/todoColumns";
import { isNoteTask as isNote } from "../../lib/todoBoard";
import { UserTask, TagDef } from "../../types";
import "./tasksLayout.css";
import "./taskChrome.css";
import "./todoNoteboard.css";

export interface TodoNoteboardPageProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  onNavigatePath?: (p: string) => void;
}



/** "23 JUL" — the pin date, from createdAt. */
const pinDate = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase() : "";

export const TodoNoteboardPage: React.FC<TodoNoteboardPageProps> = () => {
  const { userTasks, addUserTask, updateUserTask, deleteUserTask, updateUserProfile, currentUser } = useScriptAllyDb();
  const { toast, flash, dismiss, pause, resume } = useTodoToast();
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();

  const [search, setSearch] = useState("");
  const [tagSel, setTagSel] = useState<string | null>(null); // one tag or #All — P5 widens the vocabulary
  const [tagOpen, setTagOpen] = useState(false);
  const [column, setColumn] = useState(false);
  const [menu, setMenu] = useState<{ note: UserTask; anchor: HTMLElement } | null>(null);
  const [dateFor, setDateFor] = useState<UserTask | null>(null);
  const [tagsFor, setTagsFor] = useState<UserTask | null>(null); // tasks-pages P5 — the ⋯ Tags… sheet
  const [dateDraft, setDateDraft] = useState("");
  /** The composer: null closed · "new" pinning · a task id editing. */
  const [compose, setCompose] = useState<null | { id?: string; text: string; detail: string }>(null);
  const [saving, setSaving] = useState(false);

  const notes = useMemo(() => {
    const all = userTasks.filter(isNote)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const searched = search.trim()
      ? all.filter((n) => `${n.text} ${n.detail ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
      : all;
    return tagSel ? searched.filter((n) => (n.tags ?? []).includes(tagSel)) : searched;
  }, [userTasks, search, tagSel]);

  const userTags = currentUser?.tags ?? [];
  const tagLabel = (id: string) => userTags.find((t) => t.id === id)?.label ?? id;

  const subtitle = notes.length === 0
    ? "Thoughts that aren’t tasks yet."
    : `${spellNumber(notes.length)[0].toUpperCase()}${spellNumber(notes.length).slice(1)} note${notes.length === 1 ? "" : "s"} pinned — thoughts that aren’t tasks yet.`;

  const saveCompose = async () => {
    if (!compose || saving) return;
    const text = compose.text.trim();
    if (!text) return;
    setSaving(true);
    try {
      if (compose.id) {
        await updateUserTask(compose.id, { text, detail: compose.detail.trim() || null });
      } else {
        await addUserTask({ text, detail: compose.detail.trim() || undefined });
      }
      setCompose(null);
    } catch {
      flash("Couldn’t save that — try again?");
    } finally {
      setSaving(false);
    }
  };

  /* ⚠️ THE CONVERSION — one write; the derivation does the moving. */
  const giveDate = async () => {
    if (!dateFor || !dateDraft) return;
    const note = dateFor;
    try {
      await updateUserTask(note.id, { dueDate: dateDraft });
      setDateFor(null);
      setDateDraft("");
      flash(`Now a task — due ${new Date(dateDraft).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. It’s on your To-do list and the Calendar.`, {
        label: "Undo", fn: async () => { await updateUserTask(note.id, { dueDate: null }); flash("A note again"); },
      });
    } catch {
      flash("Couldn’t set the date — try again?");
    }
  };

  const deleteNote = async (note: UserTask) => {
    const ok = await confirmAsk(`Delete “${note.text}”?`, { confirmLabel: "Delete the note", cancelLabel: "Keep it" });
    if (!ok) return;
    try {
      await deleteUserTask(note.id);
    } catch {
      flash("Couldn’t delete that — try again?");
      return;
    }
    /* the 8s undo — user content deserves the longest way back; same-id re-create, no new path */
    flash(`Deleted — “${note.text}”`, {
      label: "Undo",
      fn: async () => {
        await addUserTask({ id: note.id, text: note.text, detail: note.detail });
        flash("Pinned again");
      },
    }, 8000);
  };

  // board-optimise P2 — the shared pair (one copy for all four Tasks pages)
  const { createTagDef, applyTagToggle } = useTagWrites(flash);

  const onMenuPick = (item: MenuLeaf) => {
    if (!menu) return;
    const note = menu.note;
    setMenu(null);
    if (item.id === "edit-task") setCompose({ id: note.id, text: note.text, detail: note.detail ?? "" });
    if (item.id === "give-date") { setDateFor(note); setDateDraft(""); }
    if (item.id === "tags") setTagsFor(note);
    if (item.id === "delete-task") void deleteNote(note);
  };

  return (
    <div className="t-f12 spine-root">
      <div className="tdb-wrap today-off">
        <TasksPageLayout
          title="Noteboard"
          subtitle={subtitle}
          tools={
            <>
              <span className="nb-search">
                <Search size={13} aria-hidden />
                <input
                  type="text"
                  placeholder="Search your notes…"
                  aria-label="Search your notes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setSearch(""); }}
                />
              </span>
              <span className="nb-tagwrap">
                <button type="button" className="cal-nav" aria-haspopup="menu" aria-expanded={tagOpen} onClick={() => setTagOpen((v) => !v)}>
                  #{tagSel ? tagLabel(tagSel) : "All"} ▾
                </button>
                {tagOpen && (
                  <div className="cal-viewmenu" role="menu">
                    <button type="button" role="menuitem" aria-current={tagSel === null} onClick={() => { setTagSel(null); setTagOpen(false); }}>#All</button>
                    {userTags.map((t) => (
                      <button key={t.id} type="button" role="menuitem" aria-current={tagSel === t.id} onClick={() => { setTagSel(t.id); setTagOpen(false); }}>
                        #{t.label}
                      </button>
                    ))}
                  </div>
                )}
              </span>
              <button type="button" className={`cal-nav${column ? " on" : ""}`} aria-pressed={column} onClick={() => setColumn((v) => !v)}>
                <AlignLeft size={13} aria-hidden /> Read as a column
              </button>
              <TplGrow />
              <button type="button" className="tdb-addb" onClick={() => setCompose({ text: "", detail: "" })}>
                <Plus size={13} aria-hidden /> Pin a note
              </button>
            </>
          }
          /* ⚠️ NO sidebar prop — the contract renders no aside at all */
        >
          {/* ⚠️ THE MASONRY IS THE SCROLLZONE (tasks-viewport P4): the header and tool row are
              fixed above it, and the notes scroll beneath under their own hem. */}
          <TplZone label="Notes" hem={notes.length > 0}>
          {notes.length === 0 && !compose ? (
            /* the empty state TEACHES rather than apologises */
            <div className="nb-empty">
              {/* ⚠️ ART · NOTEBOARD-EMPTY (board-optimise P3) — first run only, ABOVE the copy
                  that was already written. The trigger is the same emptiness the state itself
                  keys on; nothing new is derived. */}
              <ArtSlot name="noteboard-empty" className="nb-art" />
              <h3>Nothing pinned yet</h3>
              <p>
                Notes are for the things you want to remember but don’t need chasing — a thought
                about an agent, a line for the query letter, where you left off. They sit here,
                dateless and quiet. The day one becomes real work, give it a date from its ⋯ menu
                and it walks itself to your To-do list and the Calendar.
              </p>
              <button type="button" className="tdb-addb" onClick={() => setCompose({ text: "", detail: "" })}>
                <Plus size={13} aria-hidden /> Pin your first note
              </button>
            </div>
          ) : (
            <div className={`nb-grid${column ? " column" : ""}`}>
              {!compose && (
                <button type="button" className="nb-add" onClick={() => setCompose({ text: "", detail: "" })}>
                  ＋ Pin a note
                </button>
              )}
              {compose && (
                <div className="nb-note nb-compose">
                  <input
                    className="nb-nt-in"
                    value={compose.text}
                    autoFocus
                    placeholder="Jot it down…"
                    aria-label="Note"
                    disabled={saving}
                    onChange={(e) => setCompose({ ...compose, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); void saveCompose(); }
                      if (e.key === "Escape") setCompose(null);
                    }}
                  />
                  <textarea
                    className="nb-nb-in"
                    value={compose.detail}
                    rows={2}
                    placeholder="A little more (optional)…"
                    aria-label="Detail"
                    disabled={saving}
                    onChange={(e) => setCompose({ ...compose, detail: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Escape") setCompose(null); }}
                  />
                  <div className="nb-cactions">
                    <button type="button" className="nb-csave" disabled={!compose.text.trim() || saving} onClick={() => void saveCompose()}>
                      {saving ? "Saving…" : compose.id ? "Save changes" : "Pin it"}
                    </button>
                    <button type="button" className="nb-ccancel" disabled={saving} onClick={() => setCompose(null)}>Cancel</button>
                  </div>
                </div>
              )}
              {notes.map((n) => (
                <article key={n.id} className="nb-note">
                  <div className="nb-nt">{n.text}</div>
                  {n.detail && <div className="nb-nb">{n.detail}</div>}
                  <div className="nb-nf">
                    {(n.tags ?? []).map((tid) => {
                      const def = userTags.find((t) => t.id === tid);
                      const tone = def ? TAG_PALETTE[def.colour] : undefined;
                      return (
                        <span key={tid} className="nb-tag" style={tone ? { background: tone.bg, color: tone.tx } : undefined}>
                          #{tagLabel(tid)}
                        </span>
                      );
                    })}
                    <span className="nb-when">{pinDate(n.createdAt)}</span>
                  </div>
                  {/* the same reserved-corner ⋯ as board cards, feeding the same PortalMenu shell */}
                  <button
                    type="button"
                    className="tbd-more"
                    aria-haspopup="menu"
                    aria-expanded={menu?.note.id === n.id}
                    aria-label={`Actions for ${n.text}`}
                    onClick={(e) => {
                      const anchor = e.currentTarget;
                      setMenu((m) => (m?.note.id === n.id ? null : { note: n, anchor }));
                    }}
                  >
                    <MoreHorizontal size={15} aria-hidden />
                  </button>
                </article>
              ))}
            </div>
          )}
          </TplZone>
        </TasksPageLayout>
      </div>

      {menu && (
        <PortalMenu
          anchor={menu.anchor}
          groups={noteMenu()}
          ariaLabel={`Actions for ${menu.note.text}`}
          onPick={onMenuPick}
          onClose={(returnFocus) => {
            setMenu((m) => { if (m && returnFocus) m.anchor.focus(); return null; });
          }}
        />
      )}

      {/* the conversion door — one date, one write */}
      {dateFor && (
        <div className="cal-dayscrim" onClick={() => setDateFor(null)}>
          <div className="cal-daypanel nb-datepanel" role="dialog" aria-label="Give it a date" onClick={(e) => e.stopPropagation()}>
            <div className="cal-dayhead">
              Give it a date
              <button type="button" className="cal-dayx" aria-label="Close" onClick={() => setDateFor(null)}>✕</button>
            </div>
            <p className="nb-datewhy">
              A date turns “{dateFor.text}” into a task: it leaves the Noteboard, joins your
              To-do list, and appears on the Calendar.
            </p>
            <BrandDatePicker value={dateDraft} onChange={setDateDraft} placeholder="Choose a date" />
            <div className="nb-cactions">
              <button type="button" className="nb-csave" disabled={!dateDraft} onClick={() => void giveDate()}>Make it a task</button>
              <button type="button" className="nb-ccancel" onClick={() => setDateFor(null)}>Keep it a note</button>
            </div>
          </div>
        </div>
      )}

      {/* the ⋯ Tags… — the ONE picker, immediate writes */}
      {tagsFor && (
        <div className="cal-dayscrim" onClick={() => setTagsFor(null)}>
          <div className="cal-daypanel nb-datepanel" role="dialog" aria-label={`Tags for ${tagsFor.text}`} onClick={(e) => e.stopPropagation()}>
            <div className="cal-dayhead">
              Tags — {tagsFor.text}
              <button type="button" className="cal-dayx" aria-label="Close" onClick={() => setTagsFor(null)}>✕</button>
            </div>
            <TagPicker
              tags={userTags}
              selected={(userTasks.find((t) => t.id === tagsFor.id)?.tags) ?? []}
              onToggle={(tid) => {
                const cur = userTasks.find((t) => t.id === tagsFor.id)?.tags;
                void applyTagToggle(tagsFor.id, cur, tid);
              }}
              onCreate={(tag) => {
                const cur = userTasks.find((t) => t.id === tagsFor.id)?.tags;
                void createTagDef(tag);
                void applyTagToggle(tagsFor.id, cur, tag.id);
              }}
            />
          </div>
        </div>
      )}

      {confirmAskNode}
      {toast && (
        <div className="tdb-toast" role="status" onMouseEnter={pause} onMouseLeave={resume}>
          {toast.msg}
          {toast.action && (
            <button type="button" className="tdb-toast-act" onClick={() => { void toast.action!.fn(); dismiss(); }}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
