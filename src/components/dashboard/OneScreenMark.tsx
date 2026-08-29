/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenMark — the mark slot in a dashboard container header (§1; ref design-refs/header-marks.html).
 *
 * ⚠️ THE SLOT IS THE DELIVERABLE, NOT THE ICON. These headers label SURFACES, so the destination is
 * an illustrated mark Nick commissions; the monoline icon is the temporary occupant. So the box is
 * built for the SWAP: fixed 28px, `flex: 0 0 28px`, contents bounded and `object-fit: contain`, and
 * the box's size stated independently of whatever is inside it. An icon at 17px and a future
 * illustration at full bleed occupy the same footprint, so replacing one with the other is a
 * one-line change per header and moves nothing.
 *
 * ⚠️ THIS IS NOT A REVERSAL OF THE ICONS-VS-ILLUSTRATIONS RULE. Monoline icons are for navigation,
 * state and controls; illustrated marks are for objects and surfaces. A container header names a
 * surface, so it lands in the illustrated family — these icons are standing in until it arrives,
 * which is exactly why they must not become load-bearing.
 *
 * ⚠️ EVERY BRIEF LIVES IN A COMMENT, NEVER IN RENDERED MARKUP. A brief that renders is a brief that
 * ships: the To-do board's ArtSlot learned this on 7 Aug when its caption had to be deleted after
 * shipping as body text. The placeholder shows the slot NAME in mono, nothing more.
 */
import React, { useState } from "react";
import rolodexMark from "../../assets/shell/agents-on-file-icon.png";
import manuscriptMark from "../../assets/shell/manuscript-icon.png";
import allQueriesMark from "../../assets/shell/all-queries-icon.png";

/** The four marks, and the brief each one is waiting for. */
export type MarkName =
  | "active-queries" | "goals" | "activity" | "tasks" | "community"
  /* the page-band keys — one per page that mounts variant="band" */
  | "queries" | "todo" | "calendar" | "contacts" | "packages" | "analytics"
  | "noteboard" | "discover" | "settings" | "manuscripts" | "comps";

/**
 * ⚠️ THE BRIEFS. Kept beside the icons they will replace so the two never drift apart, and kept
 * OUT of the rendered output (see above).
 *
 *   active-queries — a line rising across a ruled page, ink-drawn
 *   goals          — a wax-sealed target, or a pin in a chart
 *   activity       — a clock face over a stack of filed cards
 *   tasks          — a pencil resting on a ticked list
 *
 * ⚠️ `src` IS ABSENT FOR ALL FOUR, and that absence is the whole state machine: present → the
 * artwork, absent → the mono placeholder. Adding an asset is a one-line change here.
 */
