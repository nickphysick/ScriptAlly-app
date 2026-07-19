/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToDoPage — the To-do WORKBENCH (Polish III: design-refs/todo-sidebar-pair-v1.html for the left
 * sidebar, todo-board-refine-v1.html for the reel/masthead/afterlife, todo-banner-tab-v1.html §1+§3
 * for the review banner + the tucked Today tab). Left: THE PINNED PAIR — the Focus card (the
 * guided walk's home) over the filter card (view toggle + status line + the pill cloud), one
 * sticky stack, foldable to a 64px icon rail (localStorage["sa.todoDrawer"]). Centre: the masthead
 * band over the review banner (Sun–Mon) + the one-row card reels or the ledger + the thin-bar
 * afterlife. Right: the Today rail (or its narrow chip). The ledger follows todo-ledger-v1.html.
 *
 * Presentation + view-model only — the task engine, taskFlags and every write path are untouched;
 * lane renames are UI labels (UserTask / taskType enums unchanged in code). The pure view-model is
 * `src/lib/todoBoard.ts` (assembleBoard → three lanes + the cleared union; todaySplit → the two
 * bands; ribbonTiles → the header counts, housekeeping = GAPS via todoHousekeeping.hkGapCount).
 * Theme: F12 only (`.t-f12` tokens). StatusDot consumed verbatim.
 *
 * The AppShell's global help "?" is hidden on /todo (the pack's one out-of-page line) — the
 * sidebar foot carries ⚙ Task settings; help lives on the AppShell FAB (whose /todo menu
 * dispatches the same sa:todo-replay-tour event).
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { F12Page, F12Account } from "../shell/F12Shell";
import { StatusDot } from "../StatusDot";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { assembleBoard, todaySplit, ribbonTiles, reviewSurface, BoardCard, USER_TASK_FLAG_TYPE } from "../../lib/todoBoard";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import {
  choosePicks, rolledOverCards, todayGhosts, MAX_TODAY,
  quickSendPayload, quickNudgePayload, receiptLine, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, priorSameTypeSend, duplicateSendPrompt,
} from "../../lib/todoWalk";
import { weekOfQuerying } from "../../lib/dashboardStats";
import { saveHkRows } from "../../lib/hkSave";
import { isProUser, fetchAssistedFill, AssistFound } from "../../lib/assistFill";
import { groupHousekeeping, hkGapCount, hkGroupProgress, HkGroup, HkRule, HK_RULES } from "../../lib/todoHousekeeping";
import { deskState, liveQueryCount, liveQueriesLine, clearedListCap } from "../../lib/todoEmpty";
import { ledgerTitle, ledgerDetail, sortLedgerDo, sortLedgerHk, batchChildren, batchDetail, batchTaskCopy, truncateRows } from "../../lib/todoLedger";
import { reelFit, reelPage, ReelFit, REEL_CARD_MIN } from "./reelFit";
import focusArt from "../../assets/todo/focus-art.png";
// VI P2 — the review cup (original ScriptAlly artwork; currentColor → inlined so it inherits ink)
import reviewCupRaw from "../../assets/todo/review-cup.svg?raw";
import { TodoFilterState, DEFAULT_FILTERS, filtersActive, matchesSearch, groupMatchesSearch, visibleDoCard, visibleStaleCard, visibleNoteCard, visibleGroup, filterCounts } from "../../lib/todoFilters";
import { SelState, EMPTY_SEL, applySelectClick, moveFocus } from "../../lib/todoSelection";
import { shouldAutoRunTour } from "../../lib/todoTour";
import { TodoTour } from "./TodoTour";
import { ActivityType, QueryStatus } from "../../types";
import { FocusFlow, FocusItem } from "./FocusFlow";
import { TaskSettingsSheet } from "./TaskSettingsSheet";
import "./todo.css";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const localYMD = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** The ink header's date line — "Thu 16 Jul" (design-refs/todo-header-ink.html). */
const shortHeaderDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (ms?: number): string => {
  if (ms == null) return "";
  if (Date.now() - ms < 120000) return "just now";
  const d = new Date(ms);
  let h = d.getHours();
  const ap = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}${ap}`;
};

/** G3 grouped-card copy (retoken ref) — RULE-ACCURATE: the approved "Add details of what you sent"
 *  materials line is red-gated (the rule checks the agent's REQUIREMENTS, not query sent-materials);
 *  this copy says what the rule actually checks. Swap one line here if Nick approves new wording. */
const G3_COPY: Record<string, { rest: (n: number) => string; sub: string }> = {
  dq_responseTime: { rest: (n) => ` agent${n === 1 ? "" : "s"} missing a reply window`, sub: "Without one we can’t tell you when a nudge is fair." },
  dq_materials: { rest: (n) => ` agent${n === 1 ? "" : "s"} missing a materials list`, sub: "Add what they ask to receive so your package check can run." },
  dq_mswl: { rest: (n) => ` agent${n === 1 ? "" : "s"} missing a wish list`, sub: "Their wish list is how we tell you who’s worth querying." },
};

type Overlay =
  | { kind: "receipt"; lane: "do" | "hk" | "nt"; title: string; line: string; undo?: () => void | Promise<void>; edit?: () => void }
  | { kind: "dismissed"; lane: "do" | "hk" | "nt"; text: string; undo: () => void | Promise<void>; never?: () => void }
  | { kind: "fork"; single: boolean }
  | { kind: "flip" };

/** The grouped card's quick-✓ target: an inline rapid chip-fill — the SAME batch save as the focus
 *  sheet (hkSave.saveHkRows), never a third write path. Compact chips; skipping rows is fine.
 *  Assisted fill (Pro, LIVE) rides the header: found values land in the chips/fields UNSAVED, a ✨
 *  marks each found row (provenance in its tooltip — the sheet is the full-provenance surface), and
 *  un-sourced agents simply stay empty. Free users get the Pro pill → the upgrade path. */
const GroupFlip: React.FC<{
  group: HkGroup;
  pro: boolean;
  onUpgrade: () => void;
  onCancel: () => void;
  onSaved: (ok: number, undo?: () => Promise<void>) => void;
  deps: Parameters<typeof saveHkRows>[5];
}> = ({ group, pro, onUpgrade, onCancel, onSaved, deps }) => {
  const [rows, setRows] = useState<Record<string, string>>({});
  const [found, setFound] = useState<Record<string, AssistFound>>({});
  const [assistAt, setAssistAt] = useState<string | null>(null);
  const [assisting, setAssisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const filled = group.members.filter((m) => (rows[m.agentId ?? ""] ?? "").trim()).length;
  const MATERIAL_VOCAB = ["Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"];
  async function runAssist() {
    if (!pro) { onUpgrade(); return; }
    setAssisting(true);
    try {
      const targets = group.members.filter((m) => m.agentId);
      const rs = await fetchAssistedFill({ rule: group.rule as "dq_responseTime" | "dq_materials" | "dq_mswl", agents: targets.map((m) => ({ agentId: m.agentId!, name: m.agentName, ...(m.agency ? { agency: m.agency } : {}) })) });
      const byId: Record<string, AssistFound> = {};
      const next = { ...rows };
      for (const r of rs) { byId[r.agentId] = r; next[r.agentId] = r.value; }
      setFound((f) => ({ ...f, ...byId }));
      setRows(next);
      setAssistAt(new Date().toISOString());
    } catch {
      /* quiet — the manual path is never blocked */
    } finally {
      setAssisting(false);
    }
  }
  return (
    <div className="tdb-batchflip" onClick={(e) => e.stopPropagation()}>
      <div className="tdb-bfh">
        {group.rule === "dq_responseTime" ? "Replies within…" : group.rule === "dq_materials" ? "They ask for…" : "Looking for…"}
        {group.meta.assistable && (
          <button type="button" className="tdb-bffind" disabled={assisting} title={pro ? "Find these for me — found values land unsaved; check before saving" : "Assisted fill is a Pro feature"} onClick={runAssist}>
            {assisting ? "…" : "✨ Find"}{!pro && <span className="tdb-propill">Pro</span>}
          </button>
        )}
        <span className="tdb-bfp">{filled} OF {group.members.length}</span>
      </div>
      <div className="tdb-bfrows">{group.members.map((m) => {
        const id = m.agentId ?? m.card.key;
        return (
          <div key={m.card.key} className="tdb-bfrow">
            <span className="tdb-bfn" title={m.agentId && found[m.agentId] ? `✨ Found · ${found[m.agentId].source}${assistAt ? ` · ${new Date(assistAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""} — check before saving` : undefined}>
              {m.agentId && found[m.agentId] ? "✨ " : ""}{m.agentName}
            </span>
            <span className="tdb-bfchips">
              {group.rule === "dq_responseTime" && [4, 6, 8, 12].map((w) => (
                <button key={w} type="button" className={`tdb-bfc${rows[id] === String(w) ? " on" : ""}`} onClick={() => setRows((p) => ({ ...p, [id]: String(w) }))}>{w}wk</button>
              ))}
              {group.rule === "dq_materials" && MATERIAL_VOCAB.map((mv) => {
                const set = new Set((rows[id] ?? "").split(",").map((x) => x.trim()).filter(Boolean));
                return <button key={mv} type="button" className={`tdb-bfc${set.has(mv) ? " on" : ""}`} onClick={() => { set.has(mv) ? set.delete(mv) : set.add(mv); setRows((p) => ({ ...p, [id]: Array.from(set).join(", ") })); }}>{mv.replace("Full Manuscript", "Full MS").replace("Query Letter", "Letter").replace("Sample Pages", "Pages")}</button>;
              })}
              {group.rule === "dq_mswl" && <input className="tdb-bfin" type="text" placeholder="wish list…" value={rows[id] ?? ""} onChange={(e) => setRows((p) => ({ ...p, [id]: e.target.value }))} />}
            </span>
          </div>
        );
      })}</div>
      <div className="tdb-bffoot">
        <button type="button" className="tdb-ra" onClick={onCancel}>Cancel</button>
        <button type="button" className="tdb-ra save" disabled={!filled || saving} onClick={async () => {
          setSaving(true);
          const res = await saveHkRows(group, rows, {}, found, new Date().toISOString(), deps);
          setSaving(false);
          onSaved(res.ok, res.undo);
        }}>Save {filled || ""}</button>
      </div>
    </div>
  );
};

