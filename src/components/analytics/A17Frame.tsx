/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v17 — the frame: the tooltip, the reveal, a section (open banner · perch · white frame ·
 * readings), the at-a-glance strip, the floating section tab, the loading cover and the example rows
 * of the empty page (design-refs/analytics-v17.html, measured at 1512 × 900 and 390 × 844).
 *
 * ⚠️ THE DRESS IS v126's, NOT A NEW ONE. The band is the shared `PageHeader band` (with `bandFixed`), the
 * frame is the desk's white frame, the caveats sit in the Query Centre's blush workspace under an
 * anthracite band, and the tab wears the Birds-eye tab's dress. Nothing here restates the 1360 column.
 *
 * ⚠️ THE ILLUSTRATION SLOTS SHIP EMPTY. The disc and the nine perches are tinted shapes with NO caption
 * text in the product; each takes an `artSrc`, so the commissioned art drops in without a layout change.
 */
import React from "react";
import type { V17Banner, V17Glance, V17Reading } from "../../lib/analyticsModel";

/* ── the tooltip: one per page, fed by every mark; hover on a desktop, a tap on a phone ── */
export interface TipApi { show: (x: number, y: number, body: React.ReactNode) => void; hide: () => void }
const TipCtx = React.createContext<TipApi>({ show: () => {}, hide: () => {} });
export const useTip = () => React.useContext(TipCtx);

export const TipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tip, setTip] = React.useState<{ body: React.ReactNode; x: number; y: number } | null>(null);
  const api = React.useMemo<TipApi>(() => ({
    show: (x, y, body) => setTip({ body, x: Math.min(x + 14, window.innerWidth - 270), y: y + 14 }),
    hide: () => setTip(null),
  }), []);
  /* a tap elsewhere puts a tapped tooltip away */
  React.useEffect(() => {
    if (!tip) return undefined;
    const off = (e: PointerEvent) => { if (!(e.target as Element | null)?.closest?.("[data-a17-mark]")) setTip(null); };
    document.addEventListener("pointerdown", off, true);
    return () => document.removeEventListener("pointerdown", off, true);
  }, [tip]);
  return (
    <TipCtx.Provider value={api}>
      {children}
      <div className={`a17-tip${tip ? " on" : ""}`} data-a17="tip" role="tooltip" aria-hidden={!tip}
        style={tip ? { left: tip.x, top: tip.y } : undefined}>{tip?.body}</div>
    </TipCtx.Provider>
  );
};

/** Hover (and tap) props for a mark: the ref's title line in the typewriter face, then plain lines. */
export function useMark() {
  const t = useTip();
  return (title: string, lines: string[]) => {
    const body = <><b>{title}</b>{lines.map((l, i) => <React.Fragment key={i}>{i ? <br /> : null}{l}</React.Fragment>)}</>;
    return {
      "data-a17-mark": "",
      onMouseMove: (e: React.MouseEvent) => t.show(e.clientX, e.clientY, body),
      onMouseLeave: () => t.hide(),
      /* ⚠️ HOVER BECOMES TAP: a phone has no hover, so a press shows the same tooltip */
      onClick: (e: React.MouseEvent) => t.show(e.clientX, e.clientY, body),
    };
  };
}

/* ── the scroll reveal: an element fades and rises the first time it is seen, nothing more ── */
export function useReveal(rootRef: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const scroller = root.closest(".wpg-scroll");
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { root: scroller, threshold: 0.12 });
    root.querySelectorAll(".a17-rv:not(.in)").forEach((x) => io.observe(x));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** An illustration slot: an empty tinted shape, or the art once it exists. */
export const Slot: React.FC<{ className: string; probe: string; artSrc?: string }> = ({ className, probe, artSrc }) => (
  <div className={className} data-a17={probe} aria-hidden="true">
    {artSrc ? <img src={artSrc} alt="" /> : null}
  </div>
);

/** The readings along a frame's foot: the desk's three halves. */
export const Readings: React.FC<{ items: V17Reading[] }> = ({ items }) => (
  <div className="a17-reads" data-a17="reads">
    {items.map((r, i) => (
      <div key={i} data-a17-fig="">
        <b className="a17-tw" data-a17="read-v" data-population={r.population ?? undefined}>{r.value}</b>
        <span>{r.label}</span>
      </div>
    ))}
  </div>
);

