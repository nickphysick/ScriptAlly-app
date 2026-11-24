/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The query panel's store (Query panel v1) — how a page OTHER than the Query Centre opens a query in the
 * side panel without leaving itself.
 *
 * On the Query Centre the open query is `?q=<id>` and nothing else. Everywhere else there is no such
 * param, so a page asks here: `openQueryPanel(id, "dashboard")`. The Query Centre's component is always
 * mounted (every workspace page is), and it is the one place the query's card is composed, so it listens
 * and draws the panel over whichever page is on screen.
 *
 * Module scope, like `drawerStore`: nothing to mount means nothing to forget.
 */
import { spyJourney } from "./journeySpy";
import { drawerIntercepts, openQueryDrawer, type OpenRequest } from "./queryActions/drawerStore";
/* "agent" (Contact list v16 §F): opened from an agent's panel, on its Queries tab — the query view carries a way back */
export type PanelOrigin = "dashboard" | "feed" | "other" | "agent";
export interface PanelRequest { id: string; from: PanelOrigin }

let current: PanelRequest | null = null;
const subs = new Set<() => void>();
const tell = () => { for (const f of [...subs]) f(); };

export const currentQueryPanel = (): PanelRequest | null => current;
export function openQueryPanel(id: string, from: PanelOrigin = "other", step?: OpenRequest): void {
  /* Card journeys v1 — a task's step that is a journey on the desktop opens over the page, not in the card */
  if (step) {
    const { panel: _p, ...rest } = step; // eslint-disable-line @typescript-eslint/no-unused-vars
    const direct = { ...rest, queryId: id } as OpenRequest;
    if (drawerIntercepts(direct)) { openQueryDrawer(direct); return; }
  }
  if (!(current?.id === id && current.from === from)) {
    back = null;
    current = { id, from };
    tell();
  }
  if (step) stepWhenReady(id, step);
}

/**
 * Next up v1, Phase 3 — OPEN AT THIS STEP. The panel opens, and once ITS slot is on the page the journey is asked for
 * with `panel` set, so its form steps into the panel exactly as the Query Centre's own tray buttons do (Queries.tsx
 * `stepRow` → `pendingStepRef`). Nothing about the journey changes: the request is the task's own door, and the
 * writer confirms (or cancels, which saves nothing) in the panel. A later open, or the panel closing, drops the wait.
 */
