/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v16 §F — THE AGENT PANEL (ref design-refs/contact-list-v16/contact-list-v16.html `#ap`). An agent
 * opens in the query panel's own container (`shell/SidePanel`, the `.qsp` dress) and masthead: browsing is light,
 * acting dims the page and wears the action drawer.
 *
 * ⚠️ ONE CONTAINER, NOT A COPY OF IT. The panel is `SidePanel` with the query panel's class (`qsp`) and the query
 *    card's own class names (`qcv-open-*`), so the box, the masthead, the tabs, the scrolling body and the footer
 *    are Query panel v2's rules. This file states only what is the agent's: the door's colour on the top edge,
 *    the links, the Profile tab's two cards, and the Queries tab's entries.
 * ⚠️ THE TOP EDGE FOLLOWS THE AGENT, NOT A QUERY: sage when they are open to queries, grey when closed,
 *    #d8cfc2 when it is not known. The stand card says where the writer's query stands.
 * ⚠️ EVERY ACTION RUNS IN THIS PANEL. A query journey steps into the panel's slot (the drawer's own mechanism,
 *    `req.panel`); Edit profile is the agent card's editor, hosted here (`host: "panel"`), so what it writes and
 *    how is the card's own. While either runs the page is dimmed and ↑ ↓ stand down.
 * ⚠️ ONE PANEL AT A TIME: it claims the right-hand panel as "agent" and closes when the feed, the Birds-eye view
 *    or another page's query panel claims it. A query opened FROM this panel is the same box changing hands, so
 *    that claim is not a reason to close.
 */
import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Activity, Agent, Query, QueryStatus } from "../../../types";
import type { AgentFacts } from "../../../lib/contactList";
import { STAGE_NAME, type QcRow } from "../../../lib/qcSummary";
import { agentInitials } from "../../../lib/agentDisplay";
import {
  SLIP_BAND, firstNameOf, materialWords, onFileSince, panelDoor, panelFoot, panelLinks, panelSlip, panelStand, standingWords,
  type PanelAct,
} from "../../../lib/agentPanel";
import { methodOf } from "../../../lib/cardDraft";
import { viaLabel } from "../../queryActions/journeys/common";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { claimRightPanel, currentQueryPanel, releaseRightPanel, subscribeRightPanel } from "../../../lib/queryPanelStore";
import { askDrawerToLeave, currentDrawerRequest, subscribeDrawer } from "../../../lib/queryActions/drawerStore";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../../lib/shortcuts";
import { formatDate } from "../../../lib/dates";
import type { AgentEditPatch, SaveAgentResult } from "../../../lib/saveAgentEdits";
import { SidePanel } from "../../shell/SidePanel";
import { agentHistory, historySummary } from "../../../lib/agentHistory";
import { AgentHistory, historyNext } from "./AgentHistory";
import { AgentPaperCard, PaperIcon, type PaperCardData, type PaperStatus } from "../../shared/AgentPaperCard";
import { materialRowsFromAgent } from "../../../lib/agentMaterials";
import { NotesThread } from "../../reading-pane/NotesThread";
import { QadHead } from "../../queryActions/QadHead";
import { Who } from "../../queryActions/controls";
import { useAgentNotes } from "../card/useAgentNotes";
import { useToast } from "../../toast/ToastProvider";
import "../../queries/queryPanelHost.css";
import "./agentPanel.css";

export type AgentPanelTab = "profile" | "queries" | "notes";

export interface AgentPanelProps {
  agent: Agent;
  facts: AgentFacts;
  /** the card's own query for the book in scope, or null */
  q: QcRow | null;
  /** every query to this agent, across all manuscripts */
  rows: readonly QcRow[];
  /** v18.2 §B — the same queries as documents, and the feed, for the History tab */
  queries: readonly Query[];
  activities: readonly Activity[];
  msTitle: string | null;
  titleOf: (manuscriptId: string) => string | null;
  /** the agent's genres as labels, with whether each is one of the book's */
  genres: { label: string; hit: boolean }[];
  nowMs: number;
  uid: string | null;
  writeAgent: (agentId: string, patch: AgentEditPatch) => Promise<SaveAgentResult>;
  tab: AgentPanelTab;
  onTab: (t: AgentPanelTab) => void;
  /** the editor is open on this agent, in this panel */
  editing: boolean;
  onClose: () => void;
  /** ↑ ↓ J K: the previous or next visible row */
  onWalk: (dir: 1 | -1) => void;
  onEdit: (tab?: AgentCardTab, focus?: AgentCardField) => void;
  onAct: (act: PanelAct) => void;
  onOpenQuery: (queryId: string) => void;
  /** ⋯: what the agent's menu offers here */
  menu: { key: string; label: string; run: () => void; danger?: boolean }[];
  /** ⋯ → Delete agent…: the facts for its confirmation, and the act */
  deleteFacts: { queries: number; history: number } | null;
  onDelete: () => Promise<void>;
  /** v18.1 §B.4 — this agent's Housekeeping gaps (Housekeeping's own items), or null */
  gaps: { n: number; words: string[] } | null;
  /** "Fill in": closes the panel and opens Housekeeping on a run over this agent */
  onFillIn: () => void;
}

