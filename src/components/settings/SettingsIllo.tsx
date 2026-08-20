/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SettingsIllo — the three decorative slots, addressed by name.
 *
 * ⚠️ IT IS A SLOT COMPONENT SO THE ILLUSTRATOR'S ASSETS DROP IN WITHOUT TOUCHING LAYOUT. Every
 * placement, size and opacity lives in `settings.css` against the slot's class; what is rendered
 * inside is one `PLACEHOLDER_ART` entry. Swapping a placeholder for real art is an edit to this
 * map and nothing else — no page, no stylesheet, no measurement.
 *
 * ⚠️ THESE ARE PLACEHOLDERS, MARKED AS SUCH IN CODE. They are the design study's own line drawings,
 * carried over so the slots are not empty boxes while the real set is drawn. The illustrator's
 * brief is correspondence-and-desk, burgundy/blush outgoing, sage incoming, drawn to the three
 * sizes below.
 *
 * ⚠️ AND EVERY SLOT IS DECORATION, SO EVERY SLOT IS `aria-hidden` AND `pointer-events: none`. The
 * section watermark in particular sits UNDER the body's content and must never take a click — the
 * measurement asserts that by asking the browser what is at the control's coordinates, not by
 * reading a z-index. A decorative mark that eats a button is the worst possible trade for it.
 */
import React from "react";
import { AccountSectionId } from "../../lib/accountRoutes";

/** The slots, by where they sit. Sizes are the design study's. */
export type IlloSlot =
  /** ~132×110, bottom-right of the header's tinted panel, behind the facts. */
  | "header"
  /** ~86×70, top-centre of the rail aside, above the plan text. */
  | "aside"
  /** ~140×120, bottom-right inside a section body. */
  | "section";

/** Shared line-art attributes — one stroke weight and one ink for the whole set. */
const STROKE = {
  fill: "none",
  stroke: "#7c3a2a",
  strokeWidth: 1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * ⚠️ PLACEHOLDER ART — REPLACE, DO NOT EXTEND. Each entry is one drawing; the day the real assets
 * arrive this map is what changes.
 */
const PLACEHOLDER_ART: Record<string, { w: number; h: number; d: React.ReactNode }> = {
  header: {
    w: 132, h: 110,
    d: (<><rect x="16" y="30" width="72" height="52" rx="3" /><path d="M16 34 52 60 88 34" />
        <path d="M62 18h44M62 26h30" /><circle cx="104" cy="72" r="13" /><path d="M104 65v7l5 3" /></>),
  },
  aside: {
    w: 86, h: 70,
    d: (<><path d="M14 54V22l14-8 14 8v32" /><path d="M42 54V30l14-8 14 8v24" />
        <path d="M8 54h70" /><path d="M24 34h8M24 42h8M52 40h8" /></>),
  },
  /* One per section that has a watermark — see SECTION_WATERMARK below. */
  "section:profile": {
    w: 150, h: 120,
    d: (<><path d="M20 96h110" /><rect x="34" y="46" width="58" height="44" rx="2" /><path d="M34 50l29 22 29-22" />
        <path d="M100 40l18 10v40l-18-10z" /><circle cx="62" cy="24" r="9" /><path d="M52 40c2-6 6-8 10-8s8 2 10 8" /></>),
  },
  "section:security": {
    w: 140, h: 120,
    d: (<><path d="M70 20l38 14v34c0 26-22 38-38 44-16-6-38-18-38-44V34z" />
        <rect x="56" y="58" width="28" height="24" rx="3" /><path d="M62 58v-7a8 8 0 0 1 16 0v7" /></>),
  },
  "section:notifications": {
    w: 140, h: 120,
    d: (<><rect x="20" y="40" width="64" height="46" rx="3" /><path d="M20 44l32 24 32-24" />
        <path d="M96 30c8 0 14 6 14 14 0 10-4 12-4 12h-20s-4-2-4-12c0-8 6-14 14-14z" /><path d="M92 60h16" /></>),
  },
  "section:preferences": {
    w: 140, h: 120,
    d: (<><circle cx="64" cy="56" r="26" /><path d="M64 40v16l11 7" />
        <path d="M64 18v-8M64 102v-8M18 56h-8M118 56h-8" /></>),
  },
};

/**
 * ⚠️ FOUR SECTIONS WEAR A WATERMARK, AND THE TWO THAT DO NOT ARE DELIBERATE.
 *   · PLAN has no room — its body is a two-column comparison from edge to edge, and a mark behind
 *     it would sit under a table rather than in space.
 *   · YOUR DATA has room and still gets nothing: a decorative flourish beside a control that
 *     permanently deletes someone's work is the wrong note, and the space it would fill is space
 *     that ought to feel plain.
 */
const SECTION_WATERMARK: Partial<Record<AccountSectionId, true>> = {
  profile: true, security: true, notifications: true, preferences: true,
};

export const hasSectionWatermark = (id: AccountSectionId): boolean => SECTION_WATERMARK[id] === true;

export const SettingsIllo: React.FC<{
  slot: IlloSlot;
  /** Required for the section slot — which section's mark to draw. */
  section?: AccountSectionId;
}> = ({ slot, section }) => {
  const key = slot === "section" ? `section:${section}` : slot;
  const art = PLACEHOLDER_ART[key];
  if (!art) return null;
  return (
    <svg
      className={`acct-illo acct-illo--${slot}`}
      width={art.w}
      height={art.h}
      viewBox={`0 0 ${art.w} ${art.h}`}
      aria-hidden="true"
      focusable="false"
      {...STROKE}
    >
      {art.d}
    </svg>
  );
};
