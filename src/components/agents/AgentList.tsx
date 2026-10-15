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
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { useScriptAllyDb } from "../../lib/db";
import { Agent } from "../../types";
import { agentRelationship } from "../../lib/agentList";
import {
  isDoorOpen,
  contactListState,
  matchesAgentSearch,
} from "../../lib/agentList";
import { prefersReducedMotion } from "../../lib/agentMotion";
import { reopenReminder } from "../../lib/agentCard";
import { BUMP_MS } from "../../lib/agentMotion";
import { SaveOutcome, saveNotice } from "../../lib/agentSaveOutcome";
import { FlipRects, clearFlip, measureFlip, playFlip } from "../../lib/flip";
import { ContactEmptyPage } from "./contact/ContactEmptyPage";
import { useLivingCountOverride } from "../../lib/livingHeaderReview";

import { useFixedMenu } from "../forms/useFixedMenu";
import { hkAllFilled } from "../../lib/hkReviewAid";
import { INTRO_PATH_V18, dismissPath, dismissedAtGaps, introSeenOf, listHealth, nextDismissed, tabShown } from "../../lib/contactHealth";
import { agentGapLine, hasPassedOn, hkModel, savedLine, wishlistCheckin, type HkAgentCtx, type HkBook, type HkItem } from "../../lib/contactHousekeeping";
import {
  contactPrefsOf, laterPath, readHkView, settledPath, settledRestorePath, showAllPath, wishlistEveryPath, wishlistNextPath,
  writeHkView, type HkView, type WishlistEvery,
} from "../../lib/contactPrefs";
import { type FixResult, type HkFix } from "./contact/ContactHousekeeping";
import { HousekeepingDrawer } from "./contact/HousekeepingDrawer";
import { health as healthOf } from "../../lib/listHealth";
import { applyPatch, cardPatch, draftOf, inversePatch, toContactDraft, type CardDraft } from "../../lib/cardDraft";
import { alsoChanges } from "../../lib/contactEdit";
import { commitCardSave } from "../../lib/agentCardSave";
import type { AgentEditPatch, SaveAgentResult } from "../../lib/saveAgentEdits";
import { commitAgentEdits } from "../../lib/saveAgentEdits";
import { db as firestoreDb } from "../../lib/firebase";
import { contactFilterCount, agentRows, GROUP_OPTIONS } from "../../lib/contactList";
import {
  AgentCardOptions, openAgentCard, openNewAgentCard, subscribeAgentCardEvents,
  useAgentCardRequest,
} from "../../lib/agentCardStore";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ContactLightHeader } from "./contact/ContactLightHeader";
import {
  type AgentFacts, ContactFilters, GroupKey, SORT_OPTIONS, SortKey as ContactSortKey, agentFacts,
  contactCensus, contactGroups, dropOptions, emptyContactFilters, facetCounts, genreTallies,
  letterCounts, matchesContactFilters, sortFacts,
} from "../../lib/contactList";
import { bookGenreHit, bookGenres } from "../../lib/genreMatch";
import { ContactRows } from "./contact/ContactRows";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { ContactFind, GroupMenu, type ContactPop } from "./contact/ContactListControls";
import { ContactFiltersButton, ContactFiltersPanel } from "./contact/ContactFilterStrip";
import { CountTo, useReflow } from "./contact/ContactTouches";
import { escapeDepth } from "../../lib/escapeStack";
import { usePopover } from "../shell/ListPills";
import { type Density, readListMemory, writeListMemory } from "../../lib/contactListMemory";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import "./contact/contactV11.css";
import "./contact/contactV13.css";
import "./contact/contactV14.css";
import { nextStep } from "../../lib/contactNextStep";
import { BLANK_GLANCE } from "./contact/ContactStrip";
import { LetterTabs } from "./contact/ContactLetters";
import { ContactPinnedRow, useContactPinned } from "./contact/ContactPinned";
import { AgentPanel, type AgentPanelTab } from "./panel/AgentPanel";
import type { PanelAct } from "../../lib/agentPanel";
import { firstNameOf } from "../../lib/agentPanel";
import { genreLabel } from "../../lib/genres";
import { destroyManifest } from "../../lib/cascade";
import { emitAgentCardEvent, closeAgentCard } from "../../lib/agentCardStore";
import { currentQueryPanel, openQueryPanelFromAgent, subscribeQueryPanel } from "../../lib/queryPanelStore";
import { glanceModel, glanceOf, type GlanceKey } from "../../lib/contactGlance";
import { useFullScreenList } from "../shell/useFullScreenList";
import { fitsGenre } from "../../lib/contactStrip";
import { joinGenres } from "../../lib/genreNoun";
import { cardQuery, cardRows, primaryFor, type CardAct, type CardPrimary } from "../../lib/agentCard";
import { CANONICAL_GENRES } from "../../lib/genres";
import { RAIL_GROUPS } from "../shell/railNav";
import { countryName } from "../../lib/territory";

/** The shared manuscript-scope key — the same one Packages, Comps and Manuscripts read. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
import { SHORTCUTS, isEditableTarget, matchesShortcut, shortcutLabel } from "../../lib/shortcuts";
import { AppFooter } from "../shell/AppFooter";
import { PageGuide } from "../shell/PageGuide";
import { useAgentsHold } from "../../lib/contactLoadHold";
import { useWindowCorner } from "../shell/useWindowCorner";
import { CONTACT_GUIDE, CONTACT_GUIDE_PAGE } from "./contact/contactGuide";
import { ContactSkeleton } from "./contact/ContactSkeleton";
import "./agentList.css";
import { floatInset } from "../shell/inkTokens";

/**
 * ⚠️ THE DISCOVER DESTINATION COMES FROM THE RAIL'S OWN TABLE, NOT FROM A PAIR OF STRINGS TYPED
 * HERE. `handleNavigate("agents", "Discover new agents")` is the bridge App.tsx maps to
 * `/agents/discover`, and `railNav` already names that pair for the rail entry — so reading it
 * is one destination in one place rather than two that agree until somebody renames a sub-page.
 */
/** v16 §E — the device key the shared full-screen hook remembers under (Comparable titles has its own) */
export const CONTACTS_FULL_KEY = "sa.contactsFull";

const DISCOVER = RAIL_GROUPS.flatMap((g) => g.items).find((i) => i.path === "/agents/discover");

interface AgentListProps {
  /** A global search landing on this route seeds the page filter. */
  searchQuery?: string;
  /** App's navigate bridge — opts.agentId preselects the Log-a-Query agent. */
  onNavigate?: (tab: string, subPageName?: string, opts?: { agentId?: string }) => void;
  /** True while `/agents` is the visible route — the one-shot reveal keys on it; see below. */
  active?: boolean;
  /** the dev lab's own writer (Agent card v1's sandbox) — Housekeeping's fixes write through it there */
  sandbox?: { writeAgent?: (agentId: string, patch: AgentEditPatch) => Promise<SaveAgentResult> };
}

