/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v139 — WHILE A PAGE GUIDE'S WALKTHROUGH IS RUNNING, THE PAGE'S OWN SINGLE-KEY SHORTCUTS STAND DOWN (B for
 * the Birds-eye view, F for the pin): a walkthrough steps the writer through one control at a time, and a key that
 * opened a drawer or pinned the list under it would move the thing the card is pointing at. Module scope, because the
 * shortcuts live in components the walkthrough does not render (the Birds-eye drawer, the pin's hook).
 */
let walking = false;

export function setGuideWalk(on: boolean): void { walking = on; }
export function guideWalking(): boolean { return walking; }
