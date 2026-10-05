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
import { EditCtx, alsoChanges, savedLine as savedLineFor } from "../../../lib/contactEdit";
import { AgentEditPatch, SaveAgentResult, commitAgentEdits } from "../../../lib/saveAgentEdits";
import { computeAgentDeadlineWrites } from "../../../lib/computeAgentDeadlineWrites";
import { commitTypedGenre, hrefFor } from "../../../lib/quickAdd";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { dayMonth } from "../../../lib/dates";
import { AGENT_GENRES } from "../../../lib/agentOptions";
import { genreLabel } from "../../../lib/genres";
import { alsoQueried, cardQuery, cardRows, reopenReminder, stepTarget, type CardAct } from "../../../lib/agentCard";
import { type CardDraft, cardPatch, encodeMats, toContactDraft } from "../../../lib/cardDraft";
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

/** The record as it is after a patch — `null` is a field removed. For the list's aftermath. */
const applied = (a: Agent, patch: AgentEditPatch): Agent => {
  const next = { ...a } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k];
    else if (v !== undefined) next[k] = v;
  }
  return next as unknown as Agent;
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
    currentUser, collectionsReady, packages,
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
  const [handover, setHandover] = useState<QuickFoot | null>(null);
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
    let res: SaveAgentResult;
    if (sandbox?.writeAgent) res = await sandbox.writeAgent(agent.id, patch);
    else {
      if (!currentUser) return { ok: false, error: "Not signed in." };
      const extras = patch.responseTimeWeeks !== undefined
        ? computeAgentDeadlineWrites(
            queries.filter((q) => q.agentId === agent.id),
            typeof patch.responseTimeWeeks === "number" ? patch.responseTimeWeeks : null,
            (queryId) => doc(db, "users", currentUser.id, "queries", queryId),
          )
        : [];
      res = await commitAgentEdits(db, currentUser.id, agent.id, patch, extras);
    }
    /* "in", not `!res.ok`: with strictNullChecks off a boolean discriminant does not narrow */
    if ("error" in res) return { ok: false, error: res.error };
    setHandover({ text: savedLineFor(notes) });
    emitAgentCardEvent({ type: "saved", agentId: agent.id, before: { ...agent }, after: applied(agent, patch) });
    setEditing(null);
    return { ok: true };
  }, [agent, editCtx, sandbox, currentUser, queries]);

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
        initialFoot={handover}
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
