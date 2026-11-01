/**
 * The waiting-list landing page's own pieces (waitlist v1, 31 Oct; refs design-refs/landing-mobile-v7.html,
 * design-refs/landing-desktop-v5.html and design-refs/birdseye-focus-v1.html option 2).
 *
 * ⚠️ EVERYTHING THAT MOVES HERE OBEYS ONE RULE: it starts when it is at least 60% visible, pauses when it
 * is scrolled away, and under `prefers-reduced-motion` shows its finished state with nothing moving.
 *
 * ⚠️ ONE BIRDS-EYE WINDOW, TWO LAYOUTS (waitlist v2, 1 Nov; refs design-refs/landing-mobile-v17.html and
 * landing-desktop-v14.html). `BirdsEyeFocus` draws both: one row lit, the rest ghosted, a detail card. The
 * phones' tilted animated showcase (`BirdsEyeShowcase`) is RETIRED. Its sample data is illustration, typed in
 * `landingCopy.ts`; nothing reads the store or today's date.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  BE_DATES, BE_STAGE_RGB, BE_DESK_ROWS, BE_FOCUS, REPLAY_LABEL, BeStage, TickItem, FeatureRow,
  DETAILS_HEADING, DETAILS_SUB, DETAILS_PILLS, featureAnchor, BE_HEADING, BE_LINE, BE_TICKS,
} from "./landingCopy";
import { useFounding, ensureCount } from "./foundingStore";
import { HeroCard, HeroCardControl, HeroCardFeature, FEATURE_VISIBLE } from "./HeroCard";
import { StatusGlyph } from "./marketingMarks";

export const reduceMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── The art, versioned by the first eight hex digits of each file's md5 (nothing in public/ is hashed) ── */
export const BE_HAWK = { src: "/images/qc/be-hawk-head.png", version: "a10c3aa9", width: 300, height: 287 };
export const POINTING_HAWK = { src: "/images/pointing-hawk.png", version: "dd4890ee", width: 408, height: 437 };
export const v = (a: { src: string; version: string }) => a.src + "?v=" + a.version;

/** The refs' ring-tick marker. */
export const Tick: React.FC = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="#a2452a" strokeWidth="1.6" />
    <path d="M6.2 10.3 8.8 12.8 13.8 7.6" fill="none" stroke="#a2452a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
/** The desktop's tick: a rust check on a blush disc (ref `.qh-ticks svg`). */
export const DiscTick: React.FC = () => (
  <svg className="mk-dtick" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const tickKey = (t: TickItem) => (typeof t === "string" ? t : t.b + t.rest);
/** A list of ticks; an item may carry a bold lead. `disc` is the desktop's mark, `className` the list's own. */
export const Ticks: React.FC<{ items: readonly TickItem[]; disc?: boolean; className?: string }> = ({ items, disc, className }) => (
  <ul className={className ?? "mk-wl-ticks"}>
    {items.map((t) => (
      <li key={tickKey(t)}>{disc ? <DiscTick /> : <Tick />}<span>{typeof t === "string" ? t : <><b>{t.b}</b>{t.rest}</>}</span></li>
    ))}
  </ul>
);

/** A feature's line, with its struck word where it has one (the strike is decoration, hidden from readers). */
export const FeatureLine: React.FC<{ row: FeatureRow; className?: string }> = ({ row, className }) => {
  const s = row.strike;
  if (!s) return <p className={className}>{row.body}</p>;
  return (
    <p className={className}>
      {s.before}<s className="mk-strike" aria-hidden="true">{s.word}</s>{" "}{row.body.slice(s.before.length)}
    </p>
  );
};

/* ── Scrolling to a sign-up: every CTA on the page does this, and none navigates ── */
/** The ids of the page's two sign-ups' fields (the `idPrefix` of each `FoundingSignup`, + "-email"). */
export const HERO_FORM = "mk-hero";
export const CLOSE_FORM = "mk-close";
export const BAND_FORM = "mk-band";
/** Scroll an element of this page to the top of the view, under the bar; instant under reduced motion. */
export const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
};
/** An in-page anchor: a real `#id` link that scrolls instead of changing the address. */
export const PageAnchor: React.FC<{ to: string; className?: string; children: React.ReactNode }> = ({ to, className, children }) => (
  <a href={"#" + to} className={className} onClick={(e) => { e.preventDefault(); scrollToId(to); }}>{children}</a>
);
export const scrollToForm = (prefix: string) => {
  const field = document.getElementById(prefix + "-email");
  const target = field ?? document.getElementById(prefix + "-signup");
  if (!target) return;
  target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" });
  field?.focus({ preventScroll: true });
};
/** Phones' Join: the hero's form while it is still ahead, the founding card's once the hero is passed. */
export const joinTarget = (): string => {
  const hero = document.getElementById(HERO_FORM + "-email");
  const bar = document.querySelector(".mk-navwrap")?.getBoundingClientRect().bottom ?? 0;
  return hero && hero.getBoundingClientRect().bottom > bar ? HERO_FORM : CLOSE_FORM;
};

