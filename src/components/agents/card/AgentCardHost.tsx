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
import { createPortal } from "react-dom";
import { useAgentNotes } from "./useAgentNotes";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { Agent, SubmissionMethod, SubmissionStatus } from "../../../types";
import { committedNotes, effectiveNotes, emptyNotesDraft } from "../../../lib/agentNotes";
import {
  AgentCardField, AgentCardOptions, AgentCardTab, closeAgentCard, currentAgentCard, emitAgentCardEvent,
  completeNewAgent, openAgentCard, openNewAgentCard, stepAgentCard, useAgentCardRequest,
  type AgentCardOrigin,
} from "../../../lib/agentCardStore";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { buildQcRows } from "../../../lib/qcSummary";
import { agentFacts } from "../../../lib/contactList";
import { isGenreMatch, matchGenre } from "../../../lib/genreMatch";
import { EditCtx, alsoChanges } from "../../../lib/contactEdit";
import { AgentEditPatch, SaveAgentResult, commitAgentEdits } from "../../../lib/saveAgentEdits";
import { commitCardSave } from "../../../lib/agentCardSave";
import { commitTypedGenre, hrefFor } from "../../../lib/quickAdd";
import { openQueryDrawer, provideDock, type OpenRequest } from "../../../lib/queryActions/drawerStore";
import { agentInitials } from "../../../lib/agentDisplay";
import { dayMonth } from "../../../lib/dates";
import { AGENT_GENRES } from "../../../lib/agentOptions";
import { genreLabel } from "../../../lib/genres";
import {
  alsoQueried, cardQuery, cardRows, cardSavedLine, queryTone, reminderOnSave, reopenReminder, savedPulse, stepTarget, type CardAct, type SavedPulse,
} from "../../../lib/agentCard";
import { type CardDraft, applyPatch, cardPatch, changedTabs, encodeMats, inversePatch, toContactDraft } from "../../../lib/cardDraft";
import { restoreAgentSnapshot, takeAgentSnapshot, type AgentSnapshot } from "../../../lib/agentCardSnapshot";
import { agentDataQualityNeeds } from "../../../lib/agentDataQuality";
import { flagKeyForTask } from "../../../lib/taskFlags";
import { destroyManifest } from "../../../lib/cascade";
import { AgentCardFrame, type AgentCardFrameHandle } from "./AgentCardFrame";
import { AgentQuickView, type QuickFoot } from "./AgentQuickView";
import { AgentCardEditor, type EditorSaveResult } from "./AgentCardEditor";
import { AgentPanelNew } from "../panel/AgentPanelNew";
import { ESC_LEVEL, EscapeRaise } from "../../../lib/escapeStack";
import { useToast } from "../../toast/ToastProvider";
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
    openNew: (opts?: Parameters<typeof openNewAgentCard>[0]) => openNewAgentCard(opts),
    close: () => closeAgentCard(),
    /** the live request — what a door actually asked for (its order, its tab, its origin) */
    current: () => currentAgentCard(),
  };
}