let stepToken = 0;
const STEP_WAIT_MS = 4000;
function stepWhenReady(id: string, req: OpenRequest): void {
  const token = ++stepToken;
  if (typeof document === "undefined" || typeof requestAnimationFrame === "undefined") return;
  const sel = `[data-qp="panel"][data-qp-id="${CSS.escape(id)}"] [data-side-slot]`;
  const until = Date.now() + STEP_WAIT_MS;
  const tick = () => {
    if (token !== stepToken || current?.id !== id) return;
    if (document.querySelector(sel)) { openQueryDrawer({ ...req, queryId: id }); return; }
    if (Date.now() < until) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
/**
 * Contact list v16 §F — THE AGENT A QUERY WAS OPENED FROM. The agent's panel shows one of its queries in the query
 * panel's own view, in the same box; that view then offers "← Back to {first}" and no Agent tab (the reader came
 * from the agent). Set with the open, cleared with the close.
 */
export interface PanelBack { agentId: string; first: string }
let back: PanelBack | null = null;
export const queryPanelBack = (): PanelBack | null => back;
export function openQueryPanelFromAgent(id: string, from: PanelBack): void {
  spyJourney({ via: "query-card", mode: "open", queryId: id, back: from.first });
  back = from;
  current = { id, from: "agent" };
  tell();
}
export function closeQueryPanel(): void {
  back = null;
  if (!current) return;
  current = null;
  tell();
}
export function subscribeQueryPanel(f: () => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}


/**
 * Record a response v2 — THE ONE DOOR, NOW THE JOURNEY. Every desktop "Record a response" comes here, and the response
 * journey (queries/centre/RespondStagesPanel, mounted once for the workspace) opens over the page: at "Who replied?"
 * without a query, at "What did {First} say?" with one. The notes below are v1's (the card's composer), kept for the
 * fields' meanings, which are unchanged.
 *
 * Record a response v1, Phase 2 — THE ONE DOOR. Every desktop "Record a response" comes here.
 *   - with a query: that query's card opens in the side panel (`?q` on Queries) with its composer at "reply"; a CLOSED
 *     query's composer opens at "reopen", as the closed card's own Reopen does;
 *   - without one: the card frame opens at "Who replied?", and a pick becomes that query's card in the same panel.
 * The Query Centre's component is mounted on every workspace page and composes the card, so it listens here. While
 * nothing listens (the phone page, which keeps its own flow), the old drawer journey stands, exactly as before.
 *
 * ⚠️ ONE WRITER. The composer saves through lib/qc1522Write; `onSaved` is how a door that wants to know (the To-do
 *    task, the dashboard row, the Responses list) hears of it: called once, with the query's id, when a response the
 *    door opened is saved on that query.
 */
export interface ResponseRequest {
  queryId?: string;
  from?: PanelOrigin;
  /** the agent card a query was opened from: the card takes its place with "← Back to {first}" */
  back?: PanelBack;
  /** the door's own contract: told once a response is saved on this query */
  onSaved?: (queryId: string) => void;
  /** the answer the reply box starts on ("req": the To-do's "they asked for the partial") */
  reply?: "req" | "passed" | "rr" | "offer" | "more" | null;
}
/** the way back to an agent's card, for a response opened from it */
export const agentBack = (a: { id: string; name?: string | null; agency?: string | null }): PanelBack =>
  ({ agentId: a.id, first: (a.name ?? "").trim().split(/\s+/)[0] || (a.agency ?? "").trim() || "the agent" });
const respSubs = new Set<(r: ResponseRequest) => void>();
export function subscribeResponse(f: (r: ResponseRequest) => void): () => void {
  respSubs.add(f);
  return () => { respSubs.delete(f); };
}
/** true while the card can take the request; the phone page does not listen, so its doors keep their flow */
export const responseHosted = (): boolean => respSubs.size > 0;
let savedWaiter: { id: string | null; f: (id: string) => void } | null = null;
export function openResponse(opts: ResponseRequest = {}): boolean {
  spyJourney({ via: "response", mode: "resp", queryId: opts.queryId ?? null });
  /* the phone (nothing listens): its own flow, unchanged — the drawer's response journey */
  if (!respSubs.size) { openQueryDrawer({ mode: "resp", ...(opts.queryId ? { queryId: opts.queryId } : {}) }); return false; }
  savedWaiter = opts.onSaved ? { id: opts.queryId ?? null, f: opts.onSaved } : null;
  for (const f of [...respSubs]) f(opts);
  return true;
}
/**
 * Record a response v2 — THE PRACTICE QUERY'S WAY IN. Pip (lib/practiceQuery) is recorded by the Query Centre's guided
 * walk, which drives its own practice journey and writes nothing; the journey's host hands a Pip request to it here.
 */
let pipResponder: (() => void) | null = null;
export function setPipResponder(f: (() => void) | null): () => void {
  pipResponder = f;
  return () => { if (pipResponder === f) pipResponder = null; };
}
export function openPipResponse(): void { pipResponder?.(); }
/** the composer saved a response on `id`: the door that opened it hears once (a pick from "Who replied?" binds it) */
export function responseSaved(id: string): void {
  const w = savedWaiter;
  if (!w || (w.id && w.id !== id)) return;
  savedWaiter = null;
  w.f(id);
}

/**
 * Card journeys v1 — THE OTHER FOUR JOURNEYS' ONE DOOR. Mark sent, Close, Answer an offer and Reopen open as stepped
 * journeys in Record a response's own panel (queries/centre/RespondStagesPanel), over whatever page is on screen.
 *   fromCard  → opened from the query's own card: the card lends its place and steps back behind the journey; finishing
 *               or leaving gives the place back and the card comes forward (showing whatever the save changed)
 * While nothing listens (the phone), `openCardJourney` returns false and the door keeps its own flow. A kind not yet live
 * (lib/queryActions/cardJourneys `CARD_JOURNEY_LIVE`) is refused the same way, so each journey switches on by itself.
 */
export type CardJourneyKind = "send" | "close" | "offer" | "reopen";
export interface CardJourneyRequest {
  queryId: string;
  kind: CardJourneyKind;
  from?: PanelOrigin;
  fromCard?: boolean;
  /** the agent card a query was opened from: it comes back when the journey closes */
  back?: PanelBack;
  /** the door's own contract: told once the journey has saved on this query */
  onSaved?: (queryId: string) => void;
}
const cjSubs = new Set<(r: CardJourneyRequest) => void>();
let cjLive: (k: CardJourneyKind) => boolean = () => false;
/** the journeys' module says which kinds are live (kept out of this store so the store has no journey imports) */
export function setCardJourneyLive(f: (k: CardJourneyKind) => boolean): void { cjLive = f; }
export function subscribeCardJourney(f: (r: CardJourneyRequest) => void): () => void {
  cjSubs.add(f);
  return () => { cjSubs.delete(f); };
}
export const cardJourneyHosted = (k: CardJourneyKind): boolean => cjSubs.size > 0 && cjLive(k);
let cjWaiter: { id: string; f: (id: string) => void } | null = null;
export function openCardJourney(r: CardJourneyRequest): boolean {
  if (!cardJourneyHosted(r.kind)) return false;
  spyJourney({ via: "card-journey", mode: r.kind, queryId: r.queryId });
  cjWaiter = r.onSaved ? { id: r.queryId, f: r.onSaved } : null;
  for (const f of [...cjSubs]) f(r);
  return true;
}
/** a card journey saved on `id`: the door that opened it hears once */
export function cardJourneySaved(id: string): void {
  const w = cjWaiter;
  if (!w || w.id !== id) return;
  cjWaiter = null;
  w.f(id);
}

/**
 * ONE RIGHT-HAND PANEL AT A TIME. The query panel, the activity feed drawer and the Birds-eye drawer share
 * the window's right edge; whoever opens says so here, and the others close themselves.
 */
/* "answer": Responses v2 §D — an answer opened on the Responses page, in the same container */
/* "response": Record a response v2 — the response journey, opened over any page */
export type RightPanelOwner = "query" | "feed" | "birds" | "agent" | "answer" | "response";
let owner: RightPanelOwner | null = null;
const ownerSubs = new Set<(o: RightPanelOwner | null) => void>();
/**
 * Record a response v2.1 — LENDING THE PLACE. The owner can lend the right-hand edge for one panel over it (the response
 * journey lends it to the query's card): it stays mounted behind, the next claim sits over it, and when that one releases,
 * the lender has the place back (its subscribers hear its name, not null). A fresh claim by the lender itself takes it back.
 */
const lenders: RightPanelOwner[] = [];
export function lendRightPanel(o: RightPanelOwner): void {
  if (owner !== o || lenders.includes(o)) return;
  lenders.push(o);
}
export const isLent = (o: RightPanelOwner): boolean => lenders.includes(o);
/** the lender is leaving (or claiming afresh): it is no longer waiting for its place */
export function unlendRightPanel(o: RightPanelOwner): void {
  const i = lenders.indexOf(o);
  if (i >= 0) lenders.splice(i, 1);
}
export const rightPanelOwner = (): RightPanelOwner | null => owner;
export function claimRightPanel(o: RightPanelOwner): void {
  unlendRightPanel(o);
  if (owner === o) return;
  owner = o;
  for (const f of [...ownerSubs]) f(owner);
}
export function releaseRightPanel(o: RightPanelOwner): void {
  if (owner !== o) return;
  /* a lender waiting behind has its place back */
  owner = lenders.pop() ?? null;
  for (const f of [...ownerSubs]) f(owner);
}
export function subscribeRightPanel(f: (o: RightPanelOwner | null) => void): () => void {
  ownerSubs.add(f);
  return () => { ownerSubs.delete(f); };
}

/* The measurement harness opens the panel the way a page does, through the store. Development builds only:
   the MODE literal is replaced at build time, so a production bundle carries none of it. */
if (import.meta.env.MODE === "development" && typeof window !== "undefined") {
  (window as unknown as { __saQueryPanel?: unknown }).__saQueryPanel = { open: (id: string, from: PanelOrigin = "dashboard") => openQueryPanel(id, from), close: closeQueryPanel };
}