/** One board SECTION (workbench P2 — the horizontal reels are RETIRED): coloured header row over a
 *  wrapping auto-fill card grid. No scroll machinery — the page scrolls, the grid wraps. The
 *  `tdb-reel` wrapper class name is kept (historical); the head is the shared tinted band (II·B P4). */
const Lane: React.FC<{
  cls: string;
  label: string;
  count: number;
  isEmpty: boolean;
  onAdd?: () => void;
  onFocusedSession?: () => void; // "▶ Focus on {label}" (launches the focus flow's sweep mode; handler unchanged)
  emptyNode?: React.ReactNode;
  strip?: React.ReactNode; // rendered between the header and the grid (e.g. muted-rules recovery chips)
  children?: React.ReactNode;
}> = ({ cls, label, count, isEmpty, onAdd, onFocusedSession, emptyNode, strip, children }) => {
  // III P2 — the one-row reel returns: a FRESH width-aware fit (reelFit — the reported shape;
  // the retired fit module stays retired). The ResizeObserver watches the TRACK, so the right
  // rail mounting/unmounting (or the sidebar folding) recomputes the fit for free.
  const ref = useRef<HTMLDivElement>(null);
  const fitRef = useRef<ReelFit>({ n: 1, cardWidth: REEL_CARD_MIN });
  const [ends, setEnds] = useState({ left: false, right: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const fit = reelFit(el.clientWidth);
      fitRef.current = fit;
      el.style.setProperty("--reelw", `${fit.cardWidth}px`);
      setEnds((prev) => {
        const max = el.scrollWidth - el.clientWidth;
        const next = { left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 };
        return next.left === prev.left && next.right === prev.right ? prev : next;
      });
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [children]);
  const page = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * reelPage(fitRef.current), behavior: "smooth" });
  return (
  <div className={`tdb-reel ${cls}`} id={`tdb-lane-${cls}`}>
    {/* II·B P4 — ONE section grammar in both views: the ledger's tinted head band (standalone
        variant adds the full border + radius); III P2 adds the chevron pagers to the head. */}
    <div className={`tdb-lghead standalone ${cls === "do" ? "p" : cls === "hk" ? "c" : "n"}`}>
      {/* VI P3 — the play button leads the lane (ref .playb); the Focus pill + lane dot retire.
          aria-label + tooltip keep the full wording; behaviour identical. */}
      {onFocusedSession && !isEmpty && (
        <button type="button" className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onFocusedSession}>
          <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden><path d="M1 1 L10 6 L1 11 Z" fill="currentColor" /></svg>
        </button>
      )}
      <span className="tdb-lgt">{label}</span>
      <span className="tdb-ln">{count}</span>
      {onAdd && <button type="button" className="tdb-cadd" onClick={onAdd} aria-label="Add a note">＋</button>}
      {!isEmpty && (
        <span className="tdb-reelpg">
          <button type="button" className="tdb-pg" disabled={!ends.left} onClick={() => page(-1)} aria-label={`Previous ${label} cards`}>‹</button>
          <button type="button" className="tdb-pg" disabled={!ends.right} onClick={() => page(1)} aria-label={`Next ${label} cards`}>›</button>
        </span>
      )}
    </div>
    {strip}
    {isEmpty ? (
      <div className="tdb-emptyreel">{emptyNode}</div>
    ) : (
      <div className="tdb-reeltrack" ref={ref}>{children}</div>
    )}
  </div>
  );
};

