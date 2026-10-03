/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v13 — the frame: the tooltip, the feature container, a section, the dot nav, the reveal,
 * the loading cover and the whole-page empty state (design-refs/analytics-v13.html).
 *
 * ⚠️ THE FEATURE CONTAINER REPLACES THE LIVING HEADER ON THIS PAGE, and is the page's only call to
 * action: "Take a look ↓" scrolls to the first section. The page's name lives in the bar's breadcrumb.
 *
 * ⚠️ THE ILLUSTRATIONS ARE PLACEHOLDERS — the ref's tinted boxes with their captions. Nick is
 * commissioning the art; nothing is drawn in them.
 */
import React from "react";
import type { AnalyticsModel, V13Reading } from "../../lib/analyticsModel";

/* ── the tooltip: one per page, fed by every mark ── */
export interface TipApi { show: (e: React.MouseEvent, body: React.ReactNode) => void; hide: () => void }
const TipCtx = React.createContext<TipApi>({ show: () => {}, hide: () => {} });
export const useTip = () => React.useContext(TipCtx);

export const TipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tip, setTip] = React.useState<{ body: React.ReactNode; x: number; y: number } | null>(null);
  const api = React.useMemo<TipApi>(() => ({
    show: (e, body) => setTip({ body, x: e.clientX + 14, y: e.clientY + 14 }),
    hide: () => setTip(null),
  }), []);
  return (
    <TipCtx.Provider value={api}>
      {children}
      <div className={`a13-tip${tip ? " on" : ""}`} data-a13="tip" role="tooltip" aria-hidden={!tip}
        style={tip ? { left: tip.x, top: tip.y } : undefined}>{tip?.body}</div>
    </TipCtx.Provider>
  );
};

/** Hover props for a mark: the ref's title line in the typewriter face, then plain lines. */
export function useMark() {
  const t = useTip();
  return (title: string, lines: string[]) => ({
    "data-a13": "mark",
    onMouseMove: (e: React.MouseEvent) => t.show(e, <><b>{title}</b>{lines.map((l, i) => <React.Fragment key={i}>{i ? <br /> : null}{l}</React.Fragment>)}</>),
    onMouseLeave: () => t.hide(),
  });
}

/* ── the scroll reveal: an element fades and rises the first time it is seen, nothing more ── */
export function useReveal(rootRef: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const scroller = root.closest(".wpg-scroll");
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { root: scroller, threshold: 0.12 });
    root.querySelectorAll(".a13-rv:not(.in)").forEach((x) => io.observe(x));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const Placeholder: React.FC<{ lines: string[] }> = ({ lines }) => (
  <div className="a13-ph" aria-hidden="true">{lines.map((l, i) => <React.Fragment key={i}>{i ? <br /> : null}{l}</React.Fragment>)}</div>
);

export const Feature: React.FC<{ model: AnalyticsModel; onGo: () => void }> = ({ model, onGo }) => {
  const ref = React.useRef<HTMLElement | null>(null);
  const txt = React.useRef<HTMLDivElement | null>(null);
  /* the paragraph hides when the text column overflows its container — measured with it shown, so a
     taller window brings it back */
  React.useLayoutEffect(() => {
    const el = ref.current, t = txt.current;
    if (!el || !t) return undefined;
    const check = () => {
      el.removeAttribute("data-tight");
      /* ⚠️ AGAINST THE CONTAINER, NOT ITSELF: a grid item's `min-height: auto` lets the column grow to
         its content, so it never reports overflow — the container clips it instead */
      if (t.scrollHeight > el.clientHeight + 1) el.setAttribute("data-tight", "1");
    };
    check();
    /* ⚠️ AND AGAIN WHEN THE FACES LAND: the first check runs in the fallback font, and a font swap
       changes the text's height without resizing the container, so an observer on the container alone
       never re-asks (measured: the button left clipped at 1440×820). */
    let live = true;
    document.fonts?.ready.then(() => { if (live) check(); });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    [...t.children].forEach((c) => ro.observe(c));
    return () => { live = false; ro.disconnect(); };
  }, []);
  return (
  <section className="a13-feat" data-a13="feature" ref={ref}>
    <div className="a13-feat-txt" ref={txt}>
      <div className="a13-eyebrow">{model.v13.feature.eyebrow}</div>
      <h1 className="a13-tw">Take the guesswork out of querying</h1>
      <p className="a13-feat-sub">
        Replies come back one at a time over months, and it is hard to see a pattern in a pile of letters. This page
        keeps all of your queries in one picture and updates it every time you record a reply, so you can decide
        what to send next on what has actually happened so far.
      </p>
      <div className="a13-feat-grid">
        <div className="a13-feat-g"><b>Where the book gets to</b><span>How many queries reach each stage, from the first letter to an offer.</span></div>
        <div className="a13-feat-g"><b>Response rate</b><span>How many agents asked for more, and what happened to those requests.</span></div>
        <div className="a13-feat-g"><b>How long things take</b><span>What each agent said to expect against when they replied, and the usual gap between stages.</span></div>
        <div className="a13-feat-g"><b>Where everything stands today</b><span>Every query on one timeline, so nudges and closes are decided on the current picture.</span></div>
      </div>
      <div className="a13-feat-acts">
        <button type="button" className="a13-b1" data-a13="take-a-look" onClick={onGo}>Take a look ↓</button>
        <span className="a13-hint">{model.v13.feature.hint}</span>
      </div>
    </div>
    <div className="a13-feat-pic"><Placeholder lines={["Illustration · large", "the Archivist and the hawk at the ledger,", "letters sorted into trays"]} /></div>
  </section>
  );
};

