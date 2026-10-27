/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 Part C (design-refs/contact-list-v24/, screens 04, 05, 07) — THE AGENT CARD, built on the Query
 * Centre's query card (v149.1): the 7px white mat, the #d9c8ba inner frame, the band, the agent row, the cream box,
 * the tabs, the pane, the call box, the footer and ‹ n / M ›. It wears the query card's own classes (`qc149c`,
 * `mk-lc-*`, qcv149card.css and marketing/heroCard.css), so the two cards share one sheet and the Query Centre's does
 * not change; contactV24.css adds only what the agent card has and the query card does not.
 *
 *   band       the agent's set (With you · With the agent · Not queried yet · Closed) in the Query Centre's CARD_TONE;
 *              "Day n" while a query is live, else "Added d Mon"; ×
 *   agent row  the state disc, the name, agency · location, your rating; the stage pill once queried
 *   cream box  what they're looking for, their genres (the book's outlined), then the fit line (Part E)
 *   tabs       Profile (four facts · Contact · Also at (Part E) · You and {first}) · History · Notes
 *   call box   Your move: the Query Centre's own next move (`nextDoor`), one button. Not queried: Log a query, or
 *              "Hold off" while a colleague is live (Part E). Querying and Closed: none.
 *   footer     "Added …" (+ "· imported"), the links by set, ‹ n / M › through the visible list
 *
 * ⚠️ IT PORTALS WITH THE PANEL (document.body): no page token reaches it, so colours are literals and faces are
 *    the query card's `--mk-f-*`.
 * ⚠️ REMOVE IS THE EXISTING DELETE: the cascade through `deleteAgent` behind the quick view's own type-the-name gate
 *    (`canDestroy`), drawn in the footer.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus, type Query } from "../../../types";
import { agentPrimary } from "../../../lib/agentDisplay";
import { type AgentFacts, addedLabel } from "../../../lib/contactList";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { agentView, type FactCell } from "../../../lib/qcCardStory";
import { firstNameOf, methodAnswer } from "../../../lib/agentPanel";
import { hrefFor } from "../../../lib/quickAdd";
import { canDestroy } from "../../../lib/cascade";
import { CARD_TONE } from "../../queries/centre/QcQueryCard149";
import { socialOf } from "./ContactFilters24";
import { StateDisc } from "./ContactSheet24";
import { SET_BAND, bandRight, callBox, footLinks, FOOT_WORD, type CallBox, type Colleagues, type FootLink, type SetKey } from "../../../lib/contactV24";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import type { HistEntry } from "../../../lib/agentHistory";
import { monthLabel, monthKey } from "../../../lib/agentHistory";
import "../../queries/centre/qcv149card.css";
import "../../../marketing/heroCard.css";
import "./contactV24.css";
import { GenrePills, QueryPill, Tally } from "../../shared/agentRowParts";
import type { CardDraft } from "../../../lib/cardDraft";
import { type GenreKit, type InlineField, InlineContact, InlineGenres, InlineReplies, InlineWishlist } from "../card/InlineEdits";

/** the band's tint and ink per set: the Query Centre's CARD_TONE, and "Not queried yet" the pack's #f5f1ea / #6b5f52 */
export const SET_TONE: Record<SetKey, { bg: string; fg: string; pill: string }> = {
  you: CARD_TONE.you, agent: CARD_TONE.agent, closed: CARD_TONE.closed, none: { bg: "#f5f1ea", fg: "#6b5f52", pill: "#efeae2" },
};

const ICON = {
  mail: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l8.5 6 8.5-6" /></svg>,
  web: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  form: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>,
  at: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1" /></svg>,
  spark: <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M10 2l1.6 5.2L17 9l-5.4 1.8L10 16l-1.6-5.2L3 9l5.4-1.8z" /></svg>,
  clock: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></svg>,
  l: <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l-6 6 6 6" /></svg>,
  r: <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4l6 6-6 6" /></svg>,
};
const copy = (text: string) => { void navigator.clipboard?.writeText(text).catch(() => {}); };

