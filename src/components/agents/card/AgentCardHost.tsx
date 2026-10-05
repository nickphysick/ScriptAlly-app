/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AgentCardHost — the agent card, mounted ONCE (Agent card v1 §2; ref
 * design-refs/agent-card-housekeeping-v7.html). It subscribes to `agentCardStore`, owns everything
 * the card needs from the data layer — the scoped manuscript, the agent's facts off the Query
 * Centre's own rows, the one notes listener, the writer, the save and the add — and portals the
 * card to document.body, so it opens over whatever page the writer is on.
 *
 * ⚠️ ONE FRAME, TWO STATES. The quick view and the editor render inside the SAME frame, so going
 * from one to the other is the card widening (548 → 780, 260ms) and narrowing back — never a
 * second card arriving. Every way into the editor goes through `openEditor`.
 *
 * ⚠️ THE LIST STILL OWNS ITS OWN AFTERMATH — the notice saying where a saved record went, its Undo,
 * the FLIP, the ring on a new row, the row scrolled into view on a step — through the store, because
 * the host is app-level and the Contact list is only one of the pages the card opens over.
 *
 * ⚠️ THE CARD'S WRITES GO THROUGH `commitAgentEdits`, NOT `updateAgent`: the latter logs an
 * activity for every write, so an Undo through it would append a second entry — the house undo rule
 * forbids compensating entries.
 *
 * ⚠️ A SAVE'S UNDO IS A SNAPSHOT (lib/agentCardSnapshot): the agent, its queries, its task flags and
 * its To-do tasks are read BEFORE the save and put back whole — so it also restores the deadlines the
 * reply-time fan-out moved, the dashboard flag a save that clears the last data-quality gap
 * resolves, and the reopen reminder a save that closes the door adds (decision 13). A snapshot that
 * cannot be read means NO Undo is offered: an Undo that restores nothing is worse.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { Agent, SubmissionMethod, SubmissionStatus } from "../../../types";
import {
  AgentNote, committedNotes, computeNotePreview, effectiveNotes, emptyNotesDraft,
} from "../../../lib/agentNotes";
import {
  AgentCardField, AgentCardOptions, AgentCardTab, closeAgentCard, currentAgentCard, emitAgentCardEvent,
  openAgentCard, openNewAgentCard, stepAgentCard, useAgentCardRequest,
  type AgentCardOrigin,
} from "../../../lib/agentCardStore";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { buildQcRows } from "../../../lib/qcSummary";
import { agentFacts } from "../../../lib/contactList";
import { isGenreMatch, matchGenre } from "../../../lib/genreMatch";
import { EditCtx, alsoChanges } from "../../../lib/contactEdit";
import { AgentEditPatch, SaveAgentResult, commitAgentEdits } from "../../../lib/saveAgentEdits";
import { computeAgentDeadlineWrites } from "../../../lib/computeAgentDeadlineWrites";
import { commitTypedGenre, hrefFor } from "../../../lib/quickAdd";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { dayMonth } from "../../../lib/dates";
import { AGENT_GENRES } from "../../../lib/agentOptions";
import { genreLabel } from "../../../lib/genres";
import {
  alsoQueried, cardQuery, cardRows, cardSavedLine, reminderOnSave, reopenReminder, savedPulse, stepTarget, type CardAct, type SavedPulse,
} from "../../../lib/agentCard";
import { type CardDraft, applyPatch, cardPatch, changedTabs, encodeMats, inversePatch, toContactDraft } from "../../../lib/cardDraft";
import { restoreAgentSnapshot, takeAgentSnapshot, type AgentSnapshot } from "../../../lib/agentCardSnapshot";
import { agentDataQualityNeeds } from "../../../lib/agentDataQuality";
import { flagKeyForTask } from "../../../lib/taskFlags";
import { destroyManifest } from "../../../lib/cascade";
import { AgentCardFrame, type AgentCardFrameHandle } from "./AgentCardFrame";
import { AgentQuickView, type QuickFoot } from "./AgentQuickView";
import { AgentCardEditor, type EditorSaveResult } from "./AgentCardEditor";
import "../contact/contactV11.css";

