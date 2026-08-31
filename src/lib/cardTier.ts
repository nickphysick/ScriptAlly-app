/**
 * Which rung of the content ladder a card is drawn at.
 *
 * ⚠️ THE ROOM, NOT THE CARD, DECIDES — AND THAT IS THE WHOLE POINT OF THIS MODULE.
 *
 * v40 draws one card per relationship, so a card spans months rather than the stretch between two
 * status changes and its width stopped predicting whether its words fit. What decides that is the
 * room LEFT after the marks riding on it: a 400px card whose last mark sits at 380 has twenty
 * pixels for its sentence. Measured on the first one-card render, before this existed — one card
 * drew nothing at all and its neighbour's text ran off its own right edge, both of them
 * comfortably over 300px wide. Reading `clientWidth` would have called both of them roomy.
 *
 * ⚠️ AND IT IS A PURE FUNCTION BECAUSE THE THRESHOLD IS ARITHMETIC. The disc a stub paints is a
 * fact about the stylesheet and is measured on a rendered page; which rung a set of widths lands
 * on is a fact about a comparison, and a measurement cannot reach it — the board's own
 * `ResizeObserver` watches the board, so a card driven narrow in the page is never re-tiered, and
 * no viewport the board allows produces a card under the threshold anyway. Split, each half is
 * provable; together they were neither.
 */
export type CardTier = "full" | "headline" | "pill" | "stub";

/**
 * A card narrower than this has nowhere to put a pill however its marks fall, and is drawn as a
 * disc rather than as a squeezed version of something else.
 */
export const STUB_MAX_W = 60;

export interface TierInput {
  /** the card's own painted width */
  card: number;
  /** the room after the last mark riding on it — what the content actually has */
  room: number;
  /** pill + gap + the whole track: headline, separator and detail */
  full: number;
  /** pill + gap + the headline alone */
  headline: number;
}

export function tierFor({ card, room, full, headline }: TierInput): CardTier {
  if (card < STUB_MAX_W) return "stub";
  if (full <= room + 1) return "full";
  if (headline <= room + 1) return "headline";
  /* ⚠️ THE BOTTOM RUNG IS `pill` AND NOT A SECOND STUB. A wide card whose marks have eaten its
     room is still a card — its width is its span, which is data — so it keeps it, and the pill
     finds a side that has space. Only a card too narrow to be a card becomes a disc. */
  return "pill";
}