/** One observer for "at least 60% visible", reporting each change. */
export function useSeen(ref: React.RefObject<HTMLElement | null>, onChange: (seen: boolean) => void) {
  const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => es.forEach((e) => cb.current(e.intersectionRatio >= FEATURE_VISIBLE)), { threshold: [0, FEATURE_VISIBLE] });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** The date row both windows draw (month bands, Monday ticks, the TODAY tag). */
const Dates: React.FC = () => (
  <div className="mk-be-dates">
    {BE_DATES.months.map((m) => <span key={m.name} className="mk-be-mo" style={{ left: m.from + "%", width: (m.to - m.from) + "%" }} />)}
    {BE_DATES.months.map((m) => <span key={m.name + "n"} className="mk-be-mn" style={{ left: `calc(${m.from}% + 8px)` }}>{m.name}</span>)}
    {BE_DATES.ticks.map((t) => <span key={t.label} className="mk-be-tk" style={{ left: t.at + "%" }}>{t.label}</span>)}
    <span className="mk-be-ttag" style={{ left: BE_DATES.today + "%" }}>{BE_DATES.todayLabel}</span>
  </div>
);

/** A bar's fill: solid up to today, the same colour at .42 after it (the refs' gradient). */
const fill = (l: number, w: number, k: BeStage, after = .42) => {
  const cut = Math.max(0, Math.min(100, (BE_DATES.today - l) / w * 100)), [r, g, b] = BE_STAGE_RGB[k];
  return `linear-gradient(90deg,rgb(${r},${g},${b}) ${cut}%,rgba(${r},${g},${b},${after}) ${cut}%)`;
};

/* ═════════════ The Birds-eye focus window (birdseye-focus-v1 option 2; both layouts) ═════════════ */
/**
 * The date row IS the navy header. One row in focus — Eleanor Whitfield, blush, a 3px rust edge, her bar
 * in colour; every other row a grey placeholder with its bar faded but still labelled. The bars draw in
 * once when the window is 60% visible, then the detail card fades in. The hawk's head stands on the navy
 * header's bottom edge at the left, fully opaque, rising above the window. Under reduced motion it is
 * drawn finished, with nothing moving.
 *   · `desk`: the band under the hero — a 230px names column, all but the last row, and the detail card
 *     inside the window's right side, level with rows 1–3, its pointer on Eleanor's row.
 *   · `phone`: a 78px names column, Eleanor's first name over her surname, all eight rows, and the card
 *     under the window, overlapping its bottom-right.
 * ⚠️ ONE COMPONENT: the layouts differ by the sizes in their CSS variables, the name cell and the card's
 * place — never by a second copy of the window.
 */