export interface AgentCard24Props {
  x: AgentFacts;
  all: readonly AgentFacts[];
  nowMs: number;
  bookTitle: string | null;
  genreWord: (raw: string) => string;
  genreHit: (raw: string) => boolean;
  /** every query to this agent, on any manuscript */
  queries: readonly Query[];
  titleOf: (msId: string) => string;
  /** the agent's history entries (lib/agentHistory), newest first */
  history: readonly HistEntry[];
  index: number;
  total: number;
  onStep: (d: -1 | 1) => void;
  onClose?: () => void;
  /** a journey on a query (the call box's, Record a response) */
  onJourney: (mode: string, queryId: string) => void;
  onLog: () => void;
  onEdit: (tab?: AgentCardTab, focus?: AgentCardField) => void;
  onOpenQuery: (queryId: string) => void;
  onNotes: (text: string) => Promise<boolean>;
  /** Part E — the genre-fit line, the colleagues (null when none) */
  fit: { hit: boolean; text: string } | null;
  colleagues: Colleagues | null;
  onOpenAgent: (id: string) => void;
  /** Remove: what the delete takes with it, and the delete itself */
  deleteQueries: number;
  onDelete: () => void;
  /** Contact list v25.2 C — editing inside the card: the inline edits and the card's edit mode (absent: the card
   *  hands every edit to `onEdit`, as before) */
  edit?: CardEditKit;
  /** Contact list v25.4 D — Housekeeping's gaps for the agent: the count, and the field the edit mode opens at (null:
   *  none, and the Profile tab says nothing about gaps) */
  gaps?: { n: number; focus: AgentCardField; tab: AgentCardTab } | null;
}

/** v25.2 C — what the card needs to edit in place: the agent as a draft, the genre lists, one inline save, the edit
 *  mode, and a request from outside (a row's "+ Add", a gap, "Edit agent") to open one of them */
export interface CardEditKit {
  draft: CardDraft;
  genre: GenreKit;
  /** an inline edit's save; true when it landed (the toast is the caller's) */
  save: (change: Partial<CardDraft>) => Promise<boolean>;
  /** the card's edit mode for this agent */
  renderEdit: (o: { focus?: AgentCardField; wide?: boolean; onDone: () => void }) => React.ReactNode;
  request: { seq: number; inline?: InlineField; edit?: { focus?: AgentCardField } } | null;
}

/** where a door's field opens: in place when an inline edit holds it, else the edit mode at that field */
export function inlineFor(focus?: AgentCardField): InlineField | null {
  switch (focus) {
    case "wishlist": return "wishlist";
    case "genres": return "genres";
    case "reply": case "nrmn": return "replies";
    case "email": return "email";
    case "website": return "website";
    case "mswl": return "social";
    default: return null;
  }
}

