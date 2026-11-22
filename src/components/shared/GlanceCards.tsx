/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "AT A GLANCE" — the Query Centre v150.1's stat cards (QcStatCards150), lifted for Contact list v25 Part B: a heading,
 * then equal cards, each a tinted head (a swatch, the label and a doodle) over one row: the figure, the faces and "+N".
 * The look is qcv150.css's `.qc150-*` rules; a page names its own tints with each card's `tone`.
 *
 * ⚠️ THE WHOLE CARD IS ONE BUTTON (`.qc150-hit`, stretched under the content). A card the page marks `pressable: false`
 *    (Contact list's List health) is still a button but never pressed: it carries no `aria-pressed`.
 * ⚠️ HOW MANY DISCS FIT beside the figure is MEASURED per card (a 237px card at a 1280 window cannot hold six discs and
 *    "+N" beside a two-digit count). The discs are cut to the room and "+N" grows to match: shown + N is the total.
 * ⚠️ `probe` NAMES THE PAGE'S DATA ATTRIBUTE (`data-qc150`, `data-cl25`). Every workspace page stays mounted, so two
 *    pages sharing one probe name would double every count a measurement takes.
 */
import React, { useLayoutEffect, useRef, useState } from "react";

export interface GlanceFace { key: string; initials: string; title: string }
export interface GlanceItem {
  key: string;
  label: string;
  /** the figure: a count, or (List health) "93%" */
  figure: React.ReactNode;
  /** the things the faces stand for: "+N" is this less the faces drawn */
  total: number;
  faces: GlanceFace[];
  /** the class suffix of the card's tints: `qc150-c--{tone}` and `qc150-faces--{tone}` */
  tone: string;
  /** the swatch's class names */
  swatch: string;
  doodle: React.ReactNode;
  /** drawn after the faces (List health's ring and "20 gaps →") */
  extra?: React.ReactNode;
  ariaLabel: string;
  /** false: the card is never pressed (no `aria-pressed`) */
  pressable?: boolean;
}

type Probe = `data-${string}`;

export const GlanceCards: React.FC<{
  items: readonly GlanceItem[];
  /** the pressed card's key */
  pressed: string | null;
  onCard: (key: string) => void;
  /** the figures are not known yet: no figure is drawn and no card can be pressed */
  ready: boolean;
  loading: boolean;
  probe: string;
  headingId: string;
  className?: string;
}> = ({ items, pressed, onCard, ready, loading, probe, headingId, className }) => {
  const P = (v: string) => ({ [`data-${probe}` as Probe]: v });
  const gridRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const g = gridRef.current;
    if (!g) return undefined;
    const read = () => {
      const out: Record<string, number> = {};
      g.querySelectorAll<HTMLElement>(`[data-${probe}='card']`).forEach((c) => {
        const body = c.querySelector<HTMLElement>(`[data-${probe}='body']`), n = c.querySelector<HTMLElement>(`[data-${probe}='count']`);
        if (!body || !n) return;
        const cs = getComputedStyle(body);
        const d = parseFloat(getComputedStyle(c.querySelector<HTMLElement>(".qc150-face") ?? body).width) || 30;
        const avail = body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - n.offsetWidth - (parseFloat(cs.columnGap) || 16) - 40;
        out[c.dataset.k!] = Math.max(1, Math.floor((avail - d) / (d - 6)) + 1);
      });
      setRoom((r) => (JSON.stringify(r) === JSON.stringify(out) ? r : out));
    };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(g);
    return () => ro.disconnect();
  }, [items, probe]);
  return (
    <section className={["qc150-glance", className].filter(Boolean).join(" ")} {...P("glance")} aria-labelledby={headingId}>
      <h3 id={headingId} className="qc150-gh" {...P("glance-title")}>At a glance</h3>
      <div className="qc150-cards" {...P("cards")} aria-busy={loading || undefined} ref={gridRef}>
        {items.map((c) => {
          const on = pressed === c.key;
          const fit = room[c.key] ?? c.faces.length;
          const faces = c.faces.slice(0, Math.min(c.faces.length, fit));
          const more = c.total - faces.length;
          const pressable = c.pressable !== false;
          return (
            <div key={c.key} className={`qc150-c qc150-c--${c.tone}`} {...P("card")} data-k={c.key} data-on={on && pressable ? "" : undefined}>
              <button type="button" className="qc150-hit" {...P("hit")} aria-pressed={pressable ? on : undefined} disabled={loading || !ready}
                aria-label={c.ariaLabel} onClick={() => onCard(c.key)} />
              <span className="qc150-h" {...P("head")}>
                <i className={c.swatch} aria-hidden="true" />
                <b>{c.label}</b>
                {c.doodle}
              </span>
              <span className="qc150-body" {...P("body")}>
                <span className="qc150-n" {...P("count")}>{ready ? c.figure : ""}</span>
                {c.extra}
                <span className={`qc150-faces qc150-faces--${c.tone}`} {...P("faces")} data-n={faces.length} data-more={more}>
                  {faces.map((f) => <span key={f.key} className="qc150-face" title={f.title}>{f.initials}</span>)}
                  {more > 0 ? <i className="qc150-more" {...P("more")}>+{more}</i> : null}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