export const BirdsEyeFocus: React.FC<{ layout: "desk" | "phone" }> = ({ layout }) => {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (reduceMotion()) { root.current?.classList.add("mk-go", "mk-still"); done.current = true; }
  }, []);
  useSeen(root, (seen) => { if (seen && !done.current) { done.current = true; root.current?.classList.add("mk-go"); } });
  const phone = layout === "phone";
  const rows = phone ? BE_DESK_ROWS : BE_DESK_ROWS.slice(0, -1);
  const [first, ...last] = BE_FOCUS.name.split(" ");
  return (
    <div className={"mk-bef mk-bef--" + layout} ref={root} data-be={layout} aria-hidden="true">
      {/* The hawk stands on the navy header's bottom edge, in front of it, his head rising above the
          window (Nick, 31 Oct). Outside the window, which clips. */}
      <img className="mk-bef-hk" src={v(BE_HAWK)} alt="" width={BE_HAWK.width} height={BE_HAWK.height} />
      <div className="mk-bef-win">
        <div className="mk-bef-grid">
          <div className="mk-bef-whohead" />
          <div className="mk-bef-lanehead"><Dates /></div>
        </div>
        <div className="mk-bef-body">
          <span className="mk-bef-tline" style={{ left: `calc(var(--mk-bef-names) + (100% - var(--mk-bef-names)) * ${BE_DATES.today / 100})` }} />
          {rows.map(([l, w, k, say, ghost], i) => (
            <div key={i} className={"mk-bef-rw" + (ghost ? "" : " mk-on")}>
              <div className="mk-bef-who">
                {ghost ? (
                  <><span className="mk-bef-gc" /><span className="mk-bef-gt"><i style={{ width: ghost[0] + "%" }} /><i style={{ width: ghost[1] + "%" }} /></span></>
                ) : (
                  <><span className="mk-bef-gly"><StatusGlyph index={3} /></span>
                    {phone
                      ? <span><b>{first}</b><small>{last.join(" ")}</small></span>
                      : <span><b>{BE_FOCUS.name}</b><small>{BE_FOCUS.agency}</small></span>}</>
                )}
              </div>
              <div className="mk-bef-lane">
                <div className="mk-bef-bar" style={{ left: l + "%", width: w + "%", background: fill(l, w, k, .4) }}><span>{say}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mk-bef-peek">
        <div className="mk-bef-ph"><span className="mk-bef-gly"><StatusGlyph index={3} /></span><b>{BE_FOCUS.name}</b><small>{BE_FOCUS.agency}</small></div>
        <p>{BE_FOCUS.line[0]}<b>{BE_FOCUS.line[1]}</b>{BE_FOCUS.line[2]}</p>
        <span className="mk-bef-btn">{BE_FOCUS.action}</span>
      </div>
    </div>
  );
};

/* ═════════════ Desktop: the Birds-eye band, directly under the hero ═════════════ */
/**
 * Full width at the hero card's own width (`.mk-dh-wrap`): the heading on one line, the line centred under
 * it, the window, then the three ticks in one centred row (ref `.qh-beband`).
 */
export const BirdsEyeBand: React.FC = () => (
  <section className="mk-beb" aria-labelledby="mk-beb-h">
    <div className="mk-dh-wrap">
      <h2 id="mk-beb-h" className="mk-beb-h">{BE_HEADING}</h2>
      <p className="mk-beb-line">{BE_LINE}</p>
      <div className="mk-beb-stage"><BirdsEyeFocus layout="desk" /></div>
      <Ticks items={BE_TICKS} disc className="mk-beb-ticks" />
    </div>
  </section>
);

/* ═════════════ Desktop: the nav's founding pass (ref `.qh-navh`) ═════════════ */
/**
 * A see-through pill, "Become a founding writer" over a 4px places bar whose blush fill is the share of places
 * taken — the same store reading `HeroPlaces` takes, live or absent (the bar holds its box, invisible, until
 * the count arrives). It scrolls to the founding band's form.
 */
export const NavPass: React.FC<{ label: string }> = ({ label }) => {
  const { count } = useFounding();
  useEffect(ensureCount, []);
  const pct = count && count.cap > 0 ? Math.min(100, (Math.min(count.claimed, count.cap) / count.cap) * 100) : null;
  return (
    <button type="button" className="mk-navpass" onClick={() => scrollToForm(BAND_FORM)}>
      <span>{label}</span>
      <em aria-hidden="true" className={pct === null ? "mk-wait" : undefined}><i style={{ width: (pct ?? 0) + "%" }} /></em>
    </button>
  );
};

/* ═════════════ The details banner, after the Birds-eye view (both layouts) ═════════════ */
/**
 * A navy band: the hawk's portrait, the heading ("at-a-glance" held on one line), the sub-line and six pills,
 * each an in-page anchor to its feature. Phones: centred, the portrait straddling the band's top edge, the
 * pills a 2 × 3 grid. Desktop: the text left in a 760px column, the portrait right, behind the pills.
 * ⚠️ NO EYEBROW ABOVE THE HEADING, AND NO UPPERCASE ANYWHERE IN IT (Nick, 1 Nov).
 */
export const HAWK_PORTRAIT = { src: "/images/hawk-portrait.webp", version: "a8d0e9fe", width: 500, height: 500 };
export const DetailsBanner: React.FC<{ layout: "desk" | "phone" }> = ({ layout }) => (
  <section className={"mk-det mk-det--" + layout} aria-labelledby="mk-det-h">
    <div className="mk-det-in">
      <img className="mk-det-hawk" src={v(HAWK_PORTRAIT)} alt="" width={HAWK_PORTRAIT.width} height={HAWK_PORTRAIT.height} loading="lazy" />
      <div className="mk-det-tx">
        <h2 id="mk-det-h" className="mk-det-h">{DETAILS_HEADING[0]}<span className="mk-det-keep">{DETAILS_HEADING[1]}</span>{DETAILS_HEADING[2]}</h2>
        <p className="mk-det-sub">{DETAILS_SUB}</p>
        <nav className="mk-det-pills" aria-label="Features">
          {DETAILS_PILLS.map((p) => <PageAnchor key={p.key} to={featureAnchor(p.key)}>{p.label}</PageAnchor>)}
        </nav>
      </div>
    </div>
  </section>
);

/* ═════════════ "Every query tracked": the real card, played once ═════════════ */
/**
 * Phones: the real `HeroCard`'s single front card on a blush panel, tilted −1.5°, the pointing hawk poking
 * up from the panel's bottom-right edge with his feet cut off by it. Desktop: the hero's own pile, top
 * card animated, in the row illustrations' frame, the hawk standing bottom-right with his feet level with
 * the front card's base. Both: no cast shadow, no fly-past, the story once, then "Play again".
 * ⚠️ THE CARD'S PROPS ARE STABLE REFS, SO THE "PLAY AGAIN" STATE HERE NEVER RE-RENDERS THE CARD.
 */
export const TrackFeature: React.FC<{ layout: "phone" | "desk" }> = ({ layout }) => {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<HeroCardControl | null>(null);
  const [again, setAgain] = useState(false);
  const feature = useRef<HeroCardFeature>({ backs: layout === "desk", control, onDone: () => setAgain(true) }).current;

  /* Fit the card (phone) or the pile (desk) to the frame, from offsets and static transforms — never a live
     rect, which would be the story's animation. */
  useEffect(() => {
    const el = host.current; if (!el) return;
    const fit = () => {
      const pile = el.querySelector<HTMLElement>(".mk-hc-pile"), front = el.querySelector<HTMLElement>('[data-hc="front"]');
      const hawk = el.querySelector<HTMLElement>(".mk-trk-hawk");
      if (!pile || !front || !hawk) return;
      const W = el.clientWidth, H = el.clientHeight;
      if (layout === "phone") {
        /* The ref's frame is 342 × 458 at 390 wide; the card sits at (12, 18), 278 wide. The hawk stands at
           (226, 272), 140 wide (v2, ref landing-mobile-v17 `.oA .trk .hawk`): with no blush panel left to cut
           him off at the frame's edge, v1's (230, 318, 156) put him ~20px past the screen's right edge.
           Everything scales with the frame's width. */
        const k = W / 342, s = 278 * k / front.offsetWidth;
        pile.style.transform = `translate(${12 * k - front.offsetLeft * s}px,${18 * k - front.offsetTop * s}px) scale(${s})`;
        el.style.height = 458 * k + "px";
        Object.assign(hawk.style, { left: 226 * k + "px", top: 272 * k + "px", width: 140 * k + "px" });
        return;
      }
      let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
      pile.querySelectorAll<HTMLElement>(".mk-lc").forEach((c) => {
        const cs = getComputedStyle(c).transform, m = new DOMMatrixReadOnly(cs === "none" ? undefined : cs);
        const hx = Math.abs(m.a) * c.offsetWidth / 2 + Math.abs(m.c) * c.offsetHeight / 2, hy = Math.abs(m.b) * c.offsetWidth / 2 + Math.abs(m.d) * c.offsetHeight / 2;
        const cx = c.offsetLeft + c.offsetWidth / 2, cy = c.offsetTop + c.offsetHeight / 2;
        top = Math.min(top, cy - hy); bottom = Math.max(bottom, cy + hy); left = Math.min(left, cx - hx); right = Math.max(right, cx + hx);
      });
      /* The pile fills the frame's height (with a little air) and sits left of centre, leaving the hawk his room. */
      const s = Math.min((H * .96) / (bottom - top), (W * .78) / (right - left));
      const dx = W * .42 - (left + right) / 2 * s, dy = H / 2 - (top + bottom) / 2 * s;
      pile.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
      const base = dy + (front.offsetTop + front.offsetHeight) * s, fr = dx + (front.offsetLeft + front.offsetWidth) * s;
      const hw = Math.min(W * .3, H * .42);
      Object.assign(hawk.style, { width: hw + "px", left: fr - hw * .32 + "px", top: base - hw * (POINTING_HAWK.height / POINTING_HAWK.width) + "px" });
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(fit, () => {});
    return () => ro?.disconnect();
  }, [layout]);

  return (
    <div className={layout === "phone" ? "mk-trk" : "mk-trkd mk-rowillo"} ref={host} data-trk={layout}>
      <div className="mk-trk-card"><HeroCard host={host} variant={layout} feature={feature} /></div>
      <img className="mk-trk-hawk" src={v(POINTING_HAWK)} alt="" width={POINTING_HAWK.width} height={POINTING_HAWK.height} />
      <button type="button" className={"mk-trk-again" + (again ? " mk-on" : "")} tabIndex={again ? 0 : -1} aria-hidden={again ? undefined : true}
              onClick={() => { setAgain(false); control.current?.replay(); }}>
        {REPLAY_LABEL}
      </button>
    </div>
  );
};