/** the card's editing state: an inline field, or the edit mode — never both; reset when the agent changes */
export function useCardEdit(p: AgentCard24Props) {
  const [inline, setInline] = useState<InlineField | null>(null);
  const [editing, setEditing] = useState<{ focus?: AgentCardField } | null>(null);
  const id = p.x.agent.id;
  useEffect(() => { setInline(null); setEditing(null); }, [id]);
  const seq = p.edit?.request?.seq;
  useEffect(() => {
    const r = p.edit?.request;
    if (!r) return;
    if (r.inline) { setEditing(null); setInline(r.inline); } else if (r.edit) { setInline(null); setEditing(r.edit); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a request is acted on once, by its seq
  }, [seq]);
  /** a door asking for a field: in place where it can be, else the edit mode at it; the old hand-off without a kit */
  const openAt = (tab?: AgentCardTab, focus?: AgentCardField) => {
    if (!p.edit) { p.onEdit(tab, focus); return; }
    const f = inlineFor(focus);
    if (f) { setEditing(null); setInline(f); } else { setInline(null); setEditing({ focus }); }
  };
  return { inline, setInline, editing, setEditing, openAt };
}
export type CardEdit = ReturnType<typeof useCardEdit>;

/* ── the shared pieces (the wide card in full screen reuses them) ───────────────────────────────────────────── */

export function useCardModel(p: AgentCard24Props) {
  const { x, nowMs } = p;
  const a = x.agent;
  const first = firstNameOf(a);
  const tone = SET_TONE[x.stand];
  const right = bandRight(x, nowMs);
  const q = x.q;
  const view = useMemo(() => agentView(a, p.queries, p.titleOf, q?.id ?? "", nowMs), [a, p.queries, p.titleOf, q, nowMs]);
  const facts = useMemo(() => factsOf(view.facts, a, p.queries), [view, a, p.queries]);
  const call = callBox(x, first, p.fit, p.colleagues?.holdFor ?? null, nowMs);
  return { a, first, tone, right, q, view, facts, call };
}

/** the four facts, with the pack's words: the reply rule under Replies in, "Not known" for an unknown door, and how
 *  the last contact went ("by email") under Last in touch */
function factsOf(cells: readonly FactCell[], a: AgentFacts["agent"], qs: readonly Query[]): FactCell[] {
  const rule = a.noResponseMeansNo === true ? "no reply means no" : a.noResponseMeansNo === false ? "always replies" : null;
  const last = [...qs].sort((x, y) => String(y.dateSent ?? "").localeCompare(String(x.dateSent ?? "")))[0];
  const how = last?.sendMethod ? `by ${String(last.sendMethod).toLowerCase()}` : null;
  return cells.map((c) => {
    if (c.key === "reply" && c.known) return { ...c, sub: rule ?? c.sub };
    if (c.key === "door" && !c.known) return { ...c, value: "Not known" };
    if (c.key === "touch" && c.known && how) return { ...c, sub: how };
    return c;
  });
}

export const Band: React.FC<{ x: AgentFacts; right: ReturnType<typeof bandRight>; tone: { bg: string; fg: string }; onClose?: () => void }> = ({ x, right, tone, onClose }) => (
  <div className="mk-lc-band qc149c-band" data-qc149c="band" data-cl24="band" data-k={x.stand} style={{ background: tone.bg, color: tone.fg }}>
    <span data-cl24="band-word">{SET_BAND[x.stand]}</span>
    <span className="qc149c-rt">
      {right?.kind === "day" ? <span className="mk-lc-day" data-cl24="day"><span className="mk-odo-dk">Day</span> <span>{right.n}</span></span>
        : right?.kind === "added" ? <span className="cl24c-added" data-cl24="band-added">{right.text}</span> : null}
      {onClose ? <button type="button" className="qc149c-x" data-cl24="close" aria-label="Close the agent" onClick={onClose}>×</button> : null}
    </span>
  </div>
);

/* v25.2 A7 — the tally bars replace the stars: five bars and "n/5", or empty bars and "—" when unrated */
export const Stars: React.FC<{ n: number | undefined; onSet?: (n: 1 | 2 | 3 | 4 | 5) => void }> = ({ n, onSet }) => (
  <div className="cl24c-stars cl252-crate" data-cl24="rating" data-n={typeof n === "number" ? n : 0}>
    <Tally n={n} onSet={onSet} />
  </div>
);

/* v25.2 A5 — the card's header wears the row's status pill (one component, shared) */
export const StagePill: React.FC<{ x: AgentFacts; pill?: string }> = ({ x }) => (x.q && x.stand !== "none" ? (
  <QueryPill status={x.q.status} data={{ "data-cl24": "pill" }} />
) : null);

export const Wishlist: React.FC<{ p: AgentCard24Props; first: string; heading?: boolean; ed: CardEdit }> = ({ p, first, heading = true, ed }) => {
  const a = p.x.agent;
  const text = (a.mswlNotes ?? "").trim();
  const genres = a.genres ?? [];
  const k = p.edit;
  const done = () => ed.setInline(null);
  return (
    <div className="qc149c-wl cl24c-wl" data-cl24="wishlist">
      {heading ? (
        <span className="qc149c-k">What {first}’s looking for
          {k && ed.inline !== "wishlist" ? <button type="button" className="cl252-hedit" data-cl252="wish-edit" onClick={() => ed.setInline("wishlist")}>Edit</button> : null}
        </span>
      ) : null}
      {/* v25.2 C1 — the wishlist edits in place */}
      {k && ed.inline === "wishlist" ? <InlineWishlist draft={k.draft} save={k.save} onDone={done} />
        : text ? <q data-cl24="wish-text" className={k ? "cl252-wclick" : undefined} onClick={k ? () => ed.setInline("wishlist") : undefined}>{text}</q>
        : <button type="button" className="qc149c-add" data-cl24="wish-add" onClick={() => ed.openAt("want", "wishlist")}>+ Add their wishlist</button>}
      {/* v25.2 A3 — the row's genre pills, every genre, matches first; C1 — and they edit in place */}
      {k && ed.inline === "genres" ? <InlineGenres draft={k.draft} kit={k.genre} save={k.save} onDone={done} />
        : genres.length ? (
        <div className={`qc149c-gs cl252-cgs${k ? " cl252-wclick" : ""}`} data-cl24="genres" onClick={k ? (e) => { if (!(e.target as HTMLElement).closest("button")) ed.setInline("genres"); } : undefined}>
          <GenrePills genres={genres} hit={p.genreHit} word={p.genreWord} max={genres.length} className="wrap" />
          {k ? <button type="button" className="cl252-gplus" data-cl252="genre-plus" onClick={() => ed.setInline("genres")}>+ Genre</button> : null}
        </div>
      ) : <div className="qc149c-gs"><button type="button" className="qc149c-add cl24c-gadd" data-cl24="genres-add" onClick={() => ed.openAt("want", "genres")}>+ Add genres</button></div>}
      {p.fit ? <div className={`cl24c-fit${p.fit.hit ? "" : " no"}`} data-cl24="fit" data-hit={p.fit.hit ? "" : undefined}>{p.fit.text}</div> : null}
    </div>
  );
};

export const Facts: React.FC<{ facts: readonly FactCell[]; grid2?: boolean; p?: AgentCard24Props; ed?: CardEdit; first?: string }> = ({ facts, grid2, p, ed, first }) => {
  const k = p?.edit;
  /* v25.2 C1 — clicking Replies in edits the reply time and policy in place, where the facts were */
  if (k && ed?.inline === "replies") return <InlineReplies draft={k.draft} first={first ?? "them"} save={k.save} onDone={() => ed.setInline(null)} />;
  return (
    <div className={`qc149c-facts${grid2 ? " cl24c-g2" : ""}`} data-cl24="facts">
      {facts.map((f) => (
        <div key={f.key} data-cl24="fact" data-k={f.key} data-known={f.known ? "" : undefined}
          className={k && f.key === "reply" ? "cl252-fclick" : undefined} role={k && f.key === "reply" ? "button" : undefined} tabIndex={k && f.key === "reply" ? 0 : undefined}
          onClick={k && f.key === "reply" ? () => ed?.setInline("replies") : undefined}
          onKeyDown={k && f.key === "reply" ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ed?.setInline("replies"); } } : undefined}>
          <span className="qc149c-k">{f.label}</span><b>{f.value}</b>{f.sub ? <small>{f.sub}</small> : null}
        </div>
      ))}
    </div>
  );
};