export const AgentList: React.FC<AgentListProps> = ({ searchQuery, onNavigate, active = true, sandbox }) => {
  /* ⚠️ THE SWITCHER RE-OPENS THE ROUTE (page header v2 §4.5), so a switch is a new location KEY on
     the same path — and that key is what the scope reads on. Memoised on `manuscripts` alone, the
     page went on stating the old book's facts after the bar had changed book. */
  const { key: locationKey } = useLocation();
  const {
    agents, queries, manuscripts, activities, updateAgent, collectionsReady, userTasks, addUserTask, deleteUserTask, resolveTaskFlag,
    currentUser, updateUserPaths, taskFlags, deleteAgent,
  } = useScriptAllyDb();

  /* ⚠️ THE MANUSCRIPT IS THE SWITCHER'S OWN (v11 §10) — the SAME resolver the shell's chip
     reads (`resolveScopedManuscript`: the stored id, else the most recently created), through
     the SAME storage key. The page's earlier only-one fallback returned null beside a switcher
     visibly showing a book — two notions of "current" three inches apart, caught on the P2
     screenshot when the facts sentence dropped its clause. */
  const scoped = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the switch's signal
  }, [manuscripts, locationKey]);
  /* v14 (ruling Q5): THE BOOK'S GENRES — the main genre plus any subGenres — and ONE test of a genre
     against them. The strip, the section, the pills, "See all" and the row ticks all read these two. */
  const book = useMemo(() => bookGenres(scoped), [scoped]);
  const bookHit = useMemo(() => bookGenreHit(book), [book]);

  /* ⚠️ THE QUERY CENTRE'S OWN ROWS — one derivation for courts, expected dates and past-the-date,
     so this page and the QC cannot disagree (v11 §10). The clock freezes per data change. */
  const qcRows = useMemo(() => buildQcRows(queries, agents, activities, Date.now()), [queries, agents, activities]);
  /* ⚠️ TOTALS, NEVER THE FILTERED VIEW — over `agents`, not `visible` (the house tile law). */
  const census = useMemo(() => contactCensus(agents, qcRows, scoped?.id ?? null), [agents, qcRows, scoped]);
  /* ⚠️ THE COUNT CARDS LEFT WITH v12: the card index took the list mount (P2 — their pool
     narrowing, the cardSel state and the bar's "Showing" chips went with them), and P5's empty
     state took the exhibit's. `CountCards` is deleted; the strip indexes, it never filters. */
  const addBtnRef = useRef<HTMLButtonElement>(null);

  /* v13 §5 — REMEMBERED FOR THE VISIT: filters, search, grouping, sort and direction are read from
     sessionStorage (`sa.contactList`) on mount and written on every change, so a reload or a return
     to the page puts the list back as it was; a fresh session starts from the defaults. A search
     handed in from the shell wins over a remembered one. */
  const remembered = useMemo(() => readListMemory(), []);
  const [filters, setFilters] = useState<ContactFilters>(() => remembered?.filters ?? emptyContactFilters());
  /* v16 §B — THE "AT A GLANCE" GROUP the list is filtered to (Not queried · Querying · Closed), or null. It sits
     BESIDE the chips: both apply, a chip change leaves it alone, and "Clear all" clears both. */
  const [glance, setGlance] = useState<GlanceKey | null>(() => remembered?.glance ?? null);
  const [search, setSearch] = useState(() => searchQuery?.trim() || remembered?.search || "");
  /* v16 §C: the page opens UNGROUPED, A to Z by surname; the column headings sort (there is no sort pill), and the
     choice is remembered with the rest (sessionStorage `sa.contactList.v4`: for the visit, as the pill's was) */
  const [groupKey, setGroupKey] = useState<GroupKey>(() => remembered?.group ?? "none");
  const [sortKey, setSortKeyRaw] = useState<ContactSortKey>(() => remembered?.sort ?? "surname");
  const [reversed, setReversed] = useState<boolean>(() => remembered?.reversed ?? false);
  /* v14 §5 — the row density (Phase 6 draws its toggle); remembered with the rest */
  const [density, setDensity] = useState<Density>(() => remembered?.density ?? "comfortable");
  /* choosing a sort resets the direction to its natural order (§5) */
  const setSortKey = useCallback((k: ContactSortKey) => { setSortKeyRaw(k); setReversed(false); }, []);
  useEffect(() => { writeListMemory({ filters, search, group: groupKey, sort: sortKey, reversed, density, glance }); }, [filters, search, groupKey, sortKey, reversed, density, glance]);
  const pop = usePopover<ContactPop>();
  /* v16 §E — FULL SCREEN is the shared `useFullScreenList` (Comparable titles v25 built it for both pages): the URL
     carries it (`?full=1`, so a reload and Back respect it), the sidebar is held at its icons through `sidebarForce`
     and is whatever the writer left it on the way out, the scroll position is put back, and Escape leaves it last.
     This page hides its own sections off the flag (contactV16.css, `[data-full]`). */
  const fullScroller = useCallback(() => mainColRef.current?.closest<HTMLElement>(".wpg-scroll") ?? null, []);
  const { full, setFull } = useFullScreenList({ storageKey: CONTACTS_FULL_KEY, routeActive: active, scroller: fullScroller });

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
    text: string; kind: "travel" | "filtered-out" | "failed"; agentId: string; canUndo: boolean;
  } | null>(null);
  /** Which section the card sat in before the save — read once the outcome is computed. */
  const sectionBeforeSave = useRef<string | null>(null);
  /** The card's own Undo for the last save — the SAME closure its foot offers (a whole-document
   *  snapshot: the agent, the deadlines the fan-out moved, the task flag), so the notice and the card
   *  cannot restore different things. Null when the card could not take a snapshot. */
  const undoSave = useRef<(() => Promise<unknown>) | null>(null);

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
  /* ── v15 §4 — THE NEXT STEP, over the UNFILTERED agent set (§9): the list's filters and Find never reach it.
     ⚠️ DECLARED HERE, above `inPool` — the ready-only mode reads `readyIds` at render (the TDZ order rule). */
  const todayIso = useMemo(() => {
    const d = new Date(nowMs);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [nowMs]);
  const step = useMemo(
    () => nextStep({ agents, queries, msId: scoped?.id ?? null, book, todayIso }),
    [agents, queries, scoped, book, todayIso],
  );
  /* v13 §3 — THE NUMBERS STRIP: over the agents the list shows BEFORE filtering, never the filtered set.
     v14 §1.3: its figures are facts, not controls — the carousel they filled is retired. */
  const factsAll = useMemo(
    () => agents.map((a) => agentFacts(a, qcRows, scoped?.id ?? null)),
    [agents, qcRows, scoped],
  );
  /* ruling Q5: "takes the book" — any of the agent's genres matching the main genre or any subGenre */
  const takesFact = useCallback(
    (x: { genres: string[] }) => x.genres.some(bookHit),
    [bookHit],
  );
  /* the pool: Find and the "At a glance" group — so every chip's count is faceted under them */
  const inPool = useCallback(
    (x: AgentFacts) => matchesAgentSearch(x.agent, search) && (!glance || glanceOf(x) === glance),
    [search, glance],
  );
  /* v16 §B — the strip's figures, over every agent (never the filtered view) */
  const glanceM = useMemo(
    () => glanceModel({ facts: factsAll, rows: qcRows, msId: scoped?.id ?? null, readyIds: step.ready.map((a) => a.id), nowMs }),
    [factsAll, qcRows, scoped, step, nowMs],
  );
  /* v14 §4: every control's count is faceted — under every OTHER control and Find */
  const counts = useMemo(() => facetCounts(factsAll, filters, inPool), [factsAll, filters, inPool]);
  const tallies = useMemo(() => genreTallies(factsAll), [factsAll]);
  const visibleFacts = useMemo(
    () => sortFacts(factsAll.filter((x) => inPool(x) && matchesContactFilters(x, filters)), sortKey, reversed),
    [factsAll, inPool, filters, sortKey, reversed],
  );
  const groupCtx = useMemo(() => ({ takes: takesFact }), [takesFact]);
  const groups = useMemo(() => contactGroups(groupKey, visibleFacts, groupCtx), [groupKey, visibleFacts, groupCtx]);
  /* "n of m" on a group heading while the list is filtered: each group's size over every agent */
  const filtered = visibleFacts.length < factsAll.length;
  const groupTotals = useMemo(
    () => new Map(contactGroups(groupKey, factsAll, groupCtx).map((g) => [g.label, g.ids.length])),
    [groupKey, factsAll, groupCtx],
  );
  const factsById = useMemo(
    () => new Map(visibleFacts.map((x) => [x.agent.id, x])),
    [visibleFacts],
  );
  /* §7.8 — the dead end's drops, only when the list is empty */
  const drops = useMemo(
    () => (visibleFacts.length > 0 ? [] : dropOptions(factsAll, filters, search, (x, q) => matchesAgentSearch(x.agent, q), (k) => CANONICAL_GENRES.find((g) => g.id === k)?.label ?? k)),
    [visibleFacts.length, factsAll, filters, search],
  );
  /* §7.7 — the keyboard's focus ring: the rows in the order they are DRAWN (groups flattened) */
  const [kfId, setKfId] = useState<string | null>(null);
  const displayIds = useMemo(() => groups.flatMap((g) => g.ids), [groups]);
  useEffect(() => { if (kfId && !displayIds.includes(kfId)) setKfId(null); }, [displayIds, kfId]);
  /* §7.7 — what the row keys read, current on every render (the key handler is bound once). ⚠️ DECLARED HERE, above
     every render-time reader (the trayFor assignment below), never beside the handler — the TDZ order rule. */
  const rowKeys = useRef({ kfId, displayIds, factsById, trayFor: null as null | ((x: AgentFacts) => CardPrimary), onOpen: null as null | ((id: string, r?: DOMRect) => void), act: null as null | ((id: string, a: CardAct) => void) });
  rowKeys.current = { ...rowKeys.current, kfId, displayIds, factsById };
  /* §7.2 — the gentle reflow, on any filter, group, sort or Find change (never on first load) */
  useReflow(gridRef, JSON.stringify([filters, groupKey, sortKey, reversed, search.trim()]));
  const shownGroups = groups;
  const visible = visibleFacts;
  /* v17 §B — anything narrowing the list: a filter, the summary card's group, or Find */
  const anyActive = contactFilterCount(filters) > 0 || !!glance || search.trim() !== "";
  const clearFilters = useCallback(() => { setFilters(emptyContactFilters()); setSearch(""); setGlance(null); }, [setFilters]);
  /* v13 §5 — the controls, one component in two places; the page holds their state and the ONE popover */
  /* v18 §B — THE LIST HEADER'S TOOLS, right of its sentence: search, the one Filters button, density, full screen. The
     loading skeleton draws the same nodes, so the header holds its height while the page settles. */
  const listTools = (loading: boolean) => (
    <span className="cl18-lt" data-cl18="tools">
      <ContactFind find={search} onFind={setSearch} disabled={loading}
        findKey={<kbd className="cl13-kbd" data-cl13="find-key" aria-hidden="true">{shortcutLabel("contactsFind")}</kbd>} />
      <ContactFiltersButton filters={filters} pop={pop} disabled={loading} />
      <span className="cl18-dens" role="group" aria-label="Row density" data-cl14="density" data-cl18="density">
        {(["comfortable", "compact"] as const).map((d) => (
          <button key={d} type="button" className={density === d ? "on" : undefined} aria-pressed={density === d} data-cl14-dens={d}
            aria-label={d === "comfortable" ? "Comfortable" : "Compact"} title={d === "comfortable" ? "Comfortable" : "Compact"} disabled={loading} onClick={() => setDensity(d)}>
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              {d === "comfortable" ? <path d="M1 2h12M1 6h12M1 10h12" /> : <path d="M1 1.5h12M1 4.5h12M1 7.5h12M1 10.5h12" />}
            </svg>
          </button>
        ))}
      </span>
      <button type="button" className="cl16-fsb cl18-fsb" data-cl16="full" aria-pressed={full} disabled={loading}
        aria-label={full ? "Exit full screen" : "Full screen"} title={`${full ? "Exit full screen" : "Full-screen list"} (${shortcutLabel("contactsFull")})`}
        onClick={() => setFull(!full)}>
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          {full ? <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" /> : <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />}
        </svg>
      </button>
    </span>
  );
  /** the "Your agents" panel — "/" scrolls it into view before focusing Find */
  const wsRef = useRef<HTMLElement | null>(null);

  const resetList = useCallback(() => {
    setFilters(emptyContactFilters());
    setSearch("");
    setGlance(null);
    setGroupKey("none");
    setSortKey("surname");
  }, [setSortKey, setFilters]);

  /* ── v12 §4 / v13 §6: the marked letter ───────────────────────────────────
   * ⚠️ DERIVED FROM THE RECTS ON SCROLL, NEVER AN IntersectionObserver'S MEMORY (the house
   * IO-misses-are-permanent law): the marked cell is the LAST letter divider at or above the line a
   * strip pick lands a divider on, re-read rAF-throttled on every scroll — a reading that cannot go
   * stale. Capture-phase on document because scroll does not bubble and the page's scroller is the
   * shell's, not this component's to name. Letters only: under any other grouping nothing marks.
   * ⚠️ THE LINE IS READ, NOT RESTATED: the bottom of the list's pinned headings, which is where `landUnder` puts a
   * picked divider, so a picked letter is always the marked one. */
  /* v18 §A — THE CURRENT LETTER: the letter of the row at the line under the pinned row and the column headings (the
     last row whose top is at or above that line; none while the first row is still below it). ONE reader, scheduled once
     per animation frame on scroll; it writes the current letter for both strips and nothing else. Capture-phase on
     document because scroll does not bubble. */
  const [markedLetter, setMarkedLetter] = useState<string | null>(null);
  useEffect(() => {
    if (!active) { setMarkedLetter(null); return; }
    let raf = 0;
    const read = () => {
      raf = 0;
      const col = mainColRef.current;
      const rows = col ? Array.from(col.querySelectorAll<HTMLElement>('[data-clv="row"][data-initial]')) : [];
      if (!col || !rows.length) { setMarkedLetter((m) => (m === null ? m : null)); return; }
      const labels = col.querySelector<HTMLElement>(".lt-panel > .lt-labels");
      const scroller = col.closest<HTMLElement>(".wpg-scroll");
      if (!scroller) return;
      /* the line is where the headings sit once STUCK (their sticky top + their height), the place a pick lands a
         row: read against their current bottom, the first row always touched it and "A" was marked at the top */
      const line = scroller.getBoundingClientRect().top + (labels ? (parseFloat(getComputedStyle(labels).top) || 0) + labels.offsetHeight : 12) + 2;
      let cur: HTMLElement | null = null;
      for (const r of rows) {
        if (r.getBoundingClientRect().top <= line) cur = r;
        else break;
      }
      const L = cur?.dataset.initial ?? null;
      setMarkedLetter((m) => (m === L ? m : L));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    raf = requestAnimationFrame(read);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [active, groupKey, sortKey, reversed, visibleFacts]);

  /* v16 §C — A LETTER TAB. In the ungrouped list it scrolls to the first agent whose surname starts with the
     letter, lands that row just under the pinned controls and washes it for 1.4s. Grouped by letter it scrolls to
     the letter's divider; under any other grouping the pick restores the letter grouping first. "All" returns to
     the list's top.
     ⚠️ THE LANDING IS MEASURED, IN PASSES: the stack the row lands under changes height as it pins, so the target
     is re-read after each jump (the column headings' own bottom, once they have stuck) until it holds. An instant
     jump, never a smooth one: a smooth scroll cannot be corrected until it ends. */
  const landUnder = useCallback((el: HTMLElement) => {
    const sc = el.closest<HTMLElement>(".wpg-scroll");
    if (!sc) return;
    let passes = 0;
    const pass = () => {
      const labels = el.closest(".lt-panel")?.querySelector<HTMLElement>(":scope > .lt-labels");
      const line = labels ? labels.getBoundingClientRect().bottom : sc.getBoundingClientRect().top + 12;
      const delta = el.getBoundingClientRect().top - line;
      if (Math.abs(delta) < 0.5 || passes >= 4) return;
      passes += 1;
      sc.scrollTo({ top: sc.scrollTop + delta, behavior: "instant" as ScrollBehavior });
      requestAnimationFrame(() => requestAnimationFrame(pass));
    };
    pass();
  }, []);
  /* v18 §A — A LETTER PICK always lands on a sorted A to Z list: grouped, or sorted by another column, it switches to
     A to Z, ungrouped, first (the jump then waits for that list to render). The jump is smooth, to the row's
     measured place under the stuck headings, then `landUnder` corrects it once the scroll has ended. */
  const pendingLetter = useRef<string | null>(null);
  const jumpToLetter = useCallback((letter: string) => {
    const col = mainColRef.current;
    const sc = col?.closest<HTMLElement>(".wpg-scroll");
    const row = col ? Array.from(col.querySelectorAll<HTMLElement>(`[data-clv="row"][data-initial="${letter}"]`)).find((r) => r.getBoundingClientRect().height > 0) : null;
    if (!col || !sc || !row) return;
    const labels = col.querySelector<HTMLElement>(".lt-panel > .lt-labels");
    const stickTop = labels ? parseFloat(getComputedStyle(labels).top) || 0 : 12;
    const under = sc.getBoundingClientRect().top + stickTop + (labels?.offsetHeight ?? 0);
    const top = Math.max(0, sc.scrollTop + row.getBoundingClientRect().top - under);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let done = false;
    const settle = () => { if (done) return; done = true; sc.removeEventListener("scrollend", settle); landUnder(row); };
    sc.addEventListener("scrollend", settle, { once: true });
    window.setTimeout(settle, reduce ? 0 : 900);
    sc.scrollTo({ top, behavior: reduce ? ("instant" as ScrollBehavior) : "smooth" });
    row.setAttribute("data-wash", "");
    window.setTimeout(() => row.removeAttribute("data-wash"), 1400);
  }, [landUnder]);
  const pickLetter = useCallback((letter: string) => {
    if (groupKey !== "none" || sortKey !== "surname" || reversed) {
      pendingLetter.current = letter;
      setGroupKey("none"); setSortKeyRaw("surname"); setReversed(false);
      return;
    }
    jumpToLetter(letter);
  }, [groupKey, sortKey, reversed, jumpToLetter]);
  useEffect(() => {
    const L = pendingLetter.current;
    if (!L || groupKey !== "none" || sortKey !== "surname" || reversed) return;
    pendingLetter.current = null;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => jumpToLetter(L)));
    return () => cancelAnimationFrame(raf);
  }, [groupKey, sortKey, reversed, jumpToLetter]);
  const stripCounts = useMemo(() => letterCounts(visibleFacts), [visibleFacts]);
  /**
   * Loading · blank account · list — the page's three states, derived once in `agentList.ts` and
   * never restated here. See `contactListState` for why there are three of them and why the
   * unsaved stub is one of its inputs.
   */
  /* v16 §D — the list's controls pin (the hook re-binds when the list mounts or its grouping changes its layers) */
  /* v13 §8, lock 12 — the dev-only hold (gated HERE, at the call site, so production never reaches
     the module): it holds the settling beat so the placeholders can be measured against the page */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const agentsHeld = import.meta.env.MODE !== "production" ? useAgentsHold() : false;
  const pageState = contactListState({
    /* as if the agents listener had not answered: not ready, and nothing on file yet (an agent on file
       is a list whatever the flag says, so holding the flag alone holds nothing) */
    collectionsReady: collectionsReady && !agentsHeld,
    agentCount: agentsHeld ? 0 : agents.length,
    adding: false, /* the in-grid draft retired with the flip editor; P5's add card is an overlay */
  });

  /* ⚠️ LIVING HEADERS (§1–§3). The headline is the scale and the subline the one thing that needs the
     writer next, both DERIVED here from the QC's own rows and never stored. While the page settles
     the header renders its fixed shape with both lines empty (count null) — never the page name.
     The dev review aid (`__SA_LH_COUNT`) fabricates the COUNT only; gated at the call site so a
     production build never reaches the module. */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const lhOverride = import.meta.env.MODE !== "production" ? useLivingCountOverride() : null;
  const showEmpty = pageState === "blank" || (pageState === "list" && lhOverride === 0);
  const showList = pageState === "list" && !showEmpty;
  /* v16 §E — full screen is on only over a list, on this page's own route */
  const fullOn = full && showList;
  /* v17 §C — the pinned row is shown once the header's foot has passed under the sheet's top (and always in full
     screen, where the header is hidden). Its box is the sheet's own; this is the only thing JS decides about it. */
  const pinned = useContactPinned(mainColRef, active && showList, fullOn);
  const toTop = useCallback(() => {
    const group = mainColRef.current?.closest<HTMLElement>(".clv-group");
    group?.closest<HTMLElement>(".wpg-scroll")?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    group?.querySelector<HTMLElement>("h1[data-page-title]")?.focus({ preventScroll: true });
  }, []);
  /* v14 (ruling Q7): the sticky slim bar retired with the open banner — the sticky column labels (Phase 5)
     are the only sticky element in the list. */

  /* ⚠️ THE GRID DOES NOT GROUP, AND ITS GROUPING IS RETIRED RATHER THAN LEFT FROZEN (Phase 7).
     Grouping arranges the BOARD — the pack's own division — so when the Group control moved to the
     board this page's `grouping` state kept its initial "none" and `setGrouping` was never called
     again: a section renderer that could not be reached, running `groupAgents` on every render to
     produce an empty array. A frozen control is worse than a deleted one, because it reads as a
     feature to whoever finds it next. */


  /* ⚠️ THE CARD IS APP-LEVEL (Agent card v1 §2). The page opens it through the store and keeps
     only what is the LIST's: the ring on the open row, the notice and FLIP after a save, the ring
     on a new row. The card no longer closes when its agent leaves the filter — opened, it stays
     open, and ‹ › step through the order it was opened from. */
  /* Housekeeping's drawer closes when an agent's panel opens from it (declared further down; read through a ref) */
  const setHkOpenRef = useRef<(v: boolean) => void>(() => {});
  const cardReq = useAgentCardRequest();
  /* ── v16 §F — THE AGENT PANEL. On this page an agent opens in the query panel's container, and the page's
     address says which: `?agent={id}`. The row, a "+ Add" on a row, Housekeeping's doors and the row keys all open
     it; nothing here opens the centred agent card any more. Opening pushes one history entry (so Back closes the
     panel); swapping to another agent and closing replace it. */
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const panelParam = active ? params.get("agent") : null;
  const panelAgent = panelParam ? agents.find((a) => a.id === panelParam) ?? null : null;
  const panelId = panelAgent?.id ?? null;
  const [panelTab, setPanelTab] = useState<AgentPanelTab>("profile");
  const setPanelParam = useCallback((id: string | null, how: "push" | "replace") => {
    setParams((prev) => { const n = new URLSearchParams(prev); if (id) n.set("agent", id); else n.delete("agent"); return n; }, { replace: how === "replace" });
  }, [setParams]);
  const panelIdRef = useRef(panelId);
  panelIdRef.current = panelId;
  const closePanel = useCallback(() => { closeAgentCard(); if (panelIdRef.current) setPanelParam(null, "replace"); }, [setPanelParam]);
  /** open the panel on this agent — and, when a door asks for it, the editor at a field */
  const openPanel = useCallback((agentId: string, edit?: { tab?: AgentCardOptions["tab"]; focus?: AgentCardOptions["focus"]; prefill?: AgentCardOptions["prefill"] }) => {
    if (!agents.some((a) => a.id === agentId)) return;
    setHkOpenRef.current(false);
    if (panelIdRef.current !== agentId) { setPanelTab("profile"); setPanelParam(agentId, panelIdRef.current ? "replace" : "push"); }
    if (edit) openAgentCard(agentId, { tab: edit.tab ?? "who", focus: edit.focus, prefill: edit.prefill, from: "row", host: "panel" });
    else closeAgentCard();
  }, [agents, setPanelParam]);
  /* an id the list does not hold (deleted, or a stale link) clears itself once the agents can answer */
  useEffect(() => { if (active && panelParam && collectionsReady && agents.length > 0 && !panelAgent) setPanelParam(null, "replace"); }, [active, panelParam, panelAgent, collectionsReady, agents.length, setPanelParam]);
  /* the query view opened from this panel has its own ×: it closes the agent too */
  useEffect(() => {
    const on = () => { if (panelIdRef.current) setPanelParam(null, "replace"); };
    window.addEventListener("sa:agent-panel-close", on);
    return () => window.removeEventListener("sa:agent-panel-close", on);
  }, [setPanelParam]);
  /* while one of this agent's queries has the box (opened from the Queries tab), the agent's panel stands aside */
  const qPanel = useSyncExternalStore(subscribeQueryPanel, currentQueryPanel, currentQueryPanel);
  const queryHasBox = qPanel?.from === "agent";
  const openId = panelId;
  /** the list's current order and filter */
  const sequence = useMemo(() => visibleFacts.map((x) => x.agent.id), [visibleFacts]);
  /** OPEN this agent — a row, a strip, a key */
  const onOpen = useCallback((agentId: string, _from?: DOMRect) => openPanel(agentId), [openPanel]);
  /* kept under its old name for the doors that asked for the card's editor at a field */
  const openCard = useCallback((agentId: string, opts: AgentCardOptions = {}) => openPanel(agentId, opts.tab || opts.focus || opts.prefill ? { tab: opts.tab, focus: opts.focus, prefill: opts.prefill } : undefined), [openPanel]);

  /** "+ Add an agent" — the empty card, growing out of the button that asked for it. */
  const openAdd = useCallback(() => {
    const r = addBtnRef.current?.getBoundingClientRect();
    openNewAgentCard({ from: "button", originRect: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null });
  }, []);

  /* ⚠️ THE VIEW SWITCH IS RETIRED (v11 decision 1) — one page, one renderer, as the Query
     Centre. A `?view=` parameter in the URL is ACCEPTED AND IGNORED: nothing reads it, nothing
     clears it, and a bookmarked `?view=board` lands on the one list rather than erroring
     (`readQcView` is the precedent). Grid/List/Board and their model went with the switch. */

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
      const after = sortFacts(afterAll.filter((x) => inPool(x) && matchesContactFilters(x, filters)), sortKey, reversed);
      const index = after.findIndex((x) => x.agent.id === saved.id);
      const outcome: SaveOutcome = !survives
        ? { kind: "filtered-out" }
        : { kind: "travel", index: index < 0 ? 0 : index + 1, total: after.length,
            sortLabel: (SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "the current sort") };
      setNotice({
        text: saveNotice(saved.name || saved.agency, outcome),
        kind: outcome.kind,
        agentId: saved.id,
        // the card's snapshot Undo, when it could take one
        canUndo: !!undoSave.current,
      });

      /* the list reflows under the store's own update — measure BEFORE it lands so the FLIP
         can play the move (rows carry data-agent-card, flip.ts's selector) */
      flipBefore.current = measureFlip(gridRef.current);
    },
    [agents, filters, sortKey, reversed, qcRows, scoped, factsById, inPool],
  );

  /**
   * Undo — the card's own (Agent card v1 P4). ⚠️ The old one restored by `updateAgent(prev)`, which
   * merged (a field the save ADDED survived it), logged an activity the save never logged, and left
   * every deadline the reply-time fan-out had moved where the save put it. The card's snapshot
   * restores all of it, whichever of the two places it is pressed in.
   */
  const runUndoSave = useCallback(async () => {
    const undo = undoSave.current;
    setNotice(null);
    undoSave.current = null;
    if (!undo) return;
    flipBefore.current = measureFlip(gridRef.current);
    await undo();
  }, []);
  /* the row a delete collapses — kept so a delete that fails can put the row back */
  const collapsing = useRef<Animation | null>(null);

  /* the just-added agent — its row scrolls into view centred and wears the 2.4s ring (§8.4) */
  const [newId, setNewId] = useState<string | null>(null);

  /* `onHkRemind` is declared further down; the act handler reads it through a ref, never a TDZ read */
  const remindRef = useRef<(a: Agent) => void>(() => {});
  /** a card's (and, from Phase 4, a row tray's) next step, WITHOUT the card: the same journey the card's
   *  button opens, straight to the drawer (§4: "its button opens the journey directly") */
  const actWithoutCard = useCallback((agentId: string, act: CardAct) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    if (act === "log") { openQueryDrawer({ mode: "log", agentId, ...(scoped?.id ? { manuscriptId: scoped.id } : {}) }); return; }
    if (act === "remind") { remindRef.current(agent); return; }
    const q = cardQuery(cardRows(qcRows, agentId, scoped?.id ?? null));
    if (!q || act === "qc") { openCard(agentId, { from: "row" }); return; }
    openQueryDrawer({ mode: act, queryId: q.id });
  }, [agents, scoped, qcRows, openCard]);
  /** v13 §6 — a row's hover tray offers the card's own next step (one derivation: the card's button) */
  const trayFor = useCallback((x: AgentFacts) => primaryFor(x, cardQuery(cardRows(qcRows, x.agent.id, scoped?.id ?? null))), [qcRows, scoped]);
  rowKeys.current = { ...rowKeys.current, trayFor, onOpen: (id, r) => onOpen(id, r), act: actWithoutCard };

  /* the app-level "Add an agent" capture reaches here through the `sa:contact-add` event App.tsx
     dispatches on /agents (ruling f); elsewhere the old focus form is untouched (ruling 3, 5 Oct). */
  useEffect(() => {
    if (!active) return;
    window.addEventListener("sa:contact-add", openAdd);
    return () => window.removeEventListener("sa:contact-add", openAdd);
  }, [active, openAdd]);

  /* the card's aftermath ON THE LIST: a save's notice (with the card's Undo) and FLIP, an add's ring,
     the notice withdrawing once the Undo has run, and a delete's row collapsing */
  useEffect(() => subscribeAgentCardEvents((e) => {
    if (e.type === "saved") {
      undoSave.current = e.undo ?? null;
      beginSaveChoreography(e.after);
    } else if (e.type === "added") {
      setNewId(e.agentId);
    } else if (e.type === "undone") {
      undoSave.current = null;
      setNotice((n) => (n && n.agentId === e.agentId && n.kind !== "failed" ? null : n));
    } else if (e.type === "deleting") {
      /* §7: the row collapses over 240ms, then the delete runs and the list closes the gap */
      const row = [...document.querySelectorAll<HTMLElement>(`[data-agent-card="${e.agentId}"]`)]
        .find((r) => r.getBoundingClientRect().height > 0);
      if (row && !prefersReducedMotion() && typeof row.animate === "function") {
        row.style.overflow = "hidden";
        collapsing.current = row.animate(
          [{ height: `${row.offsetHeight}px`, opacity: 1 }, { height: "0px", opacity: 0, paddingTop: "0px", paddingBottom: "0px", marginTop: "0px", marginBottom: "0px" }],
          { duration: 240, easing: "cubic-bezier(.4,0,.8,.4)", fill: "forwards" },
        );
      }
    } else if (e.type === "delete-failed") {
      collapsing.current?.cancel();
      collapsing.current = null;
      setNotice({ text: `Couldn’t delete ${e.name} — try again.`, kind: "failed", agentId: e.agentId, canUndo: false });
    }
  }), [beginSaveChoreography]);

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

  /* ── Housekeeping v2 (Contact list v13 §6) ───────────────────────────────────────────────
     The gap model over the WHOLE list. "Live" is any live query whatever the manuscript — the
     reply window fans out to every query, so the scope chip has no say there; "fits", "queried" and
     "passed" (ruling Q6) read the manuscript in scope. The reopen flag reads the writer's own undone
     dated tasks (ruling b), so completing the reminder in To-do reopens the gap here by construction. */
  const hkToday = useMemo(() => new Date(nowMs), [nowMs]);
  const hkPrefs = useMemo(() => contactPrefsOf(currentUser, hkToday), [currentUser, hkToday]);
  const hkReopenTaskById = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const t of userTasks ?? []) {
      if (t.agentId && !t.done && (t.dueDate ?? "").trim()) m.set(t.agentId, true);
    }
    return m;
  }, [userTasks]);
  const hkCtxById = useMemo(() => {
    const m = new Map<string, HkAgentCtx>();
    const msId = scoped?.id ?? null;
    for (const a of agents) {
      m.set(a.id, {
        live: agentRows(qcRows, a.id, null).some((r) => r.court !== "closed"),
        fits: fitsGenre(a, book),
        queried: queries.some((q) => q.agentId === a.id && (!msId || q.manuscriptId === msId)),
        passedOn: hasPassedOn(a, queries, msId),
        hasReopenTask: hkReopenTaskById.get(a.id) ?? false,
      });
    }
    return m;
  }, [agents, qcRows, queries, scoped, book, hkReopenTaskById]);
  const hkCtxOf = useCallback((a: Agent): HkAgentCtx => hkCtxById.get(a.id)
    ?? { live: false, fits: false, queried: false, passedOn: false, hasReopenTask: false }, [hkCtxById]);
  const hkAll = useMemo(() => hkModel(agents, hkCtxOf, hkPrefs), [agents, hkCtxOf, hkPrefs]);
  /* dev only: the review aid that shows an all-filled list (lib/hkReviewAid); production reads `hkAll` */
  const hkAllFilledAid = import.meta.env.MODE !== "production" && hkAllFilled();
  const hk = useMemo(() => (hkAllFilledAid
    ? hkModel(agents.filter((a) => (hkAll.gapsById.get(a.id)?.length ?? 0) === 0), hkCtxOf, hkPrefs)
    : hkAll), [hkAllFilledAid, hkAll, agents, hkCtxOf, hkPrefs]);
  const hkCheckin = useMemo(() => wishlistCheckin(agents, hkCtxOf, hkPrefs, hkToday), [agents, hkCtxOf, hkPrefs, hkToday]);
  const hkBook: HkBook = useMemo(() => ({ title: scoped?.title?.trim() || null, genre: scoped?.genre?.trim() || null, genres: book }), [scoped, book]);
  const [hkOpen, setHkOpen] = useState(false);
  setHkOpenRef.current = setHkOpen;
  /* v17.1 — THE ONE OPENER: the tab, the H key and List health in the header all call this */
  const openHk = useCallback(() => setHkOpen(true), []);
  /* v18.1 §B.4 — the agent panel's "Fill in": a run over that agent's tasks only */
  const [hkRun, setHkRun] = useState<{ id: string; seq: number } | null>(null);
  const health = useMemo(() => listHealth(agents, hk), [agents, hk]);
  /* v18 §F.1 — the drawer's figures: the same score, with its held and possible points */
  const listH = useMemo(() => healthOf(agents, hk), [agents, hk]);
  /* v18 §F.3 — the intro's flag, in Housekeeping's own store (beside v17.1's tab dismissal) */
  const hkIntroSeen = introSeenOf(currentUser);
  const markIntroSeen = useCallback(() => { if (!hkIntroSeen) void updateUserPaths(INTRO_PATH_V18); }, [hkIntroSeen, updateUserPaths]);
  /* v17.1 §D — THE TAB'S DISMISSAL, SAVED TO THE ACCOUNT (`todoPrefs.contacts.tabDismissedAtGaps`): the gap count
     when the tab was hidden. `pendingDismiss` holds the value from the press until the user doc agrees, so the
     tab does not flash back while the write is in flight. */
  const storedDismiss = dismissedAtGaps(currentUser);
  const [pendingDismiss, setPendingDismiss] = useState<number | null | undefined>(undefined);
  useEffect(() => { if (pendingDismiss !== undefined && pendingDismiss === storedDismiss) setPendingDismiss(undefined); }, [pendingDismiss, storedDismiss]);
  const dismissNow = pendingDismiss !== undefined ? pendingDismiss : storedDismiss;
  const hkTabShown = tabShown(health.gaps, dismissNow);
  const [tabNote, setTabNote] = useState(false);
  const tabNoteTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tabNoteTimer.current), []);
  const dismissTab = useCallback(() => {
    setPendingDismiss(health.gaps);
    void updateUserPaths(dismissPath(health.gaps));
    setTabNote(true);
    window.clearTimeout(tabNoteTimer.current);
    tabNoteTimer.current = window.setTimeout(() => setTabNote(false), 6000);
  }, [health.gaps, updateUserPaths]);
  const undoDismiss = useCallback(() => {
    setPendingDismiss(null);
    void updateUserPaths(dismissPath(null));
    setTabNote(false);
    window.clearTimeout(tabNoteTimer.current);
  }, [updateUserPaths]);
  /* the stored value follows the count only once EVERY collection has answered: a gap count read before the
     queries arrive is not the writer's, and a transient rise would lift a dismissal nobody asked to lift */
  const dismissReady = collectionsReady && pageState === "list" && pendingDismiss === undefined;
  useEffect(() => {
    if (!dismissReady) return;
    const next = nextDismissed(health.gaps, storedDismiss);
    if (next !== undefined) void updateUserPaths(dismissPath(next));
  }, [dismissReady, health.gaps, storedDismiss, updateUserPaths]);
  const [hkView, setHkViewRaw] = useState<HkView>(() => readHkView());
  const setHkView = useCallback((v: HkView) => { setHkViewRaw(v); writeHkView(v); }, []);
  /* ── Housekeeping's fixes — THE CARD'S SAVE PATH (lib/agentCardSave), never `updateAgent`:
     the snapshot first, the reply-time deadline fan-out in the same batch, the data-quality flag, and
     a snapshot Undo. In the lab the card's sandbox writer stands in, with the inverse patch as Undo. */
  const personalGenres = currentUser?.personalGenres ?? [];
  const writeFix = useCallback(async (agent: Agent, patch: AgentEditPatch): Promise<FixResult | { ok: true; undo?: () => Promise<boolean> }> => {
    if (Object.keys(patch).length === 0) return { ok: false, error: "Nothing to save." };
    if (sandbox?.writeAgent) {
      const write = sandbox.writeAgent;
      const before = { ...agent } as Agent;
      const r = await write(agent.id, patch);
      if ("error" in r) return { ok: false, error: r.error };
      return { ok: true, undo: async () => !("error" in (await write(before.id, inversePatch(before, patch)))) };
    }
    if (!currentUser) return { ok: false, error: "Not signed in." };
    const out = await commitCardSave({ uid: currentUser.id, agent, queries, patch, resolveTaskFlag });
    if ("error" in out.res) return { ok: false, error: out.res.error };
    return { ok: true, undo: out.undo };
  }, [sandbox, currentUser, queries, resolveTaskFlag]);

  const onHkFix = useCallback(async (item: HkItem, fix: HkFix): Promise<FixResult> => {
    const agent = agents.find((a) => a.id === item.agent.id) ?? item.agent;
    if (fix.kind === "settled") {
      const before = hkPrefs.settled;
      try { await updateUserPaths(settledPath(hkPrefs, agent.id)); } catch (e) { return { ok: false, error: (e as Error).message || "the setting did not save" }; }
      return { ok: true, line: savedLine(item, { settled: true }), undo: async () => { try { await updateUserPaths(settledRestorePath(before)); return true; } catch { return false; } } };
    }
    if (fix.kind === "remind") {
      const name = (agent.name ?? "").trim() || (agent.agency ?? "").trim();
      let id: string | undefined;
      try { id = await addUserTask({ agentId: agent.id, dueDate: fix.on, text: `Check ${name} has reopened to queries` }); } catch (e) { return { ok: false, error: (e as Error).message || "the reminder did not save" }; }
      return { ok: true, line: savedLine(item, { remindOn: fix.on }), undo: id ? async () => { try { await deleteUserTask(id!); return true; } catch { return false; } } : undefined };
    }
    const base = draftOf(agent, personalGenres);
    const change: Partial<CardDraft> = fix.kind === "weeks" ? { weeks: fix.weeks }
      : fix.kind === "mats" ? { mats: fix.mats } : fix.kind === "genres" ? { genres: fix.genres } : { wishlist: fix.text };
    const patch = cardPatch(agent, base, { ...base, ...change }, new Date().toISOString());
    const r = await writeFix(agent, patch);
    if ("error" in r) return r;
    const after = applyPatch(agent, patch);
    return {
      ok: true,
      line: savedLine(item, { weeks: fix.kind === "weeks" ? fix.weeks : undefined, genres: fix.kind === "genres" ? fix.genres : undefined, fitsAfter: fitsGenre(after, hkBook.genres), book: hkBook }),
      undo: r.undo,
    };
  }, [agents, hkPrefs, updateUserPaths, addUserTask, deleteUserTask, personalGenres, writeFix, hkBook]);

  const hkEditCtx = useMemo(
    () => ({ queries, agents, msGenre: scoped?.genre ?? null, msTitle: scoped?.title ?? null, nowMs }),
    [queries, agents, scoped, nowMs],
  );
  /** the reply fix's Also-changes lines for a live agent — the card's own dry run, never a sum */
  const hkAlsoFor = useCallback((agent: Agent, weeks: number): string[] => {
    const base = draftOf(agent, personalGenres);
    const notes = alsoChanges(agent, toContactDraft(agent, base, { ...base, weeks }), hkEditCtx);
    return notes.filter((n) => n.field === "reply").flatMap((n) => n.lines);
  }, [personalGenres, hkEditCtx]);

  const onHkCard = useCallback((item: HkItem, prefill: Partial<CardDraft>) => {
    const target = { reply: { tab: "work", focus: "reply" }, materials: { tab: "want", focus: "materials" }, genres: { tab: "want", focus: "genres" },
      wishlist: { tab: "want", focus: "wishlist" }, reopen: { tab: "work", focus: "reopen" } } as const;
    const t = target[item.gap];
    openPanel(item.agent.id, { tab: t.tab, focus: t.focus, prefill: Object.keys(prefill).length ? prefill : undefined });
  }, [openPanel]);

  const onWishlistStill = useCallback(async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    const patch: AgentEditPatch = { mswlCheckedAt: new Date().toISOString() };
    if (sandbox?.writeAgent) { await sandbox.writeAgent(agentId, patch); return; }
    if (!currentUser) return;
    await commitAgentEdits(firestoreDb, currentUser.id, agentId, patch);
  }, [agents, sandbox, currentUser]);

  /* v13 §8 — the page guide sits above the Housekeeping tab: the tab is placed from the window's
     measured corner, so the guide is too — the corner, plus the tab's OWN measured height, plus 24 —
     never a literal for a box another element owns. */
  const guideCorner = useWindowCorner(floatInset());
  const [tabH, setTabH] = useState(0);
  useEffect(() => {
    if (!active || !showList) return undefined;
    const t = window.setTimeout(() => {
      const tab = document.querySelector<HTMLElement>('[data-ftab="housekeeping"]');
      if (tab && tab.offsetHeight > 0) setTabH(tab.offsetHeight);
    }, 0);
    return () => window.clearTimeout(t);
  }, [active, showList]);

  /* v13 §8 — the page's keys, from the shared registry (and so on the shortcut sheet): H opens
     Housekeeping, / scrolls to the list and focuses Find. Not in a field, not while a card, the drawer
     or a popover is open, and only while this is the page on screen. */
  const hkKeyState = useRef({ active, hkOpen, popOpen: false, cardOpen: false, enabled: false, full: false, setFull });
  hkKeyState.current = { active, hkOpen, popOpen: !!pop.open, cardOpen: !!openId, enabled: agents.length > 0, full: fullOn, setFull };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const hk = matchesShortcut(SHORTCUTS.contactsHk, e);
      const find = matchesShortcut(SHORTCUTS.contactsFind, e);
      const down = matchesShortcut(SHORTCUTS.contactsDown, e), up = matchesShortcut(SHORTCUTS.contactsUp, e);
      const openK = matchesShortcut(SHORTCUTS.contactsOpen, e), actK = matchesShortcut(SHORTCUTS.contactsAct, e);
      const letGo = matchesShortcut(SHORTCUTS.contactsLetGo, e);
      const fullK = matchesShortcut(SHORTCUTS.contactsFull, e);
      if (!hk && !find && !down && !up && !openK && !actK && !letGo && !fullK) return;
      const k = hkKeyState.current;
      if (!k.active || k.hkOpen || k.popOpen || k.cardOpen || !k.enabled) return;
      if (isEditableTarget(e.target)) return;
      /* the query drawer over the page owns the keyboard while it is open — and so does any card, drawer or
         popover anywhere (each pushes a layer on the one escape stack) */
      /* full screen is itself one layer on that stack (the shared hook's, at the bottom): it is not something open */
      if (document.querySelector(".qad-root.is-open") || escapeDepth() > (k.full ? 1 : 0)) return;
      /* §7.7 — the row keys: J K / ↑ ↓ move the ring (scrolling to keep it in view, its tray showing), Enter opens
         the card, L starts the next action, Esc lets go. Enter, L and Esc act only while a ring is held, and Enter
         only from the page itself — a focused control answers its own Enter. */
      if (down || up || openK || actK || letGo) {
        const r = rowKeys.current;
        if ((openK || actK || letGo) && !r.kfId) return;
        if (openK && e.target instanceof HTMLElement && e.target.closest("button, a, [role='button']") && !e.target.closest('[data-clv="row"]')) return;
        e.preventDefault();
        if (letGo) { setKfId(null); return; }
        const id = r.kfId;
        if (down || up) {
          const ids = r.displayIds;
          if (!ids.length) return;
          const i = id ? ids.indexOf(id) : -1;
          const next = ids[Math.max(0, Math.min(ids.length - 1, i < 0 ? 0 : i + (down ? 1 : -1)))];
          setKfId(next);
          requestAnimationFrame(() => {
            const row = [...document.querySelectorAll<HTMLElement>(`[data-agent-card="${next}"]`)].find((x) => x.getBoundingClientRect().height > 0);
            row?.scrollIntoView({ block: "nearest", behavior: "auto" });
          });
          return;
        }
        const row = id ? [...document.querySelectorAll<HTMLElement>(`[data-agent-card="${id}"]`)].find((x) => x.getBoundingClientRect().height > 0) : null;
        if (openK && id) { r.onOpen?.(id, row?.getBoundingClientRect()); return; }
        if (actK && id) {
          const x = r.factsById.get(id);
          const tray = x && r.trayFor ? r.trayFor(x) : null;
          if (tray && !tray.ghost) r.act?.(id, tray.act);
        }
        return;
      }
      e.preventDefault();
      if (fullK) { k.setFull(!k.full); return; }
      if (hk) { openHk(); return; }
      /* / — the bar's Find, the panel scrolled into view first so the field a writer is typing into is on screen */
      /* v17 §C: while the pinned row is shown its search box takes the key (it mirrors the header's); otherwise the
         header's own, brought into view */
      const pinnedInput = document.querySelector<HTMLInputElement>('[data-cl17="pinned"][data-on] [data-cl17="pinned-find"] input');
      const input = pinnedInput ?? [...document.querySelectorAll<HTMLInputElement>('[data-cl13-find="banner"] input')].find((x) => x.getBoundingClientRect().height > 0);
      if (!input) return;
      if (!pinnedInput) input.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      input.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  /* the card's "Remind me when they reopen" adds the SAME task — one derivation, one wording */
  const onHkRemind = useCallback((agent: Agent) => {
    const task = reopenReminder(agent);
    if (!task) { openCard(agent.id, { tab: "work", focus: "door", from: "hk" }); return; } // ruling (b): no date → the editor at the door
    void addUserTask(task);
  }, [addUserTask, openCard]);
  remindRef.current = onHkRemind;

  /* ── v16 §F — the panel's acts ─────────────────────────────────────────────────────────────────────────── */
  const panelFacts = useMemo(() => (panelAgent ? agentFacts(panelAgent, qcRows, scoped?.id ?? null) : null), [panelAgent, qcRows, scoped]);
  const panelQ = useMemo(() => (panelAgent ? cardQuery(cardRows(qcRows, panelAgent.id, scoped?.id ?? null)) : null), [panelAgent, qcRows, scoped]);
  const panelRows = useMemo(() => (panelAgent ? qcRows.filter((r) => r.query.agentId === panelAgent.id) : []), [panelAgent, qcRows]);
  const panelGenres = useMemo(
    () => (panelAgent?.genres ?? []).map((g) => ({ label: genreLabel(g, personalGenres), hit: bookHit(g) })),
    [panelAgent, personalGenres, bookHit],
  );
  const titleOf = useCallback((id: string) => manuscripts.find((m) => m.id === id)?.title?.trim() || null, [manuscripts]);
  /** ↑ ↓ J K: the row before or after the open one, in the order the list draws */
  const walkPanel = useCallback((dir: 1 | -1) => {
    const ids = rowKeys.current.displayIds;
    const i = panelIdRef.current ? ids.indexOf(panelIdRef.current) : -1;
    const next = ids[Math.max(0, Math.min(ids.length - 1, i < 0 ? 0 : i + dir))];
    if (!next || next === panelIdRef.current) return;
    closeAgentCard();
    setPanelTab("profile");
    setPanelParam(next, "replace");
    requestAnimationFrame(() => {
      const row = [...document.querySelectorAll<HTMLElement>(`[data-agent-card="${next}"]`)].find((x) => x.getBoundingClientRect().height > 0);
      row?.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
  }, [setPanelParam]);
  /** a query journey, stepped into the panel in the action drawer's look */
  /* v17 §D — "+ Log a query" on a row: the agent's panel opens and steps straight to the Log a query journey with
     the agent chosen (v16 Part F's act look). The journey is portalled into the panel, so it starts once the panel
     for THAT agent is on the page. */
  const pendingLog = useRef<string | null>(null);
  const logInPanel = useCallback((agentId: string) => {
    pendingLog.current = agentId;
    openPanel(agentId);
  }, [openPanel]);
  useEffect(() => {
    const a = panelAgent;
    if (!a || pendingLog.current !== a.id) return undefined;
    pendingLog.current = null;
    const first = firstNameOf(a);
    const nm = (a.name || a.agency || "The agent").trim();
    const id = requestAnimationFrame(() => openQueryDrawer({
      mode: "log", agentId: a.id, ...(scoped?.id ? { manuscriptId: scoped.id } : {}),
      panel: { name: nm, agency: (a.name ? a.agency ?? "" : "").trim(), first, backLabel: `Back to ${first}`, title: `Query ${first}` },
    }));
    return () => cancelAnimationFrame(id);
  }, [panelAgent, scoped]);
  const actInPanel = useCallback((act: PanelAct) => {
    const a = panelAgent;
    if (!a || act.kind !== "journey") return;
    const first = firstNameOf(a);
    const nm = (a.name || a.agency || "The agent").trim();
    const panel = { name: nm, agency: (a.name ? a.agency ?? "" : "").trim(), first, backLabel: `Back to ${first}`, ...(act.mode === "log" ? { title: `Query ${first}` } : {}) };
    if (act.mode === "log") { openQueryDrawer({ mode: "log", agentId: a.id, ...(scoped?.id ? { manuscriptId: scoped.id } : {}), panel }); return; }
    if (panelQ) openQueryDrawer({ mode: act.mode, queryId: panelQ.id, panel });
  }, [panelAgent, panelQ, scoped]);
  const panelDeleteFacts = useMemo(() => {
    if (!panelAgent) return null;
    const m = destroyManifest("agent", panelAgent.id, { queries, activities, taskFlags });
    return { queries: m.queries, history: m.activityRecords };
  }, [panelAgent, queries, activities, taskFlags]);
  /** ⋯ → Delete agent…, confirmed: the panel closes, the row collapses (the list's own aftermath), then the cascade runs */
  const deletePanelAgent = useCallback(async () => {
    const a = panelAgent;
    if (!a) return;
    const name = (a.name ?? "").trim() || a.agency;
    closePanel();
    emitAgentCardEvent({ type: "deleting", agentId: a.id });
    await new Promise((r) => window.setTimeout(r, 240));
    try { await deleteAgent(a.id); } catch { emitAgentCardEvent({ type: "delete-failed", agentId: a.id, name }); }
  }, [panelAgent, closePanel, deleteAgent]);
  const writePanelAgent = useCallback(async (id: string, patch: AgentEditPatch): Promise<SaveAgentResult> => {
    if (sandbox?.writeAgent) return sandbox.writeAgent(id, patch);
    if (!currentUser) return { ok: false, error: "Not signed in." } as SaveAgentResult;
    return commitAgentEdits(firestoreDb, currentUser.id, id, patch);
  }, [sandbox, currentUser]);
  const panelMenu = useMemo(() => {
    const out: { key: string; label: string; run: () => void }[] = [];
    if (panelQ) out.push({ key: "qc", label: "Open in Query Centre", run: () => navigate(`/queries?q=${encodeURIComponent(panelQ.id)}`) });
    if (panelQ && panelQ.court === "agent" && panelQ.pastExpected) out.push({ key: "nudge", label: "Send a nudge", run: () => actInPanel({ kind: "journey", mode: "nudge" }) });
    if (panelAgent && panelFacts?.door === "closed" && reopenReminder(panelAgent)) out.push({ key: "remind", label: "Remind me when they reopen", run: () => remindRef.current(panelAgent) });
    return out;
  }, [panelQ, panelAgent, panelFacts, navigate, actInPanel]);

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
        {showEmpty ? (
          <ContactEmptyPage
            manuscriptTitle={scoped?.title?.trim() || null}
            addRef={addBtnRef}
            /* the header's primary and the third way: the page's own add door (the centred new-agent card) */
            onAdd={openAdd}
            /* "Import your list" and Smart import: the same bridge the sidebar's Import entry takes */
            onImport={() => onNavigate?.("import")}
          />
        ) : (
        <>
        {/* v13 §5 — THE STICKY SLIM BAR, outside the group's grid so it sticks to the scroller's top
            across the whole page: "Every agent", the count, the mini A–Z (1441px and wider) and the
            same controls as the banner's, sharing their state. */}
        {/* v17 §C — the pinned row, a child of the page sheet (portalled while this page is on screen) */}
        <ContactPinnedRow anchor={mainColRef} on={active && showList} shown={pinned}
          total={factsAll.length} showing={visibleFacts.length} filtered={anyActive}
          letterCounts={stripCounts} current={markedLetter} onLetter={pickLetter} onClear={clearFilters}
          find={search} onFind={setSearch} onAdd={openAdd} onTop={toTop} />
        {/* v13 §6 — HOUSEKEEPING: the floating tab in the window's corner and the half-screen drawer it
            opens (both portalled; the tab only while this is the page on screen) */}
        {showList && (
          <HousekeepingDrawer
            model={hk} checkin={hkCheckin} every={hkPrefs.wishlistEvery} book={hkBook} today={hkToday} agents={agents}
            tabShown={hkTabShown} onDismissTab={dismissTab} tabNote={tabNote ? { onUndo: undoDismiss } : null}
            health={listH} introSeen={hkIntroSeen} onIntroSeen={markIntroSeen}
            open={hkOpen} onOpen={openHk} onClose={() => { setHkOpen(false); setHkRun(null); }} runAgent={hkRun}
            view={hkView} onView={setHkView} routeActive={active} keyHint={shortcutLabel("contactsHk")}
            onFix={onHkFix}
            onLater={async (item) => { await updateUserPaths(laterPath(item.agent.id, item.gap, hkToday)); }}
            onShowAll={async () => { await updateUserPaths(showAllPath()); }}
            onCard={onHkCard}
            onAgentCard={(id, tab) => openPanel(id, tab ? { tab } : undefined)}
            alsoFor={hkAlsoFor}
            onCheckinEvery={async (every: WishlistEvery) => { await updateUserPaths(wishlistEveryPath(every)); }}
            onCheckinNext={async () => { await updateUserPaths(wishlistNextPath(hkPrefs, hkToday)); }}
            onWishlistStill={onWishlistStill}
            onWishlistChanged={(id) => openPanel(id, { tab: "want", focus: "wishlist" })}
          />
        )}
        {/* v16 §F — the agent's panel (portalled): only while this is the page on screen, and not while one of the
            agent's queries has the box */}
        {showList && active && panelAgent && panelFacts && !queryHasBox && (
          <AgentPanel
            agent={panelAgent} facts={panelFacts} q={panelQ} rows={panelRows} msTitle={scoped?.title?.trim() || null} titleOf={titleOf}
            genres={panelGenres} nowMs={nowMs} uid={currentUser?.id ?? null} writeAgent={writePanelAgent}
            tab={panelTab} onTab={setPanelTab}
            editing={cardReq?.host === "panel" && cardReq.agentId === panelAgent.id}
            onClose={closePanel} onWalk={walkPanel}
            onEdit={(tab, focus) => openPanel(panelAgent.id, { tab: tab ?? "who", focus })}
            onAct={actInPanel}
            onOpenQuery={(queryId) => openQueryPanelFromAgent(queryId, { agentId: panelAgent.id, first: firstNameOf(panelAgent) })}
            menu={panelMenu} deleteFacts={panelDeleteFacts} onDelete={deletePanelAgent}
            gaps={agentGapLine(hk, panelAgent.id)}
            onFillIn={() => { const id = panelAgent.id; closePanel(); setHkRun({ id, seq: Date.now() }); setHkOpen(true); }}
          />
        )}
        {showList && active && guideCorner && tabH > 0 && (
          <PageGuide page={CONTACT_GUIDE_PAGE} steps={CONTACT_GUIDE}
            dress={{ kicker: "How this page works", back: true, finish: "Got it", className: "pgd--contacts",
              style: { right: guideCorner.right, bottom: guideCorner.bottom + tabH + 24 } }} />
        )}

        {/* v13 §8 — the loading beat: the group draws its own components as shimmering shapes, inert */}
        <div className="clv-group" data-full={fullOn ? "" : undefined} data-loading={pageState === "settling" ? "" : undefined}
          aria-busy={pageState === "settling" || undefined}
          inert={pageState === "settling" || undefined}>
        {/* v17 §A — THE ONE LIGHT HEADER, on the page colour: the title block, the cut-out hawk, and the summary
            card that is the page's figures and its group filter (the strip's own `glance` state). Over a LIST
            only, and while settling: the blank account's page is ContactEmpty. */}
        {(showList || pageState === "settling") && (
          <ContactLightHeader loading={pageState !== "list"} total={pageState === "list" ? factsAll.length : null}
            msTitle={scoped?.title?.trim() || null} model={pageState === "list" ? glanceM : BLANK_GLANCE} active={glance}
            onGroup={(k) => setGlance((g) => (g === k ? null : k))}
            addRef={addBtnRef} onAdd={openAdd}
            health={pageState === "list" ? health : null} onHealth={openHk}
            letters={<LetterTabs variant="top" counts={stripCounts} current={markedLetter} onPick={pickLetter} loading={pageState !== "list"} />}
            onDiscover={DISCOVER && onNavigate ? () => onNavigate(DISCOVER.tab, DISCOVER.sub) : undefined}>
            {/* v17 §C — the pin line: the header's foot */}
            <i className="cl17-sentinel" data-cl17="pin-sentinel" aria-hidden="true" />
          </ContactLightHeader>
        )}
        {pageState === "settling" && (
          <ContactSkeleton controls={listTools(true)} />
        )}
        <div className="clv-main" ref={mainColRef}>

        {/* LIVING HEADERS §3 — the blank account is `ContactEmpty` above, in place of this whole group;
            `settling` draws the header's fixed shape with both lines empty and nothing below it. The
            filtered "No agents match." branch below is reachable only with agents on file. */}
        {!showList ? null : (
        <>

        {/* v16 §C — THE LIST IS THE PAGE. It breaks out of the column to 24px from the page sheet's edges (capped at
            1600, centred): the ink control bar, the white filter row with the count at its right, the letter tabs,
            then the rows. The title bar, its hawk and its two pills are gone. */}
        {showList && (
        <section className="cl14-ws cl16-list" data-cl14="ws" data-cl16="list" ref={wsRef} aria-label="The full list">
          {/* v17 §B — THE SHEET'S TOP ROW: what is showing, left; grouping, density and full screen, right. The ink
              control bar is gone: search and the filters are in the header. */}
          {/* v18 §B — THE LIST HEADER: the top of the list sheet, slate. One sentence, left (the group name opens the
              grouping menu); search, Filters, density and full screen, right. */}
          <div className="cl18-lh" data-cl18="list-header" data-cl17="sheet-row">
            <p className="cl18-says" data-cl18="sentence" data-cl16="showing" data-cl17="showing" role="status">
              {visibleFacts.length === factsAll.length && !anyActive ? (
                <>Showing all <b data-cl14="shown"><CountTo value={visibleFacts.length} /></b> {factsAll.length === 1 ? "agent" : "agents"}</>
              ) : (
                <>Showing <b data-cl14="shown"><CountTo value={visibleFacts.length} /></b> of <b data-cl16="total">{factsAll.length}</b></>
              )}
              <span className="cl18-dim">{groupKey === "none" ? ", " : ", grouped by "}</span>
              <button type="button" className="cl18-gn" data-cl18="group" aria-haspopup="dialog" aria-expanded={pop.open === "group"}
                onClick={(e) => pop.toggle("group", e.currentTarget)}>
                {groupKey === "none" ? "A to Z" : (GROUP_OPTIONS.find((g) => g.key === groupKey)?.label ?? "A to Z")}
              </button>
              {visibleFacts.length === factsAll.length && !anyActive ? null : (
                <button type="button" className="cl18-clear" data-cl14="clear-all" data-cl17="clear-all" onClick={clearFilters}>Clear all</button>
              )}
            </p>
            {listTools(false)}
            <GroupMenu groupKey={groupKey} onGroup={setGroupKey} pop={pop} />
            <ContactFiltersPanel filters={filters} onFilters={setFilters} counts={counts} tallies={tallies} pop={pop}
              showing={visibleFacts.length} msTitle={scoped?.title?.trim() || null} />
          </div>
          <div className="cl14-list" data-cl14="list">
        {/* ⚠️ ONE SET OF AGENTS, ONE RENDERER (v11 decision 1) — grouped bands over rows. The
            FLIP container moved with the renderer: rows carry data-agent-card, flip.ts's own
            default selector, so a filter change still animates the reflow. */}
        <div ref={gridRef}>
          {visible.length === 0 ? (
            /* §7.8 — THE HELPFUL DEAD END: each active control offered as one drop, with how many it brings back */
            <div className="cl14-none" data-cl13="none" role="status">
              <b>No agents match all of these.</b>
              <span>{drops.length ? "Drop one filter to see some again:" : "Even dropping one filter leaves nobody. Try clearing them."}</span>
              {drops.length > 0 && (
                <span className="cl14-lz" data-cl14="drops">
                  {drops.map((d) => (
                    <button key={d.key} type="button" data-cl14-drop={d.key} data-n={d.n} onClick={() => { if (d.clearsSearch) setSearch(""); else setFilters(d.drop(filters)); }}>
                      Drop <em>{d.label}</em><small>{d.n} {d.n === 1 ? "agent" : "agents"}</small>
                    </button>
                  ))}
                </span>
              )}
              <button type="button" className="cl14-lzc" data-cl13="none-clear" onClick={clearFilters}>Clear all filters</button>
            </div>
          ) : (
            <ContactRows
              groups={shownGroups}
              totals={filtered ? groupTotals : null}
              byId={factsById}
              nowMs={nowMs}
              genreHit={bookHit}
              /* §4: under Status and Action grouping the heading already says it */
              hideYourMove={groupKey === "status" || groupKey === "action"}
              /* §5: Letter draws one panel with letter dividers; any other grouping a powder band per group;
                 v16 §C: no grouping is one panel with no dividers */
              byLetter={groupKey === "letter"}
              ungrouped={groupKey === "none"}
              /* §6: the sortable column labels drive the page's own sort */
              sort={{ key: sortKey, reversed, onSort: setSortKey, onReverse: () => setReversed((r) => !r) }}
              /* §7.7 the keyboard's ring · §7.3 the Find text marked · §7.6 the density */
              focusId={kfId}
              highlight={search.trim()}
              compact={density === "compact"}
              openId={openId}
              newId={newId}
              onOpen={onOpen}
              onAddGenres={(id) => openCard(id, { tab: "want", focus: "genres", from: "slip" })}
              onAddWishlist={(id) => openCard(id, { tab: "want", focus: "wishlist", from: "slip" })}
              onEdit={(id, tab, focus) => openCard(id, { tab, focus, from: "slip" })}
              trayFor={trayFor} onLog={logInPanel}
              onAct={actWithoutCard}
            />
          )}
        </div>
          </div>
        </section>
        )}
        </>
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
                  setSearch("");
                  setGlance(null);
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
              <button type="button" className="act" onClick={() => void runUndoSave()}>
                Undo
              </button>
            ) : null}
            <button type="button" className="dismiss" aria-label="Dismiss" onClick={() => setNotice(null)}>
              ✕
            </button>
          </div>
        )}
        </div>
        {/* v13 §9 — THE APP FOOTER, the group's last row (the Query Centre's arrangement), so its content
            box is the column's. Over a list only: the empty state stays as v12 built it (§1.10). */}
        {showList && <AppFooter onNavigate={(t, sub) => onNavigate?.(t, sub)} />}
        </div>
        </>
        )}
       </div>
       </WorkspacePageGrid>
      </div>


      {/* the card itself is app-level now — AgentCardHost, mounted once by App (Agent card v1 §2) */}
    </div>
  );
};