export interface ToDoPageProps {
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

type ToastAction = { label: string; fn: () => void };

export const ToDoPage: React.FC<ToDoPageProps> = ({ onNavigate }) => {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser,
    addUserTask, updateUserTask, upsertTaskFlag, updateUserProfile,
    recordMaterialsSent, logNudge, dismissTask, undoQueryStatus, updateQueryStatus, deleteActivity, resolveTaskFlag, updateAgent,
  } = useScriptAllyDb();
  const [toast, setToast] = useState<{ msg: string; action?: ToastAction } | null>(null);
  const [rollDismissed, setRollDismissed] = useState(false);
  const [pulsing, setPulsing] = useState<string | null>(null);
  // THE completion surface — the focus flow (queue of one for a card click; a set for the two walks).
  const [flow, setFlow] = useState<{ items: FocusItem[]; mode?: "sweep" | "weeklyReview"; ritual?: boolean } | null>(null);
  const [flowPrefill, setFlowPrefill] = useState<{ sentDate?: string; method?: string; materials?: string[] } | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false); // the Task Settings sheet ("What lands on your desk?")
  // VI P1 — "Done today" collapses by default to the ✓ row; expanding is in place, session-only.
  const [showDone, setShowDone] = useState(false);
  // ── workbench shell state. Fold + view are DEVICE UI prefs → the sa. localStorage convention
  // (approved — never user-doc fields). View default = cards; the Ledger face lands in Phase 3.
  const [folded, setFolded] = useState<boolean>(() => { try { return localStorage.getItem("sa.todoDrawer") === "folded"; } catch { return false; } });
  const setFold = (v: boolean) => { setFolded(v); try { localStorage.setItem("sa.todoDrawer", v ? "folded" : "open"); } catch { /* private mode */ } };
  const [view, setView] = useState<"cards" | "ledger">(() => { try { return localStorage.getItem("sa.todoView") === "ledger" ? "ledger" : "cards"; } catch { return "cards"; } });
  const pickView = (v: "cards" | "ledger") => { setView(v); try { localStorage.setItem("sa.todoView", v); } catch { /* private mode */ } };
  // Ledger view state (Phase 3) — session-only: which batch rows are expanded (default collapsed)
  // + which sections dropped their SHOW ALL cap. Collapse restores the scroll position captured at
  // expand (the wrap is the scroller).
  const [openBatches, setOpenBatches] = useState<Record<string, boolean>>({});
  const [showAllSec, setShowAllSec] = useState<Record<string, boolean>>({});
  const batchScroll = useRef<Record<string, number>>({});
  const toggleBatch = (rule: string) => {
    setOpenBatches((s) => {
      const open = !s[rule];
      if (open) batchScroll.current[rule] = wrapRef.current?.scrollTop ?? 0;
      else if (wrapRef.current) wrapRef.current.scrollTop = batchScroll.current[rule] ?? wrapRef.current.scrollTop;
      return { ...s, [rule]: open };
    });
  };
  // ── P5: ledger selection (hover checkboxes · shift ranges · parents as one · children never)
  // + the additive keyboard layer + the ⋯ kebab. All session-only; bulk writes ride the EXISTING
  // primitives optimistically with one undo-all flash.
  const [sel, setSel] = useState<SelState>(EMPTY_SEL);
  const [kfocus, setKfocus] = useState(-1);
  const [kebabAt, setKebabAt] = useState<string | null>(null);
  // ── II·B P3: the companion rail ↔ masthead chip. ONE Today panel (renderTodayPanel), TWO
  // mounts — the right column ≥1200px, the masthead-chip popover below — XOR'd on `narrow`, so
  // exactly one mounts and the state never forks (halt (c) clear).
  const [narrow, setNarrow] = useState<boolean>(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1199.98px)").matches);
  const [todayPopOpen, setTodayPopOpen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1199.98px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => { if (!narrow) setTodayPopOpen(false); }, [narrow]);
  useEffect(() => {
    if (!todayPopOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest(".tdb-todaypop") || t.closest(".tdb-todaychip"))) return;
      setTodayPopOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTodayPopOpen(false); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [todayPopOpen]);
  // Masthead search — the input + ⌘K focus mechanics land here (Phase 1); live filtering is
  // Phase 4's wiring. The page stays MOUNTED behind other routes (StagePage display-toggles), so
  // the ⌘K handler must no-op while the board is hidden — offsetParent is null under display:none.
  const [search, setSearch] = useState("");
  // Drawer filters (Phase 4) — session-only; all-visible defaults (hiding is the writer's act).
  const [filters, setFilters] = useState<TodoFilterState>(DEFAULT_FILTERS);
  const setF = (k: keyof TodoFilterState, v: boolean) => setFilters((f) => ({ ...f, [k]: v }));
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) return;
      if (!wrapRef.current || wrapRef.current.offsetParent === null) return; // board not visible
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const plus7iso = () => new Date(Date.now() + 7 * 86400000).toISOString();
  const openFlowCards = (cards: BoardCard[]) => {
    // III P1 — the board is review-free by construction (the banner/bar own the review's entry)
    if (cards.length) setFlow({ items: cards.map((card) => ({ kind: "card", card })) });
  };
  // Quick-rail card states. Receipts/dismissed render as STANDALONE cards (the live card vanishes the
  // moment the write lands — the board is derived); fork/flip replace a still-live card's body.
  const [overlays, setOverlays] = useState<Record<string, Overlay>>({});
  const setOverlay = (key: string, o: Overlay) => setOverlays((s) => ({ ...s, [key]: o }));
  const clearOverlay = (key: string) => setOverlays((s) => { const n = { ...s }; delete n[key]; return n; });
  // Fresh activities for late undo closures (the created nudge row lands AFTER the click's snapshot).
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;

  const now = Date.now();
  const today = localYMD(now);

  // Polish III P1 — the ONE review surface (banner Sun–Mon · thin bar after; null once reviewed)
  const surface = useMemo(
    () => reviewSurface({ tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now, mutedTaskRules: currentUser?.mutedTaskRules }),
    [queries, taskFlags, now, currentUser?.mutedTaskRules], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const board = useMemo(
    () => assembleBoard({ tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now, mutedTaskRules: currentUser?.mutedTaskRules }),
    // now/today are session-stable enough; recomputing on the data arrays is what matters.
    // mutedTaskRules is a board dep because the Sunday CARD reads it directly (nudge/dq/stale mutes
    // change `tasks` upstream, but sunday_review does not).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, today, currentUser?.mutedTaskRules],
  );
  // The Housekeeping lane renders the dq rules GROUPED (one card per rule, queried-first members) +
  // STALE queries as INDIVIDUAL cards (real one-off decisions, never batched). The flat board.hk
  // still feeds Today's-list + Help-me-pick unchanged. Rule-muted groups drop out here too.
  const hkGroups = useMemo(
    () => groupHousekeeping(board.hk, agents, currentUser?.mutedTaskRules, queries),
    [board.hk, agents, currentUser, queries],
  );
  const staleCards = useMemo(() => board.hk.filter((c) => c.taskType === "no_response_close"), [board.hk]);
  const mutedRules = (currentUser?.mutedTaskRules ?? []).filter((r): r is HkRule => r in HK_RULES);
  // ONE counts object read by BOTH the ribbon tiles and the lane headers (equality by construction).
  // Housekeeping = the gap count + the individual stale cards (12+9 gaps + 4 stale = 25), never piles.
  const tiles = ribbonTiles(board, hkGapCount(hkGroups) + staleCards.length);
  // Empty-state derivation (todo-empty-states.html): A = new desk (zero queries AND agents);
  // E = desk cleared (all three sets empty AND a non-empty done-log — earned, never default);
  // otherwise each reel handles its own clear. All pure views; nothing stored.
  const hkItemCount = hkGroups.length + staleCards.length;

  // Post-it tap → the lane (the 6B tile-tap behaviour, built here — 6B itself is red-gated).
  const scrollToLane = (cls: "do" | "hk" | "nt") => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`tdb-lane-${cls}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const flash = (msg: string, action?: ToastAction) => {
    const t = { msg, action };
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), action ? 5000 : 2600);
  };
  function unmuteRule(rule: HkRule) {
    updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== rule) });
    flash("Unmuted — those reminders are back.");
  }
  function muteRuleFromCard(g: HkGroup) {
    updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), g.rule])) });
    const undo = () => updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== g.rule) });
    flash(`✓ ${g.meta.label} — dismissed`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }

  // Today: committed band (committedDate === today, the 5-cap set) + done band (the cleared
  // union, uncapped). Rolled-over commitments (a prior day) surface once in the sage Keep/Clear bar.
  const { committed: committedCards, done: doneCards } = todaySplit(board, today);
  const doneN = doneCards.length;
  const desk = deskState({ queryCount: queries.length, agentCount: agents.length, urgent: board.do.length, hkItems: hkItemCount, notes: board.nt.length, clearedToday: doneN });
  // ── Phase 4: search + filters compose AND-wise over BOTH views. The review entry card is
  // furniture — it renders only while nothing is filtered/searched (it would dilute matches).
  const sctx = { queries, agents, manuscripts };
  const active = filtersActive(filters, search);
  const fc = filterCounts({ doCards: board.do, hkGroups, staleCards, ntCards: board.nt, committedCount: committedCards.length });
  const vDo = board.do.filter((c) => visibleDoCard(c, filters, today) && matchesSearch(c, search, sctx));
  const vGroups = hkGroups.filter((g) => visibleGroup(g, filters) && groupMatchesSearch(g, search));
  const vStale = staleCards.filter((c) => visibleStaleCard(c, filters, today) && matchesSearch(c, search, sctx));
  const vNt = board.nt.filter((c) => visibleNoteCard(c, filters, today) && matchesSearch(c, search, sctx));
  const anyVisible = vDo.length + vGroups.length + vStale.length + vNt.length > 0;
  // ── the ledger's row model, hoisted (P5): the bulk bar + keyboard walker share the SAME visible
  // top-level order the renderer draws. Children are not in the order — never selectable.
  const lctx = { queries, taskFlags };
  const doSorted = sortLedgerDo(vDo, lctx, now);
  const doCut = truncateRows(doSorted, !!showAllSec.do);
  const staleSorted = sortLedgerHk(vStale, lctx, now);
  const hkTop: Array<{ kind: "group"; g: HkGroup } | { kind: "card"; c: BoardCard }> = [
    ...vGroups.map((g) => ({ kind: "group" as const, g })),
    ...staleSorted.map((c) => ({ kind: "card" as const, c })),
  ];
  const hkCut = truncateRows(hkTop, !!showAllSec.hk);
  const ntCut = truncateRows(vNt, !!showAllSec.nt);
  const ledgerOrder: string[] = view !== "ledger" ? [] : [
    ...doCut.visible.map((c) => c.key),
    ...hkCut.visible.map((r) => (r.kind === "group" ? `group-${r.g.rule}` : r.c.key)),
    ...ntCut.visible.map((c) => c.key),
  ];
  const rowByKey = new Map<string, { kind: "card"; c: BoardCard } | { kind: "group"; g: HkGroup }>([
    ...doCut.visible.map((c) => [c.key, { kind: "card" as const, c }] as const),
    ...hkCut.visible.map((r) => (r.kind === "group" ? [`group-${r.g.rule}`, r] as const : [r.c.key, r] as const)),
    ...ntCut.visible.map((c) => [c.key, { kind: "card" as const, c }] as const),
  ]);
  const selVisible = sel.selected.filter((k) => ledgerOrder.includes(k));
  const clickSelect = (key: string, shift: boolean) => setSel((st) => applySelectClick(st, ledgerOrder, key, shift));
  // Bulk actions — the same writes the singles make, applied optimistically with ONE undo-all.
  function bulkToday() {
    let room = MAX_TODAY - committedCards.length;
    let added = 0;
    for (const k of selVisible) {
      const row = rowByKey.get(k);
      if (!row || row.kind !== "card" || onList(row.c)) continue;
      if (room <= 0) { flash(`Today is full (${MAX_TODAY} max)`); break; }
      setCommitted(row.c, true); room -= 1; added += 1;
    }
    if (added > 0) flash(`＋ ${added} on Today`);
    setSel(EMPTY_SEL);
  }
  function bulkSnooze() {
    const undos: Array<() => void | Promise<void>> = [];
    let n = 0;
    for (const k of selVisible) {
      const row = rowByKey.get(k);
      if (!row) continue;
      if (row.kind === "group") {
        row.g.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", 7));
        undos.push(() => row.g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })));
        n += 1;
      } else if (row.c.userTaskId) {
        const key = { taskType: USER_TASK_FLAG_TYPE, queryId: row.c.userTaskId };
        upsertTaskFlag(key, { snoozedUntil: plus7iso(), bumpSnooze: true });
        undos.push(() => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }));
        n += 1;
      } else if (row.c.taskType && row.c.relatedRecordId) {
        dismissTask(row.c.taskType, row.c.relatedRecordId, "fixed snooze", 7);
        undos.push(() => upsertTaskFlag(flagKeyForTask(row.c.taskType!, row.c.relatedRecordId!), { snoozedUntil: null, unbumpSnooze: true }));
        n += 1;
      }
    }
    if (n) flash(`✓ ${n} snoozed — back in a week`, { label: "Undo all", fn: async () => { for (const u of undos) await u(); flash("Restored"); } });
    setSel(EMPTY_SEL);
  }
  function bulkDismiss() {
    const undos: Array<() => void | Promise<void>> = [];
    let n = 0;
    for (const k of selVisible) {
      const row = rowByKey.get(k);
      if (!row) continue;
      if (row.kind === "group") {
        row.g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: MUTED_UNTIL }));
        undos.push(() => row.g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null })));
        n += 1;
      } else if (row.c.userTaskId) {
        const key = { taskType: USER_TASK_FLAG_TYPE, queryId: row.c.userTaskId };
        upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
        undos.push(() => upsertTaskFlag(key, { snoozedUntil: null }));
        n += 1;
      } else if (row.c.taskType && row.c.relatedRecordId) {
        upsertTaskFlag(flagKeyForTask(row.c.taskType, row.c.relatedRecordId), { snoozedUntil: MUTED_UNTIL });
        undos.push(() => upsertTaskFlag(flagKeyForTask(row.c.taskType!, row.c.relatedRecordId!), { snoozedUntil: null }));
        n += 1;
      }
    }
    if (n) flash(`✓ ${n} dismissed — nothing deleted`, { label: "Undo all", fn: async () => { for (const u of undos) await u(); flash("Restored"); } });
    setSel(EMPTY_SEL);
  }
  // ── P5 keyboard layer — ADDITIVE, never required (every action has a pointer path). Ledger view
  // only; inert while typing, while a journey sheet is up, and while the board is display:none.
  const openRow = (key: string) => {
    const row = rowByKey.get(key);
    if (!row) return;
    if (row.kind === "group") setFlow({ items: [{ kind: "group", group: row.g }] });
    else openFlowCards([row.c]);
  };
  const keyCtx = useRef({ view, ledgerOrder, kfocus, flow: flow as unknown });
  keyCtx.current = { view, ledgerOrder, kfocus, flow };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctx = keyCtx.current;
      if (ctx.view !== "ledger" || ctx.flow) return;
      if (!wrapRef.current || wrapRef.current.offsetParent === null) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("input, textarea, select, [contenteditable=true]")) return;
      const k = e.key;
      if (k === "Escape") { setSel(EMPTY_SEL); setKfocus(-1); setKebabAt(null); return; }
      const order = ctx.ledgerOrder;
      if (k === "ArrowDown" || k === "j" || k === "ArrowUp" || k === "k") {
        e.preventDefault();
        const next = moveFocus(ctx.kfocus, k === "ArrowDown" || k === "j" ? 1 : -1, order.length);
        setKfocus(next);
        const el = document.querySelector(`[data-lkey="${order[next]}"]`);
        el?.scrollIntoView({ block: "nearest" });
        return;
      }
      const key = order[ctx.kfocus];
      if (!key) return;
      const row = rowByKey.get(key);
      if (k === "Enter") { e.preventDefault(); openRow(key); return; }
      if (k === "t" && row?.kind === "card") { e.preventDefault(); toggleToday(row.c); return; }
      if (k === "s") {
        e.preventDefault();
        if (row?.kind === "card") quickPause(row.c);
        else if (row?.kind === "group") forkNotNowGroup(row.g);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function kebabDismiss(c: BoardCard) {
    setKebabAt(null);
    const key = c.userTaskId
      ? { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId }
      : c.taskType && c.relatedRecordId ? flagKeyForTask(c.taskType, c.relatedRecordId) : null;
    if (!key) return;
    upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null });
    flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }

  // ── first-visit spotlight tour (Act 1). Auto-runs ONCE: `tourSeenAt` absent ∧ not the new desk;
  // the flag is stamped on Done AND on skip/Esc (never localStorage — it follows the user). The
  // corner ?'s replay item re-opens it regardless of the flag via a CustomEvent. ──
  const [tourOpen, setTourOpen] = useState(false);
  const tourRanRef = useRef(false);
  useEffect(() => {
    if (tourRanRef.current || tourOpen) return;
    if (currentUser && shouldAutoRunTour(currentUser.tourSeenAt, desk)) {
      tourRanRef.current = true;
      setTourOpen(true);
    }
  }, [currentUser, desk, tourOpen]);
  useEffect(() => {
    const onReplay = () => setTourOpen(true);
    window.addEventListener("sa:todo-replay-tour", onReplay);
    return () => window.removeEventListener("sa:todo-replay-tour", onReplay);
  }, []);
  const endTour = () => {
    setTourOpen(false);
    if (!currentUser?.tourSeenAt) void updateUserProfile({ tourSeenAt: new Date().toISOString() });
  };
  const onList = (c: BoardCard) => c.committedDate === today;
  const allCommitted = [...board.do, ...board.hk, ...board.nt].filter((c) => c.committedDate != null);
  const rolled = rollDismissed ? [] : rolledOverCards(allCommitted, today);
  // The pack's ring/footer share: done ÷ (open-committed + done) — the day's items, committed or not.

  function setCommitted(card: BoardCard, on: boolean) {
    const val = on ? today : null;
    if (card.userTaskId) updateUserTask(card.userTaskId, { committedDate: val });
    else if (card.taskType && card.relatedRecordId) upsertTaskFlag(flagKeyForTask(card.taskType, card.relatedRecordId), { committedDate: val });
  }
  function toggleToday(card: BoardCard) {
    if (!onList(card) && committedCards.length >= MAX_TODAY) { flash(`Today is full (${MAX_TODAY} max)`); return; }
    setCommitted(card, !onList(card));
  }
  // Help me pick — a selection gesture: pulse-and-fade, card by card, then commit each.
  async function helpMePick() {
    const picks = choosePicks({ doCards: board.do, hkCards: board.hk, committedCount: committedCards.length });
    if (!picks.length) { flash(`Today is full (${MAX_TODAY} max)`); return; }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pool = [...board.do, ...board.hk];
    for (const key of picks) {
      const card = pool.find((c) => c.key === key);
      if (!card) continue;
      if (!reduce) { setPulsing(key); await wait(440); }
      setCommitted(card, true);
      if (!reduce) await wait(120);
    }
    setPulsing(null);
    flash(`Picked ${picks.length} for today`);
  }
  function keepRolled() { rolled.forEach((c) => setCommitted(c, true)); setRollDismissed(true); flash("Kept on Today"); }
  function dropRolled() { rolled.forEach((c) => setCommitted(c, false)); setRollDismissed(true); flash("Cleared — still on the board"); }

  // ── quick rail — "the honest fastest version of actually doing it". Every ✓ funnels through the
  // SAME write paths as the journey (quick*Payload → markSentWriteArgs/nudgeWriteArgs); defaults are
  // stated on the receipt, and Undo deletes/unwinds the created record via the existing primitives.
  async function quickDone(c: BoardCard) {
    const nowIso = new Date().toISOString();
    if (c.userTaskId) {
      await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });
      const undo = () => updateUserTask(c.userTaskId!, { done: false });
      setOverlay(c.key, { kind: "receipt", lane: "nt", title: "Note done", line: `${c.title} — struck through on Today.`, undo });
      flash(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    if (!q) return;
    if (c.taskType === "no_response_close") {
      const prev = q.status as QueryStatus;
      await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Closed as no response from the quick rail");
      const undo = () => undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE);
      setOverlay(c.key, { kind: "receipt", lane: "hk", title: `${c.who || "Query"} — closed`, line: "Logged as no response — not a rejection, so your response rate stays honest." , undo });
      flash(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    if (c.taskType === "nudge_overdue") {
      const p = quickNudgePayload({ cardKey: c.key, label: c.title, queryId: q.id, method: q.sendMethod, nowIso });
      const r = await logNudge(...nudgeWriteArgs(p, new Date().toISOString()));
      if (!r.success) { flash(r.error || "Couldn’t log the nudge."); return; }
      // deleteActivity on a NUDGE_SENT fully unwinds it (twins + nudgeDate fields + the flag).
      const undo = async () => {
        const acts = activitiesRef.current
          .filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT)
          .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
        if (acts[0]?.id) await deleteActivity(acts[0].id);
      };
      setOverlay(c.key, { kind: "receipt", lane: "do", title: c.title, line: receiptLine(p, today), undo });
      flash(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") return;
    // B3 — the soft duplicate-send guard in the quick-✓'s grammar (window.confirm; decline
    // writes nothing, the card stays). R&R resubmissions are never guarded.
    const prior = priorSameTypeSend(activitiesRef.current, q.id, action.target as QueryStatus, action.markKind === "resubmit");
    if (prior && !window.confirm(duplicateSendPrompt(action.target as QueryStatus, c.who, prior))) return;
    const p = quickSendPayload({ cardKey: c.key, label: c.title, taskType: c.taskType, queryId: q.id, targetStatus: action.target as QueryStatus, isResubmit: action.markKind === "resubmit", method: q.sendMethod, nowIso });
    const prev = q.status as QueryStatus;
    await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path
    const line = receiptLine(p, today, materialOptsForTask(c.taskType));
    const undo = () => undoQueryStatus(q.id, prev, p.targetStatus);
    const edit = async () => {
      // "Edit details" = undo the quick write, then re-open the journey PRE-FILLED with what was
      // logged — saving again writes once, honestly.
      await undo();
      clearOverlay(c.key);
      setFlowPrefill({ sentDate: p.sentDate.slice(0, 10), method: p.method, materials: p.materials });
      openFlowCards([c]);
    };
    setOverlay(c.key, { kind: "receipt", lane: "do", title: c.title, line, undo, edit });
    flash(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
  }

  function quickPause(c: BoardCard) {
    if (c.taskType === "no_response_close") { setOverlay(c.key, { kind: "fork", single: true }); return; }
    const lane = (c.stream === "nt" ? "nt" : c.stream === "hk" ? "hk" : "do") as "do" | "hk" | "nt";
    const plus7 = new Date(Date.now() + 7 * 86400000).toISOString();
    if (c.userTaskId) {
      const key = { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId };
      upsertTaskFlag(key, { snoozedUntil: plus7, bumpSnooze: true });
      const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
      const muteUndo = () => upsertTaskFlag(key, { snoozedUntil: null });
      setOverlay(c.key, {
        kind: "dismissed", lane, text: "Snoozed — back in a week.", undo,
        never: () => { upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL }); setOverlay(c.key, { kind: "dismissed", lane, text: "Muted — we won’t ask again.", undo: muteUndo }); flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await muteUndo(); clearOverlay(c.key); flash("Restored"); } }); },
      });
      flash(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    if (!c.taskType || !c.relatedRecordId) return;
    dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", 7);
    const key = flagKeyForTask(c.taskType, c.relatedRecordId);
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
    const muteUndo = () => upsertTaskFlag(key, { snoozedUntil: null });
    setOverlay(c.key, {
      kind: "dismissed", lane, text: "Snoozed — back in a week.", undo,
      never: () => { upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL }); setOverlay(c.key, { kind: "dismissed", lane, text: "Muted — we won’t ask again.", undo: muteUndo }); flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await muteUndo(); clearOverlay(c.key); flash("Restored"); } }); },
    });
    flash(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
  }

  // Grouped-card ⏸ fork actions — mute scopes, stated plainly. Nothing is ever deleted.
  function forkNotNowGroup(g: HkGroup) {
    g.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", 7));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); };
    const key = `group-${g.rule}`;
    setOverlay(key, { kind: "dismissed", lane: "hk", text: "Snoozed — back in a week.", undo });
    flash(`✓ ${HK_RULES[g.rule].label} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(key); flash("Restored"); } });
  }
  function forkNeverThese(g: HkGroup) {
    g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: MUTED_UNTIL }));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null })); };
    const key = `group-${g.rule}`;
    setOverlay(key, { kind: "dismissed", lane: "hk", text: "Muted — we won’t ask about these agents again.", undo });
    flash(`✓ ${HK_RULES[g.rule].label} — dismissed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(key); flash("Restored"); } });
  }
  function forkNeverRule(g: HkGroup) {
    // rule-mute now carries its own Undo (the finishing pack's compensator-table gap): the
    // reversal is the profile filter-out — the same write unmuteRule performs.
    updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), g.rule])) });
    clearOverlay(`group-${g.rule}`);
    const undo = () => updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== g.rule) });
    flash(`✓ ${HK_RULES[g.rule].label} — dismissed`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }
  function forkStale(c: BoardCard, mode: "notNow" | "neverThis") {
    if (!c.taskType || !c.relatedRecordId) return;
    const key = flagKeyForTask(c.taskType, c.relatedRecordId);
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null });
    if (mode === "notNow") {
      dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", 7);
      const snoozeUndo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
      setOverlay(c.key, { kind: "dismissed", lane: "hk", text: "Snoozed — back in a week.", undo: snoozeUndo });
      flash(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await snoozeUndo(); clearOverlay(c.key); flash("Restored"); } });
    } else {
      upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
      setOverlay(c.key, { kind: "dismissed", lane: "hk", text: "Muted — we won’t ask about this query again.", undo });
      flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
    }
  }
  async function addTask() {
    const text = window.prompt("New note");
    if (text && text.trim()) await addUserTask({ text: text.trim() });
  }

  return (
    <F12Page tools={<F12Account onClick={() => onNavigate("account")} />}>
      <div className="tdb-wrap" ref={wrapRef}>
        {/* ── the workbench row (Option B, todo-workbench-shell-v1.html): floating drawer
            (sticky, foldable) beside a CENTRED ~1150px content column — max-width discipline at
            every viewport, surplus pools as symmetric desk. The old full-bleed header band +
            .tdb-ribbon are RETIRED (the masthead is recomposed inside the column); Walk me
            through lives in the drawer now. ── */}
        {/* ── A1: the masthead returns to a FULL-WIDTH paper band above the drawer+column row
            (1px base rule; scrolls away with the wrap). Its content keeps the 1150 discipline,
            viewport-centred. ── */}
        <div className="tdb-mastband">
          <div className="tdb-mastcol">
            {/* V P1/VI — the spacers hold the flanking columns' zones so the title starts at
                content-left and the search right-aligns to the main column's edge. */}
            <div className="tdb-mastspacer" aria-hidden />
            {renderMasthead()}
            <div className="tdb-mastspacer-r" aria-hidden />
          </div>
        </div>
        <div className="tdb-ws">
          {renderDrawer()}
          <div className="tdb-main">
            <div className="tdb-col">
        {/* ── Polish III P1: the review BANNER (Sun–Mon, undismissed, unreviewed) sits above
            whichever view is active — the review is not a task and enters no lane. ── */}
        {surface?.kind === "banner" && (
          <div className="tdb-rvbanner">
            <span className="tdb-rvcup" aria-hidden>☕</span>
            <div className="tdb-rvbx">
              <div className="tdb-rvk">THE SUNDAY REVIEW · WEEK {surface.weekNumber}</div>
              <h2 className="tdb-rvh">Last week’s progress report is ready</h2>
              <div className="tdb-rvsub2">Check it out — every box ticked here turns the dial in your favour.</div>
            </div>
            <button type="button" className="tdb-rvgo2" onClick={openSundayReview}>Begin the review →</button>
            <button type="button" className="tdb-rvx2" aria-label="Dismiss — it stays available beneath the board" onClick={dismissReviewBanner}>✕</button>
          </div>
        )}
        {/* ── the board — cards or ledger by the masthead toggle; the desk states (new-desk /
            desk-cleared) replace BOTH views. Copy verbatim from todo-empty-states.html. ── */}
        {desk === "new-desk" ? renderNewDesk() : desk === "desk-cleared" ? renderDeskCleared() : active && !anyVisible ? (
          <div className="tdb-nomatch">
            Nothing matches — <button type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(""); }}>clear filters</button>
          </div>
        ) : view === "ledger" ? renderLedger() : (
        <div className="tdb-lanes">
          {(!active || vDo.length > 0 || overlayCards("do").length > 0) && (
          <Lane cls="do" label="Urgent" count={active ? vDo.length : tiles.urgent} isEmpty={vDo.length === 0 && overlayCards("do").length === 0}
            onFocusedSession={() => setFlow({ items: vDo.map((card) => ({ kind: "card", card })), mode: "sweep" })}
            emptyNode={
              <div className="tdb-clear do">
                <span className="tdb-clric" aria-hidden>✓</span>
                <div><div className="tdb-clrt">Nothing needs you.</div>
                <div className="tdb-clrs">{liveQueriesLine(liveQueryCount(queries))}</div></div>
                <span className="tdb-clrhand" aria-hidden>— go write something</span>
              </div>
            }>
            {overlayCards("do")}
            {vDo.map(renderCard)}
          </Lane>
          )}
          {(!active || vGroups.length > 0 || vStale.length > 0 || overlayCards("hk").length > 0) && (
          <Lane
            cls="hk"
            label="Housekeeping"
            count={active ? hkGapCount(vGroups) + vStale.length : tiles.housekeeping}
            isEmpty={vGroups.length === 0 && vStale.length === 0 && overlayCards("hk").length === 0}
            onFocusedSession={() => setFlow({ items: [...vGroups.map((g) => ({ kind: "group" as const, group: g })), ...vStale.map((card) => ({ kind: "card" as const, card }))], mode: "sweep" })}
            emptyNode={
              <div className="tdb-clear hk">
                <div><div className="tdb-clrt">Spotless.</div>
                <div className="tdb-clrs">Every agent record is complete and nothing has gone stale.</div></div>
                <div className="tdb-clrbar">
                  <div className="tdb-pbar"><i style={{ width: "100%" }} /></div>
                  <div className="tdb-pcap"><span>{hkGroupProgress(agents.length, 0).caption}</span><span>100%</span></div>
                </div>
              </div>
            }
            strip={mutedRules.length > 0 && (
              <div className="tdb-rulestrip">
                <span className="tdb-rulestrip-l">Muted:</span>
                {mutedRules.map((r) => (
                  <button key={r} type="button" className="tdb-rulechip" title="Unmute — bring these reminders back" onClick={() => unmuteRule(r)}>
                    {HK_RULES[r].label} ✕
                  </button>
                ))}
              </div>
            )}
          >
            {overlayCards("hk")}
            {vGroups.map(renderGroupCard)}
            {vStale.map(renderCard)}
          </Lane>
          )}
          {(!active || vNt.length > 0 || overlayCards("nt").length > 0) && (
          <Lane cls="nt" label="Notes to self" count={active ? vNt.length : tiles.notes} onAdd={addTask} isEmpty={vNt.length === 0 && overlayCards("nt").length === 0}
            onFocusedSession={() => setFlow({ items: vNt.map((card) => ({ kind: "card", card })), mode: "sweep" })}
            emptyNode={<button type="button" className="tdb-ghostcard" onClick={addTask}><span className="tdb-ge">Nothing jotted yet.</span><span className="tdb-gg">＋ Add a note</span></button>}>
            {overlayCards("nt")}
            {vNt.map(renderCard)}
          </Lane>
          )}
        </div>
        )}
            </div>
          </div>
          {/* VI P1 — "Today", ALWAYS ON: the right column is a constant part of the grid at
              every viewport ≥1200px (no collapsed state, no tab, no drawer); below that the
              masthead chip + popover stand. One renderTodayPanel, two mounts, XOR'd on narrow. */}
          {!narrow && (
            <aside className="tdb-railr" aria-label="Today">
              {renderReviewAfterlife()}
              {renderTodayPanel()}
            </aside>
          )}
        </div>
      </div>

      {view === "ledger" && selVisible.length > 0 && (
        <div className="tdb-bulk" role="toolbar" aria-label={`${selVisible.length} selected`}>
          <span className="tdb-bulkn">{selVisible.length} selected</span>
          <button type="button" onClick={bulkToday}>＋ Today</button>
          <button type="button" onClick={bulkSnooze}>⏸ Snooze</button>
          <button type="button" onClick={bulkDismiss}>Dismiss</button>
          <button type="button" className="x" aria-label="Clear selection" onClick={() => setSel(EMPTY_SEL)}>✕</button>
        </div>
      )}
      {settingsOpen && <TaskSettingsSheet onClose={() => setSettingsOpen(false)} />}
      {tourOpen && <TodoTour onEnd={endTour} />}
      {toast && (
        <div className="tdb-toast" role="status">
          {toast.msg}
          {toast.action && <button type="button" className="tdb-toast-act" onClick={() => { toast.action!.fn(); setToast(null); }}>{toast.action.label}</button>}
        </div>
      )}
      {flow && <FocusFlow items={flow.items} mode={flow.mode} ritual={flow.ritual} onClose={() => { setFlow(null); setFlowPrefill(undefined); }} onNavigate={onNavigate} onToast={flash} prefill={flowPrefill} />}
    </F12Page>
  );

  // ── State A: the new desk (zero queries AND zero agents) — one welcome card replaces the three
  // reels; the two real doorways in; the ghost stack is decoration (CSS only). Copy verbatim. ──
  function renderNewDesk() {
    return (
      <div className="tdb-newdesk">
        <div className="tdb-ndtxt">
          <h2>A clean desk — <em>for now.</em></h2>
          <p>Once you’re querying, this page fills itself: requests and deadlines land in <b>Urgent</b>, record tidy-ups gather in <b>Housekeeping</b>, and your own reminders live in <b>Notes to self</b>. Nothing to track by hand.</p>
          <div className="tdb-ndacts">
            <button type="button" className="tdb-ndpri" onClick={() => onNavigate("queries", "Log a query")}>Start your first query →</button>
            <button type="button" className="tdb-ndsec" onClick={() => onNavigate("agents")}>Add agents to your contact list</button>
          </div>
        </div>
        <div className="tdb-ghoststack" aria-hidden>
          <div className="tdb-gc g1"><div className="tdb-gl gtag" /><div className="tdb-gl w85" /><div className="tdb-gl w60" /></div>
          <div className="tdb-gc g2"><div className="tdb-gl gtag" /><div className="tdb-gl w85" /><div className="tdb-gl w40" /></div>
          <div className="tdb-handnote">— your future to-dos</div>
        </div>
      </div>
    );
  }

  // ── State E: "Desk cleared." — all three sets empty AND the done-log is non-empty (earned,
  // never default: with nothing cleared today the per-reel states render instead). ──
  function renderDeskCleared() {
    const { visible, more } = clearedListCap(doneCards);
    return (
      <div className="tdb-walked">
        <div className="tdb-clric big" aria-hidden>✓</div>
        <h2>Desk cleared.</h2>
        <p>Nothing needs you, the records are spotless, and today you cleared:</p>
        <span className="tdb-strike">
          {visible.map((c) => (
            <span key={c.key} className="tdb-strow"><span className="tdb-stick" aria-hidden>✓</span><span className="tdb-sdx">{c.title}</span></span>
          ))}
          {more > 0 && <span className="tdb-smore">and {more} more</span>}
        </span>
        <br />
        <span className="tdb-clrhand big" aria-hidden>— the waiting is the work. Go write.</span>
      </div>
    );
  }

  // ── the one-row masthead (Option B mast2): title + date/week eyebrow left, the 42px post-its +
  // then search (⌘K). The view toggle lives in the filter card (III P3); weekOfQuerying is the
  // dashboard's derivation, consumed — never re-derived. ──
  function renderMasthead() {
    return (
      <div className="tdb-mast">
        <span className="tdb-askwrap">
          <span className="tdb-rdate">{shortHeaderDate(now)} · {weekOfQuerying(queries, new Date(now))}</span>
          <span className="tdb-ask">What’s on your desk?</span>
        </span>
        <span className="tdb-postits">
          <button type="button" className={`tdb-postit ug${tiles.urgent === 0 ? " zero" : ""}`} aria-label={`${tiles.urgent} urgent — jump to the Urgent section`} onClick={() => scrollToLane("do")}>
            <span className="tdb-pv" aria-hidden>{tiles.urgent}</span><span className="tdb-pk" aria-hidden>urgent</span>
          </button>
          <button type="button" className={`tdb-postit hk${tiles.housekeeping === 0 ? " zero" : ""}`} aria-label={`${tiles.housekeeping} housekeeping — jump to the Housekeeping section`} onClick={() => scrollToLane("hk")}>
            <span className="tdb-pv" aria-hidden>{tiles.housekeeping}</span><span className="tdb-pk" aria-hidden>housekpg</span>
          </button>
          <button type="button" className={`tdb-postit nt${tiles.notes === 0 ? " zero" : ""}`} aria-label={`${tiles.notes} notes to self — jump to the Notes section`} onClick={() => scrollToLane("nt")}>
            <span className="tdb-pv" aria-hidden>{tiles.notes}</span><span className="tdb-pk" aria-hidden>notes</span>
          </button>
        </span>
        {narrow && (
          <span className="tdb-todaypopwrap">
            <button type="button" className="tdb-todaychip" aria-haspopup="dialog" aria-expanded={todayPopOpen} onClick={() => setTodayPopOpen((v) => !v)}>
              Today · {committedCards.length} TO GO
            </button>
            {todayPopOpen && (
              <div className="tdb-todaypop" role="dialog" aria-label="Today">{renderReviewAfterlife()}{renderTodayPanel()}</div>
            )}
          </span>
        )}
        <span className="tdb-sp" />
        <div className="tdb-msrch">
          <span aria-hidden>⌕</span>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search your desk…"
            aria-label="Search your desk"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); (e.target as HTMLInputElement).blur(); } }}
          />
          <kbd aria-hidden>⌘K</kbd>
        </div>
      </div>
    );
  }

  // ── THE PINNED PAIR (III P3, pair ref): the Focus card (the guided walk, renamed) over the
  // filter card (toggle top row · status line · the pill cloud · ⚙/? foot). One sticky stack;
  // folds to a 64px icon rail (width transition; persisted sa.todoDrawer). ──
  function renderDrawer() {
    if (folded) {
      return (
        <aside className="tdb-pair folded" aria-label="Workbench sidebar (folded)">
          <button type="button" className="tdb-dic" title="Focus mode" aria-label={`Focus mode — begin with ${tiles.urgent} item${tiles.urgent === 1 ? "" : "s"}`} disabled={!tiles.urgent} onClick={() => openFlowCards(board.do)}>▶</button>
          <span className="tdb-dsp" />
          <button type="button" className="tdb-dic" title="Task settings" aria-label="Task settings" onClick={() => setSettingsOpen(true)}>⚙</button>
          <button type="button" className="tdb-dfold" title="Unfold the sidebar" aria-label="Unfold the sidebar" aria-expanded={false} onClick={() => setFold(false)}>»</button>
        </aside>
      );
    }
    // III P3 — the pill-cloud filter: the board's own tag vocabulary as REAL toggle buttons
    // (aria-pressed; filled=active, outline=off, half-opacity at zero — zero rows grey, never hide).
    const fpill = (label: string, key: keyof TodoFilterState, count: number | null, famCls: string) => (
      <button type="button" className={`tdb-fp ${famCls}${filters[key] ? " on" : ""}${count === 0 ? " zero" : ""}`} aria-pressed={filters[key]} onClick={() => setF(key, !filters[key])}>
        {label}{count != null ? ` · ${count}` : ""}
      </button>
    );
    // the status line's sources are the SAME derivations the board consumes — never parallel counts
    const shownX = vDo.length + hkGapCount(vGroups) + vStale.length + vNt.length;
    const shownY = tiles.urgent + tiles.housekeeping + tiles.notes;
    return (
      <aside className="tdb-pair" aria-label="Workbench sidebar">
        {/* card 1 — FOCUS MODE (the guided walk's home; same handler, same count derivation) */}
        <button type="button" className="tdb-paircard tdb-focus" disabled={!tiles.urgent} onClick={() => openFlowCards(board.do)}>
          <span className="tdb-focustx">
            <b className="tdb-focush">Focus mode</b>
            <span className="tdb-focusp">No distractions — work through your list, item by item.</span>
            <span className="tdb-focusgo">▶ Begin</span>
          </span>
          {focusArt && <span className="tdb-focusart"><img src={focusArt} alt="" /></span>}
        </button>
        {/* card 2 — THE FILTER CARD: toggle top row · status line · the pill cloud · foot */}
        <div className="tdb-paircard tdb-fcard">
        <div className="tdb-ftop">
          <div className="tdb-vtg" role="group" aria-label="View">
            <button type="button" className={view === "cards" ? "on" : ""} aria-pressed={view === "cards"} onClick={() => pickView("cards")}>▦ Cards</button>
            <button type="button" className={view === "ledger" ? "on" : ""} aria-pressed={view === "ledger"} onClick={() => pickView("ledger")}>☰ Ledger</button>
          </div>
          <button type="button" className="tdb-dfold" title="Fold the sidebar" aria-label="Fold the sidebar" aria-expanded onClick={() => setFold(true)}>«</button>
        </div>
        <div className="tdb-fstatus">
          Showing {shownX} of {shownY}
          {shownX !== shownY && <button type="button" className="tdb-freset" onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(""); }}>RESET</button>}
        </div>
        <div className="tdb-fgrp2">
          <div className="tdb-fgh">URGENT · {tiles.urgent}</div>
          <div className="tdb-fcloud">
            {fpill("★ OFFERS", "offers", fc.offers, "p")}
            {fpill("OVER TO YOU", "overToYou", fc.overToYou, "p")}
          </div>
        </div>
        <div className="tdb-fgrp2">
          <div className="tdb-fgh">HOUSEKEEPING · {tiles.housekeeping}</div>
          <div className="tdb-fcloud">
            {fpill("MATERIALS", "materials", fc.materials, "c")}
            {fpill("WISH LISTS", "mswl", fc.mswl, "c")}
            {fpill("STALE", "stale", fc.stale, "c")}
            {fpill("SNOOZED", "snoozed", fc.snoozed, "c")}
          </div>
        </div>
        <div className="tdb-fgrp2">
          <div className="tdb-fgh">SHOW</div>
          <div className="tdb-fcloud">
            {fpill("✓ ON TODAY ONLY", "todayOnly", null, "s")}
          </div>
        </div>
        <div className="tdb-footrows">
          <button type="button" className="tdb-fr2" onClick={() => setSettingsOpen(true)}>
            <span className="tdb-fric" aria-hidden><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2.2" fill="var(--paper)" />
              <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2.2" fill="var(--paper)" />
              <line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="18" r="2.2" fill="var(--paper)" />
            </svg></span>
            Task settings
          </button>
        </div>
        </div>
      </aside>
    );
  }

  // ── VI P2: the review's AFTERLIFE — after ✕ or from Tuesday while unreviewed, a cup card at
  // the top of the right column, directly above Today (the thin bar is retired). The whole card
  // is the button; it opens the review mode unchanged. Absent → Today rises with no gap. ──
  function renderReviewAfterlife() {
    if (surface?.kind !== "card") return null;
    return (
      <button type="button" className="tdb-rvcard" onClick={openSundayReview}>
        <span className="tdb-rvcup2" aria-hidden dangerouslySetInnerHTML={{ __html: reviewCupRaw }} />
        <span className="tdb-rvtx"><b>Last week in review</b><i>WEEK {surface.weekNumber} · NOT YET OPENED</i></span>
        <span className="tdb-rvgo3" aria-hidden>›</span>
      </button>
    );
  }

  // ── the "Today" card (VI P1, todo-right-column-v1.html) — same state, same handlers
  // (rollover Keep/Clear, committed rows + take-off, Help me pick, Work the list); the anatomy is
  // the ref card: plain paper header (date ⇄ "{n} OF 5"), committed items above a dashed
  // ghost-row invitation (todayGhosts), the collapsed-by-default done row, two footer verbs. ──
  const GHOST_BARS = [64, 78, 52]; // the ref's faded text-bar widths, cycled
  function renderTodayPanel() {
    const ghosts = todayGhosts(committedCards.length, doneN);
    return (
      <div className="tdb-today2">
        <div className="tdb-th">
          <b className="tdb-t">Today</b>
          <i className="tdb-thr">{committedCards.length === 0 && doneN === 0 ? shortHeaderDate(now) : `${committedCards.length} OF ${MAX_TODAY}`}</i>
        </div>
        {rolled.length > 0 && (
          <div className="tdb-rollbar">
            <span className="tdb-rolltx"><b>{rolled.length}</b> {rolled.length === 1 ? "item" : "items"} rolled over from a previous day.</span>
            <button type="button" onClick={keepRolled}>Keep</button>
            <button type="button" className="drop" onClick={dropRolled}>Clear</button>
          </div>
        )}

        {/* the middle region — P4 makes this the card's one scroller */}
        <div className="tdb-tmid2">
          {committedCards.length > 0 && (
            <div className="tdb-tcommit">
              {committedCards.map((c) => (
                <div key={c.key} className="tdb-trow" onClick={() => openFlowCards([c])}>
                  <span className="tdb-tdot">{!c.hk && !c.userTaskId && c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={16} /> : null}</span>
                  <div className="tdb-tmid"><div className="tdb-tx">{c.title}</div><div className="tdb-tm">{c.record}</div></div>
                  <button type="button" className="tdb-x" title="Take off Today" onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {ghosts > 0 && (
            <div className="tdb-ghostbox" aria-hidden>
              {Array.from({ length: ghosts }, (_, i) => (
                <div key={i} className="tdb-grow"><span className="tdb-cbx" /><span className="tdb-gbar" style={{ width: `${GHOST_BARS[i % GHOST_BARS.length]}%` }} /></div>
              ))}
            </div>
          )}
          {/* done today — collapsed to the ✓ row by default, expanding IN PLACE (session-only);
              the divider + log appear WITH the first completion, never before */}
          {doneN > 0 && (
            <>
              <button type="button" className="tdb-donerow" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>✓ {doneN} DONE TODAY {showDone ? "▾" : "▸"}</button>
              {showDone && (
                <div className="tdb-tdone">
                  {doneCards.map((c) => (
                    <div key={c.key} className="tdb-drow">
                      <span className="tdb-tick">✓</span>
                      <div className="tdb-tmid"><div className="tdb-dx">{c.title}</div><div className="tdb-dm2">{[c.record, fmtTime(c.whenMs)].filter(Boolean).join(" · ")}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="tdb-tf2">
          {committedCards.length > 0 ? (
            <>
              <button type="button" className="tdb-pick" onClick={helpMePick}>＋ Add more</button>
              <button type="button" className="tdb-worklist" onClick={() => {
                // C2 family law — the Today walk is a ritual: sage bands whole-walk
                setFlow({ items: committedCards.map((card) => ({ kind: "card", card })), ritual: true });
              }}>Work the list</button>
            </>
          ) : (
            <>
              <button type="button" className="tdb-pick" onClick={helpMePick}>Help me pick</button>
              {/* the manual doorway — commitment happens on the board's cards */}
              <button type="button" className="tdb-worklist" onClick={() => scrollToLane("do")}>＋ Add</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── THE LEDGER (workbench P3; ref todo-ledger-v1.html) — a re-projection of the SAME board
  // sets the cards render: shared 9-col grid, tinted section heads, typed batch parents with
  // full-cohort expansion, StatusDot verbatim in the STATUS column. Rows open the same journeys
  // (openFlowCards / group flow); the td circle is the same toggleToday. ──
  function ledgerCardRow(c: BoardCard) {
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    const ag = q ? agents.find((a) => a.id === q.agentId) : undefined;
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    const isOffer = c.taskType === "offer_received";
    const isNote = !c.taskType;
    const det = ledgerDetail(c, { queries, taskFlags }, now);
    const committed = onList(c);
    const isSel = selVisible.includes(c.key);
    const isFocus = ledgerOrder[kfocus] === c.key;
    return (
      <div key={c.key} data-lkey={c.key} className={`tdb-lrow${isSel ? " lsel-on" : ""}${isFocus ? " kfocus" : ""}${kebabAt === c.key ? " kebab-open" : ""}`} onClick={() => openFlowCards([c])}>
        <span className="tdb-lselc" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" className="tdb-lsel" checked={isSel} readOnly aria-label={`Select ${ledgerTitle(c)}`} onClick={(e) => { e.stopPropagation(); clickSelect(c.key, e.shiftKey); }} />
        </span>
        <button type="button" className={`tdb-ltd${committed ? " on" : ""}`} title={committed ? "On Today — take off" : "＋ Today"} aria-label={committed ? "Take off Today" : "Add to Today"} aria-pressed={committed} onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>✓</button>
        <span className={`tdb-tag${isOffer ? " offer" : c.warn ? " due warn" : " due"}`}>{isOffer ? "★ OFFER" : isNote ? "NOTE" : c.snoozes > 0 ? `Snoozed ×${c.snoozes}` : c.due}</span>
        <span className="tdb-lagn">
          {ag ? (<><span className="tdb-miniav">{c.initials}</span><b>{c.who}</b>{ag.agency && <i>· {ag.agency.toUpperCase()}</i>}</>) : (<><span className="tdb-miniav">{c.initials}</span><b>{c.who || "—"}</b></>)}
        </span>
        <span className="tdb-lti">{ledgerTitle(c)}</span>
        <span className="tdb-lms">{ms?.title ?? ""}</span>
        <span className="tdb-lsd">{c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={13} /> : null}</span>
        <span className={`tdb-ldt${det.tone === "hot" ? " hot" : det.tone === "dim" ? " dim" : ""}`}>{det.label}</span>
        <span className="tdb-lacts">
          {!isOffer && <button type="button" title="Quick done" aria-label="Quick done" onClick={(e) => { e.stopPropagation(); quickDone(c); }}>✓</button>}
          {!isOffer && <button type="button" title="Snooze / stop asking" aria-label="Snooze or stop asking" onClick={(e) => { e.stopPropagation(); quickPause(c); }}>⏸</button>}
          {!isOffer && (
            <button type="button" title="More" aria-label="More actions" aria-haspopup="menu" aria-expanded={kebabAt === c.key} onClick={(e) => { e.stopPropagation(); setKebabAt(kebabAt === c.key ? null : c.key); }}>⋯</button>
          )}
          {kebabAt === c.key && (
            <>
              <div className="tdb-kebback" onClick={(e) => { e.stopPropagation(); setKebabAt(null); }} />
              <div className="tdb-kebab" role="menu" aria-label="Row actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" role="menuitem" onClick={() => kebabDismiss(c)}>Dismiss</button>
                {c.relatedRecordId && !c.userTaskId && (
                  <button type="button" role="menuitem" onClick={() => { setKebabAt(null); onNavigate("queries", c.relatedRecordId); }}>Open query</button>
                )}
                <button type="button" role="menuitem" onClick={() => { setKebabAt(null); setSettingsOpen(true); }}>Task settings</button>
              </div>
            </>
          )}
        </span>
      </div>
    );
  }
  function ledgerBatchRow(g: HkGroup) {
    const open = !!openBatches[g.rule];
    const det = batchDetail(g, agents.length);
    const faces = g.members.slice(0, 3);
    const kids = open ? batchChildren(g, agents, taskFlags) : [];
    const memberIds = new Set(g.members.map((m) => m.agentId).filter(Boolean));
    const openAt = (agentId?: string) => {
      if (!agentId || !memberIds.has(agentId)) { setFlow({ items: [{ kind: "group", group: g }] }); return; }
      // deep-link: the SAME group flow, members reordered target-first (no FocusFlow change)
      const members = [...g.members.filter((m) => m.agentId === agentId), ...g.members.filter((m) => m.agentId !== agentId)];
      setFlow({ items: [{ kind: "group", group: { ...g, members } }] });
    };
    return (
      <React.Fragment key={g.rule}>
        <div data-lkey={`group-${g.rule}`} className={`tdb-lrow batchp${open ? " open" : ""}${selVisible.includes(`group-${g.rule}`) ? " lsel-on" : ""}${ledgerOrder[kfocus] === `group-${g.rule}` ? " kfocus" : ""}`} onClick={() => toggleBatch(g.rule)}>
          <span className="tdb-lselc" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" className="tdb-lsel" checked={selVisible.includes(`group-${g.rule}`)} readOnly aria-label={`Select ${g.meta.label} (the whole batch)`} onClick={(e) => { e.stopPropagation(); clickSelect(`group-${g.rule}`, e.shiftKey); }} />
          </span>
          <span />
          <span className="tdb-ltagcell">
            <button type="button" className="tdb-lchev" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${g.meta.label}`} onClick={(e) => { e.stopPropagation(); toggleBatch(g.rule); }}>▶</button>
            <span className="tdb-tag due">{g.meta.label.toUpperCase()}</span>
          </span>
          <span className="tdb-lagn">
            <span className="tdb-lstack">{faces.map((m) => <span key={m.card.key} className="tdb-miniav">{m.card.initials}</span>)}</span>
            <i>{g.members.length} AGENTS</i>
          </span>
          <span className="tdb-lti">{batchTaskCopy(g.rule)}</span>
          <span className="tdb-lms" />
          <span className="tdb-lsd" />
          <span className="tdb-ldt"><span className="tdb-lbar" aria-hidden><i style={{ width: `${det.pct}%` }} /></span>{det.caption}</span>
          <span className="tdb-lacts">
            <button type="button" title="Batch fix" aria-label={`Batch fix — ${g.meta.label}`} onClick={(e) => { e.stopPropagation(); setFlow({ items: [{ kind: "group", group: g }] }); }}>→</button>
          </span>
        </div>
        {open && kids.map((k) => (
          <div key={`${g.rule}-${k.agentId ?? k.name}`} className="tdb-lrow lchild">
            <span /><span /><span />
            <span className="tdb-lagn"><span className="tdb-miniav">{k.initials}</span><b>{k.name}</b>{k.agency && <i>· {k.agency.toUpperCase()}</i>}</span>
            <span className={`tdb-lti${k.done ? " struck" : ""}`}>Add {g.meta.need === "mswl" ? "wish list" : g.meta.need === "materials" ? "materials" : "reply window"}</span>
            <span className="tdb-lms" />
            <span className="tdb-lsd" />
            {/* grant 2: dated only where the flow stamped resolvedAt — never invented */}
            <span className={`tdb-ldt${k.done ? " sage" : " dim"}`}>{k.done ? `✓ RECORDED${k.doneDate ? ` ${k.doneDate.toUpperCase()}` : ""}` : "NOT RECORDED"}</span>
            <span className="tdb-lacts kid">
              {!k.done && k.agentId && memberIds.has(k.agentId) && (
                <button type="button" className="tdb-ladd" onClick={(e) => { e.stopPropagation(); openAt(k.agentId); }}>ADD →</button>
              )}
            </span>
          </div>
        ))}
        {open && (
          <div className="tdb-lchildmore">
            <button type="button" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>OPEN BATCH FIX — WORK THROUGH ALL {g.members.length} →</button>
          </div>
        )}
      </React.Fragment>
    );
  }
  function ledgerSection(opts: { cls: "p" | "c" | "n"; id: string; label: string; count: number; onSession?: () => void; onAdd?: () => void; children: React.ReactNode; total: number; hidden: number; showAllKey: string }) {
    return (
      <div className="tdb-tbl" id={opts.id}>
        <div className={`tdb-lghead ${opts.cls}`}>
          {opts.onSession && (
            <button type="button" className="tdb-playb" title={`Focus on ${opts.label}`} aria-label={`Focus on ${opts.label}`} onClick={opts.onSession}>
              <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden><path d="M1 1 L10 6 L1 11 Z" fill="currentColor" /></svg>
            </button>
          )}
          <span className="tdb-lgt">{opts.label}</span>
          <span className="tdb-ln">{opts.count}</span>
          {opts.onAdd && <button type="button" className="tdb-cadd" onClick={opts.onAdd} aria-label="Add a note">＋</button>}
        </div>
        <div className="tdb-lcols" aria-hidden>
          <span /><span /><span>TYPE</span><span>AGENT</span><span>TASK</span><span>MANUSCRIPT</span><span className="ctr">STATUS</span><span className="r sort">DETAIL ↓</span><span />
        </div>
        {opts.children}
        {opts.hidden > 0 && (
          <div className="tdb-lmore">
            <button type="button" onClick={() => setShowAllSec((s) => ({ ...s, [opts.showAllKey]: true }))}>SHOW ALL {opts.total} →</button>
          </div>
        )}
      </div>
    );
  }
  function renderLedger() {
    // The review entry card is card-furniture (its own mode + dismiss ✕) — the scrap + cards view
    // carry it; the ledger lists workable rows only. Row model hoisted above (P5 shares it).
    return (
      <div className="tdb-ledger">
        {doSorted.length > 0 && ledgerSection({
          cls: "p", id: "tdb-lane-do", label: "Urgent", count: active ? doSorted.length : tiles.urgent,
          onSession: () => setFlow({ items: doSorted.map((card) => ({ kind: "card", card })), mode: "sweep" }),
          total: doSorted.length, hidden: doCut.hidden, showAllKey: "do",
          children: doCut.visible.map(ledgerCardRow),
        })}
        {(vGroups.length > 0 || vStale.length > 0) && ledgerSection({
          cls: "c", id: "tdb-lane-hk", label: "Housekeeping", count: active ? hkGapCount(vGroups) + vStale.length : tiles.housekeeping,
          onSession: () => setFlow({ items: [...vGroups.map((g) => ({ kind: "group" as const, group: g })), ...vStale.map((card) => ({ kind: "card" as const, card }))], mode: "sweep" }),
          total: hkTop.length, hidden: hkCut.hidden, showAllKey: "hk",
          children: hkCut.visible.map((r) => (r.kind === "group" ? ledgerBatchRow(r.g) : ledgerCardRow(r.c))),
        })}
        {vNt.length > 0 && ledgerSection({
          cls: "n", id: "tdb-lane-nt", label: "Notes to self", count: active ? vNt.length : tiles.notes,
          onSession: () => setFlow({ items: vNt.map((card) => ({ kind: "card", card })), mode: "sweep" }),
          onAdd: addTask,
          total: vNt.length, hidden: ntCut.hidden, showAllKey: "nt",
          children: ntCut.visible.map(ledgerCardRow),
        })}
      </div>
    );
  }

  // ── the quick rail (hover / :focus-within, top-right). Offers get NO rail — they need the moment. ──
  function rail(onDone: () => void, onPause: () => void, hk?: boolean) {
    return (
      <div className="tdb-qrail">
        <button type="button" className={`tdb-qbtn done${hk ? " hk" : ""}`} title="Quick done — logs with stated defaults" aria-label="Quick done" onClick={(e) => { e.stopPropagation(); onDone(); }}>✓</button>
        <button type="button" className="tdb-qbtn dis" title="Snooze / stop asking" aria-label="Snooze or stop asking" onClick={(e) => { e.stopPropagation(); onPause(); }}>⏸</button>
      </div>
    );
  }

  // ── the Sunday-review entry card (finishing P3): derived + dismissible for the week; its click
  //    opens the weeklyReview mode with the live Urgent cards as the seed source. ──
  // MUST be a hoisted `function` (not a post-return `const`): the banner/bar JSX calls it from
  // within the component's return — a `const` here sits in the TDZ for the whole render (the
  // demotion bug's lesson).
  function openSundayReview() {
    // board.do is review-free by construction (P1) — no filter needed
    setFlow({ items: board.do.map((card) => ({ kind: "card" as const, card })), mode: "weeklyReview" });
  }
  function dismissReviewBanner() {
    if (!surface) return;
    const key = flagKeyForTask("weekly_review", surface.weekKey);
    upsertTaskFlag(key, { snoozedUntil: new Date(Date.now() + 3 * 86400000).toISOString() });
    flash("Dismissed — it stays beneath the board until you review it.", { label: "Undo", fn: async () => { await upsertTaskFlag(key, { snoozedUntil: null }); flash("Restored"); } });
  }

  // Standalone receipt/dismissed cards — the live card vanished with the write; the receipt persists.
  function overlayCards(lane: "do" | "hk" | "nt") {
    return Object.entries(overlays)
      .filter(([, o]) => (o.kind === "receipt" || o.kind === "dismissed") && o.lane === lane)
      .map(([key, o]) => {
        if (o.kind === "receipt") return (
          <div key={`ov-${key}`} className="tdb-tile receipt">
            <div className="tdb-frame">
              <div className="tdb-receiptbody">
                <div className="tdb-rk"><span className="tdb-rtick">✓</span><span className="tdb-rt">{o.title}</span></div>
                <div className="tdb-rlog">{o.line}<br />Wrong? Fix it before you move on.</div>
                <div className="tdb-racts">
                  {o.edit && <button type="button" className="tdb-ra" onClick={o.edit}>Edit details</button>}
                  {o.undo && <button type="button" className="tdb-ra" onClick={async () => { await o.undo!(); clearOverlay(key); }}>Undo</button>}
                </div>
              </div>
            </div>
          </div>
        );
        if (o.kind !== "dismissed") return null;
        return (
          <div key={`ov-${key}`} className="tdb-tile dismissed">
            <div className="tdb-frame">
              <div className="tdb-dismissbody">
                <div className="tdb-dt">{o.text}</div>
                <div className="tdb-dact">
                  <button type="button" className="tdb-ra" onClick={async () => { await o.undo(); clearOverlay(key); }}>Undo</button>
                  {o.never && <button type="button" className="tdb-ra" onClick={o.never}>Never ask</button>}
                </div>
              </div>
            </div>
          </div>
        );
      });
  }

  function renderFork(key: string, single: boolean, acts: { notNow: () => void; neverThis: () => void; neverRule?: () => void }) {
    return (
      <div className="tdb-neverfork" onClick={(e) => e.stopPropagation()}>
        <div className="tdb-nt2">Stop asking — for how long?</div>
        <button type="button" className="tdb-nb" onClick={acts.notNow}><b>Not now</b>&nbsp;— back in a week</button>
        <button type="button" className="tdb-nb" onClick={acts.neverThis}><b>Never</b>&nbsp;— just {single ? "this query" : "these agents"}</button>
        {acts.neverRule && <button type="button" className="tdb-nb" onClick={acts.neverRule}><b>Never</b>&nbsp;— any agent missing this</button>}
        <button type="button" className="tdb-ncancel" onClick={() => clearOverlay(key)}>Cancel</button>
        <button type="button" className="tdb-nsettings" onClick={() => { clearOverlay(key); setSettingsOpen(true); }}>Change what appears here → Task settings</button>
      </div>
    );
  }

  // ── full-detail lane card (fixed height, clip-safe). Completion = the rail or the sheet; the
  // Mark-done pill is RETIRED and the ＋ TODAY pill goes full-width (committing = the visible button). ──
  function renderCard(c: BoardCard) {
    const committed = onList(c);
    const ov = overlays[c.key];
    const isOffer = c.taskType === "offer_received";
    // Option-A sub: a manuscript title inside the sub renders serif-italic (--ink-2).
    const subIsMs = !!c.subtitle && manuscripts.some((m) => m.title === c.subtitle);
    if (ov?.kind === "fork") {
      return (
        <div key={c.key} className={`tdb-tile ${c.stream}`}>
          <div className="tdb-frame">{renderFork(c.key, true, { notNow: () => forkStale(c, "notNow"), neverThis: () => forkStale(c, "neverThis") })}</div>
        </div>
      );
    }
    return (
      <div key={c.key} className={`tdb-tile ${c.stream}${committed ? " today" : ""}${c.quiet ? " quiet" : ""}${pulsing === c.key ? " pulse" : ""}`} onClick={() => openFlowCards([c])}>
        {!isOffer && rail(() => quickDone(c), () => quickPause(c))}
        <div className="tdb-frame">
          <div className={`tdb-band ${c.stream}`}>
            <div className="tdb-tags">
              <span className={`tdb-tag due${isOffer ? " offer" : c.warn ? " warn" : ""}`}>{isOffer ? `★ ${c.due}` : c.due}</span>
              {c.snoozes > 0 && <span className="tdb-tag snz">Snoozed ×{c.snoozes}</span>}
            </div>
          </div>
          <div className="tdb-body">
            <div className="tdb-mid">
              <div className="tdb-tt">{c.title}</div>
              {c.subtitle && <div className="tdb-tsub">{subIsMs ? <span className="tdb-ms">{c.subtitle}</span> : c.subtitle}</div>}
            </div>
            <div className="tdb-tmeta">
              {c.hk ? <span className="tdb-hkdot" aria-hidden>!</span> : c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={14} /> : <span className="tdb-tdot" />}
              <span className="tdb-miniav">{c.initials}</span>
              <span className="tdb-who">{c.record}</span>
            </div>
            <div className="tdb-tacts">
              <button type="button" className={`tdb-pill today-p${committed ? " on" : ""}`} onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>
                {committed ? "✓ ON TODAY" : "＋ TODAY"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── G3 grouped card (retoken): kicker + serif title w/ inline numeral + one-line sub + REAL-count
  // progress bar + neutral stack + ink-outline Fix-together (+ the quiet Never — behaviour kept).
  // ✓ still flips to the rapid chip-fill; ⏸ still forks. ──
  function renderGroupCard(g: HkGroup) {
    const key = `group-${g.rule}`;
    const ov = overlays[key];
    if (ov?.kind === "flip") {
      return (
        <div key={g.rule} className="tdb-gcard flip">
          <div className="tdb-frame"><GroupFlip
            group={g}
            pro={isProUser(currentUser)}
            onUpgrade={() => onNavigate("plans")}
            onCancel={() => clearOverlay(key)}
            onSaved={(ok, undo) => {
              clearOverlay(key);
              setOverlay(`${key}-r`, { kind: "receipt", lane: "hk", title: `${ok} ${g.meta.label.toLowerCase()} set`, line: "Saved to their profiles. The rest stay on the card — skipping is fine.", undo });
              flash(`${ok} saved`, undo ? { label: "Undo all", fn: async () => { await undo(); clearOverlay(`${key}-r`); } } : undefined);
            }}
            deps={{ agents, updateAgent, resolveTaskFlag }}
          /></div>
        </div>
      );
    }
    if (ov?.kind === "fork") {
      return (
        <div key={g.rule} className="tdb-gcard">
          <div className="tdb-frame">{renderFork(key, false, { notNow: () => forkNotNowGroup(g), neverThis: () => forkNeverThese(g), neverRule: () => forkNeverRule(g) })}</div>
        </div>
      );
    }
    const faces = g.members.slice(0, 4);
    const copy = G3_COPY[g.rule] ?? { rest: () => ` ${g.meta.label.toLowerCase()}`, sub: "" };
    const prog = hkGroupProgress(agents.length, g.members.length);
    return (
      <div key={g.rule} className="tdb-gcard" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>
        {rail(() => setOverlay(key, { kind: "flip" }), () => setOverlay(key, { kind: "fork", single: false }), true)}
        <div className="tdb-frame">
          <div className="tdb-band hk">
            <div className="tdb-tags"><span className="tdb-tag due">{g.meta.label.toUpperCase()}</span></div>
          </div>
          <div className="tdb-body">
            <div className="tdb-mid">
              <div className="tdb-gtt"><span className="tdb-gn">{g.members.length}</span>{copy.rest(g.members.length)}</div>
              <div className="tdb-gsub">{copy.sub}</div>
            </div>
            <div className="tdb-gprog">
              <div className="tdb-pbar"><i style={{ width: `${prog.pct}%` }} /></div>
              <div className="tdb-pcap"><span>{prog.caption}</span><span>{prog.pct}%</span></div>
            </div>
            <div className="tdb-gstack">
              {faces.map((m) => <span key={m.card.key} className="tdb-gsav" title={m.agentName}>{m.card.initials}</span>)}
              {g.members.length > faces.length && <span className="tdb-gmore">+{g.members.length - faces.length}</span>}
              <button type="button" className="tdb-gfix" onClick={(e) => { e.stopPropagation(); setFlow({ items: [{ kind: "group", group: g }] }); }}>Batch fix →</button>
              <button type="button" className="tdb-gnever ghost" title="Stop asking about these — the gaps stay on the profiles" onClick={(e) => { e.stopPropagation(); muteRuleFromCard(g); }}>Never</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default ToDoPage;
