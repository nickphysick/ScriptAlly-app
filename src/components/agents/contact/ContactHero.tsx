/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactHero — the v11 hero (§3): the title, the facts sentence, the three count cards, and the
 * live Add-new-agent card over the Archivist's art. Everything is placed from the hero's own
 * MEASURED width through `heroLayout` (lib/contactList.ts) — no constant in here describes
 * another element's size, and the art is placed from its VISIBLE edge, never the image box.
 *
 * ⚠️ THE CARD'S HEIGHT IS `offsetHeight`, DELIBERATELY — a transform never affects layout, so the
 * unscaled layout box is the honest input to the maths, and reading the bounding rect of a
 * rotated card would hand the formula its own swollen output (the house rotated-measure law).
 *
 * ⚠️ RE-MEASURED ON `document.fonts.ready` — the first pass runs in the fallback face and Special
 * Elite/Source Serif land later; a zero or unfinished reading is refused rather than written
 * (the published-measurement law).
 */
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ContactCard, ContactCardKey, HeroFacts, HERO_STACK_BELOW, heroLayout,
} from "../../../lib/contactList";

const ART_SRC = "/images/contact/hero-archivist.png";

/** The blank card's own face — placeholders, never values (v11 §3.4). One button. */
const BlankCard: React.FC<{ open: boolean; onOpen: () => void; onPaste: () => void }> = ({ open, onOpen, onPaste }) => (
  <button
    type="button"
    className="clv-heroc"
    data-clv="herocard"
    data-open={open || undefined}
    aria-haspopup="dialog"
    aria-expanded={open}
    onClick={onOpen}
  >
    <span className="clv-ac" data-clv="blankcard">
      <span className="clv-frame">
        <span className="clv-ac-band">
          <b>Add new agent</b>
          <span className="clv-plus" aria-hidden="true">+</span>
        </span>
        <span className="clv-acb">
          <span className="clv-who">
            <span className="clv-ini" aria-hidden="true">+</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="clv-ph clv-ph--nm">Agent&rsquo;s name</span>
              <span className="clv-ph clv-ph--sm">Agency</span>
              <span className="clv-ph clv-ph--sm clv-ph--w2">Location · reply time</span>
            </span>
          </span>
          <span className="clv-sec" style={{ display: "block" }}>
            <h5>Genres sought</h5>
            <span className="clv-gch">
              <i className="clv-d" /><i className="clv-d" /><i className="clv-d" />
            </span>
          </span>
          <span className="clv-sec" style={{ display: "block" }}>
            <h5>Manuscript wishlist</h5>
            <span className="clv-rule" style={{ display: "block", width: "88%" }} />
            <span className="clv-rule" style={{ display: "block", width: "66%" }} />
          </span>
          <span className="clv-sec" style={{ display: "block" }}>
            <h5>Materials requested</h5>
            <span className="clv-mch">
              <span>Query letter</span><span>Synopsis</span><span>Pages</span>
            </span>
          </span>
        </span>
        <span
          className="clv-paste"
          role="button"
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onPaste(); }}
        >
          <span>Or paste a link</span>
          <b>Fill in</b>
        </span>
      </span>
    </span>
  </button>
);

export const CountCards: React.FC<{
  cards: ContactCard[];
  sel: ReadonlySet<ContactCardKey>;
  onToggle: (k: ContactCardKey) => void;
  row?: boolean;
}> = ({ cards, sel, onToggle, row = false }) => (
  <div className={`clv-tiles${row ? " clv-tiles--row" : ""}${sel.size ? " clv-tiles--any" : ""}`} data-clv="tiles" role="group" aria-label="Filter by standing">
    {cards.map((c) => (
      <button
        key={c.key}
        type="button"
        className="clv-kt"
        data-k={c.key}
        data-clv="tile"
        aria-pressed={sel.has(c.key)}
        onClick={() => onToggle(c.key)}
      >
        <span className="clv-kh">
          <b>{c.count}</b>
          <span className="clv-kn">
            <span>{c.name}</span>
            <small className={c.urgent ? "clv-pd" : undefined}>{c.fact}</small>
          </span>
        </span>
      </button>
    ))}
  </div>
);

