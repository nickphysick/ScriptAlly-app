/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part G (screens 01–06) — the Archivist with his boxes, pinned to the window's bottom-right:
 * 212 tall, `right: -6px`, a soft drop shadow. Decorative (`aria-hidden`, no pointer events); desktop only.
 *
 * ⚠️ PORTALLED TO <body>, NEVER A CHILD OF THE PAGE: the page's scroller is a size container (`container-type`), and
 *    containment makes it the containing block of every `position: fixed` descendant — so a fixed child would scroll
 *    away with the content. On <body> it stays put, and its z-index (40) sits above the page and below every drawer,
 *    scrim, popover and How it works. Every page stays mounted, so it is drawn only while this route is on screen.
 * The content keeps a 150px right gutter (pk41.css A), so he never covers it at 1280 or 1512.
 */
import React from "react";
import { createPortal } from "react-dom";

export const HAWK_SRC = "/images/packages/packages-hawk-standing.png";

export const Pk41Hawk: React.FC<{ on: boolean }> = ({ on }) =>
  on && typeof document !== "undefined" ? createPortal(<img className="p41-perch" src={HAWK_SRC} alt="" aria-hidden="true" data-pk41="hawk" />, document.body) : null;
