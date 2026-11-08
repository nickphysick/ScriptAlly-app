/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do on the phone v1, Phase A — THE TASK WORKSPACE'S BRAIN, LIFTED OUT OF TodoWorkspace SO THE PHONE READS THE SAME
 * ONE. Every line here was TodoWorkspace's own body, moved unchanged: the board and its tasks (`wsTasks`), the facts the
 * flows read, the snooze limits and writer, the dismiss writes, the Snoozed and Done lists, the batch row's place, and
 * the context `buildFlow` is called with.
 *
 * ⚠️ IT DECIDES NOTHING THE DESKTOP DID NOT. A write here is the desktop's write, in the desktop's order; what a page does
 *    after it (select the next task, show a toast) stays the page's own. The TD52 locks hold the desktop to its baseline.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { assembleBoardColumns, flagForCard } from "../../../lib/todoColumns";
import { localYMD } from "../../../lib/shellSidebar";
import type { BoardCard } from "../../../lib/todoBoard";
import { SWEEP_NEED, groupFor, trayItem, type TrayDb, type TrayItem } from "../../../lib/todoTray";
import { doneTabRows, quietSuggestion, wsTasks, type QuietFacts, type WsTask } from "../../../lib/todoWs";
import { clearedThisWeek, type ClearedAct } from "../../../lib/todoCleared";
import { setAsideItems, setAsideLabel, switchedOffRules, RULE_TITLE, type SetAsideItem } from "../../../lib/taskSettings";
import { flagKeyForTask, taskFlagId } from "../../../lib/taskFlags";
import { setAsideRules } from "../../../lib/todoSetAside";
import { snoozeCardWrites } from "../snoozeWrites";
import { openQueryPanel } from "../../../lib/queryPanelStore";
import { openAgentCard } from "../../../lib/agentCardStore";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { drawerDoorForTask } from "../../../lib/queryActions/entry";
import { commitCardSave } from "../../../lib/agentCardSave";
import { addDays, dayDiff, fmt, toDay, todayDay } from "../../../lib/queryActions/dates";
import { ActivityType, type TaskFlag, type UserTask } from "../../../types";
import { nrmnOf, lastSendDay } from "../../queryActions/journeys/common";
import { buildFlow, type Answers, type Flow } from "./wsFlows";
import { dayFromYmd } from "./WsControls";
import { queriesMissingMaterials } from "../../../lib/queryMaterialsGap";
import { agentPrimary } from "../../../lib/agentDisplay";
import type { DismissChoice, SnoozeLimit } from "./WsPops";

const DAY = 86400000;

/** what a write left behind: the toast's words, and its Undo (`back`: Undo also re-selects the task) */
export interface WsWritten { msg: string; undo?: () => Promise<void>; back: boolean }

