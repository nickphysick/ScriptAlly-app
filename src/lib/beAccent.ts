/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Birds-eye view's accent, and the three values derived from it (v65.2 §1.3).
 *
 * ⚠️ THE INK, THE MUTE AND THE SOFT ARE DERIVED FROM THE ACCENT'S LUMINANCE, NOT WRITTEN BESIDE IT.
 * Four hexes maintained by hand are four things to keep in step, and the one that gets forgotten is
 * whichever the next accent happens not to break — a pale accent with cream text is unreadable and
 * looks like a rendering fault rather than a decision. Derived, changing the accent is one edit and
 * the contrast follows.
 *
 * ⚠️ AND THE THRESHOLD IS THE MOCK'S OWN. `setAccent` in `query-centre-v74.html` computes relative
 * luminance the WCAG way — sRGB linearised, weighted .2126 / .7152 / .0722 — and calls it dark
 * below .36. That is not the usual 0.5: it is tuned to this palette, where a mid blush still wants
 * ink on it. Copied rather than reasoned, because the mock is the oracle.
 */
export interface BeAccent { accent: string; ink: string; mute: string; soft: string; dark: boolean; luminance: number }

/** The accent as delivered: blush. */
export const BE_ACCENT = "#e9c9b8";

/** The mock's own cut between ink text and cream text. */
export const BE_DARK_BELOW = 0.36;

const chan = (c: number): number => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255);
}

export function beAccent(hex: string = BE_ACCENT): BeAccent {
  const L = luminance(hex);
  const dark = L < BE_DARK_BELOW;
  return {
    accent: hex,
    ink: dark ? "#f5f1eb" : "#1c130f",
    soft: dark ? "rgba(245, 241, 235, 0.14)" : "rgba(28, 19, 15, 0.07)",
    mute: dark ? "rgba(245, 241, 235, 0.72)" : "rgba(28, 19, 15, 0.62)",
    dark,
    luminance: L,
  };
}
