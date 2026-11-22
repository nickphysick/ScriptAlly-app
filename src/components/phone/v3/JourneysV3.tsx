/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — THE + SHEET AND ITS TWO JOURNEYS (ref `oPlus`, `flowShell`, `oLog`, `oReply`, `oCele`).
 *
 * ⚠️ NO NEW WRITER. "I sent a query" saves through the log journey's own writer (`saveLog`, lib/queryActions/logSave);
 *    "An agent replied" through the query card's quick reply (`saveResponse` with `respondDefaults`, the plan the card's
 *    C3 form saves). Both go through `recomputeQuery` inside those writers. A changed reply time offered to the agent's
 *    card saves through the card's own writer (`commitCardSave`). Undo restores the drawer's own snapshot.
 * ⚠️ THE OPENING SAMPLE IS THE APP'S `SampleSpecPicker` in "sent" mode, over the agent's own asks
 *    (`materialRowsFromAgent`); the start point is the log writer's own `sect`/`from`. No fixed list of sizes.
 * ⚠️ RESPONSE TIME IS THE ADD-AGENT JOURNEY'S SLIDER (`ResponseTime` → `WeekSlider`, 1 week to 6 months).
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { type MaterialRow } from "../../../lib/agentMaterials";
import { offerOthers, respondDefaults, saveResponse, type RespType } from "../../../lib/queryActions/respondSave";
import { isLive } from "../../queryActions/journeys/common";
import { takeSnapshot, restoreSnapshot } from "../../../lib/queryActions/snapshot";
import { dayMonth } from "../../../lib/dates";
import { QueryStatus, type Query } from "../../../types";
import type { Sample, SampleUnit } from "../../../lib/queryActions/sample";
import { defFromUnit } from "../../../lib/queryActions/sample";
import { V3Glyph, HAWK_SRC } from "./V3Parts";
import { V3I } from "./v3Icons";
import { closeV3, openV3, showV3Snack, type V3Overlay } from "./v3Store";
import { useV3Data } from "./V3Provider";

const DAY = 86_400_000;
const firstOf = (n: string) => (n || "").trim().split(/\s+/)[0] || "the agent";
const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
export const today = () => noon(new Date());
export const addDays = (d: Date, n: number) => noon(new Date(d.getTime() + n * DAY));

/* ── the journeys' shell (ref `flowShell`) ── */
export const FlowShellV3: React.FC<{
  title: string; n: number; step: number; sofar: [number, string][]; onJump: (s: number) => void; onBack: () => void;
  btn: string; ok: boolean; onNext: () => void; extra?: React.ReactNode; children: React.ReactNode; busy?: boolean; pa3: string;
}> = ({ title, n, step, sofar, onJump, onBack, btn, ok, onNext, extra, children, busy, pa3 }) => (
  <div className="pa3-full" role="dialog" aria-modal="true" aria-label={title} data-pa3={pa3} data-step={step}>
    <div className="pa3-top">
      <div className="pa3-bar">
        <button type="button" className="pa3-ib" aria-label={step ? "Back" : "Close"} data-pa3="fback" onClick={step ? onBack : closeV3}><V3I n={step ? "back" : "x"} /></button>
        <span>{title}</span>
        <button type="button" className="pa3-ib" aria-label="Close" data-pa3="fclose" onClick={closeV3} style={{ visibility: step ? "visible" : "hidden" }}><V3I n="x" /></button>
      </div>
      <div className="pa3-prog" data-pa3="prog">{Array.from({ length: n }, (_, k) => <i key={k} className={k <= step ? "on" : ""} />)}</div>
      {sofar.length ? <div className="pa3-sofar" data-pa3="sofar">{sofar.map(([s, t]) => <button key={s} type="button" data-s={s} onClick={() => onJump(s)}>{t}</button>)}</div> : null}
    </div>
    <div className="pa3-body">{children}</div>
    <div className="pa3-foot">
      <button type="button" className="pa3-btn" data-pa3="fnext" disabled={!ok || busy} onClick={onNext}>{btn}</button>
      {extra}
    </div>
  </div>
);

export const Opt: React.FC<{ on: boolean; onClick: () => void; t: React.ReactNode; s?: React.ReactNode; g?: React.ReactNode; sq?: boolean; pa3?: string; data?: Record<string, string> }> = ({ on, onClick, t, s, g, sq, pa3, data }) => (
  <button type="button" className={`pa3-opt${sq ? " sq" : ""}${on ? " on" : ""}`} aria-pressed={on} data-pa3={pa3 ?? "opt"} {...data} onClick={onClick}>
    {g}<span className="pa3-tx">{t}{s ? <small>{s}</small> : null}</span><span className="pa3-ck"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
  </button>
);

