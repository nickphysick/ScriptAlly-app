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
import { ContactEmpty } from "./contact/ContactEmpty";
import { ContactExhibit } from "./contact/ContactExhibit";
import { useLivingCountOverride } from "../../lib/livingHeaderReview";

import { useFixedMenu } from "../forms/useFixedMenu";
import { hasPassedOn, hkModel, savedLine, wishlistCheckin, type HkAgentCtx, type HkBook, type HkItem } from "../../lib/contactHousekeeping";
import {
  contactPrefsOf, laterPath, readHkView, settledPath, settledRestorePath, showAllPath, wishlistEveryPath, wishlistNextPath,
  writeHkView, type HkView, type WishlistEvery,
} from "../../lib/contactPrefs";
import { Housekeeping, type FixResult, type HkFix } from "./contact/ContactHousekeeping";
import { applyPatch, cardPatch, draftOf, inversePatch, toContactDraft, type CardDraft } from "../../lib/cardDraft";
import { alsoChanges } from "../../lib/contactEdit";
import { commitCardSave } from "../../lib/agentCardSave";
import type { AgentEditPatch, SaveAgentResult } from "../../lib/saveAgentEdits";
import { commitAgentEdits } from "../../lib/saveAgentEdits";
import { db as firestoreDb } from "../../lib/firebase";
import { agentRows } from "../../lib/contactList";
import {
  AgentCardOptions, openAgentCard, openNewAgentCard, subscribeAgentCardEvents,
  useAgentCardRequest,
} from "../../lib/agentCardStore";
import { useLocation } from "react-router-dom";
import { ContactOpenHeader } from "./contact/ContactOpenHeader";
import {
  type AgentFacts, ContactFilters, GroupKey, SORT_OPTIONS, SortKey as ContactSortKey, agentFacts,
  contactCensus, contactGroups, dropOptions, emptyContactFilters, facetCounts, genreTallies,
  letterCounts, matchesContactFilters, sortFacts,
} from "../../lib/contactList";
import { ContactIndexStrip } from "./contact/ContactIndexStrip";
import { bookGenreHit, bookGenres } from "../../lib/genreMatch";
import { ContactRows } from "./contact/ContactRows";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { ContactListControls, type ContactPop } from "./contact/ContactListControls";
import { ContactFilterStrip } from "./contact/ContactFilterStrip";
import { ContactBarExtras, CountTo, useReflow } from "./contact/ContactTouches";
import { escapeDepth } from "../../lib/escapeStack";
import { usePopover } from "../shell/ListPills";
import { type Density, readListMemory, writeListMemory } from "../../lib/contactListMemory";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import "./contact/contactV11.css";
import "./contact/contactV13.css";
import "./contact/contactV14.css";
import { nextStep } from "../../lib/contactNextStep";
import { ContactListHeading, ContactStrip } from "./contact/ContactStrip";
import { useContactPins } from "./contact/useContactPins";
import { GLANCE_CHIP, glanceModel, glanceOf, type GlanceKey } from "../../lib/contactGlance";
import { holdSidebarCollapsed } from "../shell/useSidebarCollapsed";
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
/** v16 §E — full screen, remembered on this device */
const FULL_KEY = "sa.contactFull";

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
    currentUser, updateUserPaths,
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
  /* v16 §E — FULL SCREEN: the list takes the whole content area and the sidebar goes to its icons. Remembered on
     this device (localStorage `sa.contactFull`, like the sidebar's own setting), so a reload keeps it. */
  const [full, setFullRaw] = useState<boolean>(() => { try { return window.localStorage.getItem(FULL_KEY) === "1"; } catch { return false; } });
  /** the page's scroll position when full screen was turned on: leaving puts it back */
  const fullScroll = useRef<number | null>(null);
  const scrollerOf = () => mainColRef.current?.closest<HTMLElement>(".wpg-scroll") ?? null;
  const setFull = useCallback((on: boolean) => {
    if (on) fullScroll.current = scrollerOf()?.scrollTop ?? 0;
    try { if (on) window.localStorage.setItem(FULL_KEY, "1"); else window.localStorage.removeItem(FULL_KEY); } catch { /* the mode still works for the visit */ }
    setFullRaw(on);
  }, []);

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
  const clearFilters = useCallback(() => { setFilters(emptyContactFilters()); setSearch(""); setGlance(null); }, [setFilters]);
  /* v13 §5 — the controls, one component in two places; the page holds their state and the ONE popover */
  const controls = (
    <ContactListControls
      find={search} onFind={setSearch}
      groupKey={groupKey} onGroup={setGroupKey}
      pop={pop}
      findKey={<kbd className="cl13-kbd" data-cl13="find-key" aria-hidden="true">{shortcutLabel("contactsFind")}</kbd>}
      /* §7.6–7.7 — Comfortable / Compact and the key sheet, at the controls row's right */
      extra={<>
        <ContactBarExtras density={density} onDensity={setDensity} />
        {/* v16 §E — Full screen, at the bar's right */}
        <button type="button" className="cl16-fsb" data-cl16="full" aria-pressed={full} title={`${full ? "Exit full screen" : "Full-screen list"} (${shortcutLabel("contactsFull")})`}
          onClick={() => setFull(!full)}>
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            {full ? <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" /> : <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />}
          </svg>
          {full ? "Exit full screen" : "Full screen"}
        </button>
      </>}
    />
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
   * ⚠️ THE LINE IS READ, NOT RESTATED: the scroller's top, plus its own `scroll-padding-top`, plus the
   * divider's `scroll-margin-top` — the two values a pick's `scrollIntoView` lands by — so a picked
   * letter is always the marked one, and moving either value moves both together. */
  const [markedLetter, setMarkedLetter] = useState<string | null>(null);
  useEffect(() => {
    if (!active || groupKey !== "letter") { setMarkedLetter(null); return; }
    let raf = 0;
    const read = () => {
      raf = 0;
      const col = mainColRef.current;
      const scroller = col?.closest<HTMLElement>(".wpg-scroll");
      const bands = col ? Array.from(col.querySelectorAll<HTMLElement>('[data-clv="band"][data-letter]')) : [];
      if (!col || !scroller || !bands.length) return;
      const line = scroller.getBoundingClientRect().top
        + (parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0)
        + (parseFloat(getComputedStyle(bands[0]).scrollMarginTop) || 0) + 2;
      let cur: string | null = null;
      for (const band of bands) {
        if (band.getBoundingClientRect().top <= line) cur = band.dataset.letter ?? null;
        else break;
      }
      setMarkedLetter((m) => (m === cur ? m : cur));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [active, groupKey, visibleFacts]);

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
  const pickLetter = useCallback((letter: string | null) => {
    const col = mainColRef.current;
    const sc = col?.closest<HTMLElement>(".wpg-scroll");
    if (!col || !sc) return;
    if (letter === null) {
      setMarkedLetter(null);
      sc.scrollTo({ top: Math.max(0, sc.scrollTop + col.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12), behavior: "instant" as ScrollBehavior });
      return;
    }
    const toBand = () => { const b = col.querySelector<HTMLElement>(`[data-clv="band"][data-letter="${letter}"]`); if (b) landUnder(b); };
    if (groupKey === "none") {
      const row = col.querySelector<HTMLElement>(`[data-clv="row"][data-initial="${letter}"]`);
      if (!row) return;
      landUnder(row);
      row.setAttribute("data-wash", "");
      window.setTimeout(() => row.removeAttribute("data-wash"), 1400);
      return;
    }
    setMarkedLetter(letter);
    if (groupKey !== "letter") { setGroupKey("letter"); window.setTimeout(toBand, 0); } else toBand();
  }, [groupKey, landUnder]);
  const stripCounts = useMemo(() => letterCounts(visibleFacts), [visibleFacts]);
  /* v16 §D — "↑ Summary": the page's top, and focus on its heading. No smooth scroll under reduced motion. */
  const toSummary = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const sc = e.currentTarget.closest<HTMLElement>(".wpg-scroll");
    const h1 = e.currentTarget.closest<HTMLElement>(".clv-group")?.querySelector<HTMLElement>("h1[data-page-title]");
    sc?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  }, []);

  /**
   * Loading · blank account · list — the page's three states, derived once in `agentList.ts` and
   * never restated here. See `contactListState` for why there are three of them and why the
   * unsaved stub is one of its inputs.
   */
  /* v16 §D — the list's controls pin (the hook re-binds when the list mounts or its grouping changes its layers) */
  const [pinsOn, setPinsOn] = useState(false);
  useContactPins(wsRef, pinsOn, groupKey);
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
  useEffect(() => { setPinsOn(showList); }, [showList]);
  /* v16 §E — full screen is on only over a list, on this page's own route */
  const fullOn = full && showList;
  /* the sidebar is HELD in its icon state while full screen is on and this is the page on screen; letting go
     returns it to the writer's own setting (the shell's one collapsed state: a hold beside it, never a second
     sidebar). A layout effect, so a reload in full screen paints collapsed first. */
  useLayoutEffect(() => {
    holdSidebarCollapsed(fullOn && active);
    return () => holdSidebarCollapsed(false);
  }, [fullOn, active]);
  /* on: the list sits at the top. Off: the page returns to the scroll position it had before — set at once, and
     again once the sidebar has finished opening (0.24s), in case the page was briefly too short to hold it. */
  const fullWas = useRef(fullOn);
  useLayoutEffect(() => {
    if (fullWas.current === fullOn) return undefined;
    fullWas.current = fullOn;
    const sc = scrollerOf();
    if (!sc) return undefined;
    if (fullOn) { sc.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); return undefined; }
    const back = fullScroll.current;
    fullScroll.current = null;
    if (back == null) return undefined;
    const put = () => sc.scrollTo({ top: back, behavior: "instant" as ScrollBehavior });
    put();
    const t = window.setTimeout(put, 320);
    return () => window.clearTimeout(t);
  }, [fullOn]);
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
  const cardReq = useAgentCardRequest();
  const openId = cardReq?.agentId ?? null;
  /** the list's current order and filter — what the card's ‹ › step through */
  const sequence = useMemo(() => visibleFacts.map((x) => x.agent.id), [visibleFacts]);
  const openCard = useCallback((agentId: string, opts: AgentCardOptions = {}) => {
    if (!agents.some((a) => a.id === agentId)) return;
    openAgentCard(agentId, { ...opts, sequence });
  }, [agents, sequence]);
  /** OPEN the card on this agent — reading, from the top (v11 §7.1) — growing out of the row. */
  const onOpen = useCallback((agentId: string, from?: DOMRect) => openCard(agentId, {
    from: "row",
    originRect: from ? { x: from.x, y: from.y, width: from.width, height: from.height } : null,
  }), [openCard]);
  /** a Housekeeping name opens the card too — but it is not a list row, so the card lifts */

  /* ‹ › on the card move the SAME session to the next agent; the list scrolls that row into view
     behind the card, and its ring (aria-current, from `openId`) has already moved with it. */
  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    const was = lastOpen.current;
    lastOpen.current = openId;
    if (!was || !openId || was === openId) return;
    const row = [...document.querySelectorAll<HTMLElement>(`[data-agent-card="${openId}"]`)].find((e) => e.getBoundingClientRect().height > 0);
    row?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [openId]);
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
  const hk = useMemo(() => hkModel(agents, hkCtxOf, hkPrefs), [agents, hkCtxOf, hkPrefs]);
  const hkCheckin = useMemo(() => wishlistCheckin(agents, hkCtxOf, hkPrefs, hkToday), [agents, hkCtxOf, hkPrefs, hkToday]);
  const hkBook: HkBook = useMemo(() => ({ title: scoped?.title?.trim() || null, genre: scoped?.genre?.trim() || null, genres: book }), [scoped, book]);
  const [hkOpen, setHkOpen] = useState(false);
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
    openAgentCard(item.agent.id, { tab: t.tab, focus: t.focus, prefill: Object.keys(prefill).length ? prefill : undefined, from: "hk", sequence });
  }, [sequence]);

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
      if (document.querySelector(".qad-root.is-open") || escapeDepth() > 0) return;
      /* §7.7 — the row keys: J K / ↑ ↓ move the ring (scrolling to keep it in view, its tray showing), Enter opens
         the card, L starts the next action, Esc lets go. Enter, L and Esc act only while a ring is held, and Enter
         only from the page itself — a focused control answers its own Enter. */
      if (down || up || openK || actK || letGo) {
        const r = rowKeys.current;
        /* v16 §E: Escape with no row held leaves full screen (a held row lets go first; an open panel, popover or
           drawer has already taken the key, above) */
        if (letGo && !r.kfId && k.full) { e.preventDefault(); k.setFull(false); return; }
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
      if (hk) { setHkOpen(true); return; }
      /* / — the bar's Find, the panel scrolled into view first so the field a writer is typing into is on screen */
      const input = [...document.querySelectorAll<HTMLInputElement>('[data-cl13-find="banner"] input')].find((x) => x.getBoundingClientRect().height > 0);
      if (!input) return;
      wsRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
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
          <ContactEmpty
            manuscriptTitle={scoped?.title?.trim() || null}
            genre={scoped?.genre ?? null}
            addRef={addBtnRef}
            /* v12: the quick-add drop and the paste pill are retired — the one door is the card
               (its link mode survives INSIDE the card), and the secondary is Discover, matching
               the populated header (LH7's same-shape claim) */
            onAdd={openAdd}
            /* the ways' recommended tile — the same bridge the rail's Import entry takes */
            onImport={() => onNavigate?.("import")}
            /* the bridge App.tsx already maps to `/agents/discover`; OMITTED when it cannot be taken */
            onDiscover={DISCOVER && onNavigate ? () => onNavigate(DISCOVER.tab, DISCOVER.sub) : undefined}
            /* §4 — the page's own components over a sample constant, mounted ONLY on the empty page */
            exhibition={<ContactExhibit />}
          />
        ) : (
        <>
        {/* v13 §5 — THE STICKY SLIM BAR, outside the group's grid so it sticks to the scroller's top
            across the whole page: "Every agent", the count, the mini A–Z (1441px and wider) and the
            same controls as the banner's, sharing their state. */}
        {/* v13 §6 — HOUSEKEEPING: the floating tab in the window's corner and the half-screen drawer it
            opens (both portalled; the tab only while this is the page on screen) */}
        {showList && (
          <Housekeeping
            model={hk} checkin={hkCheckin} every={hkPrefs.wishlistEvery} book={hkBook} today={hkToday} agents={agents}
            open={hkOpen} onOpen={() => setHkOpen(true)} onClose={() => setHkOpen(false)}
            view={hkView} onView={setHkView} routeActive={active} keyHint={shortcutLabel("contactsHk")}
            onFix={onHkFix}
            onLater={async (item) => { await updateUserPaths(laterPath(item.agent.id, item.gap, hkToday)); }}
            onShowAll={async () => { await updateUserPaths(showAllPath()); }}
            onCard={onHkCard}
            onAgentCard={(id, tab) => openAgentCard(id, { tab, from: "hk", sequence })}
            alsoFor={hkAlsoFor}
            onCheckinEvery={async (every: WishlistEvery) => { await updateUserPaths(wishlistEveryPath(every)); }}
            onCheckinNext={async () => { await updateUserPaths(wishlistNextPath(hkPrefs, hkToday)); }}
            onWishlistStill={onWishlistStill}
            onWishlistChanged={(id) => openAgentCard(id, { tab: "want", focus: "wishlist", from: "hk", sequence })}
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
        {/* v16 §A — THE TITLE PANEL: "Every agent, in one place", the book in its subline, two buttons and the hawk
            on its disc. Over a LIST only (and while settling): the blank account's pitch is ContactEmpty. */}
        {(showList || pageState === "settling") && (
          <ContactOpenHeader loading={pageState !== "list"} msTitle={scoped?.title?.trim() || null} addRef={addBtnRef} onAdd={openAdd}
            onDiscover={DISCOVER && onNavigate ? () => onNavigate(DISCOVER.tab, DISCOVER.sub) : undefined} />
        )}
        {pageState === "settling" && (
          <ContactSkeleton controls={controls} />
        )}
        {/* v16 §B — "At a glance": four cells; choosing one filters the list and never scrolls */}
        {showList && (
          <ContactStrip model={glanceM} active={glance}
            onGroup={(k) => setGlance((g) => (g === k ? null : k))} onAll={() => setGlance(null)} />
        )}
        {/* v16 §C — "The full list": the strip's heading row again, on the column, leading into the list */}
        {showList && <ContactListHeading />}
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
          {/* v16 §D — the pin line's sentinel: zero height, above everything in the list that changes size */}
          <i className="cl16-sentinel" data-cl16="pin-sentinel" aria-hidden="true" />
          {/* the bar's sticky box is its wrapper: pinned, the wrapper paints the page's colour behind the bar's
              rounded corners, so no row shows through them */}
          <div className="cl16-barpin" data-cl16="bar-pin"><div className="cl14-bar cl16-bar" data-cl16="bar">{controls}</div></div>
          {/* the filter row: the chips on one line, folding into "More filters" when they would wrap; the count right */}
          <div className="cl14-frow cl16-frow" data-cl14="frow" data-cl16="frow">
            <ContactFilterStrip filters={filters} onFilters={setFilters} counts={counts} tallies={tallies} pop={pop}
              extraOn={!!glance} onClearAll={() => { setFilters(emptyContactFilters()); setGlance(null); }} />
            {fullOn ? (
              /* v16 §E — in full screen the strip is hidden, so its three groups ride here: each sets and clears
                 the same group filter */
              <span className="cl16-fchips" data-cl16="full-chips" role="group" aria-label="Show a group">
                {glanceM.cells.map((c) => (
                  <button key={c.key} type="button" className="cl16-fchip" data-cl16="full-chip" data-k={c.key} aria-pressed={glance === c.key}
                    onClick={() => setGlance((g) => (g === c.key ? null : c.key))}>
                    <b>{c.n}</b> {GLANCE_CHIP[c.key]}
                  </button>
                ))}
              </span>
            ) : (
              <>
              <span className="cl16-showing" data-cl16="showing" role="status">
                Showing <b data-cl14="shown"><CountTo value={visibleFacts.length} /></b> of <b data-cl16="total">{factsAll.length}</b>
                {scoped?.title?.trim() ? <span className="cl16-for" data-cl16="showing-for"> for <b>{scoped.title.trim()}</b></span> : null}
              </span>
              {/* v16 §D — shown only while the controls are pinned (CSS, off `data-pinned`): back to the top of the page */}
              <button type="button" className="cl16-sum" data-cl16="summary" onClick={toSummary}><span aria-hidden="true">{"\u2191"}</span> Summary</button>
              </>
            )}
          </div>
          <div className="cl14-list" data-cl14="list">
          {/* the letter tabs, under every grouping: they scroll away with the list and never pin */}
          <ContactIndexStrip total={visibleFacts.length} counts={stripCounts} marked={groupKey === "letter" ? markedLetter : null} onPick={pickLetter} />
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
              trayFor={trayFor}
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
