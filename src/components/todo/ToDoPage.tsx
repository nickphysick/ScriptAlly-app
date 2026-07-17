/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToDoPage — the To-do WORKSPACE as an F12 board. Layout (design ref:
 * design-refs/todo-board-final.html): a slim STAT-RIBBON header ("What's on your desk?" + the
 * three post-it counters + "Walk me through", polish v3) over THREE horizontal LANES —
 * Urgent · Housekeeping · Notes to self (Urgent pinned top; page scrolls vertically when the lanes
 * exceed the viewport). The Today's list lives in a CORNER POP-UP (fixed bottom-right FAB with a
 * progress ring → a panel with the committed band + done band; the pop-up anatomy follows the
 * pack's §4 prose — the placement-sketches ref was absent at build time). Drawer / walkthrough /
 * housekeeping-fix internals still follow todo-workspace-v10.html.
 *
 * Presentation + view-model only — the task engine, taskFlags and every write path are untouched;
 * lane renames are UI labels (UserTask / taskType enums unchanged in code). The pure view-model is
 * `src/lib/todoBoard.ts` (assembleBoard → three lanes + the cleared union; todaySplit → the two
 * bands; ribbonTiles → the header counts, housekeeping = GAPS via todoHousekeeping.hkGapCount).
 * Theme: F12 only (`.t-f12` tokens). StatusDot consumed verbatim.
 *
 * The FAB sits at right:70 — LEFT of the AppShell's global help "?" (fixed bottom:20 right:20,
 * 38px, z-30), so the two corner controls never collide.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { F12Page, F12Account } from "../shell/F12Shell";
