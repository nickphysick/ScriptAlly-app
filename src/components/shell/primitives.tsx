/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell primitives — the five pieces BOTH shells are assembled from (shell-rebuild pack, Phase 1;
 * refs design-refs/shell-workspace-doubledecker.html + shell-topnav-mega.html).
 *
 * ⚠️ THESE EXIST SO THE TWO SHELLS CANNOT DISAGREE. The workspace shell's collapsed-rail flyout
 * and the top-nav shell's user menu are THE SAME CARD; the search pill and help button sit in
 * both bars. Built twice, they drift — and the drift only ever shows to someone who uses both,
 * which is everyone. One component each, imported twice.
 *
 * ⚠️ COLOUR AND BORDER COME FROM `primitives.css` VIA TOKENS, NEVER FROM TAILWIND UTILITIES.
 * Tailwind has silently overridden inline-critical styling in this codebase before; the house
 * answer is a stylesheet reading `--shell-*`, with Tailwind kept to layout and spacing.
 */
import React from "react";
import { Search, HelpCircle } from "lucide-react";
import { initialsOf } from "../../lib/searchSuggestionsCore";
import "./primitives.css";

/* ══ COUNT CHIP ═══════════════════════════════════════════════════════════════════════════════
   The attention figure, in both shells. ⚠️ THE DOT IS URGENCY, NOT DECORATION — it is the only
   burgundy in the nav, and a count without it reads as a quantity rather than a demand. */

export interface CountChipProps {
  count: number;
  /** Burgundy dot before the figure. Attention, not volume. */
  urgent?: boolean;
}

export const CountChip: React.FC<CountChipProps> = ({ count, urgent = false }) => (
  <span className="sp-ct">
    {urgent && <span className="sp-ct-dot" aria-hidden="true" />}
    {count}
  </span>
);

/* ══ AVATAR CHIP ══════════════════════════════════════════════════════════════════════════════
   ⚠️ ONE AVATAR, EVERYWHERE — parchment fill, burgundy Playfair initials (Baked 11). This
   SUPERSEDES the workspace mockup's ink rail avatar (`#4a423c` on the ink rail): reading that
   mockup faithfully gives the app two avatar systems, one for the rail and one for everywhere
   else, and they would be recognised as different people's chrome rather than one identity. */

export interface AvatarChipProps {
  name: string;
  /** Diameter in px. 28 in the workspace foot, 34 in the top-nav chip — the mockups' two sizes. */
  size?: number;
}

export const AvatarChip: React.FC<AvatarChipProps> = ({ name, size = 34 }) => (
  <span
    className="sp-ava"
    aria-hidden="true"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
  >
    {initialsOf(name)}
  </span>
);

/* ══ MENU CARD ════════════════════════════════════════════════════════════════════════════════
   The white card: collapsed-rail flyouts AND the top-nav user menu. Header optional — the flyout
   names its section, the user menu leads with the plan line instead. */

export interface MenuCardProps {
  /** Section name, shown as the card's quiet header. Omitted when the card leads with content. */
  heading?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  role?: string;
  "aria-label"?: string;
}

export const MenuCard = React.forwardRef<HTMLDivElement, MenuCardProps>(
  ({ heading, children, className, style, id, role, "aria-label": ariaLabel }, ref) => (
    <div
      ref={ref}
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={`sp-card${className ? ` ${className}` : ""}`}
      style={style}
    >
      {heading && <div className="sp-card-h">{heading}</div>}
      {children}
    </div>
  )
);
MenuCard.displayName = "MenuCard";

/** A row inside a MenuCard. `on` is the parchment selected state — the same fill as a nav pill. */
export interface MenuCardItemProps {
  label: string;
  on?: boolean;
  count?: number;
  urgent?: boolean;
  onSelect: () => void;
}

export const MenuCardItem: React.FC<MenuCardItemProps> = ({
  label, on = false, count, urgent, onSelect,
}) => (
  <button
    type="button"
    className={`sp-card-i${on ? " on" : ""}`}
    aria-current={on ? "page" : undefined}
    onClick={onSelect}
  >
    {label}
    {typeof count === "number" && <CountChip count={count} urgent={urgent} />}
  </button>
);

/** The hairline between groups of rows — the user menu's divider. */
export const MenuCardDivider: React.FC = () => <div className="sp-card-div" aria-hidden="true" />;

/* ══ SEARCH PILL ══════════════════════════════════════════════════════════════════════════════
   ⚠️ AN OPENER, NOT A FIELD. It carries no input: it opens the command palette, which owns the
   query. A real input here would be a second search with its own state, and the two would answer
   differently. The ⌘K chip advertises the shortcut that does the same thing. */

export interface SearchPillProps {
  onOpen: () => void;
  /** ⚠️ THE PALETTE ANCHORS TO THIS NODE. Without it the dropdown falls back to the other (hidden)
   *  opener, whose zero rect drags it to the top-left corner of the window. */
  anchorRef?: React.Ref<HTMLButtonElement>;
  /** The workspace bar and the top-nav bar both draw it 210px; kept a prop for narrow bars. */
  width?: number;
  label?: string;
}

export const SearchPill: React.FC<SearchPillProps> = ({
  onOpen, width = 210, label = "Search", anchorRef,
}) => (
  <button
    ref={anchorRef}
    type="button"
    className="sp-search"
    style={{ width }}
    onClick={onOpen}
    aria-keyshortcuts="Meta+K Control+K"
  >
    <Search aria-hidden="true" />
    <span className="sp-search-l">{label}</span>
    <span className="sp-search-k" aria-hidden="true">⌘K</span>
  </button>
);

/* ══ HELP BUTTON ══════════════════════════════════════════════════════════════════════════════ */

export interface HelpButtonProps {
  onOpen: () => void;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onOpen }) => (
  <button type="button" className="sp-help" onClick={onOpen} aria-label="Help centre" title="Help">
    <HelpCircle aria-hidden="true" />
  </button>
);
