/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 — a DEV-ONLY review aid (Nick: "no Free accounts; gate the Free views on the existing flags, and add
 * a dev-only switch to prove L11 and screen 27"). `window.__SA_QC152_FREE = true` draws the card as a Free account sees
 * it: no versions and no packages. It changes what is DRAWN, never what is written.
 * ⚠️ Every caller gates on `import.meta.env.MODE !== "production"` AT THE CALL SITE, so a production bundle holds none
 *    of this (an early return inside the function would still ship it).
 */
export function qc152DevFree(): boolean {
  return typeof window !== "undefined" && (window as unknown as { __SA_QC152_FREE?: unknown }).__SA_QC152_FREE === true;
}
