/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 — WHAT EACH TASK ASKS, AND WHAT IT LOGS. One builder per task kind: the questions in order (each with
 * its answered test and its one-line summary), the plain sentence the summary box shows, the consequences listed under
 * it, the two lines the review beside the card reads, the draft the card preview shows, and the save.
 *
 * ⚠️ EVERY SAVE IS AN EXISTING ONE, AND THE DRAWER'S. A send is `saveSent`, a nudge `saveNudgeSent`, an offer decision
 *    `saveOfferDecision` (all lib/queryActions/stepSaves, which the drawer's journeys commit through), a reply `recordQueryResponse`, a close `saveClose`, an agent field `commitCardSave`. The query saves are wrapped in
 *    the drawer's own snapshot so Undo puts every touched document back exactly; an agent save brings its own.
 * ⚠️ EVERY CONSEQUENCE LINE IS SOMETHING THE SAVE DOES. A reply date is the one the save writes; "I'll suggest a nudge"
 *    is said only where a nudge date is written; "I'll suggest closing it" only where a "Consider closing" plan is.
 */
import React from "react";
import { deleteField } from "firebase/firestore";
import { QueryStatus, SubmissionMethod, type Agent, type Manuscript, type Query } from "../../../types";
import { type WsTask, type QuietAct, andList } from "../../../lib/todoWs";
import { addDays, dayDiff, dayIso, dm, fmt, offWeekend } from "../../../lib/queryActions/dates";
import { saveNudgeSent, saveOfferDecision, saveOfferMoreTime, saveSent, sentDefaults, type SentKind } from "../../../lib/queryActions/stepSaves";
import type { useScriptAllyDb } from "../../../lib/db";
import { saveClose, noreplyAnswers } from "../../../lib/queryActions/closeSave";
import { courtOf, expectedFor } from "../../../lib/qcSummary";
import { recordSweepRow, sweepWrites, toggleRowMaterial } from "../../../lib/materialsSweep";
import type { MaterialRow } from "../../../lib/agentMaterials";
import { recordQueryResponse, type RecordResponseData } from "../../../lib/recordResponse";
import { packagesHeldBy, packagesIn, restoreSnapshot, takeSnapshot } from "../../../lib/queryActions/snapshot";
import { commitCardSave } from "../../../lib/agentCardSave";
import { buildNudgeWrites } from "../../../lib/logNudge";
import { requestSample } from "../../queryActions/journeys/SentJourney";
import { capFirst, sampleName } from "../../../lib/queryActions/sample";
import { isLive, statusWords, viaLabel } from "../../queryActions/journeys/common";
import { CopyDraft, DatePick, ReplySlider, Tiles, dayFromYmd, dayPhrase, longDay, type TileOpt } from "./WsControls";

export type Answers = Record<string, unknown>;

export interface FlowCtx {
  t: WsTask;
  A: Answers;
  set: (patch: Answers) => void;
  today: Date;
  uid: string | null;
  userFirst: string;
  queries: readonly Query[];
  agents: readonly Agent[];
  manuscripts: readonly Manuscript[];
  /* the app's db: the desk saves through lib/queryActions/stepSaves, the drawer's own save path */
  db: ReturnType<typeof useScriptAllyDb>;
  /** "Keep waiting": the task sleeps until that day (the snooze writer, with its own Undo) */
  snoozeFor: (days: number) => Promise<(() => Promise<void>) | null>;
  /** the longest the task may sleep (the snooze rules' ceiling); a longer wait is not offered */
  waitCeiling: number;
  /** the copy button's outcome, said in a toast */
  said: (msg: string) => void;
  /** a nudge already logged since the last send, if any */
  nudgedOn: Date | null;
  suggestion: QuietAct | null;
}

export interface FlowQ { key: string; title: string; hint?: string; body: React.ReactNode; answered: boolean; summary: string; dateHint?: boolean }

/** What the card preview shows while the task is answered */
export interface Draft {
  /** the status the query moves to, drawn on the card's pill and band */
  status?: QueryStatus;
  /** the new step, as the timeline's own activity shape (`buildTimelineRows` draws it) */
  ghost?: Record<string, unknown>;
  /** the agent fields as they will be */
  agentPatch?: Partial<Agent>;
  /** the agent card section the task fills in */
  section?: "how" | "wishlist" | "send";
}

export interface FlowDone { head: string; msg: string; undo?: () => Promise<void> }

export interface Flow {
  questions: FlowQ[];
  sentence: React.ReactNode;
  consequences: string[];
  review: [string, string];
  draft: Draft;
  /** null: this task has no questions here; `door` opens where it is done */
  commit: (() => Promise<FlowDone>) | null;
  door?: { label: string; open: () => void };
}

const dateOf = (A: Answers, k: string, today: Date): Date => (typeof A[k] === "string" ? dayFromYmd(A[k] as string) : today);
const ymd = (d: Date) => dayIso(d).slice(0, 10);

/** wrap a query save in the drawer's snapshot: Undo restores every touched document, packages reconciled */
async function snapshotted(ctx: FlowCtx, ids: string[], save: () => Promise<void>): Promise<(() => Promise<void>) | undefined> {
  const uid = ctx.uid;
  if (!uid) { await save(); return undefined; }
  let snap: Awaited<ReturnType<typeof takeSnapshot>> | null = null;
  try { snap = await takeSnapshot(uid, ids); } catch { snap = null; }
  await save();
  if (!snap) return undefined;
  const s = snap;
  return async () => { const after = await packagesHeldBy(uid, s.queryIds); await restoreSnapshot(s); await ctx.db.reconcileStamps([...packagesIn(s), ...after]); };
}

const dateQ = (ctx: FlowCtx, key: string, title: string, dir: "past" | "future" = "past", fallback?: Date): FlowQ => {
  const v = typeof ctx.A[key] === "string" ? dayFromYmd(ctx.A[key] as string) : fallback ?? ctx.today;
  return {
    key, title, answered: true, summary: longDay(v, ctx.today), dateHint: dir === "past" && dayDiff(v, ctx.today) === 0,
    body: <DatePick value={v} today={ctx.today} dir={dir} onPick={(d) => ctx.set({ [key]: ymd(d) })} />,
  };
};

/* ── send: a partial, a full, a revision ─────────────────────────────────────────────────────── */

/** which send a request asks for (the sent journey's own reading of the status) */
const sendKindOf = (q: Pick<Query, "status">): SentKind =>
  q.status === QueryStatus.FULL_REQUESTED ? "full" : q.status === QueryStatus.REVISE_RESUBMIT ? "rr" : "partial";
const SEND_TARGET: Record<SentKind, QueryStatus> = { partial: QueryStatus.PARTIAL_SENT, full: QueryStatus.FULL_SENT, rr: QueryStatus.RESUBMITTED };

function sendFlow(ctx: FlowCtx): Flow {
  const { t, A, set, today } = ctx;
  const q = t.query!;
  const kind = sendKindOf(q);
  const ms = ctx.manuscripts.find((m) => m.id === q.manuscriptId) ?? null;
  const req = requestSample(q);
  const asked = kind === "full" ? "Full manuscript" : kind === "rr" ? "Revised manuscript" : req ? capFirst(sampleName(req)) : "The partial";
  const opts: TileOpt<string>[] = [
    { k: "Query letter", label: "Query letter", doc: true },
    { k: "Synopsis", label: "Synopsis", doc: true, sub: q.requestSynopsis ? `${t.first} asked for one` : undefined },
    { k: asked, label: asked, doc: true, sub: `What ${t.first} asked for` },
  ];
  const mats = (A.mats as string[] | undefined) ?? [];
  const versions = [...(ms?.bookVersions ?? [])].reverse();
  const askVer = kind !== "partial" && versions.length > 0;
  const ver = (A.ver as string | undefined) ?? null;
  const verName = ver ? versions.find((v) => v.id === ver)?.name ?? null : null;
  const sent = dateOf(A, "date", today);
  /* the reply date and the nudge are the sent journey's own opening answers (stepSaves.sentDefaults: the house reading
     window, which v152 ruled a partial and a full read rather than the agent's query reply time) */
  const { exp, nd: ndOr } = sentDefaults(kind, sent);
  const nd = ndOr ?? offWeekend(addDays(exp, 7));
  const target = SEND_TARGET[kind];
  const lab = kind === "full" ? "Full sent" : kind === "rr" ? "Resubmitted" : "Partial sent";
  const list = andList(mats.map((m, i) => (i ? m.toLowerCase() : m.toLowerCase())));
  const questions: FlowQ[] = [{
    key: "mats", title: "What went with it?", hint: "Tick everything you sent.", answered: mats.length > 0, summary: andList(mats.map((m, i) => (i ? m.toLowerCase() : m))),
    body: <Tiles name="What went with it" multi opts={opts} value={mats} onPick={(k) => set({ mats: mats.includes(k) ? mats.filter((x) => x !== k) : [...mats, k] })} />,
  }];
  if (askVer) {
    questions.push({
      key: "ver", title: "Which version?", answered: A.ver !== undefined, summary: verName ?? "",
      body: <Tiles name="Which version" opts={versions.map((v, i) => ({ k: v.id, label: v.name || `Version ${versions.length - i}`, sub: i === 0 ? "The newest" : undefined }))} value={ver} onPick={(k) => set({ ver: k })} />,
    });
  }
  questions.push(dateQ(ctx, "date", "When did it go?"));
  return {
    questions,
    sentence: <>You sent {t.first} your <b>{list || asked.toLowerCase()}</b>{verName ? ` (${verName})` : ""} <b>{dayPhrase(sent, today)}</b>.</>,
    consequences: [
      `The query moves to ${lab}`,
      `Reply expected by ${fmt(exp)}`,
      `If nothing’s come by ${fmt(nd)}, “Nudge ${t.first}” comes onto your list`,
      "Leaves your tray",
    ],
    review: [`You sent ${t.first} your ${list || asked.toLowerCase()}${verName ? ` (${verName})` : ""} ${dayPhrase(sent, today)}.`, `The query moves to ${lab}, with a reply expected by ${fmt(exp)}.`],
    draft: { status: target, ghost: { id: "__ghost", type: target, resultingStatus: target, createdAt: new Date(sent.getFullYear(), sent.getMonth(), sent.getDate(), 12).toISOString() } },
    commit: async () => {
      const label = capFirst(andList(mats.map((m) => m.toLowerCase())));
      const undo = await snapshotted(ctx, [q.id], () => saveSent(ctx.db, q, { kind, sent, exp, nd, label, bookVersionId: askVer ? ver : null }));
      return { head: "Sent. Nice work.", msg: `${t.first}’s reply is expected by ${fmt(exp)}. If nothing’s come by ${fmt(nd)}, I’ll put “Nudge ${t.first}” on your list.`, undo };
    },
  };
}

/* ── an offer ─────────────────────────────────────────────────────────────────────────────────── */

function offerFlow(ctx: FlowCtx): Flow {
  const { t, A, set, today } = ctx;
  const q = t.query!;
  const ans = A.ans as "accept" | "more" | "decline" | undefined;
  const others = ctx.queries.filter((o) => o.id !== q.id && o.manuscriptId === q.manuscriptId && isLive(o));
  const nameOf = (o: Query) => { const a = ctx.agents.find((x) => x.id === o.agentId); return (a?.name || a?.agency || "An agent").trim(); };
  const questions: FlowQ[] = [{
    key: "ans", title: `What did you tell ${t.first}?`, answered: !!ans,
    summary: ans === "accept" ? "I accepted" : ans === "more" ? "I asked for more time" : ans === "decline" ? "I turned it down" : "",
    body: <Tiles name={`What did you tell ${t.first}`} value={ans ?? null} onPick={(k) => set({ ans: k })} opts={[
      { k: "accept", label: "I accepted", sub: "You’re taking the offer" },
      { k: "more", label: "I asked for more time", sub: "To hear from the others first" },
      { k: "decline", label: "I turned it down", sub: `${t.first}’s query closes` },
    ]} />,
  }];
  const wd = (A.withdraw as string[] | undefined);
  if (ans === "accept" && others.length) {
    const picked = wd ?? [];
    questions.push({
      key: "withdraw", title: "Withdraw your other queries for this book?", hint: "Each one you pick closes as withdrawn, and you get a task to tell that agent.",
      answered: wd !== undefined, summary: !wd ? "" : picked.length === 0 ? "None of them" : picked.length === others.length ? "All of them" : `${picked.length} of ${others.length}`,
      body: (
        <Tiles name="Withdraw your other queries" multi value={wd === undefined ? [] : picked.length ? picked : ["__none"]}
          onPick={(k) => {
            if (k === "__none") { set({ withdraw: [] }); return; }
            const cur = (wd ?? []).filter((x) => x !== "__none");
            set({ withdraw: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] });
          }}
          opts={[
            ...others.map((o) => ({ k: o.id, label: nameOf(o), sub: statusWords(o.status) })),
            { k: "__none", label: "None of them", sub: "They all stay open" },
          ]} />
      ),
    });
  }
  if (ans === "more") {
    const by = typeof A.by === "string" ? dayFromYmd(A.by as string) : null;
    questions.push({
      key: "by", title: `When did you say you’d answer ${t.first} by?`, answered: !!by, summary: by ? longDay(by, today) : "",
      body: <DatePick value={by ?? addDays(today, 7)} today={today} dir="future" onPick={(d) => set({ by: ymd(d) })} />,
    });
  } else if (ans) {
    questions.push(dateQ(ctx, "date", "When?"));
  }
  const on = dateOf(A, "date", today);
  const by = typeof A.by === "string" ? dayFromYmd(A.by as string) : null;
  const chosen = others.filter((o) => (wd ?? []).includes(o.id));
  const consequences = ans === "accept" ? [
    `${t.first} becomes your agent for this book`,
    ...(chosen.length ? [`${chosen.length} other ${chosen.length === 1 ? "query closes" : "queries close"} as withdrawn`, `A “Tell them you’ve signed” task for ${chosen.length === 1 ? "that agent" : "each of them"}`] : []),
    "Leaves your tray",
  ] : ans === "decline" ? ["The query moves to Closed, as offer declined", "Your other queries carry on as they were", "Leaves your tray"]
    : ans === "more" && by ? ["The offer stays open", `Answering it stays on your list, due ${fmt(by)}`] : [];
  const sentence = ans === "accept" ? <>You accepted {t.first}’s offer <b>{dayPhrase(on, today)}</b>.</>
    : ans === "decline" ? <>You turned down {t.first}’s offer <b>{dayPhrase(on, today)}</b>.</>
    : <>You asked {t.first} for more time, and you’ll answer by <b>{by ? longDay(by, today) : ""}</b>.</>;
  const status = ans === "accept" ? QueryStatus.SIGNED : ans === "decline" ? QueryStatus.WITHDRAWN : undefined;
  return {
    questions, sentence, consequences,
    review: ans === "accept" ? [`You accepted ${t.first}’s offer ${dayPhrase(on, today)}.`, chosen.length ? `${chosen.length} other ${chosen.length === 1 ? "query is" : "queries are"} withdrawn, each with a task to tell the agent.` : "Your other queries stay as they are."]
      : ans === "decline" ? [`You turned down ${t.first}’s offer ${dayPhrase(on, today)}.`, "The query moves to Closed."]
      : [`You asked ${t.first} for more time.`, by ? `The offer stays open. Answering it stays on your list, due ${fmt(by)}.` : ""],
    draft: status ? { status, ghost: { id: "__ghost", type: status, resultingStatus: status, createdAt: new Date(on.getFullYear(), on.getMonth(), on.getDate(), 12).toISOString() } } : {},
    commit: async () => {
      if (ans === "more" && by) {
        const undo = await snapshotted(ctx, [q.id], () => saveOfferMoreTime(ctx.db, q, by));
        return { head: "Answer recorded.", msg: `The offer stays open. Answering ${t.first} stays on your list, due ${fmt(by)}.`, undo };
      }
      const dec = ans === "accept" ? "accept" : "decline";
      const undo = await snapshotted(ctx, [q.id, ...chosen.map((o) => o.id)], async () => { await saveOfferDecision(ctx.db, q, t.agent ?? null, { dec, on, withdraw: chosen, remindTell: true }); });
      return dec === "accept"
        ? { head: "Congratulations!", msg: chosen.length ? `Next, let the other agents know. A “Tell them you’ve signed” task is on your list for each one.` : `${t.first} is now your agent for this book.`, undo }
        : { head: "Answer recorded.", msg: `${t.first}’s query is closed as offer declined. Your other queries carry on.`, undo };
    },
  };
}

