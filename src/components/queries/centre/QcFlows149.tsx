/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 Part D (design-refs/query-centre-v149/, screens 11–14) — THE HEADER'S ACTIONS, IN THE SAME PANEL.
 *
 *   QcLogFlow149     — "+ Log a query": a blank query card. Who are you querying? (agents not queried for this book
 *                      first; those already querying it greyed and not selectable), then the card fills in: the agent,
 *                      the book with a package select, what went, when, how and a note. Log query.
 *   QcWhoReplied149  — "Record a response" with no query open: Step 1 of 2, Who replied? The live queries, in two
 *                      groups with their status pills; a pick opens that query's card in respond mode.
 *
 * ⚠️ THE FLOWS SAVE NOTHING THEMSELVES: the page's `onSave` is the log journey's own save (lib/queryActions/logSave).
 * ⚠️ NO "FULL MANUSCRIPT" TOGGLE: a full manuscript is what you send when asked, never part of a query (the house rule
 *    on both material surfaces); the mock's fourth toggle is not built. The sample is the opening sample (3 chapters).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { SubmissionMethod, type QueryStatus } from "../../../types";
import { fieldDay, parseDay } from "./QcQueryCard149";
import { DrawerMoment } from "../../shared/DrawerMoment";
import "../../../marketing/heroCard.css";
import "./qcv149card.css";

const SEARCH = <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#2a3a52" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.6" /><path d="M12.8 12.8l4 4" /></svg>;
const VIA: { k: SubmissionMethod; label: string }[] = [
  { k: SubmissionMethod.EMAIL, label: "By email" },
  { k: SubmissionMethod.ONLINE_FORM, label: "Online form" },
  { k: SubmissionMethod.QUERY_MANAGER, label: "QueryManager" },
];