export const AgentCardHost: React.FC<{ sandbox?: AgentCardSandbox }> = ({ sandbox }) => {
  const req = useAgentCardRequest();
  if (!req) return null;
  /* RETIRE THE ADD-AGENT POP-UP — THE NEW-AGENT PANEL'S FRAME IS MOUNTED HERE, ONCE, for every page: the session
     portals the editor into its act slot. It used to be the Contact list's alone, which is why every other page's
     "Add an agent" fell back to the old centred pop-up. */
  return (
    <>
      {req.host === "panel" && req.agentId === null && <AgentPanelNew over={req.over === "drawer"} />}
      <AgentCardSession key={req.seq} sandbox={sandbox} />
    </>
  );
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
  const { showToast } = useToast();

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
  /* Contact list v16 §F — hosted in the agent's side panel there is no quick view: the editor is all there is */
  /* v18.3 §D — a NEW agent can be hosted there too: "+ Add an agent" opens the panel's act view with the empty editor */
  const inPanel = req?.host === "panel";
  const [editing, setEditingRaw] = useState<EditTarget | null>(
    req?.tab || inPanel ? { tab: req?.tab ?? "who", focus: req?.focus, prefill: req?.prefill } : null,
  );
  /** leaving the editor: back to the quick view — or, in the panel, the session is over */
  const setEditing = useCallback((t: EditTarget | null) => {
    if (t === null && inPanel) { closeAgentCard(); return; }
    setEditingRaw(t);
  }, [inPanel]);
  /* the panel's act slot, looked up once the panel has drawn it (the panel hears the same store a frame later) */
  const [panelSlot, setPanelSlot] = useState<Element | null>(null);
  useLayoutEffect(() => {
    if (!inPanel) return undefined;
    let raf = 0, tries = 0;
    const find = () => {
      const el = document.querySelector("[data-ap-act-slot]");
      if (el) { setPanelSlot(el); return; }
      if (tries++ < 30) raf = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(raf);
  }, [inPanel]);
  /* what a save hands back to the quick view: its foot (with the Undo) and the parts to pulse */
  const [handover, setHandover] = useState<{ foot: QuickFoot; pulse: SavedPulse[] } | null>(null);
  const [slide, setSlide] = useState<"l" | "r" | null>(null);
  const frameRef = useRef<AgentCardFrameHandle>(null);
  const editorLeave = useRef<(() => void) | null>(null);

  /* ── the hand-off (§6.1): a query journey runs in the drawer while the card waits, docked ─────
     The drawer says when the card steps aside and when it comes back (`onDock`) — on save, cancel,
     park or a failed save alike — so no path can leave the card stepped aside behind nothing. A
     save comes back with the query section pulsing; the drawer's Undo bar owns the undo. */
  const [docked, setDocked] = useState(false);
  const [queryPulse, setQueryPulse] = useState(0);
  const pulseOnReturn = useRef(false);
  const onDock = useCallback((d: boolean) => {
    setDocked(d);
    if (!d && pulseOnReturn.current) { pulseOnReturn.current = false; setQueryPulse((n) => n + 1); }
  }, []);

  /** THE writer. Never through `updateAgent` (see the header): no activity, so an undo appends none. */
  const writeAgent: AgentWriter = useCallback(async (id, patch) => {
    if (sandbox?.writeAgent) return sandbox.writeAgent(id, patch);
    if (!currentUser) return { ok: false, error: "Not signed in." };
    return commitAgentEdits(db, currentUser.id, id, patch);
  }, [sandbox, currentUser]);
  /* ONE notes listener, for the open agent only — never one per row; and the three note writers. Shared with the
     agent's side panel (Contact list v16 §F) through the one hook, so there is one way a note is written. */
  const { storedNotes, onAddNote, onEditNote, onDeleteNote } = useAgentNotes(agent, currentUser?.id ?? null, writeAgent);
  /* the quick view's notes: committed only, with the flat legacy note riding as the oldest bubble
     exactly as the old drawer showed it */
  const profileNotes = useMemo(
    () => committedNotes(effectiveNotes(storedNotes, emptyNotesDraft(), {
      flatNote: agent?.notes,
      dateAdded: agent?.dateAdded,
    })),
    [storedNotes, agent],
  );

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
      /* the ONE save path, shared with Housekeeping's fixes (lib/agentCardSave): the snapshot first,
         the deadline fan-out in the same batch, the data-quality flag, then the reminder — which the
         snapshot's task set covers, so Undo deletes it */
      const out = await commitCardSave({
        uid: currentUser.id, agent, queries, patch, resolveTaskFlag, afterCommit: addReminder,
      });
      res = out.res;
      if (out.undo) {
        const restore = out.undo;
        undo = once(async () => {
          if (!(await restore())) return { text: "Couldn’t undo the save." };
          emitAgentCardEvent({ type: "undone", agentId: agent.id });
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
      submissionStatus: d.door === "closed" ? SubmissionStatus.CLOSED : SubmissionStatus.OPEN,
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
    /* the confirmation: on the Contact list the new row's ring and its panel say it; on every other page, the toast
       the log-a-query add already used */
    if (!sandbox?.contactListHere && pathname !== "/agents") {
      showToast({ message: `Added ${d.name.trim() || d.agency.trim()} to your contact list` });
    }
    /* closes, tells the page ("added"), and hands the id to a flow waiting on it */
    completeNewAgent(res.id);
    return { ok: true };
  }, [addAgent, sandbox, pathname, showToast]);

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

  /** What the dock chip shows and how the card hears back — for a journey started here, and for a
   *  parked one resumed while this card is open (Continuity: Resume). */
  const dockHooks = useCallback((): Pick<OpenRequest, "dock" | "onDock" | "onSaved"> | null => {
    if (!agent) return null;
    const facts = agentFacts(agent, qcRows, scoped?.id ?? null);
    const q = cardQuery(cardRows(qcRows, agent.id, scoped?.id ?? null));
    return {
      dock: { initials: agentInitials(agent), name: (agent.name ?? "").trim() || agent.agency, status: queryTone(facts, q).label },
      onDock,
      onSaved: () => { pulseOnReturn.current = true; },
    };
  }, [agent, qcRows, scoped, onDock]);

  /** The primary and secondary buttons (§3's table). A query journey hands off to the drawer — the
   *  full journey, every step — and the card docks until it is done (§6.1). */
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
      openQueryDrawer({ mode: "log", agentId: agent.id, ...(scoped?.id ? { manuscriptId: scoped.id } : {}), ...dockHooks() });
      return null;
    }
    if (!q) return null;
    openQueryDrawer({ mode: act, queryId: q.id, ...dockHooks() });
    return null;
  }, [agent, qcRows, scoped, navigate, addUserTask, deleteUserTask, openEditor, dockHooks]);

  const isNew = req?.agentId === null;
  const inEditor = isNew || !!editing;

  /* a parked journey resumed while this card's quick view is open docks THIS card (the mock: only
     the quick view, never the editor — a draft is not a place to wait) */
  useEffect(() => {
    if (!agent || inEditor || docked) return;
    provideDock(dockHooks);
    return () => provideDock(null);
  }, [agent, inEditor, docked, dockHooks]);

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
    if (inPanel) {
      if (!panelSlot || !panelSlot.isConnected) return null;
      return createPortal(
        /* over the query drawer, the editor and its popups hear Escape before the drawer does */
        <EscapeRaise.Provider value={req.over === "drawer" ? ESC_LEVEL.drawerPopup : 0}>
        <div className="ac apn-edit" data-ap="edit">
          <AgentCardEditor
            variant="panel"
            mode={isNew ? "new" : "edit"} agent={isNew ? null : agent} prefill={target.prefill} personal={personal} tab={target.tab} focus={target.focus}
            agents={agents} msGenre={scoped?.genre ?? null} genrePool={genrePool} personalGenres={personalLabels} allGenres={AGENT_GENRES}
            isHit={genreHit} nowMs={nowMs} alsoFor={alsoFor} notes={storedNotes} earlierNote={agent?.notes ?? ""}
            onSave={isNew ? (dd) => onCreateAgent(dd) : onEditorSave} onLeave={() => closeAgentCard()} onOpenAgent={(id) => openAgentCard(id, { tab: "who", host: "panel" })}
            onNewGenre={onNewGenre} onAddNote={onAddNote} onEditNote={onEditNote} onDeleteNote={onDeleteNote} bindLeave={editorLeave}
          />
        </div>
        </EscapeRaise.Provider>,
        panelSlot,
      );
    }
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
    <AgentCardFrame ref={frameRef} labelledBy="ac-name" originRect={req.originRect ?? null} docked={docked} onScrim={() => void requestClose()}>
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
        queryPulse={queryPulse}
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