export type When = "today" | "yest" | "pick";
export const WhenOpts: React.FC<{ when: When; date: string; setWhen: (w: When) => void; setDate: (d: string) => void }> = ({ when, date, setWhen, setDate }) => {
  const t = today();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (<>
    <Opt on={when === "today"} onClick={() => setWhen("today")} t="Today" s={dayMonth(t)} data={{ "data-k": "today" }} />
    <Opt on={when === "yest"} onClick={() => setWhen("yest")} t="Yesterday" data={{ "data-k": "yest" }} />
    <Opt on={when === "pick"} onClick={() => setWhen("pick")} t="Another day" data={{ "data-k": "pick" }} />
    {when === "pick" ? <label className="pa3-field"><input type="date" data-pa3="fdate" value={date || iso(t)} max={iso(t)} aria-label="Date" onChange={(e) => setDate(e.target.value)} /></label> : null}
  </>);
};
export const whenDate = (when: When, date: string): Date => {
  if (when === "today") return today();
  if (when === "yest") return addDays(today(), -1);
  const [y, m, d] = (date || "").split("-").map(Number);
  return y ? new Date(y, m - 1, d, 12) : today();
};

/* ── the materials the log records, from the picker's rows ── */
const UNIT_OF: Record<string, SampleUnit> = { Chapters: "chapters", Pages: "pages", Words: "words" };
export function sampleFromRows(rows: readonly MaterialRow[], from: { sect: boolean; at: string }): Sample {
  const r = rows.find((x) => x.kind === "qty" && x.on) as Extract<MaterialRow, { kind: "qty" }> | undefined;
  if (!r) return { unit: "none", amt: 0, from: 1, sect: false, fu: null };
  const unit = UNIT_OF[r.unit] ?? "chapters";
  const amt = parseInt(String(r.amount).replace(/[^\d]/g, ""), 10);
  const at = parseInt(from.at.replace(/[^\d]/g, ""), 10);
  const sect = from.sect && Number.isFinite(at) && at > 1;
  return { unit, amt: Number.isFinite(amt) && amt > 0 ? amt : 1, from: sect ? at : 1, sect, fu: sect ? defFromUnit(unit) : null };
}
export const sampleWords = (s: Sample): string => {
  if (s.unit === "none") return "";
  const u = s.amt === 1 ? s.unit.replace(/s$/, "") : s.unit;
  return s.sect ? `${s.amt.toLocaleString("en-GB")} ${u} from ${s.fu ?? "chapter"} ${s.from}` : `First ${s.amt.toLocaleString("en-GB")} ${u}`;
};

/* ── An agent replied (ref `oReply`) ── */
const OUTCOMES: [RespType, string, string, QueryStatus][] = [
  ["partial", "Asked for a partial", "They want to read more", QueryStatus.PARTIAL_REQUESTED],
  ["full", "Asked for the full manuscript", "", QueryStatus.FULL_REQUESTED],
  ["offer", "Offered representation", "", QueryStatus.OFFER],
  ["rr", "Asked for a revision", "Revise and resubmit", QueryStatus.REVISE_RESUBMIT],
  ["pass", "Passed", "A no, with or without notes", QueryStatus.REJECTED],
];

