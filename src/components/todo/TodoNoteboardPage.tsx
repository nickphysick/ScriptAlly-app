/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TodoNoteboardPage — THE CORKBOARD, /todo/corkboard (Corkboard v2, 6 Nov; ref design-refs/corkboard-v13/).
 * A scrolling wall of post-its in the app's own dress, under the Contact list's navy header, with two views —
 * Corkboard and Piles — and drag and drop in both. The file, the `nb-` scope and `todoPrefs.noteboard` keep their
 * names; they are identifiers, not captions. (History: Corkboard v1, 12 Oct — a framed cork board with free pinning,
 * a tidy view and a "Your tasks" card, all retired here.)
 *
 * ⚠️ NOTES ONLY. A note is a `UserTask` with no date and no tick, or a dated one that keeps its paper (it became a
 *    task and is on the to-do list too): `sortNotes`. Tasks live on the To-do list.
 * ⚠️ EVERY FIGURE ON THE PAGE IS lib/corkboard's or lib/noteboard's (glance, boardSentence, sortBoard, piles, the
 *    five papers), so the locks call what the page calls.
 * ⚠️ FILTERING FADES, IT DOES NOT HIDE: find, a tag pill or a glance row drops the other notes to 22%.
 * ⚠️ ORDER IS ONE DOTTED LEAF PER WRITE (`todoPrefs.noteboard.order`), and so are the view and the sort.
 * ⚠️ DELETE IS REAL HERE — user content is the only deletable kind — so it asks first (the styled confirm) and holds
 *    an 8s undo that writes the captured document back verbatim (`restoreUserTask`).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { useConfirmAsk } from "./ConfirmAsk";
import { useTodoToast } from "./useTodoToast";
import { useScriptAllyDb } from "../../lib/db";
import { useTagWrites } from "./useTagWrites";
import {
  noteColour, sortNotes, noteReceipt, firstTagLabel, editCommit, noteTagChips, noteMatchesSearch, paperHex, paperOf, NOTE_COLOURS,
} from "../../lib/noteboard";
import { newTag } from "../../lib/todoTags";
import {
  boardPrefs, chipCounts, dropOrder, frontBack, glance as glanceOf, inGlance, linkFields, linkOf, piles as pilesOf, sortBoard, stillStarted, tagsForPile,
  type BoardSort, type BoardView, type GlanceKey, type NoteLink,
  dayLabel, figures as figuresOf, inFigure, aboutRows as aboutRowsOf, aboutOf, quietBoard, DAY_ONE_EXAMPLES, addedWhen, sundayOf,
} from "../../lib/corkboard";
import { Cb15Desk, type Cb15Agent, type Cb15Link } from "./corkboard/Cb15Desk";
import { Cb15AddTask, Cb15NoteDialog, Cb15StartStack, Cb15TurnTask, type Cb15Draft } from "./corkboard/Cb15Dialogs";
import { getStatusLabel } from "../StatusPill";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { agentPrimary } from "../../lib/agentDisplay";
import { openAgentCard } from "../../lib/agentCardStore";
import { openQueryPanel } from "../../lib/queryPanelStore";
import { loadHoldForReview, onlyForReview } from "../../lib/corkboardReviewAid";
import { NoteColour, UserTask } from "../../types";
import { formatDate } from "../../lib/dates";
import { CbHeader, CbNavyHeader, useCbWide } from "./corkboard/CbHeader";
import { CbToolRow } from "./corkboard/CbToolRow";
import { CbWall, type WallNote } from "./corkboard/CbWall";
import { CbPiles } from "./corkboard/CbPiles";
import { CbMenu, type MenuAct } from "./corkboard/CbMenu";
import { CbEmpty } from "./corkboard/CbEmpty";
import type { NoteExample } from "./noteboardExamples";
import { SHORTCUTS, matchesShortcut, shortcutBlocked } from "../../lib/shortcuts";
import { CbNoteDialog, type NoteDraftV2 } from "./corkboard/CbNoteDialog";
import { CbAddTask, CbTurnTask, todayLocal } from "./corkboard/CbTaskDialogs";
import { CbStartPile } from "./corkboard/CbStartPile";
import { noteWords, type PostItLink } from "./corkboard/CbPostIt";
import "./tasksLayout.css";
import "./taskChrome.css";
import "./todoNoteboard.css";
import "./corkboard/corkboard.css";
import "./corkboard/corkboard15.css";

export interface TodoNoteboardPageProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  onNavigatePath?: (p: string) => void;
}