export const Contact: React.FC<{ p: AgentCard24Props; first: string; heading?: boolean; ed: CardEdit }> = ({ p, first, heading = true, ed }) => {
  const a = p.x.agent;
  const email = (a.email ?? "").trim();
  const site = (a.website ?? "").trim();
  const href = site ? hrefFor(site) : null;
  const method = methodAnswer(a.submissionMethod);
  const social = socialOf(a);
  const k = p.edit;
  const form = k ? k.draft.form.trim() : "";
  const formHref = form ? hrefFor(form) : null;
  const done = () => ed.setInline(null);
  /* v25.2 C1 — "+ Add …" turns its row into an input, in place */
  const editing = (key: "email" | "website" | "form" | "social") => (k && ed.inline === key ? <InlineContact k={key} draft={k.draft} save={k.save} onDone={done} /> : null);
  return (
    <div className="qc149c-ct" data-cl24="contact">
      {heading ? <span className="qc149c-k">Contact</span> : null}
      <div className="qc149c-crow" data-cl24="ct-row" data-k="email">{ICON.mail}
        {editing("email") ?? (email ? <><span className="qc149c-cv">{email}</span><button type="button" className="qc149c-act" data-cl24="ct-act" onClick={() => copy(email)}>COPY</button></>
          : <button type="button" className="qc149c-add" data-cl24="ct-add" onClick={() => ed.openAt("who", "email")}>+ Add email</button>)}
      </div>
      <div className="qc149c-crow" data-cl24="ct-row" data-k="website">{ICON.web}
        {editing("website") ?? (site ? <><span className="qc149c-cv">{site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>{href ? <a className="qc149c-act" data-cl24="ct-act" href={href} target="_blank" rel="noreferrer noopener">OPEN</a> : null}</>
          : <button type="button" className="qc149c-add" data-cl24="ct-add" onClick={() => ed.openAt("who", "website")}>+ Add website</button>)}
      </div>
      {k ? (
        <div className="qc149c-crow" data-cl24="ct-row" data-k="form">{ICON.form}
          {editing("form") ?? (form ? <><span className="qc149c-cv">Submission form</span>{formHref ? <a className="qc149c-act" data-cl24="ct-act" href={formHref} target="_blank" rel="noreferrer noopener">OPEN</a> : null}</>
            : <button type="button" className="qc149c-add" data-cl24="ct-add" data-k="form" onClick={() => ed.setInline("form")}>+ Add submission form</button>)}
        </div>
      ) : null}
      <div className="qc149c-crow" data-cl24="ct-row" data-k="method">{ICON.form}
        {method ? <span className="qc149c-cv">{method}</span>
          : <button type="button" className="qc149c-add" data-cl24="ct-add" onClick={() => ed.openAt("work", "method")}>+ Add how {first} takes queries</button>}
      </div>
      <div className="qc149c-crow" data-cl24="ct-row" data-k="social">{ICON.at}
        {editing("social") ?? (social ? <><span className="qc149c-cv">{social}</span><button type="button" className="qc149c-act" data-cl24="ct-act" onClick={() => copy(social)}>COPY</button></>
          : <button type="button" className="qc149c-add" data-cl24="ct-add" onClick={() => (k ? ed.setInline("social") : ed.openAt("who", "mswl"))}>+ Add social</button>)}
      </div>
    </div>
  );
};

/** Part E2 — the agent's colleagues at the agency, and the warning while one is live and this agent is not */
export const AlsoAt: React.FC<{ p: AgentCard24Props }> = ({ p }) => {
  const c = p.colleagues;
  if (!c) return null;
  return (
    <div className="cl24c-agn" data-cl24="also-at">
      <span className="qc149c-k">Also at {c.agency}</span>
      <div className="cl24c-aps">
        {c.others.map((o) => (
          <button key={o.agent.id} type="button" className="cl24c-ap" data-cl24="colleague" data-id={o.agent.id} onClick={() => p.onOpenAgent(o.agent.id)}>
            <StateDisc x={o} size={28} /><span>{agentPrimary(o.agent)}</span>
            <em>{o.stand === "none" ? "not queried" : o.q ? (STAGE_NAME[o.q.status as keyof typeof STAGE_NAME] ?? String(o.q.status)).toLowerCase() : ""}</em>
          </button>
        ))}
      </div>
      {c.holdFor ? <p data-cl24="agency-warn">You’re already querying {firstNameOf(c.holdFor.agent)} here. Most agencies ask you to wait for an answer before you query a colleague.</p> : null}
    </div>
  );
};

export const YouAnd: React.FC<{ rows: ReturnType<typeof agentView>["history"]; first: string; onOpenQuery: (id: string) => void }> = ({ rows, first, onOpenQuery }) => (
  <div className="qc149c-hist" data-cl24="you-and">
    <span className="qc149c-k">You and {first}</span>
    {rows.length ? rows.map((h) => (
      <button key={h.id} type="button" className="qc149c-hrow cl24c-hrow" data-cl24="hist-row" data-id={h.id} onClick={() => onOpenQuery(h.id)}>
        <span className="qc149c-hg"><StatusDot status={h.status} overrideSize={17} /></span>
        <span className="qc149c-ht">{h.title}{h.when ? <em> · {h.when}</em> : null}</span>
        <span className={`qc149c-hs${h.current ? " cur" : ""}`}>{STAGE_NAME[h.status] ?? h.status}</span>
      </button>
    )) : <div className="cl24c-none">No queries yet.</div>}
  </div>
);

export const Call: React.FC<{ call: CallBox | null; p: AgentCard24Props; button?: boolean }> = ({ call, p, button = true }) => {
  if (!call) return null;
  return (
    <div className={`cl24c-call${call.kind === "you" ? " you" : ""}`} data-cl24="call" data-kind={call.kind}>
      {ICON.spark}
      <p><b data-cl24="call-bold">{call.bold}</b><span data-cl24="call-sub">{call.sub}</span></p>
      {button && call.kind === "you" ? <button type="button" data-cl24="call-btn" data-mode={call.door.mode} onClick={() => p.onJourney(call.door.mode, call.queryId)}>{call.button}</button> : null}
      {button && call.kind === "log" ? <button type="button" data-cl24="call-btn" data-mode="log" onClick={p.onLog}>Log a query</button> : null}
    </div>
  );
};

export const Notes: React.FC<{ p: AgentCard24Props; first: string }> = ({ p, first }) => {
  const a = p.x.agent;
  const [draft, setDraft] = useState(a.notes ?? "");
  const saved = useRef(a.notes ?? "");
  useEffect(() => { if ((a.notes ?? "") !== saved.current) { saved.current = a.notes ?? ""; setDraft(a.notes ?? ""); } }, [a.notes]);
  const commit = async () => {
    if (draft === saved.current) return;
    const was = saved.current;
    saved.current = draft;
    if (!(await p.onNotes(draft))) saved.current = was;
  };
  return (
    <textarea className="cl24c-notes" data-cl24="notes" data-nb1="notes" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => void commit()}
      placeholder={`Anything worth remembering about ${first}`} aria-label={`Notes about ${agentPrimary(a)}`} />
  );
};

