/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four marks a list head's controls wear — Filter, Group, Sort and Reset.
 *
 * ⚠️ THEY ARE DRAWN, NOT TYPED, AND THAT IS THE HOUSE LAW RATHER THAN A PREFERENCE. The v96
 * reference types `⛉ ▤ ≡` in Special Elite; U+26C9 is in neither that face nor the mono one, so the
 * browser falls back and the mark becomes whatever the system happens to have. A character is a
 * request to a font; a path is a picture. These are the Contact list's own four, moved here rather
 * than copied, so the two heads cannot drift apart — and `contactV11.measure.ts` still measures the
 * Contact list's head against its own baseline, unchanged.
 */
import React from "react";

export const FILTER_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </svg>
);
export const GROUP_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="4" width="18" height="6" rx="1" /><rect x="3" y="14" width="18" height="6" rx="1" />
  </svg>
);
export const SORT_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h13M4 12h9M4 17h5" />
  </svg>
);
export const RESET_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
  </svg>
);
