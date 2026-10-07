/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * True at ≥768px — the width at which the ink shell and the desktop pages render. A page that draws a
 * different tree on the desktop than on the phone (Query Centre v131) reads this, so the phone keeps
 * exactly the page it had. It follows the breakpoint live.
 */
import { useEffect, useState } from "react";

const Q = "(min-width: 768px)";

export function useDeskWidth(): boolean {
  const [desk, setDesk] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(Q).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(Q);
    if (!mq) return undefined;
    const on = () => setDesk(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return desk;
}
