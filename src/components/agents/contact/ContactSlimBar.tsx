/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list — QC layout v1.1 (design-refs/contact-list-pinned-v8/) — THE COLLAPSED HEADER, replacing header v2's 48px
 * slim row (ContactSlimRow, deleted with it). It is the Query Centre's own bar (`shell/SlimBar`, which `QcSlim156`
 * renders through): 60px, its ground the sheet's full width, the same reader and the same `--pin-cover` offset (written
 * on `.clv-main`, `extra` 12 for the bar strip's lip, as on the Query Centre), so the bar, the cap and the Views panel
 * pin under it exactly as there.
 *
 *   title    "{n} agents on file"
 *   subline  "{x} not yet queried" (still the button onto that filter) / "All of them queried"
 *   right    List health as the small ring button ("16%", "list health": Housekeeping), in the Query Centre slim bar's
 *            streak type (`.qc156-sw`: the figure 18px typewriter, the words 15px italic serif)
 *   button   "+ Add an agent"
 *
 * Desktop only (768px and up): below it the bar never renders (CLH2-11). Not on day one, the empty page or while loading
 * (AgentList's call site). ⚠️ Its hooks keep header v2's `data-clh2` names (slim, slim-title, slim-sub, slim-notq,
 * slim-health, slim-add), so what read the old row reads this one.
 */
import React, { useEffect, useState } from "react";
import type { HeaderFigures } from "../../../lib/contactV26";
import { clHeadline } from "../../../lib/contactPrinciples";
import { SlimBar } from "../../shell/SlimBar";
import { healthColours } from "./ContactHealth26";
import "../../queries/centre/qcv156.css";
import "./contactQcLayout.css";

/** the 24px ring's geometry (header v2's: viewBox 46, r 19, stroke 7) */
const SLIM_R = 19;
const SLIM_C = 2 * Math.PI * SLIM_R;

/** is the viewport 768px or wider (the bar's whole existence; below it, it never renders) */
function useDesktop(): boolean {
  const q = "(min-width: 768px)";
  const [on, setOn] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(q).matches);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const m = window.matchMedia(q);
    const put = () => setOn(m.matches);
    put();
    m.addEventListener("change", put);
    return () => m.removeEventListener("change", put);
  }, []);
  return on;
}

const header = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > [data-cl27='header']");
const cover = (row: HTMLElement) => row.parentElement?.querySelector<HTMLElement>(":scope > .clv-main");

export interface ContactSlimBarProps {
  figures: HeaderFigures;
  /** Housekeeping's score and gap count */
  health: { pct: number; gaps: number };
  onNotQueried: () => void;
  onOpenHealth: () => void;
  onAdd: () => void;
}

export const ContactSlimBar: React.FC<ContactSlimBarProps> = (p) => (useDesktop() ? <Bar {...p} /> : null);

/** the bar itself (exported for markup tests: the media gate above needs a window) */
export const Bar: React.FC<ContactSlimBarProps> = ({ figures, health, onNotQueried, onOpenHealth, onAdd }) => {
  const h = clHeadline(figures);
  const c = healthColours(health.pct, "light");
  return (
    <SlimBar hook="data-clh2" header={header} cover={cover} extra={12}
      title={h.title}
      sub={h.sub ? { probe: "slim-sub", node: h.subLink ? <button type="button" className="clq-snq" data-clh2="slim-notq" onClick={onNotQueried}>{h.sub}</button> : h.sub } : null}
      right={
        <button type="button" className="qc156-sw clq-sh" data-clh2="slim-health" onClick={onOpenHealth} aria-label={`List health ${health.pct}%. Open Housekeeping`}>
          <svg viewBox="0 0 46 46" width={24} height={24} aria-hidden="true">
            <circle cx={23} cy={23} r={SLIM_R} fill="none" style={{ stroke: c.track }} strokeWidth={7} />
            <circle cx={23} cy={23} r={SLIM_R} fill="none" style={{ stroke: c.arc }} strokeWidth={7} strokeLinecap="round"
              strokeDasharray={`${(Math.max(0, Math.min(100, health.pct)) / 100) * SLIM_C} ${SLIM_C}`} transform="rotate(-90 23 23)" />
          </svg>
          <b>{health.pct}%</b><em>list health</em>
        </button>
      }
      button={{ label: "+ Add an agent", onClick: onAdd, probe: "slim-add" }} />
  );
};
