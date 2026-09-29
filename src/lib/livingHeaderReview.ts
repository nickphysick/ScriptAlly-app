/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A DEV-ONLY REVIEW AID for living headers: `window.__SA_LH_COUNT = n` (then dispatch
 * `sa:lh-count`) makes the Query Centre and the Contact list render their hero as if the page held
 * `n` items — 0 shows the empty state and its exhibition. It FABRICATES INPUT (the count), never
 * output: the copy functions, the empty state and the exhibition all run for real on it, so a
 * measurement taken under it is evidence about the pages, not about this file.
 *
 * ⚠️ THE CALLER GATES IT ON THE BUILD MODE, NOT THIS MODULE. A guard inside an imported module still
 * ships the module (the qcReviewAid lesson: its body and its licence block reached a production
 * bundle); the call sites read it only under `import.meta.env.MODE !== "production"`, so a
 * production build folds the branch away and never reaches this file.
 */
import { useEffect, useState } from "react";

export const LH_COUNT_EVENT = "sa:lh-count";

const read = (): number | null => {
  if (typeof window === "undefined") return null;
  const v = (window as unknown as { __SA_LH_COUNT?: unknown }).__SA_LH_COUNT;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
};

/** The overriding count, or null when none is set. Re-reads on `sa:lh-count`. */
export function useLivingCountOverride(): number | null {
  const [n, setN] = useState<number | null>(read);
  useEffect(() => {
    const on = () => setN(read());
    window.addEventListener(LH_COUNT_EVENT, on);
    return () => window.removeEventListener(LH_COUNT_EVENT, on);
  }, []);
  return n;
}
