/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v5, Phase F — THE MATERIALS PIECES THAT ARE DRAWN, NOT READ (design-refs/phone-app-v5/phone-materials-v1.html
 * `.paper`, `.bundle`, `.band`, `.stat`, `.sheet`, `.book`). Pure drawing: every word and figure is the caller's.
 * Below 768px only (phoneV5.css `.pa5m-*`).
 */
import React from "react";
import type { MatResult } from "../../../lib/phoneV5";
import "./phoneV5.css";

/** a sheet of paper with its first words in italic and grey lines for the rest (ref `paper`) */
export const Paper: React.FC<{ first: string; className?: string; lines?: number[] }> = ({ first, className, lines = [90, 100, 70, 84, 100, 55] }) => (
  <span className={`pa5m-paper${className ? ` ${className}` : ""}`} aria-hidden="true">
    <em>{first}</em>
    {lines.map((w, i) => <u key={i} style={{ width: `${w}%` }} />)}
  </span>
);

/**
 * The banded bundle (ref `bundle`): three sheets fanned — the letter, the synopsis, the opening (its top edge rust) —
 * with a blush band across them carrying the package's name. `outline` draws the empty bundle (no package set).
 */
export const Bundle: React.FC<{ name: string; outline?: boolean; mini?: boolean }> = ({ name, outline, mini }) => (
  <span className={`pa5m-bundle${outline ? " outline" : ""}${mini ? " mini" : ""}`} data-pa5="bundle" aria-hidden="true">
    <Paper first="Dear agent," className="p1" />
    <Paper first="Synopsis" className="p2" />
    <Paper first="Chapter one" className="p3" />
    {name ? <span className="pa5m-band">{name}</span> : <span className="pa5m-band" />}
  </span>
);

/** the result badge on a package card (ref `.stat`): "3 from 7 / asked for more", or "Not sent yet" */
export const ResultBadge: React.FC<{ r: MatResult }> = ({ r }) => (
  <span className="pa5m-stat" data-pa5="pkg-result" data-sent={r.sent} data-requests={r.more}>
    {r.of ? <><b>{r.big} <small>{r.of}</small></b><span>asked for more</span></> : <b className="none">{r.big}</b>}
  </span>
);

/** a book's spine for the comps list (ref `.book`): its initials on one of the phone's own colours */
const SPINES = ["var(--pa-navy)", "var(--pa-rust)", "var(--pa-navy-2)", "var(--pa-navy-deep)"];
export const Spine: React.FC<{ title: string; i: number }> = ({ title, i }) => (
  <span className="pa5m-book" style={{ background: SPINES[i % SPINES.length] }} aria-hidden="true">
    {title.split(/\s+/).filter((w) => /\w/.test(w)).map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")[0] ?? "").join("").slice(0, 2).toUpperCase()}
  </span>
);
