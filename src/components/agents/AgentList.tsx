/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — the page body (design authority: design-refs/agent-list-mockup.html).
 *
 * Phase 1 ships the chrome: header + Add button, filter chips with live counts, the search pill,
 * the three-swatch legend, the count line and the grid frame with its empty states. The cards
 * (Phase 2) and the flip editor (Phase 3+) drop into the grid; every value shown here is derived
 * in src/lib/agentList.ts, never stored.
 *
 * The page owns its own chrome and scroll — it mounts in a bare `fill`+`clip` StagePage.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "../shell/PageHeader";
import { useScriptAllyDb } from "../../lib/db";
import { AgentCard } from "./AgentCard";
import { AgentEditor } from "./AgentEditor";
import {
  AgentDraft,
  AgentEditorTab,
  DraftError,
  diffDraft,
  draftFromAgent,
  isDiffEmpty,
  validateDraft,
  draftDirty,
} from "../../lib/agentDraft";
import { collection, deleteDoc, deleteField, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import {
  AgentNote, FLAT_NOTE_ID, committedNotes, computeNotePreview, effectiveNotes, notePreviewWrite, resolvePin,
} from "../../lib/agentNotes";
import { Agent, SubmissionMethod, SubmissionStatus } from "../../types";
import { materialsWantedFromRows } from "../../lib/agentMaterials";
import { agentRelationship } from "../../lib/agentList";
import {
  AGENT_GROUP_OPTIONS,
  AGENT_SORT_OPTIONS,
  AgentDoor,
  AgentFilterSet,
  AgentGrouping,
  AgentListSort,
  AgentStanding,
  AgentTurn,
  DEFAULT_AGENT_SORT,
  DOOR_LABEL,
  STANDING_LABEL,
  TURN_LABEL,
  agentAxisCounts,
  emptyFilterSet,
  groupAgents,
  locationCounts,
  matchesAgentSearch,
  matchesFilterSet,
  sortAgentList,
  starTierCount,
} from "../../lib/agentList";
import {
  CARDS_START_MS,
  LOAD_MS,
  MAX_STAGGER_ROWS,
  ROW_STEP_MS,
  gridColumnCount,
  prefersReducedMotion,
  rowDelayMs,
} from "../../lib/agentMotion";
import { AgentToolbar, AppliedTag, AgentAppliedTags } from "./AgentToolbar";
import { countryName } from "../../lib/territory";
import { blankDraft } from "../../lib/agentDraft";
import "./agentList.css";

interface AgentListProps {
  /** A global search landing on this route seeds the page filter. */
  searchQuery?: string;
  /** App's navigate bridge — opts.agentId preselects the Log-a-Query agent. */
  onNavigate?: (tab: string, subPageName?: string, opts?: { agentId?: string }) => void;
}

export const AgentList: React.FC<AgentListProps> = ({ searchQuery, onNavigate }) => {
  const { agents, queries, manuscripts, activities, updateAgent, addAgent, currentUser } = useScriptAllyDb();

  const [filters, setFilters] = useState<AgentFilterSet>(emptyFilterSet);
  const [search, setSearch] = useState(searchQuery?.trim() || "");
  const [sort, setSort] = useState<AgentListSort>(DEFAULT_AGENT_SORT);
  const [grouping, setGrouping] = useState<AgentGrouping>("none");
  // A draft-only agent that isn't persisted until Done passes validation (decision 16).
  const [newAgent, setNewAgent] = useState<Agent | null>(null);

  // ── Page-load motion (Baked 1) ────────────────────────────────────────────
  // ROUTE ENTRY ONLY. `loadAnim` is armed once on mount and disarmed as soon as the sequence has
  // run, so a filter change, a sort change or any other re-render can never re-trigger it — a page
  // that re-animates every time you tick a checkbox is exhausting, and this animation introduces
  // the page, it doesn't celebrate each interaction.
  //
  // Disarming also matters MECHANICALLY: these animations carry fill-mode `both`, and a filled
  // animation outranks an inline transform, so cards still holding one would silently ignore the
  // FLIP transforms that arrive in Phase 2. Clearing the class returns them to a movable state.
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const [loadAnim, setLoadAnim] = useState(!prefersReducedMotion());

  // Measured before paint, so the very first frame already carries the right delay.
  useLayoutEffect(() => setColumns(gridColumnCount(gridRef.current)), []);

  useEffect(() => {
    if (!loadAnim) return;
    const done = window.setTimeout(
      () => setLoadAnim(false),
      CARDS_START_MS + (MAX_STAGGER_ROWS - 1) * ROW_STEP_MS + LOAD_MS + 40,
    );
    return () => window.clearTimeout(done);
    // armed once, on mount — deliberately not reactive to anything
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Both axes counted over the WHOLE list — a filter row must state what it would reveal, so it
  // can never read from the already-filtered view.
  const counts = useMemo(() => agentAxisCounts(agents, queries), [agents, queries]);
  const starCounts = useMemo(
    () => [4, 3].map((min) => ({ min, n: starTierCount(agents, min) })),
    [agents],
  );
  const locCounts = useMemo(() => locationCounts(agents), [agents]);

  const visible = useMemo(
    () =>
      sortAgentList(
        agents.filter((a) => matchesFilterSet(a, queries, filters) && matchesAgentSearch(a, search)),
        sort,
        queries,
      ),
    [agents, queries, filters, search, sort],
  );
  // The unsaved new agent always rides at the front of the grid, immune to filter and sort.
  const shown = useMemo(() => (newAgent ? [newAgent, ...visible] : visible), [newAgent, visible]);

  // Sections over the ALREADY SORTED list — grouping partitions, it never reorders, so whichever
  // sort is chosen applies within each section for free.
  const groups = useMemo(() => groupAgents(shown, grouping, queries), [shown, grouping, queries]);

  /** One tag per applied value, worded from the same label maps the popover reads. */
  const appliedTags: AppliedTag[] = useMemo(() => {
    const drop = <K extends keyof AgentFilterSet>(facet: K, v: AgentFilterSet[K][number]) => () =>
      setFilters((f) => ({ ...f, [facet]: (f[facet] as (typeof v)[]).filter((x) => x !== v) } as AgentFilterSet));
    return [
      ...filters.standing.map((k) => ({ label: STANDING_LABEL[k as AgentStanding], onRemove: drop("standing", k) })),
      ...filters.turn.map((k) => ({ label: TURN_LABEL[k as Exclude<AgentTurn, null>], onRemove: drop("turn", k) })),
      ...filters.door.map((k) => ({ label: DOOR_LABEL[k as AgentDoor], onRemove: drop("door", k) })),
      ...filters.stars.map((n) => ({ label: `${"★".repeat(n)} and up`, onRemove: drop("stars", n) })),
      ...filters.loc.map((c) => ({ label: countryName(c) || c, onRemove: drop("loc", c) })),
    ];
  }, [filters]);

  // ── Flip + buffered draft (decision 1) ────────────────────────────────────
  // ONE card is open at a time. Opening clones the agent into `draft`; every editor interaction
  // mutates the draft only; Done validates, diffs and commits a SINGLE updateAgent call; Escape
  // (or opening another card) discards it. Nothing here writes per keystroke.
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [tab, setTab] = useState<AgentEditorTab>("contact");
  const [error, setError] = useState<DraftError | null>(null);
  // ONE notes listener, for the OPEN card only — never one per card in the grid.
  const [storedNotes, setStoredNotes] = useState<AgentNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);

  const discard = useCallback(() => {
    setFlippedId(null);
    setDraft(null);
    setError(null);
    setStoredNotes([]);
    setNotesLoaded(false);
    // Escape on a never-valid new card discards it entirely (decision 2).
    setNewAgent(null);
  }, []);

  // Subscribe to the open agent's notes subcollection. `notesLoaded` only turns true once the
  // listener actually resolves — the notePreview recompute is gated on it, because an unresolved
  // listener is indistinguishable from "no notes" and would wipe a valid preview on Done.
  useEffect(() => {
    setStoredNotes([]);
    setNotesLoaded(false);
    if (!flippedId || !currentUser) return;
    const ref = collection(db, "users", currentUser.id, "agents", flippedId, "notes");
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
        setNotesLoaded(true);
      },
      (e) => handleFirestoreError(e, OperationType.LIST, `users/${currentUser.id}/agents/${flippedId}/notes`),
    );
    return () => unsub();
  }, [flippedId, currentUser?.id]);

  const onEdit = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;
      setFlippedId(agentId);
      setDraft(draftFromAgent(agent));
      setTab("contact");
      setError(null);
    },
    [agents],
  );

  // What the Notes pane shows: stored minus buffered deletions, plus buffered additions, with the
  // legacy flat note as the oldest bubble until it migrates.
  const openAgent = flippedId ? agents.find((a) => a.id === flippedId) ?? null : null;
  const visibleNotes = draft
    ? effectiveNotes(storedNotes, draft.notes, { flatNote: openAgent?.notes, dateAdded: openAgent?.dateAdded })
    : [];

  const onDone = useCallback(async () => {
    if (!draft) return;
    const invalid = validateDraft(draft);
    if (invalid) {
      setError(invalid);
      setTab(invalid.tab);
      return;
    }
    // A new agent is CREATED on its first valid Done; everything after is the ordinary diff path.
    if (newAgent && draft.id === newAgent.id) {
      const created = await addAgent({
        name: draft.name.trim(),
        agency: draft.agency.trim(),
        email: draft.email.trim(),
        website: draft.website.trim(),
        ...(draft.country.trim() ? { country: draft.country.trim() } : {}),
        ...(draft.city.trim() ? { city: draft.city.trim() } : {}),
        genres: draft.genres,
        mswlNotes: draft.mswlNotes,
        submissionStatus: draft.open ? SubmissionStatus.OPEN : SubmissionStatus.CLOSED,
        submissionMethod: (draft.submissionMethod === "Other" ? draft.methodOther.trim() : draft.submissionMethod) as SubmissionMethod,
        materialsWanted: materialsWantedFromRows(draft.materials),
        notes: "",
        ...(draft.starRating ? { starRating: draft.starRating } : {}),
        ...(draft.responseWeeks.trim() ? { responseTimeWeeks: Number(draft.responseWeeks.trim()) } : {}),
        ...(typeof draft.noResponseMeansNo === "boolean" ? { noResponseMeansNo: draft.noResponseMeansNo } : {}),
        ...(draft.socials.length ? { socials: draft.socials } : {}),
        ...(draft.image ? { image: draft.image } : {}),
        // the preview + pin are computed from the buffered notes and ride the CREATE itself,
        // so a brand-new agent's card is correct from its first render
        ...(draft.notes.added.length
          ? {
              notePreview: computeNotePreview(
                draft.notes.added.map((n) => ({ id: n.tempId, text: n.text, createdAt: n.createdAt })),
                draft.pinnedNoteId,
              ),
              ...(draft.pinnedNoteId && draft.notes.added.some((n) => n.tempId === draft.pinnedNoteId)
                ? { pinnedNoteId: draft.pinnedNoteId }
                : {}),
            }
          : {}),
      } as Parameters<typeof addAgent>[0]);
      if (!created?.success) {
        setError({ tab: "contact", msg: created?.error || "That agent couldn't be saved." });
        return;
      }
      // buffered notes become real documents under the CREATED id (tempIds are the doc ids, so
      // the pin written above stays valid)
      if (created.id && currentUser && draft.notes.added.length) {
        const notesCol = collection(db, "users", currentUser.id, "agents", created.id, "notes");
        try {
          for (const pending of draft.notes.added) {
            await setDoc(doc(notesCol, pending.tempId), { text: pending.text, createdAt: pending.createdAt });
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/agents/${created.id}/notes`);
        }
      }
      discard();
      return;
    }

    const original = agents.find((a) => a.id === draft.id);
    if (!original) return discard();

    const diff = diffDraft(original, draft);

    // ── notes: the buffered posts / deletions / flat-note migration, committed HERE so the agent
    // write and the note documents land together (one writer — what makes notePreview safe).
    if (currentUser) {
      const notesCol = collection(db, "users", currentUser.id, "agents", draft.id, "notes");
      try {
        for (const id of draft.notes.deletedIds) {
          if (id !== FLAT_NOTE_ID) await deleteDoc(doc(notesCol, id));
        }
        for (const pending of draft.notes.added) {
          await setDoc(doc(notesCol, pending.tempId), { text: pending.text, createdAt: pending.createdAt });
        }
        // the legacy flat note becomes a real, pinnable bubble carrying its original timestamp,
        // and the flat field is blanked in the SAME commit
        if (draft.notes.migratedFlat && (original.notes || "").trim()) {
          const migratedId = `note-${Math.random().toString(36).slice(2, 11)}`;
          await setDoc(doc(notesCol, migratedId), {
            text: original.notes.trim(),
            createdAt: original.dateAdded || new Date().toISOString(),
          });
          diff.changed.notes = "";
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.id}/agents/${draft.id}/notes`);
      }
    }

    // ── notePreview (the documented derived-over-stored exception). Recompute against the notes
    // as they will be AFTER this commit, gated on the listener having resolved.
    const afterCommit = committedNotes(
      effectiveNotes(storedNotes, draft.notes, {
        flatNote: draft.notes.migratedFlat ? original.notes : undefined,
        dateAdded: original.dateAdded,
      }),
    );
    const livePin = resolvePin(afterCommit, draft.pinnedNoteId);
    if ((livePin || "") !== (draft.pinnedNoteId || "")) {
      if (livePin) diff.changed.pinnedNoteId = livePin;
      else if (original.pinnedNoteId) diff.deletes.push("pinnedNoteId");
    }
    const preview = notePreviewWrite({
      loaded: notesLoaded,
      notes: afterCommit,
      pinnedNoteId: livePin,
      stored: original.notePreview,
    });
    if (preview !== undefined) diff.changed.notePreview = preview;

    if (!isDiffEmpty(diff)) {
      // deleteField() for values the writer cleared, so absence round-trips as absence rather
      // than a stored 0/false (the repo's existing unset convention).
      const payload: Partial<Agent> = { ...diff.changed };
      for (const key of diff.deletes) {
        (payload as Record<string, unknown>)[key] = deleteField();
      }
      await updateAgent(draft.id, payload);
    }
    discard();
  }, [agents, draft, discard, updateAgent, currentUser, storedNotes, notesLoaded, newAgent, addAgent]);

  // ── Escape cascade (three stages, in order) ───────────────────────────────
  // 1. An open popup consumes Escape and closes itself — AgentCountryPicker listens on the
  //    CAPTURE phase and calls stopImmediatePropagation, so this bubble-phase handler never runs
  //    for that key. Dismissing a dropdown must never discard the draft.
  // 2. Focus in a field → blur it, draft untouched.
  // 3. Nothing focused → discard the draft and flip back. No confirmation: silent discard matches
  //    switching cards, and a modal here would be heavier than the risk.
  useEffect(() => {
    if (!flippedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = document.activeElement as HTMLElement | null;
      const inField =
        !!el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (inField) {
        e.preventDefault();
        el!.blur();
        return;
      }
      e.preventDefault();
      discard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flippedId, discard]);

  // A card that scrolls out of the filtered set takes its draft with it. Checked against `shown`,
  // not `visible` — the unsaved new agent rides only in `shown`, and checking `visible` would
  // discard a brand-new card the instant it opened.
  useEffect(() => {
    if (flippedId && !shown.some((a) => a.id === flippedId)) discard();
  }, [shown, flippedId, discard]);

  /**
   * Add a new agent (decision 16, as amended): a DRAFT-ONLY record — nothing is persisted until
   * Done passes validation. Filter and search are cleared so it can't be born hidden, and it flips
   * straight into the editor. Per amendment A it is born with starRating, responseTimeWeeks and
   * noResponseMeansNo OMITTED — no invented 8 weeks, no invented 3 stars.
   */
  const onAddAgent = () => {
    if (!currentUser) return;
    const id = `new-${Math.random().toString(36).slice(2, 11)}`;
    const stub: Agent = {
      id,
      userId: currentUser.id,
      name: "",
      agency: "",
      email: "",
      website: "",
      genres: [],
      mswlNotes: "",
      submissionStatus: SubmissionStatus.OPEN,
      submissionMethod: SubmissionMethod.EMAIL,
      materialsWanted: [],
      dateAdded: new Date().toISOString(),
      lastCheckedDate: new Date().toISOString(),
      notes: "",
    };
    // Clear every narrowing control so the new card can't be born hidden behind a filter.
    setFilters(emptyFilterSet());
    setSearch("");
    setNewAgent(stub);
    setFlippedId(id);
    setDraft(blankDraft(id));
    setTab("contact");
    setError(null);
  };
  const onLogQuery = (agent: { id: string }) => onNavigate?.("queries", "Log a query", { agentId: agent.id });

  /** ONE card renderer, shared by the flat grid and every group section — a second copy would
   *  drift the moment the editor gains a prop.
   *
   *  `index` is the card's position in its own grid, which is what the row stagger reads. The
   *  delay is set inline because the row depends on the LIVE column count (auto-fill), which no
   *  stylesheet can know — CSS has no way to derive a row from nth-child without the column count
   *  baked in at authoring time. The state class stays on the container; only the number is here. */
  const renderCard = (agent: Agent, index: number) => (
              <AgentCard
                key={agent.id}
                style={loadAnim ? { animationDelay: `${rowDelayMs(index, columns)}ms` } : undefined}
                agent={agent}
                queries={queries}
                manuscripts={manuscripts}
                activities={activities}
                onEdit={onEdit}
                onLogQuery={onLogQuery}
                flipped={flippedId === agent.id}
                editor={
                  draft && flippedId === agent.id ? (
                    <AgentEditor
                      draft={draft}
                      onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
                      tab={tab}
                      onTab={setTab}
                      onDone={() => void onDone()}
                      onDiscard={discard}
                      dirty={draftDirty(draft)}
                      error={error}
                      onImageError={(msg) => setError({ tab: "contact", msg })}
                      isNew={!!newAgent && newAgent.id === agent.id}
                      hasActiveQueries={agentRelationship(agent.id, queries) === "active"}
                      notes={visibleNotes}
                      notesLoaded={notesLoaded}
                      onPostNote={(text) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                notes: {
                                  ...d.notes,
                                  // posting is what migrates the legacy flat note (decision 13)
                                  migratedFlat: d.notes.migratedFlat || !!(agent.notes || "").trim(),
                                  added: [
                                    ...d.notes.added,
                                    { tempId: `note-${Math.random().toString(36).slice(2, 11)}`, text, createdAt: new Date().toISOString() },
                                  ],
                                },
                              }
                            : d,
                        )
                      }
                      onDeleteNote={(id) =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                // deleting the pinned note clears the pin; the preview falls back to latest
                                pinnedNoteId: d.pinnedNoteId === id ? undefined : d.pinnedNoteId,
                                notes: {
                                  ...d.notes,
                                  deletedIds: [...d.notes.deletedIds, id],
                                  added: d.notes.added.filter((p) => p.tempId !== id),
                                },
                              }
                            : d,
                        )
                      }
                      onPinNote={(id) => setDraft((d) => (d ? { ...d, pinnedNoteId: id } : d))}
                    />
                  ) : null
                }
              />
  );

  return (
    <div className={`aglist${loadAnim ? " agl-anim" : ""}`}>
      <div className="agl-page">
       {/* The content column: padding rides the page, the CAP rides here, so a wide monitor
           pools its surplus as symmetric margin rather than stretching the grid. */}
       <div className="agl-inner">
        {/* The standard page header — FULL variant (flyouts pack P3: the compact variant is
            retired; one header grammar app-wide). The description resurrects the page's own
            original sub line. */}
        <div className="agl-head-slot">
        <PageHeader
          variant="full"
          title="Your agent list"
          description="Everyone you're querying, watching, or saving for later."
          actions={[{ label: "Add new agent", icon: <Plus aria-hidden="true" />, onClick: onAddAgent, primary: true }]}
        />
        </div>

        <AgentToolbar
          search={search}
          onSearch={setSearch}
          filters={filters}
          onFilters={setFilters}
          counts={counts}
          starCounts={starCounts}
          locCounts={locCounts}
          resultCount={visible.length}
          total={agents.length}
          group={grouping}
          groupOptions={AGENT_GROUP_OPTIONS}
          onGroup={(k) => setGrouping(k as AgentGrouping)}
          sort={sort}
          sortOptions={AGENT_SORT_OPTIONS}
          defaultSort={DEFAULT_AGENT_SORT}
          onSort={(k) => setSort(k as AgentListSort)}
        />

        {/* Applied filters live OUTSIDE the popover — closing it must never hide what is
            filtering the list. Each tag removes its own value; "Clear all" empties the set. */}
        <AgentAppliedTags tags={appliedTags} onClear={() => setFilters(emptyFilterSet())} />

        {/* GROUPED or flat. Sections come from groupAgents over the ALREADY SORTED list, so the
            chosen sort applies within each section for free. The unsaved new card is pinned to
            the front of the flat grid and never grouped — it has no standing to group by yet. */}
        {grouping !== "none" && shown.length > 0 ? (
          <div className="agl-groups">
            {groups.map((sec, si) => (
              <section key={sec.key}>
                <div className="agl-gsec">
                  <h2>{sec.title}</h2>
                  {sec.stars ? <span className="st2" aria-hidden="true">{"★".repeat(sec.stars)}</span> : null}
                  <span className="cn">{sec.agents.length}</span>
                </div>
                <div
                  className="agl-grule"
                  style={{ background: `linear-gradient(90deg, ${sec.stub} 0 88px, var(--agl-linesoft) 88px)` }}
                />
                <div className="agl-grid" ref={si === 0 ? gridRef : undefined}>{sec.agents.map(renderCard)}</div>
              </section>
            ))}
          </div>
        ) : (
        <div className="agl-grid agl-gridwrap" ref={gridRef}>
          {shown.length === 0 && (
            <div className="agl-empty">
              {agents.length === 0 ? (
                /* welcome state — a doorway, not an error */
                <>
                  <div className="big">Your agent list starts here.</div>
                  <div className="small" style={{ marginBottom: 14 }}>
                    Everyone you're querying, watching, or saving for later.
                  </div>
                  <button type="button" className="agl-btn agl-btn-dark" onClick={onAddAgent}>
                    <Plus width={14} height={14} aria-hidden="true" />
                    Add your first agent
                  </button>
                </>
              ) : (
                <>
                  <div className="big">No agents match.</div>
                  <div className="small">Loosen the filter, or clear the search.</div>
                </>
              )}
            </div>
          )}
          {shown.map(renderCard)}
        </div>
        )}
       </div>
      </div>
    </div>
  );
};
