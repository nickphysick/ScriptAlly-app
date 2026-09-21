/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * qcFan — where a dealt card goes (Query Centre v21 §5). Pure: it takes a count and a viewport and
 * returns a place for each card. Nothing here knows what a query is.
 *
 * ⚠️ THE LAYOUT SPAN AND THE VISUAL EXTENT ARE DIFFERENT NUMBERS, AND THE BRIEF QUOTES THE SECOND.
 * §5 says "12 cards at 1280 span 80 → 1200px", which reads like a layout figure and is not one: the
 * cards are rotated about a point BELOW themselves, so the outermost swing well past where they sit.
 * Measured in the mockup itself at 1280: `getBoundingClientRect` gives 80.2 → 1199.8, while the
 * cards are LAID OUT from 150 to 1130 — centres 65.45 apart across 720, plus the card's own 260.
 * The 120px of difference is the swing, and it is why the brief's own trap 3 says to measure a
 * fanned card by its unrotated box. **This module returns unrotated placements; anything asserting
 * the brief's 80 → 1200 is asserting a rotated bounding box and must say so.**
 *
 * ⚠️ AND THE OVERLAP TEST IS ON THE SPACING, NOT ON THE COUNT. A hand of four at 1920 does not
 * overlap and a hand of four at 1024 does, so "rotate when there are more than N" would be a rule
 * about the wrong variable. Spacing below the card's own width IS overlap, by definition.
 */

/**
 * ⚠️ THE FAN DEALS AT MOST FIFTEEN QUERY CARDS, AND THE NUMBER IS ARITHMETIC RATHER THAN TASTE
 * (Nick's ruling, 21 Sep). A card is identifiable only while its visible strip still shows the
 * initials disc — about **50px**. At 1280 the hand's travel is `available - CARD` = **720px**, so
 * the strip is `720 / (n - 1)`: 51.4px at fifteen cards, **48px at sixteen**, and 14.7px at fifty.
 * The geometry at thirty and fifty is perfectly sound — nothing escapes, the symmetry holds — and a
 * 15px sliver is simply not a card anyone can read.
 *
 * ⚠️ SIXTEEN IS THE HAND, NOT THE DEAL. The sixteenth place belongs to the STACK card ("+35 more"),
 * so fifteen is what the cap has to be for the hand to come out at the width the strip survives.
 */
export const FAN_MAX_DEALT = 15;
/** The widest hand the fan ever lays out: the dealt cards plus the stack. */
export const FAN_MAX_HAND = FAN_MAX_DEALT + 1;
/** The narrowest strip of a card that still shows its initials disc — the cap's reason. */
export const FAN_MIN_STRIP = 48;

/** The card's drawn width — §5's 260. */
export const FAN_CARD_W = 260;
/** The most two card centres are ever set apart: the card plus a gap. */
export const FAN_MAX_GAP = FAN_CARD_W + 22;
/** The deck never uses the whole window, and never more than this. */
export const FAN_MAX_AVAIL = 1100;
/** The room the window leaves either side of the deck. */
export const FAN_VIEWPORT_INSET = 300;
/** The deck's vertical centre, as a fraction of the viewport (§5: "vertically at 44%"). */
export const FAN_CENTRE_Y = 0.44;

export interface FanCard {
  /** The card's left edge, unrotated, in viewport pixels. */
  left: number;
  /** Its centre, which is what the spacing is actually about. */
  centre: number;
  /** Degrees; 0 for every card while nothing overlaps. */
  rotate: number;
  /** How far this card sits below the deck's centre line — 0 at the middle of the hand. */
  drop: number;
  /** Left to right, so a later card draws over an earlier one. */
  z: number;
}

export interface FanLayout {
  cards: FanCard[];
  /** Centre-to-centre. 0 for a hand of one. */
  gap: number;
  /** True once the cards are closer together than they are wide. */
  overlapping: boolean;
  /** The room the deck had to work in. */
  available: number;
  /** The unrotated extent: the first card's left edge to the last card's right edge. */
  span: { left: number; right: number };
}

/**
 * Deal `n` cards across a viewport.
 *
 * ⚠️ ONE CARD SITS ALONE IN THE CENTRE (§5) — not at the left of an empty hand. A hand of one has no
 * spacing to compute, so `(available - CARD) / (n - 1)` would divide by zero; the guard is the
 * behaviour rather than a defence against it.
 *
 * ⚠️ AND A HAND OF ZERO IS A REAL CASE, because a stat card at 0 still opens. It deals nothing, and
 * the fan says so rather than drawing an empty deck.
 */
export function fanLayout(n: number, viewportW: number, viewportH: number): FanLayout {
  const available = Math.min(viewportW - FAN_VIEWPORT_INSET, FAN_MAX_AVAIL);
  const mid = viewportW / 2;

  if (n <= 0) {
    return { cards: [], gap: 0, overlapping: false, available, span: { left: mid, right: mid } };
  }
  if (n === 1) {
    const left = mid - FAN_CARD_W / 2;
    return {
      cards: [{ left, centre: mid, rotate: 0, drop: 0, z: 0 }],
      gap: 0, overlapping: false, available,
      span: { left, right: left + FAN_CARD_W },
    };
  }

  const gap = Math.min(FAN_MAX_GAP, (available - FAN_CARD_W) / (n - 1));
  /* ⚠️ THE CARDS ARE WIDER THAN THEY ARE SPACED — that, and only that, is what "overlapping" means */
  const overlapping = gap < FAN_CARD_W;
  /* the most any card turns: gentler as the hand grows, so a big hand does not become a wheel */
  const rotStep = overlapping ? Math.min(3, 28 / n) : 0;

  const half = (n - 1) / 2;
  const cards: FanCard[] = [];
  for (let i = 0; i < n; i++) {
    const from = i - half;
    const centre = mid + from * gap;
    cards.push({
      left: centre - FAN_CARD_W / 2,
      centre,
      rotate: from * rotStep,
      /* a squared term, so the hand hangs rather than tilting */
      drop: overlapping ? from * from * 2.4 : 0,
      z: i,
    });
  }
  return {
    cards, gap, overlapping, available,
    span: { left: cards[0].left, right: cards[n - 1].left + FAN_CARD_W },
  };
}

/** Where the deck's centre line sits — the cards hang from it. */
export const fanCentreY = (viewportH: number): number => viewportH * FAN_CENTRE_Y;
