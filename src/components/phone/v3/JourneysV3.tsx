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
import React, { useMemo, useRef, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { SampleSpecPicker } from "../../materials/SampleSpecPicker";
import { ResponseTime } from "../../agents/card/agentPills";
import { materialRowsFromAgent, type MaterialRow } from "../../../lib/agentMaterials";
import { saveLog } from "../../../lib/queryActions/logSave";
import { offerOthers, respondDefaults, saveResponse, type RespType } from "../../../lib/queryActions/respondSave";
import { currentVersion } from "../../../lib/queryActions/packages";
import { inUseLetter } from "../../../lib/queryLetters";
import { queryViaOf } from "../../../lib/queryVia";
import { isLive } from "../../queryActions/journeys/common";
import { takeSnapshot, restoreSnapshot, packagesHeldBy, packagesIn } from "../../../lib/queryActions/snapshot";
import { commitCardSave } from "../../../lib/agentCardSave";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { dayMonth } from "../../../lib/dates";
import { openPhoneCompose } from "../../../lib/phoneCompose";
import { ComponentType, QueryStatus, SubmissionMethod, type Agent, type Query } from "../../../types";
import type { Sample, SampleUnit } from "../../../lib/queryActions/sample";
import { defFromUnit } from "../../../lib/queryActions/sample";
import { V3Glyph, HAWK_SRC } from "./V3Parts";
import { V3I } from "./v3Icons";
import { closeV3, openV3, showV3Snack, type V3Overlay } from "./v3Store";
import { useV3Data } from "./V3Provider";

const DAY = 86_400_000;
const firstOf = (n: string) => (n || "").trim().split(/\s+/)[0] || "the agent";
const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const today = () => noon(new Date());
const addDays = (d: Date, n: number) => noon(new Date(d.getTime() + n * DAY));
const wk = (w: number) => `${w} ${w === 1 ? "week" : "weeks"}`;
const newId = () => `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/* ── the + sheet ── */
export const PlusSheetV3: React.FC = () => (
  <div className="pa3-sheet" role="dialog" aria-modal="true" aria-label="What happened?" data-pa3="plus-sheet">
    <div className="pa3-grab" />
    <div className="pa3-pad">
      <h3 className="pa3-h3">What happened?</h3>
      <p className="pa3-lead">Log it now and Today stays accurate.</p>
      <button type="button" className="pa3-opt" data-pa3="plus-log" onClick={() => openV3({ type: "log" })}>
        <V3Glyph status={QueryStatus.QUERIED} label={false} /><span className="pa3-tx">I sent a query<small>Five short questions</small></span><V3I n="chev" className="pa3-ic pa3-chev" />
      </button>
      <button type="button" className="pa3-opt" data-pa3="plus-reply" onClick={() => openV3({ type: "reply" })}>
        <V3Glyph status={QueryStatus.PARTIAL_REQUESTED} label={false} /><span className="pa3-tx">An agent replied<small>A request, a pass or an offer</small></span><V3I n="chev" className="pa3-ic pa3-chev" />
      </button>
      <div className="pa3-wk" style={{ marginTop: 14 }}>
        <button type="button" className="pa3-chip" data-pa3="plus-agent" onClick={() => openV3({ type: "add" })}><V3I n="agents" /> Add an agent</button>
        <button type="button" className="pa3-chip" data-pa3="plus-note" onClick={() => { closeV3(); openPhoneCompose("note"); }}><V3I n="pin" /> Pin a note</button>
      </div>
    </div>
  </div>
);

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

const Opt: React.FC<{ on: boolean; onClick: () => void; t: React.ReactNode; s?: React.ReactNode; g?: React.ReactNode; sq?: boolean; pa3?: string; data?: Record<string, string> }> = ({ on, onClick, t, s, g, sq, pa3, data }) => (
  <button type="button" className={`pa3-opt${sq ? " sq" : ""}${on ? " on" : ""}`} aria-pressed={on} data-pa3={pa3 ?? "opt"} {...data} onClick={onClick}>
    {g}<span className="pa3-tx">{t}{s ? <small>{s}</small> : null}</span><span className="pa3-ck"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
  </button>
);

type When = "today" | "yest" | "pick";
const WhenOpts: React.FC<{ when: When; date: string; setWhen: (w: When) => void; setDate: (d: string) => void }> = ({ when, date, setWhen, setDate }) => {
  const t = today();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (<>
    <Opt on={when === "today"} onClick={() => setWhen("today")} t="Today" s={dayMonth(t)} data={{ "data-k": "today" }} />
    <Opt on={when === "yest"} onClick={() => setWhen("yest")} t="Yesterday" data={{ "data-k": "yest" }} />
    <Opt on={when === "pick"} onClick={() => setWhen("pick")} t="Another day" data={{ "data-k": "pick" }} />
    {when === "pick" ? <label className="pa3-field"><input type="date" data-pa3="fdate" value={date || iso(t)} max={iso(t)} aria-label="Date" onChange={(e) => setDate(e.target.value)} /></label> : null}
  </>);
};
const whenDate = (when: When, date: string): Date => {
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
const sampleWords = (s: Sample): string => {
  if (s.unit === "none") return "";
  const u = s.amt === 1 ? s.unit.replace(/s$/, "") : s.unit;
  return s.sect ? `${s.amt.toLocaleString("en-GB")} ${u} from ${s.fu ?? "chapter"} ${s.from}` : `First ${s.amt.toLocaleString("en-GB")} ${u}`;
};

/* ── I sent a query (ref `oLog`) ── */
export const LogFlowV3: React.FC<{ agentId?: string }> = ({ agentId }) => {
  const db = useScriptAllyDb();
  const v = useV3Data();
  const { agents, queries, manuscripts, versions, packages, currentUser } = db;
  const queried = useMemo(() => new Set(queries.filter((q) => q.status !== QueryStatus.WITHDRAWN).map((q) => q.agentId)), [queries]);
  const [step, setStep] = useState(agentId ? 1 : 0);
  const [term, setTerm] = useState("");
  const [aid, setAid] = useState<string | null>(agentId ?? null);
  const agent = agents.find((a) => a.id === aid) ?? null;
  const [rows, setRows] = useState<MaterialRow[]>(() => materialRowsFromAgent(agent?.materialsWanted ?? []));
  const [from, setFrom] = useState<{ sect: boolean; at: string }>({ sect: false, at: "" });
  const [when, setWhen] = useState<When>("today");
  const [date, setDate] = useState("");
  const usual = agent?.responseTimeWeeks && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null;
  const [weeks, setWeeks] = useState<number | null>(usual ?? 8);
  const [nudge, setNudge] = useState(!agent?.noResponseMeansNo);
  const [saveCard, setSaveCard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ n: number; name: string; agency: string; exp: Date; sent: Date; undo: () => Promise<void> } | null>(null);
  const id = useRef(newId());

  const pick = (a: Agent) => {
    setAid(a.id); setRows(materialRowsFromAgent(a.materialsWanted ?? [])); setFrom({ sect: false, at: "" });
    const w = a.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : 8;
    setWeeks(w); setNudge(!a.noResponseMeansNo);
  };
  const on = (k: MaterialRow["key"]) => rows.some((r) => r.key === k && r.on);
  const toggle = (k: MaterialRow["key"]) => setRows((rs) => {
    const has = rs.some((r) => r.key === k);
    if (!has) {
      if (k === "sample") return [...rs, { key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Chapters", amount: "3" }];
      if (k === "other") return [...rs, { key: "other", kind: "text", name: "Other", on: true, text: "" }];
      if (k === "synopsis") return [...rs, { key: "synopsis", kind: "binary", name: "Synopsis", on: true, pages: "" }];
      return [...rs, { key: "queryLetter", kind: "binary", name: "Query letter", on: true }];
    }
    return rs.map((r) => (r.key === k ? ({ ...r, on: !r.on, ...(k === "sample" && !r.on && r.kind === "qty" && !r.amount ? { amount: "3" } : {}) } as MaterialRow) : r));
  });
  const otherText = (rows.find((r) => r.key === "other" && r.on) as Extract<MaterialRow, { kind: "text" }> | undefined)?.text ?? "";
  const s = sampleFromRows(rows, from);
  const matsText = [on("queryLetter") ? "Query letter" : "", on("synopsis") ? "Synopsis" : "", sampleWords(s), on("other") ? otherText.trim() || "Something else" : ""].filter(Boolean).join(", ");
  const sent = whenDate(when, date);
  const w = weeks ?? 8;
  const exp = addDays(sent, w * 7);
  const nudgeOn = addDays(exp, 7);
  const asks = agent ? materialRowsFromAgent(agent.materialsWanted ?? []).filter((r) => r.on) : [];
  const first = agent ? firstOf(agent.name) : "";
  const differs = !!agent && weeks != null && weeks !== usual;

  const sofar: [number, string][] = [];
  if (agent && step > 0) sofar.push([0, agent.name]);
  if (step > 1) sofar.push([1, matsText || "Nothing attached"]);
  if (step > 2) sofar.push([2, dayMonth(sent)]);
  if (step > 3) sofar.push([3, `${weeks == null ? "Not stated" : wk(w)}${nudge ? ", nudge on" : ""}`]);

  const commit = async () => {
    if (!agent || !currentUser || busy) return;
    setBusy(true);
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { /* storage refused */ }
    const ms = resolveScopedManuscript(manuscripts, stored);
    const msId = ms?.id ?? manuscripts[0]?.id ?? "";
    const qlV = inUseLetter(ms ?? null, versions, packages);
    const synV = currentVersion(msId, versions, ComponentType.SYNOPSIS);
    const mat = { ql: on("queryLetter"), syn: on("synopsis"), s };
    const before = queries.length;
    try {
      const snap = await takeSnapshot(currentUser.id, [id.current]);
      await saveLog(db as never, {
        id: id.current, manuscriptId: msId, agent, sent, via: queryViaOf(agent.submissionMethod) || SubmissionMethod.EMAIL, pkCard: null, mat,
        pieceV: { qlId: mat.ql ? qlV?.id ?? null : null, synId: mat.syn ? synV?.id ?? null : null, qlVersion: mat.ql ? qlV?.versionName ?? null : null, synVersion: mat.syn ? synV?.versionName ?? null : null, bookVersion: null, other: on("other") && otherText.trim() ? otherText.trim() : null },
        basedOn: null, expect: exp, writerExpected: weeks == null || weeks !== usual, ifNo: nudge ? "nudge" : "close", nudgeDate: nudge ? nudgeOn : null,
        requery: false, nrmnOverride: null,
      });
      let cardUndo: (() => Promise<void>) | null = null;
      if (differs && saveCard) {
        const out = await commitCardSave({ uid: currentUser.id, agent, queries, patch: { responseTimeWeeks: weeks } as never, resolveTaskFlag: db.resolveTaskFlag });
        if (!("error" in out.res) && out.undo) cardUndo = async () => { await out.undo!(); };
      }
      const undo = async () => {
        const after = await packagesHeldBy(currentUser.id, snap.queryIds);
        await restoreSnapshot(snap);
        await db.reconcileStamps([...packagesIn(snap), ...after]);
        if (cardUndo) await cardUndo();
      };
      setDone({ n: before + 1, name: agent.name, agency: agent.agency ?? "", exp, sent, undo });
    } catch (e) {
      console.error("[phone v3] log save failed", e);
      showV3Snack({ msg: "Couldn’t save. Nothing was changed." });
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="pa3-cele" role="dialog" aria-modal="true" data-pa3="cele" data-kind="log">
        <img src={HAWK_SRC} alt="" />
        <h3 className="pa3-h3">Query {done.n} is out.</h3>
        <p>{done.name}{done.agency ? ` at ${done.agency}` : ""}. Reply expected by {dayMonth(done.exp)}.</p>
        <div className="pa3-mini"><div className="pa3-row"><V3Glyph status={QueryStatus.QUERIED} /><span className="pa3-tx"><span className="pa3-t">{done.name}</span>{done.agency ? <span className="pa3-s">{done.agency}</span> : null}<span className="pa3-s">Queried · {dayMonth(done.sent)}</span></span></div></div>
        <button type="button" className="pa3-btn" data-pa3="cele-done" onClick={() => { closeV3(); showV3Snack({ msg: `Query to ${done.name} logged`, undo: done.undo }); }}>Done</button>
        <button type="button" className="pa3-btn q" data-pa3="cele-again" onClick={() => openV3({ type: "log" })}>Log another</button>
      </div>
    );
  }

  const list = agents.filter((a) => !queried.has(a.id) && `${a.name} ${a.agency ?? ""}`.toLowerCase().includes(term.trim().toLowerCase()));
  const exact = list.some((a) => a.name.trim().toLowerCase() === term.trim().toLowerCase());
  let body: React.ReactNode = null; let btn = "Continue"; let ok = true;
  if (step === 0) {
    ok = !!agent;
    body = (<>
      <h3 className="pa3-h3">Who did you query?</h3>
      <label className="pa3-field"><V3I n="search" /><input data-pa3="fterm" placeholder="Search your list or type a new name" value={term} autoComplete="off" onChange={(e) => { setTerm(e.target.value); setAid(null); }} /></label>
      {list.slice(0, 40).map((a) => (
        <Opt key={a.id} on={aid === a.id} onClick={() => pick(a)} t={a.name} s={`${a.agency || "Agency not added"}${a.responseTimeWeeks ? ` · about ${wk(a.responseTimeWeeks)}` : ""}`}
          g={<span className="pa3-seal lt">{a.name.split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase()}</span>} pa3="agent-opt" data={{ "data-id": a.id }} />
      ))}
      {term.trim() && !exact ? (
        <button type="button" className="pa3-opt" data-pa3="new-agent" onClick={() => openV3({ type: "add", name: term.trim() })}>
          <span className="pa3-seal lt"><V3I n="plus" /></span><span className="pa3-tx">Add “{term.trim()}” as a new agent<small>You can fill in the details later</small></span>
        </button>
      ) : null}
      {!list.length && !term.trim() ? <div className="pa3-empty">Everyone on your list has a query. Type a name to add someone new.</div> : null}
    </>);
  } else if (step === 1) {
    body = (<>
      <h3 className="pa3-h3">What did you send?</h3>
      {asks.length ? <div className="pa3-tip" data-pa3="asks-tip"><span className="pa3-tx">{first} asks for <b>{asks.map((r) => r.kind === "qty" ? `${r.amount} ${r.unit.toLowerCase()}` : r.kind === "text" ? r.text : r.name).join(", ").toLowerCase()}</b>. We’ve filled that in, so change anything that went differently.</span></div> : <p className="pa3-lead">Tick everything that went with it.</p>}
      <Opt sq on={on("queryLetter")} onClick={() => toggle("queryLetter")} t="Query letter" pa3="mat" data={{ "data-k": "queryLetter" }} />
      <Opt sq on={on("synopsis")} onClick={() => toggle("synopsis")} t="Synopsis" pa3="mat" data={{ "data-k": "synopsis" }} />
      <Opt sq on={on("sample")} onClick={() => toggle("sample")} t="Opening sample" s={on("sample") ? sampleWords(s) : null} pa3="mat" data={{ "data-k": "sample" }} />
      {on("sample") ? (
        <div className="pa3-spk" data-pa3="sample-picker">
          <SampleSpecPicker rows={rows} onChange={setRows} join="and" mode="sent" idPrefix="pa3s" />
          <div className="pa3-wk" style={{ margin: "12px 0 0" }}>
            <button type="button" className={`pa3-chip${!from.sect ? " on" : ""}`} data-pa3="from-start" onClick={() => setFrom({ sect: false, at: from.at })}>From the start</button>
            <button type="button" className={`pa3-chip${from.sect ? " on" : ""}`} data-pa3="from-else" onClick={() => setFrom({ sect: true, at: from.at })}>From somewhere else</button>
          </div>
          {from.sect ? (
            <label className="pa3-field" style={{ margin: "10px 0 0" }}>
              <span style={{ flex: "none", color: "var(--pa-muted)" }}>Starting at {defFromUnit(s.unit === "none" ? "chapters" : s.unit)}</span>
              <input data-pa3="from-at" inputMode="numeric" placeholder="12" value={from.at} autoComplete="off" onChange={(e) => setFrom({ sect: true, at: e.target.value })} />
            </label>
          ) : null}
        </div>
      ) : null}
      <Opt sq on={on("other")} onClick={() => toggle("other")} t="Something else" pa3="mat" data={{ "data-k": "other" }} />
      {on("other") ? <label className="pa3-field"><input data-pa3="other" placeholder="What else went? Author bio, say" value={otherText} autoComplete="off"
        onChange={(e) => { const t = e.target.value; setRows((rs) => rs.map((r) => (r.key === "other" && r.kind === "text" ? { ...r, text: t } : r))); }} /></label> : null}
    </>);
  } else if (step === 2) {
    body = (<><h3 className="pa3-h3">When did you send it?</h3><WhenOpts when={when} date={date} setWhen={setWhen} setDate={setDate} /></>);
  } else if (step === 3) {
    body = (<>
      <h3 className="pa3-h3">How long does {first} usually take?</h3>
      <p className="pa3-lead">{usual ? `${agent?.agency || first} says about ${wk(usual)}. Drag to change it.` : "Drag to set it. The agency’s submissions page usually says."}</p>
      <div className="pa3-rt" data-pa3="rt"><ResponseTime weeks={weeks} onWeeks={setWeeks} /></div>
      <div className="pa3-tip" data-pa3="nudge-tip">
        <span className="pa3-tx" data-pa3="expected-line"><b>Remind me to nudge</b><br />Reply expected by {dayMonth(exp)}. {nudge ? `Nudge reminder on ${dayMonth(nudgeOn)}.` : "No reminder."}</span>
        <button type="button" className={`pa3-sw${nudge ? " on" : ""}`} aria-pressed={nudge} aria-label="Remind me to nudge" data-pa3="nudge-switch" onClick={() => setNudge((x) => !x)} />
      </div>
      {differs ? (
        <Opt sq on={saveCard} onClick={() => setSaveCard((x) => !x)} pa3="save-card"
          t={`Save ${weeks == null ? "“not stated”" : wk(w)} on ${first}’s card too`} s={usual ? `Their card says ${wk(usual)} now.` : "Their card has no reply time yet."} />
      ) : null}
    </>);
  } else {
    btn = "Log this query";
    body = (<>
      <h3 className="pa3-h3">Check it, then log it</h3>
      <p className="pa3-lead">Tap anything above to change it.</p>
      <div className="pa3-card" data-pa3="check">
        <div className="pa3-row"><V3Glyph status={QueryStatus.QUERIED} /><span className="pa3-tx"><span className="pa3-t">{agent?.name}</span><span className="pa3-s">{agent?.agency || "Agency not added"}</span><span className="pa3-s">Queried · Reply expected by {dayMonth(exp)}</span></span></div>
        <div className="pa3-kv"><span>Sent</span><b>{dayMonth(sent)}</b></div>
        <div className="pa3-kv"><span>With it</span><b data-pa3="check-mats">{matsText || "Nothing attached"}</b></div>
        <div className="pa3-kv"><span>Nudge reminder</span><b>{nudge ? dayMonth(nudgeOn) : "Off"}</b></div>
      </div>
    </>);
  }
  return (
    <FlowShellV3 pa3="log-flow" title="New query" n={5} step={step} sofar={sofar} onJump={setStep} onBack={() => setStep((x) => Math.max(0, x - 1))}
      btn={busy ? "Saving…" : btn} ok={ok} busy={busy} onNext={() => (step < 4 ? setStep(step + 1) : void commit())}>{body}</FlowShellV3>
  );
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
  if (o.type === "plus") return <PlusSheetV3 />;
  if (o.type === "log") return <LogFlowV3 agentId={o.agentId} />;
  if (o.type === "reply") return <ReplyFlowV3 queryId={o.queryId} />;
  return null;
}
