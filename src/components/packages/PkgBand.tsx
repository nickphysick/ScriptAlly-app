/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2.1 — a section band (E1, "go with band"; ref packages-v2-1.html `.band` in
 * its `ink` treatment). Anthracite, 52 tall, a Special Elite title with an optional count on the left
 * and a mono hint on the right. The page's three headings (Your packages · Side by side · Retired)
 * are all bands.
 *
 * ⚠️ A TOGGLING BAND IS A <button>, AND ITS TITLE IS A SPAN, NOT AN h2. The mock puts an h2 inside the
 * button, which is invalid HTML (a button holds phrasing content only); the span wears the h2's look.
 */
import React from "react";

export type BandKey = "packages" | "sbs" | "retired";

interface Common {
  band: BandKey;
  title: string;
  count?: number;
  hint: React.ReactNode;
}

export const PkgBand = React.forwardRef<HTMLDivElement, Common & { id?: string }>(
  ({ band, title, count, hint, id }, ref) => (
    <div ref={ref} id={id} className="ppv-band" data-ppv="band" data-band={band}>
      <h2>{title}{count != null ? <span className="ppv-pill">{count}</span> : null}</h2>
      <p className="ppv-bandh" data-ppv="band-hint">{hint}</p>
    </div>
  ),
);
PkgBand.displayName = "PkgBand";

export const PkgBandToggle: React.FC<Common & { expanded: boolean; onToggle: () => void }> = ({ band, title, count, hint, expanded, onToggle }) => (
  <button type="button" className="ppv-band ppv-band--btn" data-ppv="band" data-band={band} aria-expanded={expanded} onClick={onToggle}>
    <span className="ppv-bandt"><span className="chev" aria-hidden="true">›</span>{title}{count != null ? <span className="ppv-pill">{count}</span> : null}</span>
    <span className="ppv-bandh" data-ppv="band-hint">{hint}</span>
  </button>
);
