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
 * ⚠️ PHASE 2 DRAWS THE QUICK VIEW; THE EDITOR IS STILL THE OLD POP-UP'S EDIT FACE (`ContactProfile`
 * opened at a section) until Phase 3 replaces it. Every way into the editor goes through ONE
 * function here, `openEditor`, so Phase 3 changes one place. Leaving that editor returns to the
 * quick view, as the mock's editor does.
 *
 * ⚠️ THE LIST STILL OWNS ITS OWN AFTERMATH — the notice saying where a saved record went, its Undo,
 * the FLIP, the ring on a new row, the row scrolled into view on a step — through the store, because
 * the host is app-level and the Contact list is only one of the pages the card opens over.
 *
 * ⚠️ THE QUICK VIEW'S OWN WRITES (the stars, the wishlist stamp) GO THROUGH `commitAgentEdits`, NOT
 * `updateAgent`: the latter logs an activity for every write, so its Undo would append a second
 * entry — the house undo rule forbids compensating entries.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { Agent, SubmissionMethod, SubmissionStatus } from "../../../types";
import {
  AgentNote, committedNotes, computeNotePreview, effectiveNotes, emptyNotesDraft,
} from "../../../lib/agentNotes";
import {
  AgentCardField, AgentCardOptions, AgentCardTab, closeAgentCard, currentAgentCard, emitAgentCardEvent,
  legacySectionFor, openAgentCard, openNewAgentCard, stepAgentCard, useAgentCardRequest,
  type AgentCardOrigin,
} from "../../../lib/agentCardStore";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { buildQcRows } from "../../../lib/qcSummary";
import { agentFacts } from "../../../lib/contactList";
import { isGenreMatch, matchGenre } from "../../../lib/genreMatch";
import {
  AlsoNote, ContactDraft, EditCtx, draftFromAgentRecord, savedLine as savedLineFor,
} from "../../../lib/contactEdit";
import { AgentEditPatch, SaveAgentResult, commitAgentEdits } from "../../../lib/saveAgentEdits";
import { computeAgentDeadlineWrites } from "../../../lib/computeAgentDeadlineWrites";
import { normaliseSubmissionsUrl } from "../../../lib/quickAdd";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { dayMonth } from "../../../lib/dates";
import { alsoQueried, cardQuery, cardRows, reopenReminder, stepTarget, type CardAct } from "../../../lib/agentCard";
import { ContactProfile } from "../contact/ContactProfile";
import { ContactAddCard } from "../contact/ContactAddCard";
import { AgentCardFrame, type AgentCardFrameHandle } from "./AgentCardFrame";
import { AgentQuickView, type QuickFoot } from "./AgentQuickView";
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

/** The editor a door asked for: a tab, and the field to focus there. */
interface EditTarget { tab: AgentCardTab; focus?: AgentCardField }

