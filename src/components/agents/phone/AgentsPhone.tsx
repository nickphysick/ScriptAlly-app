/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENTS TAB ON A PHONE (Phone app v2, Part 6; ref design-refs/phone-app-v2/src/agentsv.js `screenAgents2` at
 * AGR B · AGD C, `agRow`, `discList` at ADC B, `ovAgentD` at AGS D). `/agents` and `/agents/discover` below 768px.
 *
 * ⚠️ IT DERIVES NOTHING OF ITS OWN. Your list reads the Contact list's own facts — `agentFacts` over the Query Centre's
 * rows (`buildQcRows`) for the book in scope (`resolveScopedManuscript`, the shell's key) — so "{n} on your list ·
 * {m} to query" is the Contact list's count and never follows a chip. Discover reads the Scout (`useScout`): its queue
 * in its order, its tally, its add path. The door is `doorOf`: a door nobody stated reads `DOOR_NOT_KNOWN`, never Open.
 *
 * Missing facts are left out — never a dash, never "Unknown".
 */
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { buildQcRows, STAGE_NAME, type QcRow } from "../../../lib/qcSummary";
import { agentFacts, type AgentFacts } from "../../../lib/contactList";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { openAgentCard } from "../../../lib/agentCardStore";
import { openQueryDrawer, showUndoBar } from "../../../lib/queryActions/drawerStore";
import { decisionDoc } from "../../../lib/scout";
import { usePhoneBandSlot } from "../../phone/phoneBandStore";
import { PhoneDisc } from "../../phone/PhoneDisc";
import { PI } from "../../phone/phoneIcons";
import { MobileSheet } from "../../shell/MobileSheet";
import { useScout } from "../discover1/useScout";
import { DISCOVER_LIVE } from "../../../lib/discoverShared";
import { devAid, type DevAid } from "../../../lib/discoverReviewAid";
import { notifyPrefs } from "../../../lib/accountPrefs";
import { SubmissionMethod, type Agent, type CommunityAgent } from "../../../types";
import { doorWords, howWords, replyWords } from "../../../lib/agentsPhone";
import "./agentsPhone.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
export type AgentChip = "all" | "toq" | "qd";
export const AGENT_CHIP_LABEL: Record<AgentChip, string> = { all: "All", toq: "To query", qd: "Queried" };

const initialsOf = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const domainOf = (a: Pick<Agent, "email" | "website">): string | null => {
  const e = (a.email ?? "").split("@")[1]?.trim();
  if (e) return e;
  const w = (a.website ?? "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.trim();
  return w || null;
};

/** the shared model: the Contact list's facts for the book in scope */
function useAgentFacts() {
  const { agents, queries, activities, manuscripts } = useScriptAllyDb();
  const location = useLocation();
  const scoped = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the switch's signal
  }, [manuscripts, location.key]);
  const now = useMemo(() => Date.now(), [queries, agents, activities]); // eslint-disable-line react-hooks/exhaustive-deps
  const qcRows = useMemo(() => buildQcRows(queries, agents, activities, now), [queries, agents, activities, now]);
  const facts = useMemo(() => agents.map((a) => agentFacts(a, qcRows, scoped?.id ?? null)), [agents, qcRows, scoped]);
  return { facts, scoped, now };
}

const NO_AID: DevAid = { face: null, fixture: null, memory: null, holdMs: 0 };
/** Discover's own gate (`DISCOVER_LIVE`), with the desktop's dev review aid. ⚠️ THE MODE CHECK IS AT THE CALL SITE, as
 *  in DiscoverPage, so a production build folds the aid away. While the gate is off the phone shows what the desktop
 *  shows: that the Scout is coming — no queue, no "{n} new". */
function useDiscoverFace(): { live: boolean; aid: DevAid } {
  const [aid] = useState<DevAid>(() => (import.meta.env.MODE !== "production" ? devAid() : NO_AID));
  return { live: (aid.face ?? (DISCOVER_LIVE ? "live" : "soon")) === "live", aid };
}