export function useWsCore(now: number) {
  const db = useScriptAllyDb();
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, packages, currentUser,
    updateUserTask, deleteUserTask, restoreUserTask, upsertTaskFlag, dismissTask, restoreTaskFlag, updateUserProfile, updateUserPaths,
  } = db;
  const today = useMemo(() => todayDay(), [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayYmd = localYMD(now);

  /* ── the one board, and the tasks it holds ── */
  const { cols, hkGroups } = useMemo(() => assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, today: localYMD(now), mutedTaskRules: currentUser?.mutedTaskRules,
  }), [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, currentUser?.mutedTaskRules]);
  const live: BoardCard[] = useMemo(() => [...cols.todo, ...cols.today], [cols]);

  const trayDb: TrayDb = useMemo(() => ({ queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups }),
    [queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups]);
  const items = useMemo(() => live.map((c) => trayItem(c, trayDb, now)), [live, trayDb, now]);
  const sweepNeed = useCallback((i: TrayItem) => (i.sweep ? SWEEP_NEED[(i.card as BoardCard & { sweepRule?: string }).sweepRule ?? ""] ?? null : null), []);
  const memberIds = useCallback((i: TrayItem) => (groupFor(i.card, trayDb)?.members ?? []).map((m) => m.agentId).filter((x): x is string => !!x), [trayDb]);
  /* v51.1 — the materials bulk card ("12 queries have no record of what you sent") is one row per query, each naming its
     agent; its queries are the board's own (queriesMissingMaterials, the same call db.tsx makes to raise the card) */
  const gaps = useMemo(() => queriesMissingMaterials({ queries, activities, agents, manuscripts, displayName: agentPrimary }), [queries, activities, agents, manuscripts]);
  const gapMembers = useCallback((i: TrayItem) => (i.card.taskType === "materials_unrecorded_bulk" ? gaps.map((g) => ({ queryId: g.queryId, agentId: g.agentId })) : []), [gaps]);
  const all = useMemo(() => wsTasks(items, agents, sweepNeed, memberIds, now, gapMembers, queries), [items, agents, sweepNeed, memberIds, now, gapMembers, queries]);
  /** the card a task's flag sits on: a sweep member's own card */
  const cardOf = useCallback((t: WsTask): BoardCard => {
    if (t.kind === "batch" && t.batchItems?.length) return t.batchItems[0].card;
    if (t.item.sweep && t.agent) return groupFor(t.item.card, trayDb)?.members.find((m) => m.agentId === t.agent!.id)?.card ?? t.item.card;
    return t.item.card;
  }, [trayDb]);

  /* ── the task's facts the flows read ── */
  const quietFacts = useCallback((t: WsTask): QuietFacts => {
    const q = t.query;
    if (!q) return { nudgedOn: null, nrmn: false, windowWeeks: null };
    const since = lastSendDay(q);
    const nudges = activities.filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT).map((a) => toDay(a.date)).filter((d): d is Date => !!d);
    const lastN = toDay(q.lastNudgeSentDate);
    const all2 = lastN ? [...nudges, lastN] : nudges;
    const after = all2.filter((d) => !since || d.getTime() >= since.getTime()).sort((a, b) => b.getTime() - a.getTime());
    const wk = typeof t.agent?.responseTimeWeeks === "number" && t.agent.responseTimeWeeks > 0 ? t.agent.responseTimeWeeks : null;
    return { nudgedOn: after[0] ?? null, nrmn: nrmnOf(q, t.agent ?? null), windowWeeks: wk };
  }, [activities]);

  const limitFor = useCallback((t: WsTask): SnoozeLimit => {
    if (t.userTask) return { ceiling: 3650, why: null };
    const c = cardOf(t);
    const r = setAsideRules(c, t.query, flagForCard(c, taskFlags)?.snoozeCount ?? 0, todayYmd);
    const dl = r.deadline;
    const why = r.ceiling <= 0 ? `This can’t be snoozed. Your ${dl?.what ?? "date"} ${dl && dl.ymd < todayYmd ? "has passed" : "is today"}.`
      : r.offer ? "An offer can wait a day at most." : dl ? `It can’t go past your ${dl.what}.` : null;
    return { ceiling: r.ceiling, why };
  }, [cardOf, taskFlags, todayYmd]);

  /* ── set aside: snooze, dismiss, a switched-off rule, delete — each with Undo, each putting back what was there ── */
  const captureFlags = (keys: { taskType: string; queryId?: string; agentId?: string }[]) =>
    keys.map((k) => { const id = taskFlagId(k); return { id, was: taskFlags.find((f) => f.id === id) ?? null }; });
  const putBack = (cap: { id: string; was: TaskFlag | null }[]) => Promise.all(cap.map((c) => restoreTaskFlag(c.id, c.was))).then(() => undefined);
  const flagKeysFor = (t: WsTask) => {
    /* a batch reaches every card it stands for: the bulk card, or each single card below the board's threshold */
    if (t.kind === "batch") return (t.batchItems ?? []).map((i) => i.card).filter((c) => c.taskType && c.relatedRecordId).map((c) => flagKeyForTask(c.taskType!, c.relatedRecordId!));
    const c = cardOf(t);
    return c.taskType && c.relatedRecordId ? [flagKeyForTask(c.taskType, c.relatedRecordId)] : [];
  };

  const snoozeTask = async (t: WsTask, days: number): Promise<(() => Promise<void>) | null> => {
    if (t.userTask) {
      const was = t.userTask;
      await updateUserTask(was.id, { dueDate: localYMD(Date.now() + days * DAY) });
      return async () => { await restoreUserTask(was); };
    }
    const c = cardOf(t);
    const r = setAsideRules(c, t.query, flagForCard(c, taskFlags)?.snoozeCount ?? 0, todayYmd);
    const capped = Math.min(days, r.ceiling);
    if (capped <= 0) return null;
    const cap = captureFlags(flagKeysFor(t));
    const cards = t.kind === "batch" ? (t.batchItems ?? []).map((i) => i.card) : [c];
    let wrote = false;
    for (const cc of cards) {
      const w = snoozeCardWrites({ upsertTaskFlag, dismissTask }, cc, capped, `until ${fmt(addDays(today, capped))}`, r.deadline && !r.deadline.passed ? dayDiff(dayFromYmd(r.deadline.ymd), today) : undefined);
      if (w) wrote = true;
    }
    if (!wrote) return null;
    return () => putBack(cap);
  };

  /** "Snoozed until …": the toast a snooze shows */
  const snoozeWords = (t: WsTask, until: Date) => (t.userTask ? `Moved to ${fmt(until)}` : t.kind === "batch" ? `Snoozed all ${t.batch?.length ?? 0} until ${fmt(until)}` : `Snoozed until ${fmt(until)}`);

  const openCard = (t: WsTask, edit?: boolean) => {
    if (t.kind === "fix" && t.agent) { openAgentCard(t.agent.id, edit ? { tab: "who" as never } : {}); return; }
    if (t.query) { openQueryPanel(t.query.id, "other"); return; }
    if (t.agent) openAgentCard(t.agent.id);
  };

  /**
   * The dismiss choices that write: delete, a switched-off rule, "Not stated", and the plain dismiss. `null` where the
   * choice wrote nothing; `"error"` where the save was refused. ("logit", "card" and "withdraw" are the page's own.)
   */
  const dismissWrite = async (t: WsTask, c: DismissChoice): Promise<WsWritten | "error" | null> => {
    if (c === "delete" && t.userTask) {
      const was = t.userTask;
      await deleteUserTask(was.id);
      return { msg: `Deleted “${was.text}”`, undo: async () => { await restoreUserTask(was); }, back: true };
    }
    if (c === "rule") {
      const rule = (t.item.card as BoardCard & { sweepRule?: string }).sweepRule;
      if (!rule) return null;
      const before = currentUser?.mutedTaskRules ?? [];
      await updateUserProfile({ mutedTaskRules: [...new Set([...before, rule])] });
      /* when it was switched off, for "Tasks you've switched off" (a preference; the switch itself is mutedTaskRules) */
      await updateUserPaths({ [`todoPrefs.switchedOffAt.${rule}`]: new Date().toISOString() });
      return { msg: `${RULE_TITLE[rule] ?? "That reminder"}: switched off for every agent`, undo: async () => { await updateUserProfile({ mutedTaskRules: before }); }, back: false };
    }
    if (c === "unknown" && t.agent && currentUser) {
      const out = await commitCardSave({ uid: currentUser.id, agent: t.agent, queries, patch: { responseTimeWeeks: null } as never, resolveTaskFlag: db.resolveTaskFlag });
      if ("error" in out.res) return "error";
      return { msg: `Saved. ${t.first}’s card says “Not stated”.`, undo: out.undo ? async () => { await out.undo!(); } : undefined, back: true };
    }
    const keys = flagKeysFor(t);
    if (!keys.length) return null;
    const cap = captureFlags(keys);
    const at = new Date().toISOString();
    await Promise.all(keys.map((k) => upsertTaskFlag(k, { skippedAt: at })));
    return { msg: t.kind === "batch" ? `Dismissed all ${t.batch?.length ?? 0}. You’ll find them under Done if you need them back.` : "Dismissed. You’ll find it under Done if you need it back.", undo: async () => { await putBack(cap); }, back: true };
  };

  /** the writer's own task, ticked off: the write and its Undo */
  const ownDoneWrite = async (u: UserTask): Promise<() => Promise<void>> => {
    await updateUserTask(u.id, { done: true, completedAt: new Date().toISOString() });
    return async () => { await restoreUserTask(u); };
  };

  /* ── the Snoozed and Done tabs ── */
  const aside: SetAsideItem[] = useMemo(() => setAsideItems(currentUser, taskFlags, agents, queries, now), [currentUser, taskFlags, agents, queries, now]);
  const snoozed = aside.filter((a) => a.kind === "snooze");
  const dismissed = aside.filter((a) => a.kind !== "snooze");
  const done: ClearedAct[] = useMemo(() => clearedThisWeek({ activities, taskFlags, userTasks, queries, agents }, now), [activities, taskFlags, userTasks, queries, agents, now]);
  /** a snoozed or dismissed task, named the way the tray names it */
  const asideTitle = (a: SetAsideItem): string => {
    if (a.kind === "rule") return a.label;
    const f = a.flag;
    const first = (a.who || "").trim().split(/\s+/)[0] || "the agent";
    const p = first.endsWith("s") ? `${first}’` : `${first}’s`;
    switch (f?.taskType) {
      case "partial_requested": return `Send ${first} your partial`;
      case "full_requested": return `Send ${first} your full`;
      case "revise_resubmit": return `Send ${first} your revision`;
      case "offer_received": return `Answer ${p} offer`;
      case "nudge_overdue": return `Nudge ${first}`;
      case "no_response_close": return `${p} gone quiet`;
      case "data_quality_poor": return `Fill in ${p} details`;
      case "user_task": return userTasks.find((u) => u.id === f.queryId)?.text ?? "Your task";
      default: return setAsideLabel(a);
    }
  };
  /** the Done tab's rows, this week only; their number is the header's "cleared this week" and the tab's count */
  const doneRows = doneTabRows(done, dismissed, asideTitle, now);
  /** v52 (7 Nov): the rules switched off for every agent */
  const offRows = switchedOffRules(currentUser?.mutedTaskRules, currentUser?.todoPrefs?.switchedOffAt);

  /** Bring back a snoozed or dismissed task (`toTodo`: the page goes back to the To do list) */
  const bringBackWrite = async (a: SetAsideItem): Promise<WsWritten & { toTodo: boolean }> => {
    const r = a.restore;
    if ("rule" in r) {
      const before = currentUser?.mutedTaskRules ?? [];
      await updateUserProfile({ mutedTaskRules: before.filter((k) => k !== r.rule) });
      return { msg: `${RULE_TITLE[r.rule] ?? "That reminder"}: back on.`, undo: async () => { await updateUserProfile({ mutedTaskRules: before }); }, back: false, toTodo: false };
    }
    await upsertTaskFlag(r.flag, r.patch);
    return { msg: `“${asideTitle(a)}” is back in your tray.`, back: false, toTodo: true };
  };

  /** the flow `buildFlow` builds for a task on the desk (`sel` the row, `deskT` the row as the desk holds it) */
  const makeFlow = (sel: WsTask | null, deskT: WsTask | null, A: Answers, setA: (f: (a: Answers) => Answers) => void, flash: (m: string) => void): Flow | null => {
    if (!sel || !deskT || sel.kind === "own") return null;
    const facts = quietFacts(sel);
    const userFirst = (currentUser?.name ?? "").trim().split(/\s+/)[0] || "";
    return buildFlow({
      t: deskT, A, set: (p) => setA((a) => ({ ...a, ...p })), today, uid: currentUser?.id ?? null, userFirst, queries, agents, manuscripts,
      db: db as never, snoozeFor: (d) => snoozeTask(sel, d), waitCeiling: limitFor(sel).ceiling,
      said: (m) => flash(m), nudgedOn: facts.nudgedOn, suggestion: sel.kind === "quiet" ? quietSuggestion(facts) : null,
    }, {
      openPartial: () => { if (sel.query) openQueryDrawer({ mode: "resp", queryId: sel.query.id, preset: { respType: "partial" } } as never); },
      openCard: () => { if (sel.agent) openAgentCard(sel.agent.id, { tab: "send" as never, focus: "materials" as never }); },
      openOther: (() => {
        const c = sel.item.card;
        const door = drawerDoorForTask(c.taskType, c.relatedRecordId, (id) => queries.find((x) => x.id === id)?.offerRefQueryId);
        if (door) return () => openQueryDrawer(door as never);
        if (sel.agent) return () => openAgentCard(sel.agent!.id);
        if (sel.query) return () => openQueryPanel(sel.query!.id, "other");
        return null;
      })(),
    });
  };

  return {
    db, today, todayYmd, hkGroups, items, all, cardOf, quietFacts, limitFor, snoozeTask, snoozeWords, openCard, dismissWrite, ownDoneWrite,
    snoozed, dismissed, done, asideTitle, doneRows, offRows, bringBackWrite, makeFlow,
  };
}

