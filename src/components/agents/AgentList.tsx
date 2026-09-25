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
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { useScriptAllyDb } from "../../lib/db";
import { collection, deleteDoc, deleteField, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import {
  AgentNote, committedNotes, computeNotePreview, effectiveNotes, emptyNotesDraft,
} from "../../lib/agentNotes";
import { Agent, SubmissionMethod, SubmissionStatus } from "../../types";
import { agentRelationship } from "../../lib/agentList";
import {
  isDoorOpen,
  contactListState,
  matchesAgentSearch,
} from "../../lib/agentList";
import { prefersReducedMotion } from "../../lib/agentMotion";
import { BUMP_MS } from "../../lib/agentMotion";
import { SaveOutcome, saveNotice } from "../../lib/agentSaveOutcome";
import { FlipRects, clearFlip, measureFlip, playFlip } from "../../lib/flip";
import { ContactListEmptyState } from "./ContactListEmptyState";

import { useFixedMenu } from "../forms/useFixedMenu";
import { ContactRail } from "./contact/ContactRail";
import { ContactProfile } from "./contact/ContactProfile";
import { ContactAddCard } from "./contact/ContactAddCard";
import type { FormSection } from "./contact/ContactAgentForm";
import { AlsoNote, ContactDraft, EditCtx, draftFromAgentRecord, savedLine as savedLineFor } from "../../lib/contactEdit";
import { AgentEditPatch, commitAgentEdits } from "../../lib/saveAgentEdits";
import { computeAgentDeadlineWrites } from "../../lib/computeAgentDeadlineWrites";
import { useNavigate } from "react-router-dom";
import { ContactHero, CountCards } from "./contact/ContactHero";
import {
  ContactCardKey, ContactFilters, GroupKey, SORT_OPTIONS, STAND_LABEL, SortKey as ContactSortKey, agentFacts,
  contactCensus, contactFilterCount, contactGroups, emptyContactFilters, facetOptions, heroFacts,
  matchesCards, matchesContactFilters, sortFacts,
} from "../../lib/contactList";
import { isGenreMatch } from "../../lib/genreMatch";
import { ContactControls } from "./contact/ContactControls";
import { ContactRows } from "./contact/ContactRows";
import { normaliseSubmissionsUrl } from "../../lib/quickAdd";
import { BarChip, ContactBar } from "./contact/ContactBar";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import "./contact/contactV11.css";
import { RAIL_GROUPS } from "../shell/railNav";
import { countryName } from "../../lib/territory";
import { matchGenre } from "../../lib/genreMatch";

/** The shared manuscript-scope key — the same one Packages, Comps and Manuscripts read. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
import "./agentList.css";

/**
 * ⚠️ THE DISCOVER DESTINATION COMES FROM THE RAIL'S OWN TABLE, NOT FROM A PAIR OF STRINGS TYPED
 * HERE. `handleNavigate("agents", "Discover new agents")` is the bridge App.tsx maps to
 * `/agents/discover`, and `railNav` already names that pair for the rail entry — so reading it
 * is one destination in one place rather than two that agree until somebody renames a sub-page.
 */
const DISCOVER = RAIL_GROUPS.flatMap((g) => g.items).find((i) => i.path === "/agents/discover");

interface AgentListProps {
  /** A global search landing on this route seeds the page filter. */
  searchQuery?: string;
  /** App's navigate bridge — opts.agentId preselects the Log-a-Query agent. */
  onNavigate?: (tab: string, subPageName?: string, opts?: { agentId?: string }) => void;
  /** True while `/agents` is the visible route — the one-shot reveal keys on it; see below. */
  active?: boolean;
}

export const AgentList: React.FC<AgentListProps> = ({ searchQuery, onNavigate, active = true }) => {
  const navigate = useNavigate();
  const { agents, queries, manuscripts, activities, updateAgent, addAgent, currentUser, collectionsReady } =
    useScriptAllyDb();

  /* ⚠️ THE MANUSCRIPT IS THE SWITCHER'S OWN (v11 §10) — the SAME resolver the shell's chip
     reads (`resolveScopedManuscript`: the stored id, else the most recently created), through
     the SAME storage key. The page's earlier only-one fallback returned null beside a switcher
     visibly showing a book — two notions of "current" three inches apart, caught on the P2
     screenshot when the facts sentence dropped its clause. */
  const scoped = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
  }, [manuscripts]);
  /* ⚠️ ONE READING OF THE SCOPE, TWO CONSUMERS. The chips tint through `matchGenre` and the
     count cards through the same value, so a card can never count an agent whose chip is not
     tinted. */
  const tintGenre = useMemo(() => matchGenre(scoped?.genre), [scoped]);

  /* ⚠️ THE QUERY CENTRE'S OWN ROWS — one derivation for courts, expected dates and past-the-date,
     so this page and the QC cannot disagree (v11 §10). The clock freezes per data change. */
  const qcRows = useMemo(() => buildQcRows(queries, agents, activities, Date.now()), [queries, agents, activities]);
  /* ⚠️ TOTALS, NEVER THE FILTERED VIEW — over `agents`, not `visible` (the house tile law). */
  const census = useMemo(() => contactCensus(agents, qcRows, scoped?.id ?? null), [agents, qcRows, scoped]);
  const facts = useMemo(() => heroFacts(agents, census.standing, scoped), [agents, census, scoped]);
  /* the count cards are a multi-select OR (v11 §3.3); the floating bar spells them out in P3 */
  const [cardSel, setCardSel] = useState<ReadonlySet<ContactCardKey>>(new Set());
  const toggleCard = useCallback((k: ContactCardKey) => {
    setCardSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }, []);
  /* the hero publishes its stacked flag — below 760 the count cards leave it for the list's top */
  const [heroStacked, setHeroStacked] = useState(false);

  const [filters, setFilters] = useState<ContactFilters>(emptyContactFilters);
  const [search, setSearch] = useState(searchQuery?.trim() || "");
  const [groupKey, setGroupKey] = useState<GroupKey>("stand");
  const [sortKey, setSortKey] = useState<ContactSortKey>("due");

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
  /** the LIST column's box — what the floating bar centres on (§5.4) */
  const mainColRef = useRef<HTMLDivElement>(null);
  // The positions captured just BEFORE a change that reflows the list. Consumed once, by the
  // layout effect below, on the very next render. (The FLIP survives the grid→rows move: the
  // rows carry `data-agent-card`, flip.ts's own default selector.)
  const flipBefore = useRef<FlipRects | null>(null);
  /** The saved card's beat, and the inline notice that outlives the motion. */
  const [notice, setNotice] = useState<{
    text: string; kind: "travel" | "filtered-out"; agentId: string; canUndo: boolean;
  } | null>(null);
  /** Which section the card sat in before the save — read once the outcome is computed. */
  const sectionBeforeSave = useRef<string | null>(null);
  /** The agent exactly as it was before the last save, so Undo can put it back. Null for a card
   *  that was CREATED by the save — there is no previous version to restore. */
  const undoSnapshot = useRef<Agent | null>(null);

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


  /* ⚠️ THE ONE-SHOT REVEAL (board fixes II, P1). The To-do board's ⋯ menu offers "View the
     agent"; this is the receiving end. sessionStorage rather than a route param, deliberately:
     a reveal is a GESTURE, not an address — it must not survive the tab, must not enter history,
     and must fire exactly once (the key is cleared the moment it is read). Same scroll mechanics
     as the new-agent land above; an id that no longer exists simply clears and does nothing. */
  /**
   * ⚠️ IT KEYS ON `active`, AND WITHOUT THAT IT HAS BEEN DEAD (found by measurement, workspace
   * round, Phase 5 — a PRE-EXISTING fault this round surfaced rather than caused).
   *
   * `StagePage` toggles DISPLAY and keeps every workspace page mounted, so this component has long
   * since mounted and `agents.length` has long since settled by the time anyone writes the key.
   * Keyed on the count alone the effect fired ONCE, on first load, with nothing to read — and never
   * again. So the ⋯ menu's "View agent" set the key, navigated, and landed at the top of the list
   * with the key still in sessionStorage. `Agents` has ACCEPTED an `active` prop this whole time
   * and threw it away; it is threaded now, which is what makes "the page arrived" observable.
   */
  useLayoutEffect(() => {
    if (!active) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem("sa.agentReveal"); } catch { /* private mode */ }
    if (!id || agents.length === 0) return;        // hold the key until the list can answer
    try { sessionStorage.removeItem("sa.agentReveal"); } catch { /* private mode */ }
    if (!agents.some((a) => a.id === id)) return;  // stale id — consumed, nothing to show
    const card = document.querySelector<HTMLElement>(`[data-agent-card="${id}"]`);
    card?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, agents.length]);

  // Both axes counted over the WHOLE list — a filter row must state what it would reveal, so it
  // can never read from the already-filtered view.
  /**
   * ⚠️ THE PIPELINE (v11 §5): facts once per agent off the QC's rows; the POOL (count cards +
   * Find) and the six filter sections narrow; ONE sort orders; grouping PARTITIONS the ordered
   * list — never a second ordering pass that could disagree.
   */
  const nowMs = useMemo(() => Date.now(), [qcRows]);
  const factsAll = useMemo(
    () => agents.map((a) => agentFacts(a, qcRows, scoped?.id ?? null)),
    [agents, qcRows, scoped],
  );
  const genreHitFact = useCallback(
    (x: { genres: string[] }) => !!tintGenre && x.genres.some((g) => isGenreMatch(g, tintGenre)),
    [tintGenre],
  );
  const inPool = useCallback(
    (x: { agent: Agent; stand: string }) =>
      matchesAgentSearch(x.agent, search)
      && matchesCards(cardSel, census.standing.get(x.agent.id) ?? { kind: "none" }),
    [search, cardSel, census],
  );
  const filterOptions = useMemo(() => facetOptions(factsAll, filters, inPool), [factsAll, filters, inPool]);
  const visibleFacts = useMemo(
    () => sortFacts(
      factsAll.filter((x) => inPool(x) && matchesContactFilters(x, filters)),
      sortKey, genreHitFact, nowMs,
    ),
    [factsAll, inPool, filters, sortKey, genreHitFact, nowMs],
  );
  const groups = useMemo(() => contactGroups(groupKey, visibleFacts), [groupKey, visibleFacts]);
  const factsById = useMemo(
    () => new Map(visibleFacts.map((x) => [x.agent.id, x])),
    [visibleFacts],
  );
  const shownGroups = groups;
  const visible = visibleFacts;
  /** every genre already on the writer's list, most-used first (§8.2's options) */
  const genrePool = useMemo(() => {
    const freq = new Map<string, number>();
    for (const a of agents) for (const g of a.genres ?? []) freq.set(g, (freq.get(g) ?? 0) + 1);
    return [...freq.entries()].sort((x, y) => y[1] - x[1]).map(([g]) => g);
  }, [agents]);
  const editCtx: EditCtx = useMemo(
    () => ({ queries, agents, msGenre: scoped?.genre ?? null, msTitle: scoped?.title ?? null, nowMs }),
    [queries, agents, scoped, nowMs],
  );
  const anyActive =
    contactFilterCount(filters) > 0 || cardSel.size > 0 || search.trim() !== ""
    || groupKey !== "stand" || sortKey !== "due";
  const CARD_NAME: Record<ContactCardKey, string> = { active: "Active queries", never: "Never queried", closed: "Query closed" };
  const barChips: BarChip[] = useMemo(() => {
    const chips: BarChip[] = [];
    for (const k of cardSel) chips.push({
      key: `card-${k}`, label: "Showing", value: CARD_NAME[k],
      onRemove: () => toggleCard(k),
    });
    const drop = <S extends keyof ContactFilters>(section: S, label: string, value: ContactFilters[S][number], shown?: string) =>
      chips.push({
        key: `${section}-${String(value)}`, label, value: shown ?? String(value),
        onRemove: () => setFilters((f) => ({ ...f, [section]: (f[section] as unknown[]).filter((v) => v !== value) }) as ContactFilters),
      });
    for (const v of filters.stand) drop("stand", "Standing", v, STAND_LABEL[v]);
    for (const v of filters.genres) drop("genres", "Genre", v);
    for (const v of filters.door) drop("door", "Queries", v, v === "open" ? "Open" : "Closed");
    for (const v of filters.locs) drop("locs", "Location", v);
    for (const v of filters.status) drop("status", "Status", v);
    for (const v of filters.rating) drop("rating", "Rating", v, v === 0 ? "Unrated" : "★".repeat(v));
    if (search.trim()) chips.push({ key: "find", label: "Name has", value: search.trim(), onRemove: () => setSearch("") });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardSel, filters, search, toggleCard]);

  const resetList = useCallback(() => {
    setFilters(emptyContactFilters());
    setCardSel(new Set());
    setSearch("");
    setGroupKey("stand");
    setSortKey("due");
  }, []);

  /**
   * Loading · blank account · list — the page's three states, derived once in `agentList.ts` and
   * never restated here. See `contactListState` for why there are three of them and why the
   * unsaved stub is one of its inputs.
   */
  const pageState = contactListState({
    collectionsReady,
    agentCount: agents.length,
    adding: false, /* the in-grid draft retired with the flip editor; P5's add card is an overlay */
  });

  /* ⚠️ THE GRID DOES NOT GROUP, AND ITS GROUPING IS RETIRED RATHER THAN LEFT FROZEN (Phase 7).
     Grouping arranges the BOARD — the pack's own division — so when the Group control moved to the
     board this page's `grouping` state kept its initial "none" and `setGrouping` was never called
     again: a section renderer that could not be reached, running `groupAgents` on every render to
     produce an empty array. A frozen control is worse than a deleted one, because it reads as a
     feature to whoever finds it next. */


  // ── Flip + buffered draft (decision 1) ────────────────────────────────────
  // ONE card is open at a time. Opening clones the agent into `draft`; every editor interaction
  // mutates the draft only; Done validates, diffs and commits a SINGLE updateAgent call; Escape
  // (or opening another card) discards it. Nothing here writes per keystroke.
  /* ⚠️ `openId` IS THE DRAWER'S AGENT, and it used to be `flippedId` — the card whose editor face
     was showing. The rename is the point rather than tidiness: the editor left the card in Phase
     4, so a name meaning "the flipped card" would have described a mechanism that no longer
     exists while driving one that does. The card's own flip is `peekId` now, and what it shows is
     the read-only contact peek. */
  const [openId, setOpenId] = useState<string | null>(null);

  /* ⚠️ THE VIEW SWITCH IS RETIRED (v11 decision 1) — one page, one renderer, as the Query
     Centre. A `?view=` parameter in the URL is ACCEPTED AND IGNORED: nothing reads it, nothing
     clears it, and a bookmarked `?view=board` lands on the one list rather than erroring
     (`readQcView` is the precedent). Grid/List/Board and their model went with the switch. */


  /** The pop-up's session: which agent, whether it opened straight into edit at a section, and
   *  the sage line the view returns with after a save. The DRAFT lives inside ContactProfile —
   *  the overlay is outside the list, so a list re-render cannot touch it (§7.1). */
  const [editAt, setEditAt] = useState<FormSection | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  // ONE notes listener, for the OPEN profile only — never one per row.
  const [storedNotes, setStoredNotes] = useState<AgentNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);

  const clearEditor = useCallback(() => {
    setOpenId(null);
    setEditAt(null);
    setSavedNote(null);
    setStoredNotes([]);
    setNotesLoaded(false);
  }, []);

  const discard = clearEditor;

  /**
   * The SAVE NOTICE (v11 P4). The three-beat card choreography retired with the flip card it
   * animated; what survives is the sentence — where the record ended up — computed BEFORE
   * anything else so the notice and the list cannot disagree (the agentMotion law).
   */
  const beginSaveChoreography = useCallback(
    (saved: Agent) => {
      /* the outcome, against the NEW pipeline (the old saveOutcome read the retired filter set):
         does the saved record still match the pool and the panel, and where does it land */
      const savedFacts = agentFacts(saved, qcRows, scoped?.id ?? null);
      const survives = inPool(savedFacts) && matchesContactFilters(savedFacts, filters);
      const afterAll = [...agents.filter((a) => a.id !== saved.id), saved]
        .map((a) => (a.id === saved.id ? savedFacts : (factsById.get(a.id) ?? agentFacts(a, qcRows, scoped?.id ?? null))));
      const after = sortFacts(
        afterAll.filter((x) => inPool(x) && matchesContactFilters(x, filters)),
        sortKey, genreHitFact, nowMs,
      );
      const index = after.findIndex((x) => x.agent.id === saved.id);
      const outcome: SaveOutcome = !survives
        ? { kind: "filtered-out" }
        : { kind: "travel", index: index < 0 ? 0 : index + 1, total: after.length,
            sortLabel: (SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "the current sort") };
      setNotice({
        text: saveNotice(saved.name || saved.agency, outcome),
        kind: outcome.kind,
        agentId: saved.id,
        // Undo restores a PREVIOUS version; a save that created an agent has none, and undoing it
        // would mean deletion — which this page deliberately has no affordance for.
        canUndo: !!undoSnapshot.current,
      });

      /* the list reflows under the store's own update — measure BEFORE it lands so the FLIP
         can play the move (rows carry data-agent-card, flip.ts's selector) */
      flipBefore.current = measureFlip(gridRef.current);
    },
    [agents, filters, sortKey, genreHitFact, nowMs, qcRows, scoped, factsById, inPool],
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
    if (!openId || !currentUser) return;
    const ref = collection(db, "users", currentUser.id, "agents", openId, "notes");
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
      (e) => handleFirestoreError(e, OperationType.LIST, `users/${currentUser.id}/agents/${openId}/notes`),
    );
    return () => unsub();
  }, [openId, currentUser?.id]);

  /** OPEN the profile on this agent — reading, from the top (v11 §7.1). */
  const onOpen = useCallback((agentId: string) => {
    if (!agents.some((a) => a.id === agentId)) return;
    setOpenId(agentId);
    setEditAt(null);
    setSavedNote(null);
  }, [agents]);

  /** OPEN straight into edit at a section — a torn slip's or Housekeeping's door (§7.1, §9.3). */
  const onEditAt = useCallback((agentId: string, at: FormSection) => {
    if (!agents.some((a) => a.id === agentId)) return;
    setOpenId(agentId);
    setEditAt(at);
    setSavedNote(null);
  }, [agents]);

  



  const openAgent = openId ? agents.find((a) => a.id === openId) ?? null : null;

  /* the profile's notes: committed only — the pop-up composes ADDITIONS one at a time (§7.2);
     the flat legacy note rides as the oldest bubble exactly as the old drawer showed it */
  const profileNotes = useMemo(
    () => committedNotes(effectiveNotes(storedNotes, emptyNotesDraft(), {
      flatNote: openAgent?.notes,
      dateAdded: openAgent?.dateAdded,
    })),
    [storedNotes, openAgent],
  );

  /**
   * SAVE from the pop-up (§7.3): diff the draft against the record, send ONLY what changed
   * through `commitAgentEdits` — sanitised, atomic, with the reply-time deadline fan-out riding
   * the same batch (`computeAgentDeadlineWrites`; the engine then moves the rows: "It never
   * writes a derived date"). A wishlist edit stamps `mswlCheckedAt` in the SAME write.
   */
  const onProfileSave = useCallback(async (d: ContactDraft, notes: AlsoNote[]): Promise<boolean> => {
    const orig = openId ? agents.find((a) => a.id === openId) : null;
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
    /* the pre-save record, so the notice's Undo can put it back in ONE write (the old law) */
    undoSnapshot.current = { ...orig };
    const res = await commitAgentEdits(db, currentUser.id, orig.id, patch, extras);
    if (!res.ok) {
      /* strictNullChecks is off, so the boolean discriminant does not narrow (the house rule) */
      setNotice({ text: (res as { ok: false; error: string }).error, kind: "travel", agentId: orig.id, canUndo: false });
      return false;
    }
    setSavedNote(savedLineFor(notes));
    /* the row may change group or leave the filtered view — expected; the notice says where */
    const saved = { ...orig } as Agent;
    beginSaveChoreography(Object.assign(saved, patch as Partial<Agent>));
    return true;
  }, [openId, agents, currentUser, queries, beginSaveChoreography]);

  /** Add ONE note from the pop-up — the subcollection write plus the documented cache, together. */
  const onAddNote = useCallback(async (text: string) => {
    const orig = openId ? agents.find((a) => a.id === openId) : null;
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
  }, [openId, agents, currentUser, storedNotes]);

  // A row that scrolls out of the filtered set takes its draft with it. Checked against the
  // RENDERED map, not `visible` — the unsaved new agent rides only there, and checking `visible`
  // would discard a brand-new record the instant it opened.
  useEffect(() => {
    if (openId && !factsById.has(openId)) discard();
  }, [factsById, openId, discard]);


  /* ── adding an agent (v11 §8) ─────────────────────────────────────────────────────────────
     The centred add card, portalled like the pop-up. `adding` carries WHICH field opens focused
     — the hero card's body asks for the name, its paste strip for the link (§3.4) — and the
     app-level "Add an agent" capture reaches here through the `sa:contact-add` event App.tsx
     dispatches on /agents (ruling f): elsewhere the old focus form is untouched. */
  const [adding, setAdding] = useState<null | "name" | "link">(null);
  /* the just-added agent — its row scrolls into view centred and wears the 2.4s ring (§8.4) */
  const [newId, setNewId] = useState<string | null>(null);
  const onAddAgent = () => setAdding("name");
  const onLogQuery = (agent: { id: string }) => onNavigate?.("queries", "Log a query", { agentId: agent.id });

  useEffect(() => {
    if (!active) return;
    const open = () => setAdding("name");
    window.addEventListener("sa:contact-add", open);
    return () => window.removeEventListener("sa:contact-add", open);
  }, [active]);

  /**
   * The create — through the SAME `addAgent` path every other creator uses (free-tier cap,
   * AGENT_ADDED activity, undefined-stripping), with the v11 rules: optionals born ABSENT, the
   * link field saving to `website` through the scheme allowlist (§8.3 — the importer-shaped
   * path the allowlist's own docstring reserves itself for), `reopensOn` only when the door is
   * Closed, and `submissionMethod` defaulting to Email exactly as the app-level form does.
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
    setAdding(null);
    setNewId(res.id);
    return { ok: true as const };
  }, [addAgent]);

  /* §8.4: the new row into view, centred, once the store's own update has rendered it; the ring
     class rides `newId` and drops when the animation has had its 2.4s (reduced motion shows the
     ring statically for the same window — the CSS half). */
  useEffect(() => {
    if (!newId || !factsById.has(newId)) return;
    const row = document.querySelector<HTMLElement>(`[data-agent-card="${newId}"]`);
    row?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    const drop = window.setTimeout(() => setNewId(null), 2500);
    return () => window.clearTimeout(drop);
  }, [newId, factsById]);




  return (
    <div className="aglist">
      <div className="agl-page">
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
         scrollLabel="Contact list"
         /* ⚠️ THE PAGE OPTED OUT OF THE SHARED MASTHEAD (v11 §3; joins the Query Centre in the
            OPTED_OUT register). The hero below is the page's own head — title, facts sentence,
            count cards and the live add card over the Archivist — and the grid draws no chrome
            slab and no collapsed bar when the masthead is null. */
         masthead={null}
         /* ⚠️ NO `toolbar` SLOT ON AN OPTED-OUT PAGE. The grid's toolband is `position: sticky;
             top: var(--bar-h)` — written for pages whose masthead scrolls ahead of it. With the
             masthead null the band is the scroller's FIRST child, and sticky does not idle there,
             it CLAMPS (the house law): measured, the band rendered 44px below its flow slot and
             overlaid the hero's title at 1280. The interim controls render IN FLOW below the
             hero instead — which is also where the v11 header row lands in P3. */
       >
        <div className="agl-inner">
        {/* ⚠️ THE CENTRED GROUP (v11 §2): page column + the Housekeeping rail, the Query Centre's
            own discipline (`.qcv-group` is the precedent). The rail renders only over a LIST —
            a blank account's pitch and the settling beat are single-column, and a grid with an
            absent second child would hold a 340px hole open for nothing. */}
        <div className={pageState === "list" ? "clv-group" : undefined}>
        <div className={pageState === "list" ? "clv-main" : undefined} ref={mainColRef}>

        {/* ⚠️ THE BLANK ACCOUNT IS ITS OWN PAGE, NOT A DASHED BOX IN THE GRID. What it replaces —
            `.agl-empty`'s welcome branch — is DELETED rather than demoted: two doorways for one
            state is one of them to keep in step, and this one has three of the other's words in
            it. The filtered "No agents match." branch below survives and is now unreachable
            except with agents on file, which is the only way it was ever true.
            ⚠️ AND `settling` RENDERS NOTHING AT ALL. The alternative to a blank frame here is a
            skeleton, and this page has none to borrow; a beat of empty scroller is honest, where
            a first-run pitch shown to somebody with forty agents on file is not. */}
        {pageState === "blank" ? (
          <ContactListEmptyState
            onAddAgent={onAddAgent}
            /* the bridge App.tsx already maps to `/agents/discover` — not a second router call */
            onDiscover={() => DISCOVER && onNavigate?.(DISCOVER.tab, DISCOVER.sub)}
            /* ⚠️ THE SAME ROUTE EVERY OTHER SURFACE USES — `onNavigate("import")`, the bridge that
               also clears the global search query. The hero OMITS the link when this is absent
               rather than disabling it, so a page mounted without the bridge advertises no route
               it cannot take. */
            onImport={() => onNavigate?.("import")}
          />
        ) : pageState === "settling" ? null : (
        <>

        {/* Applied filters live OUTSIDE the popover — closing it must never hide what is
            filtering the list. Each tag removes its own value; "Clear all" empties the set. */}
        {/* ⚠️ THE HERO IS THE PAGE'S HEAD (v11 §3) — and it renders only over a LIST: the blank
            account's pitch is its own page, and a hero stating figures about nothing would be
            the empty-desk fault. The count cards ride inside it side-by-side and move to a row
            of three above the list when the hero stacks (§3.2). */}
        {pageState === "list" && (
          <ContactHero
            facts={facts}
            cards={census.cards}
            cardSel={cardSel}
            onToggleCard={toggleCard}
            addOpen={adding !== null}
            onAdd={() => setAdding("name")}
            onPasteAdd={() => setAdding("link")}
            onStacked={setHeroStacked}
            stacked={heroStacked}
          />
        )}
        {pageState === "list" && heroStacked && (
          <CountCards cards={census.cards} sel={cardSel} onToggle={toggleCard} row />
        )}
        {/* the v11 header row: Your agents · N of M, Find, Filter · Group · Sort · ↺ (§4–5) */}
        {pageState === "list" && (
          <ContactControls
            shownCount={visible.length}
            total={agents.length}
            find={search}
            onFind={setSearch}
            filters={filters}
            onFilters={setFilters}
            options={filterOptions}
            groupKey={groupKey}
            onGroup={setGroupKey}
            sortKey={sortKey}
            onSort={setSortKey}
            anyActive={anyActive}
            onReset={resetList}
          />
        )}

        {/* ⚠️ ONE SET OF AGENTS, ONE RENDERER (v11 decision 1) — grouped bands over rows. The
            FLIP container moved with the renderer: rows carry data-agent-card, flip.ts's own
            default selector, so a filter change still animates the reflow. */}
        {pageState === "list" && (
        <div ref={gridRef}>
          {visible.length === 0 ? (
            <div className="agl-empty">
              <div className="big">No agents match.</div>
              <div className="small">Loosen the filter, or clear the search.</div>
            </div>
          ) : (
            <ContactRows
              groups={shownGroups}
              byId={factsById}
              nowMs={nowMs}
              genreHit={(g) => !!tintGenre && isGenreMatch(g, tintGenre)}
              openId={openId}
              newId={newId}
              onOpen={onOpen}
              onLogQuery={(id) => onLogQuery({ id })}
              onAddGenres={(id) => onEditAt(id, "genres")}
            />
          )}
        </div>
        )}
        </>
        )}
        {/* the floating active-filter bar (§5.4): everything narrowing the list, spelled out */}
        {pageState === "list" && (
          <ContactBar
            anchor={mainColRef}
            onClearAll={resetList}
            chips={barChips}
          />
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
                  setFilters(emptyContactFilters());
                  setCardSel(new Set());
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
        {pageState === "list" && <ContactRail />}
        </div>
       </div>
       </WorkspacePageGrid>
      </div>


      {/* ⚠️ THE PROFILE IS AN OVERLAY OUTSIDE THE LIST (§7.1) — a list re-render never touches
          it, and it portals to document.body, where the `--clv-*` palette at :root reaches it. */}
      {adding && (
        <ContactAddCard
          focus={adding}
          agents={agents}
          msGenre={scoped?.genre ?? null}
          genrePool={genrePool}
          onClose={() => setAdding(null)}
          onCreate={onCreateAgent}
          onOpenAgent={(id) => { setAdding(null); onOpen(id); }}
        />
      )}
      {openAgent && (
        <ContactProfile
          agent={openAgent}
          facts={factsById.get(openAgent.id) ?? agentFacts(openAgent, qcRows, scoped?.id ?? null)}
          nowMs={nowMs}
          msGenre={scoped?.genre ?? null}
          msTitle={scoped?.title ?? null}
          genreHit={(g) => !!tintGenre && isGenreMatch(g, tintGenre)}
          genrePool={genrePool}
          editCtx={editCtx}
          notes={profileNotes}
          editAt={editAt}
          savedLine={savedNote}
          onClose={clearEditor}
          onSave={onProfileSave}
          onAddNote={onAddNote}
          onOpenQuery={(qid) => { clearEditor(); navigate(`/queries?q=${qid}`); }}
          onRecordResponse={() => { clearEditor(); onNavigate?.("queries", "Record a response"); }}
          onLogQuery={() => { const id = openAgent.id; clearEditor(); onLogQuery({ id }); }}
        />
      )}
    </div>
  );
};
