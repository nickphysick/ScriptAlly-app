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
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
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
import { BUMP_MS, EXIT_MS, SAVE_BREATH_MS, SAVE_FADE_IN_MS, SAVE_FADE_OUT_MS } from "../../lib/agentMotion";
import { saveNotice, saveOutcome, sectionFor } from "../../lib/agentSaveOutcome";
import { FlipRects, clearFlip, measureFlip, playFlip } from "../../lib/flip";
import { AgentToolbar, AppliedTag, AgentAppliedTags } from "./AgentToolbar";
import { countryName } from "../../lib/territory";
import { blankDraft } from "../../lib/agentDraft";
import { useIsMobile, useMobileChrome } from "../shell/mobileChrome";
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
  // The positions captured just BEFORE a change that reflows the grid. Consumed once, by the
  // layout effect below, on the very next render.
  const flipBefore = useRef<FlipRects | null>(null);
  // A card on its way out: it holds its place, plays `fall`, and only then is really removed —
  // otherwise the gap closes underneath it and the exit animates nothing.
  const [leavingId, setLeavingId] = useState<string | null>(null);
  /** The saved card's beat, and the inline notice that outlives the motion. */
  const [saveState, setSaveState] = useState<{ id: string; phase: "fadeout" | "fadein" | "breath" } | null>(null);
  const [notice, setNotice] = useState<{
    text: string; kind: "travel" | "filtered-out"; agentId: string; canUndo: boolean;
  } | null>(null);
  /** Which section the card sat in before the save — read once the outcome is computed. */
  const sectionBeforeSave = useRef<string | null>(null);
  /** The agent exactly as it was before the last save, so Undo can put it back. Null for a card
   *  that was CREATED by the save — there is no previous version to restore. */
  const undoSnapshot = useRef<Agent | null>(null);
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

  // LAST + INVERT + PLAY. Runs after the DOM has the new arrangement but before paint, so the
  // displaced cards are jumped back to their old positions and released on the next frame. Only
  // cards that actually MOVED are touched; a card that stayed put gets no transform and no layer.
  useLayoutEffect(() => {
    const before = flipBefore.current;
    if (!before) return;
    flipBefore.current = null;
    if (prefersReducedMotion()) return clearFlip(gridRef.current);
    playFlip(gridRef.current, before, { durationMs: BUMP_MS });
    const done = window.setTimeout(() => clearFlip(gridRef.current), BUMP_MS + 60);
    return () => window.clearTimeout(done);
  });

  /**
   * ALWAYS scroll the new card fully into view — not only when the grid happens to be off-screen.
   *
   * The new-agent card is an EDITOR and is far taller than an ordinary card, so even from the very
   * top of the page the header and toolbar have to scroll away for it to fit. That is intended.
   *
   * `block: "start"` ALWAYS: if the card is taller than the viewport, top-aligning it keeps the top
   * of the form (the name field the writer is about to type into) on screen. Centring a too-tall
   * card would push its head off the top, which is the one thing worse than not scrolling.
   *
   * The offset beneath the top bar comes from `scroll-margin-top` on the card rather than arithmetic
   * here, so it stays correct if the bar's height ever changes.
   *
   * Runs in a LAYOUT effect keyed on the new card's id: the element has to exist to be scrolled to,
   * and this way the scroll is requested in the same frame the card is inserted — the scroll and
   * the 340ms `rise` start TOGETHER. A 7px lift cannot fight a scroll, and sequencing them would
   * add delay for nothing.
   */
  useLayoutEffect(() => {
    if (!newAgent) return;
    const card = document.querySelector<HTMLElement>(`[data-agent-card="${newAgent.id}"]`);
    // scrollIntoView walks to the nearest scrollable ancestor, which is `.aglist` (height:100% +
    // overflow-y:auto) — the page region inside the content capsule, NOT the document.
    card?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    // Only when the card first appears — not on every keystroke that re-renders it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAgent?.id]);

  /* ⚠️ THE ONE-SHOT REVEAL (board fixes II, P1). The To-do board's ⋯ menu offers "View the
     agent"; this is the receiving end. sessionStorage rather than a route param, deliberately:
     a reveal is a GESTURE, not an address — it must not survive the tab, must not enter history,
     and must fire exactly once (the key is cleared the moment it is read). Same scroll mechanics
     as the new-agent land above; an id that no longer exists simply clears and does nothing. */
  useLayoutEffect(() => {
    let id: string | null = null;
    try { id = sessionStorage.getItem("sa.agentReveal"); } catch { /* private mode */ }
    if (!id || agents.length === 0) return;        // hold the key until the list can answer
    try { sessionStorage.removeItem("sa.agentReveal"); } catch { /* private mode */ }
    if (!agents.some((a) => a.id === id)) return;  // stale id — consumed, nothing to show
    const card = document.querySelector<HTMLElement>(`[data-agent-card="${id}"]`);
    card?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.length]);

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

  /** Clear the editor state. Separated from the exit MOTION below so a save (which has its own
   *  three-beat choreography) and a discard (which reverses) can share the teardown. */
  const clearEditor = useCallback(() => {
    setFlippedId(null);
    setDraft(null);
    setError(null);
    setStoredNotes([]);
    setNotesLoaded(false);
  }, []);

  /**
   * Discard (Baked 3) — the reverse of the arrival, and faster.
   *
   * An unsaved card LEAVES first and the grid closes the gap afterwards: `fall` needs the card to
   * still occupy its slot while it plays, so removing it from the list immediately would collapse
   * the gap underneath and animate nothing. Two beats, not one — the exit, then the bump.
   *
   * An existing card just flips back; nothing leaves, so there is nothing to animate.
   */
  const discard = useCallback(() => {
    const departing = newAgent?.id && flippedId === newAgent.id ? newAgent.id : null;
    clearEditor();
    if (!departing) return setNewAgent(null);

    if (prefersReducedMotion()) {
      setNewAgent(null);
      return;
    }
    setLeavingId(departing);
    window.setTimeout(() => {
      // measure with the leaving card STILL in place, so the survivors' "before" is honest
      flipBefore.current = measureFlip(gridRef.current);
      setLeavingId(null);
      setNewAgent(null);
    }, EXIT_MS);
  }, [clearEditor, newAgent, flippedId]);

  /**
   * SAVE — three beats (Baked 4). Never one motion: a card flung across the grid the instant you
   * press Done is unreadable, and you cannot tell whether it saved or simply went away.
   *
   *   1. IN PLACE, the editor crossfades into a finished card (170ms out, 200ms in). The
   *      transformation registers before anything moves.
   *   2. A breath — 220ms. This is the beat that makes the travel legible as a consequence.
   *   3. The card travels to its sorted place while everything between bumps around it (340ms).
   *
   * Then the notice, which is not decoration: a card that travels off-screen otherwise just
   * vanishes. The motion answers "did it save?" only for a destination you can see.
   *
   * Two exceptions to the travel, both deliberate:
   *   · the card no longer matches the active filters → it LEAVES with the discard motion and the
   *     notice says where it went. It must never silently disappear.
   *   · grouping is on and the card changed SECTION → it falls at the old home and rises at the
   *     new one. A card moving within a list is a shuffle and sliding is honest; a card that has
   *     changed category flying across a heading implies a continuity that isn't there.
   */
  const beginSaveChoreography = useCallback(
    (saved: Agent) => {
      const outcome = saveOutcome(saved, {
        agents: [...agents.filter((a) => a.id !== saved.id), saved],
        queries,
        filters,
        search,
        sort,
        grouping,
        sectionBefore: sectionBeforeSave.current,
      });
      setNotice({
        text: saveNotice(saved.name || saved.agency, outcome),
        kind: outcome.kind,
        agentId: saved.id,
        // Undo restores a PREVIOUS version; a save that created an agent has none, and undoing it
        // would mean deletion — which this page deliberately has no affordance for.
        canUndo: !!undoSnapshot.current,
      });

      if (prefersReducedMotion()) {
        setSaveState(null);
        clearEditor();
        setNewAgent(null);
        return;
      }

      // Beat 1a — the editor face fades OUT, in place. The card keeps its slot throughout.
      setSaveState({ id: saved.id, phase: "fadeout" });

      window.setTimeout(() => {
        // Beat 1b — the finished card fades IN. The rotor's rotation is suppressed for this: a
        // save is a transformation in place, not a flip back.
        setSaveState({ id: saved.id, phase: "fadein" });
        clearEditor();

        window.setTimeout(() => {
        // Beat 2 — the breath. Nothing moves. This is what makes the travel read as a consequence.
        setSaveState({ id: saved.id, phase: "breath" });

        window.setTimeout(() => {
          // Beat 3 — the travel (or, for a card that has left the view, the exit).
          if (outcome.kind === "filtered-out" || outcome.sectionChanged) {
            setLeavingId(saved.id);
            window.setTimeout(() => {
              flipBefore.current = measureFlip(gridRef.current);
              setLeavingId(null);
              setSaveState(null);
              setNewAgent(null);
            }, EXIT_MS);
            return;
          }
          flipBefore.current = measureFlip(gridRef.current);
          setSaveState(null);
          setNewAgent(null);
        }, SAVE_BREATH_MS);
        }, SAVE_FADE_IN_MS);
      }, SAVE_FADE_OUT_MS);
    },
    [agents, queries, filters, search, sort, grouping, clearEditor],
  );

  /**
   * Undo — restores the agent's previous field values in ONE write, mirroring the save's single
   * write. It is offered only for an EDIT: a save that created an agent has no previous version,
   * and undoing it would mean deleting one, which this page has no affordance for (deleteAgent
   * has no cascade and would orphan queries).
   */
  const undoSave = useCallback(async () => {
    const prev = undoSnapshot.current;
    setNotice(null);
    if (!prev) return;
    flipBefore.current = measureFlip(gridRef.current);
    await updateAgent(prev.id, prev);
    undoSnapshot.current = null;
  }, [updateAgent]);

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

  // ── Mobile editor push (Mobile Pass 1, baked decision 6) ──────────────────
  // Below md the 3D flip stands down: opening a card renders the SAME editor element (same
  // draft buffer, same handlers, one updateAgent on Done) as a full-screen in-flow view that
  // REPLACES the list — the .aglist root stays the scroll container, the shell bar above
  // carries Done/Cancel via the MobileDetailSpec seam, and the tab bar stands down with it.
  const isMobile = useIsMobile();
  const { setMobileDetail } = useMobileChrome();
  const rootRef = useRef<HTMLDivElement>(null);
  const pushAgent = openAgent ?? (newAgent && flippedId === newAgent.id ? newAgent : null);
  const mobilePushOpen = isMobile && !!draft && !!flippedId && !!pushAgent;
  // The list's scroll survives the push: .aglist is the scroller, and hiding the list clamps
  // its scrollTop — saved on push, restored on return (back-preserves-scroll).
  const listScrollMemo = useRef(0);
  const prevPush = useRef(false);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (mobilePushOpen && !prevPush.current) {
      listScrollMemo.current = el.scrollTop;
      el.scrollTop = 0;
    } else if (!mobilePushOpen && prevPush.current) {
      el.scrollTop = listScrollMemo.current;
    }
    prevPush.current = mobilePushOpen;
  }, [mobilePushOpen]);

  const onDone = useCallback(async () => {
    if (!draft) return;
    const invalid = validateDraft(draft);
    if (invalid) {
      setError(invalid);
      setTab(invalid.tab);
      return;
    }
    // Where does this card sit RIGHT NOW? Read before the write, because the save may change the
    // very fact the grouping is keyed on.
    const beforeAgent = agents.find((a) => a.id === draft.id) ?? newAgent;
    sectionBeforeSave.current = beforeAgent
      ? sectionFor(beforeAgent, { agents, queries, filters, search, sort, grouping })
      : null;
    // Only an EXISTING agent has a previous version; a create has nothing to revert to, and
    // "Undo" there would mean deletion, which this page deliberately has no affordance for.
    undoSnapshot.current = agents.find((a) => a.id === draft.id) ?? null;

    // A new agent is CREATED on its first valid Done; everything after is the ordinary diff path.
    if (newAgent && draft.id === newAgent.id) {
      // Built ONCE and reused: the write payload is also what the save choreography reads to work
      // out where the card is going, so the motion can't describe a different agent than the one
      // that landed.
      const payload = {
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
      } as Parameters<typeof addAgent>[0];
      const created = await addAgent(payload);
      if (!created?.success) {
        // The write failed: the draft STAYS a draft and the error surfaces exactly as before.
        // Nothing is adopted — a node must never claim an id that doesn't exist.
        setError({ tab: "contact", msg: created?.error || "That agent couldn't be saved." });
        return;
      }
      // ── ID ADOPTION (gate 2). ONLY on a confirmed successful create.
      // The draft card is keyed by a temporary id; the saved agent arrives from Firestore with a
      // real one. Without this, React would destroy the draft node and build a fresh card — and
      // FLIP cannot animate an element that no longer exists, so the save could never travel.
      // Adopting the real id onto the existing node means the incoming snapshot MATCHES it and
      // React moves the node instead of rebuilding it.
      if (created.id) setNewAgent((n) => (n ? { ...n, id: created.id as string } : n));
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
      // The saved card's outcome is computed BEFORE any motion, so the choreography and the
      // notice can never describe different things.
      beginSaveChoreography({
        ...(payload as unknown as Agent),
        id: created.id || draft.id,
        userId: currentUser?.id || "",
        dateAdded: newAgent.dateAdded,
        lastCheckedDate: newAgent.lastCheckedDate,
      });
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

    const savedAgent: Agent = { ...original, ...(diff.changed as Partial<Agent>) };

    if (!isDiffEmpty(diff)) {
      // deleteField() for values the writer cleared, so absence round-trips as absence rather
      // than a stored 0/false (the repo's existing unset convention).
      const payload: Partial<Agent> = { ...diff.changed };
      for (const key of diff.deletes) {
        (payload as Record<string, unknown>)[key] = deleteField();
      }
      await updateAgent(draft.id, payload);
      // An edit that changed something gets the full three beats — it may now sort or group
      // somewhere else, and that move needs the same explanation a new card gets.
      beginSaveChoreography(savedAgent);
      return;
    }
    // Nothing changed: no write, no motion, no notice. A no-op Done is not an event.
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

  // The shell's Done/Cancel (baked decision 5): the pushed editor registers itself so the top
  // bar swaps to Cancel · title · Done and the tab bar stands down. Done is the editor's own
  // commit; Cancel is the silent discard — the page's Escape grammar (the editor's in-card ✕
  // keeps the ask-if-dirty path for careful discards).
  useEffect(() => {
    if (!mobilePushOpen) {
      setMobileDetail("agents", null);
      return;
    }
    setMobileDetail("agents", {
      kind: "editor",
      title: newAgent && flippedId === newAgent.id ? "New agent" : "Edit agent",
      onCancel: discard,
      onDone: () => void onDone(),
    });
    return () => setMobileDetail("agents", null);
  }, [mobilePushOpen, flippedId, newAgent, discard, onDone, setMobileDetail]);

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
    // FIRST + settle: where is everything now? Measured BEFORE the insert, so the cards about to
    // be displaced can be sent back to their old places and released into the bump.
    flipBefore.current = measureFlip(gridRef.current);
    setNewAgent(stub);
    setFlippedId(id);
    setDraft(blankDraft(id));
    setTab("contact");
    setError(null);
  };
  const onLogQuery = (agent: { id: string }) => onNavigate?.("queries", "Log a query", { agentId: agent.id });

  /** ONE editor element builder, shared by the card back face (desktop flip) and the mobile
   *  push host — a second copy would drift the moment the editor gains a prop. */
  const editorFor = (agent: Agent) =>
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
    ) : null;

  /** ONE card renderer, shared by the flat grid and every group section.
   *
   *  `index` is the card's position in its own grid, which is what the row stagger reads. The
   *  delay is set inline because the row depends on the LIVE column count (auto-fill), which no
   *  stylesheet can know — CSS has no way to derive a row from nth-child without the column count
   *  baked in at authoring time. The state class stays on the container; only the number is here.
   *
   *  Below md the FLIP IS SUPPRESSED (baked decision 6): the card never rotates and carries no
   *  editor face — the mobile push host renders the same editor element full-screen instead. */
  const renderCard = (agent: Agent, index: number) => (
              <AgentCard
                key={agent.id}
                style={loadAnim ? { animationDelay: `${rowDelayMs(index, columns)}ms` } : undefined}
                motionClass={[
                  leavingId === agent.id ? "agl-leaving" : "",
                  newAgent?.id === agent.id && !saveState ? "agl-arriving" : "",
                  saveState?.id === agent.id ? `sv-${saveState.phase}` : "",
                ].filter(Boolean).join(" ") || undefined}
                agent={agent}
                queries={queries}
                manuscripts={manuscripts}
                activities={activities}
                onEdit={onEdit}
                onLogQuery={onLogQuery}
                flipped={!isMobile && flippedId === agent.id && saveState?.id !== agent.id}
                editor={!isMobile ? editorFor(agent) : null}
              />
  );

  return (
    <div className={`aglist${loadAnim ? " agl-anim" : ""}`} ref={rootRef}>
      {/* THE MOBILE EDITOR PUSH (baked decisions 5 + 6) — in flow, replacing the list; the
          .aglist root keeps scrolling, the shell bar carries Done/Cancel, the tab bar stands
          down. The SAME editor element the card back would host — one draft, one commit. */}
      {mobilePushOpen && pushAgent && (
        <div className="agl-mpush">{editorFor(pushAgent)}</div>
      )}
      <div className={`agl-page${mobilePushOpen ? " agl-mpushed" : ""}`}>
       {/* The content column: padding rides the page, the CAP rides here, so a wide monitor
           pools its surplus as symmetric margin rather than stretching the grid. */}
       {/* ⚠️ THE CHROME IS OUT OF THE SCROLLER (amendment 9). The plate and the toolbar are ROWS 1
           AND 2 of a grid whose row 3 is the only thing that scrolls, so they are pinned by
           CONSTRUCTION — no `position: sticky`, no `top` offset, no number to compute and therefore
           none to get wrong. The sticky arrangement they replace encoded another element’s height
           as a literal and was silently wrong by 32px on the Tasks family, which never condenses.
           ⚠️ THE CAP MOVED TO THE GRID ROOT, and that is what aligns the three rows: plate, toolbar
           and cards are one column wide BY CONSTRUCTION rather than by three rules agreeing.
           `.agl-inner` survives as a plain wrapper inside the scroller. */}
       <WorkspacePageGrid
         className="agl-wpg"
         scrollLabel="Agent list"
         plate={
           <PageHeader
            variant="workspace"
            mark="contacts"
            title="Contact list"
            description="Everyone you're querying, watching, or saving for later."
            actions={[{ label: "Add new agent", icon: <Plus aria-hidden="true" />, onClick: onAddAgent, primary: true }]}
           />
         }
         toolbar={
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
         }
       >
        <div className="agl-inner">

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
        {/* The notice sits BENEATH the grid and persists until dismissed or superseded — a card
            that travelled off-screen, or left because it no longer matches the filters, would
            otherwise simply have vanished. It rises in with the same shared vocabulary. */}
        {notice && (
          <div className={`agl-notice${prefersReducedMotion() ? "" : " agl-notice-in"}`} role="status">
            <span className="txt">{notice.text}</span>
            {notice.kind === "filtered-out" ? (
              <button
                type="button"
                className="act"
                onClick={() => {
                  setFilters(emptyFilterSet());
                  setSearch("");
                  setNotice(null);
                  // let the cleared list render, then bring the card into view
                  window.setTimeout(() => {
                    document
                      .querySelector(`[data-agent-card="${notice.agentId}"]`)
                      ?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
                  }, 0);
                }}
              >
                Show all agents
              </button>
            ) : notice.canUndo ? (
              <button type="button" className="act" onClick={() => void undoSave()}>
                Undo
              </button>
            ) : null}
            <button type="button" className="dismiss" aria-label="Dismiss" onClick={() => setNotice(null)}>
              ✕
            </button>
          </div>
        )}
       </div>
       </WorkspacePageGrid>
      </div>
    </div>
  );
};
