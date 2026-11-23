/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * searchSources — what ⌘K search reads, assembled from state DbProvider already holds (search v1, Part B). Each source
 * is the owning page's OWN selector or wording, called here rather than restated:
 *   · tasks     — the To-do list's chain, exactly as `useWsCore` runs it (assembleBoardColumns → trayItem → wsTasks);
 *   · queries   — the Query Centre's stamped rows (buildQcRows → stampRows), worded by the card's own helpers
 *                 (queriedFact, nextBox154, heardFact, isQuietCard) and the slip's policyWords;
 *   · notes     — the Corkboard's `sortNotes(userTasks)` and its paper colours;
 *   · letters   — the Letters page's live letters and its meta line (saved … · sent with N queries);
 *   · packages  — the Packages page's live packages and its contents line;
 *   · help      — the written articles' title, lede and plain text (no Help Centre page code).
 *
 * ⚠️ NO LISTENER AND NO FETCH. Everything in is already loaded on every route.
 * ⚠️ THE TASK CHAIN IS A COPY OF useWsCore's COMPOSITION, not its derivation: every function is the To-do list's own.
 *    `searchSources.test.ts` reads useWsCore and fails if its chain stops calling these, in this order.
 */
import type { Activity, Agent, Manuscript, ManuscriptVersion, Query, SubmissionPackage, Task, TaskFlag, UserTask } from "../types";
import { assembleBoardColumns } from "./todoColumns";
import { SWEEP_NEED, groupFor, trayItem, type TrayDb, type TrayItem } from "./todoTray";
import { wsTasks } from "./todoWs";
import { queriesMissingMaterials } from "./queryMaterialsGap";
import { agentPrimary } from "./agentDisplay";
import { localYMD } from "./shellSidebar";
import { buildQcRows } from "./qcSummary";
import { stampRows } from "./queryState";
import { queriedFact, heardFact } from "./qc153";
import { NEXT_WAIT_LABEL, OVERDUE_LINE, QUIET_LABEL, QUIET_VALUE, isQuietCard, nextBox154, nudgeOnLine } from "./qc154";
import { shortDate } from "./qc151";
import { policyWords } from "./qc1531";
import { sortNotes, paperHex, noteColour } from "./noteboard";
import { isLiveLetter, lettersFor, letterFacts, resolveLetters } from "./queryLetters";
import { buildRows } from "./analytics";
import { contentsLine } from "./packagesV62";
import { fmtDay, plural } from "../components/letters/letterBits";
import type { CorpusInput, PeekFact, QueryRowFacts } from "./searchPalette";

const DAY = 86_400_000;

export interface SourceDb {
  tasks: Task[]; userTasks: UserTask[]; queries: Query[]; agents: Agent[]; manuscripts: Manuscript[];
  taskFlags: TaskFlag[]; activities: Activity[]; packages: SubmissionPackage[]; versions: ManuscriptVersion[];
  mutedTaskRules?: unknown;
}

/** THE TASKS THE TO-DO LIST SHOWS TODAY — the board's To do and Today columns, as useWsCore builds them. */
export function todoListTasks(db: SourceDb, now: number) {
  const { tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, packages } = db;
  const { cols, hkGroups } = assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, today: localYMD(now),
    mutedTaskRules: db.mutedTaskRules as never,
  });
  const live = [...cols.todo, ...cols.today];
  const trayDb: TrayDb = { queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups } as TrayDb;
  const items = live.map((c) => trayItem(c, trayDb, now));
  const sweepNeed = (i: TrayItem) => (i.sweep ? SWEEP_NEED[(i.card as { sweepRule?: string }).sweepRule ?? ""] ?? null : null);
  const memberIds = (i: TrayItem) => (groupFor(i.card, trayDb)?.members ?? []).map((m) => m.agentId).filter((x): x is string => !!x);
  const gaps = queriesMissingMaterials({ queries, activities, agents, manuscripts, displayName: agentPrimary });
  const gapMembers = (i: TrayItem) => (i.card.taskType === "materials_unrecorded_bulk" ? gaps.map((g) => ({ queryId: g.queryId, agentId: g.agentId })) : []);
  return wsTasks(items, agents, sweepNeed, memberIds, now, gapMembers, queries);
}