/* ── a nudge ──────────────────────────────────────────────────────────────────────────────────── */

const NUDGE_THEN_DAYS = 28;

function nudgeDraftText(ctx: FlowCtx): string {
  const q = ctx.t.query!;
  const ms = ctx.manuscripts.find((m) => m.id === q.manuscriptId);
  const title = (ms?.title ?? "my manuscript").toUpperCase();
  const what = q.status === QueryStatus.FULL_SENT ? "full manuscript of" : q.status === QueryStatus.PARTIAL_SENT ? "partial of" : "query for";
  return `Dear ${ctx.t.first},\n\nI sent you my ${what} ${title} a while ago and wanted to check it reached you. I’d still love you to consider it.\n\nBest wishes,\n${ctx.userFirst}`;
}

function nudgeParts(ctx: FlowCtx, withDraft: boolean): { qs: FlowQ[]; sent: Date; then: Date } {
  const { t, A, set, today } = ctx;
  const sent = dateOf(A, "date", today);
  const then = offWeekend(addDays(sent, NUDGE_THEN_DAYS));
  const qs: FlowQ[] = [{
    key: "sent", title: withDraft ? "Have you sent it?" : "Have you sent the nudge?", answered: A.sent === true, summary: "Yes, I’ve sent it",
    hint: withDraft ? "Here’s a short note you can copy and send from your email." : undefined,
    body: (
      <>
        {withDraft ? <CopyDraft text={nudgeDraftText(ctx)} onCopied={(ok) => ctx.said(ok ? "Copied. Paste it into your email." : "Couldn’t copy it. Select the text and copy it yourself.")} /> : null}
        <Tiles name="Have you sent it" multi value={A.sent === true ? ["yes"] : []} onPick={() => set({ sent: A.sent === true ? undefined : true })}
          opts={[{ k: "yes", label: withDraft ? "Yes, I’ve sent it" : `Yes, I nudged ${t.first}`, sub: withDraft ? undefined : "A short note asking if it reached them" }]} />
      </>
    ),
  }];
  qs.push(dateQ(ctx, "date", "When did you send it?"));
  return { qs, sent, then };
}

