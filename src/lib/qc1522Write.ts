/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152.2 §2–§7 — THE COMPOSER'S PLANS. Each composer payload becomes one or more `WritePlan`s on the page's
 * one batched writer (lib/qc152Write `planRecord` / `planFix` / `commitPlan` / `commitMany`), so a save is one batch and
 * one snapshot, and Undo restores the query (and every other query it touched) exactly.
 *
 * ⚠️ THE TELL-LATER FLAG IS ON THE OFFER STEP (Nick, 6 Nov): `tellLater: true` on the offer's step, in both stores. The
 *    count of agents still to tell is never stored: it is the other queries marked `offerRefQueryId` = the offer with
 *    `offerTold === false`. The To-do card (lib/db `offer_tell_all`) reads both, and completes itself at 0.
 */
import { ActivityType, QueryStatus, type Agent, type Query } from "../types";
import { Timestamp, deleteField, type DocumentData } from "firebase/firestore";
import { getActivityTime } from "./queryDerivation";
import type { RawActivityDoc } from "./recomputeFields";
import { dayIso } from "./queryActions/dates";
import { planFix, planRecord, stepTime, withRecompute, type FixStep, type PlanCtx, type RecordKind, type StepMaterial, type WritePlan } from "./qc152Write";

const DAY = 86_400_000;

/** the latest step of a status in the nested log, and its feed twin */
export function latestStep(existing: readonly RawActivityDoc[], feed: readonly RawActivityDoc[], st: QueryStatus): { id: string; twin: string | null } | null {
  const s = [...existing].filter((x) => x.data.resultingStatus === st || x.data.type === st)
    .sort((a, b) => getActivityTime(a.data.createdAt) - getActivityTime(b.data.createdAt)).pop();
  if (!s) return null;
  const tw = feed.find((f) => f.id === s.id) ?? feed.find((f) => f.data.logEntryId === s.id) ?? null;
  return { id: s.id, twin: tw?.id ?? null };
}
/** the offer step's tell-later flag, on both stores */
export function tellLaterUpdates(qid: string, offer: { id: string; twin: string | null } | null, on: boolean): NonNullable<WritePlan["update"]> {
  if (!offer) return [];
  const v = on ? true : deleteField();
  return [{ path: `queries/${qid}/activity/${offer.id}`, data: { tellLater: v } }, ...(offer.twin ? [{ path: `activities/${offer.twin}`, data: { tellLater: v } }] : [])];
}

/* ── §5 What did they say? ─────────────────────────────────────────────────────────────────────────────────── */

export type ReplyRt = "req" | "passed" | "rr" | "offer" | "more";
export interface ReplyIn {
  dayMs: number; rt: ReplyRt; queryOnly: boolean;
  deadlineMs: number | null; formNo: boolean; openToMore: boolean; wall: boolean;
  resubmitByMs: number | null; answerByMs: number | null; what: string; words: string;
}
export function planReply(c: PlanCtx, r: ReplyIn): WritePlan {
  const kind: RecordKind = r.rt === "req" ? (r.queryOnly ? "partial_req" : "full_req") : r.rt === "passed" ? "pass" : r.rt === "rr" ? "rr_req" : r.rt === "offer" ? "offer" : "partial_req";
  const iso = (ms: number | null) => (ms != null ? dayIso(new Date(ms)) : "");
  const resp = r.rt === "req" ? (r.deadlineMs != null ? { expectedBy: iso(r.deadlineMs) } : {})
    : r.rt === "rr" ? (r.resubmitByMs != null ? { expectedBy: iso(r.resubmitByMs) } : {})
    : r.rt === "offer" ? { offerDeadline: iso(r.answerByMs) }
    : r.rt === "passed" ? { feedbackType: r.formNo ? "Form" : "Yes" }
    : { materialsType: "Other" as const, materialsOtherText: r.what };
  const step = r.rt === "passed" ? { openToMore: r.openToMore || undefined, offWall: r.wall ? undefined : true }
    : r.rt === "more" ? { askedFor: r.what.slice(0, 80) } : {};
  const mats: StepMaterial[] = r.rt === "req" && !r.queryOnly ? [{ kind: "full" }] : r.rt === "rr" ? [{ kind: "full" }] : [];
  return planRecord(c, kind, r.dayMs, mats, { replyNote: r.words, resp: resp as never, step });
}

/* ── §6.1 the offer ──────────────────────────────────────────────────────────────────────────────────────────── */

export interface OtherQ { id: string; told: boolean; offerReply?: string | null; holdsPages: boolean }
/**
 * Telling the other agents. Every other open query is marked with the offer (`offerRefQueryId`); each one ticked is
 * `offerTold: true` (with the day), each left is `offerTold: false`. Newly ticked ones add one "You told N agents" step.
 * "Do it later" also flags the offer step, so its To-do card appears.
 */