/**
 * v18.1 — the app's compact switch (`.ws-app.sheet-wide`, WorkspaceShell) read for a panel that portals out of it. ⚠️ NOT
 * a `body:has(.ws-app.sheet-wide)` rule: a `:has()` keyed on body asks the browser to re-check style across the whole
 * document on DOM changes, a cost every page would pay for one font size in one panel. (It was suspected of slowing the
 * Query Centre's peek entrance, qcV1382 D1; sampling showed D1 is a frame-timing flake on both builds, so that was not
 * the reason, and this is kept for the cost alone.)
 */
const readWide = () => !!document.querySelector(".ws-app.sheet-wide");
const subscribeWide = (on: () => void) => {
  const app = document.querySelector(".ws-app");
  if (!app || typeof MutationObserver === "undefined") return () => {};
  const mo = new MutationObserver(on);
  mo.observe(app, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};

/** a missing value, said quietly: never a dashed "+ Add" pill in the panel (v18.1 §B.3) */
const Missing: React.FC<{ word?: string }> = ({ word = "Not recorded" }) => <i className="apn-miss" data-apc="missing">{word}</i>;


export const AgentPanel: React.FC<AgentPanelProps> = (p) => {
  const { agent, facts, q, rows, msTitle, nowMs, tab, editing } = p;
  const first = firstNameOf(agent);
  const name = (agent.name ?? "").trim() || (agent.agency ?? "").trim();
  const place = [(agent.name ?? "").trim() ? (agent.agency ?? "").trim() : "", (agent.city ?? "").trim()].filter(Boolean).join(" · ");
  const door = panelDoor(agent, nowMs);
  const ordered = [...rows].sort((a, b) => (b.sentMs ?? b.lastMs) - (a.sentMs ?? a.lastMs));
  const queried = [...new Set(ordered.map((r) => p.titleOf(r.manuscriptId)).filter((t): t is string => !!t))];
  const stageTag = q ? (STAGE_NAME[q.status as QueryStatus] ?? String(q.status)) : null;
  const foot = panelFoot(agent, facts, q, nowMs);
  /* v18.1 §B — where you stand, from v16's derivation; the footer table's primary is its button */
  const stand = panelStand({ agent, facts, q, title: msTitle, fitGenre: p.genres.find((g) => g.hit)?.label ?? null, nowMs });
  const slip = panelSlip(stand, foot);
  const headLinks = panelLinks(agent).filter((l) => l.key !== "mswl");
  const wishText = (agent.mswlNotes ?? "").trim() || null;
  const method = methodOf(agent.submissionMethod);
  const sendBy = method ? viaLabel(method) : null;
  const silence = agent.noResponseMeansNo === true ? "Means no" : agent.noResponseMeansNo === false ? "They reply" : null;
  const since = onFileSince(agent.dateAdded, nowMs);
  /* v18.1 — the panel IS the landing card. v18.2: its band is always the list header's slate; the slip says the state.
     `paperStatus` travels to the band as `data-kind` only. */
  const paperStatus: PaperStatus = SLIP_BAND[slip.kind];
  const statusLabel = standingWords(stand, q);
  const weeksOn = typeof agent.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0 ? agent.responseTimeWeeks : null;
  const NUMW = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const paper: PaperCardData = {
    status: paperStatus, statusLabel, stars: agent.starRating ?? null, initials: agentInitials(agent).slice(0, 2), name,
    agency: (agent.agency ?? "").trim() || null, city: (agent.city ?? "").trim() || null, weeks: weeksOn,
    genres: p.genres,
    wishlist: (agent.mswlNotes ?? "").trim() || null,
    materials: materialRowsFromAgent(agent.materialsWanted).filter((r) => r.on).map((r) => ({ label: materialWords(r), kind: r.key === "sample" ? "pages" as const : "doc" as const })),
    queries: queried.length === 0 ? "None yet" : (
      <>
        {NUMW[queried.length] ?? String(queried.length)}, for {queried.map((t, i) => <React.Fragment key={t}>{i ? ", " : ""}<i className="apc-t">{t}</i></React.Fragment>)}
        {stageTag ? <> · {stageTag.toLowerCase()}</> : null}
        {facts.stand === "you" ? <> · <i className="apc-ym" data-ap="your-move">your move</i></> : null}
      </>
    ),
  };

  const { showConfirm, showToast } = useToast();
  const { storedNotes, onAddNote, onEditNote, onDeleteNote } = useAgentNotes(agent, p.uid, p.writeAgent);
  const notes = [...storedNotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  /* v18.2 §B — History: every stored event between the writer and this agent, newest first */
  const history = agentHistory({ agent, queries: p.queries, activities: p.activities, notes, titleOf: p.titleOf, nowMs });
  const histNext = historyNext(slip.kind, stand.state, stand.heading, q?.expectedMs ?? null, nowMs);

  /* a query journey stepped into this panel (the drawer's request carries `panel`) */
  const drawerReq = useSyncExternalStore(subscribeDrawer, currentDrawerRequest, currentDrawerRequest);
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false);
  const stepping = !!drawerReq?.panel;
  const acting = stepping || editing;

  /* Escape: the journey and the editor take it first (their own layers are above this one); browsing, it closes */
  const closeRef = useRef(p.onClose);
  closeRef.current = p.onClose;
  useEscapeLayer(!acting, () => closeRef.current(), ESC_LEVEL.pageDrawer);

  /* one right-hand panel at a time */
  useEffect(() => {
    claimRightPanel("agent");
    const off = subscribeRightPanel((o) => {
      if (!o || o === "agent") return;
      /* this panel's own query view taking the box is not another panel opening */
      if (o === "query" && currentQueryPanel()?.from === "agent") return;
      closeRef.current();
    });
    return () => { off(); releaseRightPanel("agent"); if (currentDrawerRequest()?.panel) askDrawerToLeave(); };
  }, []);
  /* a journey belongs to the agent it was opened on: another row asks it to leave (parked with answers, else cancelled) */
  const firstAgent = useRef(true);
  useEffect(() => {
    if (firstAgent.current) { firstAgent.current = false; return; }
    if (currentDrawerRequest()?.panel) askDrawerToLeave();
  }, [agent.id]);

  /* ↑ ↓ J K walk the list's visible rows; not while acting, in a field, or under a menu */
  const walk = useRef({ acting, onWalk: p.onWalk });
  walk.current = { acting, onWalk: p.onWalk };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const down = matchesShortcut(SHORTCUTS.contactsDown, e), up = matchesShortcut(SHORTCUTS.contactsUp, e);
      if ((!down && !up) || walk.current.acting || isEditableTarget(e.target)) return;
      if (e.target instanceof HTMLElement && e.target.closest('[role="menu"], [role="tablist"]')) return;
      e.preventDefault();
      walk.current.onWalk(down ? 1 : -1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  /* focus arrives on the agent's name, and returns to their row when the panel closes */
  const nameRef = useRef<HTMLHeadingElement>(null);
  const idRef = useRef(agent.id);
  idRef.current = agent.id;
  useEffect(() => {
    const t = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 0);
    return () => {
      window.clearTimeout(t);
      const row = [...document.querySelectorAll<HTMLElement>(`[data-agent-card="${idRef.current}"]`)].find((e) => e.getBoundingClientRect().height > 0);
      row?.focus({ preventScroll: true });
    };
  }, []);

  /* the panel starts under the shell's bar: its bottom edge, measured (Query panel v2 §A). A zero rect is refused. */
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const bar = [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find((b) => b.getBoundingClientRect().height > 0);
      const b = bar?.getBoundingClientRect().bottom ?? 0;
      if (b > 0) setTop(Math.round(b * 10) / 10);
    };
    read();
    window.addEventListener("resize", read);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    const bar = document.querySelector(".ws-pagebar");
    if (ro && bar) ro.observe(bar);
    return () => { window.removeEventListener("resize", read); ro?.disconnect(); };
  }, []);

  /* ⋯ and its Delete confirmation */
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenuOpen(false); setConfirmDel(false); setTyped(""); }, [agent.id]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!menuRef.current?.contains(t) && !moreRef.current?.contains(t)) setMenuOpen(false); };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [menuOpen]);
  useEscapeLayer(menuOpen || confirmDel, () => { if (menuOpen) setMenuOpen(false); else setConfirmDel(false); }, ESC_LEVEL.pageModal);
  const heavy = !!p.deleteFacts && p.deleteFacts.queries > 0;
  const delReady = !heavy || typed.trim().toLowerCase() === name.toLowerCase();
  const menu = [...p.menu, { key: "delete", label: "Delete agent…", run: () => setConfirmDel(true), danger: true }];

  const tabs: { key: AgentPanelTab; label: React.ReactNode }[] = [
    { key: "profile", label: "Profile" },
    /* v18.2 §B — the Queries tab is History, with no count; its key (and `?agent=`'s) stays "queries" */
    { key: "queries", label: "History" },
    { key: "notes", label: notes.length > 0 ? <>Notes <i className="apn-tabn">{notes.length}</i></> : "Notes" },
  ];
  const escape = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

  return (
    <SidePanel label={`${name}, agent`} step={stepping} dim={acting} className="qsp apn"
      style={{ ...(top != null ? { "--qsp-top": `${top}px` } : {}), "--ap-edge": door.edge } as React.CSSProperties}
      attrs={{ "data-ap": "panel", "data-ap-id": agent.id, "data-wide": wide ? "" : undefined, "data-ap-acting": acting ? (editing ? "edit" : drawerReq?.mode ?? "step") : undefined }}>
      {editing ? (
        /* ── acting: Edit profile, in the action drawer's look. The editor itself is the agent card's, portalled
           into the slot below by its own host. ── */
        <div className="qad-root qad-root--panel is-open apn-actroot" data-ap="act" data-ap-act="edit">
          <div className="qad-drawer qad-drawer--panel" role="group" aria-label={`Edit ${first}’s profile`}>
            <QadHead from={`Back to ${first}`} onFrom={escape} eyebrow="EDIT AGENT" title={`Edit ${first}’s profile`} onClose={escape} back
              who={<Who name={name} sub={place.toUpperCase()} extra={<>
                <span className="qad-tag dark" data-ap="tag-door">{door.label.toUpperCase()}</span>
                {stageTag ? <span className="qad-tag" data-ap="tag-stage">{stageTag.toUpperCase()}</span> : null}
              </>} />} />
            <div className="apn-actslot" data-ap-act-slot="" />
          </div>
        </div>
      ) : (
        <aside className="qcv-own apn-card" data-ap="card" data-door={door.kind} data-ap-status={paperStatus} data-slip={slip.kind} data-tab={tab} data-over={foot.hot ? "true" : undefined} aria-label={name}>
          {/* v18.1 §B — the panel IS the landing card: one frame holding the band (chip, stars, ✕), the head, the tabs,
              the body and the footer. The band and the footer stay put; the head, tabs and body scroll together. */}
          <AgentPaperCard variant="panel" data={paper} className="apn-paper2" panel={{
            onClose: p.onClose, closeLabel: "Close this agent", nameRef,
            scrollAttrs: { "data-tab": tab },
            links: headLinks.length > 0 ? (
              <span className="apc-links apn-links2" data-ap="links">
                {headLinks.map((l) => (l.key === "email"
                  ? <button key={l.key} type="button" className="apn-link2" data-ap-link={l.key} onClick={() => { const said = (ok: boolean) => showToast({ message: ok ? "Email address copied." : "Couldn\u2019t copy the address." }); if (!navigator.clipboard) { said(false); return; } void navigator.clipboard.writeText(l.email).then(() => said(true), () => said(false)); }}><PaperIcon kind="mail" />Copy email</button>
                  : <a key={l.key} className="apn-link2" data-ap-link={l.key} href={l.href} target="_blank" rel="noopener noreferrer"><PaperIcon kind="web" />Website</a>))}
              </span>
            ) : null,
            tabs: (
              <div className="apn-tabs2" role="tablist" aria-label="Agent detail">
                {tabs.map((t) => (
                  <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} data-ap-tab={t.key} onClick={() => p.onTab(t.key)}>{t.label}</button>
                ))}
              </div>
            ),
            body: (
              <div className="qcv-open-tab apn-body2" role="tabpanel" data-ap="body">
                {tab === "profile" ? (
                  <>
                    <div className="apn-slip" data-ap="slip" data-kind={slip.kind} data-state={stand.state}>
                      <div className="apn-sliptop">
                        <span className="apn-sliplab" data-ap="slip-label">{slip.label}</span>
                        {stand.figure ? <span className="apn-slipfig" data-ap="slip-figure">{stand.figure}</span> : null}
                      </div>
                      <p className="apn-sliph" data-ap="slip-heading">{stand.heading}</p>
                      <p className="apn-slipt" data-ap="slip-text">{stand.paragraph.map((part, i) => (part.em ? <i key={i}>{part.text}</i> : <React.Fragment key={i}>{part.text}</React.Fragment>))}</p>
                      {stand.bar ? (
                        <div className="apn-slipbar" data-ap="slip-bar" data-hot={stand.bar.hot ? "true" : undefined}>
                          <span className="apn-sliptrack"><i style={{ width: `${Math.max(0, Math.min(100, stand.bar.pct))}%` }} /></span>
                          <span className="apn-sliplabs"><span>{stand.bar.left}</span><span>{stand.bar.right}</span></span>
                        </div>
                      ) : null}
                      {slip.primary ? (
                        <button type="button" className="apn-slipgo" data-ap="slip-go" data-act={slip.primary.act.kind === "edit" ? "edit" : slip.primary.act.mode}
                          onClick={() => { const a = slip.primary!.act; if (a.kind === "edit") p.onEdit(); else p.onAct(a); }}>{slip.primary.label}</button>
                      ) : null}
                    </div>
                    <div className="apn-secs" data-ap="sections">
                      <section className="apn-sec" data-ap-sec="genres">
                        <h5>Genres sought</h5>
                        {p.genres.length ? (
                          <span className="apc-chips" data-apc="genres">
                            {p.genres.map((g) => <span key={g.label} className={`apc-chip${g.hit ? " is-hit" : ""}`} data-hit={g.hit ? "true" : undefined}>{g.hit ? "✓ " : ""}{g.label}</span>)}
                          </span>
                        ) : <Missing />}
                      </section>
                      <section className="apn-sec" data-ap-sec="wishlist">
                        <h5>Manuscript wishlist</h5>
                        {wishText ? <p className="apn-wish2" data-apc="wishlist">{wishText}</p> : <Missing />}
                      </section>
                      <section className="apn-sec" data-ap-sec="how">
                        <h5>How to query {first}</h5>
                        <div className="apn-how" data-ap="how">
                          <div data-ap-how="send"><span>Send by</span>{sendBy ? <b>{sendBy}</b> : <Missing />}</div>
                          <div data-ap-how="replies"><span>Replies</span>{weeksOn ? <b>In about {weeksOn} week{weeksOn === 1 ? "" : "s"}</b> : <Missing word="Not stated" />}</div>
                          <div data-ap-how="silence"><span>Silence</span>{silence ? <b>{silence}</b> : <Missing word="Not stated" />}</div>
                        </div>
                      </section>
                      <section className="apn-sec" data-ap-sec="send">
                        <h5>Send them</h5>
                        {paper.materials.length ? (
                          <span className="apc-chips" data-apc="materials">
                            {paper.materials.map((m) => <span key={m.label} className="apc-mat"><PaperIcon kind={m.kind} />{m.label}</span>)}
                          </span>
                        ) : <Missing />}
                      </section>
                      <section className="apn-sec" data-ap-sec="queries">
                        <h5>Your queries</h5>
                        <p className="apc-v" data-apc="queries">{paper.queries}</p>
                      </section>
                    </div>
                    {p.gaps ? (
                      <div className="apn-gaps" data-ap="gaps" data-n={p.gaps.n}>
                        <span data-ap="gaps-text">{p.gaps.n} detail{p.gaps.n === 1 ? "" : "s"} missing {"\u2014"} {p.gaps.words.join(", ")}</span>
                        <button type="button" className="apn-gapsgo" data-ap="gaps-fill" onClick={p.onFillIn}>Fill in</button>
                      </div>
                    ) : null}
                  </>
                ) : tab === "queries" ? (
                  <AgentHistory entries={history} summary={historySummary(history, p.queries.length, first)} next={histNext} first={first}
                    nextStatus={histNext && q ? (q.status as QueryStatus) : null} queried={p.queries.length > 0} nowMs={nowMs}
                    onOpenQuery={p.onOpenQuery} />
                ) : (
                  <NotesThread
                    resetKey={agent.id}
                    notes={notes.map((n) => ({ id: n.id, entryText: n.text, createdAt: n.createdAt }))}
                    onAdd={async (text) => { await onAddNote(text); }}
                    onEdit={async (id, text) => { await onEditNote(id, text); }}
                    onDelete={(n) => showConfirm({
                      title: "Delete this note?", danger: true, confirmLabel: "Delete", cancelLabel: "Keep it",
                      body: <p style={{ margin: 0 }}>This note will be removed from {first}{"\u2019"}s record.</p>,
                      onConfirm: () => { const note = storedNotes.find((x) => x.id === n.id); if (note) void onDeleteNote(note); },
                    })}
                  />
                )}
              </div>
            ),
            /* v18.2 §B — History wears the Profile tab's footer (v18.1); Notes keeps its composer as its foot */
            foot: tab === "notes" ? null : (tab === "profile" || tab === "queries") && !confirmDel ? (
              <div className="apn-foot2" data-ap="foot">
                {since ? <span className="apn-since" data-ap="since">{since}</span> : <span />}
                <span className="apn-footr">
                  <button ref={moreRef} type="button" className="apn-more2" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`More for ${name}`} data-ap="more" onClick={() => setMenuOpen((o) => !o)}>
                    <i aria-hidden="true">···</i>
                  </button>
                  <button type="button" className="apn-edit2" data-ap="edit" onClick={() => p.onEdit()}>Edit profile</button>
                </span>
                {menuOpen && (
                  <div ref={menuRef} className="apn-menu" role="menu" data-ap="menu">
                    {menu.map((m) => (
                      <button key={m.key} type="button" role="menuitem" className={m.danger ? "is-danger" : undefined} data-ap-menu={m.key} onClick={() => { setMenuOpen(false); m.run(); }}>{m.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="apn-oldfoot">
            {/* on the Notes tab the composer is the foot (the notes thread draws it): the frame draws no foot there */}
            {confirmDel ? (
              <div className="qcv-open-doors apn-del" data-ap="delete-confirm" role="alertdialog" aria-label={`Delete ${name}?`}>
                <p>
                  {heavy
                    ? <>Delete <b>{name}</b>? Their {p.deleteFacts!.queries} quer{p.deleteFacts!.queries === 1 ? "y" : "ies"} and {p.deleteFacts!.history} history entr{p.deleteFacts!.history === 1 ? "y" : "ies"} go too. Type their name to confirm.</>
                    : <>Delete <b>{name}</b> from your Contact list? No queries go with them.</>}
                </p>
                {heavy ? <input className="apn-delin" aria-label="Type the agent's name" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus /> : null}
                <span className="apn-delacts">
                  <button type="button" className="qcv-open-cb" onClick={() => { setConfirmDel(false); setTyped(""); }}>Keep</button>
                  <button type="button" className="qcv-open-act apn-delgo" data-ap="delete-go" disabled={!delReady || deleting}
                    onClick={async () => { if (!delReady) return; setDeleting(true); await p.onDelete(); }}>Delete</button>
                </span>
              </div>
            ) : (
              <>
                <div className="qcv-open-ft" data-ap="foot">
                  <p className="qcv-open-stand apn-status"><b data-ap="status">{foot.status}</b>{foot.detail ? <span data-ap="status-detail">{foot.detail}</span> : null}</p>
                  <button ref={moreRef} type="button" className="qcv-open-more" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`More for ${name}`} data-ap="more" onClick={() => setMenuOpen((o) => !o)}>
                    <i aria-hidden="true">···</i>
                  </button>
                  {menuOpen && (
                    <div ref={menuRef} className="apn-menu" role="menu" data-ap="menu">
                      {menu.map((m) => (
                        <button key={m.key} type="button" role="menuitem" className={m.danger ? "is-danger" : undefined} data-ap-menu={m.key} onClick={() => { setMenuOpen(false); m.run(); }}>{m.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="qcv-open-doors" data-ap="doors">
                  {foot.editSecondary ? <button type="button" className="qcv-open-cb" data-ap="edit" onClick={() => p.onEdit()}>Edit profile</button> : null}
                  <button type="button" className="qcv-open-act" data-ap="primary" data-act={foot.primary.act.kind === "edit" ? "edit" : foot.primary.act.mode}
                    onClick={() => (foot.primary.act.kind === "edit" ? p.onEdit() : p.onAct(foot.primary.act))}>{foot.primary.label}</button>
                </div>
              </>
            )}
              </div>
            ),
          }} />
        </aside>
      )}
    </SidePanel>
  );
};