/** One section: the open banner (perch · count · title · sentence), then the frame or the workspace. */
export const Section: React.FC<{
  sec: number; banner: V17Banner; perchSrc?: string; readings?: V17Reading[]; ws?: boolean; children: React.ReactNode;
}> = ({ sec, banner, perchSrc, readings, ws, children }) => (
  <section className="a17-sect" data-a17="sec" data-sec={sec} id={`a17-sec-${sec}`}>
    <div className="a17-ban a17-rv" data-a17="ban">
      <Slot className="a17-perch" probe="perch" artSrc={perchSrc} />
      <div className="a17-bantxt">
        <div className="a17-cnt">{banner.count}</div>
        <h2 className="a17-tw" data-a17="ban-title">{banner.title}</h2>
        <p>{banner.sentence}{banner.bold ? <><b>{banner.bold}</b>. Four things worth keeping in mind.</> : null}</p>
      </div>
    </div>
    {ws ? children : (
      <div className="a17-frame a17-rv d1" data-a17="frame">
        <div className="a17-body">{children}</div>
        {readings ? <Readings items={readings} /> : null}
      </div>
    )}
  </section>
);

/* ── at a glance ── */
const Spark: React.FC<{ s: V17Glance["spark"] }> = ({ s }) => {
  const W = 200, H = 34, n = s.values.length, max = Math.max(...s.values, 1);
  if (n === 0) return <svg className="a17-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" data-a17="spark" aria-hidden="true" />;
  if (s.kind === "bars") {
    const bw = W / n;
    return (
      <svg className="a17-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" data-a17="spark" aria-hidden="true">
        {s.values.map((v, i) => v > 0 ? (
          <rect key={i} data-a17="spark-mark" x={i * bw + Math.min(1, bw * 0.15)} y={H - (v / max) * (H - 2)} width={Math.max(1, bw - Math.min(2, bw * 0.3))} height={(v / max) * (H - 2)} rx={1}
            className={i >= n - 13 ? "a17-anth" : "a17-anth28"} />
        ) : null)}
      </svg>
    );
  }
  const pts = s.values.map((v, i) => [n === 1 ? W : (i / (n - 1)) * W, H - 2 - (v / max) * (H - 6)] as const);
  const line = `M${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L")}`;
  const last = pts[pts.length - 1];
  return (
    <svg className="a17-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" data-a17="spark" aria-hidden="true">
      <path d={`${line} L${W} ${H} L0 ${H} Z`} className="a17-sparkfill" data-a17="spark-mark" />
      <path d={line} className="a17-sparkline" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0] - 2} cy={last[1]} r={3} className="a17-rustfill" />
    </svg>
  );
};

