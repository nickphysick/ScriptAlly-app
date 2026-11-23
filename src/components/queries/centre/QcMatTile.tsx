/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plumage colours v3 (design-refs/plumage-colours-v3/plumage-colours-v3.json `attachmentsTile`, `materialsHover`) — THE
 * GRID CARD'S MATERIALS: a square tile in the Sent box (the paperclip's glyph above the count) and, on its hover or
 * keyboard focus, a white card of chips. It replaces the wire paperclip over the card's top edge (MatTab1533, which
 * QcSlip153 still holds on disk).
 *
 * ⚠️ THE WORDS ARE THE PAPERCLIP POP-UP'S (lib/qc1533 `materialGroups`): the same groups, in the same order, with the
 *    same labels, package names and chip names. Only the drawing is new. The title is the tile's accessible name.
 * ⚠️ NEVER CUT. The frame clips (.qc154-in), the Sent box clips, Responses' carousel scrolls sideways under a mask, so on
 *    the page the hover is drawn in a portal on <body>, fixed, placed from the tile's own box and kept inside the
 *    viewport. In Log a query's preview (`inCard`) it is portalled into the card itself, outside the frame, and kept
 *    inside every clipping ancestor: that review reads its pop-up inside the card (tests/e2e/laqV2.measure.ts).
 * ⚠️ The tile and hover keep the paperclip's hooks (`data-qc1533="tab"` / `"pop"`), which Log a query's measurement uses.
 * ⚠️ ESCAPE CLOSES IT AND IT STAYS CLOSED (Log a query v2.3 · Phase 3, D4): every open and close goes through `tileNext`.
 *    Escape mutes the hover and focus (the tile takes focus back, and its focus used to show the hover again at once), until
 *    the pointer leaves the tile and comes back, or focus leaves and returns, or the tile is clicked or pressed. Opened by
 *    hover, by focus or by click, the same. Escape here closes only the hover (its escape layer); the next is the surface's.
 *    Narrow cards draw this same button compact (pc3tile.css, v2.3 · Phase 2): nothing here knows which form it is.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { materialsName, type MatGroups } from "../../../lib/qc1533";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { MaterialIcon } from "../../shared/MaterialIcon";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { CLIP } from "./QcSlip153";
import "./pc3tile.css";

/** materialsHover: 284 wide, 12px from the tile, its right edge 10px past the tile's, the pointer 25px from its right */
export const HOVER_W = 284;
export const HOVER_GAP = 12;
export const HOVER_OVER_RIGHT = 10;
export const POINTER_RIGHT = 25;
/** the hover stays this far inside whatever bounds it */
const MARGIN = 8;

interface Place { left: number; top: number; up: boolean; pointer: number }

/** v2.3 · Phase 3 — the hover's open state, and whether Escape has muted hover and focus */
export interface TileState { open: boolean; muted: boolean }
export type TileEvent = "enter" | "leave" | "focus" | "blur" | "click" | "press" | "escape";
export const TILE_CLOSED: TileState = { open: false, muted: false };
/** the one place the hover opens and closes: what each thing the writer does to the tile leaves it as */
export function tileNext(s: TileState, e: TileEvent): TileState {
  switch (e) {
    /* hover and focus open it, unless Escape closed it and the pointer or focus has not left since */
    case "enter": case "focus": return s.muted ? s : { open: true, muted: false };
    /* the pointer or focus leaving closes it, and ends the mute: coming back opens it again */
    case "leave": case "blur": return TILE_CLOSED;
    /* a click opens it (it never closed it, as built); Enter or Space toggles */
    case "click": return { open: true, muted: false };
    case "press": return s.open ? { open: false, muted: s.muted } : { open: true, muted: false };
    case "escape": return { open: false, muted: true };
    default: { const unhandled: never = e; return unhandled; }
  }
}

/** the rectangle the hover must stay inside: the viewport, and (drawn in the card) every clipping ancestor of the card */
const boundsOf = (card: HTMLElement | null, inCard: boolean) => {
  let l = 0, t = 0, r = window.innerWidth, b = window.innerHeight;
  if (inCard && card) {
    for (let a = card.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const x = a.getBoundingClientRect();
      l = Math.max(l, x.left); t = Math.max(t, x.top); r = Math.min(r, x.right); b = Math.min(b, x.bottom);
    }
  }
  return { l: l + MARGIN, t: t + MARGIN, r: r - MARGIN, b: b - MARGIN };
};

/** where the hover goes, in viewport coordinates: below the tile, or above when there is no room below; slid sideways
 *  to stay inside its bounds, its pointer kept over the tile */
