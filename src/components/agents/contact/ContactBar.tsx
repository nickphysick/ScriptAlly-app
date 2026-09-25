/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactBar — the floating active-filter bar (v11 §5.4): an ink bar fixed 22px above the
 * window's bottom, CENTRED ON THE LIST'S MEASURED BOX, never on the viewport — the rail is what
 * makes those two different, and a viewport-centred bar would sit half under it. `position:
 * fixed`, so it can never push the layout; §11.10 measures both claims.
 *
 * It spells out everything narrowing the list: the count cards ("Showing"), every filter value,
 * and Find ("Name has"). Each chip removes its own value; Clear all resets the lot.
 */
import React, { useLayoutEffect, useState } from "react";

export interface BarChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export const ContactBar: React.FC<{
  chips: BarChip[];
  onClearAll: () => void;
  /** the LIST column's element — the box the bar centres on */
  anchor: React.RefObject<HTMLElement | null>;
}> = ({ chips, onClearAll, anchor }) => {
  const [centre, setCentre] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = anchor.current;
    if (!el || chips.length === 0) return;
    const put = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setCentre(r.left + r.width / 2);
    };
    put();
    const ro = new ResizeObserver(put);
    ro.observe(el);
    window.addEventListener("resize", put);
    return () => { ro.disconnect(); window.removeEventListener("resize", put); };
  }, [anchor, chips.length]);

  if (chips.length === 0 || centre == null) return null;
  return (
    <div className="clv-fbar" data-clv="fbar" style={{ left: centre }} role="status" aria-label="Active filters">
      <em>Filtered</em>
      {chips.map((c) => (
        <span key={c.key} className="clv-pl">
          <small>{c.label}</small>
          {c.value}
          <button type="button" aria-label={`Remove ${c.label} ${c.value}`} onClick={c.onRemove}>✕</button>
        </span>
      ))}
      <button type="button" className="clv-ca" onClick={onClearAll}>Clear all</button>
    </div>
  );
};
