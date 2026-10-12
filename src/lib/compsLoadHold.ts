/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A DEV-ONLY REVIEW AID for the comps page's loading beat (comps v25, lock L1), the Contact list's
 * `contactLoadHold` pattern: `window.__SA_COMPS_HOLD_MS = n` before the page mounts holds it in its
 * loading state for n milliseconds, so the loading boxes can be measured against the loaded ones.
 * It fabricates INPUT (whether the collections are ready), never output.
 *
 * ⚠️ THE CALLER GATES IT ON THE BUILD MODE, NOT THIS MODULE: the call site reads it only under
 * `import.meta.env.MODE !== "production"`, so a production build never reaches this file.
 */
import { useEffect, useState } from "react";

const read = (): number => {
  if (typeof window === "undefined") return 0;
  const v = (window as unknown as { __SA_COMPS_HOLD_MS?: unknown }).__SA_COMPS_HOLD_MS;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
};

/** True while the hold lasts. Read once, at mount. */
export function useCompsHold(): boolean {
  const [held, setHeld] = useState<boolean>(() => read() > 0);
  useEffect(() => {
    const ms = read();
    if (!ms) return undefined;
    const t = window.setTimeout(() => setHeld(false), ms);
    return () => window.clearTimeout(t);
  }, []);
  return held;
}