/** The shared manuscript-scope key — the same one the Contact list, Packages and Comps read. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

/** How the card writes an agent. The app's is Firestore; the lab's is its own cast. */
export type AgentWriter = (agentId: string, patch: AgentEditPatch) => Promise<SaveAgentResult>;

/** What the dev lab swaps in — its own writer, and the fact that it IS the Contact list. */
export interface AgentCardSandbox {
  writeAgent?: AgentWriter;
  contactListHere?: boolean;
}

/* The measurement harness opens the card the way every door does, through the store. Development
   builds only: the MODE literal is replaced at build time, so a production bundle carries none of
   it (the drawer's `__saQueryDrawer` precedent). */
if (import.meta.env.MODE === "development" && typeof window !== "undefined") {
  (window as unknown as { __saAgentCard?: unknown }).__saAgentCard = {
    open: (id: string, opts?: AgentCardOptions) => openAgentCard(id, opts),
    openNew: () => openNewAgentCard(),
    close: () => closeAgentCard(),
    /** the live request — what a door actually asked for (its order, its tab, its origin) */
    current: () => currentAgentCard(),
  };
}

export const AgentCardHost: React.FC<{ sandbox?: AgentCardSandbox }> = ({ sandbox }) => {
  const req = useAgentCardRequest();
  if (!req) return null;
  return <AgentCardSession key={req.seq} sandbox={sandbox} />;
};

/** The row's box on screen now — the exit shrinks back into it. Rows carry `data-agent-card`. */
const rowBoxOf = (agentId: string): AgentCardOrigin | null => {
  const el = [...document.querySelectorAll<HTMLElement>(`[data-agent-card="${agentId}"]`)]
    .find((e) => e.getBoundingClientRect().height > 0);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
};

/** An Undo that runs once, from whichever place it is pressed (the card's foot or the list's notice). */
const once = <T,>(run: () => Promise<T>): (() => Promise<T | null>) => {
  let used = false;
  return async () => {
    if (used) return null;
    used = true;
    return run();
  };
};

/** The editor a door asked for: a tab, the field to focus there, and any answers carried over. */
interface EditTarget { tab: AgentCardTab; focus?: AgentCardField; prefill?: Partial<CardDraft> }