/** the nudge save's plan, by the method the query went by (the nudge journey's own default) */
const nudgePlan = (q: Query, sent: Date, then: Date) => {
  const via = (q.sendMethod as SubmissionMethod) || SubmissionMethod.EMAIL;
  return { sent, then, said: "", via, viaWords: viaLabel(via) };
};

function nudgeFlow(ctx: FlowCtx): Flow {
  const { t, today } = ctx;
  const q = t.query!;
  const { qs, sent, then } = nudgeParts(ctx, false);
  const ghost = buildNudgeWrites(q, t.agent ?? null, { checkBackDate: dayIso(then), note: "", eventDate: dayIso(sent) } as never, new Date()).nested;
  return {
    questions: qs,
    sentence: <>You nudged {t.first} <b>{dayPhrase(sent, today)}</b>.</>,
    consequences: [`If ${t.first} still hasn’t replied by ${fmt(then)}, I’ll suggest closing it`, "Leaves your tray"],
    review: [`You nudged ${t.first} ${dayPhrase(sent, today)}.`, `If there’s still no reply by ${fmt(then)}, “Consider closing” comes onto your list.`],
    draft: { ghost: { id: "__ghost", ...ghost } },
    commit: async () => {
      const undo = await snapshotted(ctx, [q.id], () => saveNudgeSent(ctx.db, q, t.agent ?? null, nudgePlan(q, sent, then)));
      return { head: "Nudge logged.", msg: `If ${t.first} still hasn’t replied by ${fmt(then)}, I’ll suggest closing it.`, undo };
    },
  };
}

