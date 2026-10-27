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
import { flushSync } from "react-dom";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WorkspacePageGrid } from "../shell/WorkspacePageGrid";
import { useScriptAllyDb } from "../../lib/db";
import { Agent } from "../../types";
import { contactListState, matchesAgentSearch } from "../../lib/agentList";
import { prefersReducedMotion } from "../../lib/agentMotion";
import { reopenReminder } from "../../lib/agentCard";
import { SaveOutcome, saveNotice } from "../../lib/agentSaveOutcome";
import { ContactEmptyPage } from "./contact/ContactEmptyPage";
import { useLivingCountOverride } from "../../lib/livingHeaderReview";
import { hkAllFilled } from "../../lib/hkReviewAid";
import { INTRO_PATH_V18, dismissPath, dismissedAtGaps, introSeenOf, listHealth, nextDismissed, tabShown } from "../../lib/contactHealth";
import { GAP_FOCUS, agentGapAction, agentGapLine, hasPassedOn, hkModel, savedLine, wishlistCheckin, type HkAgentCtx, type HkBook, type HkItem } from "../../lib/contactHousekeeping";
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
import { contactFilterCount, agentRows } from "../../lib/contactList";
import {
  AgentCardOptions, openAgentCard, openNewAgentCard, subscribeAgentCardEvents,
  useAgentCardRequest,
} from "../../lib/agentCardStore";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ContactHeader25 } from "./contact/ContactHeader24";
import { ContactGlance251 } from "./contact/ContactGlance251";
import { ContactListTitle25 } from "./contact/ContactListTitle25";
import { ContactLogFlow } from "./contact/ContactLogFlow";
import { hostContactLog, type ContactLogSeed } from "../../lib/contactLogStore";
import { GLANCE_ORDER, GLANCE_SETS, glanceCards, type GlanceKey as GlanceCardKey } from "../../lib/contactV25";
import { ContactSheet24, SheetSkeleton } from "./contact/ContactSheet24";
import { AgentCard24, AgentCardWide24, type AgentCard24Props } from "./contact/AgentCard24";
import { ContactAddressBook24 } from "./contact/ContactAddressBook24";
import { bookSteps, stepDate } from "../../lib/contactBook";
import { materialRowsFromAgent } from "../../lib/agentMaterials";
import { materialWords } from "../../lib/agentPanel";
import type { AgentFacts as Facts24 } from "../../lib/contactList";
import { AgentCardPanel24 } from "./contact/AgentCardPanel24";
import { agentHistory } from "../../lib/agentHistory";
import { destroyManifest } from "../../lib/cascade";
import type { ContactView } from "../../lib/contactListMemory";
import { bannerFigures, colleaguesOf, genreFit, inSet, setCounts, setGroups, wideNext, type SetKey } from "../../lib/contactV24";
import { type AgentFacts, ContactFilters, GroupKey, SORT_OPTIONS, SortKey as ContactSortKey, agentFacts, emptyContactFilters, matchesContactFilters, sortFacts, type SortCtx } from "../../lib/contactList";
import { bookGenreHit, bookGenres } from "../../lib/genreMatch";
import { openQueryDrawer } from "../../lib/queryActions/drawerStore";
import { type ContactPop } from "./contact/ContactListControls";
import { ESC_LEVEL, escapeDepth } from "../../lib/escapeStack";
import { AgentEditMode } from "./card/AgentEditMode";
import { useAgentSave } from "./card/useAgentSave";
import { useEditOptions } from "./card/useEditOptions";
import { useAgentNotes } from "./card/useAgentNotes";
import { inlineFor, type CardEditKit } from "./contact/AgentCard24";
import { useToast } from "../toast/ToastProvider";
import { setAgentEditInterceptor } from "../../lib/agentCardStore";
import type { InlineField } from "./card/InlineEdits";
import { usePopover } from "../shell/ListPills";
import { CONTACT_PIN_STORE, readListView, readListVisit, writeListView, writeListVisit } from "../../lib/contactListMemory";
import { resolveScopedManuscript } from "../../lib/shellSidebar";
import { buildQcRows } from "../../lib/qcSummary";
import "./contact/contactV11.css";
import "./contact/contactV13.css";
import "./contact/contactV14.css";
/* navy-bar v1 — kept for what still renders: these sheets came in with the list head and the title row (both retired with
   the Cards and List views), and they also style the light header (`cl17-hd`), the group and the scroller's foot. */
import "./contact/contactV19.css";
import "./contact/contactV20.css";
import { genreLabel } from "../../lib/genres";
import { glanceOf, type GlanceKey } from "../../lib/contactGlance";
import { usePinList } from "../shell/useFullScreenList";
import { fitsGenre } from "../../lib/contactStrip";
import { RAIL_GROUPS } from "../shell/railNav";

/** The shared manuscript-scope key — the same one Packages, Comps and Manuscripts read. */
const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../lib/shortcuts";
import { PageChecklist, type ChecklistTarget } from "../shell/guide/PageChecklist";
import { useAgentsHold } from "../../lib/contactLoadHold";
import { CONTACT_ADD_FIRST, CONTACT_CHECKLIST, CONTACT_NEEDS_AN_AGENT, GUIDE_HIDDEN_PATH, GUIDE_SEEN_PATH, GUIDE_UNHIDE_PATH, contactGuideOf, guideDonePath, nextGuideAfter, type ContactGuideKey } from "../../lib/pageChecklist";
import { readSkipped } from "../../lib/guideHub";
import { downloadAgentsCsv } from "../../lib/agentCsv";
import "./agentList.css";

/**
 * ⚠️ THE DISCOVER DESTINATION COMES FROM THE RAIL'S OWN TABLE, NOT FROM A PAIR OF STRINGS TYPED
 * HERE. `handleNavigate("agents", "Discover new agents")` is the bridge App.tsx maps to
 * `/agents/discover`, and `railNav` already names that pair for the rail entry — so reading it
 * is one destination in one place rather than two that agree until somebody renames a sub-page.
 */
