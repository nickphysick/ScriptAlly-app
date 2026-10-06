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
import { contactHeaderCopy } from "../../lib/livingHeaders";
import { useLivingCountOverride } from "../../lib/livingHeaderReview";
import type { LivingHeader } from "../shell/PageHeader";

import { useFixedMenu } from "../forms/useFixedMenu";
import { HkBand, hkModel } from "../../lib/contactHousekeeping";
import { agentRows } from "../../lib/contactList";
import { agentDataQualityNeeds } from "../../lib/agentDataQuality";
import { flagKeyForTask } from "../../lib/taskFlags";
import {
  AgentCardOptions, openAgentCard, openNewAgentCard, subscribeAgentCardEvents,
  useAgentCardRequest,
} from "../../lib/agentCardStore";
import { useLocation } from "react-router-dom";
import { CONTACT_BAND_DISC, CONTACT_HAWK } from "./contact/ContactHeader";
import { PageHeader } from "../shell/PageHeader";
import {
  type AgentFacts, ContactFilters, FILTER_SECTIONS, type FilterCtx, GroupKey, SORT_OPTIONS, SortKey as ContactSortKey, agentFacts,
  contactCensus, contactFilterCount, contactGroups, emptyContactFilters, facetOptions, heroFacts,
  letterCounts, matchesContactFilters, sortFacts,
} from "../../lib/contactList";
import { ContactIndexStrip } from "./contact/ContactIndexStrip";
import { isGenreMatch } from "../../lib/genreMatch";
import { ContactRows } from "./contact/ContactRows";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { ContactListControls, type ContactPop, filterValueLabel } from "./contact/ContactListControls";
import { OpenBanner } from "../shell/OpenBanner";
import { StickyBar, useStuckPast } from "../shell/StickyBar";
import { Workspace } from "../shell/Workspace";
import { usePopover } from "../shell/ListPills";
import { readListMemory, writeListMemory } from "../../lib/contactListMemory";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import "./contact/contactV11.css";
import "./contact/contactV13.css";
import { ContactStrip, type FigureKey } from "./contact/ContactStrip";
import { stripFacts, fitsGenre, genrePluralLower } from "../../lib/contactStrip";
import { Carousel } from "../shell/Carousel";
import { AgentCarouselCard } from "./card/AgentCarouselCard";
import { FIGURE_LABEL, SET_LABEL, carouselSet, figureSet, type CarouselSet } from "../../lib/contactCarousel";
import { cardQuery, cardRows, primaryFor, type CardAct } from "../../lib/agentCard";
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
  /* ⚠️ THE SWITCHER RE-OPENS THE ROUTE (page header v2 §4.5), so a switch is a new location KEY on
     the same path — and that key is what the scope reads on. Memoised on `manuscripts` alone, the
     page went on stating the old book's facts after the bar had changed book. */
  const { key: locationKey } = useLocation();
  const { agents, queries, manuscripts, activities, updateAgent, collectionsReady, userTasks, addUserTask, resolveTaskFlag } =
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the switch's signal
  }, [manuscripts, locationKey]);
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
  const [search, setSearch] = useState(() => searchQuery?.trim() || remembered?.search || "");
  /* v12 §9: the page opens on the card index — grouped by letter, ordered by surname */
  const [groupKey, setGroupKey] = useState<GroupKey>(() => remembered?.group ?? "letter");
  const [sortKey, setSortKeyRaw] = useState<ContactSortKey>(() => remembered?.sort ?? "surname");
  const [reversed, setReversed] = useState<boolean>(() => remembered?.reversed ?? false);
  /* choosing a sort resets the direction to its natural order (§5) */
  const setSortKey = useCallback((k: ContactSortKey) => { setSortKeyRaw(k); setReversed(false); }, []);
  useEffect(() => { writeListMemory({ filters, search, group: groupKey, sort: sortKey, reversed }); }, [filters, search, groupKey, sortKey, reversed]);
  const pop = usePopover<ContactPop>();

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
  /* v13 §3 — THE NUMBERS STRIP: over the agents the list shows BEFORE filtering, never the filtered set.
     A pressed figure fills the carousel (Phase 2b) and never touches the list's filters. */
  const strip = useMemo(() => stripFacts(agents, scoped?.genre ?? null, nowMs), [agents, scoped, nowMs]);
  const [figure, setFigure] = useState<FigureKey | null>(null);
  const pressFigure = useCallback((k: FigureKey) => setFigure((f) => (f === k ? null : k)), []);
  const factsAll = useMemo(
    () => agents.map((a) => agentFacts(a, qcRows, scoped?.id ?? null)),
    [agents, qcRows, scoped],
  );
  const genreHitFact = useCallback(
    (x: { genres: string[] }) => !!tintGenre && x.genres.some((g) => isGenreMatch(g, tintGenre)),
    [tintGenre],
  );
  const inPool = useCallback(
    (x: { agent: Agent; stand: string }) => matchesAgentSearch(x.agent, search),
    [search],
  );
  /* v13 §5: "Fit for the book" reads the hero's genre match; "Has gaps to fill" the four profile gaps
     the mock names (reply time, genres, wishlist, what they want you to send) */
  const filterCtx = useMemo<FilterCtx>(() => ({
    fits: (x) => genreHitFact(x),
    gaps: (x) => !(typeof x.agent.responseTimeWeeks === "number" && x.agent.responseTimeWeeks > 0)
      || (x.agent.genres ?? []).length === 0 || !(x.agent.mswlNotes ?? "").trim() || (x.agent.materialsWanted ?? []).length === 0,
  }), [genreHitFact]);
  const genreWord = scoped?.genre && tintGenre ? genrePluralLower(scoped.genre) : null;
  const filterOptions = useMemo(() => facetOptions(factsAll, filters, inPool, filterCtx), [factsAll, filters, inPool, filterCtx]);
  const visibleFacts = useMemo(
    () => sortFacts(
      factsAll.filter((x) => inPool(x) && matchesContactFilters(x, filters, undefined, filterCtx)),
      sortKey, genreHitFact, nowMs, reversed,
    ),
    [factsAll, inPool, filters, filterCtx, sortKey, genreHitFact, nowMs, reversed],
  );
  const groupCtx = useMemo(() => ({ fits: genreHitFact, genreWord }), [genreHitFact, genreWord]);
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
  const shownGroups = groups;
  const visible = visibleFacts;
  const anyActive =
    contactFilterCount(filters) > 0 || search.trim() !== ""
    || groupKey !== "letter" || sortKey !== "surname";
  /* v13 §5 — the filter line's chips: one per active filter value, and the search text */
  const lineChips = useMemo(() => {
    const out: { key: string; label: string; remove: () => void }[] = [];
    for (const sec of FILTER_SECTIONS) {
      for (const v of filters[sec] as (string | number)[]) {
        out.push({
          key: `${sec}:${v}`, label: filterValueLabel(sec, String(v), genreWord),
          remove: () => setFilters((f) => ({ ...f, [sec]: (f[sec] as unknown[]).filter((x) => x !== v) }) as ContactFilters),
        });
      }
    }
    if (search.trim()) out.push({ key: "find", label: `\u201c${search.trim()}\u201d`, remove: () => setSearch("") });
    return out;
  }, [filters, search, genreWord]);
  const clearFilters = useCallback(() => { setFilters(emptyContactFilters()); setSearch(""); }, []);
  /* "M NEED YOU" — the agents whose move it is (the v12 union: requests, offers and past-date nudges) */
  const needYou = useMemo(() => factsAll.filter((x) => x.stand === "you").length, [factsAll]);
  /* v13 §5 — the controls, one component in two places; the page holds their state and the ONE popover */
  const controlsFor = (where: "banner" | "sticky") => (
    <ContactListControls
      where={where} find={search} onFind={setSearch}
      filters={filters} onFilters={setFilters} options={filterOptions}
      groupKey={groupKey} onGroup={setGroupKey}
      sortKey={sortKey} reversed={reversed} onSort={setSortKey} onReverse={() => setReversed((r) => !r)}
      pop={pop} msTitle={scoped?.title?.trim() || null} genreWord={genreWord}
    />
  );
  const bannerRef = useRef<HTMLDivElement | null>(null);

  const resetList = useCallback(() => {
    setFilters(emptyContactFilters());
    setSearch("");
    setGroupKey("letter");
    setSortKey("surname");
  }, [setSortKey]);

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

  /* a letter scrolls its divider under the sticky bar (the divider's own scroll-margin-top lands
     it); under another grouping the pick RESTORES the letter grouping first. "All" clears the mark
     and returns to the top of the list. */
  const pickLetter = useCallback((letter: string | null) => {
    const behavior = prefersReducedMotion() ? ("auto" as const) : ("smooth" as const);
    const toBand = (L: string) =>
      mainColRef.current
        ?.querySelector(`[data-clv="band"][data-letter="${L}"]`)
        ?.scrollIntoView({ block: "start", behavior });
    if (letter === null) {
      setMarkedLetter(null);
      mainColRef.current?.scrollIntoView({ block: "start", behavior });
      return;
    }
    setMarkedLetter(letter);
    if (groupKey !== "letter") {
      setGroupKey("letter");
      window.setTimeout(() => toBand(letter), 0);
    } else {
      toBand(letter);
    }
  }, [groupKey]);
  const stripCounts = useMemo(() => letterCounts(visibleFacts), [visibleFacts]);

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

  /* ⚠️ LIVING HEADERS (§1–§3). The headline is the scale and the subline the one thing that needs the
     writer next, both DERIVED here from the QC's own rows and never stored. While the page settles
     the header renders its fixed shape with both lines empty (count null) — never the page name.
     The dev review aid (`__SA_LH_COUNT`) fabricates the COUNT only; gated at the call site so a
     production build never reaches the module. */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const lhOverride = import.meta.env.MODE !== "production" ? useLivingCountOverride() : null;
  const showEmpty = pageState === "blank" || (pageState === "list" && lhOverride === 0);
  const showList = pageState === "list" && !showEmpty;
  /* v13 §5 — the sticky slim bar: on once the banner has scrolled off, gone once the list has. ⚠️ Read
     BELOW `showList` (a TS2448 caught it above), and bound again when the list arrives. */
  const stuck = useStuckPast(bannerRef, mainColRef, showList);

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
  const onHkOpen = useCallback((agentId: string) => openCard(agentId, { from: "hk" }), [openCard]);

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
      const survives = inPool(savedFacts) && matchesContactFilters(savedFacts, filters, undefined, filterCtx);
      const afterAll = [...agents.filter((a) => a.id !== saved.id), saved]
        .map((a) => (a.id === saved.id ? savedFacts : (factsById.get(a.id) ?? agentFacts(a, qcRows, scoped?.id ?? null))));
      const after = sortFacts(
        afterAll.filter((x) => inPool(x) && matchesContactFilters(x, filters, undefined, filterCtx)),
        sortKey, genreHitFact, nowMs, reversed,
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
        // the card's snapshot Undo, when it could take one
        canUndo: !!undoSave.current,
      });

      /* the list reflows under the store's own update — measure BEFORE it lands so the FLIP
         can play the move (rows carry data-agent-card, flip.ts's selector) */
      flipBefore.current = measureFlip(gridRef.current);
    },
    [agents, filters, filterCtx, sortKey, reversed, genreHitFact, nowMs, qcRows, scoped, factsById, inPool],
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

  /* ── v13 §4 — "Who to query next" ─────────────────────────────────────────────────────────────
     ⚠️ A PRESSED FIGURE REPLACES THE SET; IT NEVER TOUCHES THE LIST. Its key lives in `figure` and
     nothing in the list's filter/search/group/sort reads it (lock 3). A selector choice, Clear, or the
     figure pressed again hands the carousel back to the set it was showing. */
  const [czSet, setCzSet] = useState<CarouselSet>("fit");
  /* ⚠️ THE CAROUSEL READS EVERY AGENT'S FACTS, NEVER THE LIST'S FILTERED `factsById` — a Find or a
     filter on the list must not empty the carousel (lock 3 holds both directions). */
  const czFactsById = useMemo(() => new Map(factsAll.map((x) => [x.agent.id, x])), [factsAll]);
  /* `onHkRemind` is declared further down; the act handler reads it through a ref, never a TDZ read */
  const remindRef = useRef<(a: Agent) => void>(() => {});
  const czInput = useMemo(() => ({
    agents,
    queried: (a: Agent) => (czFactsById.get(a.id)?.standing.kind ?? "none") !== "none",
    msGenre: scoped?.genre ?? null,
    nowMs,
  }), [agents, czFactsById, scoped, nowMs]);
  const czCounts = useMemo(() => ({
    fit: carouselSet("fit", czInput).length, new: carouselSet("new", czInput).length, reopen: carouselSet("reopen", czInput).length,
  }), [czInput]);
  const czItems = useMemo(() => (figure ? figureSet(figure, czInput) : carouselSet(czSet, czInput)), [figure, czSet, czInput]);
  const czMs = scoped?.title?.trim() || null;
  const czNote = figure
    ? { fit: `Take ${scoped?.genre ? genrePluralLower(scoped.genre) : "your genre"} · not queried first`, open: "Open to queries · not queried first", added: "Newest first" }[figure]
    : { fit: czMs ? `Fit ${czMs} · not queried yet` : "Not queried yet", new: `The last ${czCounts.new} you added`, reopen: "Closed now, reopening soon" }[czSet];
  const fitWord = scoped?.genre && tintGenre ? genrePluralLower(scoped.genre) : null;
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

  /* ── Housekeeping (v11 §9) ────────────────────────────────────────────────────────────────
     The gap model over the WHOLE list. "Live" is any live query whatever the manuscript — the
     reply window fans out to every query, so the scope chip has no say here — and the reopen
     flag reads the writer's own undone dated tasks (ruling b), so completing the reminder in
     To-do reopens the gap here by construction. */
  const hkLiveById = useMemo(() => {
    const m = new Map<string, HkBand>();
    for (const a of agents) {
      const mine = agentRows(qcRows, a.id, null);
      m.set(a.id, mine.some((r) => r.court !== "closed") ? "live" : mine.length === 0 ? "never" : "closed");
    }
    return m;
  }, [agents, qcRows]);
  const hkReopenTaskById = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const t of userTasks ?? []) {
      if (t.agentId && !t.done && (t.dueDate ?? "").trim()) m.set(t.agentId, true);
    }
    return m;
  }, [userTasks]);
  const hk = useMemo(
    () => hkModel(
      agents,
      (a) => ({ hasLiveQuery: hkLiveById.get(a.id) === "live", hasReopenTask: hkReopenTaskById.get(a.id) ?? false, nowMs }),
      (a) => hkLiveById.get(a.id) ?? "never",
    ),
    [agents, hkLiveById, hkReopenTaskById, nowMs],
  );
  /* v12: the subline is the card index's sentence — `facts` (want/fresh/genre/title, the page's
     own derivation). v13 §2: its second sentence (the stated-windows mean) is gone; the numbers
     strip states the typical reply. The living memo still reads no `hk`. */
  const living = useMemo<LivingHeader>(() => {
    const rows = scoped ? qcRows.filter((r) => r.query.manuscriptId === scoped.id) : qcRows;
    const agentsById = new Map(agents.map((a) => [a.id, a]));
    return {
      count: pageState === "list" ? (lhOverride ?? agents.length) : null,
      copy: (n) => contactHeaderCopy(n, { rows, agentsById, nowMs: Date.now(), agents, facts }),
    };
  }, [pageState, lhOverride, agents, qcRows, scoped, facts]);

  /* the three direct fixes — through the CONTEXT writers (the hkSave discipline, lib/hkSave.ts):
     the same updateAgent To-do's rail writes with, and the dq flag resolved when this was the
     agent's last data-quality gap, so "cleared today" agrees across the two surfaces */
  const onHkInlineSave = useCallback(async (agentId: string, weeks: number) => {
    const agent = agents.find((a) => a.id === agentId);
    await updateAgent(agentId, { responseTimeWeeks: weeks });
    if (agent && agentDataQualityNeeds(agent).length === 1) void resolveTaskFlag(flagKeyForTask("data_quality_poor", agentId));
  }, [agents, updateAgent, resolveTaskFlag]);
  const onHkChecked = useCallback(async (agentId: string) => {
    await updateAgent(agentId, { mswlCheckedAt: new Date().toISOString() } as Partial<Agent>);
  }, [updateAgent]);
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
        {showList && (
          <StickyBar stuck={stuck} probe="contacts">
            <b className="cl13-sb-t">Every agent</b>
            <span className="cl13-sb-k">{visibleFacts.length} {visibleFacts.length === 1 ? "AGENT" : "AGENTS"}</span>
            {groupKey === "letter" && (
              <span className="cl13-mz" data-cl13="mz">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((L) => (
                  <button key={L} type="button" className={`${stripCounts.get(L) ? "" : "off"}${markedLetter === L ? " on" : ""}`}
                    disabled={!stripCounts.get(L)} onClick={() => pickLetter(L)}>{L}</button>
                ))}
              </span>
            )}
            <span className="cl13-sb-sp" />
            {controlsFor("sticky")}
          </StickyBar>
        )}
        <div className="clv-group">
        {/* ⚠️ THE SHARED FULL HEADER (page header v2 §4): the Query Centre's component, frame and rule.
            It spans the whole group — column AND rail — so the Housekeeping rail starts below the
            rule, as the Birds-eye rail does. It renders over a LIST only: the blank account's pitch
            is its own page, and a header stating figures about nothing would be the empty-desk fault. */}
        {/* v12 §3: the living header carries the whole sentence (no description line); the
            anthracite pill opens the centred add card DIRECTLY — the quick-add drop and the
            "Paste a link" pill are retired (the link door lives inside the card); the art is
            the full painting, in the shared art box, never behind the text. */}
        {(showList || pageState === "settling") && (
          <PageHeader
            variant="full"
            title="Contact list"
            living={living}
            primaryRef={addBtnRef}
            primary={{ label: "+ Add an agent", onClick: openAdd }}
            secondary={{ label: "Discover agents", onClick: () => { if (DISCOVER) onNavigate?.(DISCOVER.tab, DISCOVER.sub); } }}
            /* v13 §2 — THE BAND (the Query Centre's, `PageHeader band`): full-bleed anthracite under the
               top bar, the Archivist in a 290px white disc on the text's right. */
            band
            art={<span className="clv-bdisc"><img src={`${CONTACT_BAND_DISC.src}?v=${CONTACT_BAND_DISC.version}`} width={CONTACT_BAND_DISC.width} height={CONTACT_BAND_DISC.height} alt="" /></span>}
          />
        )}
        {/* v13 §3 — the numbers strip, one rhythm step under the band, the whole group's width */}
        {showList && <ContactStrip facts={strip} selected={figure} onPress={pressFigure} />}
        {/* v13 §4 — "Who to query next": the shared carousel shell, the agent card in its carousel dress */}
        {showList && (
          <Carousel
            probe="contacts"
            className={`cl13-cz${figure ? " is-fig" : ""}`}
            label="Who to query next"
            title={figure ? `${FIGURE_LABEL[figure]} · ${czItems.length}` : "Who to query next"}
            note={czNote}
            resetKey={figure ?? czSet}
            controls={(
              <>
                {figure && <button type="button" className="cl13-clear" data-cl13="cz-clear" onClick={() => setFigure(null)}>{"✕"} Clear</button>}
                <div className="cl13-seg" role="group" aria-label="Choose what the carousel shows" data-cl13="cz-seg">
                  {(["fit", "new", "reopen"] as CarouselSet[]).map((k) => (
                    <button key={k} type="button" aria-pressed={!figure && czSet === k} data-cz-set={k}
                      onClick={() => { setFigure(null); setCzSet(k); }}>
                      {SET_LABEL[k]}<em>{czCounts[k]}</em>
                    </button>
                  ))}
                </div>
              </>
            )}
            items={czItems}
            itemKey={(a) => a.id}
            empty={figure ? "No agents here." : { fit: "No open agent who fits is left to query.", new: "No agents yet.", reopen: "Nobody is closed to queries." }[czSet]}
            renderItem={(a) => {
              const f = czFactsById.get(a.id);
              if (!f) return null;
              return (
                <AgentCarouselCard
                  agent={a} facts={f}
                  q={cardQuery(cardRows(qcRows, a.id, scoped?.id ?? null))}
                  genreHit={(g) => !!tintGenre && isGenreMatch(g, tintGenre)}
                  fitWord={fitWord} fits={fitsGenre(a, scoped?.genre ?? null)}
                  onOpen={(id, rect) => onOpen(id, rect)}
                  onAdd={(id, focus) => openCard(id, { tab: "want", focus, from: "slip" })}
                  onAct={actWithoutCard}
                />
              );
            }}
          />
        )}
        <div className="clv-main" ref={mainColRef}>

        {/* LIVING HEADERS §3 — the blank account is `ContactEmpty` above, in place of this whole group;
            `settling` draws the header's fixed shape with both lines empty and nothing below it. The
            filtered "No agents match." branch below is reachable only with agents on file. */}
        {!showList ? null : (
        <>

        {/* v13 §5 — THE OPEN BANNER: the perched Archivist, "N AGENTS · M NEED YOU", the heading, the
            sentence, and the controls right-aligned. It replaces v12's head row (ContactControls). */}
        {showList && (
          <OpenBanner
            probe="contacts" bannerRef={bannerRef}
            figure={{ src: `${CONTACT_HAWK.src}?v=${CONTACT_HAWK.version}`, width: CONTACT_HAWK.width, height: CONTACT_HAWK.height }}
            eyebrow={<span data-cl13="lk">{agents.length} {agents.length === 1 ? "agent" : "agents"} {"\u00b7"} {needYou} need you</span>}
            heading="Every agent, on file."
            sentence={scoped?.title?.trim()
              ? <>Your card index for <b>{scoped.title.trim()}</b>: what each agent wants, how fast they reply, and where your query to them stands.</>
              : <>Your card index: what each agent wants, how fast they reply, and where your query to them stands.</>}
            controls={controlsFor("banner")}
          />
        )}
        {/* v13 §5 — the filter line, while anything narrows the list: what is showing, a chip per
            filter and the search, and Clear all. It replaces v12's floating bar (ContactBar). */}
        {showList && filtered && (
          <div className="cl13-fline" data-cl13="fline" role="status">
            <span>Showing <b>{visibleFacts.length}</b> of {factsAll.length}</span>
            {lineChips.map((c) => (
              <span key={c.key} className="cl13-fchip" data-cl13-chip={c.key}>
                {c.label}<button type="button" aria-label={`Remove ${c.label}`} onClick={c.remove}>{"\u2715"}</button>
              </span>
            ))}
            <button type="button" className="cl13-clr" data-cl13="clear-all" onClick={clearFilters}>Clear all</button>
          </div>
        )}
        {/* v13 §6 — THE WORKSPACE: the slate ground the list sits on, under the banner (the shared
            component, slate here as blush is the Query Centre's). The A–Z strip heads it, white and
            no longer sticky; the letter dividers and the rows are floating cards on it. */}
        {showList && (
        <Workspace tray="var(--clv-slate-tray)" probe="contacts">
        {/* ⚠️ v12 §4: THE INDEX STRIP — it indexes the SAME filtered set the list shows (one derivation,
            two readers). Letters only, as the mock's (`display: none` under any other grouping). */}
        {groupKey === "letter" && (
          <ContactIndexStrip
            total={visibleFacts.length}
            counts={stripCounts}
            marked={markedLetter}
            onPick={pickLetter}
          />
        )}
        {/* ⚠️ ONE SET OF AGENTS, ONE RENDERER (v11 decision 1) — grouped bands over rows. The
            FLIP container moved with the renderer: rows carry data-agent-card, flip.ts's own
            default selector, so a filter change still animates the reflow. */}
        <div ref={gridRef}>
          {visible.length === 0 ? (
            <div className="agl-empty" data-cl13="none">
              <div className="big">No agents match these filters.</div>
              <div className="small">Loosen the filter, or clear the search. <button type="button" className="cl13-none-clr" data-cl13="none-clear" onClick={clearFilters}>Clear filters</button></div>
            </div>
          ) : (
            <ContactRows
              groups={shownGroups}
              totals={filtered ? groupTotals : null}
              byId={factsById}
              nowMs={nowMs}
              genreHit={(g) => !!tintGenre && isGenreMatch(g, tintGenre)}
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
        </Workspace>
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