/**
 * ⚠️ WHAT A NEW REPLY TIME CHANGES, BY A DRY RUN THROUGH THE REAL CLOCK (the Also-changes law). For each of this agent's
 * live queries, the Query Centre's own `expectedFor` is run with the agent as it is and with the new weeks; a query is
 * named only where the date moves. A partial or a full reads the house window (v152), and a writer's own date holds
 * (the recency law), so neither is said to change — arithmetic on the send date would claim both did.
 */
export function replyDatesMoved(ctx: Pick<FlowCtx, "queries" | "manuscripts">, agent: Agent, weeks: number): { queryId: string; ms: number; title: string }[] {
  const next = { ...agent, responseTimeWeeks: weeks };
  return ctx.queries
    .filter((q) => q.agentId === agent.id && courtOf(q.status as QueryStatus) === "agent")
    .flatMap((q) => {
      const was = expectedFor(q, agent).ms, now = expectedFor(q, next).ms;
      if (now == null || now === was) return [];
      return [{ queryId: q.id, ms: now, title: ctx.manuscripts.find((m) => m.id === q.manuscriptId)?.title?.trim() || "Untitled manuscript" }];
    });
}

/* ── gone quiet ───────────────────────────────────────────────────────────────────────────────── */

const WAITS: [string, string, (today: Date) => Date][] = [
  ["2w", "Two more weeks", (d) => addDays(d, 14)],
  ["1m", "A month", (d) => addDays(d, 30)],
  ["ny", "Until the new year", (d) => new Date(d.getFullYear() + 1, 0, 1)],
];

