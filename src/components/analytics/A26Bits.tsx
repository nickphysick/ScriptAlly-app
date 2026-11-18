/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 — the parts every section is built from: the banded card, a query's mark, its tip, the link out.
 *
 * ⚠️ A MARK IS ONE QUERY, DRAWN BY `StatusDot` (the app's one status glyph) in its current status. Hovering or focusing
 *    it shows the agent, the agency and one line; pressing it opens that query's card (`openQueryPanel`).
 * ⚠️ THE TIP IS FIXED TO THE WINDOW, placed from the mark's own rect, so a card's `overflow: hidden` never clips it.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { openQueryPanel } from "../../lib/queryPanelStore";
import type { Mark } from "../../lib/analyticsV26";
import type { QueryStatus } from "../../types";

/* ── the tip ── */
interface TipState { mark: Mark; x: number; y: number; below: boolean }
const TipCtx = React.createContext<{ show: (m: Mark, el: HTMLElement) => void; hide: () => void }>({ show: () => {}, hide: () => {} });

export const A26TipLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tip, setTip] = React.useState<TipState | null>(null);
  const api = React.useMemo(() => ({
    show: (mark: Mark, el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const below = r.top < 90;
      setTip({ mark, x: Math.max(8, Math.min(window.innerWidth - 268, r.left + r.width / 2 - 130)), y: below ? r.bottom + 10 : r.top - 10, below });
    },
    hide: () => setTip(null),
  }), []);
  React.useEffect(() => {
    if (!tip) return undefined;
    const off = () => setTip(null);
    window.addEventListener("scroll", off, true);
    return () => window.removeEventListener("scroll", off, true);
  }, [tip]);
  return (
    <TipCtx.Provider value={api}>
      {children}
      {tip ? (
        <div className="a26-tip" role="tooltip" data-a26="tip"
          style={{ left: tip.x, top: tip.y, transform: tip.below ? undefined : "translateY(-100%)" }}>
          <b className="a26-tip-n" data-a26="tip-name">{tip.mark.agent}</b>
          {tip.mark.agency && tip.mark.agency !== tip.mark.agent ? <span>{tip.mark.agency}<br /></span> : null}
          <span data-a26="tip-line">{tip.mark.line}</span>
        </div>
      ) : null}
    </TipCtx.Provider>
  );
};

/** One query's mark. `status` overrides the drawn status (a reply drawn as the kind of reply it was). */
export const A26Mark: React.FC<{ mark: Mark; status?: QueryStatus; size?: "md" | "sm"; style?: React.CSSProperties; probe?: string }> = ({ mark, status, size = "md", style, probe }) => {
  const tip = React.useContext(TipCtx);
  const label = `${mark.agent}${mark.agency && mark.agency !== mark.agent ? `, ${mark.agency}` : ""}. ${mark.line}`;
  return (
    <button type="button" className={`a26-mk${size === "sm" ? " a26-mk--sm" : ""}`} style={style}
      data-a26-mark={mark.id} data-a26-fate={mark.fate} data-a26={probe}
      aria-label={label}
      onMouseEnter={(e) => tip.show(mark, e.currentTarget)} onMouseLeave={tip.hide}
      onFocus={(e) => tip.show(mark, e.currentTarget)} onBlur={tip.hide}
      onClick={() => { tip.hide(); openQueryPanel(mark.id, "other"); }}>
      <StatusDot status={status ?? mark.status} overrideSize={size === "sm" ? 18 : 22} decorative />
    </button>
  );
};

/** A key's sample mark: never a query, never counted. */
export const A26KeyMark: React.FC<{ status: QueryStatus }> = ({ status }) => (
  <span className="a26-mk a26-mk--xs" aria-hidden="true" data-a26="key-mark"><StatusDot status={status} overrideSize={14} decorative /></span>
);

/* ── the banded card ── */
export type Band = "sd" | "st" | "bl" | "bu";
export const A26Card: React.FC<{ band: Band; title: React.ReactNode; aside: React.ReactNode; probe: string; children: React.ReactNode; className?: string }> = ({ band, title, aside, probe, children, className }) => (
  <section className={`a26-rc${className ? ` ${className}` : ""}`} data-a26="card" data-a26-card={probe}>
    <div className="a26-rc-in">
      <div className={`a26-rb a26-rb--${band}`}>
        <h2 data-a26="card-title">{title}</h2>
        <small data-a26="card-aside">{aside}</small>
      </div>
      {children}
    </div>
  </section>
);

/** The underlined link out to the page where the writer acts on a finding. */
export const A26Go: React.FC<{ onClick: () => void; probe: string; children: React.ReactNode }> = ({ onClick, probe, children }) => (
  <button type="button" className="a26-go" data-a26="go" data-a26-go={probe} onClick={onClick}>{children}</button>
);

/** The grey foot of a card: a sentence and, sometimes, a link. */
export const A26Means: React.FC<{ probe: string; children: React.ReactNode }> = ({ probe, children }) => (
  <div className="a26-means" data-a26="means" data-a26-means={probe}>{children}</div>
);