export const placeHover = (tile: DOMRect, h: number, bd: { l: number; t: number; r: number; b: number }): Place => {
  let right = tile.right + HOVER_OVER_RIGHT;
  if (right > bd.r) right = bd.r;
  if (right - HOVER_W < bd.l) right = bd.l + HOVER_W;
  const below = bd.b - (tile.bottom + HOVER_GAP);
  const above = (tile.top - HOVER_GAP) - bd.t;
  const up = below < h && above > below;
  return { left: right - HOVER_W, top: up ? tile.top - HOVER_GAP - h : tile.bottom + HOVER_GAP, up, pointer: POINTER_RIGHT + (right - (tile.right + HOVER_OVER_RIGHT)) };
};

export const MatTile: React.FC<{
  id: string; g: MatGroups; onOpen: (open: boolean) => void;
  /** Log a query v2's preview: the hover is drawn inside the card, and Escape sits above the drawer's */
  inCard?: boolean; escLevel?: number;
  /** the card, for the in-card hover's position */
  cardRef: React.RefObject<HTMLElement | null>;
}> = ({ id, g, onOpen, inCard = false, escLevel = ESC_LEVEL.page, cardRef }) => {
  const [st, setSt] = useState<TileState>(TILE_CLOSED);
  const open = st.open;
  const [place, setPlace] = useState<Place | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  /* ⚠️ a functional update: Escape's focus() runs this tile's focus handler in the same tick, and it must read the mute */
  const go = (e: TileEvent) => setSt((s) => tileNext(s, e));
  useEffect(() => { onOpen(open); if (!open) setPlace(null); }, [open, onOpen]);
  useEscapeLayer(open, () => { go("escape"); btn.current?.focus(); }, escLevel);
  const name = materialsName(g.count);
  const popId = `pc3-hov-${id}`;

  /* placed before paint from the tile's box and the hover's own height, and again while the page scrolls, resizes or
     the card lifts on hover (its 150ms transition) */
  useLayoutEffect(() => {
    if (!open) return;
    const go = () => {
      const t = btn.current?.getBoundingClientRect(); const p = pop.current;
      if (!t || !p) return;
      setPlace(placeHover(t, p.offsetHeight, boundsOf(cardRef.current, inCard)));
    };
    go();
    let n = 0, raf = 0;
    const tick = () => { go(); if (++n < 12) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", go, true);
    window.addEventListener("resize", go);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", go, true); window.removeEventListener("resize", go); };
  }, [open, inCard, cardRef]);

  const card = cardRef.current?.getBoundingClientRect();
  const style: React.CSSProperties = place
    ? inCard && card
      ? { position: "absolute", left: place.left - card.left, top: place.top - card.top, ["--pc3-ptr" as string]: `${place.pointer}px` }
      : { position: "fixed", left: place.left, top: place.top, ["--pc3-ptr" as string]: `${place.pointer}px` }
    : { position: inCard ? "absolute" : "fixed", left: 0, top: 0, visibility: "hidden" };

  const hover = open ? (
    <span ref={pop} className={`pc3-hov${place?.up ? " is-up" : ""}`} id={popId} role="group" aria-label={name} data-qc1533="pop" data-pc3="hover"
      data-up={place?.up ? "" : undefined} style={style} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <span className="pc3-hov-t" data-pc3="title">{name}</span>
      {g.groups.map((x, i) => (
        <span key={i} className="pc3-hov-g" data-qc1533="group" data-kind={x.kind}>
          <span className="pc3-hov-gh"><span>{x.label}</span>{x.pkg ? <span className="pc3-hov-pk" data-qc1533="pkg">{x.pkg}</span> : null}</span>
          <span className="pc3-hov-cs">
            {x.chips.map((c) => (
              <span key={c.name} className={`pc3-chip${c.asked ? " is-ask" : ""}`} data-qc1533="chip" data-pc3="chip" data-asked={c.asked ? "" : undefined}>
                {c.mark === "full"
                  ? <StatusDot status={c.asked ? QueryStatus.FULL_REQUESTED : QueryStatus.FULL_SENT} overrideSize={16} tone="inherit" decorative className="pc3-chip-i" />
                  : c.mark ? <MaterialIcon kind={c.mark} size={16} /> : null}
                {c.name}{c.asked ? " · asked" : null}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  ) : null;

  return (
    <span className="pc3-tw" data-pc3="tile-wrap" onPointerEnter={() => go("enter")} onPointerLeave={() => go("leave")}
      onClick={(e) => e.stopPropagation()}>
      <button ref={btn} type="button" className={`pc3-tile${open ? " is-open" : ""}`} data-qc1533="tab" data-pc3="tile" aria-label={name}
        aria-expanded={open} aria-controls={open ? popId : undefined}
        onFocus={() => go("focus")} onBlur={() => go("blur")}
        onClick={(e) => { e.stopPropagation(); go("click"); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); go("press"); } }}>
        {CLIP}<i>{g.count}</i>
      </button>
      {hover ? createPortal(hover, inCard && cardRef.current ? cardRef.current : document.body) : null}
    </span>
  );
};
