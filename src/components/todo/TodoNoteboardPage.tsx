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
import {
  NOTEBOARD_SUBTITLE, noteCountLabel, noteColour, sortNotes, noteRestoreFields,
  composerWithColour, editCommit, emptyDraft, NOTE_COLOURS, NoteDraft,
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
  const [tagSel, setTagSel] = useState<string | null>(null); // one tag or #All — P5 widens the vocabulary
  const [tagOpen, setTagOpen] = useState(false);
  const [column, setColumn] = useState(false);
  const [menu, setMenu] = useState<{ note: UserTask; anchor: HTMLElement } | null>(null);
  const [dateFor, setDateFor] = useState<UserTask | null>(null);
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
    const searched = search.trim()
      ? all.filter((n) => `${n.text} ${n.detail ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
      : all;
    return tagSel ? searched.filter((n) => (n.tags ?? []).includes(tagSel)) : searched;
  }, [pinned, search, tagSel]);

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
    if (item.id === "give-date") { setDateFor(note); setDateDraft(""); }
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
