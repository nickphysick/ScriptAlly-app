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
  isDoorOpen,
  contactListState,
  matchesAgentSearch,
} from "../../lib/agentList";
import { prefersReducedMotion } from "../../lib/agentMotion";
import { BUMP_MS, EXIT_MS, SAVE_BREATH_MS, SAVE_FADE_IN_MS, SAVE_FADE_OUT_MS } from "../../lib/agentMotion";
import { SaveOutcome, saveNotice } from "../../lib/agentSaveOutcome";
import { FlipRects, clearFlip, measureFlip, playFlip } from "../../lib/flip";
import { ContactListEmptyState } from "./ContactListEmptyState";

import { AgentDrawer } from "./AgentDrawer";
import { useFixedMenu } from "../forms/useFixedMenu";
import { ContactRail } from "./contact/ContactRail";
import { ContactHero, CountCards } from "./contact/ContactHero";
import {
  ContactCardKey, ContactFilters, GroupKey, SORT_OPTIONS, STAND_LABEL, SortKey as ContactSortKey, agentFacts,
  contactCensus, contactFilterCount, contactGroups, emptyContactFilters, facetOptions, heroFacts,
  matchesCards, matchesContactFilters, sortFacts,
} from "../../lib/contactList";
import { isGenreMatch } from "../../lib/genreMatch";
import { ContactControls } from "./contact/ContactControls";
import { ContactRows } from "./contact/ContactRows";
import { BarChip, ContactBar } from "./contact/ContactBar";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import "./contact/contactV11.css";
import { RAIL_GROUPS } from "../shell/railNav";
import { countryName } from "../../lib/territory";
import { matchGenre } from "../../lib/genreMatch";
import { blankDraft } from "../../lib/agentDraft";
import { useMobileChrome } from "../shell/mobileChrome";

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
  /** the LIST column's box — what the floating bar centres on (§5.4) */
  const mainColRef = useRef<HTMLDivElement>(null);
  // The positions captured just BEFORE a change that reflows the list. Consumed once, by the
  // layout effect below, on the very next render. (The FLIP survives the grid→rows move: the
  // rows carry `data-agent-card`, flip.ts's own default selector.)
  const flipBefore = useRef<FlipRects | null>(null);
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
  const factsById = useMemo(() => {
    const m = new Map(visibleFacts.map((x) => [x.agent.id, x]));
    /* the unsaved new agent rides at the FRONT of the first group, immune to filter and sort */
    if (newAgent) m.set(newAgent.id, agentFacts(newAgent, qcRows, scoped?.id ?? null));
    return m;
  }, [visibleFacts, newAgent, qcRows, scoped]);
  const shownGroups = useMemo(() => {
    if (!newAgent) return groups;
    if (groups.length === 0) return [{ label: "All agents", ids: [newAgent.id] }];
    return [{ ...groups[0], ids: [newAgent.id, ...groups[0].ids] }, ...groups.slice(1)];
  }, [groups, newAgent]);
  const visible = visibleFacts;
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
    adding: !!newAgent,
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


  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [tab, setTab] = useState<AgentEditorTab>("contact");
  const [error, setError] = useState<DraftError | null>(null);
  // ONE notes listener, for the OPEN card only — never one per card in the grid.
  const [storedNotes, setStoredNotes] = useState<AgentNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);

  /** Clear the editor state. Separated from the exit MOTION below so a save (which has its own
   *  three-beat choreography) and a discard (which reverses) can share the teardown. */
  const clearEditor = useCallback(() => {
    setOpenId(null);
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
    const departing = newAgent?.id && openId === newAgent.id ? newAgent.id : null;
    clearEditor();
    if (!departing) return setNewAgent(null);

    if (prefersReducedMotion()) {
      setNewAgent(null);
      return;
    }
    window.setTimeout(() => {
      // measure with the leaving card STILL in place, so the survivors' "before" is honest
      flipBefore.current = measureFlip(gridRef.current);
      setNewAgent(null);
    }, EXIT_MS);
  }, [clearEditor, newAgent, openId]);

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
          if (outcome.kind === "filtered-out") {
            window.setTimeout(() => {
              flipBefore.current = measureFlip(gridRef.current);
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
    [agents, filters, search, sortKey, genreHitFact, nowMs, qcRows, scoped, factsById, inPool, clearEditor],
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

  /**
   * OPEN the drawer on this agent, READ by default. The tab is reset to Contact because opening a
   * different agent on whichever tab you last used states a fact about them you did not ask for.
   */
  const onOpen = useCallback((agentId: string, at: AgentEditorTab = "contact") => {
    if (!agents.some((a) => a.id === agentId)) return;
    setOpenId(agentId);
    setTab(at);
    setDraft(null);
    setError(null);
  }, [agents]);

  /**
   * ENTER EDIT — the draft is created here and nowhere else, so `draft !== null` IS the edit
   * session and the two can never disagree about which mode the drawer is in.
   */
  const onEdit = useCallback(
    (agentId: string, at: AgentEditorTab = "contact") => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;
      setOpenId(agentId);
      setDraft(draftFromAgent(agent));
      setTab(at);
      setError(null);
    },
    [agents],
  );

  



  /** Leave edit and return to READ — the drawer stays open on the same agent. */
  const cancelEdit = useCallback(() => { setDraft(null); setError(null); }, []);

  /**
   * ⚠️ LEAVING EDIT MEANS TWO DIFFERENT THINGS, AND THE DIFFERENCE IS WHETHER THERE IS ANYTHING
   * TO GO BACK TO. Discarding an edit to an EXISTING agent returns to the read view — the record
   * is still there and you were only changing it. Discarding an UNSAVED NEW agent has no read
   * state to return to: nothing has been written, so the honest outcome is that the drawer closes
   * and the draft card leaves with its own exit motion.
   *
   * Both are wired to ONE expression so the Escape key and the form's own Discard cannot disagree
   * about which of the two just happened.
   */
  const leaveEdit = useCallback(() => {
    if (newAgent && openId === newAgent.id) { discard(); return; }
    cancelEdit();
  }, [newAgent, openId, discard, cancelEdit]);

  // What the Notes pane shows: stored minus buffered deletions, plus buffered additions, with the
  // legacy flat note as the oldest bubble until it migrates.
  const openAgent = openId ? agents.find((a) => a.id === openId) ?? null : null;
  const visibleNotes = draft
    ? effectiveNotes(storedNotes, draft.notes, { flatNote: openAgent?.notes, dateAdded: openAgent?.dateAdded })
    : [];

  /* ⚠️ THE MOBILE PUSH IS RETIRED (Phase 4). Below md the card still does not rotate — that is
     unchanged and is baked decision 6 — but what opens is the DRAWER at full bleed, not a
     full-screen editor in flow that replaced the list. One editor host at every width.

     The scroll-restore machinery went with it and did not need replacing: the push HID `.aglist`,
     which clamped its scrollTop to 0, so the position had to be saved and put back by hand. A
     drawer overlays the list instead, so the scroller is never hidden and never clamped, and the
     reader's place is kept by the browser rather than by us. Removing a mechanism beats keeping
     one correct. */
  const { setMobileDetail } = useMobileChrome();
  const rootRef = useRef<HTMLDivElement>(null);

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
      ? null
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
  // 3. Nothing focused → leave EDIT and return to READ. It does not close the drawer: SlideOver
  //    has its own Escape and does not capture, so one press steps out of the form and a second
  //    closes the record. Stepping straight from a half-typed form to a closed drawer is two
  //    dismissals for one key.
  useEffect(() => {
    if (!draft) return;
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
      leaveEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, leaveEdit]);

  // A row that scrolls out of the filtered set takes its draft with it. Checked against the
  // RENDERED map, not `visible` — the unsaved new agent rides only there, and checking `visible`
  // would discard a brand-new record the instant it opened.
  useEffect(() => {
    if (openId && !factsById.has(openId)) discard();
  }, [factsById, openId, discard]);

  /* ⚠️ THE MOBILE EDITOR PUSH IS RETIRED (Phase 4), AND ITS SHELL REGISTRATION WITH IT. Below md
     the card used to render the SAME editor element full-screen in flow, replacing the list, with
     Done/Cancel borrowed from the shell bar through `MobileDetailSpec`. The drawer does that job
     now — `SlideOver` goes full-bleed below md through its own opt-in prop — so there is ONE
     editor host on every width instead of two that had to be kept in step. The spec seam itself
     is untouched and still serves the query detail; only this page's editor registration is gone.

     The list's scroll no longer needs saving: the drawer overlays the list rather than replacing
     it, so `.aglist` is never hidden and its scrollTop is never clamped. */
  useEffect(() => () => setMobileDetail("agents", null), [setMobileDetail]);

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
    setFilters(emptyContactFilters());
    setCardSel(new Set());
    setSearch("");
    // FIRST + settle: where is everything now? Measured BEFORE the insert, so the cards about to
    // be displaced can be sent back to their old places and released into the bump.
    flipBefore.current = measureFlip(gridRef.current);
    setNewAgent(stub);
    setOpenId(id);
    setDraft(blankDraft(id));
    setTab("contact");
    setError(null);
  };
  const onLogQuery = (agent: { id: string }) => onNavigate?.("queries", "Log a query", { agentId: agent.id });

  /* ⚠️ THE DRAWER'S SUBJECT INCLUDES AN UNSAVED NEW AGENT, which is not in `agents` yet — a
     draft-only record lives in `newAgent` until Done validates it, and looking it up in the store
     would open the drawer on nothing. */
  const drawerAgent = openAgent ?? (newAgent && openId === newAgent.id ? newAgent : null);
  /* ⚠️ THE STEP ORDER IS `shown` — the list's OWN order, filtered, sorted and grouped as the
     reader sees it. Stepping through the underlying store instead would walk agents that are not
     on screen, which is a different list wearing the same chevrons. -1 when the drawer's agent is
     not in it (an unsaved new record), and both chevrons are then disabled by construction. */
  const stepOrder = useMemo(
    () => shownGroups.flatMap((g) => g.ids),
    [shownGroups],
  );
  const drawerIndex = openId ? stepOrder.indexOf(openId) : -1;


  /** ONE editor element builder, shared by the card back face (desktop flip) and the mobile
   *  push host — a second copy would drift the moment the editor gains a prop. */
  const editorFor = (agent: Agent) =>
    draft && openId === agent.id ? (
                    <AgentEditor
                      draft={draft}
                      onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
                      tab={tab}
                      onTab={setTab}
                      onDone={() => void onDone()}
                      onDiscard={leaveEdit}
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

  return (
    <div className="aglist" ref={rootRef}>
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
            addOpen={!!newAgent}
            onAdd={onAddAgent}
            onPasteAdd={onAddAgent}
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
          {visible.length === 0 && !newAgent ? (
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
              onOpen={onOpen}
              onLogQuery={(id) => onLogQuery({ id })}
              onAddGenres={(id) => onEdit(id, "wishlist")}
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


      {/* ⚠️ ONE DRAWER, OUTSIDE THE GRID, and it is the shared `SlideOver` rather than a fourth
          private one. It hosts the editor so the DRAFT OUTLIVES A TAB SWITCH — the tabs are a view
          onto one buffer, not four forms, and a draft owned by the drawer would be created fresh
          each time the tab changed. */}
      <AgentDrawer
        agent={drawerAgent}
        open={!!drawerAgent}
        tab={tab}
        onTab={setTab}
        editing={!!draft}
        onEdit={() => { if (drawerAgent) onEdit(drawerAgent.id, tab); }}
        onClose={discard}
        onStep={(d) => {
          const i = drawerIndex;
          if (i < 0) return;
          const next = stepOrder[i + d];
          if (next) onOpen(next, tab);
        }}
        canStepBack={drawerIndex > 0}
        canStepOn={drawerIndex >= 0 && drawerIndex < stepOrder.length - 1}
        position={drawerIndex >= 0 ? { index: drawerIndex, total: stepOrder.length } : null}
        matchGenre={tintGenre}
        editor={drawerAgent ? editorFor(drawerAgent) : null}
        onLogQuery={onLogQuery}
      />
    </div>
  );
};