export const History: React.FC<{ entries: readonly HistEntry[]; first: string; nowMs: number; onOpenQuery: (id: string) => void }> = ({ entries, first, nowMs, onOpenQuery }) => {
  if (!entries.length) return <div className="cl24c-none" data-cl24="history-empty">Nothing yet. When you query {first}, every letter, request and reply lands here.</div>;
  const out: React.ReactNode[] = [];
  let month: string | null = null;
  for (const e of entries) {
    const k = monthKey(e.ms);
    if (k !== month) { month = k; out.push(<li key={`m:${k}`} className="cl24c-hm" data-cl24="history-month">{monthLabel(e.ms, nowMs)}</li>); }
    const d = new Date(e.ms);
    out.push(
      <li key={e.id} className="cl24c-he" data-cl24="history-entry" data-ms={e.ms}>
        <span className="cl24c-hd">{d.getDate()}</span>
        <span className="cl24c-hg" aria-hidden="true">{e.status ? <StatusDot status={e.status} overrideSize={17} /> : <i className="cl24c-hdot" />}</span>
        {e.queryId ? (
          <button type="button" className="cl24c-hb" onClick={() => onOpenQuery(e.queryId!)}><b>{e.title}</b>{e.detail ? <small>{e.detail}</small> : null}{e.manuscript ? <small><i>For</i> {e.manuscript}</small> : null}</button>
        ) : <span className="cl24c-hb"><b>{e.title}</b>{e.detail ? <small>{e.detail}</small> : null}</span>}
      </li>,
    );
  }
  return <ol className="cl24c-hl" data-cl24="history">{out}</ol>;
};