/* ══ Your list ══ */
export const AgentsPhone: React.FC = () => {
  const navigate = useNavigate();
  const { facts, now } = useAgentFacts();
  const toq = facts.filter((x) => x.stand === "none");
  const qd = facts.filter((x) => x.stand !== "none");
  const [chip, setChip] = useState<AgentChip>("all");
  const [open, setOpen] = useState<AgentFacts | null>(null);
  const face = useDiscoverFace();
  const scout = useScout(face.live ? face.aid : NO_AID);

  usePhoneBandSlot("/agents", (
    <div className="pa-bstats pa-agband" data-pa="agents-band">
      <span><b className="pa-num" data-pa="ag-onlist">{facts.length}</b> on your list</span>
      <span><b className="pa-num" data-pa="ag-toq">{toq.length}</b> to query</span>
    </div>
  ), [facts.length, toq.length]);

  const counts: Record<AgentChip, number> = { all: facts.length, toq: toq.length, qd: qd.length };
  const group = (title: string, list: AgentFacts[], key: string) => (list.length ? (
    <section data-pa="ag-group" data-group={key} key={key}>
      <div className="pa-rowhd">{title} <span className="n">· {list.length}</span></div>
      {list.map((x) => <AgentRow key={x.agent.id} x={x} now={now} onOpen={() => setOpen(x)} />)}
    </section>
  ) : null);

  return (
    <div className="pa-agents" data-pa="agents">
      <div className="pa-agbody">
        <Seg list onDiscover={() => navigate("/agents/discover")} newN={face.live ? scout.tally.toReview : 0} />
        <div className="pa-chips" role="group" aria-label="Show">
          {(["all", "toq", "qd"] as AgentChip[]).map((k) => (
            <button type="button" key={k} className="pa-chip" aria-pressed={chip === k} data-pa="ag-chip" data-key={k} data-count={counts[k]} onClick={() => setChip(k)}>
              {AGENT_CHIP_LABEL[k]} <b>{counts[k]}</b>
            </button>
          ))}
        </div>
        {chip !== "qd" ? group("To query", toq, "toq") : null}
        {chip !== "toq" ? group("Queried", qd, "qd") : null}
      </div>
      <AgentProfileSheet x={open} now={now} onClose={() => setOpen(null)} />
    </div>
  );
};

const Seg: React.FC<{ list: boolean; onDiscover?: () => void; onList?: () => void; newN: number }> = ({ list, onDiscover, onList, newN }) => (
  <div className="pa-seg" role="tablist" aria-label="Agents">
    <button type="button" role="tab" aria-pressed={list} aria-selected={list} data-pa="seg-list" onClick={onList}>Your list</button>
    <button type="button" role="tab" aria-pressed={!list} aria-selected={!list} data-pa="seg-discover" onClick={onDiscover}>
      Discover{newN > 0 ? <span className="pa-segsub" data-pa="disc-new"> {newN} new</span> : null}
    </button>
  </div>
);

/* ── a row (ref agRow at AGR B) ── */
const AgentRow: React.FC<{ x: AgentFacts; now: number; onOpen: () => void }> = ({ x, now, onOpen }) => {
  const a = x.agent;
  const name = (a.name || a.agency || "").trim();
  const queried = x.stand !== "none" && !!x.q;
  const facts = queried
    ? [STAGE_NAME[x.q!.status] ?? String(x.q!.status), x.q!.dayN != null ? `Day ${x.q!.dayN}` : null]
    : [replyWords(a.responseTimeWeeks), howWords(a.submissionMethod)];
  return (
    <button type="button" className="pa-agrow" data-pa="ag-row" data-id={a.id} data-stand={x.stand} data-status={queried ? x.q!.status : ""} onClick={onOpen}>
      {queried ? <PhoneDisc status={x.q!.status} size={40} /> : <span className="pa-agring" data-pa="ag-ring" aria-hidden="true">{initialsOf(name)}</span>}
      <span className="pa-mid"><span className="pa-nm">{name}</span>{a.name && a.agency ? <span className="pa-ag">{a.agency}</span> : null}</span>
      <span className="pa-rt" data-pa="ag-facts">
        {facts[0] ? <span className="pa-st" data-pa="ag-f1">{facts[0]}</span> : null}
        {facts[1] ? <span className="pa-when" data-pa="ag-f2">{facts[1]}</span> : null}
      </span>
    </button>
  );
};