import { StatusDot } from "../StatusDot";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { assembleBoard, todaySplit, ribbonTiles, laneFadeState, walkSublabel, walkAria, BoardCard, USER_TASK_FLAG_TYPE } from "../../lib/todoBoard";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import {
  choosePicks, rolledOverCards, todayProgress, MAX_TODAY,
  quickSendPayload, quickNudgePayload, receiptLine, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask,
} from "../../lib/todoWalk";
import { saveHkRows } from "../../lib/hkSave";
import { isProUser, fetchAssistedFill, AssistFound } from "../../lib/assistFill";
import { groupHousekeeping, hkGapCount, hkGroupProgress, HkGroup, HkRule, HK_RULES } from "../../lib/todoHousekeeping";
import { deskState, liveQueryCount, liveQueriesLine, clearedListCap } from "../../lib/todoEmpty";
import { shouldAutoRunTour } from "../../lib/todoTour";
import { TodoTour } from "./TodoTour";
import { laneFit, lanePageDistance, LaneFit } from "./laneFit";
import { ActivityType, QueryStatus } from "../../types";
import { FocusFlow, FocusItem } from "./FocusFlow";
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
const G3_COPY: Record<string, { kick: string; rest: (n: number) => string; sub: string }> = {
  dq_responseTime: { kick: "Missing reply windows", rest: (n) => ` agent${n === 1 ? "" : "s"} missing a reply window`, sub: "Without one we can’t tell you when a nudge is fair." },
  dq_materials: { kick: "Missing materials", rest: (n) => ` agent${n === 1 ? "" : "s"} missing a materials list`, sub: "Add what they ask to receive so your package check can run." },
  dq_mswl: { kick: "Missing wish list", rest: (n) => ` agent${n === 1 ? "" : "s"} missing a wish list`, sub: "Their wish list is how we tell you who’s worth querying." },
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

/** One lane: coloured header band + a horizontal card scroller with an overflow fade + scroll-right
 *  chevron (module-level so it keeps its own scroll ref across ToDoPage re-renders). */
const Lane: React.FC<{
  cls: string;
  label: string;
  count: number;
  isEmpty: boolean;
  onAdd?: () => void;
  onFocusedSession?: () => void; // the "Focused session" pill (polish v3 P3 — launches the focus flow's sweep mode, the walkthrough's successor; handler unchanged)
  emptyNode?: React.ReactNode;
  strip?: React.ReactNode; // rendered between the header and the track (e.g. muted-rules recovery chips)
  children?: React.ReactNode;
}> = ({ cls, label, count, isEmpty, onAdd, onFocusedSession, emptyNode, strip, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  // Fix pass P2 — exact-fit + pagers. ONE check does both jobs: the fit maths (laneFit → the
  // --tdb-cardw var + a ref for paging) and the polish pass's two-boolean scroll state
  // (todoBoard.laneFadeState, unmodified — it now drives the pager disabled states instead of the
  // retired fades). Functional update bails out when neither boolean changed.
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const fitRef = useRef<LaneFit>({ n: 1, cardWidth: 330 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const fit = laneFit(el.clientWidth);
      fitRef.current = fit;
      el.style.setProperty("--tdb-cardw", `${fit.cardWidth}px`);
      setScrollState((prev) => {
        const next = laneFadeState(el.scrollLeft, el.scrollWidth, el.clientWidth);
        return next.left === prev.left && next.right === prev.right ? prev : next;
      });
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [children]);
  const page = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * lanePageDistance(fitRef.current), behavior: "smooth" });
  return (
    <div className={`tdb-reel ${cls}`} id={`tdb-lane-${cls}`}>
      <div className="tdb-reelh">
        <span className={`tdb-lanedot ${cls}`} aria-hidden />
        <span className="tdb-lt">{label}</span>
        <span className="tdb-ln">{count}</span>
        <span className="tdb-rule" aria-hidden />
        {onFocusedSession && !isEmpty && (
          <button type="button" className="tdb-fs" title="Focused session — D done · S snooze · → skip" aria-label={`Start a focused session on ${label}`} onClick={onFocusedSession}>
            <span className="tdb-fsd" aria-hidden />Focused session
          </button>
        )}
        {onAdd && <button type="button" className="tdb-cadd" onClick={onAdd} aria-label="Add a note">＋</button>}
        {!isEmpty && (
          <span className="tdb-pagers">
            <button type="button" className="tdb-pager" disabled={!scrollState.left} onClick={() => page(-1)} aria-label={`Previous ${label} cards`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button type="button" className="tdb-pager" disabled={!scrollState.right} onClick={() => page(1)} aria-label={`Next ${label} cards`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </span>
        )}
      </div>
      {strip}
      {isEmpty ? (
        <div className="tdb-emptyreel">{emptyNode}</div>
      ) : (
        <div className="tdb-scroller" ref={ref}>{children}</div>
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
  const [flow, setFlow] = useState<{ items: FocusItem[]; mode?: "sweep" | "weeklyReview" } | null>(null);
  const [flowPrefill, setFlowPrefill] = useState<{ sentDate?: string; method?: string; materials?: string[] } | undefined>(undefined);
  const [todayOpen, setTodayOpen] = useState(false);
  // Chrome-fixes P1 — THE close path (the ✕, click-away and Esc all land here; never parallel
  // close logic). Click-away: document-level pointerdown while expanded only; clicks on the
  // add-to-list pills are exempt (adding while the list is open lets you watch the item land),
  // and everything is inert while a FocusFlow sheet is up (its Esc/dismiss handling wins — and a
  // Work-the-list journey must return you to the still-open list).
  const closeToday = () => setTodayOpen(false);
  // Chrome-fixes P2 — the done badge doubles as the band's show/hide; pressed/shown by default.
  const [showDone, setShowDone] = useState(true);
  useEffect(() => {
    if (!todayOpen) return;
    const onDown = (e: PointerEvent) => {
      if (flow) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest(".tdb-pop")) return; // inside the pop-up
      if (t.closest(".tdb-pill.today-p")) return; // the add-to-list exemption (Step 0 item 3's set)
      closeToday();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !flow) closeToday(); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayOpen, flow]);
  const openFlowCards = (cards: BoardCard[]) => {
    // the Sunday-review entry card never enters card journeys/walks — it has its own mode
    const flowable = cards.filter((c) => c.taskType !== "weekly_review");
    if (flowable.length) setFlow({ items: flowable.map((card) => ({ kind: "card", card })) });
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

  const board = useMemo(
    () => assembleBoard({ tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now }),
    // now/today are session-stable enough; recomputing on the data arrays is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, today],
  );
  // The Housekeeping lane renders the dq rules GROUPED (one card per rule, queried-first members) +
  // STALE queries as INDIVIDUAL cards (real one-off decisions, never batched). The flat board.hk
  // still feeds Today's-list + Help-me-pick unchanged. Rule-muted groups drop out here too.
  const hkGroups = useMemo(
    () => groupHousekeeping(board.hk, agents, currentUser?.mutedTaskRules, queries),
    [board.hk, agents, currentUser, queries],
  );
  const staleCards = useMemo(() => board.hk.filter((c) => c.taskType === "no_response_close"), [board.hk]);
  // the demoted Sunday review (Tue–Sat, unreviewed week) — its own slot between groups and stale;
  // groupHousekeeping ignores the type, so it must be lifted out explicitly
  const demotedReview = board.hk.find((c) => c.taskType === "weekly_review");
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

  // Today's list: committed band (committedDate === today, the 5-cap set) + done band (the cleared
  // union, uncapped). Rolled-over commitments (a prior day) surface once in the sage Keep/Clear bar.
  const { committed: committedCards, done: doneCards } = todaySplit(board, today);
  const doneN = doneCards.length;
  const desk = deskState({ queryCount: queries.length, agentCount: agents.length, urgent: board.do.length, hkItems: hkItemCount, notes: board.nt.length, clearedToday: doneN });

  // ── first-visit spotlight tour (Act 1). Auto-runs ONCE: `tourSeenAt` absent ∧ not the new desk;
  // the flag is stamped on Done AND on skip/Esc (never localStorage — it follows the user). The
  // corner ?'s "Replay the tour" re-opens it regardless of the flag via a CustomEvent. ──
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
  const prog = todayProgress(committedCards.length, doneN);

  function setCommitted(card: BoardCard, on: boolean) {
    const val = on ? today : null;
    if (card.userTaskId) updateUserTask(card.userTaskId, { committedDate: val });
    else if (card.taskType && card.relatedRecordId) upsertTaskFlag(flagKeyForTask(card.taskType, card.relatedRecordId), { committedDate: val });
  }
  function toggleToday(card: BoardCard) {
    if (!onList(card) && committedCards.length >= MAX_TODAY) { flash(`Today’s list is full (${MAX_TODAY} max)`); return; }
    setCommitted(card, !onList(card));
  }
  // Help me pick — a selection gesture: pulse-and-fade, card by card, then commit each.
  async function helpMePick() {
    const picks = choosePicks({ doCards: board.do.filter((c) => c.taskType !== "weekly_review"), hkCards: board.hk.filter((c) => c.taskType !== "weekly_review"), committedCount: committedCards.length });
    if (!picks.length) { flash(`Today’s list is full (${MAX_TODAY} max)`); return; }
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
  function keepRolled() { rolled.forEach((c) => setCommitted(c, true)); setRollDismissed(true); flash("Kept on today’s list"); }
  function dropRolled() { rolled.forEach((c) => setCommitted(c, false)); setRollDismissed(true); flash("Cleared — still on the board"); }

  // ── quick rail — "the honest fastest version of actually doing it". Every ✓ funnels through the
  // SAME write paths as the journey (quick*Payload → markSentWriteArgs/nudgeWriteArgs); defaults are
  // stated on the receipt, and Undo deletes/unwinds the created record via the existing primitives.
  async function quickDone(c: BoardCard) {
    const nowIso = new Date().toISOString();
    if (c.userTaskId) {
      await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });
      const undo = () => updateUserTask(c.userTaskId!, { done: false });
      setOverlay(c.key, { kind: "receipt", lane: "nt", title: "Note done", line: `${c.title} — struck through on today’s list.`, undo });
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
      <div className="tdb-wrap">
        {/* ── header BAND (polish v3 P5 — supersedes the f286b06 ink ribbon): a full-bleed paper
            strip with a single hairline base, flush under the shell bar; its content sits in the
            same .tdb-col column as the board so the title's left edge aligns with the lane
            headers. NOT sticky — scrolls away with the wrap. Post-its unchanged (chrome swap
            only, Nick's call); .tdb-ribbon survives as the inner flex row so tour stop 5's
            `.tdb-ribbon .tdb-btn-pri` selector holds. ── */}
        <div className="tdb-band">
          <div className="tdb-col tdb-ribbon">
          <span className="tdb-askwrap">
            <span className="tdb-rdate">{shortHeaderDate(now)}</span>
            <span className="tdb-ask">What’s on your desk?</span>
          </span>
          <span className="tdb-postits">
            <button type="button" className={`tdb-postit ug${tiles.urgent === 0 ? " zero" : ""}`} aria-label={`${tiles.urgent} urgent — jump to the Urgent lane`} onClick={() => scrollToLane("do")}>
              <span className="tdb-pv" aria-hidden>{tiles.urgent}</span><span className="tdb-pk" aria-hidden>urgent</span>
            </button>
            <button type="button" className={`tdb-postit hk${tiles.housekeeping === 0 ? " zero" : ""}`} aria-label={`${tiles.housekeeping} housekeeping — jump to the Housekeeping lane`} onClick={() => scrollToLane("hk")}>
              <span className="tdb-pv" aria-hidden>{tiles.housekeeping}</span><span className="tdb-pk" aria-hidden>housekpg</span>
            </button>
            <button type="button" className={`tdb-postit nt${tiles.notes === 0 ? " zero" : ""}`} aria-label={`${tiles.notes} notes to self — jump to the Notes lane`} onClick={() => scrollToLane("nt")}>
              <span className="tdb-pv" aria-hidden>{tiles.notes}</span><span className="tdb-pk" aria-hidden>notes</span>
            </button>
          </span>
          <span className="tdb-sp" />
          <button type="button" className="tdb-btn-pri" disabled={!tiles.urgent} aria-label={walkAria(tiles.urgent)} onClick={() => openFlowCards(board.do)}>
            <span className="tdb-wdisc" aria-hidden />
            <span className="tdb-wtxt">
              <span className="tdb-wt1">Walk me through</span>
              <span className="tdb-wt2">{walkSublabel(tiles.urgent)}</span>
            </span>
          </button>
          </div>
        </div>

        <div className="tdb-col">
        {/* ── lanes — or, when derivation says so, the new-desk welcome (A) / the earned "Desk
            cleared." moment (E) in their place. Copy verbatim from todo-empty-states.html. ── */}
        {desk === "new-desk" ? renderNewDesk() : desk === "desk-cleared" ? renderDeskCleared() : (
        <div className="tdb-lanes">
          <Lane cls="do" label="Urgent" count={tiles.urgent} isEmpty={board.do.length === 0 && overlayCards("do").length === 0}
            onFocusedSession={() => setFlow({ items: board.do.filter((c) => c.taskType !== "weekly_review").map((card) => ({ kind: "card", card })), mode: "sweep" })}
            emptyNode={
              <div className="tdb-clear do">
                <span className="tdb-clric" aria-hidden>✓</span>
                <div><div className="tdb-clrt">Nothing needs you.</div>
                <div className="tdb-clrs">{liveQueriesLine(liveQueryCount(queries))}</div></div>
                <span className="tdb-clrhand" aria-hidden>— go write something</span>
              </div>
            }>
            {overlayCards("do")}
            {board.do.map(renderCard)}
          </Lane>
          <Lane
            cls="hk"
            label="Housekeeping"
            count={tiles.housekeeping}
            isEmpty={hkGroups.length === 0 && staleCards.length === 0 && !demotedReview && overlayCards("hk").length === 0}
            onFocusedSession={() => setFlow({ items: [...hkGroups.map((g) => ({ kind: "group" as const, group: g })), ...staleCards.map((card) => ({ kind: "card" as const, card }))], mode: "sweep" })}
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
            {hkGroups.map(renderGroupCard)}
            {demotedReview && renderReviewCard(demotedReview)}
            {staleCards.map(renderCard)}
          </Lane>
          <Lane cls="nt" label="Notes to self" count={tiles.notes} onAdd={addTask} isEmpty={board.nt.length === 0 && overlayCards("nt").length === 0}
            onFocusedSession={() => setFlow({ items: board.nt.map((card) => ({ kind: "card", card })), mode: "sweep" })}
            emptyNode={<button type="button" className="tdb-ghostcard" onClick={addTask}><span className="tdb-ge">Nothing jotted yet.</span><span className="tdb-gg">＋ Add a note</span></button>}>
            {overlayCards("nt")}
            {board.nt.map(renderCard)}
          </Lane>
        </div>
        )}
        </div>
      </div>

      {/* ── Today's list — corner pop-up (fixed; FAB collapsed / panel expanded) ── */}
      {!todayOpen && (
        <button type="button" className="tdb-fab" onClick={() => setTodayOpen(true)} aria-label="Open Today’s list" aria-expanded={false}>
          <span className="tdb-fabring" style={{ background: `conic-gradient(var(--ink) 0 ${prog.pct}%, rgba(30, 26, 22, 0.16) ${prog.pct}% 100%)` }}>
            <i>{prog.empty ? "–" : `${prog.done}/${prog.total}`}</i>
          </span>
          <span className="tdb-fabl">
            <span className="tdb-fab-a">Today’s list</span>
            <span className="tdb-fab-b">
              {committedCards.length === 0 && doneN === 0 ? "Nothing yet" : `${committedCards.length} committed · ${doneN} done`}
              {rolled.length > 0 && <em className="tdb-fab-roll" title={`${rolled.length} rolled over from a previous day`}> ●</em>}
            </span>
          </span>
        </button>
      )}
      {todayOpen && renderTodayPop()}

      {tourOpen && <TodoTour onEnd={endTour} />}
      {toast && (
        <div className="tdb-toast" role="status">
          {toast.msg}
          {toast.action && <button type="button" className="tdb-toast-act" onClick={() => { toast.action!.fn(); setToast(null); }}>{toast.action.label}</button>}
        </div>
      )}
      {flow && <FocusFlow items={flow.items} mode={flow.mode} onClose={() => { setFlow(null); setFlowPrefill(undefined); }} onNavigate={onNavigate} onToast={flash} prefill={flowPrefill} />}
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

  // ── the expanded pop-up: committed band + done band + footer (rises from the corner) ──
  function renderTodayPop() {
    return (
      <div className="tdb-pop" role="dialog" aria-label="Today’s list">
        <div className="tdb-th">
          <span className="tdb-t">Today’s list</span>
          <span className="tdb-cc">{committedCards.length === 0 ? "Nothing yet" : `${committedCards.length} committed`}</span>
          {doneN > 0 && <button type="button" className="tdb-cdone" aria-pressed={showDone} title={showDone ? "Hide the done band" : "Show the done band"} onClick={() => setShowDone((v) => !v)}>{doneN} done</button>}
          <button type="button" className="tdb-drawer-x" onClick={closeToday} aria-label="Close">✕</button>
        </div>
        {rolled.length > 0 && (
          <div className="tdb-rollbar">
            <span className="tdb-rolltx"><b>{rolled.length}</b> {rolled.length === 1 ? "item" : "items"} rolled over from a previous day.</span>
            <button type="button" onClick={keepRolled}>Keep</button>
            <button type="button" className="drop" onClick={dropRolled}>Clear</button>
          </div>
        )}

        {/* committed band */}
        <div className="tdb-tcommit">
          {committedCards.map((c) => (
            <div key={c.key} className="tdb-trow" onClick={() => openFlowCards([c])}>
              <span className="tdb-tdot">{!c.hk && !c.userTaskId && c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={16} /> : null}</span>
              <div className="tdb-tmid"><div className="tdb-tx">{c.title}</div><div className="tdb-tm">{c.record}</div></div>
              <button type="button" className="tdb-x" title="Take off today" onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>✕</button>
            </div>
          ))}
          {committedCards.length === 0 && (
            <div className="tdb-tempty">
              <div className="tdb-tea">What’s on the list today?</div>
              <div className="tdb-teb">Commit up to {MAX_TODAY} from the board — or let us pick</div>
            </div>
          )}
        </div>

        {/* done band — the divider + strikethrough log appear WITH the first completion, not before
            (the rule applies to the pop-up always, not just in empty states) */}
        {doneN > 0 && showDone && (
          <>
            <div className="tdb-tdiv"><span>Done today</span><span className="l" /></div>
            <div className="tdb-tdone">
              {doneCards.map((c) => (
                <div key={c.key} className="tdb-drow">
                  <span className="tdb-tick">✓</span>
                  <div className="tdb-tmid"><div className="tdb-dx">{c.title}</div><div className="tdb-dm2">{[c.record, fmtTime(c.whenMs)].filter(Boolean).join(" · ")}</div></div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="tdb-tf">
          <span className="tdb-pc">{prog.empty ? "NOTHING COMMITTED" : `${prog.done} of ${prog.total} done today`}</span>
          <button type="button" className="tdb-pick" onClick={helpMePick}>{committedCards.length ? "Add more" : "Help me pick"}</button>
          <button type="button" className="tdb-worklist" disabled={!committedCards.length} onClick={() => openFlowCards(committedCards)}>Work the list</button>
        </div>
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
  // MUST be a hoisted `function` (not a post-return `const`): renderReviewCard references it and is
  // called from within the component's return JSX — a `const` here sits in the TDZ for the whole
  // render, so accessing it throws the moment a review card actually renders (the demotion bug).
  function openSundayReview() {
    setFlow({ items: board.do.filter((x) => x.taskType !== "weekly_review").map((card) => ({ kind: "card" as const, card })), mode: "weeklyReview" });
  }

  function renderReviewCard(c: BoardCard) {
    const demoted = c.stream === "hk"; // the Tue–Sat unreviewed week — quiet coffee identity
    const dismiss = (e: React.MouseEvent) => {
      e.stopPropagation();
      const key = flagKeyForTask("weekly_review", c.relatedRecordId!);
      upsertTaskFlag(key, { snoozedUntil: new Date(Date.now() + 3 * 86400000).toISOString() });
      flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await upsertTaskFlag(key, { snoozedUntil: null }); flash("Restored"); } });
    };
    return (
      <div key={c.key} className={`tdb-tile ${c.stream} rvcard${demoted ? " quietrv" : ""}`} onClick={openSundayReview}>
        <button type="button" className="tdb-rvx" onClick={dismiss} aria-label="Dismiss the review for this week">✕</button>
        {demoted
          ? <div className="tdb-kick"><span className="tdb-kd" aria-hidden />THE SUNDAY REVIEW · {c.record.toUpperCase().replace(" OF QUERYING", "")}</div>
          : <div className="tdb-tags"><span className="tdb-tag due">{c.due}</span></div>}
        <div className="tdb-mid">
          <div className="tdb-tt">{c.title}</div>
          <div className="tdb-tsub">{c.subtitle}</div>
        </div>
        {!demoted && <div className="tdb-rvweek">{c.record.toUpperCase()}</div>}
        <button type="button" className="tdb-rvgo" onClick={(e) => { e.stopPropagation(); openSundayReview(); }}>Begin the review →</button>
      </div>
    );
  }

  // Standalone receipt/dismissed cards — the live card vanished with the write; the receipt persists.
  function overlayCards(lane: "do" | "hk" | "nt") {
    return Object.entries(overlays)
      .filter(([, o]) => (o.kind === "receipt" || o.kind === "dismissed") && o.lane === lane)
      .map(([key, o]) => {
        if (o.kind === "receipt") return (
          <div key={`ov-${key}`} className="tdb-tile receipt">
            <div className="tdb-receiptbody">
              <div className="tdb-rk"><span className="tdb-rtick">✓</span><span className="tdb-rt">{o.title}</span></div>
              <div className="tdb-rlog">{o.line}<br />Wrong? Fix it before you move on.</div>
              <div className="tdb-racts">
                {o.edit && <button type="button" className="tdb-ra" onClick={o.edit}>Edit details</button>}
                {o.undo && <button type="button" className="tdb-ra" onClick={async () => { await o.undo!(); clearOverlay(key); }}>Undo</button>}
              </div>
            </div>
          </div>
        );
        if (o.kind !== "dismissed") return null;
        return (
          <div key={`ov-${key}`} className="tdb-tile dismissed">
            <div className="tdb-dismissbody">
              <div className="tdb-dt">{o.text}</div>
              <div className="tdb-dact">
                <button type="button" className="tdb-ra" onClick={async () => { await o.undo(); clearOverlay(key); }}>Undo</button>
                {o.never && <button type="button" className="tdb-ra" onClick={o.never}>Never ask</button>}
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
      </div>
    );
  }

  // ── full-detail lane card (fixed height, clip-safe). Completion = the rail or the sheet; the
  // Mark-done pill is RETIRED and ＋ Today's list goes full-width (committing = the visible button). ──
  function renderCard(c: BoardCard) {
    if (c.taskType === "weekly_review") return renderReviewCard(c);
    const committed = onList(c);
    const ov = overlays[c.key];
    const isOffer = c.taskType === "offer_received";
    // Option-A sub: a manuscript title inside the sub renders serif-italic (--ink-2).
    const subIsMs = !!c.subtitle && manuscripts.some((m) => m.title === c.subtitle);
    if (ov?.kind === "fork") {
      return (
        <div key={c.key} className={`tdb-tile ${c.stream}`}>
          {renderFork(c.key, true, { notNow: () => forkStale(c, "notNow"), neverThis: () => forkStale(c, "neverThis") })}
        </div>
      );
    }
    return (
      <div key={c.key} className={`tdb-tile ${c.stream}${committed ? " today" : ""}${c.quiet ? " quiet" : ""}${pulsing === c.key ? " pulse" : ""}`} onClick={() => openFlowCards([c])}>
        {!isOffer && rail(() => quickDone(c), () => quickPause(c))}
        <div className="tdb-tags">
          <span className={`tdb-tag due${isOffer ? " offer" : c.warn ? " warn" : ""}`}>{isOffer ? `★ ${c.due}` : c.due}</span>
          {c.snoozes > 0 && <span className="tdb-tag snz">Snoozed ×{c.snoozes}</span>}
        </div>
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
            {committed ? "✓ On today’s list" : "＋ Today’s list"}
          </button>
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
          <GroupFlip
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
          />
        </div>
      );
    }
    if (ov?.kind === "fork") {
      return (
        <div key={g.rule} className="tdb-gcard">
          {renderFork(key, false, { notNow: () => forkNotNowGroup(g), neverThis: () => forkNeverThese(g), neverRule: () => forkNeverRule(g) })}
        </div>
      );
    }
    const faces = g.members.slice(0, 4);
    const copy = G3_COPY[g.rule] ?? { kick: g.meta.label, rest: () => ` ${g.meta.label.toLowerCase()}`, sub: "" };
    const prog = hkGroupProgress(agents.length, g.members.length);
    return (
      <div key={g.rule} className="tdb-gcard" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>
        {rail(() => setOverlay(key, { kind: "flip" }), () => setOverlay(key, { kind: "fork", single: false }), true)}
        <div className="tdb-kick"><span className="tdb-kd" aria-hidden />{copy.kick}</div>
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
          <button type="button" className="tdb-gfix" onClick={(e) => { e.stopPropagation(); setFlow({ items: [{ kind: "group", group: g }] }); }}>Fix together →</button>
          <button type="button" className="tdb-gnever" title="Stop asking about these — the gaps stay on the profiles" onClick={(e) => { e.stopPropagation(); muteRuleFromCard(g); }}>Never</button>
        </div>
      </div>
    );
  }
};

export default ToDoPage;
