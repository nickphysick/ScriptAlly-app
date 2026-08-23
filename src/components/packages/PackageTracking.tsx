/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ WHAT A PACKAGE WAS SENT WITH (ref 177, right panel) ══════════════════════════════════════
 *
 * ⚠️ DERIVED, NEVER STORED, AND NOTHING WRITES BACK. Logging a query does not touch the package
 * document — this is a read over queries the app already holds. A deleted query stops being counted
 * the moment it is gone: no counter to decrement, no cleanup, and no way for the figure to drift
 * from the truth.
 *
 * ⚠️ IT COUNTS THE SNAPSHOT'S MARKS, not `query.packageId`. See `sendsWithPackage` — the older link
 * field is cleared by the attach flow, so a count over it would report zero for every send made
 * this way.
 */
import React, { useState } from "react";
import { ArtSlot } from "../todo/ArtSlot";
import {
  sendsWithPackage, sentWithLine, NEVER_SENT_LINE, TRACKING_PREVIEW, PACKAGE_MARK_SLOT,
  canAttachPackages, type PackageSend,
} from "../../lib/packageAttach";
import type { Query, User } from "../../types";
import "./packageTracking.css";

export interface PackageTrackingProps {
  packageId: string;
  queries: Query[];
  agentName: (agentId?: string) => string;
  onOpenQuery: (queryId: string) => void;
  /** §5 — the affordance routes through the gate, like the Query Centre's menu row. */
  user: Pick<User, "plan"> | null | undefined;
  onAttach: () => void;
}

const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "—";

const shortDate = (iso?: string): string => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const PackageTracking: React.FC<PackageTrackingProps> = ({
  packageId, queries, agentName, onOpenQuery, user, onAttach,
}) => {
  const [showAll, setShowAll] = useState(false);
  const sends = sendsWithPackage(packageId, queries as never);

  /* ⚠️ STATE 3 — DERIVED, NOT ASSUMED. The sentence appears when the count is zero and never else. */
  if (!sends.length) {
    return (
      <div className="pkgt">
        <p className="pkgt-idle">{NEVER_SENT_LINE}</p>
        {canAttachPackages(user) && (
          <button type="button" className="pkgt-attach" onClick={onAttach}>Attach to a query</button>
        )}
      </div>
    );
  }

  const shown = showAll ? sends : sends.slice(0, TRACKING_PREVIEW);
  const rest = sends.length - shown.length;

  return (
    <div className="pkgt">
      <div className="pkgt-head">
        {/* the same shared mark the send's group wears — one mark for every package */}
        <span className="pkgt-mark" aria-hidden="true"><ArtSlot name={PACKAGE_MARK_SLOT} maxWidth={22} /></span>
        <span className="pkgt-figure">{sends.length}</span>
        <span className="pkgt-label">{sentWithLine(sends.length).replace(/^\d+\s/, "")}</span>
      </div>

      <ul className="pkgt-rows">
        {shown.map((s: PackageSend) => (
          <li key={s.queryId}>
            {/* ⚠️ ROWS CLICK THROUGH TO THE QUERY — the figure is a way in, not a trophy. */}
            <button type="button" className="pkgt-row" onClick={() => onOpenQuery(s.queryId)}>
              <span className="pkgt-av" aria-hidden="true">{initials(agentName(s.agentId))}</span>
              <span className="pkgt-who">{agentName(s.agentId)}</span>
              <span className="pkgt-meta">{s.status}{s.dateSent ? ` · ${shortDate(s.dateSent)}` : ""}</span>
            </button>
          </li>
        ))}
      </ul>

      {rest > 0 && (
        <button type="button" className="pkgt-more" onClick={() => setShowAll(true)}>
          Show all {sends.length}
        </button>
      )}
      {canAttachPackages(user) && (
        <button type="button" className="pkgt-attach" onClick={onAttach}>Attach to a query</button>
      )}
    </div>
  );
};
