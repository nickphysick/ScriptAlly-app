/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts — the owed requests (kept from v12, F6) and the page's short date. The v12 list
 * sections that lived here (Versions, Query letters, Synopses, Other materials, Submission
 * packages) are retired by v13's shelf and tiles (Msv13Shelf.tsx). Presentational; the status glyph
 * is the app's own StatusDot, and the button writes nothing — the page opens the query drawer.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import type { Query } from "../../../types";
import type { OwedRow } from "../../../lib/manuscriptSummary";
import { formatDate } from "../../../lib/dates";

/** "2 Sep" / "2 Sep 2026" — the app's own short date, never a browser locale's. */
export const fmtDay = (iso: string | null | undefined, withYear = false): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDate(d, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
};

/* ══ owed requests ════════════════════════════════════════════════════════════════════════════ */

export const OwedList: React.FC<{
  owed: OwedRow[];
  agentName: (id: string) => string;
  versionPin: (q: Query) => string | null;
  onSend: (row: OwedRow) => void;
}> = ({ owed, agentName, versionPin, onSend }) => {
  if (owed.length === 0) return null;
  return (
    <div className="msv12-owed" data-msv12="owed">
      {owed.map((row) => {
        const pin = versionPin(row.query);
        return (
          <div className="msv12-owedrow" data-msv12="owed-row" key={row.query.id}>
            <span className="msv12-sd" data-msv12-sd="">
              <StatusDot status={row.query.status} overrideSize={12} decorative />
            </span>
            <div className="msv12-otxt">
              <span className="msv12-who">{agentName(row.query.agentId)}</span> {row.ask}.
              <div className="msv12-osub">
                {[
                  row.requestedIso ? `Requested ${fmtDay(row.requestedIso)}` : null,
                  /* "pins {version}" only where the record genuinely carries one — see the page */
                  pin ? `pins ${pin}` : null,
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span className="msv12-move">Your move</span>
            <button type="button" className="msv12-btn" data-msv12="owed-send" onClick={() => onSend(row)}>
              {row.kind === "partial" ? "Send partial" : "Send full"}
            </button>
          </div>
        );
      })}
    </div>
  );
};
