/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 4 — the task and note flows' one door. Module scope, like drawerStore: whatever asks (the + sheet,
 * the To-do page, the corkboard's "Add a note") calls `openPhoneCompose`, and the shell's one host walks it.
 */
export type ComposeKind = "task" | "note";
/** an existing own task or note to EDIT (Part 5: tapping an own task opens its editor); absent = a new one */
export interface ComposeSeed { id: string; text: string; detail?: string; due?: string | null }
type L = (k: ComposeKind | null, seed: ComposeSeed | null) => void;
let current: ComposeKind | null = null;
let seedNow: ComposeSeed | null = null;
const ls = new Set<L>();
export function openPhoneCompose(k: ComposeKind, seed?: ComposeSeed): void { current = k; seedNow = seed ?? null; ls.forEach((f) => f(current, seedNow)); }
export function closePhoneCompose(): void { current = null; seedNow = null; ls.forEach((f) => f(current, seedNow)); }
export function subscribePhoneCompose(f: L): () => void { ls.add(f); f(current, seedNow); return () => { ls.delete(f); }; }