/* ══ The agent profile (ref ovAgentD at AGS D: a navy head with three facts) ══ */
const AgentProfileSheet: React.FC<{ x: AgentFacts | null; now: number; onClose: () => void }> = ({ x, onClose }) => {
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const a = x?.agent;
  const first = (a?.name || a?.agency || "").trim().split(/\s+/)[0] ?? "";
  const q = x && x.stand !== "none" ? x.q : null;
  const close = () => { setMore(false); onClose(); };
  return (
    <>
      <MobileSheet open={!!x} onClose={close} ariaLabel={a?.name || "Agent"} pa={{ height: "92%", white: true, className: "pa-agsheet", grabOnNavy: true }}>
        {a && x ? (
          <div className="pa-agprof" data-pa="ag-profile" data-id={a.id}>
            <div className="pa-ahero" data-pa="ag-head">
              <div className="pa-aheadrow">
                <span className="pa-amono">{initialsOf(a.name || a.agency)}</span>
                <div className="pa-awho"><div className="pa-aname">{a.name || a.agency}</div>{a.name && a.agency ? <div className="pa-aagency">{a.agency}</div> : null}</div>
                <button type="button" className="pa-ring" aria-label="More" data-pa="ag-more" onClick={() => setMore(true)}>{PI.more}</button>
              </div>
              <div className="pa-astats" data-pa="ag-stats">
                <div data-k="reply"><b>{replyWords(a.responseTimeWeeks)?.replace(" weeks", " wks").replace(" week", " wk") ?? "Not stated"}</b><span>Reply time</span></div>
                <div data-k="how"><b>{howWords(a.submissionMethod)?.replace("By ", "").replace(/^./, (c) => c.toUpperCase()) ?? "Not stated"}</b><span>Submissions</span></div>
                <div data-k="query"><b>{q ? (STAGE_NAME[q.status] ?? String(q.status)) : "Not yet"}</b><span>Your query</span></div>
              </div>
            </div>
            <div className="pa-abody">
              <div className="pa-asec">What they’re looking for</div>
              {a.mswlNotes?.trim()
                ? <p className="pa-aquote" data-pa="ag-wish">“{a.mswlNotes.trim().replace(/[.]$/, "")}.”</p>
                : <button type="button" className="pa-addrow" data-pa="ag-add-wish" onClick={() => openAgentCard(a.id, { tab: "want", from: "button" })}>{PI.plus}Add what they’re looking for</button>}
              {a.genres?.length ? <div className="pa-pillrow" data-pa="ag-genres">{a.genres.map((g) => <span key={g} className="pa-tag">{g}</span>)}</div>
                : <button type="button" className="pa-addrow" data-pa="ag-add-genres" onClick={() => openAgentCard(a.id, { tab: "want", from: "button" })}>{PI.plus}Add their genres</button>}
              <div className="pa-asec">They ask for</div>
              {a.materialsWanted?.length ? <div className="pa-pillrow" data-pa="ag-asks">{a.materialsWanted.map((m) => <span key={m} className="pa-tag white">{m}</span>)}</div>
                : <button type="button" className="pa-addrow" data-pa="ag-add-asks" onClick={() => openAgentCard(a.id, { tab: "work", from: "button" })}>{PI.plus}Add what they ask for</button>}
              <p className="pa-asub" data-pa="ag-route">{[howWords(a.submissionMethod), domainOf(a)].filter(Boolean).join(" · ")}</p>
              <p className="pa-asub" data-pa="ag-door">{doorWords(a)}</p>
              {q ? (
                <>
                  <div className="pa-asec">Your query</div>
                  <button type="button" className="pa-agrow pa-aq" data-pa="ag-query" onClick={() => { close(); navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(q.id)}` }); }}>
                    <PhoneDisc status={q.status} size={40} />
                    <span className="pa-mid"><span className="pa-nm">{STAGE_NAME[q.status] ?? String(q.status)}</span>{q.dayN != null ? <span className="pa-ag">{`Day ${q.dayN}`}</span> : null}</span>
                    <span className="pa-chev" aria-hidden="true">{PI.chev}</span>
                  </button>
                </>
              ) : null}
              <div className="pa-asec">Your notes</div>
              {a.notePreview?.trim()
                ? <button type="button" className="pa-anote" data-pa="ag-notes" onClick={() => openAgentCard(a.id, { tab: "notes", from: "button" })}>{a.notePreview}</button>
                : <button type="button" className="pa-addrow" data-pa="ag-add-note" onClick={() => openAgentCard(a.id, { tab: "notes", from: "button" })}>{PI.plus}Add a note: who they’ve signed, what they said at an event</button>}
            </div>
            <div className="pa-afoot">
              {q
                ? <button type="button" className="pa-pri" data-pa="ag-foot" data-mode="open" onClick={() => { close(); navigate({ pathname: "/queries", search: `?q=${encodeURIComponent(q.id)}` }); }}>Open your query to {first}</button>
                : <button type="button" className="pa-pri" data-pa="ag-foot" data-mode="log" onClick={() => { close(); openQueryDrawer({ mode: "log", agentId: a.id }); }}>{PI.send}Log a query to {first}</button>}
            </div>
          </div>
        ) : null}
      </MobileSheet>
      <MobileSheet open={more && !!a} onClose={() => setMore(false)} ariaLabel="More" pa={{ height: "auto", white: true, className: "pa-agmore" }}>
        {a ? (
          <div className="pa-morelist" data-pa="ag-more-sheet">
            <button type="button" className="pa-moreitem" data-pa="ag-edit" onClick={() => { close(); openAgentCard(a.id, { from: "button" }); }}>{PI.edit}Edit</button>
            {/* Remove: the agent card's own guarded removal — the phone draws no second delete (ink, never red) */}
            <button type="button" className="pa-moreitem ink" data-pa="ag-remove" onClick={() => { close(); openAgentCard(a.id, { from: "button" }); }}>{PI.closeq}Remove from list</button>
          </div>
        ) : null}
      </MobileSheet>
    </>
  );
};

/* ══ Discover (ref discList at ADC B: like the query card) ══ */
export const DiscoverPhone: React.FC = () => {
  const navigate = useNavigate();
  const face = useDiscoverFace();
  const s = useScout(face.live ? face.aid : NO_AID);
  const db = useScriptAllyDb();
  const notified = notifyPrefs(db.currentUser?.notifyPrefs).discover;
  const [busy, setBusy] = useState<string | null>(null);
  const [peek, setPeek] = useState<CommunityAgent | null>(null);
  const { facts } = useAgentFacts();
  usePhoneBandSlot("/agents/discover", (
    <div className="pa-bstats pa-agband" data-pa="agents-band">
      <span><b className="pa-num">{facts.length}</b> on your list</span>
      <span><b className="pa-num">{facts.filter((x) => x.stand === "none").length}</b> to query</span>
    </div>
  ), [facts]);

  /* the Discover page's own add path (DiscoverPage `decide`): add, record the decision, the increment; Undo reverses both */
  const add = async (ca: CommunityAgent) => {
    const ms = s.manuscript;
    if (!s.io || !ms || busy) return;
    setBusy(ca.id);
    const before = s.decisions.find((d) => d.id === ca.id);
    const r = await s.io.add(ca, ms.title);
    if ("error" in r) { setBusy(null); showUndoBar({ message: r.error, sub: "" }); return; }
    try {
      await s.io.writeDecision({ id: ca.id, ...decisionDoc("added", Date.now(), ms.id) });
    } catch {
      await s.io.undoAdd(r.agentId, ca.id, before).catch(() => {});
      setBusy(null);
      showUndoBar({ message: "That didn’t save. Check your connection and try again.", sub: "" });
      return;
    }
    s.io.scheduleIncrement(ca.id, 8500);
    setBusy(null);
    const io = s.io;
    showUndoBar({ message: `Added ${ca.name || ca.agency} to your contact list.`, sub: "", undo: async () => { io.cancelIncrement(ca.id); await io.undoAdd(r.agentId, ca.id, before); } });
  };

  return (
    <div className="pa-agents" data-pa="discover">
      <div className="pa-agbody">
        <Seg list={false} onList={() => navigate("/agents")} newN={face.live ? s.tally.toReview : 0} />
        {!face.live ? (
          <section className="pa-dsoon" data-pa="d-soon">
            <span className="pa-dspot" aria-hidden="true">{PI.scope}</span>
            <h2 className="pa-dname">The Scout is out looking</h2>
            <p>As writers join, their agent lists build one shared catalogue. Every agent in it is checked by hand before the Scout brings you the ones who want a book like {s.manuscript?.title ?? "yours"}, with the reasons they fit. Nothing joins your contact list without you.</p>
            {/* ⚠️ ONE LEAF, `notifyPrefs.discover` — the desktop's own write (the whole map would drop Settings' other keys) */}
            <button type="button" className="pa-pri" data-pa="d-notify" aria-pressed={notified} onClick={() => { void db.updateUserPaths({ "notifyPrefs.discover": !notified }); }}>
              {notified ? <>{PI.check}We’ll tell you</> : "Tell me when it’s ready"}
            </button>
          </section>
        ) : null}
        {face.live ? <div className="pa-dintro">
          <span className="pa-dspot" aria-hidden="true">{PI.scope}</span>
          <p>Verified agents who have told the Scout they’re looking for books like {s.manuscript?.title ?? "yours"}.</p>
        </div> : null}
        {face.live ? s.queue.map((p) => {
          const ca = p.agent;
          const reply = replyWords(ca.responseTimeWeeks), how = howWords(ca.submissionMethod);
          return (
            <article key={ca.id} className="pa-dcard" data-pa="d-card" data-id={ca.id}>
              <div className="pa-dband" data-pa="d-band"><span>{PI.verified}Verified by the Scout</span><span data-pa="d-door">{doorWords(ca)}</span></div>
              <div className="pa-dbody">
                <div className="pa-drow"><span className="pa-amono sm">{initialsOf(ca.name || ca.agency)}</span><div><div className="pa-dname">{ca.name || ca.agency}</div>{ca.name && ca.agency ? <div className="pa-asub">{ca.agency}</div> : null}</div></div>
                {ca.mswlNotes?.trim() || ca.genres?.length ? (
                  <div className="pa-dwish" data-pa="d-wish">
                    <div className="pa-asub">Looking for</div>
                    {ca.mswlNotes?.trim() ? <p>{ca.mswlNotes.trim()}</p> : null}
                    {ca.genres?.length ? <div className="pa-pillrow">{ca.genres.map((g) => <span key={g} className="pa-tag white">{g}</span>)}</div> : null}
                  </div>
                ) : null}
                {reply || how ? <div className="pa-dfacts" data-pa="d-facts">{reply ? <span>{PI.clock}{reply}</span> : null}{how ? <span>{ca.submissionMethod === SubmissionMethod.EMAIL ? PI.mail : PI.globe}{how}</span> : null}</div> : null}
                <div className="pa-dacts">
                  <button type="button" className="pa-pri sm" data-pa="d-add" disabled={busy === ca.id} onClick={() => void add(ca)}>{PI.plus}Add to my agents</button>
                  <button type="button" className="pa-sec sm" data-pa="d-profile" onClick={() => setPeek(ca)}>Profile</button>
                </div>
              </div>
            </article>
          );
        }) : null}
        {face.live && !s.loading && !s.queue.length ? <p className="pa-tdnone" data-pa="d-none">No new agents for this book just now. The Scout keeps looking.</p> : null}
      </div>
      <MobileSheet open={!!peek} onClose={() => setPeek(null)} ariaLabel={peek?.name || "Agent"} pa={{ height: "auto", white: true, className: "pa-agmore" }}>
        {peek ? (
          <div className="pa-abody" data-pa="d-profile-sheet">
            <div className="pa-dname">{peek.name || peek.agency}</div>
            {peek.name && peek.agency ? <div className="pa-asub">{peek.agency}</div> : null}
            {peek.mswlNotes?.trim() ? <><div className="pa-asec">What they’re looking for</div><p className="pa-aquote">“{peek.mswlNotes.trim().replace(/[.]$/, "")}.”</p></> : null}
            {peek.materialsWanted?.length ? <><div className="pa-asec">They ask for</div><div className="pa-pillrow">{peek.materialsWanted.map((m) => <span key={m} className="pa-tag white">{m}</span>)}</div></> : null}
            <p className="pa-asub">{[howWords(peek.submissionMethod), domainOf(peek)].filter(Boolean).join(" · ")}</p>
            <p className="pa-asub">{doorWords(peek)}</p>
          </div>
        ) : null}
      </MobileSheet>
    </div>
  );
};