const REPLIES: { k: "pass" | "partial" | "full" | "offer"; label: string; status: QueryStatus }[] = [
  { k: "pass", label: "They passed", status: QueryStatus.REJECTED },
  { k: "partial", label: "They asked for a partial", status: QueryStatus.PARTIAL_REQUESTED },
  { k: "full", label: "They asked for the full", status: QueryStatus.FULL_REQUESTED },
  { k: "offer", label: "They made an offer", status: QueryStatus.OFFER },
];

function quietFlow(ctx: FlowCtx, openPartial: () => void): Flow {
  const { t, A, set, today } = ctx;
  const q = t.query!;
  const act = A.act as QuietAct | undefined;
  const sug = ctx.suggestion;
  const stage = q.status === QueryStatus.FULL_SENT ? 2 : q.status === QueryStatus.PARTIAL_SENT ? 1 : 0;
  const nudgedWord = ctx.nudgedOn ? dm(ctx.nudgedOn) : null;
  const ACTS: TileOpt<QuietAct>[] = [
    { k: "nudge", label: "Nudge them once more", sub: nudgedWord ? `You nudged ${t.first} on ${nudgedWord}. A second nudge rarely helps.` : "Logs the nudge and starts a fresh reply window", disabled: !!nudgedWord, suggested: sug === "nudge" },
    { k: "wait", label: "Keep waiting", sub: "Leave it open and check back later", suggested: sug === "wait" },
    { k: "replied", label: "They did reply", sub: "A reply you haven’t logged yet", suggested: sug === "replied" },
    { k: "close", label: "Close it", sub: "Take it off your active list", suggested: sug === "close" },
  ];
  const ACT_WORD: Record<QuietAct, string> = { nudge: "Nudge them once more", wait: "Keep waiting", replied: "They did reply", close: "Close it" };
  const questions: FlowQ[] = [{
    key: "act", title: "What would you like to do?", answered: !!act, summary: act ? ACT_WORD[act] : "",
    body: <Tiles name="What would you like to do" value={act ?? null} opts={ACTS} onPick={(k) => set({ act: k, sent: undefined, until: undefined, what: undefined, why: undefined })} />,
  }];
  const on = dateOf(A, "date", today);
  const base: Omit<Flow, "questions"> = { sentence: null, consequences: [], review: ["", ""], draft: {}, commit: null };

  if (act === "nudge") {
    const p = nudgeParts(ctx, true);
    const ghost = buildNudgeWrites(q, t.agent ?? null, { checkBackDate: dayIso(p.then), note: "", eventDate: dayIso(p.sent) } as never, new Date()).nested;
    return {
      ...base, questions: [...questions, ...p.qs],
      sentence: <>You nudged {t.first} <b>{dayPhrase(p.sent, today)}</b>.</>,
      consequences: [`The query goes back to waiting on ${t.first}`, `If there’s still nothing by ${fmt(p.then)}, it comes back to you`, "Leaves your tray"],
      review: [`You nudged ${t.first} ${dayPhrase(p.sent, today)}.`, `If there’s still no reply by ${fmt(p.then)}, it comes back onto your list.`],
      draft: { ghost: { id: "__ghost", ...ghost } },
      commit: async () => {
        const undo = await snapshotted(ctx, [q.id], () => saveNudgeSent(ctx.db, q, t.agent ?? null, nudgePlan(q, p.sent, p.then)));
        return { head: "Nudge logged.", msg: `If ${t.first} still hasn’t replied by ${fmt(p.then)}, this will come back to you.`, undo };
      },
    };
  }
  if (act === "wait") {
    const k = A.until as string | undefined;
    const w = WAITS.find((x) => x[0] === k);
    const until = w ? w[2](today) : null;
    questions.push({
      key: "until", title: "How much longer?", answered: !!w, summary: w && until ? `Until ${fmt(until)}` : "",
      body: <Tiles name="How much longer" value={k ?? null} onPick={(x) => set({ until: x })} opts={WAITS.map(([key, label, fn]) => {
          const days = dayDiff(fn(today), today);
          return { k: key, label, disabled: days > ctx.waitCeiling, sub: days > ctx.waitCeiling ? "Longer than this task can wait" : `Back on your list ${fmt(fn(today))}` };
        })} />,
    });
    return {
      ...base, questions,
      sentence: <>You’re giving {t.first} until <b>{until ? fmt(until) : ""}</b>. The query stays open.</>,
      consequences: until ? [`Back on your list on ${fmt(until)} if there’s still no word`, "It stays in Gone quiet on the Query Centre", "Leaves your tray until then"] : [],
      review: [`You’re giving ${t.first} until ${until ? fmt(until) : ""}.`, "The query stays open. If nothing’s come in by then, it’ll be back on your list."],
      commit: async () => {
        const undo = await ctx.snoozeFor(Math.max(1, dayDiff(until!, today)));
        return { head: "No rush.", msg: `${t.first}’s query stays open. You’ll see this again on ${fmt(until!)} if nothing comes in.`, undo: undo ?? undefined };
      },
    };
  }
  if (act === "replied") {
    const what = A.what as (typeof REPLIES)[number]["k"] | undefined;
    questions.push({
      key: "what", title: `What did ${t.first} say?`, answered: !!what, summary: REPLIES.find((r) => r.k === what)?.label ?? "",
      body: <Tiles name={`What did ${t.first} say`} value={what ?? null} onPick={(x) => set({ what: x })} opts={REPLIES.map((r) => {
        const lvl = r.k === "partial" ? 1 : r.k === "full" ? 2 : 0;
        const off = lvl > 0 && lvl <= stage;
        return { k: r.k, label: r.label, disabled: off, sub: off ? `${t.first} already has your ${stage === 2 ? "full" : "partial"}.` : r.k === "partial" ? "You’ll say how much they asked for" : undefined };
      })} />,
    });
    if (what === "partial") {
      return {
        ...base, questions,
        sentence: <>{t.first} asked for a partial.</>, consequences: [],
        review: ["", ""],
        door: { label: "Say how much they asked for →", open: openPartial },
        commit: null,
      };
    }
    if (what) questions.push(dateQ(ctx, "date", "When did they reply?"));
    const r = REPLIES.find((x) => x.k === what);
    const sendBy = addDays(on, 14);
    const offerBy = addDays(on, 14);
    return {
      ...base, questions,
      sentence: <>{t.first} replied <b>{dayPhrase(on, today)}</b>: <b>{(r?.label ?? "").replace("They ", "they ")}</b>.</>,
      consequences: what === "pass" ? ["The query moves to Closed, as passed", "It goes on your Responses page", "Leaves your tray"]
        : what === "full" ? ["The query moves to Full requested", `Sending it comes onto your list, due ${fmt(sendBy)}`, "This task leaves your tray"]
        : what === "offer" ? ["The query moves to Offer", `Answering the offer goes to the top of your list, due ${fmt(offerBy)}`, "This task leaves your tray"] : [],
      review: [`${t.first} replied ${dayPhrase(on, today)}: ${(r?.label ?? "").replace("They ", "they ").toLowerCase()}.`,
        what === "pass" ? "The query moves to Closed." : what === "full" ? `Sending the full comes onto your list, due ${fmt(sendBy)}.` : `Answering the offer comes onto your list, due ${fmt(offerBy)}.`],
      draft: r ? { status: r.status, ghost: { id: "__ghost", type: r.status, resultingStatus: r.status, createdAt: new Date(on.getFullYear(), on.getMonth(), on.getDate(), 12).toISOString() } } : {},
      commit: async () => {
        const rt = what === "pass" ? "rejected" : what === "full" ? "full" : "offer";
        const data: RecordResponseData = {
          responseType: rt as RecordResponseData["responseType"],
          materialsType: "Pages", materialsQuantity: 0, materialsOtherText: "",
          expectedBy: what === "full" ? dayIso(sendBy) : "", sendReminderDate: "",
          dateReceived: dayIso(on), rrNotes: "", feedbackType: "Form", feedbackText: "", privateReflection: "", rejectionLesson: "", requeryPreference: "",
          offerDate: what === "offer" ? dayIso(on) : "", offerDeadline: what === "offer" ? dayIso(offerBy) : "", offerNotes: "",
          closingReason: "Other", closingNotes: "",
          eventKey: what === "pass" ? "pass" : what === "full" ? "full_requested" : "offer",
        } as RecordResponseData;
        const undo = await snapshotted(ctx, [q.id], async () => {
          const ms = ctx.manuscripts.find((m) => m.id === q.manuscriptId) || null;
          await recordQueryResponse({ userId: ctx.uid!, query: q, agent: t.agent ?? null, manuscript: ms }, data);
          const extra: Record<string, unknown> = {};
          if (q.nudgeDate) extra.nudgeDate = deleteField();
          if (q.closePlan) extra.closePlan = deleteField();
          if (Object.keys(extra).length) await ctx.db.updateQuery(q.id, extra as Partial<Query>);
        });
        return what === "pass" ? { head: "Logged.", msg: "It’s on your Responses page now.", undo }
          : what === "offer" ? { head: "Congratulations!", msg: `Answering ${t.first}’s offer is at the top of your list.`, undo }
          : { head: "Good news!", msg: `${t.first} wants to read more. Sending the full is now on your list.`, undo };
      },
    };
  }
  if (act === "close") {
    const why = A.why as "noreply" | "withdraw" | undefined;
    questions.push({
      key: "why", title: "Why is it closing?", answered: !!why, summary: why === "noreply" ? "No reply" : why === "withdraw" ? "I withdrew it" : "",
      body: <Tiles name="Why is it closing" value={why ?? null} onPick={(x) => set({ why: x })} opts={[
        { k: "noreply", label: "No reply", sub: "They never answered" },
        { k: "withdraw", label: "I withdrew it", sub: "You took it off the table" },
      ]} />,
    });
    if (why) questions.push(dateQ(ctx, "date", "When?"));
    const status = why === "withdraw" ? QueryStatus.WITHDRAWN : QueryStatus.NO_RESPONSE;
    return {
      ...base, questions,
      sentence: <>You’re closing your query to {t.first}: <b>{why === "withdraw" ? "you withdrew it" : "no reply"}</b>.</>,
      consequences: [`The query moves to Closed, as ${why === "withdraw" ? "withdrawn" : "no reply"}`, why === "withdraw" ? "It shows on your Responses page" : "It counts as no reply on your Responses page", "Leaves your tray"],
      review: [`You’re closing your query to ${t.first}${why === "withdraw" ? ", withdrawn" : ""}.`, `It moves to Closed. If ${t.first} gets back to you, you can reopen it.`],
      draft: why ? { status, ghost: { id: "__ghost", type: status, resultingStatus: status, createdAt: new Date(on.getFullYear(), on.getMonth(), on.getDate(), 12).toISOString() } } : {},
      commit: async () => {
        const a = why === "withdraw"
          ? { why: "withdraw" as const, on, wd: "other" as const, told: true, remindTell: false, recheck: "no" as const, note: "" }
          : { ...noreplyAnswers(on), on };
        const undo = await snapshotted(ctx, [q.id], () => saveClose(ctx.db, q, t.agent ?? null, a, today));
        return { head: "Closed.", msg: `It’s on your Responses page now. If ${t.first} ever gets back to you, you can reopen it.`, undo };
      },
    };
  }
  return { ...base, questions };
}