/** the footer: the clock line, the links by set, ‹ n / M › */
export const Foot: React.FC<{ p: AgentCard24Props; set: SetKey; wide?: boolean; ed?: CardEdit }> = ({ p, set, wide, ed }) => {
  const a = p.x.agent;
  const added = addedLabel(a);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  useEffect(() => { setConfirm(false); setTyped(""); }, [a.id]);
  const name = (a.name ?? "").trim() || (a.agency ?? "").trim();
  const heavy = p.deleteQueries > 0;
  const ready = !heavy || canDestroy(typed.toLowerCase(), name.toLowerCase(), false);
  const q = p.x.q;
  const act = (k: FootLink) => {
    /* v25.2 C2 — "Edit agent" turns this card into the editor */
    if (k === "edit") { if (p.edit && ed) ed.setEditing({}); else p.onEdit("who"); }
    else if (k === "log") p.onLog();
    else if (k === "remove") setConfirm(true);
    else if (q && k === "record") p.onJourney("resp", q.id);
    else if (q) p.onOpenQuery(q.id);
  };
  return (
    <div className={`qc149c-ft2${wide ? " cl24w-ft" : ""}`} data-cl24="footer">
      {confirm ? (
        <div className="cl24c-del" data-cl24="remove-confirm" role="group" aria-label={`Remove ${name}`}>
          <p>Remove {name}?{heavy ? ` This deletes ${p.deleteQueries} ${p.deleteQueries === 1 ? "query" : "queries"} and their history. Type their name to confirm.` : " This can’t be undone."}</p>
          {heavy ? <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} aria-label="Type the agent’s name" data-cl24="remove-typed" /> : null}
          <span className="qc149c-sp" />
          <button type="button" data-cl24="remove-keep" onClick={() => setConfirm(false)}>Keep</button>
          <button type="button" className="go" data-cl24="remove-go" disabled={!ready} onClick={p.onDelete}>Remove</button>
        </div>
      ) : (
        <>
          {!wide ? (
            <div className="qc149c-l1">
              <span className="qc149c-w" data-cl24="added-line">{ICON.clock}<em>{added ? `Added ${added}` : "Added"}{a.importedNeedsReview ? " · imported" : ""}</em></span>
            </div>
          ) : null}
          <div className="qc149c-more qc149c-l2" data-cl24="links">
            {wide ? <span className="qc149c-w" data-cl24="added-line">{ICON.clock}<em>{added ? `Added ${added}` : "Added"}{a.importedNeedsReview ? " · imported" : ""}</em></span> : null}
            {footLinks(set).map((k) => <button key={k} type="button" data-cl24="link" data-k={k} onClick={() => act(k)}>{FOOT_WORD[k]}</button>)}
            <span className="qc149c-sp" />
            <span className="qc149c-nvb" data-cl24="nav">
              <button type="button" data-cl24="prev" aria-label="Previous agent" disabled={p.index <= 0} onClick={() => p.onStep(-1)}>{ICON.l}</button>
              <span data-cl24="pos">{p.index + 1} / {p.total}</span>
              <button type="button" data-cl24="next" aria-label="Next agent" disabled={p.index >= p.total - 1} onClick={() => p.onStep(1)}>{ICON.r}</button>
            </span>
          </div>
        </>
      )}
    </div>
  );
};

/* ── the card in the panel ──────────────────────────────────────────────────────────────────────────────────── */

export type CardTab24 = "profile" | "history" | "notes";

/** v25.4 D — the Profile tab's gap line, "{n} details missing · Fill them in →", at the top; absent at 0. The link opens
 *  the card's edit mode at the first missing field (Housekeeping's order). */
export const GapLine: React.FC<{ p: AgentCard24Props; ed: CardEdit }> = ({ p, ed }) => {
  const g = p.gaps;
  if (!g || g.n <= 0) return null;
  const go = () => { if (p.edit) { ed.setInline(null); ed.setEditing({ focus: g.focus }); } else p.onEdit(g.tab, g.focus); };
  return (
    <p className="cl254-gapl" data-cl254="gap-line" data-n={g.n}>
      {g.n} {g.n === 1 ? "detail" : "details"} missing · <button type="button" data-cl254="gap-fill" onClick={go}>Fill them in →</button>
    </p>
  );
};

