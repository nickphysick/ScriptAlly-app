/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — AGENTS (ref `vAgents`, `aRow`, `oAgent`, `oAdd`): "Your list | Discover"; chips All · To query ·
 * Queried; the agent sheet; adding and editing an agent as the full record, in four steps.
 *
 * ⚠️ THE FORM IS `useAgentForm` WITH THE DESKTOP JOURNEY'S OWN CONTROLS (agentPills: CountryPills, FitStars, GenreChips,
 *    WishlistArea, DoorPills, MethodPills, ResponseTime, PolicyPills, SocialField) and option lists. What to send is the
 *    app's `SampleSpecPicker` in requirement mode over the draft's own rows (`matsRows` ⇄ `matsOf`).
 * ⚠️ NO NEW WRITER. A new agent is the desktop's own record (`agentFromDraft`) through `addAgent`; an edit is the card's
 *    own save (`useAgentSave().saveDraft`, which runs `commitCardSave`), with its Undo. The duplicate check and the
 *    Also-changes offers are the form's own (`dup`, `alsoChanges`).
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { useAgentForm } from "../../agents/card/useAgentForm";
import { useAgentSave } from "../../agents/card/useAgentSave";
import { useEditOptions } from "../../agents/card/useEditOptions";
import {
  CountryPills, DoorPills, FitStars, GenreChips, MethodPills, PolicyPills, ResponseTime, SocialField, WishlistArea, fitWord,
} from "../../agents/card/agentPills";
import { SampleSpecPicker } from "../../materials/SampleSpecPicker";
import { materialRowsFromAgent, materialsWantedFromRows, type MaterialRow } from "../../../lib/agentMaterials";
import { draftOf, matsOf, matsRows, toContactDraft, type CardDraft } from "../../../lib/cardDraft";
import { alsoChanges, type EditCtx } from "../../../lib/contactEdit";
import { agentFromDraft } from "../../../lib/agentCreate";
import { undoAgentAdd } from "../../../lib/scoutStore";
import { submissionWords } from "../../../lib/qcCardStory";
import { dayMonth } from "../../../lib/dates";
import { SubmissionMethod, type Agent } from "../../../types";
import { useV3Data } from "./V3Provider";
import { V3Glyph } from "./V3Parts";
import { V3HeaderIcon } from "./V3Chrome";
import { V3I } from "./v3Icons";
import { usePhoneBandExtra } from "../phoneBandStore";
import { FlowShellV3 } from "./JourneysV3";
import { closeV3, openV3, openV3Agent, showV3Snack } from "./v3Store";
import type { V3Query } from "../../../lib/phoneV3";
import "./phoneV3.css";

