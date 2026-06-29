/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sidebar-shell palette — the Form 11 chrome values taken verbatim from the approved mockup
 * `scriptally-queries-sidebar.html`. These are the canonical hexes for the new left-sidebar shell
 * (rail + top strip + breadcrumb + control bar). Kept here as JS consts applied via INLINE styles
 * (the known Tailwind-override footgun) — never as Tailwind utility classes. Core inks/burgundy/fonts
 * still come from ../../lib/designTokens; this file only adds the shell-specific surfaces the token
 * file doesn't already carry.
 */

export const cream = "#f2ede7"; // page / content well
export const chromeWhite = "#ffffff"; // sidebar rail + top strip (one continuous white frame)
export const cardCream = "#fdfaf5"; // chips / cards inside the rail
export const navBorder = "#e8d5cc"; // rail right border + top-strip bottom border
export const shellHairline = "#e7ddd2"; // account-foot rule + control-bar border
export const linkRest = "#a08070"; // idle nav-item / breadcrumb step text
export const pinkActive = "#f5e2da"; // active nav pill + primary action fill
export const pinkHover = "#faeee8"; // nav-item / icon-button hover pill
export const pinkBand = "#f3e0d6"; // reading-pane column headers (reused)
export const sageTint = "#e9ede6"; // selected filter row fill
export const sageDark = "#5a6e58"; // selected filter count
export const inkShell = "#241c15"; // strongest ink (breadcrumb "here", logo)
export const mutedShell = "#9a8c80"; // muted labels / counts
export const crumbSep = "#d3c4b5"; // breadcrumb chevron separator