/** "6 Nov" — through the one date formatter. */
const dayMon = (iso: string | undefined): string => (iso ? formatDate(new Date(iso), { day: "numeric", month: "short" }) : "");
const initials = (s: string) => s.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** Below 768px nothing is draggable: the ⋯ menu's Move items do the job. */
export function usePhoneWidth(): boolean {
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
  const {
    userTasks: storedTasks, collectionsReady, addUserTask, updateUserTask, deleteUserTask, restoreUserTask, setUserTaskColour,
    updateUserPaths, currentUser, agents, queries, manuscripts,
  } = useScriptAllyDb();
  const { toast, flash, dismiss, pause, resume } = useTodoToast();
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();

  /* ⚠️ THE DEV REVIEW AID IS GATED HERE, AT THE CALL SITE: a statically replaced MODE makes the branch dead in a
     production build, so the module is unreachable from it (the locks narrow the shared account with it). */
  const userTasks = useMemo(
    () => (import.meta.env.MODE === "production" ? storedTasks : onlyForReview(storedTasks)),
    [storedTasks],
  );

  /* the header's sentence waits for the writer's tasks: a blank of its box, never a 0 that then becomes 13 */
  const tasksAtMount = useRef(storedTasks);
  const holdMs = import.meta.env.MODE === "production" ? 0 : loadHoldForReview();
  const [settled, setSettled] = useState<boolean>(!!collectionsReady && holdMs === 0);
  useEffect(() => {
    if (settled || !collectionsReady) return undefined;
    if (holdMs === 0 && storedTasks !== tasksAtMount.current) { setSettled(true); return undefined; }
    const t = window.setTimeout(() => setSettled(true), holdMs || 800);
    return () => window.clearTimeout(t);
  }, [collectionsReady, storedTasks, settled, holdMs]);

  const phone = usePhoneWidth();
  /* Corkboard v15: from 768px up the desktop page (Cb15Desk and its pop-ups); below it, the phone keeps v2's */
  const wide = useCbWide();
  const wideRef = useRef(wide);
  wideRef.current = wide;
  const [search, setSearch] = useState("");
  const [tagSel, setTagSel] = useState<string | null>(null);
  const [special, setSpecial] = useState<GlanceKey | null>(null);
  const [menu, setMenu] = useState<{ note: UserTask; anchor: HTMLElement } | null>(null);
  const [taskFor, setTaskFor] = useState<UserTask | null>(null);
  const [compose, setCompose] = useState<NoteDraftV2 | null>(null);
  const [composeTag, setComposeTag] = useState(false); // open the pop-up with the tag field focused (Change tag…)
  const [saving, setSaving] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  /** Piles: the open pile's tag ("" is Loose notes), or null for All piles */
  const [openPile, setOpenPile] = useState<string | null>(null);
  /* Corkboard v2.1: the Start a pile / Add notes pop-up — `k` null starts one, a tag id adds to it; `sel` ticked on open */
  const [startFor, setStartFor] = useState<{ k: string | null; sel: string[] } | null>(null);

  /* ── the view, the sort and the order: remembered, one dotted leaf each ── */
  const prefs = boardPrefs(currentUser);
  const view: BoardView = prefs.view;
  const sort: BoardSort = prefs.sort;
  const setBoardView = async (next: BoardView) => {
    try { await updateUserPaths({ "todoPrefs.noteboard.view": next }); }
    catch { flash("Couldn’t save that view — try again?"); }
  };
  const setBoardSort = async (next: BoardSort) => {
    try { await updateUserPaths({ "todoPrefs.noteboard.sort": next }); }
    catch { flash("Couldn’t save that order — try again?"); }
  };

  /* ⚠️ THE TALLY AND THE VIEW ARE TWO LISTS. `board` is every note, in the chosen sort (pinned first); `matching` is
     what the find, the pill and the glance row leave of it. The header counts the board, never the filter. */
  const notesAll = useMemo(() => sortNotes(userTasks), [userTasks]);
  const board = useMemo(() => sortBoard<UserTask>(notesAll, sort, prefs.order, noteColour), [notesAll, sort, prefs.order]);
  const matching = useMemo(() => new Set(board.filter((n) =>
    noteMatchesSearch(n, search)
    && (!tagSel || (n.tags ?? []).includes(tagSel))
    && (!special || inGlance(n, special))).map((n) => n.id)), [board, search, tagSel, special]);
  const narrowing = !!(search.trim() || tagSel || special);
  const counts = useMemo(() => chipCounts(board), [board]);
  const chips = useMemo(() => noteTagChips(board, currentUser?.tags ?? []), [board, currentUser?.tags]);
  const userTags = currentUser?.tags ?? [];
  const tagLabel = (id: string) => userTags.find((t) => t.id === id)?.label ?? id;

  /* ⚠️ "ADD A TASK" IS THE TO-DO LIST'S OWN COMPOSER, opened here in task mode (Part E) */
  const openTaskComposer = () => setAddingTask(true);

  const { createTagDef } = useTagWrites(flash);
  /* a new note takes the last paper used this session, unless it was started from a swatch */
  const LAST = "sa.cb2LastColour";
  const lastColour = (): NoteColour => {
    try { const v = sessionStorage.getItem(LAST); return (NOTE_COLOURS as readonly string[]).includes(v ?? "") ? (v as NoteColour) : "butter"; } catch { return "butter"; }
  };
  const openComposer = (colour?: NoteColour) => {
    setComposeTag(false);
    /* in an open pile, a new note starts in that pile */
    const tag = view === "piles" && openPile ? tagLabel(openPile) : "";
    setCompose({ body: "", colour: colour ?? lastColour(), tag, link: null });
  };
  const openEditor = (n: UserTask, focusTag = false) => {
    setComposeTag(focusTag);
    setCompose({ id: n.id, body: n.text, colour: noteColour(n), tag: firstTagLabel(n, userTags), link: linkOf(n) });
  };

  /** The typed tag → a real TagDef id, minted through the app's own minter when new. */
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

  /** ⚠️ THE NOTE IS WRITTEN PLAIN AND THE COLOUR FOLLOWS (never part of a create); butter needs no write at all. */
  const pinNote = async () => {
    if (!compose || saving) return;
    const body = compose.body.trim();
    if (!body) return;
    setSaving(true);
    try {
      const tagIds = await resolveTag(compose.tag);
      const l = compose.link;
      const link = l ? (l.kind === "agent" ? { agentId: l.id } : l.kind === "query" ? { queryId: l.id } : { manuscriptId: l.id }) : {};
      const id = await addUserTask({ text: body, ...(tagIds ? { tags: tagIds } : {}), ...link });
      if (id && compose.colour !== "butter") {
        const landed = await setUserTaskColour(id, compose.colour);
        if (!landed) flash("Pinned — but the colour didn’t save. It’s butter for now.");
      }
      try { sessionStorage.setItem(LAST, compose.colour); } catch { /* private mode */ }
      setCompose(null);
      if (id) { setFresh(id); setSearch(""); setTagSel(null); setSpecial(null); }
      flash("Pinned");
    } catch {
      flash("Couldn’t pin that — try again?");
    } finally {
      setSaving(false);
    }
  };

  /** Save on an existing note — each fact written only when it changed. */
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
        else { const ids = await resolveTag(typed); if (ids) await updateUserTask(note.id, { tags: [...ids, ...(note.tags ?? []).slice(1).filter((t) => t !== ids[0])] }); }
      }
      /* the link: written only when it changed, and at most one is ever set (linkFields clears the other two). A dated
         note's To-do row reads the link from this same document, so it follows on the next snapshot. */
      const was = linkOf(note);
      const now: NoteLink | null = compose.link;
      if ((was?.kind ?? "") !== (now?.kind ?? "") || (was?.id ?? "") !== (now?.id ?? "")) await updateUserTask(note.id, linkFields(now));
      try { sessionStorage.setItem(LAST, compose.colour); } catch { /* private mode */ }
      setCompose(null);
      flash("Saved");
    } catch {
      flash("Couldn’t save that — try again?");
    } finally {
      setSaving(false);
    }
  };

  /** ⚠️ THE PAPER IS STAMPED BEFORE THE DATE (a dated note keeps its board place by its paper). */
  const makeTask = async (due: string) => {
    if (!taskFor || !due) return;
    const note = taskFor;
    try {
      if (note.colour === undefined) {
        const landed = await setUserTaskColour(note.id, "butter");
        if (!landed) { flash("Couldn’t set that up — the note’s paper wouldn’t save. Try again?"); return; }
      }
      await updateUserTask(note.id, { dueDate: due });
      setTaskFor(null);
      /* Corkboard v15: the desktop says the ref's words; the phone keeps v2's */
      flash(wideRef.current ? `On your to-do list for ${dayLabel(due)}` : `On your to-do list for ${dayLabel(due)}. The note stays here.`, {
        label: "Undo", fn: async () => { await updateUserTask(note.id, { dueDate: null }); flash(wideRef.current ? "Taken off your to-do list" : "Taken off your to-do list. The note stays here."); },
      });
    } catch {
      flash("Couldn’t add that to your tasks — try again?");
    }
  };

  const detachTask = async (note: UserTask) => {
    const was = note.dueDate;
    try { await updateUserTask(note.id, { dueDate: null }); }
    catch { flash("Couldn’t detach that — try again?"); return; }
    flash(wideRef.current ? "Taken off your to-do list" : "Taken off your to-do list. The note stays here.", was ? {
      label: "Undo", fn: async () => { await updateUserTask(note.id, { dueDate: was }); flash("Back on your to-do list"); },
    } : undefined);
  };

  /* Keep this, on the empty page: a real note through the normal create path, its paper following on its own write */
  const keepExample = async (ex: NoteExample) => {
    try {
      const tagIds = await resolveTag(ex.tag);
      const id = await addUserTask({ text: ex.body, ...(tagIds ? { tags: tagIds } : {}) });
      const paper = paperOf(ex.colour);
      if (id && paper !== "butter") await setUserTaskColour(id, paper);
      flash("Kept. It’s yours to change now.");
    } catch {
      flash("Couldn’t keep that — try again?");
    }
  };

  const deleteNote = async (note: UserTask) => {
    const receipt = noteReceipt(note);
    const ok = await confirmAsk(`Remove “${note.text.length > 90 ? `${note.text.slice(0, 90)}…` : note.text}”?`, { confirmLabel: "Remove note", cancelLabel: "Keep it" });
    if (!ok) return;
    try { await deleteUserTask(note.id); }
    catch { flash("Couldn’t remove that — try again?"); return; }
    flash("Removed", { label: "Undo", fn: async () => { await restoreUserTask(receipt); flash("Back on the board"); } }, 8000);
  };

  /* ── the ⋯ menu (Part F): a pick names an action; these are its writes ── */
  const onMenuPick = (act: MenuAct) => {
    if (!menu) return;
    const note = menu.note;
    setMenu(null);
    if (act.a === "pin") void togglePin(note);
    if (act.a === "front" || act.a === "back") void writeOrder(frontBack(board.map((n) => n.id), note.id, act.a), sort !== "mine", act.a === "front" ? "Moved to the front" : "Moved to the back");
    if (act.a === "edit" || act.a === "colour") openEditor(note);
    if (act.a === "tag") openEditor(note, true);
    if (act.a === "task") setTaskFor(note);
    if (act.a === "untask") void detachTask(note);
    if (act.a === "pile") void moveToPile(note.id, act.k);
    if (act.a === "newpile") setStartFor({ k: null, sel: [note.id] });
    if (act.a === "remove") void deleteNote(note);
  };
  const togglePin = async (note: UserTask) => {
    const next = !note.pinned;
    try { await updateUserTask(note.id, { pinned: next }); }
    catch { flash("Couldn’t pin that — try again?"); return; }
    flash(next ? "Pinned to the top" : "Unpinned");
  };

  /* ── Add a task: the To-do list's own composer; the write is the To-do list's own create, field for field (CB9) ── */
  const todayYmd = todayLocal();
  const saveTask = async (text: string, due: string, detail: string): Promise<void> => {
    /* the To-do list's own add, field for field (ws/TodoWorkspace): the words, the date, the notes when given */
    let id: string | null | undefined = null;
    try { id = await addUserTask({ text, dueDate: due, ...(detail ? { detail } : {}) }); }
    catch { id = null; }
    if (!id) { flash("Couldn’t add that task — try again?"); return; }
    setAddingTask(false);
    flash(`Added to your to-do list, due ${dayLabel(due)}`, { label: "Open To-do list", fn: async () => { onNavigatePath("/todo"); } }, 4200);
  };

  /* ── the wall: one drop, one `order` write ── */
  /** ONE write: the order leaf, with the sort leaf in the same call when the sort switches to My order */
  const writeOrder = async (ids: string[], toMine: boolean, said?: string) => {
    const paths: Record<string, unknown> = { "todoPrefs.noteboard.order": ids };
    if (toMine) paths["todoPrefs.noteboard.sort"] = "mine";
    try {
      await updateUserPaths(paths);
      if (said) flash(said);
      else if (toMine) flash("Sorted by your own order now");
    } catch {
      flash("Couldn’t save that order — try again?");
    }
  };
  const dropOnWall = (from: string, target: string, after: boolean) =>
    void writeOrder(dropOrder(board.map((n) => n.id), from, target, after), sort !== "mine");

  /* ── piles are tags: a move sets the pile's tag first and keeps the rest; Undo puts the tags back exactly ── */
  const pileName = (k: string) => (k ? `#${tagLabel(k)}` : "Loose notes");
  const moveToPile = async (noteId: string, k: string) => {
    const n = userTasks.find((t) => t.id === noteId);
    if (!n) return;
    const was = n.tags ?? [];
    const next = tagsForPile(was, k);
    try { await updateUserTask(n.id, { tags: next.length ? next : null }); }
    catch { flash("Couldn’t move that — try again?"); return; }
    const wasStarted = prefs.started.includes(k);
    flash(`Moved to ${pileName(k)}`, { label: "Undo", fn: async () => { await updateUserTask(n.id, { tags: was.length ? was : null }); if (wasStarted) await reStart(k); } });
  };
  /* a new pile mints its tag through the app's own minter (resolveTag → newTag / createTagDef) */
  const newPile = async (noteId: string, name: string) => {
    const n = userTasks.find((t) => t.id === noteId);
    if (!n) return;
    const ids = await resolveTag(name);
    if (!ids) return;
    const was = n.tags ?? [];
    const next = tagsForPile(was, ids[0]);
    try { await updateUserTask(n.id, { tags: next }); }
    catch { flash("Couldn’t start that stack — try again?"); return; }
    flash(`Started a new stack: #${name.trim().replace(/^#/, "")}`, {
      label: "Undo", fn: async () => { await updateUserTask(n.id, { tags: was.length ? was : null }); },
    });
  };

  /* ── Corkboard v2.1: piles started here with no notes (todoPrefs.noteboard.started, one leaf). Only tags that still
     exist are listed; a started pile leaves the list once it carries a note (by any route), and Remove pile takes it
     off the list only — the tag definition is never deleted. ── */
  const started = prefs.started.filter((k) => userTags.some((t) => t.id === k));
  const startedKey = prefs.started.join(",");
  useEffect(() => {
    if (!settled || !collectionsReady) return;
    const keep = stillStarted(prefs.started, storedTasks);
    if (keep.length !== prefs.started.length) void updateUserPaths({ "todoPrefs.noteboard.started": keep }).catch(() => {});
  }, [startedKey, storedTasks, settled, collectionsReady]); // eslint-disable-line react-hooks/exhaustive-deps
  /** an Undo that empties a started pile again puts it back on the list, so it does not vanish */
  const startedRef = useRef(prefs.started);
  startedRef.current = prefs.started;
  const reStart = async (k: string) => {
    const now = startedRef.current;
    if (!now.includes(k)) await updateUserPaths({ "todoPrefs.noteboard.started": [...now, k] });
  };
  const removePile = async (k: string) => {
    try { await updateUserPaths({ "todoPrefs.noteboard.started": prefs.started.filter((x) => x !== k) }); }
    catch { flash("Couldn’t remove that stack — try again?"); return; }
    setOpenPile(null);
    flash(`Removed ${pileName(k)}`, { label: "Undo", fn: async () => { await reStart(k); setOpenPile(k); } });
  };

  /* ── Corkboard v2.1: start a pile (mint its tag, as New pile does) or add notes to one; each ticked note moves by
     v2's rule (the pile's tag first, the rest kept), and Undo puts every note's tags back exactly ── */
  const nNotes = (n: number) => `${n} ${n === 1 ? "note" : "notes"}`;
  const startSave = async (name: string, ids: string[]) => {
    const sp = startFor;
    if (!sp) return;
    let k = sp.k;
    if (!k) {
      const got = await resolveTag(name);
      if (!got) { flash("Couldn’t start that stack — try again?"); return; }
      k = got[0];
    }
    const pile = k;
    const wasStarted = prefs.started.includes(pile);
    const moved = ids.map((id) => userTasks.find((t) => t.id === id)).filter((t): t is UserTask => !!t);
    const before = moved.map((n) => [n.id, [...(n.tags ?? [])]] as const);
    try {
      await Promise.all(moved.map((n) => { const next = tagsForPile(n.tags, pile); return updateUserTask(n.id, { tags: next.length ? next : null }); }));
    } catch { flash(sp.k ? "Couldn’t add those — try again?" : "Couldn’t start that stack — try again?"); return; }
    /* a pile started with no notes is remembered here, so it stays listed while empty (Part C) */
    if (!sp.k && !moved.length && !prefs.started.includes(pile)) {
      try { await updateUserPaths({ "todoPrefs.noteboard.started": [...prefs.started, pile] }); }
      catch { flash("Couldn’t start that stack — try again?"); return; }
    }
    setStartFor(null);
    setTagSel(null);
    if (view !== "piles") void setBoardView("piles");
    setOpenPile(pile);
    const lbl = `#${sp.k ? tagLabel(sp.k) : name}`;
    const undo = moved.length
      ? { label: "Undo", fn: async () => { await Promise.all(before.map(([id, t]) => updateUserTask(id, { tags: t.length ? [...t] : null }))); if (wasStarted) await reStart(pile); } }
      : undefined;
    flash(sp.k ? `Added ${nNotes(moved.length)} to ${lbl}` : moved.length ? `Started ${lbl} with ${nNotes(moved.length)}` : `Started ${lbl}`, undo);
  };

  /* ── a note's link, and its door ── */
  const linkView = (n: UserTask): PostItLink | null => {
    const l = linkOf(n);
    if (!l) return null;
    if (l.kind === "agent") {
      const a = agents.find((x) => x.id === l.id);
      const name = a ? agentPrimary(a) : "An agent";
      return { kind: "agent", initials: initials(name), name };
    }
    if (l.kind === "query") {
      const q = queries.find((x) => x.id === l.id);
      const a = q ? agents.find((x) => x.id === q.agentId) : undefined;
      const name = a ? agentPrimary(a) : "A query";
      return { kind: "query", initials: initials(name), name };
    }
    const m = manuscripts.find((x) => x.id === l.id);
    const name = m?.title || "Your manuscript";
    return { kind: "manuscript", initials: initials(name), name };
  };
  const linkFor = (l: NoteLink): PostItLink & { sub: string } => {
    const v = linkView({ agentId: l.kind === "agent" ? l.id : undefined, queryId: l.kind === "query" ? l.id : undefined, manuscriptId: l.kind === "manuscript" ? l.id : undefined } as UserTask)!;
    const sub = l.kind === "manuscript" ? "Your manuscript"
      : l.kind === "agent" ? (agents.find((a) => a.id === l.id)?.agency ?? "Agent")
      : (() => { const q = queries.find((x) => x.id === l.id); return q ? String(q.status) : "Query"; })();
    return { ...v, sub };
  };
  const openLink = (n: UserTask) => {
    const l = linkOf(n);
    if (!l) return;
    if (l.kind === "agent") openAgentCard(l.id);
    else if (l.kind === "query") openQueryPanel(l.id, "other");
    else onNavigatePath(`/manuscripts?m=${encodeURIComponent(l.id)}`);
  };

  const wallNote = (n: UserTask, dimmable: boolean): WallNote => ({
    id: n.id,
    label: `Note: ${n.text.slice(0, 80)}`,
    pinned: !!n.pinned,
    dim: dimmable && narrowing && !matching.has(n.id),
    post: {
      hex: paperHex(n.colour),
      body: noteWords(n.text, n.detail),
      clamp: true,
      onReadAll: () => openEditor(n),
      link: linkView(n),
      onLink: () => openLink(n),
      tags: (n.tags ?? []).map(tagLabel),
      pinned: !!n.pinned,
      added: n.createdAt ? `Added ${dayMon(n.createdAt)}` : undefined,
      todo: n.dueDate ? dayMon(n.dueDate) : null,
    },
  });


  /* ══ Corkboard v15 — the desktop (ref design-refs/corkboard-v15/). The same notes, prefs and writes as v2; the desk
     hides what a filter leaves out (v2 faded it), and every write answers with the ref's words and an Undo. ══ */
  const [about, setAbout] = useState<string | null>(null);
  const [draft15, setDraft15] = useState<Cb15Draft | null>(null);
  const [stack15, setStack15] = useState<{ note: UserTask | null } | null>(null);
  const findRef = useRef<HTMLInputElement | null>(null);
  const agentOfQuery = (qid: string) => queries.find((q) => q.id === qid)?.agentId;
  const agentName = (id: string) => { const a = agents.find((x) => x.id === id); return a ? agentPrimary(a) : "An agent"; };
  const storedMs = typeof window === "undefined" ? null : (() => { try { return window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { return null; } })();
  const activeMs = resolveScopedManuscript(manuscripts, storedMs);
  /** an agent's status: that agent's query on the active manuscript, if there is one (decision 7) */
  const agentStatus = (agentId: string): { status: string | null; word: string | null } => {
    const q = activeMs ? queries.find((x) => x.agentId === agentId && x.manuscriptId === activeMs.id) : undefined;
    return q ? { status: String(q.status), word: getStatusLabel(q.status) } : { status: null, word: null };
  };
  const link15 = (n: Pick<UserTask, "agentId" | "queryId" | "manuscriptId">): Cb15Link | null => {
    const l = linkOf(n);
    if (!l) return null;
    if (l.kind === "query") {
      const q = queries.find((x) => x.id === l.id);
      const name = q ? agentName(q.agentId) : "A query";
      return { kind: "query", initials: initials(name), name, status: q ? String(q.status) : null, word: q ? getStatusLabel(q.status) : null };
    }
    if (l.kind === "agent") { const name = agentName(l.id); return { kind: "agent", initials: initials(name), name, status: null, word: null }; }
    const m = manuscripts.find((x) => x.id === l.id);
    const name = m?.title || "Your manuscript";
    return { kind: "manuscript", initials: initials(name), name, status: null, word: null };
  };
  const agentCard = (id: string, notes: UserTask[]): Cb15Agent => {
    const a = agents.find((x) => x.id === id);
    const name = agentName(id);
    return { id, name, initials: initials(name), agency: a?.agency ?? "", ...agentStatus(id), notes };
  };
  const aboutRows15 = useMemo(() => aboutRowsOf(board, agentOfQuery, agentName).filter((r) => agents.some((a) => a.id === r.agentId)),
    [board, queries, agents]); // eslint-disable-line react-hooks/exhaustive-deps
  const aboutCards = aboutRows15.map((r) => agentCard(r.agentId, r.notes));
  const aboutNow = about ? aboutCards.find((c) => c.id === about) ?? agentCard(about, []) : null;
  const matches15 = (n: UserTask) => {
    const q = search.trim().toLowerCase();
    if (q && !(noteMatchesSearch(n, search) || (n.tags ?? []).some((t) => tagLabel(t).toLowerCase().includes(q)) || (link15(n)?.name ?? "").toLowerCase().includes(q))) return false;
    if (view === "piles") { if (openPile !== null && (n.tags?.[0] ?? "") !== openPile) return false; }
    else if (tagSel && !(n.tags ?? []).includes(tagSel)) return false;
    if (special && !inFigure(n, special)) return false;
    if (about && aboutOf(n, agentOfQuery) !== about) return false;
    return true;
  };
  const shown15 = wide ? board.filter(matches15) : [];
  const narrowing15 = !!(search.trim() || (view === "board" && tagSel) || special || about);
  const started15 = started;
  const pillTags = useMemo(() => {
    const ids = new Set<string>();
    for (const n of board) for (const t of n.tags ?? []) if (userTags.some((d) => d.id === t)) ids.add(t);
    for (const k of started15) ids.add(k);
    return [...ids].sort((a, b) => tagLabel(a).localeCompare(tagLabel(b))).map((id) => ({ id, n: counts.get(id) ?? 0 }));
  }, [board, started15.join(","), userTags, counts]); // eslint-disable-line react-hooks/exhaustive-deps
  const stacks15 = pilesOf(board, tagLabel, started15);
  const sunday15 = sundayOf(todayLocal());
  const toTools = () => {
    const el = rootRef.current?.querySelector<HTMLElement>('[data-cb15="desk"]');
    if (!el) return;
    const still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
  };
  const clearFilters = () => { setSearch(""); setTagSel(null); setSpecial(null); setAbout(null); };

  /** "+ New note" on the desktop: the paper as picked, the open stack or tag pill as its stack, the picked agent as
   *  its link (the ref's openNote) */
  const openComposer15 = (colour?: NoteColour) => {
    const k = view === "piles" ? openPile : tagSel;
    setDraft15({ body: "", colour: colour ?? lastColour(), tag: k ? tagLabel(k) : "", link: about ? { kind: "agent", id: about } : null, pinned: false });
  };
  const openEditor15 = (n: UserTask) =>
    setDraft15({ id: n.id, body: n.text, colour: noteColour(n), tag: firstTagLabel(n, userTags), link: linkOf(n), pinned: !!n.pinned });

  const undoLeaf = (label: string, fn: () => Promise<void>) => ({ label, fn: async () => { await fn(); flash("Undone"); } });
  const pin15 = async (n: UserTask) => {
    const next = !n.pinned;
    try { await updateUserTask(n.id, { pinned: next }); } catch { flash("Couldn’t pin that — try again?"); return; }
    flash(next ? "Pinned to top" : "Unpinned", undoLeaf("Undo", () => updateUserTask(n.id, { pinned: !next })));
  };
  const colour15 = async (n: UserTask, c: NoteColour) => {
    if (noteColour(n) === c && n.colour !== undefined) return;
    const receipt = noteReceipt(n);
    const landed = await setUserTaskColour(n.id, c);
    if (!landed) { flash("Couldn’t change the colour — try again?"); return; }
    flash("Colour changed", undoLeaf("Undo", () => restoreUserTask(receipt)));
  };
  /** ONE write: the order leaf and the sort leaf together; Undo puts both back */
  const order15 = async (ids: string[], said: string) => {
    const was = { order: [...prefs.order], sort };
    try { await updateUserPaths({ "todoPrefs.noteboard.order": ids, "todoPrefs.noteboard.sort": "mine" }); }
    catch { flash("Couldn’t save that order — try again?"); return; }
    flash(said, undoLeaf("Undo", () => updateUserPaths({ "todoPrefs.noteboard.order": was.order, "todoPrefs.noteboard.sort": was.sort })));
  };
  const frontBack15 = (n: UserTask, where: "front" | "back") =>
    void order15(frontBack(board.map((x) => x.id), n.id, where), where === "front" ? "Moved to the front. Order is now My order." : "Moved to the back. Order is now My order.");
  const reorder15 = (from: string, before: string) =>
    void order15(dropOrder(board.map((x) => x.id), from, before, false), sort === "mine" ? "Order saved" : "Order saved. Now showing My order.");
  const remove15 = async (n: UserTask) => {
    const receipt = noteReceipt(n);
    try { await deleteUserTask(n.id); } catch { flash("Couldn’t remove that — try again?"); return; }
    flash("Note removed", undoLeaf("Undo", () => restoreUserTask(receipt)), 8000);
  };
  const keep15 = async (i: number) => {
    const ex = DAY_ONE_EXAMPLES[i];
    if (!ex) return;
    let id: string | undefined;
    try {
      id = await addUserTask({ text: ex.body });
      if (id && ex.paper !== "butter") await setUserTaskColour(id, ex.paper);
    } catch { flash("Couldn’t keep that — try again?"); return; }
    if (!id) { flash("Couldn’t keep that — try again?"); return; }
    setFresh(id);
    const made = id;
    flash("Kept. It’s your note now.", undoLeaf("Undo", () => deleteUserTask(made)));
  };
  /** Start a stack: mint the tag through the app's own minter; with a note, file it there (its other tags kept) */
  const startStack15 = async (name: string) => {
    const note = stack15?.note ?? null;
    const ids = await resolveTag(name).catch(() => undefined);
    if (!ids) { flash("Couldn’t start that stack — try again?"); return; }
    const k = ids[0];
    setStack15(null);
    if (note) {
      const was = note.tags ?? [];
      try { await updateUserTask(note.id, { tags: tagsForPile(was, k) }); } catch { flash("Couldn’t start that stack — try again?"); return; }
      flash(`Moved to #${name}`, undoLeaf("Undo", () => updateUserTask(note.id, { tags: was.length ? [...was] : null })));
      return;
    }
    if (!prefs.started.includes(k) && !board.some((n) => (n.tags?.[0] ?? "") === k)) {
      try { await updateUserPaths({ "todoPrefs.noteboard.started": [...prefs.started, k] }); }
      catch { flash("Couldn’t start that stack — try again?"); return; }
    }
    flash(`#${name} is ready. Drag notes onto it.`, undoLeaf("Undo", () => updateUserPaths({ "todoPrefs.noteboard.started": startedRef.current.filter((x) => x !== k) })));
  };
  /** Save note: a new one is written plain, then its paper and its pin follow (never part of a create) */
  const save15 = async () => {
    const d = draft15;
    if (!d || saving) return;
    const body = d.body.trim();
    if (!body) return;
    setSaving(true);
    try {
      const typed = d.tag.trim().replace(/^#+/, "");
      if (!d.id) {
        const tagIds = typed ? await resolveTag(typed) : undefined;
        const l = d.link;
        const link = l ? (l.kind === "agent" ? { agentId: l.id } : l.kind === "query" ? { queryId: l.id } : { manuscriptId: l.id }) : {};
        const id = await addUserTask({ text: body, ...(tagIds ? { tags: tagIds } : {}), ...link });
        if (!id) { flash("Couldn’t add that note — try again?"); return; }
        if (d.colour !== "butter") { const landed = await setUserTaskColour(id, d.colour); if (!landed) flash("Added — but the colour didn’t save. It’s butter for now."); }
        if (d.pinned) await updateUserTask(id, { pinned: true });
        try { sessionStorage.setItem(LAST, d.colour); } catch { /* private mode */ }
        setDraft15(null);
        setFresh(id);
        /* a new note the filters would hide clears them, so it is seen landing (the ref's rule) */
        const k = tagIds?.[0] ?? "";
        const fits = (!search.trim() || body.toLowerCase().includes(search.trim().toLowerCase()))
          && (view === "piles" ? openPile === null || openPile === k : !tagSel || tagSel === k)
          && (!special || (special === "pinned" ? d.pinned : special === "linked" ? !!(l && l.kind !== "manuscript") : false))
          && (!about || (l?.kind === "agent" && l.id === about));
        if (!fits) { clearFilters(); if (view === "piles") setOpenPile(k); }
        flash("Note added to your board", undoLeaf("Undo", () => deleteUserTask(id)));
        return;
      }
      const note = userTasks.find((t) => t.id === d.id);
      if (!note) { setDraft15(null); return; }
      const receipt = noteReceipt(note);
      const next = editCommit(note.text, d.body);
      if (next !== note.text) await updateUserTask(note.id, { text: next });
      if (d.colour !== noteColour(note)) { const landed = await setUserTaskColour(note.id, d.colour); if (!landed) flash("Saved — but the colour didn’t. Try it again?"); }
      /* the Stack row sets the FIRST tag and keeps the rest (decision 3) */
      if (typed.toLowerCase() !== firstTagLabel(note, userTags).toLowerCase()) {
        const k = typed ? (await resolveTag(typed))?.[0] : "";
        if (k !== undefined) { const t = tagsForPile(note.tags, k); await updateUserTask(note.id, { tags: t.length ? t : null }); }
      }
      const was = linkOf(note);
      if ((was?.kind ?? "") !== (d.link?.kind ?? "") || (was?.id ?? "") !== (d.link?.id ?? "")) await updateUserTask(note.id, linkFields(d.link));
      if (!!note.pinned !== d.pinned) await updateUserTask(note.id, { pinned: d.pinned });
      try { sessionStorage.setItem(LAST, d.colour); } catch { /* private mode */ }
      setDraft15(null);
      flash("Note saved", undoLeaf("Undo", () => restoreUserTask(receipt)));
    } catch {
      flash("Couldn’t save that — try again?");
    } finally {
      setSaving(false);
    }
  };

  /* N starts a new note — only while this page is the one on screen, never in a field or over a dialog */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const openNew = useRef<() => void>(() => {});
  openNew.current = () => (wideRef.current ? openComposer15() : openComposer());
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const isNew = matchesShortcut(SHORTCUTS.corkboardNew, e);
      /* Corkboard v15: "/" focuses Find a note on the desktop — through the registry and its guard, like N */
      const isFind = matchesShortcut(SHORTCUTS.corkboardFind, e);
      if ((!isNew && !isFind) || shortcutBlocked(e)) return;
      const root = rootRef.current;
      if (!root || root.getBoundingClientRect().height === 0) return;
      if (isFind) {
        const f = wideRef.current ? findRef.current : null;
        if (!f) return;
        e.preventDefault();
        f.focus();
        return;
      }
      e.preventDefault();
      openNew.current();
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, []);

  const nothingMatches = view === "board" && narrowing && matching.size === 0;
  const empty = settled && board.length === 0;

  return (
    <div className="t-f12 spine-root">
      {/* ⚠️ THE TOKENS SCOPE HERE, NOT ON THE ROOT: `tasksViewport` requires the exact `className="t-f12 spine-root"`
          on the Tasks pages, so a page that needs a class of its own hangs it one level down. */}
      <div className={`tdb-wrap today-off nb-scope cb2${wide ? " cb15" : ""}`} ref={rootRef}>
        <WorkspacePageGrid className="tpl-wpg nb-wpg" scrollLabel="Corkboard" masthead={null}>
          <div className="nb-group cb2-page" data-cb="page" data-cb2="page" data-loading={settled ? undefined : ""}>
            {/* Workspace headers v1: the desktop opens on the shared navy header; the phone keeps its panel */}
            {wide ? (
              <CbNavyHeader count={settled ? board.length : null} figures={figuresOf(board)} special={special}
                onSpecial={(k) => { setSpecial((cur) => (cur === k ? null : k)); setOpenPile(null); if (view !== "board") void setBoardView("board"); window.setTimeout(toTools, 0); }}
                onNew={(c) => openComposer15(c)} onTask={openTaskComposer} />
            ) : (
              <CbHeader
                count={settled ? board.length : null}
                glance={glanceOf(board)}
                special={special}
                onSpecial={(k) => setSpecial((cur) => (cur === k ? null : k))}
                onNew={(c) => openComposer(c)}
                onTask={openTaskComposer}
              />
            )}
            {wide ? (
              <Cb15Desk
                settled={settled}
                board={board}
                shown={shown15}
                narrowing={narrowing15}
                view={view}
                onView={(v) => { setOpenPile(null); setTagSel(null); void setBoardView(v); }}
                sort={sort}
                onSort={(v) => void setBoardSort(v)}
                find={search}
                onFind={setSearch}
                findRef={findRef}
                tags={pillTags}
                tag={tagSel}
                onTag={setTagSel}
                special={special}
                onClearSpecial={() => setSpecial(null)}
                about={aboutNow}
                onAbout={(id) => { setAbout(id); setTagSel(null); if (id) window.setTimeout(toTools, 0); }}
                aboutRows={aboutCards}
                quiet={quietBoard(board)}
                stacks={stacks15}
                openStack={openPile}
                onOpenStack={(k) => { setOpenPile(k); if (k !== null && view !== "piles") void setBoardView("piles"); }}
                tagLabel={tagLabel}
                linkOf={link15}
                added={(n) => addedWhen(n.createdAt, new Date())}
                fresh={fresh}
                todayYmd={todayYmd}
                sundayYmd={sunday15}
                onNew={() => openComposer15()}
                onEdit={openEditor15}
                onOpenLink={openLink}
                onPin={(n) => void pin15(n)}
                onColour={(n, c) => void colour15(n, c)}
                onTask={(n) => setTaskFor(n)}
                onUntask={(n) => void detachTask(n)}
                onFrontBack={frontBack15}
                onReorder={reorder15}
                onStack={(n, k) => void moveToPile(n.id, k)}
                onNewStack={(n) => setStack15({ note: n })}
                onRemove={(n) => void remove15(n)}
                onKeep={(i) => void keep15(i)}
                examples={DAY_ONE_EXAMPLES}
              />
            ) : empty ? <CbEmpty onKeep={(ex) => void keepExample(ex)} /> : (
              <>
                <CbToolRow
                  find={search}
                  onFind={setSearch}
                  chips={chips.map((c) => ({ ...c, n: counts.get(c.id) ?? 0 }))}
                  tag={tagSel}
                  onTag={setTagSel}
                  count={narrowing ? (matching.size === board.length ? `All ${board.length} match` : `${matching.size} of ${board.length} match`) : null}
                  view={view}
                  onView={(v) => { setOpenPile(null); if (v === "piles") setTagSel(null); void setBoardView(v); }}
                  sort={sort}
                  onSort={(v) => void setBoardSort(v)}
                />
                <div className="cb2-wallwrap" data-cb2="board">
                  {nothingMatches ? (
                    <div className="cb2-nomatch" data-cb2="nomatch">
                      <h3>{`Nothing matches “${search.trim() || (tagSel ? `#${tagLabel(tagSel)}` : "that")}”`}</h3>
                      <p>Try another word, or clear the search.</p>
                      <button type="button" className="cb2-btn" onClick={() => { setSearch(""); setTagSel(null); setSpecial(null); }}>Show every note</button>
                    </div>
                  ) : view === "piles" ? (
                    <CbPiles
                      piles={pilesOf(board.map((n) => ({ id: n.id, tags: n.tags, hex: paperHex(n.colour), text: n.text, matches: matching.has(n.id) })), tagLabel, started)}
                      label={pileName}
                      open={openPile}
                      onOpen={setOpenPile}
                      wall={openPile === null ? [] : board.filter((n) => (n.tags?.[0] ?? "") === openPile).map((n) => wallNote(n, !!search.trim()))}
                      draggable={!phone}
                      narrowing={narrowing}
                      find={search}
                      menuFor={menu?.note.id ?? null}
                      onOpenNote={(id) => { const n = userTasks.find((t) => t.id === id); if (n) openEditor(n); }}
                      onMenu={(id, anchor) => {
                        const n = userTasks.find((t) => t.id === id);
                        if (n) setMenu((m) => (m?.note.id === id ? null : { note: n, anchor }));
                      }}
                      onMove={(id, k) => void moveToPile(id, k)}
                      onNewPile={(id, name) => void newPile(id, name)}
                      onStart={() => setStartFor({ k: null, sel: [] })}
                      onAddNotes={(k) => setStartFor({ k, sel: [] })}
                      canRemove={(k) => started.includes(k)}
                      onRemove={(k) => void removePile(k)}
                    />
                  ) : (
                    <CbWall
                      notes={board.map((n) => wallNote(n, true))}
                      fresh={fresh}
                      draggable={!phone}
                      menuFor={menu?.note.id ?? null}
                      onOpen={(id) => { const n = userTasks.find((t) => t.id === id); if (n) openEditor(n); }}
                      onMenu={(id, anchor) => {
                        const n = userTasks.find((t) => t.id === id);
                        if (n) setMenu((m) => (m?.note.id === id ? null : { note: n, anchor }));
                      }}
                      onDrop={dropOnWall}
                      /* Corkboard v2.1: the dashed "+ New note" tile, gone while find, a tag pill or a glance row narrows */
                      onNew={narrowing ? undefined : () => openComposer()}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </WorkspacePageGrid>
      </div>

      {menu && (
        <CbMenu
          anchor={menu.anchor}
          pinned={!!menu.note.pinned}
          onTodo={!!menu.note.dueDate}
          view={view}
          piles={pilesOf(board, tagLabel, started).filter((p) => p.k !== (menu.note.tags?.[0] ?? "")).map((p) => ({ k: p.k, name: pileName(p.k) }))}
          onPick={onMenuPick}
          onClose={(returnFocus) => { setMenu((m) => { if (m && returnFocus) m.anchor.focus(); return null; }); }}
        />
      )}

      {startFor && (
        <CbStartPile
          adding={startFor.k ? pileName(startFor.k) : null}
          notes={board.filter((n) => !startFor.k || (n.tags?.[0] ?? "") !== startFor.k)
            .map((n) => ({ id: n.id, hex: paperHex(n.colour), text: n.text, pile: pileName(n.tags?.[0] ?? "") }))}
          have={new Set(pilesOf(board, tagLabel, started).filter((p) => p.k).map((p) => tagLabel(p.k).toLowerCase()))}
          initial={startFor.sel}
          onSave={(name, ids) => void startSave(name, ids)}
          onClose={() => setStartFor(null)}
        />
      )}

      {taskFor && (wide
        ? <Cb15TurnTask todayYmd={todayYmd} sundayYmd={sunday15} hex={paperHex(taskFor.colour)} text={taskFor.text} onSave={(due) => void makeTask(due)} onClose={() => setTaskFor(null)} />
        : <CbTurnTask todayYmd={todayYmd} hex={paperHex(taskFor.colour)} text={taskFor.text} onSave={(due) => void makeTask(due)} onClose={() => setTaskFor(null)} />
      )}

      {wide && draft15 && (
        <Cb15NoteDialog
          draft={draft15}
          setDraft={setDraft15}
          saving={saving}
          stacks={stacks15.filter((p) => p.k).map((p) => tagLabel(p.k))}
          linkView={(l) => link15({ agentId: l.kind === "agent" ? l.id : undefined, queryId: l.kind === "query" ? l.id : undefined, manuscriptId: l.kind === "manuscript" ? l.id : undefined })!}
          queries={queries}
          agents={agents}
          manuscripts={manuscripts}
          onTodo={!!(draft15.id && userTasks.find((t) => t.id === draft15.id)?.dueDate)}
          onSave={() => void save15()}
          onClose={() => setDraft15(null)}
          onRemove={() => { const n = userTasks.find((t) => t.id === draft15.id); setDraft15(null); if (n) void remove15(n); }}
          onTurn={() => { const n = userTasks.find((t) => t.id === draft15.id); setDraft15(null); if (n) setTaskFor(n); }}
        />
      )}

      {wide && stack15 && (
        <Cb15StartStack
          have={new Set(stacks15.filter((p) => p.k).map((p) => tagLabel(p.k).toLowerCase()))}
          moving={!!stack15.note}
          onSave={(name) => void startStack15(name)}
          onClose={() => setStack15(null)}
        />
      )}

      {compose && (
        <CbNoteDialog
          draft={compose}
          setDraft={setCompose}
          saving={saving}
          added={`Added ${dayMon(new Date().toISOString())}`}
          linkView={linkFor}
          queries={queries}
          agents={agents}
          manuscripts={manuscripts}
          focusTag={composeTag}
          onSave={() => void (compose.id ? saveEdit() : pinNote())}
          onClose={() => setCompose(null)}
        />
      )}

      {addingTask && (wide
        ? <Cb15AddTask today={new Date()} onAdd={saveTask} onClose={() => setAddingTask(false)} />
        : <CbAddTask today={new Date()} onAdd={saveTask} onClose={() => setAddingTask(false)} />)}


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
