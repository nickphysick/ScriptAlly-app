/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card journeys v1, Phase 2 — MARK SENT (design-refs/card-journeys-v1 screens 01–11, 38). Agent · What went · Sent ·
 * Reply time · Log; every step is asked. Covers the three sends (lib/queryActions/sendKind `sendKindOf`): a partial, the
 * full (asked for, or an offer's "send the full"), and a resubmission after revise and resubmit.
 *
 * ⚠️ THE SAVE IS THE CARD'S OWN SEND (lib/qc152Write `planRecord` partial_sent / full_sent / resubmitted, with what went
 *    and the version) and the reply time exactly as Record a response writes it for a send: `writerExpectedDate` +
 *    `writerExpectedSetAt`, or the Unknown stamp (`writerExpectedUnknownWrite`) — the card then shows "No date yet" — and
 *    `nudgeDate`, cleared when no reminder is wanted.
 */
import React from "react";
import { QueryStatus, type Query } from "../../../types";
import { planRecord, matLabel, UNIT, type StepMaterial } from "../../../lib/qc152Write";
import { holdsPages } from "../../../lib/qc1522Write";
import { liveCount } from "../../../lib/dashBreakdown";
import { sendKindOf, type SentKind } from "../../../lib/queryActions/sendKind";
import { STAGE_RESPONSE_WINDOWS } from "../../../lib/queryAmbient";
import { writerExpectedUnknownWrite } from "../../../lib/expectedDate";
import { dayIso } from "../../../lib/queryActions/dates";
import { addDaysMs, dm, plural, sampleWords, w3dm, whenWord } from "../../../lib/queryActions/respondStages";
import type { Sample } from "../../../lib/queryActions/sample";
import { SampleControl } from "../../queryActions/controls";
import { ICON } from "./QcLogStages";
import type { CJCount, CJCtx, CJSpec } from "./QcCardJourney";

const REQ: readonly string[] = [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT];
const NOUN: Record<SentKind, { short: string; whole: string; word: string; head: string }> = {
  partial: { short: "partial", whole: "your partial", word: "Partial", head: "Your partial’s gone. Great work!" },
  full: { short: "full", whole: "your full", word: "Full", head: "Your full’s gone. Great work!" },
  rr: { short: "revision", whole: "your revision", word: "Revision", head: "Your revision’s gone. Great work!" },
};
const TARGET: Record<SentKind, QueryStatus> = { partial: QueryStatus.PARTIAL_SENT, full: QueryStatus.FULL_SENT, rr: QueryStatus.RESUBMITTED };

export interface SendState {
  k: SentKind;
  /** what was asked for (the request step's own materials, or the query's request fields) */
  asked: StepMaterial[];
  askMs: number;
  went: { main: boolean; syn: boolean; x: string[] };
  wentOk: boolean;
  wsamp: Sample;
  synId: string | null;
  verId: string | null;
  sentMs: number | null;
  wk: number;
  wkNone: boolean;
  replyOk: boolean;
  nudge: boolean;
}

const anyMs = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const t = typeof v === "object" && v && "toMillis" in (v as object) ? (v as { toMillis: () => number }).toMillis() : new Date(v as string).getTime();
  return Number.isFinite(t) ? t : null;
};
/** the request this send answers: its step on the feed, with what was asked */
function requestOf(c: CJCtx, k: SentKind): { mats: StepMaterial[]; ms: number } {
  const q = c.q;
  const row = [...c.log].reverse().find((x) => REQ.includes(String((x as { resultingStatus?: string }).resultingStatus ?? "")));
  const raw = (row as { materials?: unknown } | undefined)?.materials;
  const stored = Array.isArray(raw) ? raw.filter((x): x is StepMaterial => !!x && typeof x === "object" && "kind" in x) : [];
  const ms = anyMs(row?.date) ?? anyMs(q.dateSent) ?? c.nowMs;
  if (stored.length) return { mats: stored.map((m) => ({ ...m })), ms };
  if (k !== "partial") return { mats: [{ kind: "full" }], ms };
  const u = String(q.materialsRequestedType ?? "").toLowerCase(), n = Number(q.materialsRequestedQuantity);
  const unit = u === "pages" || u === "chapters" || u === "words" ? u : "pages";
  return { mats: [{ kind: "sample", unit, n: Number.isFinite(n) && n > 0 ? n : undefined }, ...(q.requestSynopsis ? [{ kind: "synopsis" as const }] : [])], ms };
}
const extrasOf = (mats: readonly StepMaterial[]) => mats.filter((m) => m.kind === "other").map((m) => (m.text ?? "").trim()).filter(Boolean);

