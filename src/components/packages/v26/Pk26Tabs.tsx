/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the tab bar (ref `nav.ptabs`): Packages (the lead tab) · Query letters · Synopses, then
 * "Also goes in" and two shortcut pills to the Versions and Comparable titles pages. Plain underlined tabs, sticky
 * under the bar while the page scrolls (pk26.generated.css).
 */
import React from "react";

export type PageTab = "pk" | "let" | "syn";

const ArrowSm: React.FC = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5L7.5 6 4 9.5" /></svg>;
const Book: React.FC = () => <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="3" width="10" height="14" rx="1.5" /><path d="M7 3v14M16 6v11.5H8" /></svg>;

export const Pk26Tabs: React.FC<{
  tab: PageTab;
  onTab: (t: PageTab) => void;
  counts: { pk: number; let: number; syn: number; ver: number; comps: number };
  inUseVersionNum: string | null;
  onVersions: () => void;
  onComps: () => void;
}> = ({ tab, onTab, counts, inUseVersionNum, onVersions, onComps }) => (
  <nav className="p6-ptabs" role="tablist" aria-label="Submission packages" data-pk26="tabs">
    <button type="button" className="p6-ptab p6-lead" role="tab" aria-selected={tab === "pk"} onClick={() => onTab("pk")}>Packages<em>{counts.pk}</em></button>
    <button type="button" className="p6-ptab p6-sub p6-t-let" role="tab" aria-selected={tab === "let"} onClick={() => onTab("let")}>Query letters<em>{counts.let}</em></button>
    <button type="button" className="p6-ptab p6-sub p6-t-syn" role="tab" aria-selected={tab === "syn"} onClick={() => onTab("syn")}>Synopses<em>{counts.syn}</em></button>
    <span className="p6-ptab-x">
      <span className="p6-ptab-xk">Also goes in</span>
      <button type="button" className="p6-srcp" title="Open Versions" onClick={onVersions}><i className="p6-n">{inUseVersionNum ?? "O"}</i>Versions<em>{counts.ver}</em><ArrowSm /></button>
      <button type="button" className="p6-srcp" title="Open Comparable titles" onClick={onComps}><i><Book /></i>Comparable titles<em className="p6-lcn">{counts.comps}</em><ArrowSm /></button>
    </span>
  </nav>
);
