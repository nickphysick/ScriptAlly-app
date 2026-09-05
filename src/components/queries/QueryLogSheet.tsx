/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryLogSheet — the four steps of logging a query, inside the drawer's form mode
 * (log-sheet run §2; ref query-centre-v5-sticky-hero-cta.html, "Log new query").
 *
 * ⚠️ CONTROLLED, TOP TO BOTTOM. The PAGE owns the draft (the same `QueryDraft` the ghost tile and
 * the save read) and the step; this component renders one section open and the rest as pinned
 * 44px rows, and derives every summary from the draft AT RENDER — a summary stored at pin time
 * would survive a Back edit and lie.
 *
 * ⚠️ ONE MODEL FOR MATERIALS, BOTH DIRECTIONS. Step 3 renders `MaterialsFields` — the same rows
 * component the correction desk mounts — over the draft's own `MaterialRow[]`. A sheet-local copy
 * would be the two-editors drift the desk was built to end.
 *
 * ⚠️ THE TYPEAHEAD LIST IS ANCHORED THROUGH `useFixedMenu`, the house primitive — measured,
 * flipped and constrained — because the drawer's body scrolls and a child absolutely positioned
 * inside it is clipped at the scroller's edge. "Must not be clipped by any ancestor" is the
 * brief's own phrase, and a portal is the only honest answer inside a scrolling column.
 */
import React, { useMemo, useRef, useState } from "react";
import "./queryLogSheet.css";
import { useFixedMenu } from "../forms/useFixedMenu";
import { MaterialsFields } from "./CorrectionDesk";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { isTerminalStatus, queriesForAgent } from "../../lib/agentList";
import { agentPrimary, agentAgencyLine, agentInitials } from "../../lib/agentDisplay";
import { CREATE_SEND_METHODS, todayInputDate, type QueryDraft } from "../../lib/queryDraft";
import { CREATE_QTY, asksSentence, floorCopy } from "../../lib/createQty";
import { materialRowsFromAgent } from "../../lib/agentMaterials";
import { isSlotFilled } from "../../lib/packageMetrics";
import { attachablePackages } from "../../lib/packageAttach";
import type { Agent, Manuscript, Query, SubmissionPackage } from "../../types";

export interface NewAgentFields {
  name: string;
  agency: string;
  email: string;
  responseTimeWeeks: number | null;
  submissionMethod: string;
}

export interface QueryLogSheetProps {
  draft: QueryDraft;
  onDraft: (d: QueryDraft) => void;
  step: 1 | 2 | 3 | 4;
  onStep: (s: 1 | 2 | 3 | 4) => void;
  agents: Agent[];
  queries: Query[];
  manuscripts: Manuscript[];
  packages: SubmissionPackage[];
  /** The page's `addAgent` wrapper — resolves to the created agent, or null on failure. */
  onAddAgent: (a: NewAgentFields) => Promise<Agent | null>;
  /** `Open the most recent` on the agent card. */
  onOpenQuery?: (id: string) => void;
  /** the sample floor's complaint, when the writer types below it — page-held so Save can read it */
  qtyError: string | null;
  onQtyError: (e: string | null) => void;
  /**
   * §3 — the new-agent sub-card's name/agency AS TYPED, for the ghost tile. The draft cannot carry
   * them (no agent exists yet), so the hint is the seam; null the moment the sub-card closes.
   */
  onGhostHint?: (h: { name: string; agency: string } | null) => void;
}

