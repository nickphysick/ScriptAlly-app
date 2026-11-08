/*
 * The dev crash trigger: `?qh-crash=<boundary name>` makes that boundary's contents throw on render,
 * so a fallback can be seen on a real page. Crash reporting v1, Phase 1.
 *
 * ⚠️ THIS MODULE IS ONLY EVER NAMED BEHIND `import.meta.env.MODE !== "production"` AT THE CALL SITE
 * (`crashTriggerFor` in components/PageBoundary.tsx). Vite replaces MODE with a literal, so a
 * production build drops the branch and with it every reference to this file; the trigger's query
 * name then appears nowhere in the bundle. `src/test/crashTriggerProd.test.ts` builds the app in
 * production mode and greps for it. No licence docblock here on purpose: esbuild keeps those whole,
 * and this file must leave nothing behind.
 *
 * ⚠️ IT THROWS UNTIL THE BOUNDARY RESETS, not once. React retries a failed render before it gives
 * up to a boundary, so a one-shot throw would be swallowed by the retry and no fallback would show.
 * "Try again" and leaving the page both clear it, so the page then renders, which is what proves
 * that a reset really remounts.
 */
import { createElement, type ReactElement } from "react";

const PARAM = "qh-crash";
const cleared = new Set<string>();

function wanted(name: string): boolean {
  if (typeof window === "undefined" || cleared.has(name)) return false;
  return new URLSearchParams(window.location.search).getAll(PARAM).includes(name);
}

function Probe({ name }: { name: string }): null {
  if (wanted(name)) throw new Error(`Test crash for "${name}" (dev crash trigger)`);
  return null;
}

export interface CrashTrigger {
  probe: (name: string) => ReactElement;
  clear: (name: string) => void;
}

export const devCrashTrigger: CrashTrigger = {
  probe: (name) => createElement(Probe, { name }),
  clear: (name) => { cleared.add(name); },
};