export const Glance: React.FC<{ cells: V17Glance[] }> = ({ cells }) => {
  const [range, setRange] = React.useState<"all" | "d90">("all");
  const rowRef = React.useRef<HTMLDivElement | null>(null);
  const [dot, setDot] = React.useState(0);
  return (
    <div className="a17-glance a17-rv" data-a17="glance">
      <div className="a17-gh">
        <h3 className="a17-tw">At a glance</h3>
        <small>Last 90 days · against the 90 before</small>
        <span className="a17-sp" />
        <div className="a17-seg" role="group" aria-label="Show">
          <button type="button" aria-pressed={range === "all"} data-a17="range" data-v="all" onClick={() => setRange("all")}>All time</button>
          <button type="button" aria-pressed={range === "d90"} data-a17="range" data-v="d90" onClick={() => setRange("d90")}>Last 90 days</button>
        </div>
      </div>
      <div className="a17-frame a17-glframe" data-a17="frame">
        <div className="a17-gl" ref={rowRef}
          onScroll={(e) => { const g = e.currentTarget; const c = g.children[0] as HTMLElement | undefined; if (c) setDot(Math.round(g.scrollLeft / (c.offsetWidth + 10))); }}>
          {cells.map((c) => {
            const v = range === "all" ? c.all : c.d90;
            return (
              <div key={c.key} data-a17="gcell" data-a17-fig="" data-key={c.key}>
                <div className="a17-gk">{c.label}</div>
                <div className="a17-gv a17-tw" data-a17="gv" data-population={v.population ?? undefined}>{v.value}{v.unit ? <small>{v.unit}</small> : null}</div>
                <div className="a17-gd" data-a17="gcmp">{c.compare.lead}<b>{c.compare.bold}</b>{c.compare.rest}</div>
                <Spark s={c.spark} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="a17-gdots a17-m" aria-hidden="true">{cells.map((c, i) => <i key={c.key} className={i === dot ? "on" : ""} />)}</div>
    </div>
  );
};

export const NAV_NAMES = (sent: number) => [
  sent === 1 ? "Where the one query got to" : `Where the ${sent} queries got to`, "Queries sent", "Response rate", "Response window honesty",
  "Wait times by stage", "Firsts and records", "The campaign over time", "How things stand", "Reading the numbers",
];

/**
 * The floating section tab — the Birds-eye tab's dress. ⚠️ PLACED FROM THE WINDOW BOX, MEASURED (24px inside
 * `.ws-window`'s right and bottom), never the viewport's edge: a fixed floater measured from the browser
 * sits in the shell's gutter rather than the page's. It tracks the section crossing 40–45% down the
 * scrollport, as the ref does, and reads "Under the hood" above the first.
 */
export const SectionTab: React.FC<{ pageRef: React.RefObject<HTMLElement | null>; names: string[]; onGo: (sec: number) => void }> = ({ pageRef, names, onGo }) => {
  const [cur, setCur] = React.useState(-1);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ right: number; bottom: number } | null>(null);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const curRef = React.useRef(-1);
  curRef.current = cur;
  React.useLayoutEffect(() => {
    const page = pageRef.current;
    const scroller = page?.closest(".wpg-scroll") as HTMLElement | null;
    if (!page || !scroller) return undefined;
    const place = () => {
      const win = page.closest(".ws-window") ?? scroller;
      const r = win.getBoundingClientRect();
      if (r.height > 0) setPos({ right: document.documentElement.clientWidth - r.right + 24, bottom: document.documentElement.clientHeight - r.bottom + 24 });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(scroller);
    window.addEventListener("resize", place);
    const secs = [...page.querySelectorAll<HTMLElement>('[data-a17="sec"]')];
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) setCur(secs.indexOf(e.target as HTMLElement));
    }), { root: scroller, rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    secs.forEach((x) => io.observe(x));
    const onScroll = () => {
      const first = secs[0];
      if (!first) return;
      const top = first.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      if (top > scroller.clientHeight * 0.45) setCur(-1);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); io.disconnect(); window.removeEventListener("resize", place); scroller.removeEventListener("scroll", onScroll); };
  }, [pageRef, names.length]);
  /* the menu closes on an outside press, on a choice and on Escape — Escape closes the MENU only */
  React.useEffect(() => {
    if (!open) return undefined;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("keydown", key, true); };
  }, [open]);
  const go = (i: number) => { setOpen(false); onGo(Math.max(0, Math.min(names.length - 1, i))); };
  return (
    <div className={`a17-tab${open ? " open" : ""}`} data-a17="tab" ref={ref} style={pos ? { right: pos.right, bottom: pos.bottom } : { visibility: "hidden" }}>
      {open && (
        <div className="a17-tabmenu" data-a17="tab-menu" role="menu" aria-label="Sections">
          {names.map((n, i) => (
            <button key={i} type="button" role="menuitem" className={i === cur ? "on" : ""} data-a17="tab-item" onClick={() => go(i)}>
              <i>{String(i + 1).padStart(2, "0")}</i>{n}
            </button>
          ))}
        </div>
      )}
      <div className="a17-tabic" aria-hidden="true">{cur < 0 ? "—" : String(cur + 1).padStart(2, "0")}</div>
      <div className="a17-tabt">
        <b data-a17="tab-name">{cur < 0 ? "Under the hood" : names[cur]}</b>
        <small>{cur < 0 ? `${names.length} sections · ↑ ↓ to move` : `${cur + 1} of ${names.length}`}</small>
      </div>
      <button type="button" title="Previous section" aria-label="Previous section" data-a17="tab-prev" onClick={() => go(curRef.current - 1)}>↑</button>
      <button type="button" title="Next section" aria-label="Next section" data-a17="tab-next" onClick={() => go(curRef.current + 1)}>↓</button>
      <button type="button" title="All sections" aria-label="All sections" aria-haspopup="menu" aria-expanded={open} data-a17="tab-all" onClick={() => setOpen((o) => !o)}>☰</button>
    </div>
  );
};

/** The loading cover: the strip's shape, then three banner-and-frame blocks. (The band is real.) */
export const Skeleton: React.FC = () => (
  <div data-a17="skeleton" aria-hidden="true">
    <div className="a17-glance">
      <div className="a17-gh"><span className="a17-sk" style={{ width: 150, height: 22 }} /></div>
      <div className="a17-frame a17-sk-strip" />
    </div>
    {[0, 1, 2].map((i) => (
      <section className="a17-sect" key={i}>
        <div className="a17-ban">
          <div className="a17-perch" />
          <div className="a17-bantxt">
            <span className="a17-sk" style={{ width: 140, height: 10 }} />
            <span className="a17-sk" style={{ width: "48%", height: 38, marginTop: 10 }} />
            <span className="a17-sk" style={{ width: "70%", height: 16, margin: "12px 0 22px" }} />
          </div>
        </div>
        <div className="a17-frame a17-sk-frame" />
      </section>
    ))}
  </div>
);

/** One example row of the empty page: a faded, tagged figure built from invented queries. */
export const ExampleRow: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="a17-sect a17-ex" data-a17="example">
    <div className="a17-ban">
      <div className="a17-perch" aria-hidden="true" />
      <div className="a17-bantxt">
        <div className="a17-cnt"><span className="a17-extag">Example</span></div>
        <h2 className="a17-tw">{title}</h2>
      </div>
    </div>
    <div className="a17-frame a17-exframe"><div className="a17-body">{children}</div></div>
  </section>
);
