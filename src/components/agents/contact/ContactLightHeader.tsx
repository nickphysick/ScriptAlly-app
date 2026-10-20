/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17 §A — THE ONE LIGHT HEADER, on the page colour: the eyebrow, "{N} agents on file", the byline
 * and two buttons, with a soft hawk shadow behind the title; and a white SUMMARY CARD on the right (a bar and
 * three rows: Not queried, Querying, Closed) that filters the list. v17.1: the title row comes in from the sheet's
 * edges (the inset is in contactV17.css) and the cut-out hawk is gone; the shadow stays.
 *
 * ⚠️ THE CARD'S FIGURES ARE v16's STRIP MODEL (`lib/contactGlance`), AND ITS FILTER IS THE STRIP'S OWN GROUP
 *    FILTER: the page's `glance` state, which "Clear all" already clears. Nothing is derived here.
 * ⚠️ THE ROWS ARE THE CONTROLS. A bar segment takes a pointer press too, but it is `aria-hidden`: the same
 *    three choices read once, as three buttons with `aria-pressed`.
 * ⚠️ THE TITLE KEEPS `data-page-title` (the hook anything asking "has the page's title scrolled past?" reads)
 *    and takes focus from the pinned row's "back to the top".
 */
import React, { useLayoutEffect, useRef } from "react";
import { Term } from "../../shell/Term";
import type { GlanceKey, GlanceModel } from "../../../lib/contactGlance";
import { GLANCE_LABEL } from "../../../lib/contactGlance";
import { RING, RING_C, healthLabel, ringArc, type ListHealth } from "../../../lib/contactHealth";
import "../../shell/pageHeroFrame.css"; /* v138.5 — the shared inset, before the page's own sheet */
import "./contactV17.css";
import "./contactV18.css"; /* after v17: v18 restates some of its rules at equal specificity */
import "./contactV182.css"; /* after v18: v18.2 restates the header's shadow, the card's layers and the tabs */
import "./contactV183.css"; /* after v18.2: the second button and the ring */

export const CONTACT_EYEBROW = "— CONTACT LIST —";
export const CONTACT_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };
/** v18.2 §A — the archivist beside the title block (720 × 641, from the trimmed 922 × 821 master in design-refs) */
export const CONTACT_ARCHIVIST = { src: "/images/contact-list-archivist.webp", version: 1 };

/**
 * v18.2 §A — the archivist is as tall as the title block (the eyebrow's top to the buttons' bottom). Its HEIGHT could
 * be the grid area's in CSS, but the text beside it must start 28px past its right edge, and that edge is the height ×
 * 1.123: a width that follows a height a sibling sets is a cycle no layout pass resolves (columns are sized before
 * rows). So ONE ResizeObserver reads the text's own extent and writes `--cl182-ill-h` on the title row; nothing else
 * writes it, and the illustration itself never drives layout (its size is read from the text, never the reverse).
 */
function useIllustrationHeight(row: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const el = row.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const tb = el.querySelector<HTMLElement>(".cl17-tb");
    const acts = el.querySelector<HTMLElement>(".cl17-acts");
    if (!tb || !acts) return undefined;
    const write = () => {
      const h = acts.offsetTop + acts.offsetHeight - tb.offsetTop;
      /* a zero reading is the page before layout (or hidden by a stage toggle): refused, never stored */
      if (h > 0) { el.style.setProperty("--cl182-ill-h", `${h}px`); el.style.setProperty("--cl182-ill-t", `${tb.offsetTop}px`); }
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(tb); ro.observe(acts);
    return () => ro.disconnect();
  }, [row]);
}
/** "41 agents on file" / "1 agent on file" */
export const onFileWords = (n: number): string => (n === 1 ? "agent on file" : "agents on file");

const SEG: Record<GlanceKey, string> = { none: "n", live: "a", closed: "c" };

