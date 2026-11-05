/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §3 (screens 08–11, 13) — RECORDING WHAT HAPPENED. The reply box's button opens this short form on
 * the card: the step (pre-chosen from the button, every option behind "Something else happened instead"), the day on
 * the app's own calendar, what went or was asked for, then "See what changes →" and Save.
 *
 * ⚠️ NOTHING WRITES UNTIL SAVE, and Save is the page's one batched writer (lib/qc152Write) through `onSave`.
 * ⚠️ AN OPTION THAT WOULD BREAK THE ORDER IS DISABLED WITH ITS REASON (lib/qcLogic152, §4.3); a day before the latest
 *    step is greyed and the form points to Fix a mistake instead.
 */
import React, { useContext, useMemo, useState } from "react";
import { StatusDot } from "../../StatusDot";
import type { QueryStatus } from "../../../types";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { STATE_LABEL, type QueryState } from "../../../lib/queryState";
import { RECORD_STATUS, matLabel, type RecordKind, type StepMaterial } from "../../../lib/qc152Write";
import { dayBlocked, knock, type LogStep, type StepType } from "../../../lib/qcLogic152";
import { dayLabel, discFill, sideOf, stepTitle } from "../../../lib/qcThread152";
import { CalendarField, MatChips, PopCtx, type MatEnv } from "./QcEdit152";
import "./qcv152edit.css";

const DAY = 86_400_000;
export const KIND_STEP: Record<RecordKind, StepType> = {
  partial_req: "preq", full_req: "freq", offer: "offer", pass: "passed", partial_sent: "psent", full_sent: "fsent", nudge: "nudge", noresp: "noresp",
};
export const KIND_TITLE: Partial<Record<RecordKind, string>> = { partial_sent: "Mark partial sent", full_sent: "Mark full sent", nudge: "Log a nudge", noresp: "Close it" };
const NUDGE = <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="#1c130f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M7 12.5h6l-.9-1.2V9a2.1 2.1 0 0 0-4.2 0v2.3zM9.2 14h1.6" /></svg>;
const glyph = (k: RecordKind) => (k === "nudge" ? NUDGE : <StatusDot status={RECORD_STATUS[k]!} overrideSize={19} decorative />);
const statusOf = (k: RecordKind) => ({ status: RECORD_STATUS[k], kind: k === "nudge" ? ("nudge" as const) : null });

export interface RecordOutcome { status: QueryStatus | string; state: QueryState; replyMs: number | null; dueMs: number | null; dueWho: "you" | "agent" | null }
export interface QcRecord152Props {
  first: string;
  nowMs: number;
  initials: string;
  /** the log as it stands, for the checks */
  log: LogStep[];
  /** the latest step, for the preview */
  last: { status: QueryStatus | null; kind: "nudge" | "holding" | null; ms: number | null; chips: string[] } | null;
  /** the button that opened it: a step (`Mark full sent`…), "resp" (Record a response: who replied), or null (every
   *  option: "Something changed since", from the pencil) */
  initial: RecordKind | "resp" | null;
  /** what each kind starts with: a send, what the request asked for; a request, the usual ask */
  prefill: (k: RecordKind) => StepMaterial[];
  /** when the request was made (the lede), for a send */
  askedMs: number | null;
  env: MatEnv;
  /** where it stands now, and after a step of this kind on this day */
  now: RecordOutcome;
  after: (k: RecordKind, dayMs: number) => RecordOutcome;
  onCancel: () => void;
  onSave: (k: RecordKind, dayMs: number, mats: StepMaterial[]) => Promise<boolean>;
  busy: boolean;
}

const OPTS: { head: string; side: "them" | "me"; kinds: RecordKind[] }[] = [
  { head: "Who replied", side: "them", kinds: ["partial_req", "full_req", "offer", "pass"] },
  { head: "What you did", side: "me", kinds: ["partial_sent", "full_sent", "nudge", "noresp"] },
];
const optLabel = (k: RecordKind, f: string) => ({
  partial_req: `${f} asked for a partial`, full_req: `${f} asked for the full`, offer: `${f} made an offer`, pass: `${f} passed`,
  partial_sent: "You sent the partial", full_sent: "You sent the full", nudge: `You nudged ${f}`, noresp: "You closed it: no response",
}[k]);