/** what went, as materials on the send's step */
export function wentMats(s: SendState, synName: string | null): StepMaterial[] {
  const m: StepMaterial[] = [];
  if (s.went.main) m.push(s.k === "partial" ? { kind: "sample", unit: s.wsamp.unit === "words" ? "words" : s.wsamp.unit === "pages" ? "pages" : "chapters", n: s.wsamp.amt, versionId: s.verId } : { kind: "full", versionId: s.verId });
  if (s.went.syn) m.push({ kind: "synopsis", name: synName ?? undefined });
  for (const x of s.went.x) m.push({ kind: "other", text: x.slice(0, 80) });
  return m;
}
export function wentWords(s: SendState, synName: string | null): string[] {
  const l: string[] = [];
  if (s.went.main) l.push(s.k === "partial" ? sampleWords(s.wsamp) : s.k === "rr" ? "Revised manuscript" : "Full manuscript");
  if (s.went.syn) l.push(synName || "Synopsis");
  for (const x of s.went.x) l.push(x);
  return l;
}
const expectOf = (s: SendState): number | null => (s.wkNone || s.sentMs == null ? null : addDaysMs(s.sentMs, s.wk * 7));
const nudgeOf = (s: SendState): number | null => { const e = expectOf(s); return s.nudge && e != null ? e : null; };
const synNameOf = (s: SendState, c: CJCtx) => c.synopses.find((x) => x.id === s.synId)?.name ?? null;
const verNameOf = (s: SendState, c: CJCtx) => c.versions.find((x) => x.id === s.verId)?.name ?? null;

/** the counts on the review: existing functions only (lib/qc1522Write `holdsPages`, lib/dashBreakdown `liveCount`) */
function sendCounts(c: CJCtx, after: Query): CJCount[] {
  const was = c.book_queries;
  const now = was.map((x) => (x.id === after.id ? after : x));
  const pages = (l: readonly Query[]) => l.filter((x) => holdsPages(x.status)).length;
  return [
    { k: "pages", n: pages(now), d: pages(now) - pages(was), label: "with your pages" },
    { k: "active", n: liveCount(now), d: liveCount(now) - liveCount(was), label: "active queries" },
  ];
}