/** List health: Housekeeping's own figures as a ring. Ink is filled in, rust is the gaps. */
export const HealthRing: React.FC<{ pct: number | null }> = ({ pct }) => {
  const c = RING.box / 2;
  const arc = ringArc(pct ?? 0);
  const rot = `rotate(-90 ${c} ${c})`;
  return (
    <span className="cl17-rg" data-cl17="ring">
      <svg viewBox={`0 0 ${RING.box} ${RING.box}`} aria-hidden="true">
        {/* the gaps, in rust, underneath — not drawn at 100, where its antialiased edge would show round the ink */}
        {pct === 100 ? null : (
          <circle data-cl17="ring-gaps" cx={c} cy={c} r={RING.r} fill="none" stroke="#a2452a" strokeOpacity={pct === null ? 0.12 : 0.85} strokeWidth={RING.w} />
        )}
        {pct !== null && arc.ink > 0 ? (
          <circle data-cl17="ring-ink" cx={c} cy={c} r={RING.r} fill="none" stroke="#2a3a52" strokeWidth={RING.w} strokeLinecap="round"
            strokeDasharray={`${arc.ink} ${RING_C}`} transform={rot} />
        ) : null}
        {/* v18.3 §B — the two cream separator ticks are gone; the filled arc has a round cap */}
      </svg>
      <span className={`cl17-pc${pct === 100 ? " cl17-pc--full" : ""}`} data-cl17="ring-pct">
        {pct === null ? "" : <>{pct}<i>%</i></>}
      </span>
    </span>
  );
};

/**
 * The one white card: the counts on the left (the bar and three rows; v17.1 drops the detail lines) and, when
 * `health` is given, List health on the right. `loading` holds every box and shows no figure.
 */
export const ContactSummaryCard: React.FC<{
  model: GlanceModel;
  active: GlanceKey | null;
  onGroup: (k: GlanceKey) => void;
  loading?: boolean;
  /** Housekeeping's figures (null while loading); omit to draw the counts alone */
  health?: ListHealth | null;
  /** opens Housekeeping: the same opener as the tab and the H key */
  onHealth?: () => void;
}> = ({ model, active, onGroup, loading = false, health, onHealth }) => (
  <div className="cl17-card" data-cl17="card" data-on={active ?? undefined} data-loading={loading ? "" : undefined}>
    <div className="cl17-cnt" data-cl17="counts" role="group" aria-label="Where your agents stand">
      <div className="cl17-bar" data-cl17="card-bar" aria-hidden="true">
        {model.cells.map((c) => (
          <i key={c.key} className={`cl17-sg cl17-sg--${SEG[c.key]}`} data-cl17="card-seg" data-k={c.key}
            data-on={active === c.key ? "" : undefined}
            style={{ flex: `${loading ? 1 : Math.max(c.n, 0)} 1 0` }}
            onClick={loading ? undefined : () => onGroup(c.key)} />
        ))}
      </div>
      {model.cells.map((c) => (
        <button key={c.key} type="button" className="cl17-row" data-cl17="card-row" data-k={c.key}
          aria-pressed={active === c.key} disabled={loading} onClick={() => onGroup(c.key)}>
          <i className={`cl17-sw cl17-sg--${SEG[c.key]}`} aria-hidden="true" />
          <b className="cl17-n" data-cl17="card-n">{loading ? "" : c.n}</b>
          <span className="cl17-lb" data-cl17="card-label">{GLANCE_LABEL[c.key]}</span>
        </button>
      ))}
    </div>
    {health !== undefined ? (
      <button type="button" className="cl17-hl" data-cl17="health" data-full={health && health.gaps <= 0 && health.pct === 100 ? "" : undefined}
        disabled={loading || !health || !onHealth} onClick={onHealth}
        aria-label={health ? healthLabel(health) : "List health"}>
        <HealthRing pct={health ? health.pct : null} />
        {/* v19.2 §G — the card ends at "List health": the gap count is stated once, on "Fill in the gaps N" (the
            ring's accessible name still says it) */}
        <span className="cl17-ht">
          {/* Help system v1 D — "List health" is a defined word; inside the button it opens on hover and focus only */}
          <b data-cl17="health-title"><Term id="listHealth" onDark={false}
            example={health ? [`You have `, { b: `${health.gaps} ${health.gaps === 1 ? "gap" : "gaps"}` }, ` across ${model.cells.reduce((t, c) => t + c.n, 0)} agents. Press the ring to fill them.`] : undefined}>List health</Term></b>
        </span>
      </button>
    ) : null}
  </div>
);

