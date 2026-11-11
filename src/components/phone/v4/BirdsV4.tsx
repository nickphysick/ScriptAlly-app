/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — THE BIRDS-EYE BAR (design-refs/phone-app-v4/phone-app-v4-pages.html, `brow` · `ptrack`): one bar per
 * open query, from the Birds-eye engine's own fraction (`eyeProgress`, via lib/phoneV4 `closeness`). Navy is time gone,
 * the status fill is time left; a query past its date has a full bar and the pulsing ring.
 * ⚠️ WORDS: "N wks past its date", never "overdue" or "late" (PA4-9).
 */
import React from "react";
import { V3Glyph, statusFill } from "../v3/V3Parts";
import { closeWords, type Closeness } from "../../../lib/phoneV4";
import "./phoneV4.css";

export const BirdBar: React.FC<{ c: Closeness; now: number; onTap: () => void; dim?: boolean; sel?: boolean }> = ({ c, now, onTap, dim, sel }) => {
  const r = c.q.row;
  const f = c.f;
  return (
    <button type="button" className={`pa4-brow${dim ? " dimd" : ""}`} data-pa4="be-bar" data-id={c.q.id} data-f={f ?? ""} data-past={c.past ? "1" : "0"}
      aria-pressed={sel || undefined} onClick={onTap}>
      <span className="l">
        <V3Glyph status={r.status} size={28} label={false} />
        <b>{r.agentName}</b>
        <span className={`pa4-s pa4-T${c.q.court === "you" ? " you" : ""}`} data-pa4="be-words">{closeWords(c, now)}</span>
      </span>
      {f == null ? (
        <span className="pa4-btr" style={{ boxShadow: "inset 0 0 0 1.5px rgba(42,58,82,.25)", background: "none" }} />
      ) : c.past ? (
        <span className="pa4-btr end"><i className="bdone" style={{ left: 0, width: "100%" }} /><i className="bbeacon" data-pa4="beacon" style={{ left: "100%" }} /></span>
      ) : (
        <span className="pa4-btr">
          <i className="brem" style={{ left: 0, width: "100%", background: statusFill(r.status) }} />
          <i className="bdone" style={{ left: 0, width: `${Math.max(2.5, f * 100)}%` }} />
        </span>
      )}
    </button>
  );
};