const firstOf = (n: string) => (n || "").trim().split(/\s+/)[0] || "the agent";
const initials = (n: string) => (n || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const wk = (w: number) => `${w} ${w === 1 ? "week" : "weeks"}`;
const agencyWord = (a: Agent) => (a.agency ?? "").trim() || "Agency not added";

/** each agent's live (or latest) query, as the one read says it */
function queryByAgent(qs: readonly V3Query[]): Map<string, V3Query> {
  const m = new Map<string, V3Query>();
  for (const q of qs) {
    const id = (q.row.query as { agentId?: string }).agentId ?? "";
    const was = m.get(id);
    if (!was || (was.court === "closed" && q.court !== "closed") || (was.court === q.court && q.row.lastMs > was.row.lastMs)) m.set(id, q);
  }
  return m;
}

/** "What they ask for", said as tags: the agent's own asks (materialRowsFromAgent) */
export function askTags(a: Agent): string[] {
  return materialRowsFromAgent(a.materialsWanted ?? []).filter((r) => r.on).map((r) =>
    r.kind === "qty" ? `${r.amount} ${r.amount === "1" ? r.unit.toLowerCase().replace(/s$/, "") : r.unit.toLowerCase()}` : r.kind === "text" ? (r.text || "Something else") : r.name);
}

const AgentRow: React.FC<{ a: Agent; q: V3Query | null }> = ({ a, q }) => (
  <div className="pa3-row" role="button" tabIndex={0} data-pa3="arow" data-id={a.id} data-queried={q ? "1" : "0"}
    onClick={() => openV3Agent(a.id)} onKeyDown={(e) => { if (e.key === "Enter") openV3Agent(a.id); }}>
    <span className={`pa3-seal${q ? "" : " lt"}`}>{initials(a.name)}</span>
    <span className="pa3-tx">
      <span className="pa3-t">{a.name}</span>
      <span className="pa3-s">{agencyWord(a)}</span>
      <span className="pa3-s" data-pa3="afact">{q ? `${q.status} · ${q.court === "closed" ? dayMonth(q.row.lastMs) : q.day != null ? `day ${q.day}` : "not dated"}`
        : a.responseTimeWeeks ? `Replies in ${wk(a.responseTimeWeeks)}` : "No reply time saved"}</span>
    </span>
    {q ? <V3Glyph status={q.row.status} /> : (
      <button type="button" className="pa3-pill q" data-pa3="logto" onClick={(e) => { e.stopPropagation(); openV3({ type: "log", agentId: a.id }); }}>Log query</button>
    )}
  </div>
);

export const AgentsSeg: React.FC<{ on: "list" | "disc" }> = ({ on }) => {
  const navigate = useNavigate();
  return (
    <div className="pa3-seg" role="tablist" data-pa3="aseg">
      <button type="button" role="tab" aria-selected={on === "list"} className={on === "list" ? "on" : ""} onClick={() => navigate("/agents")}>Your list</button>
      <button type="button" role="tab" aria-selected={on === "disc"} className={on === "disc" ? "on" : ""} onClick={() => navigate("/agents/discover")}>Discover</button>
    </div>
  );
};

type AChip = "all" | "tq" | "qd";
export const AgentsV3: React.FC = () => {
  const v = useV3Data();
  const { agents } = v.core.db;
  const [chip, setChip] = useState<AChip>("all");
  usePhoneBandExtra("/agents", <V3HeaderIcon label="Add an agent" pa3="addagent" onClick={() => openV3({ type: "add" })}><V3I n="plus" /></V3HeaderIcon>, []);
  const byAgent = useMemo(() => queryByAgent(v.qs), [v.qs]);
  const sorted = useMemo(() => [...agents].sort((x, y) => x.name.localeCompare(y.name)), [agents]);
  const tq = sorted.filter((a) => !byAgent.has(a.id));
  const qd = sorted.filter((a) => byAgent.has(a.id));
  const CH: [AChip, string, number][] = [["all", "All", agents.length], ["tq", "To query", tq.length], ["qd", "Queried", qd.length]];
  return (
    <div className="pa3 pa3-agents" data-pa3="agents" data-chip={chip}>
      <div className="pa3-page">
        <AgentsSeg on="list" />
        <div className="pa3-chips" data-pa3="achips">
          {CH.map(([k, l, n]) => <button key={k} type="button" className={`pa3-chip${chip === k ? " on" : ""}`} data-pa3="achip" data-k={k} data-count={n} onClick={() => setChip(k)}>{l} <i>{n}</i></button>)}
        </div>
        {chip !== "qd" ? (<>
          <div className="pa3-sec"><h2 className="pa3-h2">To query</h2><span className="pa3-n">{tq.length}</span></div>
          <div className="pa3-card" data-pa3="tq">{tq.length ? tq.map((a) => <AgentRow key={a.id} a={a} q={null} />) : <div className="pa3-empty">Everyone on your list has been queried.</div>}</div>
        </>) : null}
        {chip !== "tq" ? (<>
          <div className="pa3-sec"><h2 className="pa3-h2">Queried</h2><span className="pa3-n">{qd.length}</span></div>
          <div className="pa3-card" data-pa3="qd">{qd.length ? qd.map((a) => <AgentRow key={a.id} a={a} q={byAgent.get(a.id) ?? null} />) : <div className="pa3-empty">No queries yet.</div>}</div>
        </>) : null}
      </div>
    </div>
  );
};

/* ── the agent sheet (ref `oAgent`) ── */
export const AgentSheetV3: React.FC<{ id: string }> = ({ id }) => {
  const v = useV3Data();
  const a = v.core.db.agents.find((x) => x.id === id);
  const q = useMemo(() => queryByAgent(v.qs).get(id) ?? null, [v.qs, id]);
  if (!a) return null;
  const first = firstOf(a.name);
  const asks = askTags(a);
  const door = a.submissionStatus ? String(a.submissionStatus) : "";
  return (
    <div className="pa3-sheet" role="dialog" aria-modal="true" aria-label={a.name} data-pa3="asheet" data-id={a.id}>
      <div className="pa3-grab" />
      <div className="pa3-ah">
        <div className="pa3-who">
          <span className="pa3-seal">{initials(a.name)}</span>
          <div><b>{a.name}</b><span>{agencyWord(a)}</span></div>
          <button type="button" className="pa3-ib" style={{ marginLeft: "auto" }} aria-label="Close" onClick={closeV3}><V3I n="x" /></button>
        </div>
        <div className="pa3-facts" data-pa3="facts">
          <div>Replies in<b>{a.responseTimeWeeks ? wk(a.responseTimeWeeks) : "Not saved"}</b></div>
          <div>Submissions<b>{submissionWords(a) ?? "Not saved"}</b></div>
          <div>Your query<b>{q ? q.status : "Not sent"}</b></div>
        </div>
      </div>
      <div className="pa3-pad" style={{ paddingTop: 18 }}>
        {a.starRating || (a.genres ?? []).length || a.mswlNotes ? (<>
          <div className="pa3-sec"><h2 className="pa3-h2">Fit</h2></div>
          {a.starRating ? <div className="pa3-stars" data-pa3="fit">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" tabIndex={-1} className={n <= (a.starRating ?? 0) ? "on" : ""} style={{ fontSize: 22 }} aria-hidden="true">★</button>)}<span>{fitWord(a.starRating)}</span></div> : null}
          {(a.genres ?? []).length ? <div className="pa3-tags" style={{ marginTop: 8 }}>{(a.genres ?? []).map((g) => <span key={g} className="pa3-tag">{g}</span>)}</div> : null}
          {a.mswlNotes ? <p className="pa3-note" style={{ margin: "10px 2px 0" }}>{a.mswlNotes}</p> : null}
        </>) : null}
        <div className="pa3-sec"><h2 className="pa3-h2">What {first} asks for</h2></div>
        {asks.length ? <div className="pa3-tags" data-pa3="asks">{asks.map((t) => <span key={t} className="pa3-tag">{t}</span>)}</div> : <p className="pa3-note" style={{ marginTop: 0 }}>Nothing saved yet.</p>}
        <div className="pa3-sec"><h2 className="pa3-h2">Contact</h2></div>
        <div className="pa3-card">
          <div className="pa3-kv"><span>Email</span><b>{a.email?.trim() || "Not saved"}</b></div>
          {a.website ? <div className="pa3-kv"><span>Website</span><b>{a.website}</b></div> : null}
          {door ? <div className="pa3-kv"><span>Taking queries?</span><b>{door}</b></div> : null}
          {typeof a.noResponseMeansNo === "boolean" ? <div className="pa3-kv"><span>If they don’t reply</span><b>{a.noResponseMeansNo ? "No response means no" : "They always reply"}</b></div> : null}
        </div>
        <div className="pa3-links"><button type="button" data-pa3="editagent" onClick={() => openV3({ type: "add", editId: a.id })}>Edit details</button></div>
        <div style={{ marginTop: 20 }}>
          {q ? <button type="button" className="pa3-btn q" data-pa3="open-query" onClick={() => openV3({ type: "query", id: q.id })}>Open your query</button>
            : <button type="button" className="pa3-btn" data-pa3="log-to" onClick={() => openV3({ type: "log", agentId: a.id })}>Log a query to {first}</button>}
        </div>
      </div>
    </div>
  );
};

/* ── adding and editing an agent: the full record, in four steps (ref `oAdd`) ── */
export const AgentFormV3: React.FC<{ editId?: string; name?: string }> = ({ editId, name }) => {
  const db = useScriptAllyDb();
  const v = useV3Data();
  const { agents, queries, addAgent } = db;
  const agent = editId ? agents.find((x) => x.id === editId) ?? null : null;
  const opts = useEditOptions(null);
  const editCtx: EditCtx = useMemo(() => ({ queries, agents, msGenre: null, msTitle: null, nowMs: v.now }), [queries, agents, v.now]);
  const { saveDraft } = useAgentSave({ editCtx });
  const [step, setStep] = useState(0);
  const [newId, setNewId] = useState<string | null>(null);

  const form = useAgentForm({
    mode: agent ? "edit" : "new", agent, personal: opts.personal, agents,
    prefill: !agent && name ? { name } : undefined, defaultCountry: "GB",
    alsoFor: (d: CardDraft, base: CardDraft) => (agent ? alsoChanges(agent, toContactDraft(agent, base, d), editCtx) : []),
    onLeave: closeV3,
    onSave: async (d, base) => {
      if (agent) {
        const r = await saveDraft(agent, base, d, { emit: false });
        if (!r.ok) return { ok: false, error: (r as { error: string }).error };
        const undo = r.undo;
        openV3({ type: "agent", id: agent.id });
        showV3Snack({ msg: "Changes saved", ...(undo ? { undo: async () => { await undo(); } } : {}) });
        return { ok: true };
      }
      const res = await addAgent(agentFromDraft(d));
      if (!res.success || !res.id) return { ok: false, error: res.error ?? "Couldn’t add the agent." };
      setNewId(res.id);
      const id = res.id;
      openV3({ type: "agent", id });
      const uid = db.currentUser?.id;
      showV3Snack({ msg: `${d.name.trim()} added to your list`, ...(uid ? { undo: async () => { await undoAgentAdd(uid, id); closeV3(); } } : {}) });
      return { ok: true };
    },
  });
  const { d, set } = form;
  const first = firstOf(d.name) || "them";
  const rows = useMemo(() => matsRows(d.mats), [d.mats]);
  const setRows = (r: MaterialRow[]) => set({ mats: matsOf(materialsWantedFromRows(r)) });
  const nameOk = !!d.name.trim();
  const agencyOk = !!d.agency.trim() || d.agencyUnknown;
  const ok = nameOk && agencyOk && !form.dup;
  void newId;

  const sofar: [number, string][] = [];
  if (step > 0) sofar.push([0, `${d.name.trim()}${d.agency.trim() ? `, ${d.agency.trim()}` : ""}`]);
  if (step > 1 && d.genres.length) sofar.push([1, d.genres.slice(0, 2).join(", ") + (d.genres.length > 2 ? ` +${d.genres.length - 2}` : "")]);
  if (step > 2 && d.weeks != null) sofar.push([2, wk(d.weeks)]);

  let body: React.ReactNode = null;
  if (step === 0) {
    body = (<>
      <h3 className="pa3-h3">Who are they?</h3>
      <p className="pa3-lead">Only the name and agency are needed. Add as much of the rest as you can.</p>
      <div className="pa3-lab">Name</div>
      <label className="pa3-field"><input data-pa3="aname" placeholder="Agent’s full name" value={d.name} autoComplete="off" onChange={(e) => set({ name: e.target.value })} /></label>
      {form.dup ? <div className="pa3-err" data-pa3="dup">{form.dup.name} is already on your list{form.dup.agency ? ` at ${form.dup.agency}` : ""}.</div> : null}
      <div className="pa3-lab">Agency</div>
      {d.agencyUnknown ? null : <label className="pa3-field"><input data-pa3="aagency" placeholder="Where they work" value={d.agency} autoComplete="off" onChange={(e) => set({ agency: e.target.value, ...(e.target.value.trim() ? { agencyUnknown: false } : {}) })} /></label>}
      <button type="button" className={`pa3-opt sq${d.agencyUnknown ? " on" : ""}`} style={{ minHeight: 48, fontSize: 15 }} aria-pressed={d.agencyUnknown} data-pa3="no-agency"
        onClick={() => set({ agencyUnknown: !d.agencyUnknown, ...(!d.agencyUnknown ? { agency: "" } : {}) })}>
        <span className="pa3-tx">I don’t know the agency<small>Having it on file helps you avoid querying two agents at the same agency.</small></span>
        <span className="pa3-ck"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
      </button>
      <div className="pa3-lab">Based in</div>
      <div className="pa3-aap"><CountryPills country={d.country} onCountry={(c) => set({ country: c })} /></div>
      <div className="pa3-lab">Agent fit <small>· how right are they for this book?</small></div>
      <div className="pa3-aap"><FitStars value={d.rating} onPick={(n) => set({ rating: n })} /></div>
    </>);
  } else if (step === 1) {
    body = (<>
      <h3 className="pa3-h3">What does {first} want?</h3>
      <p className="pa3-lead">Skip anything you don’t know yet.</p>
      <div className="pa3-lab">Genres</div>
      <div className="pa3-aap"><GenreChips genres={d.genres} onGenres={(g) => set({ genres: g })} options={{ ms: null, pool: opts.genrePool, personal: opts.personalLabels, all: opts.allGenres }} onNew={opts.onNewGenre} /></div>
      <div className="pa3-lab">Wishlist</div>
      <div className="pa3-aap"><WishlistArea value={d.wishlist} onValue={(w) => set({ wishlist: w })} /></div>
    </>);
  } else if (step === 2) {
    body = (<>
      <h3 className="pa3-h3">How do you query {first}?</h3>
      <div className="pa3-aap"><DoorPills door={d.door} reopens={d.reopens} nowMs={v.now} first={first} onChange={(door, reopens) => set({ door, reopens })} /></div>
      <div className="pa3-aap"><MethodPills method={d.method} other={d.methodOther} onChange={(m, other) => set({ method: m, methodOther: other })} /></div>
      <div className="pa3-lab">What to send <small>· pick all that apply</small></div>
      <div className="pa3-spk" data-pa3="want-picker">
        {(["queryLetter", "synopsis"] as const).map((k) => {
          const r = rows.find((x) => x.key === k);
          const on = !!r?.on;
          return (
            <button key={k} type="button" className={`pa3-opt sq${on ? " on" : ""}`} style={{ minHeight: 50 }} aria-pressed={on} data-pa3="want" data-k={k}
              onClick={() => setRows(rows.some((x) => x.key === k) ? rows.map((x) => (x.key === k ? ({ ...x, on: !x.on } as MaterialRow) : x)) : [...rows, k === "queryLetter" ? { key: k, kind: "binary", name: "Query letter", on: true } : { key: k, kind: "binary", name: "Synopsis", on: true, pages: "" }])}>
              <span className="pa3-tx">{k === "queryLetter" ? "Query letter" : "Synopsis"}</span><span className="pa3-ck"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
            </button>
          );
        })}
        <div className="pa3-lab" style={{ marginTop: 8 }}>Opening sample</div>
        <SampleSpecPicker rows={rows} onChange={setRows} join="or" mode="wanted" idPrefix="pa3w" />
      </div>
      <div className="pa3-lab">Response time</div>
      <div className="pa3-rt" data-pa3="art"><ResponseTime weeks={d.weeks} onWeeks={(w) => set({ weeks: w })} /></div>
      <div className="pa3-aap"><PolicyPills nrn={d.nrn} onNrn={(n) => set({ nrn: n })} /></div>
      {form.also.length ? <div className="pa3-tip" data-pa3="also"><span className="pa3-tx">{form.also.flatMap((x) => x.lines).map((l, i) => <React.Fragment key={i}>{i ? <br /> : null}{l}</React.Fragment>)}</span></div> : null}
    </>);
  } else {
    body = (<>
      <h3 className="pa3-h3">Where do you find {first}?</h3>
      <p className="pa3-lead">All optional. The email is where your nudges will go.</p>
      <div className="pa3-lab">Email</div>
      <label className="pa3-field"><input data-pa3="aemail" inputMode="email" placeholder="name@agency.co.uk" value={d.email} autoComplete="off" onChange={(e) => set({ email: e.target.value })} /></label>
      <div className="pa3-lab">Website</div>
      <label className="pa3-field"><input data-pa3="aweb" inputMode="url" placeholder="agency.co.uk" value={d.website} autoComplete="off" onChange={(e) => set({ website: e.target.value })} /></label>
      {d.method === SubmissionMethod.ONLINE_FORM || d.method === SubmissionMethod.QUERY_MANAGER || d.method === SubmissionMethod.OTHER ? (<>
        <div className="pa3-lab">Form link</div>
        <label className="pa3-field"><input data-pa3="aform" inputMode="url" placeholder="The submission form’s address" value={d.form} autoComplete="off" onChange={(e) => set({ form: e.target.value })} /></label>
      </>) : null}
      <div className="pa3-lab">MSWL</div>
      <label className="pa3-field"><input data-pa3="amswl" inputMode="url" placeholder="Their #MSWL page" value={d.mswl} autoComplete="off" onChange={(e) => set({ mswl: e.target.value })} /></label>
      <div className="pa3-lab">Social</div>
      <div className="pa3-aap"><SocialField social={d.social} onSocial={(s) => set({ social: s })} /></div>
      <div className="pa3-sec"><h2 className="pa3-h2">How {first} will look</h2></div>
      <div className="pa3-card" data-pa3="apreview"><div className="pa3-row"><span className="pa3-seal lt">{initials(d.name)}</span><span className="pa3-tx"><span className="pa3-t">{d.name.trim()}</span><span className="pa3-s">{d.agency.trim() || "Agency not added"}</span><span className="pa3-s">{d.weeks ? `Replies in ${wk(d.weeks)}` : "No reply time saved"}{d.rating ? ` · ${fitWord(d.rating)}` : ""}</span></span></div></div>
    </>);
  }
  return (
    <FlowShellV3 pa3="agent-flow" title={agent ? "Edit agent" : "Add an agent"} n={4} step={step} sofar={sofar} onJump={setStep} onBack={() => setStep((x) => Math.max(0, x - 1))}
      btn={form.saving ? "Saving…" : step === 3 ? (agent ? "Save changes" : "Add to your list") : "Continue"} ok={ok && (step < 3 || form.canSave)} busy={form.saving}
      onNext={() => (step < 3 ? setStep(step + 1) : void form.save())}
      extra={(<>
        {form.failure ? <div className="pa3-err" data-pa3="afail">{form.failure}</div> : null}
        {step < 3 && ok ? <button type="button" className="pa3-later" data-pa3="save-later" disabled={!form.canSave} onClick={() => void form.save()}>{agent ? "Save now" : "Save now and finish later"}</button> : null}
      </>)}>
      {body}
    </FlowShellV3>
  );
};

/** the overlay host's renderer for this phase's panels */
export function renderAgents(o: import("./v3Store").V3Overlay): React.ReactNode {
  if (o.type === "agent") return <AgentSheetV3 id={o.id} />;
  if (o.type === "add") return <AgentFormV3 editId={o.editId} name={o.name} />;
  return null;
}
