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
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { PortalMenu } from "./PortalMenu";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { useConfirmAsk } from "./ConfirmAsk";
import { useTodoToast } from "./useTodoToast";
import { useScriptAllyDb } from "../../lib/db";
import { noteMenu, MenuLeaf } from "../../lib/todoMenu";
import { TagPicker } from "./TagPicker";
import { ArtSlot } from "./ArtSlot";
import { NOTE_EXAMPLES } from "./noteboardExamples";
import { useTagWrites } from "./useTagWrites";
import { toggleTagSel } from "../../lib/todoTags";
import { TAG_PALETTE } from "../../lib/todoFamily";
import { spellNumber } from "../../lib/todoColumns";
import { isNoteTask as isNote } from "../../lib/todoBoard";
import {
  NOTEBOARD_SUBTITLE, noteCountLabel, noteColour, sortNotes, noteRestoreFields,
  composerWithColour, editCommit, emptyDraft, noteTagChips, noteMatchesSearch,
  NOTE_COLOURS, NoteDraft, projectedTaskId, projectedTask, noteTaskTitle, draftFromExample,
} from "../../lib/noteboard";
import { newTag } from "../../lib/todoTags";
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
  const { userTasks, addUserTask, updateUserTask, deleteUserTask, setUserTaskColour, updateUserProfile, currentUser } = useScriptAllyDb();
  const { toast, flash, dismiss, pause, resume } = useTodoToast();
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();

  const [search, setSearch] = useState("");
  const [tagSel, setTagSel] = useState<string | null>(null); // one tag, or null for #All
  const [examples, setExamples] = useState(false); // the Examples drawer (P7)
  const [column, setColumn] = useState(false);
  const [menu, setMenu] = useState<{ note: UserTask; anchor: HTMLElement } | null>(null);
  /** The note being turned into a task, and the two answers the popover collects. */
  const [taskFor, setTaskFor] = useState<UserTask | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [tagsFor, setTagsFor] = useState<UserTask | null>(null); // tasks-pages P5 — the ⋯ Tags… sheet
  const [dateDraft, setDateDraft] = useState("");
  /** The composer: null when closed, a draft when open. It only ever PINS — editing happens on
   *  the card itself, so there is one host per job rather than one host wearing two hats. */
  const [compose, setCompose] = useState<NoteDraft | null>(null);
  /** The note being edited in place, and the words as they stand. */
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  /* ⚠️ THE TALLY AND THE VIEW ARE TWO LISTS. `pinned` is what is on the board; `notes` is what the
     search and the chip row have left of it. A count taken from the filtered list would state that
     searching had unpinned things. */
  const pinned = useMemo(() => sortNotes(userTasks), [userTasks]);

  const notes = useMemo(() => {
    const all = pinned;
    const searched = all.filter((n) => noteMatchesSearch(n, search));
    return tagSel ? searched.filter((n) => (n.tags ?? []).includes(tagSel)) : searched;
  }, [pinned, search, tagSel]);

  /* ⚠️ THE CHIPS READ `pinned`, NOT `notes`. Derived from the filtered view they would vanish as
     you used them — pick one and the others disappear, because nothing left on the board carries
     them any more. */
  const chips = useMemo(() => noteTagChips(pinned, currentUser?.tags ?? []), [pinned, currentUser?.tags]);

  const userTags = currentUser?.tags ?? [];
  const tagLabel = (id: string) => userTags.find((t) => t.id === id)?.label ?? id;

  /* ⚠️ DECLARED ABOVE ITS FIRST READER. `pinNote` calls `createTagDef`; a hook destructured
     below the function that reads it is the temporal-dead-zone shape this repo has shipped once
     already, and tsc does not catch it when the read sits inside a deferred body. */
  // board-optimise P2 — the shared pair (one copy for all four Tasks pages)
  const { createTagDef, applyTagToggle } = useTagWrites(flash);

  /** One composer, two doors — the tool row's button and the ghost tile both come through here. */
  const openComposer = (seed?: Partial<NoteDraft>) => setCompose({ ...emptyDraft(), ...seed });

  /**
   * ⚠️ THE NOTE IS WRITTEN PLAIN AND THE COLOUR FOLLOWS. `isValidUserTask` is `keys().hasOnly()`,
   * so an unlisted key denies the whole document — a create carrying `colour` while the rules
   * deploy is outstanding would lose the note, not the colour. Yellow needs no write at all,
   * because `noteColour` returns it for a note that has none.
   */
  const pinNote = async () => {
    if (!compose || saving) return;
    const body = compose.body.trim();
    if (!body) return;
    setSaving(true);
    try {
      const label = compose.tag.trim().replace(/^#/, "");
      let tagIds: string[] | undefined;
      if (label) {
        /* free text, one taxonomy — the typed tag becomes a real TagDef through the app's own
           minter rather than an untracked string only this page understands */
        const existing = userTags.find((t) => t.label.toLowerCase() === label.toLowerCase());
        if (existing) tagIds = [existing.id];
        else {
          const made = newTag(label, userTags);
          if (made) { await createTagDef(made); tagIds = [made.id]; }
        }
      }
      const id = await addUserTask({ text: body, ...(tagIds ? { tags: tagIds } : {}) });
      if (id && compose.colour !== "yellow") {
        const landed = await setUserTaskColour(id, compose.colour);
        if (!landed) flash("Pinned — but the colour didn’t save. It’s yellow for now.");
      }
      setCompose(null);
    } catch {
      flash("Couldn’t pin that — try again?");
    } finally {
      setSaving(false);
    }
  };

  /** The kebab's swatches, on a note that already exists. */
  const repaint = async (note: UserTask, colour: typeof NOTE_COLOURS[number]) => {
    const landed = await setUserTaskColour(note.id, colour);
    /* ⚠️ IT SAYS SO WHEN IT FAILS. `colour` is in firestore.rules and not in the deployed ruleset,
       so this write CAN be refused — and a swatch that silently does nothing is worse than no
       swatch, because it leaves the writer believing the colour was taken. */
    if (!landed) flash("Couldn’t change the colour — try again?");
  };

  /** Blur commits; an empty commit keeps the words that were there. */
  const commitEdit = async () => {
    if (!editing) return;
    const note = userTasks.find((t) => t.id === editing.id);
    const next = editCommit(note?.text ?? "", editing.text);
    setEditing(null);
    if (!note || next === note.text) return;
    try {
      await updateUserTask(note.id, { text: next });
    } catch {
      flash("Couldn’t save that — try again?");
    }
  };

  /**
   * ⚠️ A PROJECTION, NOT A MOVE. The note stays exactly where it is; a SECOND document appears,
   * dated, and the To-do list and the Calendar pick it up with no change to either — they read
   * every non-done `userTask` already. The link between the two is the projected task's ID, so
   * nothing is stored on the note and nothing has to be kept in step.
   */
  const makeTask = async () => {
    if (!taskFor || !dateDraft) return;
    const note = taskFor;
    const title = taskTitle.trim() || noteTaskTitle(note.text);
    if (!title) return;
    try {
      /* ⚠️ THE TAGS TRAVEL. Under the old in-place conversion they came for free — it was one
         document — and the claim ("the date is the door, the tags are the luggage") is worth
         keeping: a writer who filters #agents on the To-do board should not lose the task they
         made from an #agents note. It is the writer's own classification of the same subject. */
      await addUserTask({
        id: projectedTaskId(note.id), text: title, dueDate: dateDraft,
        ...(note.tags && note.tags.length ? { tags: note.tags } : {}),
      });
      setTaskFor(null);
      setDateDraft("");
      flash(`On your to-do list for ${new Date(dateDraft).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. The note stays here.`, {
        label: "Undo", fn: async () => { await deleteUserTask(projectedTaskId(note.id)); flash("Detached — the note stays here."); },
      });
    } catch {
      flash("Couldn’t add that to your tasks — try again?");
    }
  };

  /** The inverse: the task goes, the note does not. */
  const detachTask = async (note: UserTask) => {
    const task = projectedTask(note, userTasks);
    try {
      await deleteUserTask(projectedTaskId(note.id));
    } catch {
      flash("Couldn’t detach that — try again?");
      return;
    }
    flash("Detached — the note stays here.", task ? {
      label: "Undo",
      fn: async () => {
        await addUserTask({ id: task.id, text: task.text, dueDate: task.dueDate, createdAt: task.createdAt });
        flash("Back on your to-do list");
      },
    } : undefined);
  };

  const deleteNote = async (note: UserTask) => {
    /* ⚠️ CAPTURED BEFORE THE DELETE. After it there is nowhere left to read the note from, so
       "restore by id" would have nothing to restore. */
    const restore = noteRestoreFields(note);
    const ok = await confirmAsk(`Remove “${note.text}”?`, { confirmLabel: "Remove note", cancelLabel: "Keep it" });
    if (!ok) return;
    try {
      await deleteUserTask(note.id);
    } catch {
      flash("Couldn’t remove that — try again?");
      return;
    }
    /* the 8s undo — user content deserves the longest way back; same-id re-create, no new path */
    flash(`Removed — “${note.text}”`, {
      label: "Undo",
      fn: async () => {
        /* ⚠️ `createdAt` IS WHAT PUTS IT BACK WHERE IT WAS. The board is that field descending
           with no stored order, so an inverse without it returns the note to the TOP — present,
           in the wrong place, which reads as a bug in the board rather than in the undo. */
        const { colour, ...plain } = restore;
        await addUserTask(plain);
        /* and the paper follows on its own write, for the same reason the create never carries it */
        if (colour) await setUserTaskColour(restore.id, colour);
        flash("Pinned again");
      },
    }, 8000);
  };


  const onMenuPick = (item: MenuLeaf) => {
    if (!menu) return;
    const note = menu.note;
    setMenu(null);
    /* ⚠️ EDIT IS IN PLACE — it does not reopen the composer. One host per job: the composer PINS,
       the card EDITS. Routing edit back through the composer would put a second note-shaped box
       at the top of the board while the real one sat below it, unchanged. */
    if (item.id === "edit-task") setEditing({ id: note.id, text: note.text });
    if (item.id === "make-task") { setTaskFor(note); setTaskTitle(noteTaskTitle(note.text)); setDateDraft(""); }
    if (item.id === "detach-task") void detachTask(note);
    if (item.id === "tags") setTagsFor(note);
    if (item.id === "delete-task") void deleteNote(note);
  };

  return (
    <div className="t-f12 spine-root">
      {/* ⚠️ THE TOKENS SCOPE HERE, NOT ON THE ROOT. `tasksViewport` requires the exact
          attribute `className="t-f12 spine-root"` on all four Tasks pages — the one-column law —
          so a page that needs a class of its own hangs it one level down. */}
      <div className="tdb-wrap today-off nb-scope">
        <TasksPageLayout
          title="Noteboard"
          mark="noteboard"
          subtitle={NOTEBOARD_SUBTITLE}
          /* ⚠️ THE TALLY RIDES THE TOOL ROW. `PageHeaderProps` has no count slot — "the slot is
             DELETED from the variant (amendment 7)… the two pages that had one had their figure
             REHOMED rather than dropped". This is the third, and the eyebrow is the chassis's own
             word for it: "the plate carries identity while the tool row carries tallies". */
          eyebrow={noteCountLabel(pinned.length)}
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
              {/* ⚠️ THE CHIPS ARE THE TAGS IN USE, not the taxonomy. A tag the writer defined and
                  has not put on a note can only ever return nothing, so it is not offered. The
                  defs still supply the label — a raw `#t-letter` in a chip row is a leak. */}
              <span className="nb-chipset">
                {chips.map((c) => (
                  <button
                    key={c.id ?? "all"}
                    type="button"
                    className={`nb-chip${tagSel === c.id ? " on" : ""}`}
                    aria-pressed={tagSel === c.id}
                    onClick={() => setTagSel(c.id)}
                  >
                    #{c.label}
                  </button>
                ))}
              </span>
              <TplGrow />
              {/* the mockup's segmented pair — it replaces the "Read as a column" sentence, which
                  named one of the two states and left the other unspoken */}
              <span className="nb-viewtog">
                <button type="button" className={column ? "" : "on"} aria-pressed={!column} onClick={() => setColumn(false)}>Board</button>
                <button type="button" className={column ? "on" : ""} aria-pressed={column} onClick={() => setColumn(true)}>Column</button>
              </span>
              <button type="button" className="nb-btn-ghost" onClick={() => setExamples(true)}>Examples</button>
              <button type="button" className="tdb-addb" onClick={() => openComposer()}>
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
              <button type="button" className="tdb-addb" onClick={() => openComposer()}>
                <Plus size={13} aria-hidden /> Pin your first note
              </button>
            </div>
          ) : (
            <div className={`nb-board${column ? " nb-col1" : ""}`}>
              {!compose && (
                <button type="button" className="nb-ghost" onClick={() => openComposer()}>
                  + Pin a note
                </button>
              )}
              {compose && (
                /* the composer is a LIVE NOTE, in the flow, in the paper it is about to be —
                   not a modal and not a panel. It takes the ghost's place rather than sitting
                   beside it, so the board never shows two ways to start the same thing. */
                <div className={`nb-compose nb-c-${compose.colour}`}>
                  <textarea
                    className="nb-body nb-ta"
                    value={compose.body}
                    autoFocus
                    rows={3}
                    placeholder="Write it down before it goes…"
                    aria-label="Note"
                    disabled={saving}
                    onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Escape") setCompose(null); }}
                  />
                  <div className="nb-crow">
                    <div className="nb-swatches">
                      {NOTE_COLOURS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`nb-sw nb-c-${c}${compose.colour === c ? " on" : ""}`}
                          aria-label={c}
                          aria-pressed={compose.colour === c}
                          /* ⚠️ REPAINTS, NEVER RESTARTS — the swatch is pressed mid-sentence more
                             often than not, so the body and the tag come through untouched. */
                          onClick={() => setCompose(composerWithColour(compose, c))}
                        />
                      ))}
                    </div>
                    <input
                      className="nb-taginput"
                      value={compose.tag}
                      placeholder="#tag"
                      aria-label="Tag"
                      disabled={saving}
                      onChange={(e) => setCompose({ ...compose, tag: e.target.value.replace(/^#/, "") })}
                      onKeyDown={(e) => { if (e.key === "Escape") setCompose(null); }}
                    />
                    <div className="nb-cactions">
                      <button type="button" className="nb-ccancel" disabled={saving} onClick={() => setCompose(null)}>Cancel</button>
                      <button type="button" className="nb-csave" disabled={!compose.body.trim() || saving} onClick={() => void pinNote()}>
                        {saving ? "Pinning…" : "Pin it"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {notes.map((n) => (
                /* the paper is READ, never assumed — a note with no colour is yellow here, which
                   is also what a denied colour write leaves behind */
                <article key={n.id} data-note={n.id} className={`nb-note nb-c-${noteColour(n)}`}>
                  {editing?.id === n.id ? (
                    /* ⚠️ IN PLACE — the note's own body element is what is replaced, so the card
                       does not move, resize or reopen somewhere else while it is being edited. */
                    <textarea
                      className="nb-body nb-ta nb-edit"
                      value={editing.text}
                      autoFocus
                      aria-label={`Edit ${n.text}`}
                      onChange={(e) => setEditing({ id: n.id, text: e.target.value })}
                      onBlur={() => void commitEdit()}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
                    />
                  ) : (
                    <div className="nb-body">{n.text}</div>
                  )}
                  {/* ⚠️ THE OLD SPLIT'S SECOND BLOCK. Nothing writes `detail` any more — the
                      composer is one body — but notes written under the split have prose in it
                      and dropping it would lose their words. */}
                  {n.detail && <div className="nb-body nb-body--legacy">{n.detail}</div>}
                  {/* ⚠️ DERIVED FROM THE PROJECTION EXISTING — nothing is stored on the note. The
                      badge is how the writer knows the note has a task without the note having
                      become one. */}
                  {(() => {
                    const t = projectedTask(n, userTasks);
                    return t?.dueDate ? (
                      <div className="nb-taskbadge">
                        ✓ On your to-do list · {new Date(t.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                    ) : null;
                  })()}
                  <div className="nb-foot">
                    {(n.tags ?? []).map((tid) => {
                      const def = userTags.find((t) => t.id === tid);
                      const tone = def ? TAG_PALETTE[def.colour] : undefined;
                      return (
                        <span key={tid} className="nb-tag" style={tone ? { background: tone.bg, color: tone.tx } : undefined}>
                          #{tagLabel(tid)}
                        </span>
                      );
                    })}
                    <span className="nb-date">{pinDate(n.createdAt)}</span>
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
                  </div>
                </article>
              ))}
              {/* ⚠️ CONDITIONALLY RENDERED, never `hidden`. The UA sheet's `[hidden]{display:none}`
                  is weaker than any author display rule, so a flex or grid element wearing the
                  attribute stays on screen — the element is simply absent instead. It appears only
                  when a search or a chip is narrowing: an empty BOARD is a different state with
                  its own panel, and "nothing matches" would be the wrong sentence for it. */}
              {notes.length === 0 && (search.trim() || tagSel) && (
                <div className="nb-empty-search">Nothing matches that search.</div>
              )}
            </div>
          )}
          </TplZone>
        </TasksPageLayout>
      </div>

      {menu && (
        <PortalMenu
          anchor={menu.anchor}
          groups={noteMenu(!!projectedTask(menu.note, userTasks))}
          ariaLabel={`Actions for ${menu.note.text}`}
          onPick={onMenuPick}
          onClose={(returnFocus) => {
            setMenu((m) => { if (m && returnFocus) m.anchor.focus(); return null; });
          }}
        />
      )}

      {/* ⚠️ THE PROJECTION, NOT A CONVERSION. Two answers — what the task says and when it is due
          — and the copy states plainly that the note is not going anywhere, because the app spent
          a year teaching the opposite. */}
      {taskFor && (
        <div className="cal-dayscrim" onClick={() => setTaskFor(null)}>
          <div className="cal-daypanel nb-taskpanel" role="dialog" aria-label="Turn into a task" onClick={(e) => e.stopPropagation()}>
            <div className="cal-dayhead">
              Turn into a task
              <button type="button" className="cal-dayx" aria-label="Close" onClick={() => setTaskFor(null)}>✕</button>
            </div>
            <p className="nb-taskwhy">
              The task appears on your to-do list and calendar. The note stays here, unchanged.
            </p>
            <label className="nb-plabel" htmlFor="nb-task-title">Task</label>
            <input
              id="nb-task-title"
              className="nb-pinput"
              value={taskTitle}
              /* offered, never decided — a note is prose and a task is a thing to do, and the two
                 are only sometimes the same sentence */
              onChange={(e) => setTaskTitle(e.target.value)}
              aria-label="Task"
            />
            <label className="nb-plabel">Date</label>
            <BrandDatePicker value={dateDraft} onChange={setDateDraft} placeholder="Choose a date" />
            <div className="nb-cactions">
              <button type="button" className="nb-ccancel" onClick={() => setTaskFor(null)}>Cancel</button>
              <button type="button" className="nb-csave" disabled={!dateDraft || !taskTitle.trim()} onClick={() => void makeTask()}>Add to tasks</button>
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

      {/* ⚠️ THE EXAMPLES DRAWER — a right-hand sheet over a scrim. It TEACHES what belongs on a
          noteboard, which an empty board cannot: "pin a note" says what the control does and
          nothing about what is worth pinning. Its content is DATA (noteboardExamples.ts), ported
          verbatim from the ref and locked against it. */}
      {examples && (
        <>
          <div className="nb-scrim" onClick={() => setExamples(false)} />
          <aside
            className="nb-drawer"
            aria-label="Example notes"
            onKeyDown={(e) => { if (e.key === "Escape") setExamples(false); }}
          >
            <div className="nb-drawer-head">
              <h2>What writers keep here</h2>
              <p>
                Real kinds of notes from writers in the query trenches. Use any of these as a
                starting point — it lands on your board ready to edit.
              </p>
              <button type="button" className="nb-drawer-x" aria-label="Close" onClick={() => setExamples(false)}>✕</button>
            </div>
            <div className="nb-drawer-body">
              {NOTE_EXAMPLES.map((g) => (
                <div className="nb-exgroup" key={g.group}>
                  <span className="nb-exhead">{g.group}</span>
                  {g.items.map((ex) => (
                    <div className={`nb-exnote nb-c-${ex.colour}`} key={ex.body}>
                      <div className="nb-body">{ex.body}</div>
                      <div className="nb-exfoot">
                        <button
                          type="button"
                          className="nb-uselink"
                          /* seeds an editable copy; nothing is written until Pin it */
                          onClick={() => { setExamples(false); setCompose(draftFromExample(ex)); }}
                        >
                          Use as a starting point →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </aside>
        </>
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