/* ── housekeeping: one gap on one agent's card ───────────────────────────────────────────────── */

function fixFlow(ctx: FlowCtx, openCard: () => void): Flow {
  const { t, A, set } = ctx;
  const agent = t.agent!;
  const save = async (patch: Record<string, unknown>): Promise<(() => Promise<void>) | undefined> => {
    const out = await commitCardSave({ uid: ctx.uid!, agent, queries: ctx.queries, patch: patch as never, resolveTaskFlag: ctx.db.resolveTaskFlag });
    if ("error" in out.res) throw new Error(String((out.res as { error: unknown }).error));
    return out.undo ? async () => { await out.undo!(); } : undefined;
  };
  if (t.need === "responseTime") {
    const wk = typeof A.wk === "number" ? (A.wk as number) : null;
    const moved = wk ? replyDatesMoved(ctx, agent, wk) : [];
    return {
      questions: [{
        key: "wk", title: `How long does ${t.first} usually take to reply?`, hint: "From their website or agency page. Drag to set it.", answered: !!wk, summary: wk ? `About ${wk} week${wk === 1 ? "" : "s"}` : "",
        body: <ReplySlider weeks={wk} onPick={(w) => set({ wk: w })} />,
      }],
      sentence: <>{t.first} replies in about <b>{wk} week{wk === 1 ? "" : "s"}</b>.</>,
      consequences: [`Saved to ${t.first}’s card`, ...moved.map((m) => `Reply expected by ${fmt(new Date(m.ms))}${moved.length > 1 ? ` (${m.title})` : ""}`), "Leaves your tray"],
      review: [`${t.first} replies in about ${wk} weeks.`, moved.length === 1 ? `That goes on ${t.first}’s card, and your query’s reply is expected by ${fmt(new Date(moved[0].ms))}.` : `That goes on ${t.first}’s card.`],
      draft: wk ? { agentPatch: { responseTimeWeeks: wk }, section: "how" } : { section: "how" },
      commit: async () => ({ head: `Saved to ${t.first}’s card.`, msg: moved.length === 1 ? `Your query’s reply is now expected by ${fmt(new Date(moved[0].ms))}.` : moved.length ? `Reply dates for ${moved.length} of your queries to ${t.first} have moved.` : `${t.first}’s card is a little more complete.`, undo: await save({ responseTimeWeeks: wk }) }),
    };
  }
  if (t.need === "mswl") {
    const wish = typeof A.wish === "string" ? (A.wish as string) : "";
    return {
      questions: [{
        key: "wish", title: `What is ${t.first} looking for?`, hint: "In their words, from their wishlist or website.", answered: wish.trim().length > 0,
        summary: wish.length > 40 ? `${wish.slice(0, 40)}…` : wish,
        body: <textarea className="tws-ta" placeholder="Paste it here" value={wish} onChange={(e) => set({ wish: e.target.value })} aria-label={`What ${t.first} is looking for`} />,
      }],
      sentence: <>{t.first}’s wishlist goes on their card.</>,
      consequences: [`Saved to ${t.first}’s card`, "Leaves your tray"],
      review: [`You’ve added ${t.first}’s wishlist.`, `It goes on ${t.first}’s card, so it’s there next time you’re deciding who to query.`],
      draft: wish.trim() ? { agentPatch: { mswlNotes: wish.trim() }, section: "wishlist" } : { section: "wishlist" },
      commit: async () => ({ head: `Saved to ${t.first}’s card.`, msg: `${t.first}’s card is a little more complete.`, undo: await save({ mswlNotes: wish.trim() }) }),
    };
  }
  /* what they want sent: the agent card's own materials control does this (a sample has a unit and an amount) */
  return {
    questions: [], sentence: null, consequences: [], review: ["", ""], draft: { section: "send" }, commit: null,
    door: { label: `Open ${t.first}’s card at “Send them” ↗`, open: openCard },
  };
}