/** One open of the card — keyed on the request's seq, so every open is a fresh session. */
const AgentCardSession: React.FC<{ sandbox?: AgentCardSandbox }> = ({ sandbox }) => {
  const req = useAgentCardRequest();
  const navigate = useNavigate();
  /* ⚠️ THE SWITCHER RE-OPENS THE ROUTE (page header v2 §4.5): a switch is a new location KEY, and
     that key is what the scope reads on — memoised on `manuscripts` alone the card would go on
     stating the old book. */
  const { key: locationKey, pathname } = useLocation();
  const {
    agents, queries, manuscripts, activities, addAgent, addUserTask, deleteUserTask, currentUser,
    collectionsReady, packages,
  } = useScriptAllyDb();

  const scoped = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the switch's signal
  }, [manuscripts, locationKey]);
  const tintGenre = useMemo(() => matchGenre(scoped?.genre), [scoped]);
  const genreHit = useCallback((g: string) => !!tintGenre && isGenreMatch(g, tintGenre), [tintGenre]);

  /* ⚠️ THE QUERY CENTRE'S OWN ROWS — one derivation, so the card and the list cannot disagree. */
  const qcRows = useMemo(() => buildQcRows(queries, agents, activities, Date.now()), [queries, agents, activities]);
  const nowMs = useMemo(() => Date.now(), [qcRows]);
  const genrePool = useMemo(() => {
    const freq = new Map<string, number>();
    for (const a of agents) for (const g of a.genres ?? []) freq.set(g, (freq.get(g) ?? 0) + 1);
    return [...freq.entries()].sort((x, y) => y[1] - x[1]).map(([g]) => g);
  }, [agents]);
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

  /* the editor a door asked for opens straight away; otherwise the quick view */
  const [editing, setEditing] = useState<EditTarget | null>(req?.tab ? { tab: req.tab, focus: req.focus } : null);
  const [handover, setHandover] = useState<QuickFoot | null>(null);
  const [slide, setSlide] = useState<"l" | "r" | null>(null);
  const frameRef = useRef<AgentCardFrameHandle>(null);
  /* the entrance plays once per open — coming back from the editor is not an arrival */
  const shown = useRef(false);
  useEffect(() => { if (!editing) shown.current = true; });

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

  /* committed only — the card composes ADDITIONS one at a time; the flat legacy note rides as the
     oldest bubble exactly as the old drawer showed it */
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

  /**
   * SAVE (the bridge editor's): diff the draft against the record, send ONLY what changed through
   * `commitAgentEdits` — sanitised, atomic, with the reply-time deadline fan-out riding the same
   * batch (`computeAgentDeadlineWrites`). A wishlist edit stamps `mswlCheckedAt` in the SAME write.
   */
  const onSave = useCallback(async (d: ContactDraft, notes: AlsoNote[]): Promise<boolean> => {
    const orig = agentId ? agents.find((a) => a.id === agentId) : null;
    if (!orig || !currentUser) return false;
    const base = draftFromAgentRecord(orig);
    const patch: AgentEditPatch = {};
    if (d.name !== base.name) patch.name = d.name.trim();
    if (d.agency !== base.agency) patch.agency = d.agency.trim();
    if (d.email !== base.email) patch.email = d.email.trim();
    if (d.website !== base.website) patch.website = d.website.trim();
    if (d.city !== base.city) patch.city = d.city.trim();
    if (d.country !== base.country) patch.country = d.country;
    if (d.responseTimeWeeks !== base.responseTimeWeeks) patch.responseTimeWeeks = d.responseTimeWeeks;
    if (d.noResponseMeansNo !== base.noResponseMeansNo && d.noResponseMeansNo !== undefined) patch.noResponseMeansNo = d.noResponseMeansNo;
    if (d.submissionStatus !== base.submissionStatus) patch.submissionStatus = d.submissionStatus;
    if (d.reopensOn !== base.reopensOn) patch.reopensOn = d.reopensOn.trim() === "" ? null : d.reopensOn;
    if (JSON.stringify(d.genres) !== JSON.stringify(base.genres)) patch.genres = d.genres;
    if (d.mswlNotes !== base.mswlNotes) {
      patch.mswlNotes = d.mswlNotes;
      /* editing the wishlist IS checking it (§10: starts as the date it was last edited) */
      patch.mswlCheckedAt = new Date().toISOString();
    }
    if (JSON.stringify(d.materialsWanted) !== JSON.stringify(base.materialsWanted)) patch.materialsWanted = d.materialsWanted;
    if (d.starRating !== base.starRating) patch.starRating = d.starRating;
    if (Object.keys(patch).length === 0) return true;

    const extras = patch.responseTimeWeeks !== undefined
      ? computeAgentDeadlineWrites(
          queries.filter((q) => q.agentId === orig.id),
          typeof patch.responseTimeWeeks === "number" ? patch.responseTimeWeeks : null,
          (queryId) => doc(db, "users", currentUser.id, "queries", queryId),
        )
      : [];
    const res = await commitAgentEdits(db, currentUser.id, orig.id, patch, extras);
    if (!res.ok) return false;
    setHandover({ text: savedLineFor(notes) });
    const after = Object.assign({ ...orig } as Agent, patch as Partial<Agent>);
    emitAgentCardEvent({ type: "saved", agentId: orig.id, before: { ...orig }, after });
    return true;
  }, [agentId, agents, currentUser, queries]);

  /** Add ONE note — the subcollection write plus the documented cache, together. Resolves to
   *  whether it landed, so the composer can keep the words when it did not. */
  const onAddNote = useCallback(async (text: string): Promise<boolean> => {
    const orig = agentId ? agents.find((a) => a.id === agentId) : null;
    if (!orig || !currentUser) return false;
    const noteId = `note-${Math.random().toString(36).slice(2, 11)}`;
    const createdAt = new Date().toISOString();
    try {
      await setDoc(doc(collection(db, "users", currentUser.id, "agents", orig.id, "notes"), noteId), { text, createdAt });
      const after = committedNotes(effectiveNotes(
        [...storedNotes, { id: noteId, text, createdAt }],
        emptyNotesDraft(),
        { flatNote: orig.notes, dateAdded: orig.dateAdded },
      ));
      const preview = computeNotePreview(after, orig.pinnedNoteId);
      if ((orig.notePreview ?? "") !== preview) {
        await writeAgent(orig.id, { notePreview: preview });
      }
      return true;
    } catch (e) {
      /* the handler logs and THROWS (its callers' control flow); here the flow is the boolean */
      try { handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/agents/${orig.id}/notes`); } catch { /* logged */ }
      return false;
    }
  }, [agentId, agents, currentUser, storedNotes, writeAgent]);

  /**
   * The create — through the SAME `addAgent` path every other creator uses (free-tier cap,
   * AGENT_ADDED activity, undefined-stripping), with the v11 rules: optionals born ABSENT, the link
   * field saving to `website` through the scheme allowlist (§8.3), `reopensOn` only when the door
   * is Closed, and `submissionMethod` defaulting to Email exactly as the app-level form does.
   */
  const onCreateAgent = useCallback(async (d: ContactDraft, link: string) => {
    const res = await addAgent({
      name: d.name.trim(),
      agency: d.agency.trim(),
      email: d.email.trim(),
      website: d.website.trim() || (link ? normaliseSubmissionsUrl(link) : ""),
      genres: d.genres,
      mswlNotes: d.mswlNotes,
      submissionStatus: d.submissionStatus,
      submissionMethod: SubmissionMethod.EMAIL,
      materialsWanted: d.materialsWanted,
      notes: "",
      ...(d.city.trim() ? { city: d.city.trim() } : {}),
      ...(d.country ? { country: d.country } : {}),
      ...(d.responseTimeWeeks != null ? { responseTimeWeeks: d.responseTimeWeeks } : {}),
      ...(d.noResponseMeansNo !== undefined ? { noResponseMeansNo: d.noResponseMeansNo } : {}),
      ...(d.reopensOn.trim() && d.submissionStatus === SubmissionStatus.CLOSED ? { reopensOn: d.reopensOn.trim() } : {}),
      ...(d.starRating != null ? { starRating: d.starRating as Agent["starRating"] } : {}),
    });
    if (!res.success || !res.id) return { ok: false as const, error: res.error };
    closeAgentCard();
    emitAgentCardEvent({ type: "added", agentId: res.id });
    return { ok: true as const };
  }, [addAgent]);

  /* ── moving and leaving ──────────────────────────────────────────────────────────────────── */

  /** ✕, Escape and the backdrop: shrink back into the row when it is on screen, then close. */
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

  /** THE one way into the editor — Phase 3 swaps what it renders, and nothing else changes. */
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

  if (!req) return null;

  if (req.agentId === null) {
    return (
      <ContactAddCard
        focus="name"
        agents={agents}
        msGenre={scoped?.genre ?? null}
        genrePool={genrePool}
        onClose={closeAgentCard}
        onCreate={onCreateAgent}
        onOpenAgent={(id) => openAgentCard(id, { from: "button" })}
      />
    );
  }

  if (!agent) return null;
  const facts = agentFacts(agent, qcRows, scoped?.id ?? null);

  /* ⚠️ THE BRIDGE (Phase 2 only): the old pop-up's edit face, opened at the door's section, and
     returning to the quick view when it is left — by Cancel, Escape, ✕ or a save. */
  if (editing) {
    return (
      <ContactProfile
        agent={agent}
        facts={facts}
        nowMs={nowMs}
        msGenre={scoped?.genre ?? null}
        msTitle={scoped?.title ?? null}
        genreHit={genreHit}
        genrePool={genrePool}
        editCtx={editCtx}
        notes={profileNotes}
        packages={packages}
        editAt={legacySectionFor(editing.tab, editing.focus)}
        savedLine={null}
        onLeaveEdit={() => setEditing(null)}
        onClose={closeAgentCard}
        onSave={onSave}
        onAddNote={async (t) => { await onAddNote(t); }}
        onOpenQuery={(qid) => { closeAgentCard(); navigate(`/queries?q=${qid}`); }}
        onRecordResponse={() => { closeAgentCard(); openQueryDrawer({ mode: "resp" }); }}
        onLogQuery={() => { const id = agent.id; closeAgentCard(); openQueryDrawer({ mode: "log", agentId: id }); }}
      />
    );
  }

  const q = cardQuery(cardRows(qcRows, agent.id, scoped?.id ?? null));
  const also = alsoQueried(qcRows, agent.id, scoped?.id ?? null, (id) => manuscripts.find((m) => m.id === id)?.title ?? null);
  const onContactList = !!sandbox?.contactListHere || pathname === "/agents";
  return (
    <AgentCardFrame ref={frameRef} labelledBy="ac-name" originRect={req.originRect ?? null} entrance={!shown.current} onScrim={() => void requestClose()}>
      <AgentQuickView
        agent={agent}
        facts={facts}
        q={q}
        nowMs={nowMs}
        msTitle={scoped?.title ?? null}
        genreHit={genreHit}
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