export const QcRecord152: React.FC<QcRecord152Props> = (p) => {
  const api = useContext(PopCtx);
  const today = (() => { const d = new Date(p.nowMs); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const [stage, setStage] = useState<"what" | "changes">("what");
  const [all, setAll] = useState(p.initial == null);
  const [kind, setKind] = useState<RecordKind | null>(p.initial === "resp" ? null : p.initial);
  const respOnly = p.initial === "resp" && !all;
  const [day, setDay] = useState(today);
  const [mats, setMats] = useState<StepMaterial[]>(() => (p.initial && p.initial !== "resp" ? p.prefill(p.initial) : []));
  const floor = p.log.length ? Math.max(...p.log.map((x) => x.d)) : null;
  const c = { nowMs: p.nowMs, first: p.first };
  const why = (k: RecordKind, d = day): string => {
    if (floor != null && d < new Date(floor).setHours(0, 0, 0, 0)) return `That’s before the latest step (${dayLabel(floor, p.nowMs)}). To add a step you missed, use Fix a mistake.`;
    return knock(p.log, [...p.log, { id: "__new", t: KIND_STEP[k], d: d + 12 * 3600_000 }], "__new", c);
  };
  const reasons = useMemo(() => Object.fromEntries((OPTS.flatMap((o) => o.kinds)).map((k) => [k, why(k)])) as Record<RecordKind, string>, [day, p.log]); // eslint-disable-line react-hooks/exhaustive-deps
  const blocked = (d: number) => dayBlocked(d, { nowMs: p.nowMs, floorMs: floor, check: kind ? (x) => (why(kind, x) ? "Out of order" : "") : undefined });
  const curWhy = kind ? reasons[kind] : "";
  const pick = (k: RecordKind) => { setKind(k); setMats(p.prefill(k)); api.setOpen(null); };
  const title = p.initial === "resp" ? "Record a response" : all || !kind ? "Something changed since" : KIND_TITLE[kind] ?? "Record a response";
  const sendKind = kind === "partial_sent" || kind === "full_sent";
  const request = kind === "partial_req" || kind === "full_req";
  const gap = p.last?.ms != null ? Math.max(0, Math.round((day - new Date(p.last.ms).setHours(0, 0, 0, 0)) / DAY)) : null;

  /* §3.1 the preview: the latest step (faded), the days since, and the draft on its own side */
  const preview = (
    <div className="qc152-th qc152-jprev" data-qc152="preview">
      {p.last ? (
        <div className={`qc152-m ${sideOf(p.last)} ctx`}>
          {sideOf(p.last) === "them" ? <span className="qc152-av" aria-hidden="true">{p.initials}</span> : null}
          <div className="qc152-bx"><span className="qc152-gd" style={{ background: discFill(p.last) }}>{p.last.kind === "nudge" ? NUDGE : p.last.status ? <StatusDot status={p.last.status} overrideSize={19} decorative /> : null}</span>
            <div className="qc152-qx"><div className="qc152-r1"><b>{stepTitle(p.last, p.first)}</b><span className="qc152-dt">{p.last.ms != null ? dayLabel(p.last.ms, p.nowMs) : ""}</span></div>
              {p.last.chips.length ? <div className="qc152-r2"><span className="qc152-chs">{p.last.chips.map((x) => <span key={x} className="qc152-ch">{x}</span>)}</span></div> : null}</div></div>
        </div>
      ) : null}
      <div className="qc152-w" data-edge={kind ? "now" : undefined}><i /><span data-qc152="preview-gap">{kind ? (gap ? `${gap} days later` : "Same day") : "What happened next?"}</span><i /></div>
      {kind ? (
        <div className={`qc152-m ${sideOf(statusOf(kind))} draft`} data-qc152="draft" data-side={sideOf(statusOf(kind))}>
          {sideOf(statusOf(kind)) === "them" ? <span className="qc152-av" aria-hidden="true">{p.initials}</span> : null}
          <div className="qc152-bx"><span className="qc152-gd" style={{ background: discFill(statusOf(kind)) }}>{glyph(kind)}</span>
            <div className="qc152-qx"><div className="qc152-r1"><b data-qc152="draft-title">{stepTitle(statusOf(kind), p.first)}</b><span className="qc152-dt" data-qc152="draft-date">{dayLabel(day, p.nowMs)}</span></div>
              {mats.length ? <div className="qc152-r2"><span className="qc152-chs" data-qc152="draft-chips">{mats.map((m, i) => <span key={i} className="qc152-ch">{matText(m, p.env)}</span>)}</span></div> : null}</div></div>
        </div>
      ) : (
        <div className="qc152-m me draft empty"><div className="qc152-bx"><div className="qc152-qx"><b>Pick what happened below</b></div></div></div>
      )}
    </div>
  );

  const option = (k: RecordKind, side: "them" | "me") => {
    const w = reasons[k];
    return (
      <button key={k} type="button" role="radio" aria-checked={kind === k} className={`qc152-opt ${side}${kind === k ? " on" : ""}${w ? " dis" : ""}`}
        data-qc152="opt" data-k={k} disabled={!!w && kind !== k} onClick={() => pick(k)}>
        <span className="qc152-gd sm" style={{ background: discFill(statusOf(k)) }}>{glyph(k)}</span>
        <span><b>{optLabel(k, p.first)}</b>{w ? <em data-qc152="opt-why">{w}</em> : null}</span>
      </button>
    );
  };

  if (stage === "changes" && kind) {
    const a = p.after(kind, day);
    const lines: string[] = [];
    if (String(a.status) !== String(p.now.status)) lines.push(`Where it stands changes from **${STAGE_NAME[p.now.status as QueryStatus] ?? p.now.status}** to **${STAGE_NAME[a.status as QueryStatus] ?? a.status}**.`);
    if (a.state !== p.now.state) lines.push(`It moves from **${STATE_LABEL[p.now.state]}** to **${STATE_LABEL[a.state]}**${a.dueWho === "you" ? ", so it’s your move" : ""}.`);
    else lines.push(`It stays **${STATE_LABEL[a.state]}**.`);
    const was = p.now.dueWho === "you" && p.now.dueMs != null ? `you were due to act by ${dayLabel(p.now.dueMs, p.nowMs)}` : p.now.replyMs != null && p.now.dueWho === "agent" ? `${p.first}’s reply was expected by ${dayLabel(p.now.replyMs, p.nowMs)}` : null;
    const will = a.dueWho === "agent" && a.replyMs != null ? `${p.first}’s reply is expected by **${dayLabel(a.replyMs, p.nowMs)}**` : a.dueWho === "you" && a.dueMs != null ? `you’re due to act by **${dayLabel(a.dueMs, p.nowMs)}**` : null;
    if (will) lines.push(was ? `Before, ${was}. Now ${will}.` : `Now ${will}.`);
    if (lines.length === 1) lines.push("Nothing else on the page moves.");
    return (
      <div className="qc152-act" data-qc152="record" data-stage="changes">
        <div className="qc152-acth">
          <button type="button" className="qc152-back" data-qc152="back" onClick={() => setStage("what")}>← Back to what happened</button>
          <h2 className="qc152-h2">{title}</h2>
          <Stepper on={2} />
        </div>
        <div className="qc152-actb">
          <div className="qc152-diff">
            <h4>You’re adding</h4>
            <div className="qc152-dr" data-qc152="adding"><span className="qc152-gd sm">{glyph(kind)}</span><span><b>{stepTitle(statusOf(kind), p.first)}</b></span><span className="qc152-now">{dayLabel(day, p.nowMs)}</span></div>
            <h4>Which means</h4>
            <ul className="qc152-cons" data-qc152="consequences">{lines.map((l, i) => <li key={i}>{bolded(l)}</li>)}</ul>
            <p className="qc152-safe">This adds a step to the timeline. You can undo it straight after saving.</p>
          </div>
        </div>
        <div className="qc152-ftA">
          <button type="button" className="qc152-ghost" data-qc152="back2" onClick={() => setStage("what")}>Back</button>
          <button type="button" className="qc152-pbtn" data-qc152="save" disabled={p.busy} onClick={() => { void p.onSave(kind, day, mats); }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="qc152-act" data-qc152="record" data-stage="what" data-kind={kind ?? undefined}>
      <div className="qc152-acth">
        <button type="button" className="qc152-back" data-qc152="back" onClick={p.onCancel}>← Back to {p.first}’s query</button>
        <h2 className="qc152-h2" data-qc152="record-title">{title}</h2>
        <Stepper on={1} />
      </div>
      <div className="qc152-actb">
        {!all && kind && !respOnly ? <p className="qc152-lede">{sendKind && p.askedMs != null ? `${p.first} asked on ${dayLabel(p.askedMs, p.nowMs)}. Check what you’re sending and when, then save.` : "Check the details, then save."}</p> : null}
        {preview}
        <div className="qc152-jr">
          {all || respOnly ? OPTS.filter((o) => all || o.side === "them").map((o) => (
            <div key={o.head} className={`qc152-og ${o.side}`} data-qc152="opt-group" data-side={o.side}>
              <h4>{o.head}</h4>
              {o.kinds.map((k) => option(k, o.side))}
            </div>
          )) : kind ? <div className={`qc152-og ${sideOf(statusOf(kind))} one`}>{option(kind, sideOf(statusOf(kind)))}</div> : null}
          {!all ? <button type="button" className="qc152-jalt" data-qc152="something-else" onClick={() => setAll(true)}>Something else happened instead</button> : null}
          <div className="qc152-jf">
            <div className="qc152-jrow"><span>When</span>
              <CalendarField id="rec" valueMs={day} nowMs={p.nowMs} blocked={blocked} onChange={setDay} /></div>
            {kind && (mats.length || sendKind || request || kind === "offer") ? (
              <div className="qc152-jm"><span>{sendKind ? "What you’re sending" : "What went or was asked for"}</span>
                <MatChips id="rec" mats={mats} onChange={setMats} env={p.env} stepMs={day} request={request} /></div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="qc152-ftA">
        <button type="button" className="qc152-ghost" data-qc152="cancel" onClick={p.onCancel}>Cancel</button>
        {curWhy ? <span className="qc152-gerr" data-qc152="record-why">{curWhy}</span> : null}
        <button type="button" className="qc152-pbtn" data-qc152="see-changes" disabled={!kind || !!curWhy} onClick={() => { api.setOpen(null); setStage("changes"); }}>See what changes →</button>
      </div>
    </div>
  );
};

export const Stepper: React.FC<{ on: 1 | 2; first?: string }> = ({ on, first = "What happened" }) => (
  <div className="qc152-stepper" data-qc152="stepper">
    <span className={on === 1 ? "on" : "done"}><b>{on === 1 ? 1 : "✓"}</b>{first}</span><i />
    <span className={on === 2 ? "on" : ""}><b>2</b>What changes</span>
  </div>
);
/** "**bold**" runs in a consequence line */
export const bolded = (s: string): React.ReactNode => s.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 ? <b key={i}>{t}</b> : <React.Fragment key={i}>{t}</React.Fragment>));
const matText = (m: StepMaterial, env: MatEnv) =>
  matLabel(m, { free: env.free, versionName: (id) => env.versions.find((x) => x.id === id)?.name ?? null, originalId: env.versions[0]?.id ?? null });
