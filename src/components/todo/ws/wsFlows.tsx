/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 — WHAT EACH TASK ASKS, AND WHAT IT LOGS. One builder per task kind: the questions in order (each with
 * its answered test and its one-line summary), the plain sentence the check step shows, the dated points listed under
 * it, the draft the card preview shows, and the save.
 *
 * ⚠️ EVERY SAVE IS AN EXISTING ONE, AND THE DRAWER'S. A send is `saveSent`, a nudge `saveNudgeSent`, an offer decision
 *    `saveOfferDecision` (all lib/queryActions/stepSaves, which the drawer's journeys commit through), a reply `recordQueryResponse`, a close `saveClose`, an agent field `commitCardSave`. The query saves are wrapped in
 *    the drawer's own snapshot so Undo puts every touched document back exactly; an agent save brings its own.
 * ⚠️ EVERY POINT ON THE CHECK STEP'S TIMELINE IS SOMETHING THE SAVE DOES (v50's rule, v53's timeline): a date is the one
 *    the save writes; "Nudge {first}" is said only where a nudge date is written; "I'll suggest closing it" only where a
 *    "Consider closing" plan is. TD53 L4 compares the dates with the save's own writes.
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
import { writerExpectedWrite } from "../../../lib/expectedDate";
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

export interface FlowQ { key: string; title: string; hint?: string; body: React.ReactNode; answered: boolean; summary: string }

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
  /** v53 (D8): the query's fields as the save leaves them (undefined: the save removes the field); the card's future
   *  state is drawn from these plus the new step, through the card's own derivation */
  future?: Record<string, unknown>;
  /** v53 (D8): what went, when it was more than the one thing (the new bubble's paperclip), and the version */
  sent?: string[];
  version?: string | null;
}

/** v53 (D7): one dated point on the check step's timeline — something the save writes, on the day it is for */
export interface FlowPoint { at: Date; what: React.ReactNode; art: "stamp" | "letter" | "nudge" | "card" | "close" | "calendar" | "offer" }

export interface FlowDone { head: string; msg: string; undo?: () => Promise<void>;
  /** v53 (D10): the desk's snackbar — what happened, and one detail */
  snack?: { msg: string; sub: string } }