export const SEND_SPEC: CJSpec<SendState> = {
  kind: "send",
  init: (c) => {
    const k = sendKindOf(c.q);
    const r = requestOf(c, k);
    const samp = r.mats.find((m) => m.kind === "sample");
    /* the sample as asked: with no stored size, the unit's own default — the size "What {First} asked for" names (matLabel) */
    const unit = samp?.unit === "words" ? "words" : samp?.unit === "pages" ? "pages" : "chapters";
    const wsamp: Sample = { unit, amt: samp?.n ?? UNIT[samp?.unit ?? "chapters"].def, from: 1, sect: false, fu: null };
    const verId = c.versions.find((v) => v.current)?.id ?? c.versions[0]?.id ?? null;
    return {
      k, asked: r.mats, askMs: r.ms,
      went: { main: true, syn: r.mats.some((m) => m.kind === "synopsis"), x: extrasOf(r.mats) }, wentOk: false, wsamp,
      synId: c.synopses[0]?.id ?? null, verId,
      sentMs: null, wk: c.weeks && c.weeks >= 1 && c.weeks <= 26 ? c.weeks : (k === "partial" ? STAGE_RESPONSE_WINDOWS.partial : STAGE_RESPONSE_WINDOWS.full),
      wkNone: false, replyOk: false, nudge: true,
    };
  },
  stages: () => ["agent", "went", "sent", "reply", "log"],
  done: (s, k) => (k === "went" ? s.wentOk : k === "sent" ? s.sentMs != null : k === "reply" ? s.replyOk : false),
  value: (s, k, c) => {
    if (k === "went") return plural(wentWords(s, synNameOf(s, c)).length, "piece");
    if (k === "sent") return s.sentMs != null ? whenWord(s.sentMs, c.nowMs) : "";
    if (k === "reply") return s.wkNone ? "Unknown" : plural(s.wk, "week");
    return "";
  },
  head: (s) => [NOUN[s.k].head, "Let’s log the details."],
  tone: (s, c) => (s.wentOk ? TARGET[s.k] : c.q.status),
  body: (k, api) => {
    const { s, c, parts, set, answer } = api;
    const first = c.first;
    if (k === "went") {
      const ver = c.versions.length ? <>
        <div className="laq-gh laq-verh"><b>Which version is it from?</b></div>
        {parts.opts("ver", c.versions, s.verId, (id) => set({ verId: id }))}
      </> : null;
      const verName = verNameOf(s, c);
      const w = s.went;
      const mainTitle = s.k === "partial" ? "A sample" : s.k === "rr" ? "The revised manuscript" : "The full manuscript";
      const mainSub = w.main ? (s.k === "partial" ? `${sampleWords(s.wsamp)}${verName ? ` · ${verName}` : ""}` : verName) : (s.k === "partial" ? "Pages, chapters or words" : null);
      const sample = <div className="laq-qsamp" data-cj="sample-control"><SampleControl name="cj" sample={s.wsamp} book={c.book} onChange={(x) => set({ wsamp: x })} /></div>;
      const asked = s.asked.map((m) => matLabel(m));
      return (
        <>
          <h2 className="laq-qh" data-cj="q">What did you send {first}?</h2>
          <div className="laq-asks" data-cj="asked-card">
            <div className="laq-ah"><b>What {first} asked for</b><span>From this reply</span></div>
            <ul>{asked.map((t, i) => <li key={`${t}${i}`}><span className="laq-mk" aria-hidden="true" /><b>{t}</b></li>)}</ul>
            <p className="laq-af"><button type="button" className="laq-btn is-xs" data-cj="went-ask"
              onClick={() => answer({ went: { main: true, syn: s.asked.some((m) => m.kind === "synopsis"), x: extrasOf(s.asked) }, wentOk: true })}>I sent exactly that {ICON.arrow}</button></p>
          </div>
          <div className="laq-gen" data-cj="went">
            {parts.tile("main", w.main, mainTitle, mainSub, s.k === "partial" ? <>{sample}{ver}</> : ver, () => set({ went: { ...w, main: !w.main } }))}
            {parts.tile("syn", w.syn, "Synopsis", w.syn ? synNameOf(s, c) : null, c.synopses.length ? parts.opts("syn", c.synopses, s.synId, (id) => set({ synId: id })) : null, () => set({ went: { ...w, syn: !w.syn } }))}
            {extrasOf(s.asked).map((x) => parts.tile(`x:${x}`, w.x.includes(x), x, null, null, () => set({ went: { ...w, x: w.x.includes(x) ? w.x.filter((y) => y !== x) : [...w.x, x] } })))}
          </div>
        </>
      );
    }
    if (k === "sent") return (
      <>
        <h2 className="laq-qh" data-cj="q">When did it go to {first}?</h2>
        <p className="laq-qs" data-cj="sub">{first} asked on {dm(s.askMs)}.</p>
        {parts.dates({ data: "sent-at", cur: s.sentMs, minMs: s.askMs, onPick: (ms) => answer({ sentMs: ms }) })}
      </>
    );
    if (k === "reply") {
      const e = expectOf(s);
      return (
        <>
          <h2 className="laq-qh" data-cj="q">When might {first} reply?</h2>
          {parts.slider({ k: "wk", label: "Reply time", value: s.wk, none: s.wkNone, noneLabel: "Unknown",
            onChange: (n) => set({ wk: n, wkNone: false }), onNone: () => set({ wkNone: !s.wkNone }),
            note: e == null ? "No reply date, so there’s nothing to remind you about." : <>Reply expected by <b>{w3dm(e)}</b>.</> })}
          {e != null ? <div className="rar-sl">{parts.check({ data: "nudge", on: s.nudge, label: <>Remind me to nudge on {w3dm(e)}</>, onClick: () => set({ nudge: !s.nudge }) })}</div> : null}
        </>
      );
    }
    return null;
  },
  carry: (k, api) => {
    const { s, c, answer } = api;
    if (k === "went") return { ok: wentWords(s, synNameOf(s, c)).length > 0, run: () => answer({ wentOk: true }) };
    if (k === "reply") return { ok: true, run: () => answer({ replyOk: true }) };
    return null;
  },
  check: {
    title: () => "Ready to mark it sent?",
    button: "Mark sent",
    extras: (api) => {
      const { s, c, parts } = api;
      const verName = s.went.main ? verNameOf(s, c) : null;
      const nd = nudgeOf(s);
      return (
        <>
          <div className="rvw-h" data-cj="tiles-h"><b>What went</b><span>sent {s.sentMs != null ? whenWord(s.sentMs, c.nowMs).toLowerCase() : ""}{verName ? `, from ${verName}` : ""}</span></div>
          {parts.tiles(wentWords(s, synNameOf(s, c)))}
          {nd != null ? parts.todo(`Nudge ${c.first} if there’s no reply`, w3dm(nd), "nudge") : null}
        </>
      );
    },
  },
  finish: (s, c) => {
    const n = NOUN[s.k], e = expectOf(s), nd = nudgeOf(s);
    const line: [string, string | null, string] = nd != null ? ["We’ll remind you to nudge on ", w3dm(nd), "."]
      : e != null ? ["A reply is expected by ", w3dm(e), "."] : ["There’s no reply date yet.", null, ""];
    return { head: [`Logged. ${n.word} sent!`, `Over to ${c.first}.`], slot: `celebration · ${n.short} sent`, big: `Your ${n.short} is with ${c.first}.`, line, stamp: "Logged", stampMs: s.sentMs ?? c.nowMs };
  },
  write: {
    plans: (pc, s, c) => {
      const kind = s.k === "partial" ? "partial_sent" : s.k === "full" ? "full_sent" : "resubmitted";
      const plan = planRecord(pc, kind, s.sentMs ?? pc.nowMs, wentMats(s, synNameOf(s, c)));
      const e = expectOf(s), nd = nudgeOf(s);
      if (e != null) { plan.query.writerExpectedDate = dayIso(new Date(e)); plan.query.writerExpectedSetAt = new Date(pc.nowMs).toISOString(); }
      else Object.assign(plan.query, writerExpectedUnknownWrite(new Date(pc.nowMs)));
      plan.query.nudgeDate = nd != null ? dayIso(new Date(nd)) : undefined;
      return [plan];
    },
    counts: (c, after) => sendCounts(c, after),
  },
};
