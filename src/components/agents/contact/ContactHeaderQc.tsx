/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — Query Centre layout v1 (design-refs/contact-list-qc-layout-v7/contact-list-qc-layout-v7.html) — THE
 * NAVY HEADER. The Query Centre's own header frame (`shell/OpenHeader`, the one `QcHeader1531` renders through), dressed
 * by the Query Centre's own v156 navy-panel rules (queries/centre/qcv156.css §1, qcv1534.css §2–3), whose selectors name
 * `.cl27` beside `.qc151.qc153` at the same specificity. Nothing of the Query Centre's look is copied here.
 *
 *   art      the binoculars bird (`CL27_HEADER_ART`), mirrored, at the Query Centre art's size (190 wide)
 *   title    "{n} agents on file" ("1 agent on file") — `clHeadline`, unchanged; the `h1` keeps `data-page-title`
 *   ruled    "{x} not yet queried" (still the button onto that filter, header v2) or "All of them queried"
 *   actions  "+ Add an agent" (cream) and "Discover agents" (outlined): the Query Centre's two button classes
 *   right    List health on the navy (`ContactHealth26 fill`): ring 140, the archivist 118 wide breaking out of it, the
 *            score on the cream pill at its foot; "List health", the gaps line and "Fill the gaps" (none at 0 gaps)
 *
 * Day one and the loading frame keep their content (day one's sentence and the line under it; a blank title while
 * loading). ⚠️ The hooks the v27 header carried stay on the same elements (`data-cl26`, `data-cl27`, `data-clh2`),
 * so the slim row's reader (`[data-cl27='header']`), the page guide and the "/" key find what they found before.
 */
import React from "react";
import type { HeaderFigures } from "../../../lib/contactV26";
import { clHeadline } from "../../../lib/contactPrinciples";
import { OpenHeader } from "../../shell/OpenHeader";
import { ContactHealth26 } from "./ContactHealth26";
import "../../queries/centre/qcv1531.css";
import "../../queries/centre/qcv1534.css";
import "../../queries/centre/qcv154.css";
import "../../queries/centre/qcv156.css";
import "./contactQcLayout.css";

/** the header's drawing — the existing asset, mirrored in CSS, "for now" (Nick) */
export const CL27_HEADER_ART = "/images/contact/discover-binoculars-bird.webp";
/** the Query Centre's art width (`QcHeader1531`'s armchair hawk) */
export const QC_ART_W = 190;
/** List health on the navy: the ring and the archivist (the ref's v6 block) */
export const CLQ_RING = 140;
export const CLQ_ARCH = 118;

export const ContactHeaderQc: React.FC<{
  loading: boolean;
  figures: HeaderFigures | null;
  /** Housekeeping's score and gap count, or null while loading */
  health: { pct: number; gaps: number } | null;
  onAdd: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
  /** the Discover tab, as before */
  onDiscover?: () => void;
  onOpenHealth: () => void;
  /** header v2 — "{nq} not yet queried": the `queried: "no"` filter, nothing else */
  onNotQueried: () => void;
}> = ({ loading, figures: f, health, onAdd, addRef, onDiscover, onOpenHealth, onNotQueried }) => {
  const h = f ? clHeadline(f) : null;
  const ruled: React.ReactNode = !h ? <span aria-hidden="true">&nbsp;</span>
    : h.dayOne ? <span className="clp-under" data-cl27="under">{h.under}</span>
    : h.subLink ? <button type="button" className="clq-nq" data-clh2="notq" disabled={loading} onClick={onNotQueried}>{h.sub}</button>
    : <span data-clh2="sub">{h.sub}</span>;
  return (
    <OpenHeader
      className="clq-hd"
      attrs={{ "data-cl26": "header", "data-cl27": "header", "data-clq": "header", "data-own-header": "", ...(loading ? { "data-loading": "", "aria-busy": "true" } : {}) }}
      art={<img src={CL27_HEADER_ART} alt="" width={QC_ART_W} draggable={false} />}
      artClassName="clq-art"
      title={h ? h.title : " "}
      titleAttrs={{ "data-cl26": "title", "data-cl27": "title", "data-clp": "headline" }}
      forLine={{ text: ruled, attrs: { "data-cl27": "for", "data-clq": "ruled" } }}
      actions={<>
        <button type="button" ref={addRef} className="qc1531-b qc1531-b--n" data-cl26="add" data-cl24="add" data-cl17="add" data-cl27="add"
          disabled={loading} onClick={onAdd}>+ Add an agent</button>
        {onDiscover ? (
          <button type="button" className="qc1531-b qc1531-b--g" data-cl26="discover" data-cl24="discover" data-cl27="discover" onClick={onDiscover}>Discover agents</button>
        ) : null}
      </>}
      ring={<div className="clq-rc" data-cl27="health"><ContactHealth26 health={health} onOpenHealth={onOpenHealth} ground="navy" fill size={CLQ_RING} arch={CLQ_ARCH} /></div>}
    />
  );
};