export interface FlowAgent { id: string; name: string; agency: string; initials: string; querying: boolean; via: SubmissionMethod | null }
export interface FlowPackage { id: string; name: string; ql: boolean; syn: boolean; sample: boolean }
export interface LogAnswers { agentId: string; sent: number; via: SubmissionMethod; packageId: string | null; ql: boolean; syn: boolean; sample: boolean; note: string }

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const QcLogFlow149: React.FC<{
  nowMs: number;
  agents: FlowAgent[];
  seedAgentId: string | null;
  bookTitle: string;
  /** Contact list v25 F — the queries already logged for this book (the moment says "query no. {logged + 1}") */
  logged: number;
  packages: FlowPackage[];
  defaultPackageId: string | null;
  onClose: () => void;
  onSave: (a: LogAnswers) => Promise<boolean>;
}> = ({ nowMs, agents, seedAgentId, bookTitle, logged, packages, defaultPackageId, onClose, onSave }) => {
  const [agentId, setAgentId] = useState<string | null>(() => (seedAgentId && agents.some((a) => a.id === seedAgentId && !a.querying) ? seedAgentId : null));
  const [find, setFind] = useState("");
  const agent = agents.find((a) => a.id === agentId) ?? null;
  const pkg0 = packages.find((p) => p.id === defaultPackageId) ?? null;
  const [pkgId, setPkgId] = useState<string | null>(pkg0?.id ?? null);
  const [ql, setQl] = useState(pkg0 ? pkg0.ql : true);
  const [syn, setSyn] = useState(pkg0 ? pkg0.syn : true);
  const [sample, setSample] = useState(pkg0 ? pkg0.sample : false);
  const [sent, setSent] = useState(() => fieldDay(nowMs));
  const [via, setVia] = useState<SubmissionMethod>(SubmissionMethod.EMAIL);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const findRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!agent) findRef.current?.focus({ preventScroll: true }); }, [agent]);
  useEffect(() => { if (agent?.via) setVia(agent.via); }, [agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickPkg = (id: string | null) => {
    setPkgId(id);
    const p = packages.find((x) => x.id === id);
    if (p) { setQl(p.ql); setSyn(p.syn); setSample(p.sample); }
  };
  /* in a package only the portion is the query's: ticking the letter or synopsis off makes it an individual send */
  const tick = (k: "ql" | "syn" | "sample") => {
    if (k === "sample") { setSample((v) => !v); return; }
    if (pkgId) setPkgId(null);
    if (k === "ql") setQl((v) => !v); else setSyn((v) => !v);
  };
  const sentMs = parseDay(sent, nowMs);
  const bad = sentMs == null ? "Write the date as 24 Oct" : sentMs > nowMs ? "The query can’t be sent in the future" : !ql && !syn && !sample ? "Choose what you sent" : null;

  const q = norm(find.trim());
  const shown = agents.filter((a) => !q || norm(`${a.name} ${a.agency}`).includes(q));
  const open = shown.filter((a) => !a.querying).sort((a, b) => a.name.localeCompare(b.name));
  const busyWith = shown.filter((a) => a.querying).sort((a, b) => a.name.localeCompare(b.name));
  const band = (
    <div className="mk-lc-band qc149f-band" data-qc149f="band">
      <span>New query</span>
      <span className="qc149c-rt">
        {agent ? <span className="mk-lc-day"><span className="mk-odo-dk">Day</span> <span>0</span></span> : null}
        <button type="button" className="qc149c-x" data-qc149f="close" aria-label="Close" onClick={onClose}>×</button>
      </span>
    </div>
  );

  if (!agent) {
    return (
      <div className="qc149f qcv-legacy" data-qc149f="log" data-step="pick">
        <div className="mk-lc-in qc149c-in">
          {band}
          {/* Contact list v25 F — the moment, above the first step's label (gone once an agent is chosen) */}
          <DrawerMoment kind="log" n={logged + 1} title={bookTitle} />
          <div className="qc149f-pick">
            <span className="qc149c-lb">Who are you querying?</span>
            <label className="qc149f-srch">{SEARCH}<input ref={findRef} value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find an agent in your Contact list" aria-label="Find an agent in your Contact list" /></label>
            <div className="qc149f-ags" data-qc149f="agents">
              <div className="qc149f-grp">Not queried yet · {open.length}</div>
              {open.map((a) => (
                <button key={a.id} type="button" className="qc149f-ag" data-qc149f="agent" data-id={a.id} onClick={() => setAgentId(a.id)}>
                  <span className="qc149f-d">{a.initials}</span><span><b>{a.name}</b><small>{a.agency}</small></span><em>Choose</em>
                </button>
              ))}
              {busyWith.length ? <div className="qc149f-grp">Already querying · {busyWith.length}</div> : null}
              {busyWith.map((a) => (
                <span key={a.id} className="qc149f-ag" role="button" aria-disabled="true" data-qc149f="agent-busy" data-id={a.id} title={`You’re already querying ${a.name} with ${bookTitle}`}>
                  <span className="qc149f-d">{a.initials}</span><span><b>{a.name}</b><small>{a.agency}</small></span><em>Queried</em>
                </span>
              ))}
            </div>
          </div>
          <div className="qc149c-mft">
            <button type="button" className="qc149c-cx" data-qc149f="cancel" onClick={onClose}>Cancel</button>
            <span className="qc149c-sp" />
            <button type="button" className="qc149c-save" disabled>Log query</button>
          </div>
        </div>
      </div>
    );
  }

  const first = agent.name.trim().split(/\s+/)[0] || "the agent";
  return (
    <div className="qc149f qcv-legacy" data-qc149f="log" data-step="fill">
      <div className="mk-lc-in qc149c-in">
        {band}
        <div className="mk-lc-agent qc149c-agent">
          <span className="mk-lc-disc qc149c-disc">{agent.initials}</span>
          <div className="qc149c-who"><div className="mk-lc-nm" data-qc149f="name">{agent.name}</div><div className="mk-lc-ag">{agent.agency}</div></div>
          <button type="button" className="qc149f-chg" data-qc149f="change" onClick={() => setAgentId(null)}>Change</button>
        </div>
        <div className="qc149f-bkf">
          <span className="qc149c-lb">Querying</span>
          <b className="qc149f-tt" data-qc149f="book">{bookTitle}</b>
          <select className="qc149c-pksel" data-qc149f="package" aria-label="Package" value={pkgId ?? ""} onChange={(e) => pickPkg(e.target.value || null)}>
            <option value="">No package</option>
            {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="qc149f-pg2">
          <h4>What are you sending?</h4>
          <div className="qc149f-sends" data-qc149f="sends">
            {([["ql", "Query letter", ql], ["syn", "Synopsis", syn], ["sample", "First 3 chapters", sample]] as const).map(([k, l, on]) => (
              <button key={k} type="button" data-qc149f="send" data-k={k} aria-pressed={on} onClick={() => tick(k)}><i aria-hidden="true" />{l}</button>
            ))}
          </div>
          <label className="qc149c-fld"><span>Sent</span><input className="qc149c-inp" data-qc149f="sent" value={sent} aria-invalid={sentMs == null} onChange={(e) => setSent(e.target.value)} /></label>
          <label className="qc149c-fld"><span>How</span>
            <select className="qc149c-inp" data-qc149f="via" value={via} onChange={(e) => setVia(e.target.value as SubmissionMethod)}>
              {VIA.map((v) => <option key={v.k} value={v.k}>{v.label}</option>)}
            </select>
          </label>
          <label className="qc149c-fld"><span>Note</span><textarea className="qc149c-inp" data-qc149f="note" value={note} placeholder={`Anything about this query for ${first}`} onChange={(e) => setNote(e.target.value)} /></label>
          <p className="qc149c-hint">{bad ? <b className="qc149c-err">{bad}. </b> : null}Logging adds {first} to your Query Centre with the reply window from their Contact list card.</p>
        </div>
        <div className="qc149c-mft">
          <button type="button" className="qc149c-cx" data-qc149f="cancel" onClick={onClose}>Cancel</button>
          <span className="qc149c-sp" />
          <button type="button" className="qc149c-save" data-qc149f="save" disabled={!!bad || busy}
            onClick={async () => {
              if (busy || bad) return;
              setBusy(true);
              try { await onSave({ agentId: agent.id, sent: sentMs!, via, packageId: pkgId, ql, syn, sample, note: note.trim() }); } finally { setBusy(false); }
            }}>Log query</button>
        </div>
      </div>
    </div>
  );
};

export interface WhoItem { id: string; initials: string; name: string; agency: string; status: QueryStatus; statusLabel: string; you: boolean }

export const QcWhoReplied149: React.FC<{ items: WhoItem[]; onPick: (id: string) => void; onClose: () => void }> = ({ items, onPick, onClose }) => {
  const [find, setFind] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  const q = norm(find.trim());
  const shown = useMemo(() => items.filter((i) => !q || norm(`${i.name} ${i.agency}`).includes(q)), [items, q]);
  const wait = shown.filter((i) => !i.you);
  const you = shown.filter((i) => i.you);
  const row = (i: WhoItem) => (
    <button key={i.id} type="button" className="qc149f-ag" data-qc149f="who-item" data-id={i.id} data-group={i.you ? "you" : "waiting"} onClick={() => onPick(i.id)}>
      <span className="qc149f-d">{i.initials}</span><span><b>{i.name}</b><small>{i.agency}</small></span>
      <span className={`qc149f-st${i.you ? " y" : ""}`}><StatusDot status={i.status} overrideSize={13} />{i.statusLabel}</span>
    </button>
  );
  return (
    <div className="qc149f qcv-legacy" data-qc149f="who">
      <div className="mk-lc-in qc149c-in">
        <div className="mk-lc-band qc149f-band" data-qc149f="band">
          <span>Recording a response</span>
          <span className="qc149c-rt"><button type="button" className="qc149c-x" data-qc149f="close" aria-label="Close" onClick={onClose}>×</button></span>
        </div>
        <div className="qc149f-pg2">
          {/* Contact list v25 F — the moment, above the first step's label; it scrolls with the step */}
          <DrawerMoment kind="record" />
          <h4>Step 1 of 2</h4>
          <div className="qc149f-ttl">Who replied?</div>
          <label className="qc149f-srch">{SEARCH}<input ref={ref} value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find the agent" aria-label="Find the agent" /></label>
          <div className="qc149f-ags" data-qc149f="who-list">
            <div className="qc149f-grp" data-qc149f="who-group" data-group="waiting">Waiting to hear back · {wait.length}</div>
            {wait.map(row)}
            <div className="qc149f-grp" data-qc149f="who-group" data-group="you">Already with you · {you.length}</div>
            {you.map(row)}
          </div>
        </div>
        <div className="qc149c-mft">
          <button type="button" className="qc149c-cx" data-qc149f="cancel" onClick={onClose}>Cancel</button>
          <span className="qc149c-sp" />
        </div>
      </div>
    </div>
  );
};
