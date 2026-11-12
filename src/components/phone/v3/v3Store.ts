/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — THE ONE OVERLAY AT A TIME (ref `ui.ov`): the query sheet, the agent sheet, the + sheet and the
 * journeys are opened from anywhere through here and drawn by one host (V3Layer, mounted by the shell on a phone).
 * Opening any of them clears the snackbar (ref `open`: `ui.snack = null`), so it never covers a button.
 */
import type { AgentGroup } from "../../../lib/phoneV5";
import type { GroupKey } from "../../../lib/contactHousekeeping";

export type V3Overlay =
  | { type: "query"; id: string }
  | { type: "agent"; id: string }
  | { type: "plus" }
  | { type: "log"; agentId?: string }
  | { type: "reply"; queryId?: string }
  | { type: "add"; editId?: string; name?: string }
  | { type: "note" }
  | { type: "search" }
  /* Phone app v4: pushed pages drawn by the layer (back arrow, the page's name). Phone app v5: the task list
     ("tasks") is the To do tab now, an address of its own (`/todo`) */
  | { type: "agents-all"; group?: AgentGroup }
  /* Phone app v5: Housekeeping's gap-filling session, as a sheet (opened at a group's gaps, or at the first gap) */
  | { type: "gaps"; group?: GroupKey };

export interface V3Snack { msg: string; undo?: () => Promise<void> | void }

type Listener = () => void;
let overlay: V3Overlay | null = null;
/** counts opens, so the host remounts a panel opened afresh (Log another) and keeps one that only re-renders */
let seq = 0;
let snack: V3Snack | null = null;
const listeners = new Set<Listener>();
const emit = () => { for (const l of listeners) l(); };

export const v3Overlay = (): V3Overlay | null => overlay;
export const v3Seq = (): number => seq;
export const v3Snack = (): V3Snack | null => snack;
export function subscribeV3(l: Listener): () => void { listeners.add(l); return () => { listeners.delete(l); }; }

export function openV3(o: V3Overlay): void { overlay = o; seq += 1; snack = null; emit(); }
export function closeV3(): void { overlay = null; emit(); }
export const openV3Query = (id: string): void => openV3({ type: "query", id });
export const openV3Agent = (id: string): void => openV3({ type: "agent", id });

let timer: ReturnType<typeof setTimeout> | null = null;
/** the navy snackbar: one line and, where the write has one, Undo. It goes after five seconds (ref `snack`). */
export function showV3Snack(s: V3Snack): void {
  snack = s; emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { snack = null; emit(); }, 5000);
}
export function clearV3Snack(): void { snack = null; emit(); }
