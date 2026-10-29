/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 4 — the task and note flows' one door. Module scope, like drawerStore: whatever asks (the + sheet,
 * the To-do page, the corkboard's "Add a note") calls `openPhoneCompose`, and the shell's one host walks it.
 */
export type ComposeKind = "task" | "note";
type L = (k: ComposeKind | null) => void;
let current: ComposeKind | null = null;
const ls = new Set<L>();
export function openPhoneCompose(k: ComposeKind): void { current = k; ls.forEach((f) => f(current)); }
export function closePhoneCompose(): void { current = null; ls.forEach((f) => f(current)); }
export function subscribePhoneCompose(f: L): () => void { ls.add(f); f(current); return () => { ls.delete(f); }; }