export const AgentCard24: React.FC<AgentCard24Props> = (p) => {
  const m = useCardModel(p);
  const { x } = p;
  const ed = useCardEdit(p);
  const [tab, setTab] = useState<CardTab24>("profile");
  useEffect(() => { setTab("profile"); }, [x.agent.id]);
  /* an inline field on the Profile tab brings the Profile tab forward */
  useEffect(() => { if (ed.inline === "replies" || ed.inline === "email" || ed.inline === "website" || ed.inline === "form" || ed.inline === "social") setTab("profile"); }, [ed.inline]);
  /* v25.2 C2 — Edit agent: the card itself becomes the editor */
  if (p.edit && ed.editing) {
    return (
      <div className="qc149c qcv-legacy cl24c cl252-cedit" data-cl24="agent-card" data-id={x.agent.id} data-k={x.stand} data-editing="">
        <div className="mk-lc-in qc149c-in cl252-cedin">{p.edit.renderEdit({ focus: ed.editing.focus, onDone: () => ed.setEditing(null) })}</div>
      </div>
    );
  }
  return (
    <div className="qc149c qcv-legacy cl24c" data-cl24="agent-card" data-id={x.agent.id} data-k={x.stand}>
      <div className="mk-lc-in qc149c-in">
        <Band x={x} right={m.right} tone={m.tone} onClose={p.onClose} />
        <div className="mk-lc-agent qc149c-agent">
          <StateDisc x={x} size={46} />
          <div className="qc149c-who">
            <div className="mk-lc-nm qcv-open-nm" data-cl24="card-name">{agentPrimary(m.a)}</div>
            <div className="mk-lc-ag">{[(m.a.name ?? "").trim() ? (m.a.agency ?? "").trim() : "", x.loc].filter(Boolean).join(" · ")}</div>
            <Stars n={m.a.starRating} onSet={p.edit ? (n) => void p.edit!.save({ rating: n }) : undefined} />
          </div>
          <StagePill x={x} pill={m.tone.pill} />
        </div>
        <div className="cl24c-box"><Wishlist p={p} first={m.first} ed={ed} /></div>
        <div className="mk-lc-tabs qc149c-tabs" role="tablist" aria-label="The agent">
          {(["profile", "history", "notes"] as const).map((t) => (
            <button key={t} type="button" role="tab" className="qc149c-tab" data-cl24="tab" data-tab={t} aria-selected={tab === t} onClick={() => setTab(t)}>
              {t === "profile" ? "Profile" : t === "history" ? "History" : "Notes"}
            </button>
          ))}
        </div>
        <div className="qc149c-pane cl24c-pane" role="tabpanel" data-cl24="pane" data-pane={tab}>
          {tab === "profile" ? (
            <div className="qc149c-pg">
              <GapLine p={p} ed={ed} />
              <Facts facts={m.facts} p={p} ed={ed} first={m.first} />
              <Contact p={p} first={m.first} ed={ed} />
              <AlsoAt p={p} />
              <YouAnd rows={m.view.history} first={m.first} onOpenQuery={p.onOpenQuery} />
            </div>
          ) : tab === "history" ? (
            <div className="qc149c-pg"><History entries={p.history} first={m.first} nowMs={p.nowMs} onOpenQuery={p.onOpenQuery} /></div>
          ) : (
            <div className="qc149c-pg"><Notes p={p} first={m.first} /></div>
          )}
          <Call call={m.call} p={p} />
        </div>
        <Foot p={p} set={x.stand} ed={ed} />
      </div>
    </div>
  );
};

/* ── Part D · the wide card (full screen): the same card laid out wide, three columns, no tabs ──────────────────── */

const RING_TICK = <svg className="cl24w-tk" viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="#fff" stroke="#1c130f" strokeWidth="1.5" /><path d="M6.8 10.2l2.2 2.1 4.2-4.4" fill="none" stroke="#1c130f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const NEXT_RING = <svg className="cl24w-tk" viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="#fff" stroke="#a59a90" strokeWidth="1.5" strokeDasharray="2 2" /></svg>;

export interface WideExtras {
  /** the agent's materials, as chips ("Query letter", "First 3 chapters"), or none */
  materials: string[];
  /** the active book's steps for this agent (lib/contactBook `bookSteps`), and what comes next */
  steps: { key: string; status: QueryStatus; label: string; date: string; current: boolean }[];
  next: { title: string; date: string; due: boolean } | null;
}