/**
 * The batch row's place on the desk (v51.1): one query at a time, the ones skipped this time round, and the ones saved
 * but not yet gone from the board. Saved down to one, the batch becomes that query's own row and the desk follows it.
 */
export function useWsBatch(sel: WsTask | null, selKey: string | null, setSelKey: (k: string | null) => void, all: readonly WsTask[]) {
  const { agents, queries } = useScriptAllyDb();
  const [bSkip, setBSkip] = useState<ReadonlySet<string>>(() => new Set());
  const [bSaved, setBSaved] = useState<ReadonlySet<string>>(() => new Set());
  const bRemaining = useMemo(() => (sel?.kind === "batch" ? (sel.batch ?? []).filter((m) => !bSaved.has(m.queryId)) : []), [sel, bSaved]);
  const bCur = useMemo(() => bRemaining.find((m) => !bSkip.has(m.queryId)) ?? bRemaining[0] ?? null, [bRemaining, bSkip]);
  const deskT: WsTask | null = useMemo(() => {
    if (!sel || sel.kind !== "batch" || !bCur) return sel;
    const a = agents.find((x) => x.id === bCur.agentId);
    const first = (a?.name ?? "").trim().split(/\s+/)[0] || (a?.agency ?? "").trim() || "The agent";
    return { ...sel, query: queries.find((q) => q.id === bCur.queryId), agent: a, first, agentName: (a?.name ?? "").trim() || (a?.agency ?? "").trim(), agency: (a?.agency ?? "").trim(), batch: bRemaining };
  }, [sel, bCur, bRemaining, agents, queries]);
  /* saved down to one: the batch becomes that query's own row, and the desk follows it */
  useEffect(() => {
    if (selKey !== "materials-batch" || all.some((x) => x.key === selKey)) return;
    const one = all.find((x) => x.item.card.taskType === "materials_unrecorded" || x.item.card.taskType === "materials_unrecorded_bulk");
    if (one) { setSelKey(one.key); setBSaved(new Set()); setBSkip(new Set()); }
  }, [all, selKey]); // eslint-disable-line react-hooks/exhaustive-deps
  /** returns true when it moved on (the page then clears its answers) */
  const skipOne = (): boolean => {
    if (!bCur) return false;
    const others = bRemaining.filter((m) => m.queryId !== bCur.queryId && !bSkip.has(m.queryId));
    setBSkip(others.length ? new Set([...bSkip, bCur.queryId]) : new Set([bCur.queryId]));
    return true;
  };
  const markSaved = (qid: string) => { setBSaved((x) => new Set([...x, qid])); setBSkip((x) => { const n = new Set(x); n.delete(qid); return n; }); };
  const unmarkSaved = (qid: string) => setBSaved((x) => { const n = new Set(x); n.delete(qid); return n; });
  const resetSkip = () => setBSkip(new Set());
  return { bRemaining, bCur, deskT, skipOne, markSaved, unmarkSaved, resetSkip };
}
