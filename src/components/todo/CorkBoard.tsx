/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CorkBoard — the framed cork surface and what is pinned to it (Corkboard v1, Part C; ref
 * design-refs/corkboard-v4/corkboard-v4.html `.board`, `.pins`, `.item`, `.pin`, `.tape`).
 *
 * It knows about ITEMS, not notes: a key, a width, something to draw, and whether it may be moved. The page
 * decides what the items are (its notes, the compose editor, the "Your tasks" card) and owns every write.
 *
 * ⚠️ EVERY ITEM IS PLACED BY ONE FUNCTION — `arrange` (lib/corkboard) — from the board's MEASURED inner width
 *    and each item's MEASURED height. Nothing here restates a column width or guesses a height that is drawn:
 *    the estimate below exists only for the frame before the first measurement, which is never painted.
 * ⚠️ TILT AND FIXING ARE DERIVED FROM THE KEY (`tiltFor`, `fixingFor`), so they are the same on every render
 *    and nothing about them is stored or chosen.
 * ⚠️ A DRAG IS POINTER EVENTS, NOT HTML5 DRAG-AND-DROP: the note must follow the hand, stay inside the board
 *    and land where it is let go, and a native drag does none of those. It excludes every control drawn on
 *    the note (the house rule for a drag surface), so the ⋯ button and a link in the body still take a press.
 *    The built drag-to-REORDER is the tidy view's alone and is still HTML5, as it was on the masonry board.
 * ⚠️ ONE WRITE PER DROP. Moving updates local state only; the place is handed to `onMove` once, on release.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_FOOT, CORK_TEXTURE, EDGE, arrange, clampLeft, clampTop, fixingFor, tiltFor, toPos,
  type CorkPos, type CorkView, type Fixing,
} from "../../lib/corkboard";

export interface CorkItem {
  key: string;
  width: number;
  /** classes for the item's own element (a note's paper, the card's) */
  className?: string;
  /** data attributes for the page's probes (`data-note`) */
  attrs?: Record<string, string>;
  /** the item's accessible name */
  label: string;
  /** faded by a search or a tag chip */
  dim?: boolean;
  /** degrees; absent = derived from the key. The compose editor is always straight. */
  tilt?: number;
  /** absent = derived from the key; `null` = nothing holds it (the compose editor) */
  fixing?: Fixing | null;
  /** false = it cannot be dragged or nudged (the compose editor) */
  movable?: boolean;
  /** true = in the tidy view it takes part in drag-to-reorder */
  reorderable?: boolean;
  /** drawn above everything else (the compose editor) */
  front?: boolean;
  /** a press that was not a drag, or Enter on the focused item */
  onActivate?: () => void;
  node: React.ReactNode;
}

export interface CorkBoardProps {
  items: readonly CorkItem[];
  /** saved places, by key — a preference, never a source */
  saved: Readonly<Record<string, CorkPos>>;
  view: CorkView;
  /** true until the page's data has settled: the frame at its full size, with nothing pinned */
  loading?: boolean;
  /** one call per drop (or per finished run of arrow keys). A rejection puts the item back. */
  onMove: (key: string, pos: CorkPos) => Promise<void>;
  /** tidy view: `from` was dropped on `to` */
  onReorder?: (from: string, to: string) => void;
}

const EST_H = 150;
const NO_DRAG = "button, a, input, textarea, select, label, [data-cb-nodrag]";
const STEP = 16;
const KEY_SAVE_MS = 600;

