/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — THE QUICK LOG (design-refs/phone-app-v4/phone-app-v4-pages.html, "Logging a query" 1–4). + opens a
 * pull-up sheet on "Who did you query?": the four best-fit agents not yet queried as faces, and "Other" (v3's search,
 * which can add a new agent); under them two quiet links, "An agent replied" (v3's reply journey) and "Pin a note".
 * Picking a face fills four lines from that agent's card: Sent (today), With it (what they ask for), Reply expected (their
 * reply time, with the date) and Nudge reminder. Tapping a line opens its control inside the sheet, then "Done" returns:
 * the date; the materials with `SampleSpecPicker` and the start-point control as v3 built them; the reply-time slider; the
 * nudge switch. If the reply time now differs from the card, v3's ticked "Save N weeks on {name}'s card too" appears.
 *
 * ⚠️ "Log query" CALLS THE SAME WRITER WITH THE SAME RECORD AS v3's JOURNEY (`saveLog`, field for field — PA4-7), with
 *    v3's Undo (the snapshot restore). v3's step-by-step log screens retire.
 */
import React, { useMemo, useRef, useState } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { SampleSpecPicker } from "../../materials/SampleSpecPicker";
import { ResponseTime } from "../../agents/card/agentPills";
import { materialRowsFromAgent, type MaterialRow } from "../../../lib/agentMaterials";
import { saveLog } from "../../../lib/queryActions/logSave";
import { currentVersion } from "../../../lib/queryActions/packages";
import { inUseLetter } from "../../../lib/queryLetters";
import { queryViaOf } from "../../../lib/queryVia";
import { takeSnapshot, restoreSnapshot, packagesHeldBy, packagesIn } from "../../../lib/queryActions/snapshot";
import { commitCardSave } from "../../../lib/agentCardSave";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { dayMonth } from "../../../lib/dates";
import { openPhoneCompose } from "../../../lib/phoneCompose";
import { defFromUnit } from "../../../lib/queryActions/sample";
import { bestFit } from "../../../lib/phoneV4";
import { ComponentType, QueryStatus, SubmissionMethod, type Agent } from "../../../types";
import { addDays, Opt, sampleFromRows, sampleWords, today, WhenOpts, whenDate, type When } from "../v3/JourneysV3";
import { closeV3, openV3, showV3Snack } from "../v3/v3Store";
import { useV3Data } from "../v3/V3Provider";
import { FaceV4 } from "./AgentsV4";
import { CAST, Chev, Cta, I4, Link4, Seal, Stamp } from "./V4Parts";
import "./phoneV4.css";