export const ReplyFlowV3: React.FC<{ queryId?: string }> = ({ queryId }) => {
  const db = useScriptAllyDb();
  const v = useV3Data();
  const { agents, queries, manuscripts, currentUser } = db;
  const [step, setStep] = useState(queryId ? 1 : 0);
  const [term, setTerm] = useState("");
  const [qid, setQid] = useState<string | null>(queryId ?? null);
  const [out, setOut] = useState<RespType | null>(null);
  const [when, setWhen] = useState<When>("today");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [cele, setCele] = useState<{ h: string; p: string; qid: string; undo: () => Promise<void>; msg: string } | null>(null);
  const vq = qid ? v.byId.get(qid) ?? null : null;
  const q = (vq?.row.query ?? null) as Query | null;
  const first = vq ? firstOf(vq.row.agentName) : "";

  const open = useMemo(() => v.qs.filter((x) => x.court !== "closed" && `${x.row.agentName} ${x.row.agency}`.toLowerCase().includes(term.trim().toLowerCase()))
    .sort((a, b) => Number(a.court === "you") - Number(b.court === "you")), [v.qs, term]);

  const sofar: [number, string][] = [];
  if (vq && step > 0) sofar.push([0, vq.row.agentName]);
  if (out && step > 1) sofar.push([1, OUTCOMES.find((o) => o[0] === out)![1]]);

  const commit = async () => {
    if (!q || !out || !currentUser || busy) return;
    setBusy(true);
    const ag = agents.find((a) => a.id === q.agentId) ?? null;
    const ms = manuscripts.find((m) => m.id === q.manuscriptId) ?? null;
    const others = out === "offer" ? offerOthers(q, queries, isLive) : [];
    try {
      const snap = await takeSnapshot(currentUser.id, [q.id, ...others.map((o) => o.id)]);
      await saveResponse(db as never, { q, agent: ag, ms }, respondDefaults(out, whenDate(when, date), "", others));
      const undo = async () => { await restoreSnapshot(snap); };
      const name = vq!.row.agentName;
      if (out === "pass") { closeV3(); showV3Snack({ msg: `Logged. ${name} moves to Closed.`, undo }); return; }
      setCele({
        qid: q.id, undo, msg: `${OUTCOMES.find((o) => o[0] === out)![1]} · ${name}`,
        h: out === "offer" ? "An offer. Congratulations." : out === "rr" ? `${first} wants to see it again.` : `${first} wants to read more.`,
        p: out === "offer" ? `${name} has offered to represent you. It’s on Today for when you’ve decided.` : "It’s at the top of Today so you don’t lose track of sending it.",
      });
    } catch (e) {
      console.error("[phone v3] reply save failed", e);
      showV3Snack({ msg: "Couldn’t save. Nothing was changed." });
    } finally { setBusy(false); }
  };

  if (cele) {
    return (
      <div className="pa3-cele" role="dialog" aria-modal="true" data-pa3="cele" data-kind="reply">
        <img src={HAWK_SRC} alt="" />
        <h3 className="pa3-h3">{cele.h}</h3>
        <p>{cele.p}</p>
        <div style={{ height: 26 }} />
        <button type="button" className="pa3-btn" data-pa3="cele-done" onClick={() => { closeV3(); showV3Snack({ msg: cele.msg, undo: cele.undo }); }}>Done</button>
        <button type="button" className="pa3-btn q" data-pa3="cele-open" onClick={() => openV3({ type: "query", id: cele.qid })}>Open the query</button>
      </div>
    );
  }

  let body: React.ReactNode = null; let btn = "Continue"; let ok = true;
  if (step === 0) {
    ok = !!vq;
    body = (<>
      <h3 className="pa3-h3">Who replied?</h3>
      <label className="pa3-field"><V3I n="search" /><input data-pa3="fterm" placeholder="Search your open queries" value={term} autoComplete="off" onChange={(e) => { setTerm(e.target.value); setQid(null); }} /></label>
      {open.length ? open.slice(0, 40).map((x) => (
        <Opt key={x.id} on={qid === x.id} onClick={() => setQid(x.id)} t={x.row.agentName} s={`${x.row.agency && x.row.agency !== "No agency" ? `${x.row.agency} · ` : ""}${x.status}`}
          g={<V3Glyph status={x.row.status} label={false} />} pa3="reply-opt" data={{ "data-id": x.id }} />
      )) : <div className="pa3-empty">No open query matches that name.</div>}
    </>);
  } else if (step === 1) {
    ok = !!out;
    body = (<>
      <h3 className="pa3-h3">What did {first} say?</h3>
      {OUTCOMES.map(([k, t, s, st]) => <Opt key={k} on={out === k} onClick={() => setOut(k)} t={t} s={s || null} g={<V3Glyph status={st} label={false} />} pa3="outcome" data={{ "data-k": k }} />)}
    </>);
  } else {
    btn = "Log this reply";
    body = (<><h3 className="pa3-h3">When did you hear?</h3><WhenOpts when={when} date={date} setWhen={setWhen} setDate={setDate} /></>);
  }
  return (
    <FlowShellV3 pa3="reply-flow" title="An agent replied" n={3} step={step} sofar={sofar} onJump={setStep} onBack={() => setStep((x) => Math.max(0, x - 1))}
      btn={busy ? "Saving…" : btn} ok={ok} busy={busy} onNext={() => (step < 2 ? setStep(step + 1) : void commit())}>{body}</FlowShellV3>
  );
};

/** the overlay host's renderer for this phase's panels */
export function renderJourney(o: V3Overlay): React.ReactNode {
  if (o.type === "reply") return <ReplyFlowV3 queryId={o.queryId} />;
  return null;
}