export const AgentCardWide24: React.FC<AgentCard24Props & { extras: WideExtras }> = (p) => {
  const m = useCardModel(p);
  const { x, extras } = p;
  const ed = useCardEdit(p);
  const primary = m.call?.kind === "you" ? { label: m.call.button, run: () => p.onJourney((m.call as Extract<CallBox, { kind: "you" }>).door.mode, (m.call as Extract<CallBox, { kind: "you" }>).queryId) }
    : m.call?.kind === "log" ? { label: "Log a query", run: p.onLog }
    : x.stand === "agent" && x.q ? { label: "Record a response", run: () => p.onJourney("resp", x.q!.id) }
    : null;
  return (
    <div className="cl24w" data-cl24="wide-card" data-id={x.agent.id} data-k={x.stand}>
      <div className="qc149c qcv-legacy cl24c cl24w-c">
        <div className="mk-lc-in qc149c-in">
          <Band x={x} right={m.right} tone={m.tone} />
          <div className="cl24w-hd">
            <StateDisc x={x} size={58} />
            <div className="cl24w-who">
              <div className="cl24w-nm" data-cl24="card-name">{agentPrimary(m.a)}</div>
              <div className="cl24w-agy">{[(m.a.name ?? "").trim() ? (m.a.agency ?? "").trim() : "", x.loc].filter(Boolean).join(" · ")}</div>
              <Stars n={m.a.starRating} onSet={p.edit ? (n) => void p.edit!.save({ rating: n }) : undefined} />
            </div>
            <span className="cl24w-pillw"><StagePill x={x} pill={m.tone.pill} /></span>
            <div className="cl24w-acts">
              {primary ? <button type="button" className="p" data-cl24="wide-primary" onClick={primary.run}>{primary.label}</button> : null}
              <button type="button" className="s" data-cl24="wide-edit" data-nb1="edit" onClick={() => (p.edit ? ed.setEditing({}) : p.onEdit("who"))}>Edit agent</button>
            </div>
          </div>
          {/* v25.2 C2 — the wide card in edit mode: its four sections two by two */}
          {p.edit && ed.editing ? (
            <div className="cl24w-bd cl252-wedit" data-cl24="wide-body" data-editing="">{p.edit.renderEdit({ focus: ed.editing.focus, wide: true, onDone: () => ed.setEditing(null) })}</div>
          ) : (
          <div className="cl24w-bd" data-cl24="wide-body">
            <section className="sa" data-cl24="col" data-col="a">
              <h3>What {m.first}’s looking for</h3>
              <Wishlist p={p} first={m.first} heading={false} ed={ed} />
              <span className="qc149c-k">What to send</span>
              <div className="cl24w-mats" data-cl24="materials">
                {extras.materials.length ? extras.materials.map((t) => <span key={t}>{ICON.form}{t}</span>)
                  : <button type="button" className="mt" onClick={() => ed.openAt("want", "materials")}>+ Add what they ask for</button>}
              </div>
              <AlsoAt p={p} />
            </section>
            <section className="sb" data-cl24="col" data-col="b">
              <h3>How to reach {m.first}</h3>
              <Facts facts={m.facts} grid2 p={p} ed={ed} first={m.first} />
              <Contact p={p} first={m.first} heading={false} ed={ed} />
            </section>
            <section className="sc" data-cl24="col" data-col="c">
              <h3>You and {m.first}</h3>
              {extras.steps.length ? (
                <>
                  {p.bookTitle ? <span className="qc149c-k">{p.bookTitle}</span> : null}
                  <ol className="cl24w-steps" data-cl24="steps">
                    {extras.steps.map((s) => (
                      <li key={s.key} className={s.current ? "now" : undefined}>
                        {s.current ? <span className="cl24w-tk"><StatusDot status={s.status} overrideSize={17} /></span> : RING_TICK}
                        <span className="t">{s.label}</span><span className="d">{s.date}</span>
                      </li>
                    ))}
                    {extras.next ? <li className="next">{NEXT_RING}<span className="t">{extras.next.title}</span><span className={`d${extras.next.due ? " due" : ""}`}>{extras.next.date}</span></li> : null}
                  </ol>
                </>
              ) : m.view.history.length ? (
                /* the set is the active book's; the facts are across books — so say which book, and show the others */
                <>
                  <p className="cl24w-noq" data-cl24="noq">{p.bookTitle ? `Not queried for ${p.bookTitle} yet.` : `No queries to ${m.first} yet.`}</p>
                  <YouAnd rows={m.view.history} first={m.first} onOpenQuery={p.onOpenQuery} />
                </>
              ) : <p className="cl24w-noq" data-cl24="noq">No queries to {m.first} yet.</p>}
              <Call call={m.call} p={p} button={false} />
              <span className="qc149c-k">Notes</span>
              <Notes p={p} first={m.first} />
            </section>
          </div>
          )}
          {p.edit && ed.editing ? null : <Foot p={p} set={x.stand} wide ed={ed} />}
        </div>
      </div>
    </div>
  );
};