const firstOf = (n: string) => (n || "").trim().split(/\s+/)[0] || "the agent";
const wk = (w: number) => `${w} ${w === 1 ? "week" : "weeks"}`;
const newId = () => `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
type Line = null | "date" | "mats" | "reply";

export const QuickLogV4: React.FC<{ agentId?: string }> = ({ agentId }) => {
  const db = useScriptAllyDb();
  const v = useV3Data();
  const { agents, queries, manuscripts, versions, packages, currentUser } = db;
  const fits = useMemo(() => bestFit(agents, queries), [agents, queries]);
  const [aid, setAid] = useState<string | null>(agentId ?? null);
  const agent = agents.find((a) => a.id === aid) ?? null;
  const [other, setOther] = useState(false);
  const [term, setTerm] = useState("");
  const [line, setLine] = useState<Line>(null);
  const [rows, setRows] = useState<MaterialRow[]>(() => materialRowsFromAgent(agent?.materialsWanted ?? []));
  const [from, setFrom] = useState<{ sect: boolean; at: string }>({ sect: false, at: "" });
  const [when, setWhen] = useState<When>("today");
  const [date, setDate] = useState("");
  const usual = agent?.responseTimeWeeks && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null;
  const [weeks, setWeeks] = useState<number | null>(usual ?? 8);
  const [nudge, setNudge] = useState(!agent?.noResponseMeansNo);
  const [saveCard, setSaveCard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ n: number; name: string; agency: string; exp: Date; sent: Date; nudgeOn: Date | null; undo: () => Promise<void> } | null>(null);
  const id = useRef(newId());

  /* a face fills everything from that agent's card (v3's `pick`) */
  const pick = (a: Agent) => {
    setAid(a.id); setOther(false); setLine(null); setRows(materialRowsFromAgent(a.materialsWanted ?? [])); setFrom({ sect: false, at: "" });
    setWeeks(a.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : 8); setNudge(!a.noResponseMeansNo);
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
  const first = agent ? firstOf(agent.name) : "";
  const differs = !!agent && weeks != null && weeks !== usual;
  const isToday = sent.toDateString() === today().toDateString();

  /* ⚠️ v3's commit, unchanged: the same writer, the same record, the same Undo */
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
      setDone({ n: before + 1, name: agent.name, agency: agent.agency ?? "", exp, sent, nudgeOn: nudge ? nudgeOn : null, undo });
    } catch (e) {
      console.error("[phone v4] log save failed", e);
      showV3Snack({ msg: "Couldn’t save. Nothing was changed." });
    } finally { setBusy(false); }
  };

  const shell = (pa4: string, children: React.ReactNode) => (
    <div className="pa4-sheet" role="dialog" aria-modal="true" aria-label="Log a query" data-pa4={pa4} data-pa3="plus-sheet">
      <div className="pa4-grab" />{children}
    </div>
  );

  /* ── 4 · Logged ── */
  if (done) {
    return shell("logged", (<>
      <div style={{ position: "relative", padding: "8px 8px 0" }}>
        <Stamp word="Sent" date={dayMonth(done.sent.getTime())} style={{ right: 8, top: 0 }} />
        <img src={CAST.courier} alt="" data-pa4="cast" style={{ width: 136, display: "block", margin: "0 0 8px -12px" }} />
        <h2 className="pa4-d" style={{ marginBottom: 8 }} data-pa4="logged-n">Query {done.n} is out.</h2>
        <p className="pa4-b pa4-body" style={{ marginBottom: 24 }} data-pa4="logged-line">
          {done.name}{done.agency ? `, ${done.agency}` : ""}. Reply expected by {dayMonth(done.exp.getTime())}{done.nudgeOn ? `, and a nudge reminder is set for ${dayMonth(done.nudgeOn.getTime())}` : ""}.
        </p>
      </div>
      <Cta pa4="logged-done" onClick={() => { closeV3(); showV3Snack({ msg: `Query to ${done.name} logged`, undo: done.undo }); }}>Done</Cta>
      <Link4 pa4="log-another" onClick={() => openV3({ type: "plus" })}>Log another</Link4>
    </>));
  }

  /* ── 3 · Changing a line ── */
  if (agent && line) {
    let title = ""; let body: React.ReactNode = null;
    if (line === "date") {
      title = "When did you send it?";
      body = <WhenOpts when={when} date={date} setWhen={setWhen} setDate={setDate} />;
    } else if (line === "mats") {
      title = "What went with it?";
      body = (<>
        <Opt sq on={on("queryLetter")} onClick={() => toggle("queryLetter")} t="Query letter" pa3="mat" data={{ "data-k": "queryLetter" }} />
        <Opt sq on={on("synopsis")} onClick={() => toggle("synopsis")} t="Synopsis" pa3="mat" data={{ "data-k": "synopsis" }} />
        <Opt sq on={on("sample")} onClick={() => toggle("sample")} t="Opening sample" s={on("sample") ? sampleWords(s) : null} pa3="mat" data={{ "data-k": "sample" }} />
        {on("sample") ? (
          <div className="pa3-spk" data-pa3="sample-picker" data-pa4="sample-picker">
            <SampleSpecPicker rows={rows} onChange={setRows} join="and" mode="sent" idPrefix="pa4s" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" className={`pa4-chip${!from.sect ? " on" : ""}`} data-pa4="from-start" onClick={() => setFrom({ sect: false, at: from.at })}><span>From the start</span></button>
              <button type="button" className={`pa4-chip${from.sect ? " on" : ""}`} data-pa4="from-else" onClick={() => setFrom({ sect: true, at: from.at })}><span>From somewhere else</span></button>
            </div>
            {from.sect ? (
              <label className="pa4-field" style={{ marginTop: 8 }}>
                <span style={{ flex: "none" }}>Starting at {defFromUnit(s.unit === "none" ? "chapters" : s.unit)}</span>
                <input data-pa4="from-at" inputMode="numeric" placeholder="12" value={from.at} autoComplete="off" onChange={(e) => setFrom({ sect: true, at: e.target.value })} />
              </label>
            ) : null}
          </div>
        ) : null}
        <Opt sq on={on("other")} onClick={() => toggle("other")} t="Something else" pa3="mat" data={{ "data-k": "other" }} />
        {on("other") ? <label className="pa4-field"><input data-pa4="other" placeholder="What else went? Author bio, say" value={otherText} autoComplete="off"
          onChange={(e) => { const t = e.target.value; setRows((rs) => rs.map((r) => (r.key === "other" && r.kind === "text" ? { ...r, text: t } : r))); }} /></label> : null}
      </>);
    } else {
      title = `How long does ${first} usually take?`;
      body = (<>
        <p className="pa4-b pa4-body" style={{ margin: "0 8px 16px" }}>{usual ? `${agent.agency || first} says about ${wk(usual)}. Drag to change it.` : "Drag to set it. The agency’s submissions page usually says."}</p>
        <div className="pa3-rt" data-pa3="rt" data-pa4="rt"><ResponseTime weeks={weeks} onWeeks={setWeeks} /></div>
        <p className="pa4-s" style={{ margin: "8px" }} data-pa4="expected-line">Reply expected by {dayMonth(exp.getTime())}.</p>
      </>);
    }
    return shell("log-line", (<>
      <h2 className="pa4-d" style={{ margin: "0 8px 16px" }}>{title}</h2>
      <div style={{ marginBottom: 16 }} data-pa4="line-control" data-k={line}>{body}</div>
      <Cta pa4="line-done" onClick={() => setLine(null)}>Done</Cta>
    </>));
  }

  /* the faces: the four best fits not yet queried (and the picked agent, if it came from elsewhere), then Other */
  const faces = fits.slice(0, 4);
  if (agent && !faces.some((a) => a.id === agent.id)) faces.unshift(agent);
  const facesRow = (
    <div className="pa4-hs" style={{ gap: 4, paddingBottom: 8 }} data-pa4="faces">
      {faces.slice(0, 5).map((a) => <FaceV4 key={a.id} id={a.id} pa4="face" name={a.name} on={a.id === aid} onTap={() => pick(a)} />)}
      <FaceV4 pa4="face-other" name="Other" on={other} onTap={() => { setOther(true); setAid(null); }}><span className="pa4-seal" style={{ width: 48, height: 48 }}><I4 n="search" /></span></FaceV4>
    </div>
  );

  /* ── 2 · Filled in ── */
  if (agent) {
    return shell("log-filled", (<>
      <h2 className="pa4-d" style={{ margin: "0 8px 16px" }}>Query to {first}</h2>
      {facesRow}
      <div className="pa4-card" style={{ padding: "0 24px", margin: "8px 0 12px" }} data-pa4="lines">
        <button type="button" className="pa4-kv" data-pa4="line" data-k="date" onClick={() => setLine("date")}><span className="pa4-s k">Sent</span><span className="pa4-b v">{isToday ? `Today, ${dayMonth(sent.getTime())}` : dayMonth(sent.getTime())}</span><Chev /></button>
        <button type="button" className="pa4-kv" data-pa4="line" data-k="mats" onClick={() => setLine("mats")}><span className="pa4-s k">With it</span><span className="pa4-b v" data-pa4="line-mats">{matsText || "Nothing attached"}</span><Chev /></button>
        <button type="button" className="pa4-kv" data-pa4="line" data-k="reply" onClick={() => setLine("reply")}><span className="pa4-s k">Reply expected</span><span className="pa4-b v" data-pa4="line-reply">In {wk(w)}, by {dayMonth(exp.getTime())}</span><Chev /></button>
        <button type="button" className="pa4-kv" data-pa4="line" data-k="nudge" aria-pressed={nudge} onClick={() => setNudge((x) => !x)}>
          <span className="pa4-s k">Nudge reminder</span><span className="pa4-b v" data-pa4="line-nudge">{nudge ? dayMonth(nudgeOn.getTime()) : "Off"}</span><span className={`pa4-sw${nudge ? " on" : ""}`} aria-hidden="true" />
        </button>
      </div>
      <div className="pa4-s" style={{ margin: "0 8px 16px" }}>Filled in from {first}’s card.</div>
      {differs ? (
        <div style={{ marginBottom: 16 }}>
          <Opt sq on={saveCard} onClick={() => setSaveCard((x) => !x)} pa3="save-card"
            t={`Save ${wk(w)} on ${first}’s card too`} s={usual ? `Their card says ${wk(usual)} now.` : "Their card has no reply time yet."} />
        </div>
      ) : null}
      <Cta pa4="log-query" disabled={busy} onClick={() => void commit()}>{busy ? "Saving…" : "Log query"}</Cta>
    </>));
  }

  /* ── 1 · Who (and Other: v3's search, which can add a new agent) ── */
  const queried = new Set(queries.filter((q) => q.status !== QueryStatus.WITHDRAWN).map((q) => q.agentId));
  const t = term.trim().toLowerCase();
  const list = agents.filter((a) => !queried.has(a.id) && `${a.name} ${a.agency ?? ""}`.toLowerCase().includes(t));
  const exact = list.some((a) => a.name.trim().toLowerCase() === t);
  return shell("log-who", (<>
    <h2 className="pa4-d" style={{ margin: "0 8px 8px" }}>Who did you query?</h2>
    <p className="pa4-b pa4-body" style={{ margin: "0 8px 24px" }}>Pick one and we’ll fill in the rest from their card.</p>
    {facesRow}
    {other ? (
      <div data-pa4="other-search">
        <label className="pa4-field" style={{ margin: "8px 0" }}><I4 n="search" /><input data-pa4="fterm" autoFocus placeholder="Search your list or type a new name" value={term} autoComplete="off" onChange={(e) => setTerm(e.target.value)} /></label>
        {list.slice(0, 30).map((a) => (
          <button key={a.id} type="button" className="pa4-tap" data-pa4="other-agent" data-id={a.id} onClick={() => pick(a)}>
            <Seal name={a.name} size={40} /><span className="pa4-x"><b>{a.name}</b><span className="pa4-s">{(a.agency ?? "").trim() || "Agency not added"}{a.responseTimeWeeks ? ` · about ${wk(a.responseTimeWeeks)}` : ""}</span></span>
          </button>
        ))}
        {term.trim() && !exact ? (
          <button type="button" className="pa4-tap" data-pa4="new-agent" onClick={() => openV3({ type: "add", name: term.trim() })}>
            <span className="pa4-seal" style={{ width: 40, height: 40 }}><I4 n="plus" /></span><span className="pa4-x"><b>Add “{term.trim()}” as a new agent</b><span className="pa4-s">You can fill in the details later</span></span>
          </button>
        ) : null}
        {!list.length && !term.trim() ? <p className="pa4-b pa4-empty">Everyone on your list has a query. Type a name to add someone new.</p> : null}
      </div>
    ) : null}
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <Link4 pa4="plus-reply" onClick={() => openV3({ type: "reply" })}>An agent replied</Link4>
      <Link4 pa4="plus-note" onClick={() => { closeV3(); openPhoneCompose("note"); }}>Pin a note</Link4>
    </div>
  </>));
};
