/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 Phase 1 (ref screens 01, 05) — THE NAVY HEADER: the Query Centre's own, as Query letters v2.4
 * uses it. `shell/OpenHeader` in a `.qc151.qc153` wrapper, dressed by the Query Centre's sheets (qcv1534 §2–3, qcv156
 * §1); this page passes its slots and changes nothing in them. The Archivist with his boxes stands in the art column on
 * the header's bottom edge (pk43.css §1); nothing is pinned to the corner of the screen any more (v41's Pk41Hawk is gone).
 *
 *   headline   "<n> packages" (live, not retired, for the manuscript in scope), or "No packages yet" on day one
 *   ruled line "for <manuscript title>"
 *   buttons    "+ New package" (cream) and "How it works" (outline) — none on day one
 *   right      what new queries go out with, and Change (Phase 3) — none on day one
 *
 * ⚠️ THE `data-pk43` PROBES ARE THIS PAGE'S; the Query Centre's locks read their own.
 */
import React from "react";
import { OpenHeader } from "../../shell/OpenHeader";
import { HAWK_STANDING } from "../../../lib/packagesV43";

export const Pk43Header: React.FC<{
  title: string;
  msTitle: string | null;
  /** null on day one: no buttons */
  onNew: (() => void) | null;
  onHow: (() => void) | null;
  right?: React.ReactNode;
}> = ({ title, msTitle, onNew, onHow, right = null }) => (
  <div className="qc151 qc153 pk43-hdw" data-pk43="header-wrap">
    <OpenHeader
      className="pk43-hd"
      attrs={{ "data-pk43": "header", "data-pk26": "header", "data-own-header": "" }}
      art={<img src={HAWK_STANDING} alt="" width={178} height={220} draggable={false} data-pk43="art" />}
      artClassName="pk43-art"
      title={title}
      titleAttrs={{ "data-pk43": "title", tabIndex: "-1" }}
      forLine={msTitle ? { lead: "for", text: msTitle, attrs: { "data-pk43": "for" } } : null}
      actions={onNew || onHow ? <>
        {onNew ? <button type="button" className="qc1531-b qc1531-b--n" data-pk43="new" onClick={onNew}>+ New package</button> : null}
        {onHow ? <button type="button" className="qc1531-b qc1531-b--g" data-pk43="how" onClick={onHow}>How it works</button> : null}
      </> : null}
      ring={right}
    />
  </div>
);
