/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25: the page's drawn marks. Book, film and TV are an ICON, never a colour
 * (baked decision 6). Every mark is a path: a glyph is a request to a font.
 */
import React from "react";
import type { CompKind } from "../../../lib/compsLibrary";

const S = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const KindIcon: React.FC<{ kind: CompKind }> = ({ kind }) => (
  <svg viewBox="0 0 20 20" {...S} strokeWidth={1.6} aria-hidden="true" data-cv-kind={kind}>
    {kind === "book" && <><path d="M4 3.5h9.5a2 2 0 0 1 2 2V17H6a2 2 0 0 1-2-2z" /><path d="M4 15a2 2 0 0 1 2-2h9.5" /></>}
    {kind === "film" && <><rect x="3" y="7" width="14" height="10" rx="1.5" /><path d="M3 7l2.5-3.5h11L14 7M7.5 3.5 5 7M11.5 3.5 9 7" /></>}
    {kind === "tv" && <><rect x="2.5" y="5" width="15" height="10.5" rx="1.5" /><path d="M7 2.5 10 5l3-2.5M7 17.5h6" /></>}
  </svg>
);
export const KIND_WORD: Record<CompKind, string> = { book: "Book", film: "Film", tv: "TV" };

export const LetterIcon = () => (
  <svg viewBox="0 0 24 24" {...S} strokeWidth={1.6} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6l8.5 7 8.5-7" /></svg>
);
export const LockIcon = () => (
  <svg className="cv-lock" viewBox="0 0 12 12" {...S} strokeWidth={1.5} aria-hidden="true"><rect x="2.5" y="5.5" width="7" height="5" rx="1" /><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" /></svg>
);
const small = { width: 15, height: 15, viewBox: "0 0 24 24", ...S, strokeWidth: 1.8, "aria-hidden": true } as const;
export const PenIcon = () => <svg {...small}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></svg>;
export const SendIcon = () => <svg {...small}><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></svg>;
export const WaitIcon = () => <svg {...small}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6l8.5 7 8.5-7" /></svg>;
export const ShelfIcon = () => <svg {...small}><path d="M4 20h16M6 20V6h3v14M11 20V4h3v16M16 20l2-13 3 .5-2 12.5" /></svg>;
export const FindIcon = () => <svg {...small}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></svg>;
export const FullIcon: React.FC<{ on: boolean }> = ({ on }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...S} strokeWidth={2} aria-hidden="true">
    {on ? <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" /> : <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />}
  </svg>
);
/**
 * THE CLOSE BUTTON (comps v27.1) — the one ✕ every drawer and dialog on this page uses: the comp drawer, the add
 * drawer, the picker, the Scout drawer and the "How comp tracking works" pop-up.
 *
 * The glyph is an SVG, two round-capped lines at 1.75, 12 × 12 in a 34px button and 14 × 14 in a 36px one. Never a
 * text "✕": a character's metrics shift with the font. The button centres it (`.cv-xb`); `className` carries the
 * button's own size and colours. It is always named "Close".
 */
export const CloseButton = React.forwardRef<HTMLButtonElement, { size?: 34 | 36; className: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "type">>(
  ({ size = 34, className, ...rest }, ref) => {
    const g = size === 36 ? 14 : 12;
    return (
      <button ref={ref} type="button" aria-label="Close" {...rest} className={`cv-xb ${className}`}>
        <svg width={g} height={g} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.75 * 12 / g} strokeLinecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg>
      </button>
    );
  },
);
CloseButton.displayName = "CloseButton";
export const TickIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...S} strokeWidth={2} aria-hidden="true"><path d="M2.5 6.5l2.5 2.5 4.5-5.5" /></svg>
);