/** The Query Centre card's facts for every query, from its own stamped rows and its own wording. */
export function queryRowFacts(queries: Query[], agents: Agent[], activities: Activity[], quietWeeks: number, now: number): Map<string, QueryRowFacts> {
  const rows = stampRows(buildQcRows(queries, agents, activities, now), agents, { quietWeeks, nowMs: now });
  const out = new Map<string, QueryRowFacts>();
  for (const r of rows) {
    const sent = queriedFact(r, now);
    const nx = nextBox154(r, now);
    const next = nx.kind === "wait" ? { label: NEXT_WAIT_LABEL, value: nx.due, line: nx.nudgeOn ? nudgeOnLine(nx.nudgeOn) : null }
      : nx.kind === "quiet" ? { label: QUIET_LABEL, value: QUIET_VALUE, line: nx.line }
        /* ⚠️ the card's "Response overdue" is a verdict word the search prompt rules out: its line alone is kept */
        : nx.kind === "over" ? { label: "Next", value: OVERDUE_LINE, line: null }
          : { label: "Next", value: nx.value, line: nx.line };
    const heard = heardFact(r, now);
    out.set(r.id, {
      sent: r.sentMs == null ? null : sent.value, sentLine: sent.line, sentMs: r.sentMs,
      next, heard: { value: heard.value, line: heard.line }, quiet: isQuietCard(r, now), court: r.court, lastMs: r.lastMs,
    });
  }
  return out;
}

/** Everything buildCorpus reads beyond agents and queries, for the active manuscript. */
export function corpusSources(db: SourceDb, opts: { now: number; quietWeeks: number; activeMs: Manuscript | null; help: CorpusInput["help"] }):
  Omit<CorpusInput, "agents" | "queries" | "agentLabel" | "activeManuscriptTitle"> {
  const { now, activeMs } = opts;
  const agentsById = new Map(db.agents.map((a) => [a.id, a]));
  const rows = queryRowFacts(db.queries, db.agents, db.activities, opts.quietWeeks, now);

  const tasks = todoListTasks(db, now).map((t) => ({
    key: t.key, title: t.title,
    due: t.dueDays == null ? null : shortDate(now + t.dueDays * DAY, now),
    about: t.agentName || null,
  }));
  const notes = sortNotes(db.userTasks).map((n) => ({ id: n.id, text: n.text, colour: paperHex(noteColour(n)) }));

  let letters: CorpusInput["letters"] = [];
  let packages: CorpusInput["packages"] = [];
  if (activeMs) {
    const msQueries = db.queries.filter((q) => q.manuscriptId === activeMs.id);
    const lrows = new Map(buildRows(msQueries, db.activities, db.agents, now).map((r) => [r.id, r]));
    const resolved = resolveLetters(activeMs.id, msQueries, db.versions, db.packages);
    letters = lettersFor(activeMs.id, db.versions).filter(isLiveLetter).map((v) => {
      const f = letterFacts(v, msQueries, resolved, lrows);
      const saved = `saved ${fmtDay(v.createdDate)}`;
      const use = f.sent ? `sent with ${plural(f.sent, "query", "queries")}` : "not sent yet";
      const facts: PeekFact[] = [{ label: "Saved", value: fmtDay(v.createdDate) || "Not stated" }, { label: "Sent", value: f.sent ? `With ${plural(f.sent, "query", "queries")}` : "Not sent yet" }];
      return { id: v.id, name: v.versionName || "Untitled letter", line: `${saved} · ${use}`, facts };
    });
    const nameOf = (id: string | undefined) => (id && id.trim() ? db.versions.find((v) => v.id === id)?.versionName ?? null : null);
    packages = db.packages.filter((p) => p.manuscriptId === activeMs.id && p.status !== "Retired").map((p) => {
      const line = contentsLine(nameOf(p.queryLetterVersionId), nameOf(p.bookVersionId));
      return { id: p.id, name: p.packageName || "Untitled package", line, facts: [{ label: "What’s in it", value: line, wide: true }] };
    });
  }

  return {
    rows,
    policy: (agentId) => { const a = agentsById.get(agentId); return a ? policyWords(a) : null; },
    activeManuscriptId: activeMs?.id ?? null,
    packageNames: new Map(db.packages.map((p) => [p.id, p.packageName])),
    tasks, notes, letters, packages, help: opts.help,
  };
}