export function planTell(c: PlanCtx & { feed: RawActivityDoc[] }, others: readonly OtherQ[], told: Record<string, boolean>, later: boolean, deadlineMs: number | null): WritePlan {
  const now = c.nowMs;
  const newly = others.filter((o) => told[o.id] && !o.told);
  const base: WritePlan = newly.length
    ? planRecord(c, "told", now, [], { told: { count: newly.length, deadlineMs: deadlineMs ?? now + 7 * DAY, others: newly.map((o) => ({ id: o.id, offerReply: o.offerReply ?? null })) } })
    : { queryId: c.q.id, set: [], del: [], query: {} };
  const marked = new Set(newly.map((o) => o.id));
  const update: NonNullable<WritePlan["update"]> = [...(base.update ?? [])];
  for (const o of others) {
    if (marked.has(o.id)) continue;
    if (told[o.id] && o.told) continue;
    update.push({ path: `queries/${o.id}`, data: { offerRefQueryId: c.q.id, offerTold: !!told[o.id] } });
  }
  const left = others.filter((o) => !told[o.id]).length;
  update.push(...tellLaterUpdates(c.q.id, latestStep(c.existing, c.feed, QueryStatus.OFFER), later && left > 0));
  return { ...base, update };
}

/** Accepting: the offer's Signed step (both stores), recomputed; the to-do flag on the offer step when it is wanted */
export function planSigned(c: PlanCtx & { feed: RawActivityDoc[] }, todo: boolean, holders: readonly string[]): WritePlan {
  const id = `act-${Math.random().toString(36).slice(2, 11)}`;
  const tMs = stepTime(c.nowMs, c.existing);
  const who = c.agent?.name || c.agent?.agency || "the agent";
  const note = `Offer accepted — ${who} now represents this manuscript`;
  const sub: DocumentData = { type: QueryStatus.SIGNED, resultingStatus: QueryStatus.SIGNED, createdAt: Timestamp.fromMillis(tMs), note, queryId: c.q.id,
    agentName: c.agent?.name || c.agent?.agency || "", manuscriptTitle: c.ms?.title ?? "", eventKey: "signed" };
  const feed: DocumentData = { id, userId: c.uid, queryId: c.q.id, manuscriptId: c.q.manuscriptId || "", activityType: ActivityType.OFFER_ACCEPTED, description: note,
    date: new Date(tMs).toISOString(), details: "", resultingStatus: QueryStatus.SIGNED, eventKey: "signed", logEntryId: id };
  const update: NonNullable<WritePlan["update"]> = [];
  if (todo && holders.length) {
    for (const h of holders) update.push({ path: `queries/${h}`, data: { offerRefQueryId: c.q.id, offerTold: false } });
    update.push(...tellLaterUpdates(c.q.id, latestStep(c.existing, c.feed, QueryStatus.OFFER), true));
  }
  const plan: WritePlan = { queryId: c.q.id, set: [{ path: `queries/${c.q.id}/activity/${id}`, data: sub }, { path: `activities/${id}`, data: feed }], del: [], query: {},
    ...(update.length ? { update } : {}) };
  return withRecompute(plan, c.existing);
}

/* ── §7 reopen: the pass recorded by mistake ─────────────────────────────────────────────────────────────────── */

/** the pass comes off; nothing new goes on the thread; the reply date restarts from today (`replyRestartedOn`) */
export function planUnpass(c: PlanCtx & { feed: RawActivityDoc[] }, passId: string): WritePlan {
  const p = planFix(c, [], [passId], null);
  return { ...p, query: { ...p.query, replyRestartedOn: dayIso(new Date(c.nowMs)) } };
}

/* ── §2.4 / §2.6 a step edited in place, or its materials ────────────────────────────────────────────────────── */

export function planStepEdit(c: PlanCtx & { feed: RawActivityDoc[] }, step: FixStep, words: string | null): WritePlan {
  const p = planFix(c, [step], [], null);
  if (words == null) return p;
  /* the agent's words ride on the step itself (v152.1 §2.6 `replyNote`), never the old per-query fields */
  const path = `queries/${c.q.id}/activity/${step.id}`;
  const cur = c.existing.find((x) => x.id === step.id);
  if (!cur) return p;
  const was = typeof cur.data.replyNote === "string" ? cur.data.replyNote : "";
  if (was === words) return p;
  const i = p.set.findIndex((s) => s.path === path);
  const data: DocumentData = { ...(i >= 0 ? p.set[i].data : cur.data) };
  if (words) data.replyNote = words.slice(0, 500); else delete data.replyNote;
  const set = i >= 0 ? p.set.map((s, k) => (k === i ? { path, data } : s)) : [...p.set, { path, data }];
  return { ...p, set };
}

/** the agent and how it went (§2.5); the package, as v152.1's Fix did */
export function planDetails1522(q: Query, next: { agentId: string; method: string; pkg: { id: string; name: string; edition: number } | null; pkgChanged: boolean }): WritePlan {
  const query: Record<string, unknown> = {};
  if (next.agentId && next.agentId !== q.agentId) query.agentId = next.agentId;
  if (next.method !== (q.sendMethod ?? "")) query.sendMethod = next.method;
  if (next.pkgChanged) {
    if (next.pkg) Object.assign(query, { sentHow: "package", sentPackageId: next.pkg.id, packageId: next.pkg.id, sentPackageEdition: next.pkg.edition, sentPackageName: next.pkg.name });
    else Object.assign(query, { sentHow: "individual", sentPackageId: undefined, packageId: "", sentPackageEdition: undefined, sentPackageName: undefined });
  }
  return { queryId: q.id, set: [], del: [], query };
}

/** the other open queries for the offer's manuscript: with your pages first, then your query */
export function holdsPages(status: QueryStatus | string): boolean {
  return [QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED].includes(status as QueryStatus);
}
