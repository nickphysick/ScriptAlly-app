/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoNoteboardPage — THE CORKBOARD, /todo/corkboard (Corkboard v1, 12 Oct; ref design-refs/corkboard-v4/).
 * The Noteboard renamed and redrawn: the same notes, the same store, the same writes. The file, the `nb-`
 * classes and `todoPrefs.noteboard` keep their names — they are identifiers, not captions.
 * (History: tasks-pages pack, Phase 4; ref design-refs/tasks-pages.html, the NOTEBOARD frame.)
 *
 * ⚠️ THE PAGE SCROLLS, UNDER THE SHARED NUMBER PANEL ("8 notes pinned to your corkboard"). Under it, one row:
 * the "Add to your board" bar (Note in three papers, Task) and the find box and tag chips. Filtering FADES.
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
 * it leaves this board, joins the To-do list's Your-tasks group and appears in its calendar — one
 * object, two rooms. Nothing copies, nothing moves; the derivation reads the new fact.
 *
 * ⚠️ DELETE IS REAL HERE — user content is the only deletable kind — so it asks first (the styled
 * confirm) and holds an 8s undo that re-creates the SAME document id through addUserTask.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { PageHeader, type LivingHeader } from "../shell/PageHeader";
import { ArtSlot } from "./ArtSlot";
import { CorkBoard, type CorkItem } from "./CorkBoard";
import { CorkTasksCard } from "./CorkTasksCard";
import { PortalMenu } from "./PortalMenu";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { useConfirmAsk } from "./ConfirmAsk";
import { useTodoToast } from "./useTodoToast";
import { useScriptAllyDb } from "../../lib/db";
import { noteMenu, MenuLeaf } from "../../lib/todoMenu";
import { TagPicker } from "./TagPicker";
import { NOTE_EXAMPLES } from "./noteboardExamples";
import { NoteboardWorkflow } from "./noteboardEmptyState";
import { useTagWrites } from "./useTagWrites";
import { toggleTagSel } from "../../lib/todoTags";
import { TAG_PALETTE } from "../../lib/todoFamily";
import { spellNumber } from "../../lib/todoColumns";
import { isNoteTask as isNote } from "../../lib/todoBoard";
import {
  noteFilterLabel, noteColour, sortNotes, noteReceipt, firstTagLabel,
  noteboardPrefs, orderNotes, reorderIds, linkifyBody,
  composerWithColour, editCommit, emptyDraft, noteTagChips, noteMatchesSearch,
  NOTE_COLOURS, NoteDraft,
} from "../../lib/noteboard";
import { newTag } from "../../lib/todoTags";
import {
  CARD_W, COMPOSE_W, CORKBOARD_EMPTY, CORKBOARD_SUBLINE, NOTE_W, PAD_LABEL, TASKS_KEY, TODO_OPEN_TASK_KEY,
  chipCounts, corkPrefs, corkboardHeaderCopy, ownTaskRows,
  type CorkPos, type CorkView,
} from "../../lib/corkboard";
import { loadHoldForReview, onlyForReview } from "../../lib/corkboardReviewAid";
import { NoteColour, UserTask, TagDef } from "../../types";
import { formatDate } from "../../lib/dates";
import "./tasksLayout.css";
import "./taskChrome.css";
import "./todoNoteboard.css";

export interface TodoNoteboardPageProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  onNavigatePath?: (p: string) => void;
}



/** "Pinned 9 Oct" — from createdAt, through the one date formatter. */
const pinDate = (iso: string | undefined): string =>
  iso ? `Pinned ${formatDate(new Date(iso), { day: "numeric", month: "short" })}` : "";

const COMPOSE_KEY = "__compose";
/** a layout key becomes a dotted field path, so it must be a plain id (every note id is) */
const SAFE_KEY = /^[A-Za-z0-9_-]+$/;

