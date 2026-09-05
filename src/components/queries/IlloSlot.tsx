/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IlloSlot — a commissioned-illustration slot (drawer-3 run, §3). Renders the ref's hatched
 * placeholder — named, sized, hidden from AT — until artwork exists; dropping in an SVG later is
 * one line at the slot's ART table (`art` wins over the placeholder and takes the same box).
 * The placeholder is chrome that ADMITS the slot is unfilled — the marketing tier's lesson:
 * shipping finished-looking chrome around missing art is the failure this forecloses.
 */
import React from "react";

export const IlloSlot: React.FC<{
  /** the slot's name, drawn on the placeholder (e.g. `stage-specific · out`, `spot · nudge`) */
  name: string;
  width: number;
  height: number;
  round?: boolean;
  className?: string;
  /** the artwork, when it exists — replaces the placeholder in the same box */
  art?: React.ReactNode;
}> = ({ name, width, height, round, className, art }) => (
  <span
    className={`qi-slot${round ? " qi-slot--round" : ""}${art ? " qi-slot--art" : ""}${className ? ` ${className}` : ""}`}
    style={{ width, height }}
    aria-hidden="true"
  >
    {art ?? <span className="qi-ph">{name}<br />{round ? width : `${width}×${height}`}</span>}
  </span>
);
