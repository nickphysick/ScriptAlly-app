/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2 — WHAT THIS JOURNEY CREATED, AND WHAT GOES WHEN IT IS DISCARDED OR UNDONE. Pure: the host keeps one in
 * a ref, adds to it as the journey writes, and asks it what to remove.
 *
 *   an agent added in the journey ("Add and carry on"), with its "Finish {name}'s card" task
 *   a "Send your query to {name}" task ("Not sent yet? Put it on your to-do list"), at most one per agent
 *   the agents a query was logged for
 *
 * ⚠️ AN AGENT THE JOURNEY CREATED IS KEPT ONLY WHILE SOMETHING USES IT: a logged query, or a not-sent task the writer
 *    chose to keep. Discard removes every other one; Undo of a query removes its agent when nothing else holds it.
 * ⚠️ AN AGENT THE DUPLICATE CHECK MERGED INTO is the writer's existing record: it is never recorded here, so it is never
 *    removed (`addAgent` hands back the twin's id; the host records only an id that was not on the list before).
 */
export interface CreatedAgent { id: string; taskId: string | null }
export interface HeldTask { agentId: string; taskId: string }
export interface JourneyCreated {
  agents: readonly CreatedAgent[];
  held: readonly HeldTask[];
  /** agents with a logged query that has not been undone (one entry per logged query) */
  logged: readonly string[];
}
export const emptyCreated = (): JourneyCreated => ({ agents: [], held: [], logged: [] });

export const withAgent = (c: JourneyCreated, id: string, taskId: string | null): JourneyCreated =>
  c.agents.some((a) => a.id === id) ? c : { ...c, agents: [...c.agents, { id, taskId }] };
export const createdHere = (c: JourneyCreated, id: string | null): boolean => !!id && c.agents.some((a) => a.id === id);

/** the not-sent task already made for this agent, if any — so pressing the link again never makes a second */
export const heldTaskFor = (c: JourneyCreated, agentId: string): string | null => c.held.find((h) => h.agentId === agentId)?.taskId ?? null;
export const withHeld = (c: JourneyCreated, agentId: string, taskId: string): JourneyCreated =>
  heldTaskFor(c, agentId) ? c : { ...c, held: [...c.held, { agentId, taskId }] };
export const withoutHeld = (c: JourneyCreated, agentId: string): JourneyCreated => ({ ...c, held: c.held.filter((h) => h.agentId !== agentId) });

export const withLogged = (c: JourneyCreated, agentId: string): JourneyCreated => ({ ...c, logged: [...c.logged, agentId] });
export function withoutLogged(c: JourneyCreated, agentId: string): JourneyCreated {
  const i = c.logged.lastIndexOf(agentId);
  return i < 0 ? c : { ...c, logged: [...c.logged.slice(0, i), ...c.logged.slice(i + 1)] };
}

const inUse = (c: JourneyCreated, id: string) => c.logged.includes(id) || c.held.some((h) => h.agentId === id);

/** Discard (or close): the agents this journey created that nothing uses — each with its task, which the agent's own
 *  delete cascade takes with it (lib/cascade: an agent's stored tasks go with the agent) */
export function toRemoveOnDiscard(c: JourneyCreated): CreatedAgent[] {
  return c.agents.filter((a) => !inUse(c, a.id));
}

/** Undo of the query logged for `agentId`: that agent, when this journey created it and nothing else now uses it */
export function toRemoveOnUndo(c: JourneyCreated, agentId: string): CreatedAgent | null {
  const after = withoutLogged(c, agentId);
  const a = after.agents.find((x) => x.id === agentId);
  return a && !inUse(after, agentId) ? a : null;
}
/** what is left to track once those are gone */
export const withoutAgent = (c: JourneyCreated, id: string): JourneyCreated =>
  ({ agents: c.agents.filter((a) => a.id !== id), held: c.held.filter((h) => h.agentId !== id), logged: c.logged.filter((x) => x !== id) });

/* ── v2.1 · Phase 4 — the held task brings the writer back ─────────────────────────────────────────────────────── */

/** the not-sent task's words — the one writer (LogStagesHost `onNotSent`) and the one reader (`heldSendDoor`) share them */
export const HELD_PREFIX = "Send your query to ";
export const heldTaskText = (agentName: string): string => `${HELD_PREFIX}${agentName}`;
export interface HeldDoor { mode: "log"; agentId: string; manuscriptId: string }
/**
 * "I've sent it": the Log a query door a held task carries — Log a query for that agent and book, which opens at Sent
 * with the agent chosen. Derived from the task's own fields (no new stored field: the rules' `hasOnly()` has none to
 * spare): an open task linked to an agent and a book, to no query, in the words the journey wrote.
 * ⚠️ A writer who renames the task loses the button (the words are how it is known); the task itself is untouched.
 */
export function heldSendDoor(t: { text?: string; done?: boolean; agentId?: string | null; manuscriptId?: string | null; queryId?: string | null } | null | undefined): HeldDoor | null {
  if (!t || t.done || !t.agentId || !t.manuscriptId || t.queryId) return null;
  if (!(t.text ?? "").startsWith(HELD_PREFIX)) return null;
  return { mode: "log", agentId: t.agentId, manuscriptId: t.manuscriptId };
}
/** logging this agent's query for this book completes these held tasks (the save does it; Undo reopens them) */
export function heldToComplete<T extends { id: string; text?: string; done?: boolean; agentId?: string | null; manuscriptId?: string | null; queryId?: string | null }>(tasks: readonly T[], agentId: string, manuscriptId: string): T[] {
  return tasks.filter((t) => { const d = heldSendDoor(t); return !!d && d.agentId === agentId && d.manuscriptId === manuscriptId; });
}
