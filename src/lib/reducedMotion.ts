/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ `animation: none` DOES NOT FIRE `animationend`. Verified in-browser, 10 Aug: an element whose
 * armed class resolves to `animation: none` emits no animation event at all — so any completion
 * bound to `animationend` simply never runs under reduced motion. That is not a theoretical hazard:
 * it left the query takeover armed with `qc-exit-save` (which is `opacity: 0` in the reduced-motion
 * block) after every successful save, with nothing left to clear it.
 *
 * The house rule that produced the trap is still right — reduced motion CUTS TO THE FINAL FRAME
 * rather than playing a shortened animation, so a 1ms stand-in is not the fix. The fix is that the
 * JS branches: where motion is suppressed, the completion runs directly.
 *
 * ⚠️ AND IT IS A BRANCH, NEVER A TIMER. A `setTimeout` matching the CSS drifts the moment a timing
 * changes; this asks the preference instead, and asks it at the moment of use.
 */

/**
 * True when the writer has asked their system for reduced motion.
 *
 * ⚠️ READ AT THE MOMENT OF USE, never cached in a module-level `const`. The preference can change
 * mid-session, and a value captured at import answers with whatever was true when the bundle was
 * first evaluated. Node-safe (no `window`, no `matchMedia` → false), so it is callable from code
 * that also renders through `renderToStaticMarkup`.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