const MARK: Record<MarkName, { label: string; icon: React.ReactNode; src?: string }> = {
  /* a line rising across a ruled page, ink-drawn */
  "active-queries": {
    label: "chart",
    icon: <><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>,
  },
  /* a wax-sealed target, or a pin in a chart */
  goals: {
    label: "goal",
    icon: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 4V2M12 22v-2M4 12H2M22 12h-2" /></>,
  },
  /* a clock face over a stack of filed cards */
  activity: {
    label: "clock",
    icon: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  },
  /* a pencil resting on a ticked list */
  tasks: {
    label: "list",
    icon: <><path d="M4 6h10M4 12h7M4 18h5" /><path d="M15 15l5-5 2 2-5 5-3 1z" /></>,
  },
  /**
   * two figures, one behind the other — the cohort, not a single writer.
   *
   * ⚠️ THE COMMUNITY BAND JOINED THE SHARED SLOT RATHER THAN KEEPING ITS OWN (community empty-state
   * pack). It rendered a bespoke `.os-commic` span holding a lucide `<Users />` — a FOURTH copy of
   * a plate the other three headers already shared, at a different size with no plate at all. It
   * reads the map now, which means it inherits the 28px box, the swap-ready geometry and the
   * degrade path for free, and it takes an illustrated mark the same one-line way the others will.
   */
  community: {
    label: "figures",
    icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3.2 19v-.8A5.8 5.8 0 0 1 9 12.4a5.8 5.8 0 0 1 5.8 5.8v.8" /><path d="M15.4 5.2a3.2 3.2 0 0 1 0 6M17 12.7a5.8 5.8 0 0 1 3.8 5.5v.8" /></>,
  },

  /* ── the page-band marks. Briefs in comments only, per the ArtSlot convention. ── */
  /**
   * the paper plane, sitting on the stack it came off — the queries you have sent.
   *
   * ⚠️ ADDING `src` IS THE WHOLE CHANGE, AND IT RESIZES THE HEADER BY ITSELF. `markHasArt` reads
   * this one field, so Query Centre's mark goes from the 38px plated glyph to the 88px bare
   * illustration without a call site being touched — which is the point of the rule below. The
   * monoline plane stays as the degrade path, and it is the same drawing, so a 404 changes the
   * fidelity and not the subject.
   *
   * ⚠️ THE ASSET IS ON WHITE PAPER, NOT TRANSPARENCY (verified: `hasAlpha: no`), which is exactly
   * what `.wsh-mark--xl .os-mark img`'s `mix-blend-mode: multiply` is there for — and why the
   * entrance-animation guard beneath it must not be removed as redundant.
   */
  queries: {
    label: "plane",
    src: allQueriesMark,
    icon: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  },
  /* a ticked checklist on a clipboard */
  todo: { label: "check", icon: <><path d="M4 6h11M4 12h11M4 18h7" /><path d="M17 16l2 2 4-4" /></> },
  /* a calendar leaf, one date circled */
  calendar: { label: "cal", icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></> },
  /**
   * a rolodex — cards, a spine and a phone. THE BRIEF IS THIS COMMENT AND NEVER RENDERS.
   *
   * ⚠️ THE ARTWORK IS BACK, AND THIS IS THE ONE-LINE CHANGE THE NOTE PROMISED. The asset was
   * deleted with the dashboard's painted marks, the import failed the production build, and this
   * entry dropped to the monoline degrade path — correct behaviour for a missing file. The file
   * exists again, so the `src` returns and the Contact list's header takes the rolodex at 64px,
   * bare, instead of a 38px glyph on a plate.
   *
   * ⚠️ THE SAME ASSET SERVES THE DASHBOARD'S "Agents on file" COUNTER at 44px. One drawing, two
   * mounts, sizes at the call sites — the slot's box is independent of its contents, which is what
   * lets 44 and 64 share a file. The monoline figure stays as the degrade path, per the ArtSlot
   * rule: a 404 must not leave a broken-image glyph in a header.
   */
  contacts: {
    label: "figure",
    src: rolodexMark,
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></>,
  },
  /* a wrapped parcel, string and all */
  packages: { label: "parcel", icon: <><path d="M3 8h18v12H3z" /><path d="M3 8l3-5h12l3 5M12 8v12" /></> },
  /* a trend line rising across a ruled page */
  analytics: { label: "trend", icon: <><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></> },
  /* ⚠️ MY CALL, REPORTED: a pinned note — the board is things you kept, not things due */
  noteboard: { label: "note", icon: <><path d="M5 4h14v16l-5-4H5z" /><path d="M9 9h6M9 13h4" /></> },
  /* ⚠️ MY CALL: a compass — Discover is looking outward for agents you do not have yet */
  discover: { label: "compass", icon: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></> },
  /**
   * a stack of bound pages — the shelf, not a single book. THE BRIEF IS THIS COMMENT AND NEVER
   * RENDERS.
   *
   * ⚠️ THE SAME ASSET ALREADY SERVES `OneScreenAuthor` AND THE SHELL's manuscript scope. One
   * drawing, three mounts, sizes at the call sites — see the rolodex note above. The monoline
   * shelf stays as the degrade path.
   */
  manuscripts: {
    label: "shelf",
    src: manuscriptMark,
    icon: <><path d="M4 4h6v16H4zM12 4h4v16h-4z" /><path d="M18 5l3 15" /></>,
  },
  /* two books side by side — the comparison itself */
  comps: { label: "comps", icon: <><path d="M4 5h7v14H4z" /><path d="M13 5h7v14h-7z" /></> },
  /* ⚠️ MY CALL: a cog, the one place a mechanism is the honest metaphor */
  settings: { label: "cog", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></> },
};

/**
 * ⚠️ THE MARK'S SIZE IS A RULE, NOT A CALLER'S OPINION — and this is the same knob-versus-rule
 * distinction the header's HEIGHT already makes (see pageHeader.css).
 *
 * Illustration present → 64px and BARE. No illustration → the 38px monoline glyph on its plate.
 * A page does not choose; it is told, by whether its drawing exists. So when a mark's artwork
 * lands, that ONE line in the map above converts its page — no call site is edited, and there is
 * no decision left for anyone to get wrong or forget.
 *
 * ⚠️ IT READS THE MAP, NOT THE LOAD. A 404 at runtime falls back to the monoline glyph but KEEPS
 * the 64px bare box (the degrade path pageHeader.css already sizes) — because the alternative is a
 * header whose geometry changes when a network request fails.
 */
export const markHasArt = (name: MarkName): boolean => !!MARK[name].src;

/**
 * ⚠️ `monoline` SKIPS THE ARTWORK AND DRAWS THE LINE GLYPH, and the collapsed bar is why it exists.
 * Four marks carry a `src` — a painted drawing sized for a 52px header slot that no longer exists.
 * At the bar's 20px a watercolour is mush, and it cannot be inked: a raster is whatever colour it
 * was exported, and the only way to force it black is a filter that flattens the drawing anyway.
 * The line glyph is already the right object at that size, and it takes `stroke` from CSS.
 */
export const OneScreenMark: React.FC<{ name: MarkName; monoline?: boolean }> = ({ name, monoline }) => {
  const m = MARK[name];
  /* ⚠️ THE DEGRADE PATH, borrowed from ArtSlot: a 404 or a decode failure must not leave a broken-
     image glyph in a header. It falls back to the mono slot name — the ArtSlot convention — which
     is also what the box shows if a future mark ever arrives without an icon to stand in for it. */
  const [failed, setFailed] = useState(false);
  const showArt = !!m.src && !failed && !monoline;
  return (
    <span className="os-mark" data-mark={name} aria-hidden="true">
      {showArt
        ? <img src={m.src} alt="" onError={() => setFailed(true)} />
        : m.icon
          /* ⚠️ 1.5 STROKE, BURGUNDY, 17px — and the 17 is the ICON's size, never the BOX's. The box
             is 28 whatever sits in it, which is exactly what makes the swap free. */
          ? <svg viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth={1.5}
                 strokeLinecap="round" strokeLinejoin="round">{m.icon}</svg>
          : <i className="os-mark-k">{m.label}</i>}
    </span>
  );
};
