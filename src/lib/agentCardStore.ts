/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ONE DOOR TO THE AGENT CARD (Agent card v1 §2; ref design-refs/agent-card-housekeeping-v7.html).
 * Every surface that opens an agent — a Contact list row, a torn slip, a Housekeeping row, a
 * data-quality task, the Query Centre — calls `openAgentCard(…)`, and "+ Add an agent" calls
 * `openNewAgentCard(…)`. The card is mounted ONCE, by App (`AgentCardHost`), and portals to
 * document.body, so it opens over whatever page the writer is on.
 *
 * ⚠️ MODULE-SCOPE, NOT A CONTEXT — drawerStore's reason: a provider must be mounted by every page
 * that opens the card, and forgetting it is a silent no-op on a button that looks live. Nothing to
 * wire means nothing to forget. The host subscribes; callers only call.
 */
import { useSyncExternalStore } from "react";
import type { Agent } from "../types";
import type { CardDraft } from "./cardDraft";

/** The editor's four tabs — the mock's own keys: Contact · Wishlist · Submissions · Notes. */
export type AgentCardTab = "who" | "want" | "work" | "notes";
/** The field a door lands on, focused. */
export type AgentCardField =
  | "name" | "agency" | "country" | "city" | "email" | "website" | "mswl"
  | "genres" | "wishlist" | "materials"
  | "reply" | "nrmn" | "method" | "door" | "reopen";
/** Where the card was opened from — it decides the entrance (grow from a row or button, or lift). */
export type AgentCardFrom = "row" | "slip" | "hk" | "task" | "qc" | "button";

export interface AgentCardOrigin { x: number; y: number; width: number; height: number }

export interface AgentCardOptions {
  tab?: AgentCardTab;
  focus?: AgentCardField;
  /** a partial draft: the editor opens with it applied and dirty (Housekeeping's carry-over) */
  prefill?: Partial<CardDraft>;
  from?: AgentCardFrom;
  /** the row's or button's box the card grows out of; absent, it fades and lifts from 8px below */
  originRect?: AgentCardOrigin | null;
  /** the opener's current order and filter — what ‹ › step through; absent, the arrows hide */
  sequence?: readonly string[];
}

export interface AgentCardRequest extends AgentCardOptions {
  /** null opens the empty editor for a new agent */
  agentId: string | null;
  /** bumps on every open, so re-opening the same agent is a new session */
  seq: number;
}

type Listener = (r: AgentCardRequest | null) => void;
let current: AgentCardRequest | null = null;
let seq = 0;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l(current));

export function openAgentCard(agentId: string, opts: AgentCardOptions = {}): void {
  current = { ...opts, agentId, seq: ++seq };
  notify();
}
export function openNewAgentCard(opts: Pick<AgentCardOptions, "originRect" | "from"> = {}): void {
  current = { ...opts, agentId: null, seq: ++seq };
  notify();
}
export function closeAgentCard(): void {
  current = null;
  notify();
}
/**
 * ‹ › — the SAME session moves to the next agent in its order. The seq does not move, so the card
 * is not re-opened (no entrance, no remount): the body slides, and the list's ring follows the
 * agent id. Ignored when nothing is open or the agent is not in the order it was opened with.
 */
export function stepAgentCard(agentId: string): void {
  if (!current || current.agentId === null || !current.sequence?.includes(agentId)) return;
  current = { ...current, agentId, tab: undefined, focus: undefined, prefill: undefined, originRect: null };
  notify();
}
export function currentAgentCard(): AgentCardRequest | null {
  return current;
}
export function subscribeAgentCard(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** The live request, re-rendering on every open and close. */
export function useAgentCardRequest(): AgentCardRequest | null {
  return useSyncExternalStore(subscribeAgentCard, currentAgentCard, currentAgentCard);
}

/* ---------- events the page listens to ----------
   The card saves, adds and deletes; the PAGE owns what follows on the list — the notice saying where
   the saved record went (and the FLIP measured with it, the agentMotion law), the ring on a new row,
   and the row collapsing behind a delete. An event rather than a prop because the host is app-level
   and the page is merely one of the places the card opens over. */
export type AgentCardEvent =
  /* `undo` is the card's whole-document Undo — the SAME closure the card's foot offers, so the list's
     notice can offer it too and the two cannot restore different things; it runs once */
  | { type: "saved"; agentId: string; before: Agent; after: Agent; undo?: () => Promise<unknown> }
  | { type: "added"; agentId: string }
  /* a save's Undo ran (from either place) — the list drops its notice's Undo */
  | { type: "undone"; agentId: string }
  /* a delete is under way: the card has shrunk into the row, which collapses (240ms) */
  | { type: "deleting"; agentId: string }
  | { type: "delete-failed"; agentId: string; name: string };

type EventListener = (e: AgentCardEvent) => void;
const eventListeners = new Set<EventListener>();
export function emitAgentCardEvent(e: AgentCardEvent): void {
  eventListeners.forEach((l) => l(e));
}
export function subscribeAgentCardEvents(l: EventListener): () => void {
  eventListeners.add(l);
  return () => { eventListeners.delete(l); };
}