/** v16 §E — the device key the shared full-screen hook remembers under (Comparable titles has its own) */
/** v16 E's key: the shared pin hook reads it once and moves it to `sa.pinList.agents` (v138.6) */
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
    agents, queries, manuscripts, activities, collectionsReady, userTasks, addUserTask, deleteUserTask, resolveTaskFlag,
    currentUser, updateUserPaths, deleteAgent, taskFlags,
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
  /* ⚠️ THE COUNT CARDS LEFT WITH v12: the card index took the list mount (P2 — their pool
     narrowing, the cardSel state and the bar's "Showing" chips went with them), and P5's empty
     state took the exhibit's. `CountCards` is deleted; the strip indexes, it never filters. */
  const addBtnRef = useRef<HTMLButtonElement>(null);

  /* v19 §G — WHAT THE LIST REMEMBERS (lib/contactListMemory). Per device (localStorage `qh.cl.view`): the grouping, the
     sort and its direction, and the pin (the pin hook reads and writes it through `CONTACT_PIN_STORE`). For the visit
     (sessionStorage): the filters, the "At a glance" group, the search and the scroll position. A first visit opens
     unpinned, ungrouped, A to Z by surname, at the top, every row closed. A search handed in from the shell wins over a
     remembered one. There is no "Reset view": ungrouping is the chip's ✕, sorting is on the headings. */
  const rememberedView = useMemo(() => readListView(), []);
  const rememberedVisit = useMemo(() => readListVisit(), []);
  const [filters, setFilters] = useState<ContactFilters>(() => rememberedVisit?.filters ?? emptyContactFilters());
  /* v16 §B — THE "AT A GLANCE" GROUP the list is filtered to (Not queried · Querying · Closed), or null. It sits
     BESIDE the chips: both apply, a chip change leaves it alone, and "Clear all" clears both. */
  /* v24 — the "At a glance" group retired with the light header; the view row's set (below) replaced it. The visit's
     stored glance is no longer read, so a remembered one cannot filter the list unseen. */
  const [glance, setGlance] = useState<GlanceKey | null>(null);
  /* v24 A3 — THE SET (full screen's segments, and since v25 B2 At a glance's cards): over `AgentFacts.stand`, for the
     visit. A list since v25: At a glance's Querying is two sets, Your move and With the agent. */
  const [sets, setSets] = useState<readonly SetKey[] | null>(null);
  const [search, setSearch] = useState(() => searchQuery?.trim() || rememberedVisit?.search || "");
  /* v16 §C / v19 baked 2: the page opens UNGROUPED, A to Z by surname; the column headings sort (there is no sort pill) */
  const [groupKey] = useState<GroupKey>(() => rememberedView.group);
  const [sortKey, setSortKeyRaw] = useState<ContactSortKey>(() => rememberedView.sort);
  const [reversed, setReversed] = useState<boolean>(() => rememberedView.reversed);
  /* choosing a sort resets the direction to its natural order (§5) */
  /* v24 B1 — the view (List or Cards) and the grouping, per device; both read before the first paint */
  const [view, setView] = useState<ContactView>(() => rememberedView.view);
  const [byStatus, setByStatus] = useState<boolean>(() => rememberedView.byStatus);
  useEffect(() => { writeListView({ group: groupKey, sort: sortKey, reversed, view, byStatus }); }, [groupKey, sortKey, reversed, view, byStatus]);
  /* v24 B2 — the agent whose card is open (Part C draws it); its row and card are marked */
  const [cardId, setCardId] = useState<string | null>(null);
  /* v25.1 C4 — the in-place log flow: its seed while open. The page hosts it while it is the page on screen (and not a
     sandbox); opening it closes the agent card, as one right-hand panel at a time. */
  const [logSeed, setLogSeed] = useState<ContactLogSeed | null>(null);
  useEffect(() => {
    if (!active || sandbox) return undefined;
    return hostContactLog((seed) => { setCardId(null); setLogSeed(seed); });
  }, [active, sandbox]);
  useEffect(() => { if (!active) setLogSeed(null); }, [active]);
  useEffect(() => { writeListVisit({ filters, search, glance }); }, [filters, search, glance]);
  const pop = usePopover<ContactPop>();
  /* v16 §E — FULL SCREEN is the shared `useFullScreenList` (Comparable titles v25 built it for both pages): the URL
     carries it (`?full=1`, so a reload and Back respect it), the sidebar is held at its icons through `sidebarForce`
     and is whatever the writer left it on the way out, the scroll position is put back, and Escape leaves it last.
     This page hides its own sections off the flag (contactV16.css, `[data-full]`). */
  const fullScroller = useCallback(() => mainColRef.current?.closest<HTMLElement>(".wpg-scroll") ?? null, []);
  /* v138.6 §A/§C — the pin is the shared hook (`usePinList("agents")`, the Query Centre's too): remembered per page
     (`sa.pinList.agents`; v16's `sa.contactsFull` is read once and moved), restored on the first frame, and the hook
     owns F. The URL still carries it and Esc still leaves it last. */
  /* v19 §A — the pin no longer holds the sidebar at its icons: pinned, the list is the whole sheet and the sidebar
     stays as the writer left it (the mock's pinned state) */
  /* v24 D — full screen is the address book, and the sidebar folds to its icons while it is on (the hook's default, as
     on the Query Centre and in the v24 mock); v19 §A had held it open */
  const { full, setFull } = usePinList("agents", { routeActive: active, scroller: fullScroller, store: CONTACT_PIN_STORE });
  /* v19 §A — pin and unpin in one view transition (old out 220ms, new in 300ms); instant under reduced motion or
     where the browser has none. */
  const togglePin = useCallback(() => {
    const next = !full;
    const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };
    if (!doc.startViewTransition || prefersReducedMotion()) { setFull(next); return; }
    document.documentElement.classList.add("cl19-vt");
    /* the router renders the change in a transition, so the callback waits until the group actually wears (or has
       shed) `data-full` before the new view is captured — never a capture of the old page */
    const vt = doc.startViewTransition(() => new Promise<void>((resolve) => {
      flushSync(() => setFull(next));
      const until = performance.now() + 400;
      const check = () => {
        const g = mainColRef.current?.closest(".clv-group");
        if (!g || g.hasAttribute("data-full") === next || performance.now() > until) resolve();
        else window.setTimeout(check, 16); /* rendering is held during the update callback, so no rAF */
      };
      check();
    }));
    void vt.finished.finally(() => document.documentElement.classList.remove("cl19-vt"));
  }, [full, setFull]);

  // ── Page-load motion (Baked 1) ────────────────────────────────────────────
  // ROUTE ENTRY ONLY. `loadAnim` is armed once on mount and disarmed as soon as the sequence has
  // run, so a filter change, a sort change or any other re-render can never re-trigger it — a page
  // that re-animates every time you tick a checkbox is exhausting, and this animation introduces
  // the page, it doesn't celebrate each interaction.
  //
  /** the LIST column's box — what the floating bar centres on (§5.4) */
  const mainColRef = useRef<HTMLDivElement>(null);
  /* v138.6 §C — the navy list header: the sticky row, measured by the one stack writer */
  /** The saved card's beat, and the inline notice that outlives the motion. */
  const [notice, setNotice] = useState<{
    text: string; kind: "travel" | "filtered-out" | "failed"; agentId: string; canUndo: boolean;
  } | null>(null);
  /** Which section the card sat in before the save — read once the outcome is computed. */
  /** The card's own Undo for the last save — the SAME closure its foot offers (a whole-document
   *  snapshot: the agent, the deadlines the fan-out moved, the task flag), so the notice and the card
   *  cannot restore different things. Null when the card could not take a snapshot. */
  const undoSave = useRef<(() => Promise<unknown>) | null>(null);

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
  const revealed = useRef(false);
  useLayoutEffect(() => {
    if (!active) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem("sa.agentReveal"); } catch { /* private mode */ }
    if (!id || agents.length === 0) return;        // hold the key until the list can answer
    try { sessionStorage.removeItem("sa.agentReveal"); } catch { /* private mode */ }
    if (!agents.some((a) => a.id === id)) return;  // stale id — consumed, nothing to show
    revealed.current = true; /* v19 §G — the reveal's scroll wins over the visit's remembered one */
    setBookReq({ id, seq: Date.now() });
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
  /* v25.4 D — Housekeeping's model is built BEFORE the list's facts, which carry its per-agent gap count (the
     "Missing details" filter reads it); everything it reads is declared above.
     ── Housekeeping v2 (Contact list v13 §6) ───────────────────────────────────────────────
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
  /* v13 §3 — THE NUMBERS STRIP: over the agents the list shows BEFORE filtering, never the filtered set.
     v14 §1.3: its figures are facts, not controls — the carousel they filled is retired. */
  const factsAll = useMemo(
    () => agents.map((a) => ({ ...agentFacts(a, qcRows, scoped?.id ?? null), gaps: agentGapAction(hk, a.id)?.n ?? 0 })),
    [agents, qcRows, scoped, hk],
  );
  /* ruling Q5: "takes the book" — any of the agent's genres matching the main genre or any subGenre */
  /* the pool: Find and the "At a glance" group — so every chip's count is faceted under them */
  const inPool = useCallback(
    (x: AgentFacts) => matchesAgentSearch(x.agent, search) && (!glance || glanceOf(x) === glance),
    [search, glance],
  );
  /* v19 §F — the menu counts each choice itself (`wouldShow`, under Find and the band's group): the v14 faceted counts and
     the genre tallies it fed are retired with the strip */
  /* v25.1 E4 — the heading sorts' context: the day (Your query's urgency) and each agent's matches with the book */
  const sortCtx = useMemo<SortCtx>(() => ({ nowMs, fitOf: (x) => (x.agent.genres ?? []).filter((g) => bookHit(g)).length }), [nowMs, bookHit]);
  const visibleFacts = useMemo(
    () => sortFacts(factsAll.filter((x) => inPool(x) && inSet(x, sets) && matchesContactFilters(x, filters)), sortKey, reversed, sortCtx),
    [factsAll, inPool, sets, filters, sortKey, reversed, sortCtx],
  );
  /* v17 §B — anything narrowing the list: a filter, the summary card's group, or Find */
  const anyActive = contactFilterCount(filters) > 0 || !!glance || !!sets || search.trim() !== "";
  const clearFilters = useCallback(() => { setFilters(emptyContactFilters()); setSearch(""); setGlance(null); setSets(null); }, [setFilters]);
  /* v24 A3 — each chip's count, over every agent (never the filtered view) */
  const counts = useMemo(() => setCounts(factsAll), [factsAll]);
  /* the band's "your move": agents with a live query whose next step is the writer's (the census's own count) */
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
  const fullRef = useRef(fullOn);
  fullRef.current = fullOn;
  /* v19 §G — THE SCROLL POSITION, FOR THE VISIT. Saved (once a frame) while the list is on screen; put back once when the
     list first draws (a reload within the visit) and when the route comes back with its scroller at the top. A reveal
     handed in from another page wins. A new visit has nothing stored, so it opens at the top. */
  /* the first draw: the list's arrival calls this before it picks the rows on screen (v19 §H), so the rows that animate
     are the ones the reader comes back to */
  /* coming back to the route: a scroller the browser reset to its top is put back */
  const wasActive = useRef(active);
  useLayoutEffect(() => {
    const back = active && !wasActive.current;
    wasActive.current = active;
    if (!back || !showList) return;
    const sc = fullScroller();
    if (!sc) return;
    if (revealed.current) { revealed.current = false; return; }
    const y = readListVisit()?.scroll || 0;
    if (y && sc.scrollTop === 0) sc.scrollTop = y;
  }, [active, showList, fullScroller]);
  useEffect(() => {
    if (!active || !showList) return undefined;
    const sc = fullScroller();
    if (!sc) return undefined;
    let raf = 0;
    const save = () => { raf = 0; writeListVisit({ scroll: sc.scrollTop }); };
    const on = () => { if (!raf) raf = requestAnimationFrame(save); };
    sc.addEventListener("scroll", on, { passive: true });
    return () => { sc.removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, [active, showList, fullScroller]);
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
  const setPanelParam = useCallback((id: string | null, how: "push" | "replace") => {
    setParams((prev) => { const n = new URLSearchParams(prev); if (id) n.set("agent", id); else n.delete("agent"); return n; }, { replace: how === "replace" });
  }, [setParams]);
  const panelIdRef = useRef(panelId);
  panelIdRef.current = panelId;
  /** open the panel on this agent — and, when a door asks for it, the editor at a field */
  /* navy-bar v1 B6 — THE AGENT'S PANEL IS RETIRED ON THIS PAGE: every door that opened it (a deep link, Housekeeping,
     an add) now selects the agent in the address book and docks the box to it; a door that asked for the editor opens
     the agent card's editor at that field. */
  const [bookReq, setBookReq] = useState<{ id: string; seq: number } | null>(null);
  /* v25.2 C — an edit request for the card on screen: an inline field, or the card's edit mode (at a field, with any
     carried answers). The card acts on it once, by its seq. */
  const [editReq, setEditReq] = useState<{ id: string; seq: number; inline?: InlineField; edit?: { focus?: AgentCardOptions["focus"]; prefill?: AgentCardOptions["prefill"] } } | null>(null);
  const openPanel = useCallback((agentId: string, edit?: { tab?: AgentCardOptions["tab"]; focus?: AgentCardOptions["focus"]; prefill?: AgentCardOptions["prefill"] }) => {
    if (!agents.some((a) => a.id === agentId)) return;
    setHkOpenRef.current(false);
    /* v24 C — outside full screen a door opens the agent's card; in full screen it selects the agent in the book */
    if (fullRef.current) setBookReq({ id: agentId, seq: Date.now() }); else setCardId(agentId);
    /* v25.2 C1/C3 — a door asking for a field opens it IN THE CARD: in place where an inline edit holds it, else the
       card's edit mode at that field (carried answers always go to the edit mode); the centred editor is retired */
    if (edit) {
      const inline = edit.prefill ? null : inlineFor(edit.focus);
      setEditReq({ id: agentId, seq: Date.now(), ...(inline ? { inline } : { edit: { focus: edit.focus, prefill: edit.prefill } }) });
    }
  }, [agents]);
  /* v25.2 C3 — while this page is on screen, an edit asked for anywhere (Housekeeping, a task, the palette) opens in
     the page's own card rather than a second panel over it */
  useEffect(() => {
    if (!active || sandbox) return undefined;
    return setAgentEditInterceptor((id, o) => {
      if (!agents.some((a) => a.id === id)) return false;
      openPanel(id, { tab: o.tab, focus: o.focus, prefill: o.prefill });
      return true;
    });
  }, [active, sandbox, agents, openPanel]);
  /* a link to `?agent=` selects that agent and docks, then the parameter goes */
  useEffect(() => {
    if (!active || !panelParam || !collectionsReady) return;
    if (agents.some((a) => a.id === panelParam)) { if (fullRef.current) setBookReq({ id: panelParam, seq: Date.now() }); else setCardId(panelParam); }
    setPanelParam(null, "replace");
  }, [active, panelParam, collectionsReady, agents, setPanelParam]);
  /* an id the list does not hold (deleted, or a stale link) clears itself once the agents can answer */
  useEffect(() => { if (active && panelParam && collectionsReady && agents.length > 0 && !panelAgent) setPanelParam(null, "replace"); }, [active, panelParam, panelAgent, collectionsReady, agents.length, setPanelParam]);
  /* the query view opened from this panel has its own ×: it closes the agent too */
  useEffect(() => {
    const on = () => { if (panelIdRef.current) setPanelParam(null, "replace"); };
    window.addEventListener("sa:agent-panel-close", on);
    return () => window.removeEventListener("sa:agent-panel-close", on);
  }, [setPanelParam]);
  /* while one of this agent's queries has the box (opened from the Queries tab), the agent's panel stands aside */
  const openId = panelId ?? cardId;
  /** the list's current order and filter */
  /** OPEN this agent — a row, a strip, a key */
  /* kept under its old name for the doors that asked for the card's editor at a field */
  const openCard = useCallback((agentId: string, opts: AgentCardOptions = {}) => openPanel(agentId, opts.tab || opts.focus || opts.prefill ? { tab: opts.tab, focus: opts.focus, prefill: opts.prefill } : undefined), [openPanel]);

  /** "+ Add an agent" — v18.3 §D: the agent panel's act view in a new-agent state (the centred card is no longer
   *  opened from this page). An agent's panel open at the time closes first: one right-hand panel at a time. */
  const addedInPanel = useRef<string | null>(null);
  /* only an add STARTED here moves the panel (a centred add on another page emits "added" too) */
  const addFromHere = useRef(false);
  const openAdd = useCallback(() => {
    openNewAgentCard({ from: "button", host: "panel" });
  }, []);
  /* RETIRE THE ADD-AGENT POP-UP — every door opens the ONE new-agent panel through the store (the app-level host draws
     its frame), so this page no longer needs its own door or event. What made an add "this page's" moves here: a new-agent
     panel opened while this is the page on screen — from its own button, the top bar's capture, the palette — closes an
     agent's panel and Housekeeping (one right-hand panel at a time), and the panel follows the add. A flow WAITING on the
     new agent (Log a query's picker) keeps it, so the page does not take over. */
  useLayoutEffect(() => {
    if (!active || !cardReq || cardReq.agentId !== null || cardReq.host !== "panel" || cardReq.onCreated) return;
    addFromHere.current = true;
    if (panelIdRef.current) setPanelParam(null, "replace");
    setHkOpenRef.current(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening (the seq), never on a re-render
  }, [active, cardReq?.seq]);

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
      savedFacts.gaps = agentGapAction(hk, saved.id)?.n ?? 0;
      const survives = inPool(savedFacts) && matchesContactFilters(savedFacts, filters);
      const afterAll = [...agents.filter((a) => a.id !== saved.id), saved]
        .map((a) => (a.id === saved.id ? savedFacts : (factsAll.find((x) => x.agent.id === a.id) ?? agentFacts(a, qcRows, scoped?.id ?? null))));
      const after = sortFacts(afterAll.filter((x) => inPool(x) && matchesContactFilters(x, filters)), sortKey, reversed, sortCtx);
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
    },
    [agents, filters, sortKey, reversed, qcRows, scoped, factsAll, inPool],
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
    await undo();
  }, []);


  /* `onHkRemind` is declared further down; the act handler reads it through a ref, never a TDZ read */
  const remindRef = useRef<(a: Agent) => void>(() => {});
  /* the card's aftermath ON THE LIST: a save's notice (with the card's Undo) and FLIP, an add's ring,
     the notice withdrawing once the Undo has run, and a delete's row collapsing */
  useEffect(() => subscribeAgentCardEvents((e) => {
    if (e.type === "saved") {
      tickGuide.current("edit");
      undoSave.current = e.undo ?? null;
      beginSaveChoreography(e.after);
    } else if (e.type === "added") {
      tickGuide.current("add");
      /* v18.3 §D — added from the panel: the panel switches to the new agent's Profile once the list holds it */
      if (addFromHere.current) addedInPanel.current = e.agentId;
      addFromHere.current = false;
    } else if (e.type === "undone") {
      undoSave.current = null;
      setNotice((n) => (n && n.agentId === e.agentId && n.kind !== "failed" ? null : n));
    } else if (e.type === "delete-failed") {
      setNotice({ text: `Couldn’t delete ${e.name} — try again.`, kind: "failed", agentId: e.agentId, canUndo: false });
    }
  }), [beginSaveChoreography]);

  /* the new-agent form left without an add: a later add elsewhere is not this page's */
  useEffect(() => { if (!cardReq && !addedInPanel.current) addFromHere.current = false; }, [cardReq]);
  /* v18.3 §D — the panel follows an add made in it */
  useEffect(() => {
    const id = addedInPanel.current;
    if (!id || !agents.some((a) => a.id === id)) return;
    addedInPanel.current = null;
    openPanel(id);
  }, [agents, openPanel]);

  const hkCheckin = useMemo(() => wishlistCheckin(agents, hkCtxOf, hkPrefs, hkToday), [agents, hkCtxOf, hkPrefs, hkToday]);
  const hkBook: HkBook = useMemo(() => ({ title: scoped?.title?.trim() || null, genre: scoped?.genre?.trim() || null, genres: book }), [scoped, book]);
  const [hkOpen, setHkOpen] = useState(false);
  setHkOpenRef.current = setHkOpen;
  /* v17.1 — THE ONE OPENER: the tab, the H key and List health in the header all call this */
  const openHk = useCallback(() => setHkOpen(true), []);
  /* v18.1 §B.4 — the agent panel's "Fill in": a run over that agent's tasks only */
  const [hkRun, setHkRun] = useState<{ id: string; seq: number } | null>(null);
  const health = useMemo(() => listHealth(agents, hk), [agents, hk]);
  /* v24 A2 — the banner's figures: Housekeeping's gap count, the agents they belong to, and four faces */
  const banner = useMemo(() => bannerFigures(hk), [hk]);
  /* v25 B — At a glance: List health (Housekeeping's percentage and gap total), then the three sets' cards */
  /* v25.1 A — a face's colours are its agent's set */
  const standById = useMemo(() => new Map(factsAll.map((x) => [x.agent.id, x.stand] as const)), [factsAll]);
  const standOf = useCallback((id: string) => standById.get(id) ?? null, [standById]);
  const glanceModel = useMemo(() => glanceCards(factsAll, pageState === "list" ? health : null, banner.gaps), [factsAll, pageState, health, banner.gaps]);
  const glancePressed = useMemo<GlanceCardKey | null>(
    () => (sets ? GLANCE_ORDER.find((k) => { const g = GLANCE_SETS[k]; return !!g && g.length === sets.length && g.every((x) => sets.includes(x)); }) ?? null : null),
    [sets],
  );
  /* v18 §F.1 — the drawer's figures: the same score, with its held and possible points */
  const listH = useMemo(() => healthOf(agents, hk), [agents, hk]);
  /* v18 §F.3 — the intro's flag, in Housekeeping's own store (beside v17.1's tab dismissal) */
  const hkIntroSeen = introSeenOf(currentUser);
  const markIntroSeen = useCallback(() => { if (!hkIntroSeen) void updateUserPaths(INTRO_PATH_V18); }, [hkIntroSeen, updateUserPaths]);

  /* v18.3 §F.4 — THE GUIDE'S TICKS ARE READ FROM APP STATE AND REAL SAVES, never from which button started the journey:
     an agent saved new, the search holding two characters, a panel open (by any route), a card edit saved, a
     Housekeeping save. Each is written once per account, by leaf; a write already in flight is not repeated. */
  const guide = contactGuideOf(currentUser);
  const guideAsked = useRef(new Set<ContactGuideKey>());
  const tickGuide = useRef<(k: ContactGuideKey) => void>(() => {});
  tickGuide.current = (k) => {
    if (sandbox || !currentUser || guide.hidden || guide.done[k] || guideAsked.current.has(k)) return;
    guideAsked.current.add(k);
    void updateUserPaths(guideDonePath(k)).catch(() => { guideAsked.current.delete(k); });
  };
  useEffect(() => { if (search.trim().length >= 2) tickGuide.current("search"); }, [search]);
  useEffect(() => { if (panelId) tickGuide.current("open"); }, [panelId]);
  /* v19 §K, v20 §G — "Go full screen" ticks when the writer goes full screen (the button or F): a change into full
     screen on this page, never a remembered full screen put back on arrival */
  const wasPin = useRef({ full, active });
  useEffect(() => {
    const was = wasPin.current;
    wasPin.current = { full, active };
    /* the page was already on screen and unpinned in the render before: a pin restored on arrival changes `active` too */
    if (full && !was.full && active && was.active) tickGuide.current("pin");
  }, [full, active]);
  const markGuideSeen = useCallback(() => { if (!guide.seen) void updateUserPaths(GUIDE_SEEN_PATH); }, [guide.seen, updateUserPaths]);
  const hideGuide = useCallback(() => { void updateUserPaths(GUIDE_HIDDEN_PATH); }, [updateUserPaths]);
  /* Help system v1 B — the Help menu's "Show the page guide again" clears "hidden" */
  const unhideGuide = useCallback(() => { guideAsked.current.clear(); void updateUserPaths(GUIDE_UNHIDE_PATH); }, [updateUserPaths]);
  /* Help system v1 C.5 — CREDIT WHAT IS ALREADY DONE: an agent on file (added by hand or imported, before the guide
     existed) ticks "Add an agent" — shown at once, and written so the tick survives an empty list later */
  const hasAgents = agents.length > 0;
  useEffect(() => { if (collectionsReady && hasAgents) tickGuide.current("add"); }, [collectionsReady, hasAgents]);
  const guideDone = useMemo(() => ({ ...guide.done, ...(hasAgents ? { add: true } : {}) }), [guide.done, hasAgents]);
  const guideOff = useMemo<Partial<Record<ContactGuideKey, string>>>(
    () => (collectionsReady && !hasAgents ? Object.fromEntries(CONTACT_NEEDS_AN_AGENT.map((k) => [k, CONTACT_ADD_FIRST])) : {}),
    [collectionsReady, hasAgents],
  );
  /* the control each item shows, on this page, as it is now */
  const guideTarget = useCallback((k: ContactGuideKey): ChecklistTarget => {
    const vis = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    /* v24 F — the rows and cards of List and Cards, and full screen's book rows */
    const row = () => vis(".aglist [data-cl24='row'], .aglist [data-cl24='card'], [data-cl24='book-row']");
    switch (k) {
      case "add": return { el: vis(".aglist [data-cl24='add']") ?? vis("[data-cl24='band-add']"), text: "Start here. Name and agency are enough; the rest can wait." };
      case "search": return { el: vis(".aglist [data-cl24='find']") ?? vis("[data-cl24='book-find']"), text: "Type a name or an agency. The list narrows as you type." };
      case "pin": return { el: vis(".aglist [data-cl24='full']") ?? vis("[data-cl24='exit']"), text: "Press Full screen, or F. The list becomes an address book; Exit full screen brings the page back." };
      case "open": return { el: row(), text: "Click any agent. Their card opens on the right." };
      /* the card is portalled with its panel (outside .aglist); full screen's wide card has its own Edit agent */
      case "edit": return { el: vis("[data-cl24='panel'] [data-cl24='link'][data-k='edit']") ?? vis("[data-cl24='wide-edit']") ?? row(), text: "Press Edit agent. Everything on the card can be changed there." };
      case "hk": return { el: vis(".aglist [data-cl251='cell'][data-k='health']") ?? vis("[data-cl24='band-health']"), text: "Press this. Housekeeping asks for one missing detail at a time." };
    }
  }, []);
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
  /* v18.3 §F.4 — a Housekeeping save that landed ticks the guide's "Do some housekeeping" */
  const onHkFixGuided = useCallback(async (item: HkItem, fix: HkFix): Promise<FixResult> => {
    const r = await onHkFix(item, fix);
    if (r.ok) tickGuide.current("hk");
    return r;
  }, [onHkFix]);

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
      if (!hk && !find && !down && !up && !openK && !actK && !letGo) return;
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
      /* navy-bar v1 — the address book's list has its own ↑ ↓ while it has focus; the old row ring has no rows */
      if (down || up || openK || actK || letGo) return;
      e.preventDefault();
      if (hk) { openHk(); return; }
      /* / — the bar's Find, the panel scrolled into view first so the field a writer is typing into is on screen */
      /* v138.6 §C: the pinned row (and its mirrored search) is retired; the navy header is the sticky row, so its
         own search is on screen whenever the list is, and is brought into view otherwise */
      const input = [...document.querySelectorAll<HTMLInputElement>('[data-nb1="find"] input')].find((x) => x.getBoundingClientRect().height > 0);
      if (!input) return;
      input.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
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

  /* navy-bar v1 B4 — the card's Notes write through the card's own path (`commitAgentEdits`, or the lab's sandbox) */
  const writeAgentPatch = useCallback(async (id: string, patch: AgentEditPatch): Promise<SaveAgentResult> => {
    if (sandbox?.writeAgent) return sandbox.writeAgent(id, patch);
    if (!currentUser) return { ok: false, error: "Not signed in." } as SaveAgentResult;
    return commitAgentEdits(firestoreDb, currentUser.id, id, patch);
  }, [sandbox, currentUser]);

  /* ── v24 C · THE AGENT CARD, in the Query Centre's panel (outside full screen) ── */
  const cardFacts = cardId && !fullOn ? factsAll.find((x) => x.agent.id === cardId) ?? null : null;
  /* going full screen hands the open agent to the book, and the panel closes */
  useEffect(() => {
    if (fullOn && cardId) { setBookReq({ id: cardId, seq: Date.now() }); setCardId(null); }
  }, [fullOn, cardId]);
  /* an agent that is no longer on file closes its card */
  useEffect(() => { if (cardId && collectionsReady && !agents.some((a) => a.id === cardId)) setCardId(null); }, [cardId, agents, collectionsReady]);
  const titleOf = useCallback((msId: string) => manuscripts.find((m) => m.id === msId)?.title?.trim() || "Untitled manuscript", [manuscripts]);
  /** v24 C/D — ONE card-props builder for the panel's card and full screen's wide card */
  /* ── v25.2 C · editing inside the agent card ── */
  const editOpts = useEditOptions(scoped?.genre ?? null);
  const { saveDraft } = useAgentSave({ writeAgent: sandbox?.writeAgent, editCtx: hkEditCtx });
  const { showToast } = useToast();
  /* the open card's stored notes (the retired centred editor's Notes, kept in the edit mode) */
  const notesAgent = cardId ? agents.find((a) => a.id === cardId) ?? null : null;
  const cardNotes = useAgentNotes(notesAgent, currentUser?.id ?? null, writeAgentPatch);
  /* picking another agent while the edit mode has changes asks first (the drawer's discard confirm); the pick waits */
  const editLeave = useRef<(() => void) | null>(null);
  const pendingPick = useRef<string | null>(null);
  const pickCard = useCallback((id: string) => {
    if (editLeave.current && id !== cardId) { pendingPick.current = id; editLeave.current(); return; }
    setCardId(id);
  }, [cardId]);
  /** what a card needs to edit its agent in place — one save path (`useAgentSave`), the app's genre lists */
  const editKitFor = (agent: Agent): CardEditKit => {
    const first = ((agent.name ?? "").trim().split(/\s+/)[0] || (agent.agency ?? "").trim() || "the agent");
    const req = editReq && editReq.id === agent.id ? editReq : null;
    return {
      draft: draftOf(agent, personalGenres),
      genre: {
        options: { ms: scoped?.genre ?? null, pool: editOpts.genrePool, personal: editOpts.personalLabels, all: [...editOpts.allGenres] },
        isHit: bookHit, onNew: editOpts.onNewGenre,
      },
      save: async (change) => {
        const base = draftOf(agent, personalGenres);
        const r = await saveDraft(agent, base, { ...base, ...change }, { emit: false });
        if (!r.ok) { showToast({ message: `Couldn’t save that: ${(r as { error: string }).error}` }); return false; }
        const undo = r.undo;
        showToast({ message: `Saved to ${first}’s profile`, ...(undo ? { undo: async () => { await undo(); } } : {}) });
        return true;
      },
      renderEdit: ({ focus, wide, onDone }) => {
        const done = () => {
          editLeave.current = null;
          onDone();
          const n = pendingPick.current;
          pendingPick.current = null;
          if (n) setCardId(n);
        };
        return (
          <AgentEditMode
            key={`${agent.id}:${req?.seq ?? 0}`}
            mode="edit" agent={agent} focus={focus} prefill={req?.edit?.prefill} wide={wide}
            personal={editOpts.personal} agents={agents} msGenre={scoped?.genre ?? null} genrePool={editOpts.genrePool}
            personalGenres={editOpts.personalLabels} allGenres={editOpts.allGenres} isHit={bookHit} nowMs={nowMs}
            alsoFor={(d, base) => alsoChanges(agent, toContactDraft(agent, base, d), hkEditCtx)}
            onSave={async (d, base) => {
              const r = await saveDraft(agent, base, d);
              if (!r.ok) return { ok: false, error: (r as { error: string }).error };
              done();
              return { ok: true };
            }}
            onLeave={done}
            onOpenAgent={(id) => { done(); pickCard(id); }}
            onNewGenre={editOpts.onNewGenre}
            notes={!wide && notesAgent?.id === agent.id ? { stored: cardNotes.storedNotes, earlier: agent.notes ?? "", onAdd: cardNotes.onAddNote, onEdit: cardNotes.onEditNote, onDelete: cardNotes.onDeleteNote } : undefined}
            escLevel={ESC_LEVEL.card}
            bindLeave={editLeave}
          />
        );
      },
      request: req ? { seq: req.seq, inline: req.inline, edit: req.edit ? { focus: req.edit.focus } : undefined } : null,
    };
  };
  const cardPropsFor = (x: Facts24, index: number, total: number, onStep: (d: -1 | 1) => void, onOpenAgent: (id: string) => void, onClose?: () => void): AgentCard24Props => {
    const id = x.agent.id;
    const toAgent = queries.filter((q) => q.agentId === id);
    return {
      x, all: factsAll, nowMs, bookTitle: scoped?.title?.trim() || null,
      genreWord: (raw) => genreLabel(raw, personalGenres), genreHit: bookHit,
      queries: toAgent, titleOf, history: agentHistory({ agent: x.agent, queries: toAgent, activities, notes: [], titleOf, nowMs }),
      index, total, onStep, onClose,
      onJourney: (mode, queryId) => openQueryDrawer({ mode: mode as "resp", queryId }),
      onLog: () => openQueryDrawer({ mode: "log", agentId: id, ...(scoped?.id ? { manuscriptId: scoped.id } : {}) }),
      onEdit: (tab, focus) => openPanel(id, { tab: tab ?? "who", focus }),
      edit: editKitFor(x.agent),
      /* v25.4 D — the Profile tab's "{n} details missing": Housekeeping's count, and its first gap's field */
      gaps: (() => { const g = agentGapAction(hk, id); return g ? { n: g.n, focus: GAP_FOCUS[g.first].focus, tab: GAP_FOCUS[g.first].tab } : null; })(),
      onOpenQuery: (queryId) => navigate(`/queries?q=${encodeURIComponent(queryId)}`),
      onNotes: async (text) => (await writeAgentPatch(id, { notes: text })).ok,
      /* v24 E1/E2 — the genre fit against the book in scope, and the agent's colleagues at the agency */
      fit: genreFit(x.agent.genres, book, scoped?.title ?? null, (raw) => genreLabel(raw, personalGenres)),
      colleagues: colleaguesOf(x, factsAll), onOpenAgent,
      deleteQueries: destroyManifest("agent", id, { queries, activities, taskFlags }).queries,
      onDelete: () => {
        const name = (x.agent.name ?? "").trim() || x.agent.agency;
        onClose?.();
        void deleteAgent(id).catch(() => setNotice({ text: `Couldn’t delete ${name} — try again.`, kind: "failed", agentId: id, canUndo: false }));
      },
    };
  };
  /* ‹ › step through the list in the order it is DRAWN: grouped by Status, the groups' runs; else the sorted pool */
  const drawnOrder = useMemo(() => (byStatus ? setGroups(visibleFacts).flatMap((g) => g.ids) : visibleFacts.map((x) => x.agent.id)), [byStatus, visibleFacts]);
  const cardIndex = cardFacts ? drawnOrder.indexOf(cardFacts.agent.id) : -1;

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
        {/* v138.6 §C — the old pinned row is retired: the navy list header below is the sticky row */}
        {/* v13 §6 — HOUSEKEEPING: the floating tab in the window's corner and the half-screen drawer it
            opens (both portalled; the tab only while this is the page on screen) */}
        {showList && (
          <HousekeepingDrawer
            model={hk} checkin={hkCheckin} every={hkPrefs.wishlistEvery} book={hkBook} today={hkToday} agents={agents}
            tabShown={hkTabShown} onDismissTab={dismissTab} tabNote={tabNote ? { onUndo: undoDismiss } : null}
            health={listH} introSeen={hkIntroSeen} onIntroSeen={markIntroSeen}
            open={hkOpen} onOpen={openHk} onClose={() => { setHkOpen(false); setHkRun(null); }} runAgent={hkRun}
            view={hkView} onView={setHkView} routeActive={active}
            onFix={onHkFixGuided}
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
        {/* v18.3 §F — the page guide: a pill in the top bar's page slot, a checklist, a spotlight per item */}
        {!sandbox && (
          <PageChecklist page="Contact list" items={CONTACT_CHECKLIST} done={guideDone} seen={guide.seen} hidden={guide.hidden}
            /* v19 §G — the pill waits for the list: nothing of the guide shows over the loading skeleton */
            active={active && pageState !== "settling"} ready={showList || (showEmpty && collectionsReady)} targetFor={guideTarget} onSeen={markGuideSeen} onHide={hideGuide}
            art="/images/contact-list-scout.webp"
            /* Help system v1 C.3 — never over a task: an agent's panel open (by a row or a deep link to ?agent=), the agent
               card or its editor, Housekeeping, or the search holding text; and nothing opens by itself on the empty page */
            quiet={!!panelParam || !!cardReq || hkOpen || search.trim().length > 0}
            empty={showEmpty} disabled={guideOff} onUnhide={unhideGuide}
            nextGuide={nextGuideAfter("Contact list", currentUser, readSkipped)} />
        )}

        {/* v13 §8 — the loading beat: the group draws its own components as shimmering shapes, inert */}
        {/* v138.6 §A — a pinned list hides its header from the first frame, settling included (a restored pin must not
            flash the header while the list loads) */}
        <div className="clv-group" data-v24="" data-v25="" data-full={full && (showList || pageState === "settling") ? "" : undefined} data-loading={pageState === "settling" ? "" : undefined}
          aria-busy={pageState === "settling" || undefined}
          inert={pageState === "settling" || undefined}>
        {/* v17 §A — THE ONE LIGHT HEADER, on the page colour: the title block, the cut-out hawk, and the summary
            card that is the page's figures and its group filter (the strip's own `glance` state). Over a LIST
            only, and while settling: the blank account's page is ContactEmpty. */}
        {(showList || pageState === "settling") && (
          <ContactHeader25 loading={pageState !== "list"} msTitle={scoped?.title?.trim() || null}
            addRef={addBtnRef} onAdd={openAdd}
            onDiscover={DISCOVER && onNavigate ? () => onNavigate(DISCOVER.tab, DISCOVER.sub) : undefined}>
            {/* v25.1 A — At a glance as one ledger card (v25 B's four cards retired): List health opens Housekeeping; the
                other three filter the list and Cards, a second press shows all */}
            <ContactGlance251 cards={glanceModel} pressed={glancePressed} ready={pageState === "list"} standOf={standOf}
              onCard={(k) => { if (k === "health") { openHk(); return; } setSets(glancePressed === k ? null : GLANCE_SETS[k]); }} />
          </ContactHeader25>
        )}
        {pageState === "settling" && <SheetSkeleton />}
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
        <>
        {!fullOn ? (
          <>
          {/* v25 C — "Every agent on file": the title, its count line and the List | Cards switch (out of the navy bar) */}
          <ContactListTitle25 view={view} onView={setView}
            line={pageState === "list" ? { shown: visibleFacts.length, total: factsAll.length, view, grouped: byStatus, sortKey, reversed } : null} />
          <ContactSheet24 pool={visibleFacts} all={factsAll} view={view} grouped={byStatus} onGrouped={setByStatus}
            sortKey={sortKey} reversed={reversed} onSort={(v) => { setSortKeyRaw(v.key); setReversed(v.reversed); }}
            filters={filters} onFilters={setFilters} onClearAll={clearFilters} full={fullOn} onFull={togglePin}
            genreWord={(raw) => genreLabel(raw, personalGenres)} genreHit={bookHit} personalGenres={personalGenres} nowMs={nowMs}
            openId={cardId} onOpen={pickCard} search={search} onSearch={setSearch}
            onLog={(id) => openQueryDrawer({ mode: "log", agentId: id, ...(scoped?.id ? { manuscriptId: scoped.id } : {}) })}
            onEdit={(id, tab, focus) => openPanel(id, { tab, focus })}
            /* v25.4 C — the sparse-profile link's door: the card's EDIT MODE at the agent's first gap in Housekeeping's
               order (v25.3's), or at genres when Housekeeping holds none for them (a gap put off with Later) */
            onFillGaps={(id) => {
              if (!agents.some((x) => x.id === id)) return;
              const g = agentGapAction(hk, id);
              setHkOpenRef.current(false);
              if (fullRef.current) setBookReq({ id, seq: Date.now() }); else setCardId(id);
              setEditReq({ id, seq: Date.now(), edit: { focus: g ? GAP_FOCUS[g.first].focus : "genres" } });
            }}
            onExport={(rows) => downloadAgentsCsv(rows, (raw) => genreLabel(raw, personalGenres))} />
          </>
        ) : (
        <ContactAddressBook24 pool={visibleFacts} all={factsAll} counts={counts}
          /* the band's segments are single sets; At a glance's Querying (two) lights none of them and "All" neither */
          set={sets && sets.length === 1 ? sets[0] : null} multi={!!sets && sets.length > 1} onSet={(k) => setSets(k ? [k] : null)}
          health={pageState === "list" ? health : null} onFill={openHk} onAdd={openAdd}
          search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} onClearAll={clearFilters}
          sortKey={sortKey} reversed={reversed} onSort={(v) => { setSortKeyRaw(v.key); setReversed(v.reversed); }}
          genreWord={(raw) => genreLabel(raw, personalGenres)} onExit={togglePin} nowMs={nowMs} selectRequest={bookReq}
          onExport={(rows) => downloadAgentsCsv(rows, (raw) => genreLabel(raw, personalGenres))}
          renderCard={(x, index, total, onStep, onSelect) => (
            /* a colleague opened from the wide card goes through the book's request: it clears a set or filter hiding them */
            <AgentCardWide24 {...cardPropsFor(x, index, total, onStep, (id) => { void onSelect; setBookReq({ id, seq: Date.now() }); })}
              extras={{
                materials: materialRowsFromAgent(x.agent.materialsWanted).filter((r) => r.on).map(materialWords),
                steps: x.q && x.stand !== "none" ? bookSteps(x.q).map((st, k) => ({ key: `${st.status}-${k}`, status: st.status, label: st.label, date: stepDate(st.dateMs), current: st.current })) : [],
                next: wideNext(x, nowMs),
              }} />
          )} />
        )}
        {/* v25.1 C4 — the top bar's "+ Log a query" opens here, in the agent card's panel, and never leaves the page */}
        {logSeed && active ? (
          <AgentCardPanel24 agentId="__log" onClose={() => setLogSeed(null)}>
            <ContactLogFlow seed={logSeed} activeMsId={scoped?.id ?? null} onClose={() => setLogSeed(null)} />
          </AgentCardPanel24>
        ) : null}
        {cardFacts && active && !logSeed ? (
          <AgentCardPanel24 agentId={cardFacts.agent.id} onClose={() => setCardId(null)}>
            <AgentCard24 {...cardPropsFor(cardFacts, cardIndex, drawnOrder.length,
              (d) => { const n = drawnOrder[cardIndex + d]; if (n) pickCard(n); }, (id) => pickCard(id), () => setCardId(null))} />
          </AgentCardPanel24>
        ) : null}
        </>
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
                  // the book selects the agent once the cleared list holds it
                  setBookReq({ id: notice.agentId, seq: Date.now() });
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
        {/* v19 §A — no app footer under the list: the list card runs to the page's foot with nothing beneath it */}
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