export const ContactLightHeader: React.FC<{
  /** true while the page settles: the header holds its shape and its controls are inert */
  loading: boolean;
  /** every agent on file; null while loading */
  total: number | null;
  /** the manuscript in scope, or null */
  msTitle: string | null;
  model: GlanceModel;
  active: GlanceKey | null;
  onGroup: (k: GlanceKey) => void;
  addRef?: React.Ref<HTMLButtonElement>;
  onAdd: () => void;
  /** opens Discover; omitted when the route cannot be taken, and the button is then not drawn */
  onDiscover?: () => void;
  /** v17.1 — List health (Housekeeping's figures; null while loading) and its opener */
  health?: ListHealth | null;
  onHealth?: () => void;
  /** v18 §A — the letter tabs, the first thing in the header */
  letters?: React.ReactNode;
  /** Part B — the search and filter row, under the header's rule */
  children?: React.ReactNode;
}> = ({ loading, total, msTitle, model, active, onGroup, addRef, onAdd, onDiscover, health, onHealth, letters, children }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  useIllustrationHeight(rowRef);
  return (
  <header className="cl17-hd phf" data-cl17="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined}>
    {letters}
    <div className="cl17-tr" data-cl17="header-row" ref={rowRef}>
      {/* v18.2 §A — the archivist left of the title block, and the hawk's shadow cast over the List health card; both
          are the title row's, so they are placed against it */}
      <img className="cl182-ill" data-cl182="archivist" alt="" src={`${CONTACT_ARCHIVIST.src}?v=${CONTACT_ARCHIVIST.version}`} />
      <img className="cl17-shadow" data-cl17="shadow" alt="" aria-hidden="true" src={`${CONTACT_SHADOW.src}?v=${CONTACT_SHADOW.version}`} />
      <div className="cl17-tb" data-cl17="title-block">
        <span className="cl17-ey" data-cl17="eyebrow">{CONTACT_EYEBROW}</span>
        <h1 className="cl17-title" data-page-title="" data-cl17="title" tabIndex={-1}
          aria-label={total === null ? "Agents on file" : `${total} ${onFileWords(total)}`}>
          <span aria-hidden="true">
            {total === null ? <span className="cl17-blank" data-cl17="title-blank">00</span> : <span data-cl17="title-n">{total}</span>}
            {" "}{onFileWords(total ?? 0)}
          </span>
        </h1>
        <div className="cl17-by" data-cl17="byline">
          {msTitle ? <span className="cl17-byt">for <i className="cl17-ms" data-cl17="ms">{msTitle}</i></span> : <span className="cl17-byt">for your book</span>}
        </div>
      </div>
      <div className="cl17-acts" data-cl17="acts">
        <button type="button" className="cl17-b1" data-cl15="add" data-cl17="add" ref={addRef} disabled={loading} onClick={onAdd}>+ Add an agent</button>
        {/* v18.3 §B — "Discover agents" leaves the header (it stays in the sidebar); "Fill in the gaps" opens Housekeeping,
            with the open gap count in a pill (hidden at zero; the button stays) */}
        <button type="button" className="cl17-b2 cl183-fill" data-cl183="fill" disabled={loading || !onHealth} onClick={onHealth}>
          Fill in the gaps{health && health.gaps > 0 ? <span className="cl183-fn" data-cl183="fill-n" aria-label={`${health.gaps} gaps`}>{health.gaps}</span> : null}
        </button>
      </div>
      <ContactSummaryCard model={model} active={active} onGroup={onGroup} loading={loading} health={health ?? null} onHealth={onHealth} />
    </div>
    {children}
  </header>
  );
};