export const CorkBoard: React.FC<CorkBoardProps> = ({ items, saved, view, loading = false, onMove, onReorder }) => {
  const pinsRef = useRef<HTMLDivElement | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const [W, setW] = useState(1100);
  const [heights, setHeights] = useState<Record<string, number>>({});
  /** left/top transitions are off until the first measured arrangement has been painted */
  const [ready, setReady] = useState(false);
  /** an item in the hand */
  const [live, setLive] = useState<{ key: string; left: number; top: number } | null>(null);
  /** where an item was put, until its saved place says the same */
  const [local, setLocal] = useState<Record<string, { left: number; top: number }>>({});
  const [zs, setZs] = useState<Record<string, number>>({});
  const zTop = useRef(10);

  const keys = useMemo(() => items.map((i) => i.key), [items]);
  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const keySig = keys.join("|");

  /* the board's inner width and every item's height, measured — and re-measured when either changes (the
     handwriting face arrives after first paint and changes every note's height) */
  useLayoutEffect(() => {
    const pins = pinsRef.current;
    if (!pins) return undefined;
    const read = () => {
      const w = pins.clientWidth;
      if (w > 0) setW((cur) => (cur === w ? cur : w));
      setHeights((cur) => {
        let next = cur;
        for (const [k, el] of els.current) {
          const h = el.offsetHeight;
          if (h > 0 && cur[k] !== h) { if (next === cur) next = { ...cur }; next[k] = h; }
        }
        return next;
      });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(pins);
    for (const el of els.current.values()) ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig, loading]);
  useEffect(() => {
    if (ready || loading) return undefined;
    const a = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(a);
  }, [ready, loading]);

  const size = useCallback((k: string) => ({ w: byKey.get(k)?.width ?? 204, h: heights[k] ?? EST_H }), [byKey, heights]);
  const arr = useMemo(() => arrange(keys, size, saved, W, view), [keys, size, saved, W, view]);

  /* a local place is dropped once the saved one has caught up with it, or its item has gone, or the view changed */
  useEffect(() => {
    setLocal((cur) => {
      const keep = Object.entries(cur).filter(([k, p]) => view === "free" && byKey.has(k) && !(arr.at[k]?.saved && Math.abs(arr.at[k].left - p.left) <= 1 && Math.abs(arr.at[k].top - p.top) <= 1));
      return keep.length === Object.keys(cur).length ? cur : Object.fromEntries(keep);
    });
  }, [arr, byKey, view]);

  const placeOf = (k: string) => (live?.key === k ? live : view === "free" ? local[k] : undefined) ?? arr.at[k] ?? { left: EDGE.x, top: EDGE.top };
  /* the board's inner height: the arrangement's, or lower if something was just put lower. ⚠️ NOT the item in
     the hand — a height that followed the drag would let a note be carried down for ever; the drag is
     clamped to THIS, so it cannot leave the board, and the board grows after the drop. */
  const lowest = Math.max(arr.height, ...Object.entries(local).map(([k, p]) => p.top + size(k).h + BOARD_FOOT));

  const commit = (key: string, left: number, top: number) => {
    setLocal((cur) => ({ ...cur, [key]: { left, top } }));
    onMove(key, toPos(left, top, W)).catch(() => {
      /* the write failed: the item goes back to where its saved place (or its default) draws it */
      setLocal((cur) => { const { [key]: _gone, ...rest } = cur; void _gone; return rest; });
    });
  };

  /* ── free pinning: the pointer ────────────────────────────────────────────────────────────── */
  const grab = useRef<{ key: string; id: number; px: number; py: number; left: number; top: number; moved: boolean } | null>(null);
  const down = (it: CorkItem) => (e: React.PointerEvent<HTMLElement>) => {
    if (view !== "free" || it.movable === false || e.button !== 0) return;
    if ((e.target as Element).closest(NO_DRAG)) return;
    const p = placeOf(it.key);
    grab.current = { key: it.key, id: e.pointerId, px: e.clientX, py: e.clientY, left: p.left, top: p.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.px, dy = e.clientY - g.py;
    if (!g.moved && Math.hypot(dx, dy) < 4) return;
    if (!g.moved) { g.moved = true; setZs((z) => ({ ...z, [g.key]: ++zTop.current })); }
    const s = size(g.key);
    setLive({ key: g.key, left: clampLeft(g.left + dx, s.w, W), top: clampTop(g.top + dy, s.h, lowest) });
  };
  const up = (it: CorkItem) => (e: React.PointerEvent<HTMLElement>) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    grab.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!g.moved) { if (!(e.target as Element).closest(NO_DRAG)) it.onActivate?.(); return; }
    const dx = e.clientX - g.px, dy = e.clientY - g.py;
    const s = size(g.key);
    const left = clampLeft(g.left + dx, s.w, W), top = clampTop(g.top + dy, s.h, lowest);
    setLive(null);
    commit(g.key, left, top);
  };
  const cancel = () => { grab.current = null; setLive(null); };

  /* ── free pinning: the keyboard — 16px a press, saved once the keys stop ───────────────────── */
  const keyTimer = useRef<number | null>(null);
  const keyPending = useRef<{ key: string; left: number; top: number } | null>(null);
  const flushKeys = useCallback(() => {
    if (keyTimer.current) { window.clearTimeout(keyTimer.current); keyTimer.current = null; }
    const p = keyPending.current; keyPending.current = null;
    if (p) commit(p.key, p.left, p.top);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W]);
  useEffect(() => () => { if (keyTimer.current) window.clearTimeout(keyTimer.current); }, []);
  const keyDown = (it: CorkItem) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return; // a key typed inside the item (a button, the editor) is not the item's
    if (e.key === "Enter") { e.preventDefault(); it.onActivate?.(); return; }
    if (view !== "free" || it.movable === false) return;
    const d = e.key === "ArrowLeft" ? [-STEP, 0] : e.key === "ArrowRight" ? [STEP, 0] : e.key === "ArrowUp" ? [0, -STEP] : e.key === "ArrowDown" ? [0, STEP] : null;
    if (!d) return;
    e.preventDefault();
    const cur = keyPending.current?.key === it.key ? keyPending.current : placeOf(it.key);
    const s = size(it.key);
    const next = { key: it.key, left: clampLeft(cur.left + d[0], s.w, W), top: clampTop(cur.top + d[1], s.h, lowest + (d[1] > 0 ? STEP : 0)) };
    keyPending.current = next;
    setLocal((c) => ({ ...c, [it.key]: { left: next.left, top: next.top } }));
    setZs((z) => ({ ...z, [it.key]: ++zTop.current }));
    if (keyTimer.current) window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(flushKeys, KEY_SAVE_MS);
  };

  /* ── the tidy view: the built drag-to-reorder (HTML5), unchanged in what it writes ─────────── */
  /* the note in hand is a REF as well as state: a drop can arrive before the re-render that would let a
     handler see the state (measured on the masonry board — three events in one tick moved nothing) */
  const dragRef = useRef<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const reorder = (it: CorkItem) => (view === "tidy" && it.reorderable && onReorder ? {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { dragRef.current = it.key; setDragKey(it.key); e.dataTransfer.effectAllowed = "move"; },
    onDragEnd: () => { dragRef.current = null; setDragKey(null); setOverKey(null); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (dragRef.current && dragRef.current !== it.key) setOverKey(it.key); },
    onDragLeave: () => setOverKey((o) => (o === it.key ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const from = dragRef.current;
      dragRef.current = null; setDragKey(null); setOverKey(null);
      if (from && from !== it.key) onReorder(from, it.key);
    },
  } : {});

  return (
    <section className="cb-board" aria-label="Corkboard" data-cb="board" data-cb-view={view} style={{ backgroundImage: CORK_TEXTURE }}>
      <div
        ref={pinsRef}
        className={`cb-pins${view === "tidy" ? " is-tidy" : ""}${ready ? " cb-ready" : ""}`}
        data-cb="pins"
        style={{ minHeight: lowest }}
      >
        {!loading && items.map((it, i) => {
          const p = placeOf(it.key);
          const fixing = it.fixing === undefined ? fixingFor(it.key) : it.fixing;
          const tilt = it.movable === false ? 0 : it.tilt ?? tiltFor(it.key);
          const dragging = live?.key === it.key;
          return (
            <article
              key={it.key}
              ref={(el) => { if (el) els.current.set(it.key, el); else els.current.delete(it.key); }}
              className={`cb-item${it.className ? ` ${it.className}` : ""}${it.dim ? " cb-dim" : ""}${dragging ? " cb-drag" : ""}${it.movable === false ? " cb-fixed" : ""}${dragKey === it.key ? " nb-dragging" : ""}${overKey === it.key ? " nb-dragover" : ""}`}
              data-cb-item={it.key}
              data-cb-fix={fixing ? fixing.kind : "none"}
              aria-label={it.label}
              tabIndex={0}
              style={{
                left: p.left, top: p.top, width: it.width,
                zIndex: it.front ? 9000 : zs[it.key] ?? (i % 9) + 1,
                ["--r" as string]: `${tilt}deg`,
              }}
              onPointerDown={down(it)}
              onPointerMove={move}
              onPointerUp={up(it)}
              onPointerCancel={cancel}
              onKeyDown={keyDown(it)}
              onBlur={(e) => { if (e.target === e.currentTarget && keyPending.current?.key === it.key) flushKeys(); }}
              {...reorder(it)}
              {...it.attrs}
            >
              {fixing?.kind === "pin" && <i className="cb-pin" aria-hidden style={{ ["--pc" as string]: fixing.colour }} />}
              {fixing?.kind === "tape" && <i className={`cb-tape cb-tape--${fixing.tape}`} aria-hidden />}
              {it.node}
            </article>
          );
        })}
      </div>
    </section>
  );
};