/** The facts sentence, from the one derivation — runs, never a finished string. */
const Facts: React.FC<{ f: HeroFacts }> = ({ f }) => (
  <p className="clv-facts" data-clv="facts">
    {f.total} agent{f.total === 1 ? "" : "s"} on file{f.msTitle ? <> for <i>{f.msTitle}</i></> : null}.{" "}
    {f.genre ? (
      <>
        {f.want} of them want {f.genre}, and <b>{f.fresh} of those you haven&rsquo;t queried yet</b>.
      </>
    ) : null}
  </p>
);

export interface ContactHeroProps {
  facts: HeroFacts;
  cards: ContactCard[];
  cardSel: ReadonlySet<ContactCardKey>;
  onToggleCard: (k: ContactCardKey) => void;
  addOpen: boolean;
  onAdd: () => void;
  onPasteAdd: () => void;
  /** The stacked flag, published upward — the count cards leave the hero below 760. */
  onStacked: (stacked: boolean) => void;
  stacked: boolean;
}

export const ContactHero: React.FC<ContactHeroProps> = ({
  facts, cards, cardSel, onToggleCard, addOpen, onAdd, onPasteAdd, onStacked, stacked,
}) => {
  const heroRef = useRef<HTMLElement | null>(null);
  const htxRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  const place = useCallback(() => {
    const hero = heroRef.current;
    const card = hero?.querySelector<HTMLElement>("[data-clv='herocard']");
    const htx = htxRef.current;
    if (!hero || !card || !htx) return;
    const W = hero.clientWidth;
    /* offsetHeight: the UNSCALED layout box — the transform is display only */
    const cardH0 = card.offsetHeight;
    const textH = htx.offsetHeight;
    /* ⚠️ a zero reading is the page before layout or a hidden container — refuse it */
    if (W <= 0 || cardH0 <= 0) return;
    const l = heroLayout({ W, cardH0, textH, titleRowH: textH });
    onStacked(l.stacked);
    const st = hero.style;
    st.setProperty("--clv-hh", `${Math.round(l.heroH)}px`);
    if (l.textW != null) st.setProperty("--clv-tw", `${l.textW}px`);
    st.setProperty("--clv-cl", `${l.cardLeft.toFixed(1)}px`);
    st.setProperty("--clv-ct", `${l.cardTop.toFixed(1)}px`);
    st.setProperty("--clv-cc", `${l.c.toFixed(4)}`);
    st.setProperty("--clv-il", `${l.imgLeft.toFixed(1)}px`);
    st.setProperty("--clv-it", `${l.imgTop.toFixed(1)}px`);
    st.setProperty("--clv-iw", `${l.imgW.toFixed(1)}px`);
    setReady(true);
  }, [onStacked]);

  useLayoutEffect(() => {
    place();
    const hero = heroRef.current;
    if (!hero) return;
    const ro = new ResizeObserver(place);
    ro.observe(hero);
    /* the faces arrive after the first pass — the card's height moves with them */
    let alive = true;
    void document.fonts?.ready?.then(() => { if (alive) place(); });
    return () => { alive = false; ro.disconnect(); };
  }, [place]);

  /* ⚠️ THE SECOND PASS AFTER A MODE FLIP, and it cannot be left to the ResizeObserver: crossing
     the stack boundary re-lays the text column (absolute column ↔ flex row), which changes the
     measurements the placement was computed FROM — but the hero's own box is held by the var the
     first pass wrote, so the observer sees no resize and the stale card-top stands (measured on
     a live 1440→1280 resize: --clv-ct 324 from the column's pre-flip height). The prop change IS
     the signal. */
  useLayoutEffect(() => { place(); }, [stacked, place]);

  /* the art's height moves the card's layout box once loaded — re-place on load too */
  const onArtLoad = useCallback(() => place(), [place]);

  return (
    <header
      className={`clv-hero${stacked ? " clv-hero--stack" : ""}`}
      data-clv="hero"
      data-ready={ready || undefined}
      ref={heroRef}
      aria-label="Contact list"
    >
      <img className="clv-hart" data-clv="art" src={ART_SRC} alt="" aria-hidden="true" onLoad={onArtLoad} />
      <div className="clv-htx" ref={htxRef}>
        <h1 className="clv-hero-t">Contact list</h1>
        <Facts f={facts} />
        {!stacked && <CountCards cards={cards} sel={cardSel} onToggle={onToggleCard} />}
      </div>
      <BlankCard open={addOpen} onOpen={onAdd} onPaste={onPasteAdd} />
    </header>
  );
};
