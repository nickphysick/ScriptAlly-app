/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A DEV-ONLY REVIEW AID for the Contact list's loading beat (v13 §8, lock 12; Nick approved it, 5 Oct,
 * stripped from production): `window.__SA_AGENTS_HOLD_MS = n` before the page mounts holds it in
 * its settling state for n milliseconds after the agents have landed — as if the agents listener had
 * not answered yet — so the placeholders can be seen and measured against the page that replaces them.
 * It FABRICATES INPUT (whether the collections are ready), never output: the placeholders, and the
 * page after them, run for real.
 *
 * ⚠️ THE CALLER GATES IT ON THE BUILD MODE, NOT THIS MODULE (the qcReviewAid lesson: a guard inside
 * an imported module still ships the module). The call site reads it only under
 * `import.meta.env.MODE !== "production"`, so a production build never reaches this file.
 */
import { useEffect, useState } from "react";

const read = (): number => {
  if (typeof window === "undefined") return 0;
  const v = (window as unknown as { __SA_AGENTS_HOLD_MS?: unknown }).__SA_AGENTS_HOLD_MS;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
};

/** True while the hold lasts. Read once, at mount. */
export function useAgentsHold(): boolean {
  const [held, setHeld] = useState<boolean>(() => read() > 0);
  useEffect(() => {
    const ms = read();
    if (!ms) return undefined;
    const t = window.setTimeout(() => setHeld(false), ms);
    return () => window.clearTimeout(t);
  }, []);
  return held;
}
