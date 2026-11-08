/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v30: the mock's icons (design-refs/comps-v30/, `IC`). Book, film and TV are an icon, never a colour.
 */
import React from "react";
import type { CompKind } from "../../../lib/compsLibrary";

const s = { viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true } as const;

export const Media30: React.FC<{ kind: CompKind }> = ({ kind }) =>
  kind === "film" ? (
    <svg {...s} data-icon="film"><rect x="2.5" y="5" width="15" height="12" rx="1.5" /><path d="M2.5 8.5h15M6 5 4.5 2.8M10 5 8.5 2.8M14 5l-1.5-2.2M2.8 3.2l14.4-1" /></svg>
  ) : kind === "tv" ? (
    <svg {...s} data-icon="tv"><rect x="2.5" y="5.5" width="15" height="10.5" rx="1.5" /><path d="M7 2.5 10 5.5l3-3M7 18.5h6" /></svg>
  ) : (
    <svg {...s} data-icon="book"><path d="M5 2.5h9.5a1 1 0 0 1 1 1V17a.5.5 0 0 1-.5.5H5a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 5 2.5Z" /><path d="M3.5 14.5A1.5 1.5 0 0 1 5 13h10.5" /></svg>
  );

export const Env30 = () => <svg {...s}><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" /><path d="m3 5.5 7 5.5 7-5.5" /></svg>;
export const Lock30 = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>;
export const Pen30 = () => <svg {...s} strokeWidth={1.7}><path d="M13.5 3.5 16.5 6.5 7 16H4v-3z" /></svg>;
export const X30 = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>;
export const Search30 = () => <svg {...s} strokeWidth={1.7}><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>;
export const Sort30 = () => <svg {...s}><path d="M6 3v14M3 14l3 3 3-3M14 17V3M11 6l3-3 3 3" /></svg>;
export const Cards30 = () => <svg {...s}><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="11" y="3" width="6" height="6" rx="1" /><rect x="3" y="11" width="6" height="6" rx="1" /><rect x="11" y="11" width="6" height="6" rx="1" /></svg>;
export const List30 = () => <svg {...s}><path d="M7 5h10M7 10h10M7 15h10M3 5h.5M3 10h.5M3 15h.5" /></svg>;

/** The light ✕, glyph centred in its button (a grid, no padding, no line box). */
export const Close30 = React.forwardRef<HTMLButtonElement, { label?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type">>(
  ({ label = "Close", className, ...rest }, ref) => (
    <button ref={ref} type="button" aria-label={label} className={`cp30-x${className ? ` ${className}` : ""}`} {...rest}><X30 /></button>
  ),
);
Close30.displayName = "Close30";

/** "A and B", "A, B and C". */
export { andList } from "../../../lib/compsShelf";