export interface Flow {
  questions: FlowQ[];
  sentence: React.ReactNode;
  draft: Draft;
  /** null: this task has no questions here; `door` opens where it is done */
  commit: (() => Promise<FlowDone>) | null;
  door?: { label: string; open: () => void };
  /** v53 (D7): the check step's dated points (at most three), every one a thing the save writes */
  timeline?: FlowPoint[];
  /** v53 (D7): the check step's closing line, where "This task leaves your list" is not true */
  after?: string;
  /** v53 (D7): the final button, where it is not "Log it" */
  verb?: string;
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
    key, title, answered: true, summary: longDay(v, ctx.today),
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
    timeline: [
      { at: sent, what: <>Your query moves to <b>{lab}</b></>, art: "stamp" },
      { at: exp, what: <>{t.first}’s reply is expected</>, art: "letter" },
      { at: nd, what: <>If nothing’s come, “Nudge {t.first}” comes onto your list</>, art: "nudge" },
    ],
    draft: {
      status: target, ghost: { id: "__ghost", type: target, resultingStatus: target, createdAt: new Date(sent.getFullYear(), sent.getMonth(), sent.getDate(), 12).toISOString() },
      future: { ...writerExpectedWrite(new Date(dayIso(exp)).toISOString()), nudgeDate: new Date(dayIso(nd)).toISOString(), expectedSendDate: undefined, sendReminderDate: undefined, lastSentLabel: capFirst(andList(mats.map((m) => m.toLowerCase()))) },
      sent: mats, version: verName,
    },
    commit: async () => {
      const label = capFirst(andList(mats.map((m) => m.toLowerCase())));
      const undo = await snapshotted(ctx, [q.id], () => saveSent(ctx.db, q, { kind, sent, exp, nd, label, bookVersionId: askVer ? ver : null }));
      return { head: "Sent. Nice work.", msg: `${t.first}’s reply is expected by ${fmt(exp)}. If nothing’s come by ${fmt(nd)}, I’ll put “Nudge ${t.first}” on your list.`, undo,
        snack: { msg: `${lab} to ${t.first}`, sub: `reply expected by ${fmt(exp)}` } };
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
  const sentence = ans === "accept" ? <>You accepted {t.first}’s offer <b>{dayPhrase(on, today)}</b>.</>
    : ans === "decline" ? <>You turned down {t.first}’s offer <b>{dayPhrase(on, today)}</b>.</>
    : <>You asked {t.first} for more time, and you’ll answer by <b>{by ? longDay(by, today) : ""}</b>.</>;
  const status = ans === "accept" ? QueryStatus.SIGNED : ans === "decline" ? QueryStatus.WITHDRAWN : undefined;
  const timeline: FlowPoint[] = ans === "accept" ? [
    { at: on, what: <>{t.first} becomes your agent for this book</>, art: "offer" },
    ...(chosen.length ? [{ at: on, what: <>{chosen.length} other {chosen.length === 1 ? "query closes" : "queries close"} as withdrawn, with a “Tell them you’ve signed” task for {chosen.length === 1 ? "that agent" : "each"}</>, art: "close" as const }] : []),
  ] : ans === "decline" ? [{ at: on, what: <>The query moves to <b>Closed</b>, as offer declined</>, art: "close" }]
    : ans === "more" && by ? [{ at: today, what: <>The offer stays open</>, art: "offer" }, { at: by, what: <>Answering {t.first}’s offer is due</>, art: "calendar" }] : [];
  return {
    questions, sentence, timeline,
    after: ans === "more" && by ? `This task stays on your list, due ${fmt(by)}.` : undefined,
    draft: status ? { status, ghost: { id: "__ghost", type: status, resultingStatus: status, createdAt: new Date(on.getFullYear(), on.getMonth(), on.getDate(), 12).toISOString() } }
      : ans === "more" && by ? { future: { offerResponseDeadline: dayIso(by) } } : {},
    commit: async () => {
      if (ans === "more" && by) {
        const undo = await snapshotted(ctx, [q.id], () => saveOfferMoreTime(ctx.db, q, by));
        return { head: "Answer recorded.", msg: `The offer stays open. Answering ${t.first} stays on your list, due ${fmt(by)}.`, undo,
          snack: { msg: "Answer recorded", sub: `answering ${t.first} is due ${fmt(by)}` } };
      }
      const dec = ans === "accept" ? "accept" : "decline";
      const undo = await snapshotted(ctx, [q.id, ...chosen.map((o) => o.id)], async () => { await saveOfferDecision(ctx.db, q, t.agent ?? null, { dec, on, withdraw: chosen, remindTell: true }); });
      return dec === "accept"
        ? { head: "Congratulations!", msg: chosen.length ? `Next, let the other agents know. A “Tell them you’ve signed” task is on your list for each one.` : `${t.first} is now your agent for this book.`, undo,
          snack: { msg: `You accepted ${t.first}’s offer`, sub: chosen.length ? `${chosen.length} other ${chosen.length === 1 ? "query" : "queries"} withdrawn` : `${t.first} is your agent for this book` } }
        : { head: "Answer recorded.", msg: `${t.first}’s query is closed as offer declined. Your other queries carry on.`, undo,
          snack: { msg: `You turned down ${t.first}’s offer`, sub: "the query is closed" } };
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
  const nw = buildNudgeWrites(q, t.agent ?? null, { checkBackDate: dayIso(then), note: "", eventDate: dayIso(sent) } as never, new Date());
  const ghost = nw.nested;
  return {
    questions: qs,
    sentence: <>You nudged {t.first} <b>{dayPhrase(sent, today)}</b>.</>,
    timeline: [
      { at: sent, what: <>Your nudge to {t.first} is logged</>, art: "nudge" },
      { at: then, what: <>If {t.first} still hasn’t replied, I’ll suggest closing it</>, art: "close" },
    ],
    draft: { ghost: { id: "__ghost", ...ghost }, future: { lastNudgeSentDate: nw.queryUpdates.lastNudgeSentDate, closePlan: dayIso(then), nudgeDate: undefined } },
    commit: async () => {
      const undo = await snapshotted(ctx, [q.id], () => saveNudgeSent(ctx.db, q, t.agent ?? null, nudgePlan(q, sent, then)));
      return { head: "Nudge logged.", msg: `If ${t.first} still hasn’t replied by ${fmt(then)}, I’ll suggest closing it.`, undo,
        snack: { msg: `Nudge logged for ${t.first}`, sub: `I’ll suggest closing it if nothing by ${fmt(then)}` } };
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
  const base: Omit<Flow, "questions"> = { sentence: null, draft: {}, commit: null };

  if (act === "nudge") {
    const p = nudgeParts(ctx, true);
    const nw = buildNudgeWrites(q, t.agent ?? null, { checkBackDate: dayIso(p.then), note: "", eventDate: dayIso(p.sent) } as never, new Date());
    const ghost = nw.nested;
    return {
      ...base, questions: [...questions, ...p.qs],
      sentence: <>You nudged {t.first} <b>{dayPhrase(p.sent, today)}</b>.</>,
      timeline: [
        { at: p.sent, what: <>Your nudge is logged, and the query goes back to waiting on {t.first}</>, art: "nudge" },
        { at: p.then, what: <>If there’s still nothing, it comes back to you</>, art: "calendar" },
      ],
      draft: { ghost: { id: "__ghost", ...ghost }, future: { lastNudgeSentDate: nw.queryUpdates.lastNudgeSentDate, closePlan: dayIso(p.then), nudgeDate: undefined } },
      commit: async () => {
        const undo = await snapshotted(ctx, [q.id], () => saveNudgeSent(ctx.db, q, t.agent ?? null, nudgePlan(q, p.sent, p.then)));
        return { head: "Nudge logged.", msg: `If ${t.first} still hasn’t replied by ${fmt(p.then)}, this will come back to you.`, undo,
          snack: { msg: `Nudge logged for ${t.first}`, sub: `back on your list ${fmt(p.then)} if there’s still nothing` } };
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
      timeline: until ? [{ at: until, what: <>Back on your list if there’s still no word</>, art: "calendar" }] : [],
      after: until ? `This task leaves your list until ${fmt(until)}.` : undefined,
      commit: async () => {
        const undo = await ctx.snoozeFor(Math.max(1, dayDiff(until!, today)));
        return { head: "No rush.", msg: `${t.first}’s query stays open. You’ll see this again on ${fmt(until!)} if nothing comes in.`, undo: undo ?? undefined,
          snack: { msg: `Waiting on ${t.first}`, sub: `back on your list ${fmt(until!)}` } };
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
        sentence: <>{t.first} asked for a partial.</>,
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
      timeline: what === "pass" ? [{ at: on, what: <>The query moves to <b>Closed</b>, as passed</>, art: "close" }]
        : what === "full" ? [{ at: on, what: <>The query moves to <b>Full requested</b></>, art: "letter" }, { at: sendBy, what: <>Sending the full is due on your list</>, art: "calendar" }]
        : what === "offer" ? [{ at: on, what: <>The query moves to <b>Offer</b></>, art: "offer" }, { at: offerBy, what: <>Answering the offer is due</>, art: "calendar" }] : [],
      draft: r ? { status: r.status, ghost: { id: "__ghost", type: r.status, resultingStatus: r.status, createdAt: new Date(on.getFullYear(), on.getMonth(), on.getDate(), 12).toISOString() },
        future: { nudgeDate: undefined, closePlan: undefined, ...(what === "full" ? { expectedSendDate: dayIso(sendBy) } : {}), ...(what === "offer" ? { offerResponseDeadline: dayIso(offerBy) } : {}) } } : {},
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
        return what === "pass" ? { head: "Logged.", msg: "It’s on your Responses page now.", undo, snack: { msg: `${t.first} passed`, sub: "it’s on your Responses page" } }
          : what === "offer" ? { head: "Congratulations!", msg: `Answering ${t.first}’s offer is at the top of your list.`, undo, snack: { msg: `${t.first} made an offer`, sub: `answering it is due ${fmt(offerBy)}` } }
          : { head: "Good news!", msg: `${t.first} wants to read more. Sending the full is now on your list.`, undo, snack: { msg: `${t.first} asked for your full manuscript`, sub: `sending it is due ${fmt(sendBy)}` } };
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
      timeline: why ? [{ at: on, what: <>The query moves to <b>Closed</b>, as {why === "withdraw" ? "withdrawn" : "no reply"}</>, art: "close" }] : [],
      verb: "Close it",
      draft: why ? { status, ghost: { id: "__ghost", type: status, resultingStatus: status, createdAt: new Date(on.getFullYear(), on.getMonth(), on.getDate(), 12).toISOString() }, future: { nudgeDate: undefined, closePlan: undefined } } : {},
      commit: async () => {
        const a = why === "withdraw"
          ? { why: "withdraw" as const, on, wd: "other" as const, told: true, remindTell: false, recheck: "no" as const, note: "" }
          : { ...noreplyAnswers(on), on };
        const undo = await snapshotted(ctx, [q.id], () => saveClose(ctx.db, q, t.agent ?? null, a, today));
        return { head: "Closed.", msg: `It’s on your Responses page now. If ${t.first} ever gets back to you, you can reopen it.`, undo,
          snack: { msg: `Closed your query to ${t.first}`, sub: "it’s on your Responses page" } };
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
      timeline: [
        { at: ctx.today, what: <>Saved to {t.first}’s card</>, art: "card" },
        ...moved.slice(0, 2).map((m) => ({ at: new Date(m.ms), what: <>Your query’s reply is now expected{moved.length > 1 ? ` (${m.title})` : ""}</>, art: "letter" as const })),
      ],
      draft: wk ? { agentPatch: { responseTimeWeeks: wk }, section: "how" } : { section: "how" },
      commit: async () => ({ head: `Saved to ${t.first}’s card.`, msg: moved.length === 1 ? `Your query’s reply is now expected by ${fmt(new Date(moved[0].ms))}.` : moved.length ? `Reply dates for ${moved.length} of your queries to ${t.first} have moved.` : `${t.first}’s card is a little more complete.`, undo: await save({ responseTimeWeeks: wk }),
        snack: { msg: `Saved to ${t.first}’s card`, sub: `replies in about ${wk} week${wk === 1 ? "" : "s"}` } }),
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
      timeline: [{ at: ctx.today, what: <>{t.first}’s wishlist is saved to their card</>, art: "card" }],
      draft: wish.trim() ? { agentPatch: { mswlNotes: wish.trim() }, section: "wishlist" } : { section: "wishlist" },
      commit: async () => ({ head: `Saved to ${t.first}’s card.`, msg: `${t.first}’s card is a little more complete.`, undo: await save({ mswlNotes: wish.trim() }),
        snack: { msg: `Saved to ${t.first}’s card`, sub: "their wishlist" } }),
    };
  }
  /* what they want sent: the agent card's own materials control does this (a sample has a unit and an amount) */
  return {
    questions: [], sentence: null, draft: { section: "send" }, commit: null,
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
    timeline: [{ at: ctx.today, what: <>What you sent is saved on your query to {t.first}</>, art: "card" }],
    after: (t.batch?.length ?? 0) > 1 ? `Then the next of ${t.batch!.length - 1} opens.` : undefined,
    draft: {},
    commit: async () => {
      const w = sweepWrites([row])[0];
      if (!w) throw new Error("Nothing ticked");
      const before = q.materialsWanted;
      await ctx.db.updateQuery(q.id, { materialsWanted: w.materialsWanted } as Partial<Query>);
      return {
        head: (t.batch?.length ?? 0) > 1 ? "Saved." : "All filled in.", msg: `Saved what you sent ${t.first}.`,
        snack: { msg: `Saved what you sent ${t.first}`, sub: andList(names.map((n) => n.toLowerCase())) },
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
    questions: [], sentence: null, draft: {}, commit: null,
    door: doors.openOther ? { label: "Open it ↗", open: doors.openOther } : undefined,
  };
}