/** One open of the card — keyed on the request's seq, so every open is a fresh session. */
const AgentCardSession: React.FC<{ sandbox?: AgentCardSandbox }> = ({ sandbox }) => {
  const req = useAgentCardRequest();
  const navigate = useNavigate();
  /* ⚠️ THE SWITCHER RE-OPENS THE ROUTE (page header v2 §4.5): a switch is a new location KEY, and
     that key is what the scope reads on — memoised on `manuscripts` alone the card would go on
     stating the old book. */
  const { key: locationKey, pathname } = useLocation();
  const {
    agents, queries, manuscripts, activities, addAgent, addUserTask, deleteUserTask, addPersonalGenre,
    currentUser, collectionsReady, packages, taskFlags, deleteAgent, resolveTaskFlag,
  } = useScriptAllyDb();

  const scoped = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the switch's signal
  }, [manuscripts, locationKey]);
  const tintGenre = useMemo(() => matchGenre(scoped?.genre), [scoped]);
  const genreHit = useCallback((g: string) => !!tintGenre && isGenreMatch(g, tintGenre), [tintGenre]);
  const personal = useMemo(() => currentUser?.personalGenres ?? [], [currentUser?.personalGenres]);
  const personalLabels = useMemo(() => personal.map((p) => p.label), [personal]);

  /* ⚠️ THE QUERY CENTRE'S OWN ROWS — one derivation, so the card and the list cannot disagree. */
  const qcRows = useMemo(() => buildQcRows(queries, agents, activities, Date.now()), [queries, agents, activities]);
  const nowMs = useMemo(() => Date.now(), [qcRows]);
  /* the genres already on the list, the most used first — as LABELS (ruling 1), so a stored id is
     never offered as a choice */
  const genrePool = useMemo(() => {
    const freq = new Map<string, number>();
    for (const a of agents) for (const g of a.genres ?? []) {
      const l = genreLabel(g, personal);
      freq.set(l, (freq.get(l) ?? 0) + 1);
    }
    return [...freq.entries()].sort((x, y) => y[1] - x[1]).map(([g]) => g);
  }, [agents, personal]);
  const editCtx: EditCtx = useMemo(
    () => ({ queries, agents, msGenre: scoped?.genre ?? null, msTitle: scoped?.title ?? null, nowMs }),
    [queries, agents, scoped, nowMs],
  );

  const agentId = req?.agentId ?? null;
  const agent = agentId ? agents.find((a) => a.id === agentId) ?? null : null;

  /* an agent that no longer exists closes its card — once the collections can answer */
  useEffect(() => {
    if (agentId && collectionsReady && agents.length > 0 && !agent) closeAgentCard();
  }, [agentId, agent, collectionsReady, agents.length]);

  /* the editor a door asked for opens straight away, with its carried answers; otherwise the
     quick view. The carried answers belong to THAT opening — the pencil later starts clean. */
  const [editing, setEditing] = useState<EditTarget | null>(
    req?.tab ? { tab: req.tab, focus: req.focus, prefill: req.prefill } : null,
  );
  /* what a save hands back to the quick view: its foot (with the Undo) and the parts to pulse */
  const [handover, setHandover] = useState<{ foot: QuickFoot; pulse: SavedPulse[] } | null>(null);
  const [slide, setSlide] = useState<"l" | "r" | null>(null);
  const frameRef = useRef<AgentCardFrameHandle>(null);
  const editorLeave = useRef<(() => void) | null>(null);

  /* ONE notes listener, for the open agent only — never one per row. */
  const [storedNotes, setStoredNotes] = useState<AgentNote[]>([]);
  useEffect(() => {
    setStoredNotes([]);
    if (!agentId || !currentUser) return;
    const ref = collection(db, "users", currentUser.id, "agents", agentId, "notes");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list: AgentNote[] = [];
        snap.forEach((d) => {
          const data = d.data() as { text?: string; createdAt?: { toDate?: () => Date } | string };
          list.push({
            id: d.id,
            text: String(data.text ?? ""),
            createdAt:
              typeof data.createdAt === "object" && data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString()
                : String(data.createdAt ?? ""),
          });
        });
        setStoredNotes(list);
      },
      (e) => handleFirestoreError(e, OperationType.LIST, `users/${currentUser.id}/agents/${agentId}/notes`),
    );
    return () => unsub();
  }, [agentId, currentUser?.id]);

  /* the quick view's notes: committed only, with the flat legacy note riding as the oldest bubble
     exactly as the old drawer showed it */
  const profileNotes = useMemo(
    () => committedNotes(effectiveNotes(storedNotes, emptyNotesDraft(), {
      flatNote: agent?.notes,
      dateAdded: agent?.dateAdded,
    })),
    [storedNotes, agent],
  );

  /** THE writer. Never through `updateAgent` (see the header): no activity, so an undo appends none. */
  const writeAgent: AgentWriter = useCallback(async (id, patch) => {
    if (sandbox?.writeAgent) return sandbox.writeAgent(id, patch);
    if (!currentUser) return { ok: false, error: "Not signed in." };
    return commitAgentEdits(db, currentUser.id, id, patch);
  }, [sandbox, currentUser]);
  const write = useCallback(async (patch: AgentEditPatch) => {
    if (!agentId) return false;
    return (await writeAgent(agentId, patch)).ok;
  }, [agentId, writeAgent]);

  /** The dry run the editor shows before a save — the REAL engine (decision 14), never a sum. */
  const alsoFor = useCallback(
    (d: CardDraft, base: CardDraft) => (agent ? alsoChanges(agent, toContactDraft(agent, base, d), editCtx) : []),
    [agent, editCtx],
  );

  /**
   * SAVE: ONLY what changed (`cardPatch`), through `commitAgentEdits` — sanitised, atomic, with the
   * reply-time deadline fan-out riding the same batch (`computeAgentDeadlineWrites`) and a wishlist
   * edit stamping `mswlCheckedAt` in the same write. The card narrows back to the quick view and
   * says what else moved.
   */
  const onEditorSave = useCallback(async (d: CardDraft, base: CardDraft): Promise<EditorSaveResult> => {
    if (!agent) return { ok: false, error: "That agent is no longer on your list." };
    const patch = cardPatch(agent, base, d, new Date().toISOString());
    if (Object.keys(patch).length === 0) { setEditing(null); return { ok: true }; }
    const notes = alsoChanges(agent, toContactDraft(agent, base, d), editCtx);
    const before = { ...agent } as Agent;
    const after = applyPatch(agent, patch);
    /* DECISION 13: a save that leaves the door closed with a new reopening date adds the reopen
       reminder — the quick view's own task — and the saved line says so; never without a date */
    const due = reminderOnSave(before, after);
    let reminderId: string | undefined;
    const addReminder = async () => {
      const task = due ? reopenReminder(after) : null;
      if (task) { try { reminderId = await addUserTask(task); } catch { reminderId = undefined; } }
    };
    let res: SaveAgentResult;
    let undo: (() => Promise<QuickFoot | null>) | undefined;
    if (sandbox?.writeAgent) {
      const write = sandbox.writeAgent;
      res = await write(agent.id, patch);
      if (!("error" in res)) await addReminder();
      /* the lab's cast has nothing but the agent, and the reminder the save added, to put back */
      undo = once(async () => {
        const r = await write(before.id, inversePatch(before, patch));
        if ("error" in r) return { text: `Couldn’t undo: ${r.error}` };
        if (reminderId) await deleteUserTask(reminderId);
        emitAgentCardEvent({ type: "undone", agentId: before.id });
        return { text: "Undone." };
      });
    } else {
      if (!currentUser) return { ok: false, error: "Not signed in." };
      const uid = currentUser.id;
      const mine = queries.filter((q) => q.agentId === agent.id);
      /* the snapshot FIRST — no snapshot, no Undo (never an Undo that restores nothing) */
      let snap: AgentSnapshot | null = null;
      try { snap = await takeAgentSnapshot(uid, agent.id, mine.map((q) => q.id)); } catch { snap = null; }
      const extras = patch.responseTimeWeeks !== undefined
        ? computeAgentDeadlineWrites(
            mine,
            typeof patch.responseTimeWeeks === "number" ? patch.responseTimeWeeks : null,
            (queryId) => doc(db, "users", uid, "queries", queryId),
          )
        : [];
      res = await commitAgentEdits(db, uid, agent.id, patch, extras);
      /* a save that clears the agent's LAST data-quality gap clears the dashboard's task too, as the
         Housekeeping fixes do — and the snapshot holds the flag, so Undo takes it back */
      if (!("error" in res) && agentDataQualityNeeds(before).length > 0 && agentDataQualityNeeds(after).length === 0) {
        try { await resolveTaskFlag(flagKeyForTask("data_quality_poor", agent.id)); } catch { /* the save stands */ }
      }
      /* the snapshot holds the agent's tasks, so Undo deletes the reminder this adds */
      if (!("error" in res)) await addReminder();
      if (snap) {
        const s = snap;
        undo = once(async () => {
          try { await restoreAgentSnapshot(s); } catch { return { text: "Couldn’t undo the save." }; }
          emitAgentCardEvent({ type: "undone", agentId: s.agentId });
          return { text: "Undone." };
        });
      }
    }
    /* "in", not `!res.ok`: with strictNullChecks off a boolean discriminant does not narrow */
    if ("error" in res) return { ok: false, error: res.error };
    /* the line claims a reminder only when the task came back with an id */
    setHandover({ foot: { text: cardSavedLine(notes, reminderId ? due : null), undo }, pulse: savedPulse(changedTabs(base, d)) });
    emitAgentCardEvent({ type: "saved", agentId: agent.id, before, after, undo });
    setEditing(null);
    return { ok: true };
  }, [agent, editCtx, sandbox, currentUser, queries, resolveTaskFlag, addUserTask, deleteUserTask]);

  /**
   * The create — through the SAME `addAgent` path every other creator uses (free-tier cap,
   * AGENT_ADDED activity, undefined-stripping), with the house rules: optionals born ABSENT, the
   * links through the scheme allowlist, `reopensOn` only behind a CLOSED door, and
   * `submissionMethod` defaulting to Email exactly as the app-level form does when none is chosen.
   */
  const onCreateAgent = useCallback(async (d: CardDraft): Promise<EditorSaveResult> => {
    const wishlist = d.wishlist.trim();
    const mswl = d.mswl.trim();
    const res = await addAgent({
      name: d.name.trim(),
      agency: d.agency.trim(),
      email: d.email.trim(),
      website: hrefFor(d.website) ?? "",
      genres: [...d.genres],
      mswlNotes: wishlist,
      submissionStatus: d.door === "open" ? SubmissionStatus.OPEN : SubmissionStatus.CLOSED,
      submissionMethod: d.method ?? SubmissionMethod.EMAIL,
      materialsWanted: encodeMats(d.mats),
      notes: "",
      ...(d.city.trim() ? { city: d.city.trim() } : {}),
      ...(d.country ? { country: d.country } : {}),
      ...(d.weeks != null ? { responseTimeWeeks: d.weeks } : {}),
      ...(d.nrn != null ? { noResponseMeansNo: d.nrn } : {}),
      ...(d.door === "closed" && d.reopens ? { reopensOn: d.reopens } : {}),
      ...(mswl && hrefFor(mswl) ? { socials: [{ platform: "MSWL", handle: hrefFor(mswl)! }] } : {}),
      /* the wishlist was written just now, so it was checked just now */
      ...(wishlist ? { mswlCheckedAt: new Date().toISOString() } : {}),
    });
    if (!res.success || !res.id) return { ok: false, error: res.error ?? "Couldn’t add the agent." };
    closeAgentCard();
    emitAgentCardEvent({ type: "added", agentId: res.id });
    return { ok: true };
  }, [addAgent]);

  /**
   * A genre matching nothing on any list (ruling 1): its case is matched to a genre that already
   * exists (`commitTypedGenre`), and only a genuinely new one becomes the writer's own — through
   * `addPersonalGenre`, which keeps the cap of ten and refuses junk with a reason.
   */
  const onNewGenre = useCallback(async (typed: string) => {
    const sources = [...(scoped?.genre ? [scoped.genre] : []), ...genrePool, ...personalLabels, ...AGENT_GENRES];
    const label = commitTypedGenre(typed, [], sources)?.[0];
    if (!label) return { ok: false as const, reason: "Type a genre first." };
    if (sources.some((s) => s.toLowerCase() === label.toLowerCase())) return { ok: true as const, label };
    const r = await addPersonalGenre(label);
    if (!r) return { ok: false as const, reason: "Couldn’t add that genre just now." };
    return "reason" in r ? { ok: false as const, reason: r.reason } : { ok: true as const, label: r.label };
  }, [scoped, genrePool, personalLabels, addPersonalGenre]);

  /* ── the notes subcollection: a note saves as it is written, outside Save changes ─────────── */

  /** The documented card cache, kept in step with the notes as they now stand. */
  const keepPreview = useCallback(async (orig: Agent, list: AgentNote[]) => {
    const after = committedNotes(effectiveNotes(list, emptyNotesDraft(), { flatNote: orig.notes, dateAdded: orig.dateAdded }));
    const preview = computeNotePreview(after, orig.pinnedNoteId);
    if ((orig.notePreview ?? "") !== preview) await writeAgent(orig.id, { notePreview: preview });
  }, [writeAgent]);

  /** A note write, its preview, and the house error handling — resolving to whether it landed, so
   *  the composer keeps the words when it did not. */
  const noteWrite = useCallback(async (
    op: OperationType,
    run: (uid: string, orig: Agent) => Promise<AgentNote[]>,
  ): Promise<boolean> => {
    if (!agent || !currentUser) return false;
    try {
      await keepPreview(agent, await run(currentUser.id, agent));
      return true;
    } catch (e) {
      /* the handler logs and THROWS (its callers' control flow); here the flow is the boolean */
      try { handleFirestoreError(e, op, `users/${currentUser.id}/agents/${agent.id}/notes`); } catch { /* logged */ }
      return false;
    }
  }, [agent, currentUser, keepPreview]);

  const onAddNote = useCallback((text: string) => noteWrite(OperationType.WRITE, async (uid, orig) => {
    const noteId = `note-${Math.random().toString(36).slice(2, 11)}`;
    const createdAt = new Date().toISOString();
    await setDoc(doc(collection(db, "users", uid, "agents", orig.id, "notes"), noteId), { text, createdAt });
    return [...storedNotes, { id: noteId, text, createdAt }];
  }), [noteWrite, storedNotes]);
  const onEditNote = useCallback((id: string, text: string) => noteWrite(OperationType.UPDATE, async (uid, orig) => {
    await updateDoc(doc(db, "users", uid, "agents", orig.id, "notes", id), { text });
    return storedNotes.map((n) => (n.id === id ? { ...n, text } : n));
  }), [noteWrite, storedNotes]);
  const onDeleteNote = useCallback((n: AgentNote) => noteWrite(OperationType.DELETE, async (uid, orig) => {
    await deleteDoc(doc(db, "users", uid, "agents", orig.id, "notes", n.id));
    return storedNotes.filter((x) => x.id !== n.id);
  }), [noteWrite, storedNotes]);

  /* ── moving and leaving ──────────────────────────────────────────────────────────────────── */

  /** ✕, Escape and the backdrop on the quick view, and a new card left: shrink back into the row
   *  when it is on screen (else fall and fade), then close. */
  const leaving = useRef(false);
  const requestClose = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    await frameRef.current?.leave(agentId ? rowBoxOf(agentId) : null);
    closeAgentCard();
  }, [agentId]);

  const onStep = useCallback((dir: 1 | -1) => {
    if (!agentId) return;
    const next = stepTarget(req?.sequence, agentId, dir);
    if (!next) return;
    setSlide(dir > 0 ? "l" : "r");
    stepAgentCard(next);
  }, [agentId, req?.sequence]);

  /**
   * ⋯ → Delete agent… (§7): the cascade through `deleteAgent` (its queries, their history, its notes,
   * its flags, and its own To-do tasks — ruling 4). No Undo. The card shrinks into its row, the row
   * collapses (240ms, the list's), and only then does the delete run, so the list closes the gap.
   */
  const deleteFacts = useMemo(() => {
    if (!agent) return null;
    const m = destroyManifest("agent", agent.id, { queries, activities, taskFlags });
    const mine = queries.filter((q) => q.agentId === agent.id);
    const msTitle = mine.length === 1 ? manuscripts.find((x) => x.id === mine[0].manuscriptId)?.title ?? null : null;
    return { queries: m.queries, history: m.activityRecords, msTitle };
  }, [agent, queries, activities, taskFlags, manuscripts]);
  const onDelete = useCallback(async () => {
    if (!agent) return;
    const id = agent.id;
    const name = (agent.name ?? "").trim() || agent.agency;
    await frameRef.current?.leave(rowBoxOf(id));
    closeAgentCard();
    emitAgentCardEvent({ type: "deleting", agentId: id });
    await new Promise((r) => window.setTimeout(r, 240));
    try { await deleteAgent(id); } catch { emitAgentCardEvent({ type: "delete-failed", agentId: id, name }); }
  }, [agent, deleteAgent]);

  /** THE one way into the editor. */
  const openEditor = useCallback((tab: AgentCardTab, focus?: AgentCardField) => {
    setHandover(null);
    setEditing({ tab, focus });
  }, []);

  /** The primary and secondary buttons (§3's table). The drawer journeys close the card first;
   *  Phase 5 docks it instead. */
  const onAct = useCallback(async (act: CardAct): Promise<QuickFoot | null> => {
    if (!agent) return null;
    const q = cardQuery(cardRows(qcRows, agent.id, scoped?.id ?? null));
    if (act === "qc") {
      if (!q) return null;
      closeAgentCard();
      navigate(`/queries?q=${q.id}`);
      return null;
    }
    if (act === "remind") {
      const task = reopenReminder(agent);
      if (!task) { openEditor("work", "reopen"); return null; }
      const id = await addUserTask(task);
      return {
        text: `Reminder added to To-do for ${dayMonth(new Date(`${task.dueDate}T00:00:00`))}: check ${(agent.name ?? "").trim() || agent.agency} has reopened.`,
        undo: id ? async () => { await deleteUserTask(id); } : undefined,
      };
    }
    if (act === "log") {
      const id = agent.id;
      closeAgentCard();
      openQueryDrawer({ mode: "log", agentId: id });
      return null;
    }
    if (!q) return null;
    closeAgentCard();
    openQueryDrawer({ mode: act, queryId: q.id });
    return null;
  }, [agent, qcRows, scoped, navigate, addUserTask, deleteUserTask, openEditor]);

  const isNew = req?.agentId === null;
  const inEditor = isNew || !!editing;

  /* the box stays and its contents change: the body fades in as the card widens or narrows (the
     mock's 220ms in, 200ms back) — never on the first paint, which the entrance owns */
  const wasEditor = useRef(inEditor);
  useLayoutEffect(() => {
    if (wasEditor.current === inEditor) return;
    wasEditor.current = inEditor;
    frameRef.current?.fade(inEditor ? 220 : 200);
  }, [inEditor]);

  if (!req) return null;
  if (!isNew && !agent) return null;

  if (inEditor) {
    const target: EditTarget = isNew ? { tab: "who", focus: "name", prefill: req.prefill } : editing!;
    const name = isNew ? "New agent" : `Editing ${(agent!.name ?? "").trim() || agent!.agency}`;
    return (
      <AgentCardFrame
        ref={frameRef}
        big
        ariaLabel={name}
        originRect={req.originRect ?? null}
        onScrim={() => editorLeave.current?.()}
      >
        <AgentCardEditor
          mode={isNew ? "new" : "edit"}
          agent={isNew ? null : agent}
          prefill={target.prefill}
          personal={personal}
          tab={target.tab}
          focus={target.focus}
          agents={agents}
          msGenre={scoped?.genre ?? null}
          genrePool={genrePool}
          personalGenres={personalLabels}
          allGenres={AGENT_GENRES}
          isHit={genreHit}
          nowMs={nowMs}
          alsoFor={alsoFor}
          notes={storedNotes}
          earlierNote={agent?.notes ?? ""}
          onSave={isNew ? (d) => onCreateAgent(d) : onEditorSave}
          onLeave={isNew ? () => void requestClose() : () => setEditing(null)}
          onOpenAgent={(id) => openAgentCard(id, { from: "button" })}
          onNewGenre={onNewGenre}
          onAddNote={onAddNote}
          onEditNote={onEditNote}
          onDeleteNote={onDeleteNote}
          bindLeave={editorLeave}
        />
      </AgentCardFrame>
    );
  }

  const facts = agentFacts(agent!, qcRows, scoped?.id ?? null);
  const q = cardQuery(cardRows(qcRows, agent!.id, scoped?.id ?? null));
  const also = alsoQueried(qcRows, agent!.id, scoped?.id ?? null, (id) => manuscripts.find((m) => m.id === id)?.title ?? null);
  const onContactList = !!sandbox?.contactListHere || pathname === "/agents";
  return (
    <AgentCardFrame ref={frameRef} labelledBy="ac-name" originRect={req.originRect ?? null} onScrim={() => void requestClose()}>
      <AgentQuickView
        agent={agent!}
        facts={facts}
        q={q}
        nowMs={nowMs}
        msTitle={scoped?.title ?? null}
        genreHit={genreHit}
        personal={personal}
        also={also}
        notes={profileNotes}
        packages={packages}
        sequence={req.sequence}
        slide={slide}
        initialFoot={handover?.foot ?? null}
        pulse={handover?.pulse}
        deleteFacts={deleteFacts}
        onDelete={onDelete}
        showOpenInContactList={!onContactList}
        write={write}
        onStep={onStep}
        onEdit={openEditor}
        onClose={() => void requestClose()}
        onAct={onAct}
        onOpenInContactList={() => navigate("/agents")}
        onAddNote={onAddNote}
      />
    </AgentCardFrame>
  );
};
