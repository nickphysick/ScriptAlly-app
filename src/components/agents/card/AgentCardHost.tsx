/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AgentCardHost — the agent card, mounted ONCE (Agent card v1 §2; ref
 * design-refs/agent-card-housekeeping-v7.html). It subscribes to `agentCardStore`, owns everything
 * the card needs from the data layer — the scoped manuscript, the agent's facts off the Query
 * Centre's own rows, the one notes listener, the save and the add — and portals the card to
 * document.body, so it opens over whatever page the writer is on.
 *
 * ⚠️ PHASE 1 IS A RELOCATION. The host renders today's pop-up (`ContactProfile`) and add card
 * (`ContactAddCard`) with the plumbing that used to live in `AgentList`, moved here verbatim. The
 * v11/v12 suites staying green is the proof the move changed nothing; Phases 2–3 replace what it
 * renders. One behaviour changes on purpose: the card no longer closes when its agent drops out of
 * the list's FILTER (the old auto-close discarded a card opened from Housekeeping for any agent the
 * current search hid). It closes when the agent no longer exists.
 *
 * ⚠️ THE LIST STILL OWNS ITS OWN AFTERMATH — the notice saying where a saved record went, its Undo,
 * the FLIP, the ring on a new row — through the store's events, because the host is app-level and
 * the Contact list is only one of the pages the card opens over.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../../lib/firebase";
import { useScriptAllyDb } from "../../../lib/db";
import { Agent, SubmissionMethod, SubmissionStatus } from "../../../types";
import {
  AgentNote, committedNotes, computeNotePreview, effectiveNotes, emptyNotesDraft,
} from "../../../lib/agentNotes";
import {
  AgentCardOptions, closeAgentCard, currentAgentCard, emitAgentCardEvent, legacySectionFor,
  openAgentCard, openNewAgentCard, useAgentCardRequest,
} from "../../../lib/agentCardStore";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { buildQcRows } from "../../../lib/qcSummary";
import { agentFacts } from "../../../lib/contactList";
import { isGenreMatch, matchGenre } from "../../../lib/genreMatch";
import {
  AlsoNote, ContactDraft, EditCtx, draftFromAgentRecord, savedLine as savedLineFor,
} from "../../../lib/contactEdit";
import { AgentEditPatch, commitAgentEdits } from "../../../lib/saveAgentEdits";
import { computeAgentDeadlineWrites } from "../../../lib/computeAgentDeadlineWrites";
import { normaliseSubmissionsUrl } from "../../../lib/quickAdd";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { ContactProfile } from "../contact/ContactProfile";
import { ContactAddCard } from "../contact/ContactAddCard";
import "../contact/contactV11.css";

/** The shared manuscript-scope key — the same one the Contact list, Packages and Comps read. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";

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

export const AgentCardHost: React.FC = () => {
  const req = useAgentCardRequest();
  if (!req) return null;
  return <AgentCardSession key={req.seq} />;
};

/** One open of the card — keyed on the request's seq, so every open is a fresh session. */
const AgentCardSession: React.FC = () => {
  const req = useAgentCardRequest();
  const navigate = useNavigate();
  /* ⚠️ THE SWITCHER RE-OPENS THE ROUTE (page header v2 §4.5): a switch is a new location KEY, and
     that key is what the scope reads on — memoised on `manuscripts` alone the card would go on
     stating the old book. */
  const { key: locationKey } = useLocation();
  const { agents, queries, manuscripts, activities, addAgent, currentUser, collectionsReady, packages } = useScriptAllyDb();

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

  const [savedNote, setSavedNote] = useState<string | null>(null);

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

  /**
   * SAVE: diff the draft against the record, send ONLY what changed through `commitAgentEdits` —
   * sanitised, atomic, with the reply-time deadline fan-out riding the same batch
   * (`computeAgentDeadlineWrites`). A wishlist edit stamps `mswlCheckedAt` in the SAME write.
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
    setSavedNote(savedLineFor(notes));
    const after = Object.assign({ ...orig } as Agent, patch as Partial<Agent>);
    emitAgentCardEvent({ type: "saved", agentId: orig.id, before: { ...orig }, after });
    return true;
  }, [agentId, agents, currentUser, queries]);

  /** Add ONE note — the subcollection write plus the documented cache, together. */
  const onAddNote = useCallback(async (text: string) => {
    const orig = agentId ? agents.find((a) => a.id === agentId) : null;
    if (!orig || !currentUser) return;
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
        await commitAgentEdits(db, currentUser.id, orig.id, { notePreview: preview });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/agents/${orig.id}/notes`);
    }
  }, [agentId, agents, currentUser, storedNotes]);

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
      editAt={legacySectionFor(req.tab, req.focus)}
      savedLine={savedNote}
      onClose={closeAgentCard}
      onSave={onSave}
      onAddNote={onAddNote}
      onOpenQuery={(qid) => { closeAgentCard(); navigate(`/queries?q=${qid}`); }}
      /* unchanged in Phase 1: the drawer opens on its picker, as the old page's capture did */
      onRecordResponse={() => { closeAgentCard(); openQueryDrawer({ mode: "resp" }); }}
      onLogQuery={() => { const id = agent.id; closeAgentCard(); openQueryDrawer({ mode: "log", agentId: id }); }}
    />
  );
};
