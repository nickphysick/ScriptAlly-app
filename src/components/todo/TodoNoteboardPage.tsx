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
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  NOTEBOARD_SUBTITLE, noteFilterLabel, noteColour, sortNotes, noteReceipt, firstTagLabel,
  sparseExamples, noteboardPrefs, NOTEBOARD_HINT, ExamplePaper, orderNotes, reorderIds, linkifyBody,
  composerWithColour, editCommit, emptyDraft, noteTagChips, noteMatchesSearch,
  NOTE_COLOURS, NoteDraft, draftFromExample,
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
  const { userTasks, addUserTask, updateUserTask, deleteUserTask, restoreUserTask, setUserTaskColour, updateUserProfile, currentUser } = useScriptAllyDb();
  const { toast, flash, dismiss, pause, resume } = useTodoToast();
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();

  const [search, setSearch] = useState("");
  const [tagSel, setTagSel] = useState<string | null>(null); // one tag, or null for #All
  const [examples, setExamples] = useState(false); // the Examples drawer (P7)
  const [column, setColumn] = useState(false);
  const [menu, setMenu] = useState<{ note: UserTask; anchor: HTMLElement } | null>(null);
  /** The note being turned into a task — the popover collects ONE answer now, the date. One
   *  object has one text, so the projection-era title field went with the projection: a separate
   *  short title could only land by overwriting the note's body, and the copy promises the note
   *  stays unchanged. The task reads as the note's body — the app's own original model. */
  const [taskFor, setTaskFor] = useState<UserTask | null>(null);
  const [tagsFor, setTagsFor] = useState<UserTask | null>(null); // tasks-pages P5 — the ⋯ Tags… sheet
  const [dateDraft, setDateDraft] = useState("");
  /** The composer: null when closed, a draft when open. With an `id` it is EDITING that note —
   *  seeded from it, rendered in its own board slot, committing with Save; without one it PINS,
   *  empty at the top. One component for both, because the composer already carries the textarea,
   *  the swatches and the tag input — which is what makes recolouring an existing note an
   *  ordinary edit rather than a control the kebab cannot host (finish run, Phase 3; the merge
   *  supersedes the pane round's one-host-per-job split, whose bare-textarea editor could touch
   *  ONLY the words). */
  const [compose, setCompose] = useState<(NoteDraft & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  /* ⚠️ THE TALLY AND THE VIEW ARE TWO LISTS. `pinned` is what is on the board; `notes` is what the
     search and the chip row have left of it. A count taken from the filtered list would state that
     searching had unpinned things. */
  /* ⚠️ THE WRITER'S ORDER WINS WHERE THEY HAVE STATED ONE; createdAt answers everywhere else.
     A stale list cannot hide a note — orderNotes is total over the notes it is given. */
  const pinned = useMemo(
    () => orderNotes(sortNotes(userTasks), currentUser?.todoPrefs?.noteboard?.order ?? []),
    [userTasks, currentUser?.todoPrefs?.noteboard?.order],
  );

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

  /* ── example papers (paper run, Phase 2) ─────────────────────────────────────────────────
     Not the user's data, so: below every real note, gone above three real notes, gone under ANY
     narrowing (they must never appear in filtered results), and a dismissal is permanent —
     persisted in todoPrefs.noteboard, which live data already nests sub-maps into. */
  const prefs = noteboardPrefs(currentUser);
  const narrowing = !!search.trim() || tagSel !== null;
  const examplePapers = narrowing ? [] : sparseExamples(pinned.length, prefs.dismissedExamples);

  /** ⚠️ EVERY WRITE SPREADS BOTH LAYERS. `updateUserProfile` replaces top-level fields, so a
   *  bare `{ todoPrefs: { noteboard } }` would silently drop the desk behaviours AND the To-do
   *  list's view prefs — the exact silent-loss shape the receipt fix retired one phase ago. */
  const saveNoteboardPrefs = async (patch: Partial<{ dismissedExamples: string[]; order: string[] }>) => {
    await updateUserProfile({
      todoPrefs: {
        ...currentUser?.todoPrefs,
        noteboard: { ...currentUser?.todoPrefs?.noteboard, ...patch },
      },
    });
  };

  /* ── drag to reorder (paper run, Phase 3) ───────────────────────────────────────────────
     HTML5 drag-and-drop, no dependency. `dragId` is the note in hand; `overId` draws the dashed
     drop target. The write is the ids of what is on the board RIGHT NOW, reordered — so a list
     that had drifted from the notes is repaired by the first drag rather than compounded. */
  /* ⚠️ THE NOTE IN HAND IS A REF, NOT ONLY STATE. `drop` must know what `dragstart` picked up,
     and a handler closes over the render it was created in — so a drop that arrives before React
     has re-rendered reads the OLD value and the move is silently dropped. Measured: three events
     dispatched in one synchronous block moved nothing at all, with every piece of the code
     present and correct. The state stays for the visuals (it must re-render to draw the dashed
     target); the ref is what the logic reads. */
  const dragIdRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const dropOn = async (targetId: string) => {
    const from = dragIdRef.current;
    dragIdRef.current = null;
    setDragId(null);
    setOverId(null);
    if (!from || from === targetId) return;
    const next = reorderIds(pinned.map((n) => n.id), from, targetId);
    try {
      await saveNoteboardPrefs({ order: next });
    } catch {
      flash("Couldn’t save that order — try again?");
    }
  };

  const dismissExample = async (id: string) => {
    try {
      await saveNoteboardPrefs({ dismissedExamples: [...prefs.dismissedExamples, id] });
    } catch {
      flash("Couldn’t dismiss that — try again?");
    }
  };

  /** Keep = a REAL note through the normal create path, then the example retires for good. */
  const keepExample = async (ex: ExamplePaper) => {
    try {
      const tagIds = await resolveTag(ex.tag);
      const id = await addUserTask({ text: ex.body, ...(tagIds ? { tags: tagIds } : {}) });
      if (id && ex.colour !== "yellow") {
        const landed = await setUserTaskColour(id, ex.colour);
        if (!landed) flash("Kept — but the colour didn’t save. It’s yellow for now.");
      }
      await saveNoteboardPrefs({ dismissedExamples: [...prefs.dismissedExamples, ex.id] });
      flash("Kept — it’s yours to edit now.");
    } catch {
      flash("Couldn’t keep that — try again?");
    }
  };

  /* ⚠️ THE HEM IS GATED ON MEASURED OVERFLOW, NOT EXISTENCE (paper run, Phase 1). It used to be
     `hem={notes.length > 0}`, so the chassis's sticky gradient rendered over whatever sat at the
     fold — measured: full-strength across two cards while the zone overflowed by TWO PIXELS,
     which is the "fade" the screenshot showed on cards and composer alike; their own paint was
     always flat. The state derives from the value (scrollHeight − clientHeight > 24), never from
     an event that could be missed, and the observers watch the zone AND its child — a
     ResizeObserver on a scroller alone says nothing when its content grows. */
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [zoneScrolls, setZoneScrolls] = useState(false);
  useEffect(() => {
    const board = boardRef.current;
    const zone = board?.closest(".tpl-zone") as HTMLElement | null;
    if (!zone) return;
    const read = () => setZoneScrolls(zone.scrollHeight - zone.clientHeight > 24);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(zone);
    if (board) ro.observe(board);
    return () => ro.disconnect();
    /* re-find the board when the empty-state branch swaps it in or out; sizes are the
       observers' job, existence is this dependency's */
  }, [notes.length === 0 && !compose]);
  const tagLabel = (id: string) => userTags.find((t) => t.id === id)?.label ?? id;

  /* ⚠️ DECLARED ABOVE ITS FIRST READER. `pinNote` calls `createTagDef`; a hook destructured
     below the function that reads it is the temporal-dead-zone shape this repo has shipped once
     already, and tsc does not catch it when the read sits inside a deferred body. */
  // board-optimise P2 — the shared pair (one copy for all four Tasks pages)
  const { createTagDef, applyTagToggle } = useTagWrites(flash);

  /** One composer, two doors — the tool row's button and the ghost tile both come through here. */
  const openComposer = (seed?: Partial<NoteDraft>) => setCompose({ ...emptyDraft(), ...seed });
  /** The kebab's Edit — the same composer, seeded, in the note's own slot. */
  const openEditor = (n: UserTask) =>
    setCompose({ id: n.id, body: n.text, colour: noteColour(n), tag: firstTagLabel(n, userTags) });

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
      const tagIds = await resolveTag(compose.tag);
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

  /** The typed tag → a real TagDef id, minted through the app's own minter when new — free text
   *  in, one taxonomy underneath. Shared by the pin and the edit. */
  const resolveTag = async (raw: string): Promise<string[] | undefined> => {
    const label = raw.trim().replace(/^#/, "");
    if (!label) return undefined;
    const existing = userTags.find((t) => t.label.toLowerCase() === label.toLowerCase());
    if (existing) return [existing.id];
    const made = newTag(label, userTags);
    if (!made) return undefined;
    await createTagDef(made);
    return [made.id];
  };

  /**
   * Save on an EXISTING note — each fact written only when it changed, so an untouched field
   * writes nothing and an untouched note writes nothing at all.
   *
   * ⚠️ AN EMPTY BODY KEEPS THE WORDS (`editCommit`): saving happens half by accident on a surface
   * whose promise is that nothing is final, and a blank commit must not turn destructive.
   *
   * ⚠️ THE TAG INPUT GOVERNS THE SET ONLY WHEN TOUCHED. It is a single field seeded with the
   * FIRST tag's label; a note can carry several through the ⋯ Tags… picker, and an edit that
   * never touched the field must not collapse them. Touched, it states the whole set — one tag,
   * or none when cleared — because a field that half-applies is worse than either reading.
   *
   * ⚠️ AND THE COLOUR WRITE STILL ANSWERS: refused (stale rules), the writer is told rather than
   * left believing the paper was taken — the dead-swatch rule, carried over from `repaint`,
   * which this function supersedes.
   */
  const saveEdit = async () => {
    if (!compose?.id || saving) return;
    const note = userTasks.find((t) => t.id === compose.id);
    if (!note) { setCompose(null); return; }
    setSaving(true);
    try {
      const body = editCommit(note.text, compose.body);
      if (body !== note.text) await updateUserTask(note.id, { text: body });
      if (compose.colour !== noteColour(note)) {
        const landed = await setUserTaskColour(note.id, compose.colour);
        if (!landed) flash("Saved — but the colour didn’t. Try it again?");
      }
      const typed = compose.tag.trim().replace(/^#/, "");
      if (typed.toLowerCase() !== firstTagLabel(note, userTags).toLowerCase()) {
        if (!typed) await updateUserTask(note.id, { tags: null });
        else {
          const ids = await resolveTag(typed);
          if (ids) await updateUserTask(note.id, { tags: ids });
        }
      }
      setCompose(null);
    } catch {
      flash("Couldn’t save that — try again?");
    } finally {
      setSaving(false);
    }
  };

  /**
   * ⚠️ ONE DOCUMENT, ONE WRITE EACH WAY (finish run, Phase 4 / Branch A — supersedes the
   * projection). The date goes onto the note itself; the To-do list and the Calendar pick the
   * SAME document up (userCard renders one row, cardActionYmd places it), so the duplicate row
   * the projection produced cannot exist. The note keeps its board place because the conversion
   * stamps its paper — `sortNotes` reads dated ∧ papered as "a note that became a task".
   *
   * ⚠️ THE PAPER IS STAMPED BEFORE THE DATE, AND A REFUSED STAMP STOPS THE CONVERSION. Dated
   * first, an unpapered note would leave the board between the two writes — and stay gone if the
   * colour write was then refused by stale rules. Refusal is told, not swallowed.
   */
  const makeTask = async () => {
    if (!taskFor || !dateDraft) return;
    const note = taskFor;
    try {
      if (note.colour === undefined) {
        const landed = await setUserTaskColour(note.id, "yellow");
        if (!landed) {
          flash("Couldn’t set that up — the note’s paper wouldn’t save. Try again?");
          return;
        }
      }
      await updateUserTask(note.id, { dueDate: dateDraft });
      setTaskFor(null);
      setDateDraft("");
      flash(`On your to-do list for ${new Date(dateDraft).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. The note stays here.`, {
        label: "Undo", fn: async () => { await updateUserTask(note.id, { dueDate: null }); flash("Detached — the note stays here."); },
      });
    } catch {
      flash("Couldn’t add that to your tasks — try again?");
    }
  };

  /** The inverse: the date goes, the note and its paper do not. */
  const detachTask = async (note: UserTask) => {
    const was = note.dueDate;
    try {
      await updateUserTask(note.id, { dueDate: null });
    } catch {
      flash("Couldn’t detach that — try again?");
      return;
    }
    flash("Detached — the note stays here.", was ? {
      label: "Undo",
      fn: async () => { await updateUserTask(note.id, { dueDate: was }); flash("Back on your to-do list"); },
    } : undefined);
  };

  const deleteNote = async (note: UserTask) => {
    /* ⚠️ THE WHOLE DOCUMENT, CAPTURED BEFORE THE DELETE — after it there is nowhere left to read
       the note from. A named field list here dropped `committedDate` and `estimateMin` (a note
       committed to Today came back silently uncommitted); the receipt is a copy of the document,
       so there is no list to chase the schema with. */
    const receipt = noteReceipt(note);
    const ok = await confirmAsk(`Remove “${note.text}”?`, { confirmLabel: "Remove note", cancelLabel: "Keep it" });
    if (!ok) return;
    try {
      await deleteUserTask(note.id);
    } catch {
      flash("Couldn’t remove that — try again?");
      return;
    }
    /* the 8s undo — user content deserves the longest way back */
    flash(`Removed — “${note.text}”`, {
      label: "Undo",
      /* ⚠️ REWRITTEN VERBATIM, never re-created through the builder. addUserTask stamps its own
         createdAt and accepts only the fields it knows about — the restore-through-create shape
         this run swept the app for. restoreUserTask puts back exactly what was held. */
      fn: async () => {
        await restoreUserTask(receipt);
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
    if (item.id === "edit-task") openEditor(note);
    if (item.id === "make-task") { setTaskFor(note); setDateDraft(""); }
    if (item.id === "detach-task") void detachTask(note);
    if (item.id === "tags") setTagsFor(note);
    if (item.id === "delete-task") void deleteNote(note);
  };

  /**
   * ⚠️ ONE COMPOSER, RENDERED IN TWO SLOTS — never twice. Pinning (`!compose.id`) it takes the
   * ghost's place at the top; editing it takes the NOTE'S OWN SLOT in the map, so the card does
   * not reopen somewhere else while it is being changed. The commit button is the only fork:
   * Pin it → `pinNote`, Save → `saveEdit`.
   */
  const composerCard = compose && (
    <div className={`nb-compose nb-c-${compose.colour}`}>
      <textarea
        className="nb-body nb-ta"
        value={compose.body}
        autoFocus
        rows={Math.max(3, compose.body.split("\n").length)}
        placeholder="Write it down before it goes…"
        aria-label={compose.id ? "Edit the note" : "Note"}
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
              /* ⚠️ REPAINTS, NEVER RESTARTS — the swatch is pressed mid-sentence more often
                 than not, so the body and the tag come through untouched. */
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
          <button
            type="button"
            className="nb-csave"
            disabled={(!compose.id && !compose.body.trim()) || saving}
            onClick={() => void (compose.id ? saveEdit() : pinNote())}
          >
            {saving ? "Saving…" : compose.id ? "Save" : "Pin it"}
          </button>
        </div>
      </div>
    </div>
  );

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
          /* ⚠️ NO RESTING TALLY (finish run, 1c). "N notes pinned" sat left of the search box
             and read as the field's label; the board self-evidences. The count that survives is
             the FILTERED one, in the tool row, only while a search or a chip narrows. */
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
              {/* only while something narrows — the pure label keeps the form in one place */}
              {(search.trim() || tagSel) && (
                <span className="nb-fcount">{noteFilterLabel(notes.length, pinned.length)}</span>
              )}
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
          <TplZone label="Notes" hem={zoneScrolls}>
          {/* ⚠️ THE EXAMPLE PAPERS SUPERSEDE THE EMPTY PANEL WHILE THEY LAST (paper run, Phase 2).
              The panel and the papers teach the same thing — what a note is for — and the papers
              do it with real examples the writer can keep, so two teaching surfaces at once is
              one too many. The panel returns the moment the papers are all dismissed, which is
              exactly when the board has nothing left to say for itself. Measured: clearing the
              seeds took the board to zero, the panel rendered, `.nb-board` never mounted and
              every example was unreachable — the sparse state could not be reached at all. */}
          {notes.length === 0 && !compose && examplePapers.length === 0 ? (
            /* the empty state TEACHES rather than apologises */
            <div className="nb-empty">
              {/* ⚠️ ART · NOTEBOARD-EMPTY (board-optimise P3) — first run only, ABOVE the copy
                  that was already written. The trigger is the same emptiness the state itself
                  keys on; nothing new is derived. */}
              <ArtSlot name="noteboard-empty" />
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
            <div ref={boardRef} className={`nb-board${column ? " nb-col1" : ""}`}>
              {!(compose && !compose.id) && (
                <button type="button" className="nb-ghost" onClick={() => openComposer()}>
                  + Pin a note
                </button>
              )}
              {compose && !compose.id && composerCard}
              {notes.map((n) => (
                /* while a note is being edited the composer takes ITS slot — the same masonry
                   position, so the edit happens where the note is rather than at the top */
                n.id === compose?.id ? (
                  <React.Fragment key={n.id}>{composerCard}</React.Fragment>
                ) : (
                /* the paper is READ, never assumed — a note with no colour is yellow here, which
                   is also what a denied colour write leaves behind */
                <article
                  key={n.id}
                  data-note={n.id}
                  /* ⚠️ REAL NOTES ONLY — the example papers are not the writer's data and are
                     never draggable (they carry no handlers and no draggable attribute). */
                  draggable
                  onDragStart={(e) => { dragIdRef.current = n.id; setDragId(n.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { dragIdRef.current = null; setDragId(null); setOverId(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (dragIdRef.current && dragIdRef.current !== n.id) setOverId(n.id); }}
                  onDragLeave={() => setOverId((o) => (o === n.id ? null : o))}
                  onDrop={(e) => { e.preventDefault(); void dropOn(n.id); }}
                  className={`nb-note nb-c-${noteColour(n)}${dragId === n.id ? " nb-dragging" : ""}${overId === n.id ? " nb-dragover" : ""}`}
                >
                  {/* ⚠️ NODES, NOT MARKUP — bare URLs become anchors and nothing else can.
                      The body is React children, which React escapes by construction, so a note
                      containing markup renders it as the words the writer typed. */}
                  <div className="nb-body">{linkifyBody(n.text)}</div>
                  {/* ⚠️ THE OLD SPLIT'S SECOND BLOCK. Nothing writes `detail` any more — the
                      composer is one body — but notes written under the split have prose in it
                      and dropping it would lose their words. */}
                  {n.detail && <div className="nb-body nb-body--legacy">{linkifyBody(n.detail)}</div>}
                  {/* the badge is the note's OWN date — one document, nothing to consult */}
                  {n.dueDate && (
                    <div className="nb-taskbadge">
                      ✓ On your to-do list · {new Date(n.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                  )}
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
                )
              ))}
              {/* ⚠️ EXAMPLE PAPERS — below every real note, never in filtered results, and only
                  while the board holds fewer than three. Each is a dashed reduced-opacity card
                  wearing its colour and an EXAMPLE chip; Keep pins a REAL copy through the
                  normal create path and retires the example for good. */}
              {examplePapers.length > 0 && (
                <div className="nb-exhint">{NOTEBOARD_HINT}</div>
              )}
              {examplePapers.map((ex) => (
                <div key={ex.id} data-example={ex.id} className={`nb-note nb-example nb-c-${ex.colour}`}>
                  <span className="nb-exlabel">Example</span>
                  <div className="nb-body">{linkifyBody(ex.body)}</div>
                  <div className="nb-ex-actions">
                    {ex.tag && <span className="nb-tag">#{ex.tag}</span>}
                    <button type="button" className="nb-keep" onClick={() => void keepExample(ex)}>Keep this</button>
                    <button type="button" className="nb-exdismiss" aria-label="Dismiss example" onClick={() => void dismissExample(ex.id)}>✕</button>
                  </div>
                </div>
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
          groups={noteMenu(!!menu.note.dueDate)}
          ariaLabel={`Actions for ${menu.note.text}`}
          onPick={onMenuPick}
          onClose={(returnFocus) => {
            setMenu((m) => { if (m && returnFocus) m.anchor.focus(); return null; });
          }}
        />
      )}

      {/* ⚠️ ONE ANSWER — the date. The title field went with the projection: one object has one
          text, and a separate short title could only land by overwriting the note's body, which
          the copy below promises not to do. The heading and body copy are the baked verbatim. */}
      {taskFor && (
        <div className="cal-dayscrim" onClick={() => setTaskFor(null)}>
          <div className="nb-scope cal-daypanel nb-taskpanel" role="dialog" aria-label="Turn into a task" onClick={(e) => e.stopPropagation()}>
            <div className="cal-dayhead">
              Turn into a task
              <button type="button" className="cal-dayx" aria-label="Close" onClick={() => setTaskFor(null)}>✕</button>
            </div>
            <p className="nb-taskwhy">
              The task appears on your to-do list and calendar. The note stays here, unchanged.
            </p>
            <label className="nb-plabel">Date</label>
            <BrandDatePicker value={dateDraft} onChange={setDateDraft} placeholder="Choose a date" />
            <div className="nb-cactions">
              <button type="button" className="nb-ccancel" onClick={() => setTaskFor(null)}>Cancel</button>
              <button type="button" className="nb-csave" disabled={!dateDraft} onClick={() => void makeTask()}>Add to tasks</button>
            </div>
          </div>
        </div>
      )}

      {/* the ⋯ Tags… — the ONE picker, immediate writes */}
      {tagsFor && (
        <div className="cal-dayscrim" onClick={() => setTagsFor(null)}>
          <div className="nb-scope cal-daypanel nb-datepanel" role="dialog" aria-label={`Tags for ${tagsFor.text}`} onClick={(e) => e.stopPropagation()}>
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
          <div className="nb-scope nb-scrim" onClick={() => setExamples(false)} />
          <aside
            /* ⚠️ IT CARRIES THE TOKEN SCOPE ITSELF. This renders OUTSIDE `.nb-scope` — the
               floating surfaces are siblings of the page body, not children of it — so every
               `var(--nb-*)` it reads resolved to nothing and the declaration was DROPPED. The
               drawer rendered fully transparent with the board showing through it, and six
               passing measurements never looked at it. A token being DEFINED somewhere is not
               the same as being IN SCOPE where it is read. */
            className="nb-scope nb-drawer"
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
