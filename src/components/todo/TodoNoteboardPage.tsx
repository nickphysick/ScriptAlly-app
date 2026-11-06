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
  boardPrefs, chipCounts, dropOrder, frontBack, glance as glanceOf, inGlance, linkFields, linkOf, piles as pilesOf, sortBoard, tagsForPile,
  type BoardSort, type BoardView, type GlanceKey, type NoteLink,
  dayLabel,
} from "../../lib/corkboard";
import { agentPrimary } from "../../lib/agentDisplay";
import { openAgentCard } from "../../lib/agentCardStore";
import { openQueryPanel } from "../../lib/queryPanelStore";
import { loadHoldForReview, onlyForReview } from "../../lib/corkboardReviewAid";
import { NoteColour, UserTask } from "../../types";
import { formatDate } from "../../lib/dates";
import { CbHeader } from "./corkboard/CbHeader";
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
      flash(`On your to-do list for ${dayLabel(due)}. The note stays here.`, {
        label: "Undo", fn: async () => { await updateUserTask(note.id, { dueDate: null }); flash("Taken off your to-do list. The note stays here."); },
      });
    } catch {
      flash("Couldn’t add that to your tasks — try again?");
    }
  };

  const detachTask = async (note: UserTask) => {
    const was = note.dueDate;
    try { await updateUserTask(note.id, { dueDate: null }); }
    catch { flash("Couldn’t detach that — try again?"); return; }
    flash("Taken off your to-do list. The note stays here.", was ? {
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
    flash(`Moved to ${pileName(k)}`, { label: "Undo", fn: async () => { await updateUserTask(n.id, { tags: was.length ? was : null }); } });
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
    catch { flash("Couldn’t start that pile — try again?"); return; }
    flash(`Started a new pile: #${name.trim().replace(/^#/, "")}`, {
      label: "Undo", fn: async () => { await updateUserTask(n.id, { tags: was.length ? was : null }); },
    });
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
      if (!got) { flash("Couldn’t start that pile — try again?"); return; }
      k = got[0];
    }
    const pile = k;
    const moved = ids.map((id) => userTasks.find((t) => t.id === id)).filter((t): t is UserTask => !!t);
    const before = moved.map((n) => [n.id, [...(n.tags ?? [])]] as const);
    try {
      await Promise.all(moved.map((n) => { const next = tagsForPile(n.tags, pile); return updateUserTask(n.id, { tags: next.length ? next : null }); }));
    } catch { flash(sp.k ? "Couldn’t add those — try again?" : "Couldn’t start that pile — try again?"); return; }
    setStartFor(null);
    setTagSel(null);
    if (view !== "piles") void setBoardView("piles");
    setOpenPile(pile);
    const lbl = `#${sp.k ? tagLabel(sp.k) : name}`;
    const undo = moved.length
      ? { label: "Undo", fn: async () => { await Promise.all(before.map(([id, t]) => updateUserTask(id, { tags: t.length ? [...t] : null }))); } }
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

  /* N starts a new note — only while this page is the one on screen, never in a field or over a dialog */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const openNew = useRef<() => void>(() => {});
  openNew.current = () => openComposer();
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!matchesShortcut(SHORTCUTS.corkboardNew, e) || shortcutBlocked(e)) return;
      const root = rootRef.current;
      if (!root || root.getBoundingClientRect().height === 0) return;
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
      <div className="tdb-wrap today-off nb-scope cb2" ref={rootRef}>
        <WorkspacePageGrid className="tpl-wpg nb-wpg" scrollLabel="Corkboard" masthead={null}>
          <div className="nb-group cb2-page" data-cb="page" data-cb2="page" data-loading={settled ? undefined : ""}>
            <CbHeader
              count={settled ? board.length : null}
              glance={glanceOf(board)}
              special={special}
              onSpecial={(k) => setSpecial((cur) => (cur === k ? null : k))}
              onNew={(c) => openComposer(c)}
              onTask={openTaskComposer}
            />
            {empty ? <CbEmpty onKeep={(ex) => void keepExample(ex)} /> : (
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
                      piles={pilesOf(board.map((n) => ({ id: n.id, tags: n.tags, hex: paperHex(n.colour), text: n.text, matches: matching.has(n.id) })), tagLabel)}
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
          piles={pilesOf(board, tagLabel).filter((p) => p.k !== (menu.note.tags?.[0] ?? "")).map((p) => ({ k: p.k, name: pileName(p.k) }))}
          onPick={onMenuPick}
          onClose={(returnFocus) => { setMenu((m) => { if (m && returnFocus) m.anchor.focus(); return null; }); }}
        />
      )}

      {startFor && (
        <CbStartPile
          adding={startFor.k ? pileName(startFor.k) : null}
          notes={board.filter((n) => !startFor.k || (n.tags?.[0] ?? "") !== startFor.k)
            .map((n) => ({ id: n.id, hex: paperHex(n.colour), text: n.text, pile: pileName(n.tags?.[0] ?? "") }))}
          have={new Set(pilesOf(board, tagLabel).filter((p) => p.k).map((p) => tagLabel(p.k).toLowerCase()))}
          initial={startFor.sel}
          onSave={(name, ids) => void startSave(name, ids)}
          onClose={() => setStartFor(null)}
        />
      )}

      {taskFor && (
        <CbTurnTask todayYmd={todayYmd} hex={paperHex(taskFor.colour)} text={taskFor.text} onSave={(due) => void makeTask(due)} onClose={() => setTaskFor(null)} />
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

      {addingTask && <CbAddTask today={new Date()} onAdd={saveTask} onClose={() => setAddingTask(false)} />}


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