export const Readings: React.FC<{ items: V13Reading[] }> = ({ items }) => (
  <div className="a13-read a13-rv d3" data-a13="readings">
    {items.map((r, i) => <div key={i}><b>{r.value}</b><span>{r.label}</span></div>)}
  </div>
);

export const Section: React.FC<{
  sec: number; num: string; headline: string; lede: string; art: string[]; white?: boolean; flip?: boolean; artH?: number;
  children?: React.ReactNode; readings?: V13Reading[];
}> = ({ sec, num, headline, lede, art, white, flip, artH, children, readings }) => (
  <section className={`a13-chap${white ? " a13-white" : ""}${flip ? " a13-flip" : ""}`} data-a13="sec" data-sec={sec} id={`a13-sec-${sec}`}>
    <div className="a13-top">
      <div>
        <div className="a13-num a13-rv">{num}</div>
        <h2 className="a13-big a13-tw a13-rv d1">{headline}</h2>
        <p className="a13-lede a13-rv d2">{lede}</p>
      </div>
      <div className="a13-cph a13-rv d2" style={artH ? { height: artH } : undefined}><Placeholder lines={art} /></div>
    </div>
    <div className="a13-rv d2">{children}</div>
    {readings ? <Readings items={readings} /> : null}
  </section>
);

export const NAV_LABELS = ["Fall-off by stage", "Queries sent", "Response rate", "Response window honesty", "Wait times by stage", "How things stand", "Caveats"];

/**
 * The floating dot nav. ⚠️ PLACED FROM THE SCROLLER'S MEASURED BOX, never the browser's edge — a fixed
 * floater measured from the window sits in the bar's gutter rather than the page's. It tracks the
 * section crossing the band 35–45% down the scrollport, as the ref does.
 */
export const DotNav: React.FC<{ pageRef: React.RefObject<HTMLElement | null>; onGo: (sec: number) => void }> = ({ pageRef, onGo }) => {
  const [active, setActive] = React.useState(-1);
  const [pos, setPos] = React.useState<{ right: number; top: number } | null>(null);
  React.useEffect(() => {
    const page = pageRef.current;
    const scroller = page?.closest(".wpg-scroll") as HTMLElement | null;
    if (!page || !scroller) return undefined;
    const place = () => {
      const r = scroller.getBoundingClientRect();
      if (r.height > 0) setPos({ right: window.innerWidth - r.right + 22, top: r.top + r.height / 2 });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(scroller);
    window.addEventListener("resize", place);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.sec));
    }), { root: scroller, rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    page.querySelectorAll('[data-a13="sec"]').forEach((x) => io.observe(x));
    const onScroll = () => { if (scroller.scrollTop < 40) setActive(-1); };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); io.disconnect(); window.removeEventListener("resize", place); scroller.removeEventListener("scroll", onScroll); };
  }, [pageRef]);
  return (
    <nav className="a13-nav" data-a13="nav" aria-label="Sections" style={pos ? { right: pos.right, top: pos.top } : { visibility: "hidden" }}>
      {NAV_LABELS.map((l, i) => (
        <button key={l} type="button" className="a13-dot" data-a13="nav-dot" data-l={l} aria-label={l}
          aria-current={active === i ? "true" : undefined} onClick={() => onGo(i)} />
      ))}
    </nav>
  );
};

/** The loading cover: the feature container's shape and the first section's, placeholders inside. */
export const Skeleton: React.FC = () => (
  <div data-a13="skeleton" aria-hidden="true">
    <section className="a13-feat">
      <div className="a13-feat-txt" style={{ gap: 14 }}>
        <span className="a13-sk" style={{ width: 200, height: 11 }} />
        <span className="a13-sk" style={{ width: "80%", height: 44 }} />
        <span className="a13-sk" style={{ width: "60%", height: 44 }} />
        <span className="a13-sk" style={{ width: "95%", height: 60, marginTop: 6 }} />
        <span className="a13-sk" style={{ width: "100%", height: 110, marginTop: 10 }} />
        <span className="a13-sk" style={{ width: 160, height: 48, borderRadius: 24, marginTop: 10 }} />
      </div>
      <div className="a13-feat-pic"><span className="a13-sk" style={{ width: "100%", height: "100%", borderRadius: 0 }} /></div>
    </section>
  </div>
);

/** One example row of the empty state: heading, a plain line, and a populated figure tagged "Example". */
export const ExampleRow: React.FC<{ heading: string; sub: string; children: React.ReactNode }> = ({ heading, sub, children }) => (
  <section className="a13-exrow" data-a13="example">
    <div>
      <span className="a13-extag">Example</span>
      <h3 className="a13-tw">{heading}</h3>
      <p>{sub}</p>
    </div>
    <div className="a13-exfig">{children}</div>
  </section>
);