/** Below 768px the board is the tidy view only: there is no room to pin freely on a phone. */
function useNarrow(): boolean {
  const q = "(max-width: 767.98px)";
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(q).matches);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const m = window.matchMedia(q);
    const on = () => setNarrow(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return narrow;
}

export const TodoNoteboardPage: React.FC<TodoNoteboardPageProps> = ({ onNavigatePath = () => {} }) => {
  const { userTasks: storedTasks, collectionsReady, addUserTask, updateUserTask, deleteUserTask, restoreUserTask, setUserTaskColour, updateUserPaths, currentUser } = useScriptAllyDb();
  const { toast, flash, dismiss, pause, resume } = useTodoToast();
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();

  /* ⚠️ THE DEV REVIEW AID IS GATED HERE, AT THE CALL SITE: a statically replaced MODE makes the branch dead in
     a production build, so the module is unreachable from it (the CB1 locks narrow the shared account with it). */
  const userTasks = useMemo(
    () => (import.meta.env.MODE === "production" ? storedTasks : onlyForReview(storedTasks)),
    [storedTasks],
  );

  /**
   * ⚠️ THE COUNT WAITS FOR THE WRITER'S TASKS. `collectionsReady` answers for manuscripts, agents and queries;
   * the user-task listener is a fourth and delivers on its own. Until it has (its array is replaced by the
   * first snapshot, even an empty one) the header's number is a blank of its full box — never a 0 that then
   * becomes 8 — with a short fallback so nothing can hold the header pending for ever.
   */
  const tasksAtMount = useRef(storedTasks);
  /* a first render that already has the collections (a remount long after load) has its tasks too */
  /* the dev review aid's hold (the loading beat, measured by lock L1): 0 in every production build */
  const holdMs = import.meta.env.MODE === "production" ? 0 : loadHoldForReview();
  const [settled, setSettled] = useState<boolean>(!!collectionsReady && holdMs === 0);
  useEffect(() => {
    if (settled || !collectionsReady) return undefined;
    if (holdMs === 0 && storedTasks !== tasksAtMount.current) { setSettled(true); return undefined; }
    const t = window.setTimeout(() => setSettled(true), holdMs || 800);
    return () => window.clearTimeout(t);
  }, [collectionsReady, storedTasks, settled, holdMs]);

  const [search, setSearch] = useState("");
  const [tagSel, setTagSel] = useState<string | null>(null); // one tag, or null for #All
  const [examples, setExamples] = useState(false); // the Examples drawer (P7)
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

  /* ⚠️ FILTERING FADES, IT DOES NOT HIDE (Corkboard v1). `notes` is still "what matches" — the label counts it
     and the board reads it — but every pinned note stays mounted where it is and the ones outside it drop to
     22%. A board that re-packed on every keystroke would move the note you were looking for. */
  const notes = useMemo(() => {
    const all = pinned;
    const searched = all.filter((n) => noteMatchesSearch(n, search));
    return tagSel ? searched.filter((n) => (n.tags ?? []).includes(tagSel)) : searched;
  }, [pinned, search, tagSel]);
  const matching = useMemo(() => new Set(notes.map((n) => n.id)), [notes]);
  const narrowing = !!(search.trim() || tagSel);
  const counts = useMemo(() => chipCounts(pinned), [pinned]);

  /* THE HEADER (header v3, a number page): the notes on the board, unfiltered; null until settled. */
  const living: LivingHeader = {
    count: settled ? pinned.length : null,
    copy: corkboardHeaderCopy,
    empty: settled && pinned.length === 0 ? { heading: CORKBOARD_EMPTY.heading, subline: [CORKBOARD_EMPTY.subline] } : undefined,
  };

  /**
   * THE TASK DOOR. A task is made by the To-do list's own composer: a one-shot `sa.todoCompose` key that the To-do
   * list consumes on arrival. (The retired Calendar page used the same door; this board is now its only caller.) ⚠️ NEVER A DATELESS TASK from
   * here: a dateless `UserTask` IS a note (the two-natures law), so a quick add on this page could only write
   * a note wearing a task's name.
   */
  const openTaskComposer = () => {
    try { sessionStorage.setItem("sa.todoCompose", "task"); } catch { /* private mode */ }
    onNavigatePath("/todo");
  };

  /* ⚠️ THE CHIPS READ `pinned`, NOT `notes`. Derived from the filtered view they would vanish as
     you used them — pick one and the others disappear, because nothing left on the board carries
     them any more. */
  const chips = useMemo(() => noteTagChips(pinned, currentUser?.tags ?? []), [pinned, currentUser?.tags]);

  const userTags = currentUser?.tags ?? [];

  /* ⚠️ THE EXAMPLE PAPERS HAVE LEFT THE BOARD (workflow run, Phase 1). They lived here for one
     day, below the real notes, under a fewer-than-three threshold with their own dismissal store.
     v2 moves them to the drawer entirely: the board shows the writer's notes and nothing else,
     and the examples are something you go and look at rather than something you dismiss. The
     threshold and the board-level dismissal retire with them; `noteboardPrefs` STAYS because
     `order` (drag-to-reorder) lives in the same sub-map. */
  const prefs = noteboardPrefs(currentUser);

  /**
   * ⚠️ ONE LEAF PER KEY (Corkboard v1; supersedes "every write spreads both layers"). This used to send the
   * whole `todoPrefs` map, spread from local state — safe against losing a sibling, but a write of every other
   * owner's sub-map from whatever copy this page last saw, and now of the whole `layout` map on every
   * reorder. A dotted path updates the one key and nothing beside it (`updateUserPaths`, lib/userPaths).
   */
  const saveNoteboardPrefs = async (patch: Partial<{ dismissedExamples: string[]; order: string[] }>) => {
    const paths: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) paths[`todoPrefs.noteboard.${k}`] = v;
    await updateUserPaths(paths);
  };

  /* ── drag to reorder (paper run, Phase 3) — the TIDY view's now ────────────────────────────
     The gesture is CorkBoard's (HTML5 drag-and-drop, in the tidy view only); the write is still this one:
     the ids of what is on the board RIGHT NOW, reordered — so a list that had drifted from the notes is
     repaired by the first drag rather than compounded. It writes `order` and never `layout`. */
  const reorderNotes = async (from: string, targetId: string) => {
    if (!from || from === targetId) return;
    const next = reorderIds(pinned.map((n) => n.id), from, targetId);
    try {
      await saveNoteboardPrefs({ order: next });
    } catch {
      flash("Couldn’t save that order — try again?");
    }
  };

  /* ── the board: free pinning, and Tidy into columns (Corkboard v1, Part C) ───────────────────
     ⚠️ POSITIONS ARE A PREFERENCE, NEVER A SOURCE, and they live on the USER document
     (`todoPrefs.noteboard.layout`), never on a note: an id the map names that no longer exists is ignored, a
     note it has never heard of still appears, and deleting a note need not clean the map.
     ⚠️ ONE LEAF PER DROP (`updateUserPaths`): the map shares `todoPrefs` with four other owners, and a write
     of the whole map would race every one of them. */
  const cork = corkPrefs(currentUser);
  const narrow = useNarrow();
  const view: CorkView = narrow ? "tidy" : cork.view;
  /** a failed save's way back: the place the item had before (null = it had none), masking the optimistic one */
  const [putBack, setPutBack] = useState<Record<string, CorkPos | null>>({});
  const savedLayout = useMemo(() => {
    const out: Record<string, CorkPos> = { ...cork.layout };
    for (const [k, v] of Object.entries(putBack)) { if (v) out[k] = v; else delete out[k]; }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.todoPrefs?.noteboard?.layout, putBack]);
  const moveItem = async (key: string, pos: CorkPos): Promise<void> => {
    const before = savedLayout[key] ?? null;
    try {
      if (!SAFE_KEY.test(key)) throw new Error("not a layout key");
      await updateUserPaths({ [`todoPrefs.noteboard.layout.${key}`]: pos });
      setPutBack((o) => { if (!(key in o)) return o; const { [key]: _gone, ...rest } = o; void _gone; return rest; });
    } catch (e) {
      setPutBack((o) => ({ ...o, [key]: before }));
      flash("Couldn’t save that position. Try again?");
      throw e;
    }
  };
  const setView = async (next: CorkView) => {
    try { await updateUserPaths({ "todoPrefs.noteboard.view": next }); }
    catch { flash("Couldn’t save that view — try again?"); }
  };

  /**
   * Keep this — from the DRAWER now (workflow run, Phase 1). A real note through the normal
   * create path, the paper following on its own write, the drawer closing behind it.
   *
   * ⚠️ IT REPLACES "Use as a starting point →", WHICH WROTE NOTHING. That action seeded the
   * composer with an editable draft; this one commits. Leaving both would give one example two
   * doors with different consequences — and the immediate-create behaviour is not new to the app,
   * it is the board papers' own, migrating here as they leave the board.
   *
   * ⚠️ NO DISMISSAL. The examples are a place you visit now, not cards you send away, so the
   * `dismissedExamples` half of the prefs sub-map goes unread — see the report.
   */
  const keepFromDrawer = async (ex: { body: string; colour: NoteColour; tag: string }) => {
    try {
      const tagIds = await resolveTag(ex.tag);
      const id = await addUserTask({ text: ex.body, ...(tagIds ? { tags: tagIds } : {}) });
      if (id && ex.colour !== "yellow") {
        const landed = await setUserTaskColour(id, ex.colour);
        if (!landed) flash("Kept — but the colour didn’t save. It’s yellow for now.");
      }
      setExamples(false);
      flash("Kept — it’s yours to edit now.");
    } catch {
      flash("Couldn’t keep that — try again?");
    }
  };

  const boardRef = useRef<HTMLDivElement | null>(null);
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
   * projection). The date goes onto the note itself; the To-do list and its calendar pick the
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
      flash(`On your to-do list for ${formatDate(new Date(dateDraft), { day: "numeric", month: "short" })}. The note stays here.`, {
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

  /**
   * A note's paper, in the ref's order: the ⋯ button (top right, on hover and on focus), the words, the tags
   * and "Pinned {date}", then the stitched badge when the note is on the to-do list. One function, so the
   * board cannot draw a note two ways.
   */
  const noteInner = (n: UserTask) => (
    <>
      <button
        type="button"
        className="tbd-more cb-more"
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
      {/* ⚠️ NODES, NOT MARKUP — bare URLs become anchors and nothing else can. The body is React children,
          which React escapes by construction, so a note containing markup renders it as the words typed. */}
      <div className="nb-body">{linkifyBody(n.text)}</div>
      {/* ⚠️ THE OLD SPLIT'S SECOND BLOCK. Nothing writes `detail` any more, but notes written under the
          split have prose in it and dropping it would lose their words. */}
      {n.detail && <div className="nb-body nb-body--legacy">{linkifyBody(n.detail)}</div>}
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
      </div>
      {/* the stitched badge is the note's OWN date — one document, nothing to consult */}
      {n.dueDate && (
        <div className="nb-taskbadge">
          ✓ On your to-do list · {formatDate(new Date(n.dueDate), { day: "numeric", month: "short" })}
        </div>
      )}
    </>
  );

  /**
   * WHAT IS ON THE BOARD, in the board's own order. The compose editor is an item too: pinning, it takes the
   * first free space near the top; editing, it takes the NOTE'S OWN PLACE (the note's key), so the edit
   * happens where the note is. It is always straight, held by nothing, in front, and cannot be moved.
   */
  const composeItem = (key: string): CorkItem => ({
    key, width: COMPOSE_W, className: "cb-composeitem", label: compose?.id ? "Edit the note" : "New note",
    movable: false, fixing: null, front: true, node: composerCard,
  });
  /**
   * THE "YOUR TASKS" CARD — one index card: the writer's own dated tasks that are not already on the board as
   * notes. It is an item like a note (dragged and saved the same way, under `layout.__tasks`) and it is NOT a
   * note: the header never counts it, and a search or a tag chip fades it with the notes that do not match.
   * ⚠️ THE TICK OPENS THE TO-DO LIST'S OWN TASK PANE ON THAT TASK (a one-shot key, the "New task" door's
   * idiom) and writes nothing; only the pane finishes a task.
   */
  const ownTasks = useMemo(() => ownTaskRows(userTasks, Date.now()), [userTasks]);
  const finishOnTodo = (id: string) => {
    try { sessionStorage.setItem(TODO_OPEN_TASK_KEY, id); } catch { /* private mode */ }
    onNavigatePath("/todo");
  };
  const tasksItem: CorkItem = {
    key: TASKS_KEY, width: CARD_W, className: "cb-card", attrs: { "data-cb": "tasks-card" }, label: "Your tasks",
    tilt: 0.8, fixing: { kind: "pin", colour: "#2d3a50" }, dim: narrowing,
    node: <CorkTasksCard tasks={ownTasks} onFinish={finishOnTodo} onAdd={openTaskComposer} onSeeAll={() => onNavigatePath("/todo")} />,
  };
  const noteItems: CorkItem[] = pinned.map((n): CorkItem => (n.id === compose?.id ? composeItem(n.id) : {
      key: n.id,
      width: NOTE_W,
      className: `nb-note nb-c-${noteColour(n)}`,
      attrs: { "data-note": n.id },
      label: `Note: ${n.text.slice(0, 80)}`,
      dim: narrowing && !matching.has(n.id),
      reorderable: true,
      /* a press that was not a drag opens the built editor, where the note is */
      onActivate: () => openEditor(n),
      node: noteInner(n),
    }));
  /* the card is SECOND in the board's order, so with nothing saved it heads the second column (the ref) */
  const boardItems: CorkItem[] = [
    ...(compose && !compose.id ? [composeItem(COMPOSE_KEY)] : []),
    ...noteItems.slice(0, 1), tasksItem, ...noteItems.slice(1),
  ];

  return (
    <div className="t-f12 spine-root">
      {/* ⚠️ THE TOKENS SCOPE HERE, NOT ON THE ROOT. `tasksViewport` requires the exact
          attribute `className="t-f12 spine-root"` on all four Tasks pages — the one-column law —
          so a page that needs a class of its own hangs it one level down. */}
      <div className="tdb-wrap today-off nb-scope">
        {/* ⚠️ THE PAGE SCROLLS, AND ITS HEADER IS THE SHARED FULL PANEL (Corkboard v1) — the To-do list's own
            arrangement: the grid's masthead is declined and the header is the first row of the page's group.
            It left the Tasks family's fill chassis because a number panel is 260px tall: fixed above an
            internal scroller it would leave a framed board a 400px window at 1280 × 800. */}
        <WorkspacePageGrid className="tpl-wpg nb-wpg" scrollLabel="Corkboard" masthead={null}>
          <div className="nb-group" data-cb="page" data-loading={settled ? undefined : ""}>
            <PageHeader
              variant="full"
              panel
              title="Corkboard"
              description={CORKBOARD_SUBLINE}
              living={living}
              /* the drawing is not ready: a registered placeholder of its box (the Courier pinning a note) */
              /* ⚠️ ONLY ON THE PANEL: at zero notes the header is the open sheet, where a navy-panel placeholder
                 is a dashed box with nothing to stand on (seen on the first zero-notes render) */
              art={living.empty ? undefined : <ArtSlot name="corkboard-header" maxWidth={250} className="cb-hart" />}
            />
            {/* ⚠️ ZERO NOTES IS THE BUILT EMPTY STATE AND NOTHING ELSE: no add bar, no filter row, no board.
                The composer it opens is the one exception — it needs a board to sit on. */}
            {settled && pinned.length === 0 && !compose ? (
              <NoteboardWorkflow empty onPin={() => openComposer()} onBrowse={() => setExamples(true)} />
            ) : (
              <>
                <div className="cb-over" data-cb="over">
                  <div className="cb-addrow" role="group" aria-label="Add to your board" data-cb="addrow">
                    <span className="cb-addlab">Add to your board</span>
                    <div className="cb-pads" title="Pin a note" data-cb="pads">
                      {NOTE_COLOURS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`cb-pad nb-c-${c}`}
                          aria-label={PAD_LABEL[c]}
                          data-cb-pad={c}
                          /* the built compose editor, with this paper already chosen */
                          onClick={() => openComposer({ colour: c })}
                        />
                      ))}
                      <span>Note</span>
                    </div>
                    <button type="button" className="cb-sup" data-cb="add-task" onClick={openTaskComposer}>
                      <span className="cb-ico" aria-hidden>
                        <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12.5l3 3 5-6" /></svg>
                      </span>
                      Task
                    </button>
                  </div>
                  <div className="cb-filters" role="group" aria-label="Show" data-cb="filters">
                    <input
                      className="cb-find"
                      type="text"
                      placeholder="Find a note"
                      aria-label="Find a note"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") setSearch(""); }}
                    />
                    {/* ⚠️ THE CHIPS ARE THE TAGS IN USE, not the taxonomy, and they read the UNFILTERED list —
                        so do their counts. The defs supply the label: a raw `#t-letter` in a chip is a leak. */}
                    {chips.map((c) => (
                      <button
                        key={c.id ?? "all"}
                        type="button"
                        className="cb-chip"
                        aria-pressed={tagSel === c.id}
                        data-cb-chip={c.id ?? "all"}
                        onClick={() => setTagSel(c.id)}
                      >
                        {c.id === null ? c.label : `#${c.label}`} <b>{counts.get(c.id) ?? 0}</b>
                      </button>
                    ))}
                    {/* ⚠️ TIDY IS A VIEW, NOT A REARRANGEMENT: it straightens and flows the notes into columns and
                        writes the CHOICE (`view`), never the places — so "Back to free pinning" restores them. */}
                    {!narrow && (
                      <button
                        type="button"
                        className="cb-chip cb-chip--tool"
                        aria-pressed={view === "tidy"}
                        data-cb="tidy"
                        onClick={() => void setView(view === "tidy" ? "free" : "tidy")}
                      >
                        {view === "tidy" ? "Back to free pinning" : "Tidy into columns"}
                      </button>
                    )}
                    {/* only while something narrows — the pure label keeps the form in one place */}
                    {narrowing && <span className="nb-fcount" data-cb="fcount">{noteFilterLabel(notes.length, pinned.length)}</span>}
                  </div>
                </div>

                {/* ⚠️ THE FRAME IS THERE WHILE THE NOTES ARE NOT (loading): the board's top never moves. */}
                <div ref={boardRef} className="nb-board" data-cb="notes">
                  <CorkBoard
                    items={boardItems}
                    saved={savedLayout}
                    view={view}
                    loading={!settled}
                    onMove={moveItem}
                    onReorder={(from, to) => void reorderNotes(from, to)}
                  />
                </div>

                {/* the built workflow panels, beneath a board that has notes — unchanged */}
                {settled && pinned.length > 0 && (
                  <NoteboardWorkflow empty={false} onPin={() => openComposer()} onBrowse={() => setExamples(true)} />
                )}
              </>
            )}
          </div>
        </WorkspacePageGrid>
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
                        {ex.tag && <span className="nb-tag">#{ex.tag}</span>}
                        <button
                          type="button"
                          className="nb-keep"
                          /* creates a real note, closes the drawer, posts the receipt */
                          onClick={() => void keepFromDrawer(ex)}
                        >
                          Keep this
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