/* ── the builder ──────────────────────────────────────────────────────────────────────────────── */

/* ── what you sent: one query of the batch (v51.1) ─────────────────────────────────────────────── */

const MAT_TILES: [MaterialRow["key"], string][] = [["queryLetter", "Query letter"], ["synopsis", "Synopsis"], ["sample", "Opening sample"]];

/**
 * ⚠️ THE SWEEP'S OWN WRITE (lib/materialsSweep): a row built by `recordSweepRow`, ticked by `toggleRowMaterial`, written
 * by `sweepWrites` as the query's `materialsWanted` — the same one write the page's bulk sweep makes, with the same undo
 * (the value as it was). `ctx.t` is the batch row pointed at its current query by the workspace.
 */
function materialsFlow(ctx: FlowCtx): Flow {
  const { t, A, set } = ctx;
  const q = t.query!;
  const picked = (A.mats as string[] | undefined) ?? [];
  let row = recordSweepRow({ queryId: q.id, agentName: t.first, sentMs: 0 }, { sentOn: "" });
  for (const k of picked) row = toggleRowMaterial([row], q.id, k as MaterialRow["key"])[0];
  const names = MAT_TILES.filter(([k]) => picked.includes(k)).map(([, l], i) => (i ? l.toLowerCase() : l));
  return {
    questions: [{
      key: "mats", title: `What went to ${t.first}?`, hint: "Tick everything that went with this query.", answered: picked.length > 0, summary: andList(names),
      body: <Tiles name={`What went to ${t.first}`} multi opts={MAT_TILES.map(([k, l]) => ({ k, label: l, doc: true }))} value={picked}
        onPick={(k) => set({ mats: picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k] })} />,
    }],
    sentence: <>You sent {t.first} your <b>{andList(names.map((n) => n.toLowerCase()))}</b>.</>,
    consequences: [`Saved on ${t.first}’s query`, (t.batch?.length ?? 0) > 1 ? `Then the next of ${t.batch!.length - 1} opens` : "Leaves your tray"],
    review: [`You sent ${t.first} your ${andList(names.map((n) => n.toLowerCase()))}.`, `That’s saved on the query, so it counts as recorded.`],
    draft: {},
    commit: async () => {
      const w = sweepWrites([row])[0];
      if (!w) throw new Error("Nothing ticked");
      const before = q.materialsWanted;
      await ctx.db.updateQuery(q.id, { materialsWanted: w.materialsWanted } as Partial<Query>);
      return {
        head: (t.batch?.length ?? 0) > 1 ? "Saved." : "All filled in.", msg: `Saved what you sent ${t.first}.`,
        undo: async () => { await ctx.db.updateQuery(q.id, { materialsWanted: (before ?? []) as string[] } as Partial<Query>); },
      };
    },
  };
}

export function buildFlow(ctx: FlowCtx, doors: { openPartial: () => void; openCard: () => void; openOther: (() => void) | null }): Flow {
  const k = ctx.t.kind;
  if ((k === "send" || k === "rr") && ctx.t.query) return sendFlow(ctx);
  if (k === "offer" && ctx.t.query) return offerFlow(ctx);
  if (k === "nudge" && ctx.t.query) return nudgeFlow(ctx);
  if (k === "quiet" && ctx.t.query) return quietFlow(ctx, doors.openPartial);
  if (k === "fix" && ctx.t.agent) return fixFlow(ctx, doors.openCard);
  if (k === "batch" && ctx.t.query) return materialsFlow(ctx);
  /* the one-query materials row is filled in on the desk the same way, and is the last of its kind */
  if (k === "other" && ctx.t.query && (ctx.t.item.card.taskType === "materials_unrecorded" || ctx.t.item.card.taskType === "materials_unrecorded_bulk")) return materialsFlow(ctx);
  return {
    questions: [], sentence: null, consequences: [], review: ["", ""], draft: {}, commit: null,
    door: doors.openOther ? { label: "Open it ↗", open: doors.openOther } : undefined,
  };
}