const fmt1 = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const QueryLogSheet: React.FC<QueryLogSheetProps> = ({
  draft, onDraft, step, onStep, agents, queries, manuscripts, packages,
  onAddAgent, onOpenQuery, qtyError, onQtyError,
  onGhostHint,
}) => {
  const agent = agents.find((a) => a.id === draft.agentId) ?? null;
  const ms = manuscripts.find((m) => m.id === draft.manuscriptId) ?? null;

  /* ── step 1 · who ─────────────────────────────────────────────────────────────────────────── */
  const [q, setQ] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [newAgent, setNewAgent] = useState<NewAgentFields | null>(null);
  const [adding, setAdding] = useState(false);
  const listPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: taRef, menuStyle: listStyle } = useFixedMenu<HTMLElement>(
    listOpen, { placement: "auto", align: "left", constrain: true, menuRef: listPanelRef },
  );

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return agents.filter((a) => !needle || `${agentPrimary(a)} ${a.agency}`.toLowerCase().includes(needle));
  }, [agents, q]);

  const openCount = (a: Agent) => queries.filter((x) => x.agentId === a.id && !isTerminalStatus(x.status)).length;

  const pick = (a: Agent) => {
    setListOpen(false); setQ(""); setNewAgent(null); onGhostHint?.(null);
    onDraft({
      ...draft,
      agentId: a.id,
      sendMethod: (a.submissionMethod as QueryDraft["sendMethod"]) || draft.sendMethod,
      /* the agent's window becomes the pre-selected nudge — their window is the DEFAULT */
      reminder: typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0
        ? { kind: "preset", weeks: a.responseTimeWeeks, seeded: true }
        : draft.reminder,
    });
    onStep(2);
  };

  const addAndSelect = async () => {
    if (!newAgent || !newAgent.name.trim() || adding) return;
    setAdding(true);
    try {
      const created = await onAddAgent(newAgent);
      if (created) pick(created);
    } finally { setAdding(false); }
  };

  /* ── step 2 · when ────────────────────────────────────────────────────────────────────────── */
  const [dateOpen, setDateOpen] = useState(false);
  const datePanelRef = useRef<HTMLElement>(null);
  const { triggerRef: dateRef, menuStyle: dateStyle } = useFixedMenu<HTMLElement>(
    dateOpen, { placement: "auto", align: "left", constrain: true, menuRef: datePanelRef },
  );
  const [nudgePickOpen, setNudgePickOpen] = useState(false);
  const nudgePanelRef = useRef<HTMLElement>(null);
  const { triggerRef: nudgeRef, menuStyle: nudgeStyle } = useFixedMenu<HTMLElement>(
    nudgePickOpen, { placement: "auto", align: "left", constrain: true, menuRef: nudgePanelRef },
  );
  const win = agent && typeof agent.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0
    ? agent.responseTimeWeeks : null;
  const nudgeIso = (() => {
    const r = draft.reminder;
    if (r.kind === "none") return null;
    if (r.kind === "custom") return r.date;
    const d = new Date(`${draft.dateSent}T12:00:00`);
    d.setDate(d.getDate() + r.weeks * 7);
    return d.toISOString().slice(0, 10);
  })();

  /* ── step 3 · what ────────────────────────────────────────────────────────────────────────── */
  const [msOpen, setMsOpen] = useState(false);
  const msPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: msRef, menuStyle: msStyle } = useFixedMenu<HTMLElement>(
    msOpen, { placement: "auto", align: "left", constrain: true, menuRef: msPanelRef },
  );
  const [pkgOpen, setPkgOpen] = useState(false);
  const pkgPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: pkgRef, menuStyle: pkgStyle } = useFixedMenu<HTMLElement>(
    pkgOpen, { placement: "auto", align: "left", constrain: true, menuRef: pkgPanelRef },
  );
  const attachable = attachablePackages(packages, draft.manuscriptId);
  const attachPackage = (p: SubmissionPackage) => {
    setPkgOpen(false);
    onDraft({
      ...draft,
      packageId: p.id,
      /* the four rows from the package's three slots — bio/full cannot exist in this model, so
         "strip on write" holds by construction */
      materials: draft.materials.map((r) => {
        if (r.key === "queryLetter") return { ...r, on: isSlotFilled(p.queryLetterVersionId) };
        if (r.key === "synopsis") return { ...r, on: isSlotFilled(p.synopsisVersionId) };
        if (r.key === "sample") return { ...r, on: isSlotFilled(p.samplePagesVersionId) };
        return { ...r, on: false };
      }),
    });
  };

  const matSummary = () => {
    const on = draft.materials.filter((r) => r.on);
    if (!on.length) return "Nothing marked yet";
    return on.map((r) => {
      if (r.key === "sample" && "amount" in r && r.amount.trim()) return `First ${Number(r.amount).toLocaleString("en-GB")} ${r.unit.toLowerCase()}`;
      if (r.key === "other" && "text" in r && r.text.trim()) return r.text.trim();
      return r.name;
    }).join(" · ");
  };

  /* ── the pinned row ───────────────────────────────────────────────────────────────────────── */
  const pin = (n: 2 | 3 | 4, title: string, sum: string, done: boolean) => (
    <button type="button" className={`qls-row${done ? " qls-row--done" : ""}`} onClick={() => onStep(n)}>
      <span className="qls-num">{done ? "✓" : n}</span>
      <h5>{title}</h5>
      <span className="qls-sum">{sum}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
  );

  return (
    <div className="qls">
      {/* ══ 1 · WHO ══ */}
      {!agent ? (
        <section className="qls-sec">
          <div className="qls-sh"><span className="qls-num">1</span><h4>Who you sent it to</h4></div>
          <div className="qls-sb">
            <label className="qls-l" htmlFor="qls-agent">Agent</label>
            <div className="qls-ta">
              <div className="qls-fld qls-fld--search" ref={taRef as React.RefObject<HTMLDivElement>}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a08a78" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                <input
                  id="qls-agent"
                  placeholder="Type a name or agency"
                  value={q}
                  autoComplete="off"
                  onFocus={() => setListOpen(true)}
                  onChange={(e) => { setQ(e.target.value); setListOpen(true); setHi(0); }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, hits.length - 1)); }
                    if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                    if (e.key === "Enter" && listOpen && hits[hi]) { e.preventDefault(); pick(hits[hi]); }
                  }}
                />
              </div>
              {listOpen && (
                <div className="qls-list" ref={listPanelRef as React.RefObject<HTMLDivElement>} style={listStyle} role="listbox" aria-label="Agents">
                  {hits.map((a, i) => (
                    <button type="button" key={a.id} role="option" aria-selected={i === hi}
                      className={`qls-it${i === hi ? " qls-it--hi" : ""}`}
                      onMouseDown={(e) => { e.preventDefault(); pick(a); }}>
                      <span className="qls-chip">{agentInitials(a)}</span>
                      <span className="qls-ittx">
                        <span className="qls-itn">{agentPrimary(a)}</span>
                        <span className="qls-ita">{agentAgencyLine(a)}</span>
                      </span>
                      <span className="qls-itr">
                        {typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? `${a.responseTimeWeeks} wks` : "—"} · {a.submissionMethod || "Email"}
                        {openCount(a) > 0 && <><br />{openCount(a)} open</>}
                      </span>
                    </button>
                  ))}
                  <button type="button" className="qls-it qls-it--new"
                    onMouseDown={(e) => { e.preventDefault(); setListOpen(false); setNewAgent({ name: q.trim(), agency: "", email: "", responseTimeWeeks: null, submissionMethod: "Email" }); }}>
                    <span className="qls-chip qls-chip--new">+</span>
                    <span className="qls-ittx">
                      <span className="qls-itn">Add a new agent{q.trim() ? ` — “${q.trim()}”` : ""}</span>
                      <span className="qls-ita">name and agency now, the rest later</span>
                    </span>
                  </button>
                </div>
              )}
              {!newAgent && (
                <div className="qls-notl">Not listed?{" "}
                  <button type="button" onClick={() => { setListOpen(false); setNewAgent({ name: q.trim(), agency: "", email: "", responseTimeWeeks: null, submissionMethod: "Email" }); }}>Add a new agent</button>
                </div>
              )}
            </div>

            {newAgent && (
              <div className="qls-naf">
                <h5>Add a new agent</h5>
                <input className="qls-in" placeholder="Agent name" value={newAgent.name} aria-label="Agent name"
                  onChange={(e) => { const v = e.target.value; setNewAgent({ ...newAgent, name: v }); onGhostHint?.({ name: v, agency: newAgent.agency }); }} />
                <input className="qls-in" placeholder="Agency" value={newAgent.agency} aria-label="Agency"
                  onChange={(e) => { const v = e.target.value; setNewAgent({ ...newAgent, agency: v }); onGhostHint?.({ name: newAgent.name, agency: v }); }} />
                <input className="qls-in" placeholder="Email (optional)" value={newAgent.email} aria-label="Email"
                  onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })} />
                <div className="qls-r2">
                  <input className="qls-in" placeholder="Response wks (optional)" inputMode="numeric" aria-label="Response weeks"
                    value={newAgent.responseTimeWeeks ?? ""}
                    onChange={(e) => { const n = parseInt(e.target.value, 10); setNewAgent({ ...newAgent, responseTimeWeeks: Number.isFinite(n) && n > 0 ? n : null }); }} />
                  <div className="qls-seg" role="group" aria-label="Method">
                    {CREATE_SEND_METHODS.map((m) => (
                      <button key={m.value} type="button" className={newAgent.submissionMethod === m.value ? "on" : undefined}
                        onClick={() => setNewAgent({ ...newAgent, submissionMethod: m.value })}>{m.label}</button>
                    ))}
                  </div>
                </div>
                <div className="qls-nafb">
                  <button type="button" className="qls-fb qls-fb--ghost" onClick={() => { setNewAgent(null); onGhostHint?.(null); setListOpen(true); }}>Cancel</button>
                  <button type="button" className="qls-fb qls-fb--go" disabled={!newAgent.name.trim() || adding} onClick={() => void addAndSelect()}>Add and select</button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* the agent reference card — pinned once chosen */
        (() => {
          const mine = queriesForAgent(agent.id, queries);
          const open = mine.filter((x) => !isTerminalStatus(x.status));
          const recent = open[0] ?? null;
          const first = agentPrimary(agent).split(/\s+/)[0];
          return (
            <div className="qls-agcard">
              <div className="qls-agtop">
                <span className="qls-chip qls-chip--big">{agentInitials(agent)}</span>
                <div className="qls-agtx">
                  <div className="qls-agnm">{agentPrimary(agent)}</div>
                  <div className="qls-agag">{agentAgencyLine(agent)}</div>
                  <div className="qls-agopen">
                    {open.length
                      ? <>You have {open.length} open {open.length === 1 ? "query" : "queries"} with {first}
                          {recent && onOpenQuery && <button type="button" onClick={() => onOpenQuery(recent.id)}>Open the most recent</button>}</>
                      : <>No open queries with {first}</>}
                  </div>
                </div>
                <button type="button" className="qls-chg" onClick={() => { onDraft({ ...draft, agentId: null }); onStep(1); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                  Change
                </button>
              </div>
              <div className="qls-glance">
                <div className="qls-g"><div className="qls-gv">{win ? <><b>{win}</b> weeks</> : "not recorded"}</div><div className="qls-gk">expected response</div></div>
                <div className="qls-g"><div className="qls-gv">{agent.submissionMethod || "—"}</div><div className="qls-gk">preferred method</div></div>
                <div className="qls-g"><div className="qls-gv">{mine.length ? `${mine.length} sent before` : "never queried"}</div><div className="qls-gk">your history</div></div>
              </div>
              <div className="qls-agfoot">
                <span className="qls-pill">{agent.submissionStatus === "Open" ? "Open to submissions" : "Closed for submissions"}</span>
              </div>
            </div>
          );
        })()
      )}

      {/* ══ 2 · WHEN ══ */}
      {agent && (step === 2 ? (
        <section className="qls-sec">
          <div className="qls-sh"><span className="qls-num">2</span><h4>When you sent it</h4></div>
          <div className="qls-sb">
            <div className="qls-row2">
              <div>
                <label className="qls-l">Date sent</label>
                <button type="button" className="qls-fld" ref={dateRef as React.RefObject<HTMLButtonElement>} onClick={() => setDateOpen((o) => !o)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
                  {fmt1(draft.dateSent)}
                  {draft.dateSent === todayInputDate() && <span className="qls-sub">today</span>}
                </button>
                {dateOpen && (
                  <div className="qls-pop" ref={datePanelRef as React.RefObject<HTMLDivElement>} style={dateStyle} role="dialog" aria-label="Date sent">
                    {/* the timeline records what happened — a send cannot be tomorrow */}
                    <BrandDatePicker value={draft.dateSent} max={todayInputDate()}
                      onChange={(iso) => {
                        /* ⚠️ MOVING THE SEND CAN STRAND A CHOSEN NUDGE (datePickerHub's law,
                           ported with the journey). Keeping a custom date at or before the new
                           send schedules a chase for a parcel that had not gone; silently moving
                           it would edit a day the writer picked on purpose. It falls back to the
                           default — the agent's window when stated, else the house weeks. */
                        const stranded = draft.reminder.kind === "custom" && draft.reminder.date <= iso;
                        onDraft({
                          ...draft,
                          dateSent: iso,
                          ...(stranded ? { reminder: win != null ? { kind: "preset" as const, weeks: win } : { kind: "preset" as const, weeks: 6 } } : {}),
                        });
                        setDateOpen(false);
                      }} />
                  </div>
                )}
              </div>
              <div>
                <label className="qls-l">How you sent it</label>
                <div className="qls-seg" role="group" aria-label="How you sent it">
                  {CREATE_SEND_METHODS.map((m) => (
                    <button key={m.value} type="button" className={draft.sendMethod === m.value ? "on" : undefined}
                      onClick={() => onDraft({ ...draft, sendMethod: m.value })}>{m.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <label className="qls-l">Nudge me after</label>
            <div className="qls-chips">
              {win != null && (
                <button type="button" className={`qls-chipb qls-chipb--win${draft.reminder.kind === "preset" && draft.reminder.weeks === win ? " on" : ""}`}
                  onClick={() => onDraft({ ...draft, reminder: { kind: "preset", weeks: win } })}>
                  {win} wks <span className="qls-mono">· their window</span>
                </button>
              )}
              {[6, 8, 12].filter((w) => w !== win).map((w) => (
                <button key={w} type="button" className={`qls-chipb${draft.reminder.kind === "preset" && draft.reminder.weeks === w ? " on" : ""}`}
                  onClick={() => onDraft({ ...draft, reminder: { kind: "preset", weeks: w } })}>{w} wks</button>
              ))}
              <button type="button" ref={nudgeRef as React.RefObject<HTMLButtonElement>}
                className={`qls-chipb${draft.reminder.kind === "custom" ? " on" : ""}`}
                onClick={() => setNudgePickOpen((o) => !o)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
                {draft.reminder.kind === "custom" ? fmt1(draft.reminder.date) : "Pick a date"}
              </button>
              {nudgePickOpen && (
                <div className="qls-pop" ref={nudgePanelRef as React.RefObject<HTMLDivElement>} style={nudgeStyle} role="dialog" aria-label="Nudge date">
                  {/* ⚠️ THE HUB'S OWN LAW, PORTED WITH THE JOURNEY (datePickerHub): the nudge
                      refuses the sending day itself and everything before it — a chase for a
                      parcel that has not gone is not a reminder. Floor = sent + 1. */}
                  <BrandDatePicker value={draft.reminder.kind === "custom" ? draft.reminder.date : ""}
                    min={(() => { const d = new Date(`${draft.dateSent}T12:00:00`); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()}
                    onChange={(iso) => { onDraft({ ...draft, reminder: { kind: "custom", date: iso } }); setNudgePickOpen(false); }} />
                </div>
              )}
              <button type="button" className={`qls-chipb${draft.reminder.kind === "none" ? " on" : ""}`}
                onClick={() => onDraft({ ...draft, reminder: { kind: "none" } })}>No nudge</button>
            </div>
            <div className="qls-task">
              {nudgeIso
                ? <>A task appears on <b>{fmt1(nudgeIso)}</b>.</>
                : <>No task — you&rsquo;ll only see it in the query&rsquo;s own tracking.</>}
            </div>
            <div className="qls-nav"><button type="button" className="qls-fb qls-fb--go" onClick={() => onStep(3)}>Next: What</button></div>
          </div>
        </section>
      ) : pin(2, "When", `${fmt1(draft.dateSent)} · ${draft.sendMethod}${nudgeIso ? ` · nudge ${fmt1(nudgeIso)}` : " · no nudge"}`, step > 2))}

      {/* ══ 3 · WHAT ══ */}
      {agent && (step === 3 ? (
        <section className="qls-sec">
          <div className="qls-sh">
            <span className="qls-num">3</span><h4>What you sent</h4>
            {(() => {
              const asks = materialRowsFromAgent(agent.materialsWanted).filter((r) => r.on).map((r) => r.name.toLowerCase());
              return asks.length ? <span className="qls-hint">{asksSentence(agentPrimary(agent).split(/\s+/)[0], asks)}</span> : null;
            })()}
          </div>
          <div className="qls-sb">
            <label className="qls-l">Manuscript</label>
            <button type="button" className="qls-fld qls-msfld" ref={msRef as React.RefObject<HTMLButtonElement>} onClick={() => setMsOpen((o) => !o)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth="1.8" aria-hidden="true"><path d="M4 19V5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zm0 0a2 2 0 012-2h13" /></svg>
              {ms?.title ?? "Choose a manuscript"}
              {ms && <span className="qls-sub">{[ms.genre, ms.wordCount ? `${ms.wordCount.toLocaleString("en-GB")} words` : null].filter(Boolean).join(" · ")}</span>}
            </button>
            {msOpen && (
              <div className="qls-pop qls-menupop" ref={msPanelRef as React.RefObject<HTMLDivElement>} style={msStyle} role="listbox" aria-label="Manuscript">
                {manuscripts.map((m) => (
                  <button key={m.id} type="button" role="option" aria-selected={m.id === draft.manuscriptId}
                    className={`qls-it${m.id === draft.manuscriptId ? " qls-it--hi" : ""}`}
                    onClick={() => { onDraft({ ...draft, manuscriptId: m.id }); setMsOpen(false); }}>
                    <span className="qls-ittx"><span className="qls-itn">{m.title}</span>
                      <span className="qls-ita">{[m.genre, m.wordCount ? `${m.wordCount.toLocaleString("en-GB")} words` : null].filter(Boolean).join(" · ")}</span></span>
                  </button>
                ))}
              </div>
            )}
            <MaterialsFields rows={draft.materials}
              statedSample={(() => {
                const r = materialRowsFromAgent(agent.materialsWanted).find((x) => x.key === "sample" && x.on);
                const n = r && "amount" in r ? parseInt(r.amount, 10) : NaN;
                return Number.isFinite(n) && n > 0 ? n : null;
              })()}
              onChange={(rows) => {
              onDraft({ ...draft, materials: rows });
              /* the floor speaks HERE, in its own words, and Save reads the same flag — a typed
                 200 words stays visible under its complaint rather than being silently corrected */
              const sm = rows.find((r) => r.key === "sample");
              if (sm && sm.on && "amount" in sm && sm.amount.trim() !== "") {
                const n = Number(sm.amount);
                onQtyError(Number.isFinite(n) && n < CREATE_QTY[sm.unit].min ? floorCopy(sm.unit) : null);
              } else onQtyError(null);
            }} />
            {qtyError && <div className="qls-qerr">{qtyError}</div>}
            {attachable.length > 0 && (
              <div className="qls-pkg">
                <button type="button" ref={pkgRef as React.RefObject<HTMLButtonElement>} onClick={() => setPkgOpen((o) => !o)}>Attach a package ›</button>
                {pkgOpen && (
                  <div className="qls-pop qls-menupop" ref={pkgPanelRef as React.RefObject<HTMLDivElement>} style={pkgStyle} role="listbox" aria-label="Packages">
                    {attachable.map((p) => (
                      <button key={p.id} type="button" role="option" className="qls-it" onClick={() => attachPackage(p)}>
                        <span className="qls-ittx"><span className="qls-itn">{p.packageName}</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="qls-nav">
              <button type="button" className="qls-fb qls-fb--ghost" onClick={() => onStep(2)}>← Back</button>
              <button type="button" className="qls-fb qls-fb--go" onClick={() => onStep(4)}>Next: Notes</button>
            </div>
          </div>
        </section>
      ) : pin(3, "What", step > 3 ? `${ms?.title ?? "—"} · ${matSummary()}` : "Manuscript and materials", step > 3))}

      {/* ══ 4 · NOTES ══ */}
      {agent && (step === 4 ? (
        <section className="qls-sec">
          <div className="qls-sh"><span className="qls-num">4</span><h4>Notes</h4><span className="qls-hint">Optional — first impressions, personalisation</span></div>
          <div className="qls-sb">
            <textarea className="qls-note" placeholder="Anything worth remembering about this one…" value={draft.journal}
              aria-label="Notes" onChange={(e) => onDraft({ ...draft, journal: e.target.value })} />
            <div className="qls-nav"><button type="button" className="qls-fb qls-fb--ghost" onClick={() => onStep(3)}>← Back</button></div>
          </div>
        </section>
      ) : pin(4, "Notes", "Optional — first impressions, personalisation", false))}
    </div>
  );
};
