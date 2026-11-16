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
import { openQueryDrawer } from "./queryActions/drawerStore";
/* "agent" (Contact list v16 §F): opened from an agent's panel, on its Queries tab — the query view carries a way back */
export type PanelOrigin = "dashboard" | "feed" | "other" | "agent";
export interface PanelRequest { id: string; from: PanelOrigin }

let current: PanelRequest | null = null;
const subs = new Set<() => void>();
const tell = () => { for (const f of [...subs]) f(); };

export const currentQueryPanel = (): PanelRequest | null => current;
export function openQueryPanel(id: string, from: PanelOrigin = "other"): void {
  if (current?.id === id && current.from === from) return;
  back = null;
  current = { id, from };
  tell();
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
  /* the phone (nothing listens): its own flow, unchanged — the drawer's response journey */
  if (!respSubs.size) { openQueryDrawer({ mode: "resp", ...(opts.queryId ? { queryId: opts.queryId } : {}) }); return false; }
  savedWaiter = opts.onSaved ? { id: opts.queryId ?? null, f: opts.onSaved } : null;
  for (const f of [...respSubs]) f(opts);
  return true;
}
/** the composer saved a response on `id`: the door that opened it hears once (a pick from "Who replied?" binds it) */
export function responseSaved(id: string): void {
  const w = savedWaiter;
  if (!w || (w.id && w.id !== id)) return;
  savedWaiter = null;
  w.f(id);
}

/**
 * ONE RIGHT-HAND PANEL AT A TIME. The query panel, the activity feed drawer and the Birds-eye drawer share
 * the window's right edge; whoever opens says so here, and the others close themselves.
 */
/* "answer": Responses v2 §D — an answer opened on the Responses page, in the same container */
export type RightPanelOwner = "query" | "feed" | "birds" | "agent" | "answer";
let owner: RightPanelOwner | null = null;
const ownerSubs = new Set<(o: RightPanelOwner | null) => void>();
export const rightPanelOwner = (): RightPanelOwner | null => owner;
export function claimRightPanel(o: RightPanelOwner): void {
  if (owner === o) return;
  owner = o;
  for (const f of [...ownerSubs]) f(owner);
}
export function releaseRightPanel(o: RightPanelOwner): void {
  if (owner !== o) return;
  owner = null;
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
