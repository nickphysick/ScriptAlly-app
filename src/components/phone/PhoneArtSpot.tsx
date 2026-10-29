/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2 — one picture from the art table (`phoneArt.ts`). A real slot renders its image; a `null` slot renders
 * the ref's dashed placeholder circle (design-refs/phone-app-v2/src/v2.js `ART.placeholder`), which is the honest
 * "illustration to come" and is never swapped for another drawing.
 */
import React from "react";
import type { PhoneArtSrc } from "./phoneArt";

/** the ref's placeholder: a dashed circle with a small landscape mark */
export const ArtPlaceholder: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg className={`pa-artph${className ? ` ${className}` : ""}`} width={size} height={size} viewBox="0 0 120 120"
    role="img" aria-label="Illustration to come" data-pa="art-placeholder">
    <circle cx="60" cy="60" r="57" fill="#f6efe9" stroke="#c9b9ae" strokeWidth="2.5" strokeDasharray="7 6" />
    <path d="M38 70l14-15 12 12 8-8 14 14" fill="none" stroke="#b9a497" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="74" cy="46" r="6" fill="#b9a497" />
  </svg>
);

export const PhoneArt: React.FC<{ art: PhoneArtSrc | null; size: number; className?: string; alt?: string }> = ({ art, size, className, alt = "" }) =>
  art ? <img className={className} src={art.src} alt={alt} width={size} height={size} draggable={false} style={{ objectFit: "contain" }} />
    : <ArtPlaceholder size={size} className={className} />;
