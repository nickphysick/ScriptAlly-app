/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The manuscript switcher, in the bar — v2 (ref design-refs/shell/manuscript-switcher-v2.html; the
 * tile, the menu, the keys and the switch feedback are normative, the books and the page body are
 * not).
 *
 * ⚠️ IT SWITCHES EXACTLY AS BEFORE — the caller's `onPick` writes the shared
 * `scriptally_active_manuscript_id` key and re-opens the route. What this adds is the feedback: a
 * "Now showing {title}" toast through the app's own toast, and the active stage page's existing
 * entrance replayed (`STAGE_REPLAY_EVENT`, which `StagePage` answers). Picking the book that is
 * already active only closes the menu.
 *
 * ⚠️ EVERY FACT IS AN EXISTING DERIVATION, NEVER A NEW ONE: the status is the `ManuscriptStatus` value
 * (the app's own label for it — the edit form's select renders the same strings), "with you" is
 * `isWithYou` over the book's live queries (the Query Centre's definition; live = not
 * `isClosedStatus`), the shelved group is `isShelvedPresentation`, and "Querying since" is
 * `queryingSince` (the Manuscripts page's). Only the parts the record has are stated — never "0 words".
 *
 * ⚠️ DISMISSAL IS A `pointerdown` CAPTURE AT THE DOCUMENT plus Escape (which returns focus to the tile)
 * and Tab (which does not trap). `M` opens the menu from anywhere except an editable field or an open
 * modal; its key comes from the shortcuts registry, like every other binding's.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Manuscript, Query } from "../../types";
import { isWithYou } from "../../lib/qcSummary";
import { isClosedStatus } from "../../lib/qcStages";
import { isShelvedPresentation } from "../../lib/manuscriptPage";
import { queryingSince } from "../../lib/manuscriptSummary";
import { dayMonth } from "../../lib/dates";
import { SHORTCUTS, matchesShortcut, shortcutBlocked, shortcutLabel } from "../../lib/shortcuts";
import { useOptionalToast } from "../toast/ToastProvider";

/** `StagePage` listens for this and replays its entrance — the existing animation, not a new one. */
export const STAGE_REPLAY_EVENT = "sa:stage-replay";

/** `Thriller · 50,000 words` — only the parts the record has (never "0 words"). */
export function switcherMeta(ms: { genre?: string; wordCount?: number }): string {
  const bits: string[] = [];
  if (ms.genre) bits.push(ms.genre);
  if (ms.wordCount) bits.push(`${ms.wordCount.toLocaleString("en-GB")} words`);
  return bits.join(" · ");
}

/** The tile's second line: where the book stands — its status, then "N with you" when it has live queries. */
export function switcherStanding(ms: Pick<Manuscript, "status">, msQueries: readonly Pick<Query, "status">[]): { status: string | null; withYou: number | null } {
  const live = msQueries.filter((q) => !isClosedStatus(q.status));
  return {
    status: ms.status ? String(ms.status) : null,
    withYou: live.length > 0 ? live.filter((q) => isWithYou(q.status)).length : null,
  };
}

/** The menu row's facts: "Querying since 5 Dec · 26 queries", "3 queries", or "No queries yet". */
export function switcherFacts(msQueries: readonly Pick<Query, "dateSent">[]): string {
  const n = msQueries.length;
  if (n === 0) return "No queries yet";
  const count = `${n} ${n === 1 ? "query" : "queries"}`;
  const since = queryingSince(msQueries);
  return since ? `Querying since ${dayMonth(since)} · ${count}` : count;
}

/**
 * The title-page cover (ink shell v1): a typed title page with a terracotta paperclip, drawn entirely in
 * CSS — no art asset. It is what a manuscript without `coverUrl` shows in the sidebar's selector.
 */
export const TitlePageCover: React.FC<{ size: "tile" | "row" }> = ({ size }) => (
  <span className={`ws-ms-cov ws-ms-cov--${size} ws-tp`} data-cover="title-page" aria-hidden="true">
    <i className="ws-tp-t1" /><i className="ws-tp-t2" /><i className="ws-tp-by" /><i className="ws-tp-clip" />
  </span>
);

/** The book: `coverUrl` when set; otherwise the title-page cover in the sidebar, and a tile in the
 *  manuscript's object colour (`--o-ms`) anywhere else. */
const Cover: React.FC<{ ms: Manuscript; size: "tile" | "row"; titlePage?: boolean }> = ({ ms, size, titlePage }) =>
  ms.coverUrl ? (
    <img className={`ws-ms-cov ws-ms-cov--${size} ws-ms-cov--img`} data-cover="img" src={ms.coverUrl} alt="" aria-hidden="true" />
  ) : titlePage ? (
    <TitlePageCover size={size} />
  ) : (
    <span className={`ws-ms-cov ws-ms-cov--${size}`} data-cover="tile" aria-hidden="true" />
  );

const Tick: React.FC = () => (
  <span className="ws-ms-ck" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  </span>
);

export interface BarSwitcherProps {
  manuscripts: Manuscript[];
  queries: Query[];
  activeId: string | null;
  onPick: (id: string) => void;
  onAdd: () => void;
  /** "Open this manuscript" — the active book's own page, through the existing route and view param. */
  onOpenActive: () => void;
  /**
   * ⚠️ INK SHELL v1 MOVES THE SWITCHER TO THE SIDEBAR (`"side"`). The behaviour is unchanged — the menu,
   * the M key, the shelved group, "Now showing…". What changes is the skin, the title-page cover, and
   * that the menu is PORTALLED: the sidebar clips (`overflow: hidden`), so a menu inside it would be cut
   * off at the panel's edge. Default `"bar"` keeps any other mount as it was.
   */
  placement?: "bar" | "side";
  /** The sidebar is collapsed: the tile shows its cover only, and the menu opens to its right. */
  collapsed?: boolean;
}

export const BarSwitcher: React.FC<BarSwitcherProps> = ({ manuscripts, queries = [], activeId, onPick, onAdd, onOpenActive, placement = "bar", collapsed = false }) => {
  const side = placement === "side";
  const [open, setOpen] = useState(false);
  /* the portalled menu's place — measured from the tile when it opens, and on resize */
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notify = useOptionalToast();

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"], [role="menuitem"]') ?? [])];
  const openMenu = useCallback(() => setOpen(true), []);
  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) btnRef.current?.focus({ preventScroll: true });
  }, []);

  /* focus lands on the active book when the menu opens */
  useEffect(() => {
    if (!open) return;
    const t = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? items()[0];
    t?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  useLayoutEffect(() => {
    if (!side || !open) return undefined;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      setAt(collapsed ? { left: r.right + 10, top: r.top } : { left: r.left, top: r.bottom + 8 });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [side, open, collapsed]);

  /* the state flips between expanded and collapsed: whatever was open belongs to the other shape */
  useEffect(() => { setOpen(false); }, [collapsed]);

  /* M, from anywhere — except in an editable field or with a modal open (the registry's guard) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || !matchesShortcut(SHORTCUTS.switchManuscript, e) || shortcutBlocked(e)) return;
      if (!btnRef.current || btnRef.current.getBoundingClientRect().width === 0) return;
      e.preventDefault();
      openMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openMenu]);

  const onBtnKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); openMenu(); }
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (k: number) => { e.preventDefault(); list[(k + list.length) % list.length]?.focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === "Tab") close(false);
  };

  const active = manuscripts.find((m) => m.id === activeId) ?? null;

  /* ⚠️ NO BOOK YET: the switcher is the door to adding one. */
  if (!active) {
    return (
      <div className={`ws-ms${side ? " ws-ms--side" : ""}`} data-shell="switcher" data-placement={placement}>
        <button type="button" className="ws-ms-btn" onClick={onAdd}>
          <span className="ws-ms-cov ws-ms-cov--tile ws-ms-cov--add" aria-hidden="true">+</span>
          <span className="ws-ms-tx"><b className="ws-ms-t">Add a manuscript</b></span>
        </button>
      </div>
    );
  }

  const byMs = (id: string) => queries.filter((q) => q.manuscriptId === id);
  const standing = switcherStanding(active, byMs(active.id));
  const pick = (m: Manuscript) => {
    if (m.id === active.id) { close(true); return; }
    close(true);
    onPick(m.id);
    notify?.showToast({ message: `Now showing ${m.title}` });
    window.dispatchEvent(new Event(STAGE_REPLAY_EVENT));
  };
  const shelved = manuscripts.filter((m) => isShelvedPresentation(m));
  const current = manuscripts.filter((m) => !isShelvedPresentation(m));
  const row = (m: Manuscript) => {
    const on = m.id === active.id;
    const meta = switcherMeta(m);
    return (
      <button
        type="button"
        role="menuitemradio"
        aria-checked={on}
        key={m.id}
        className={`ws-ms-it${on ? " on" : ""}${isShelvedPresentation(m) ? " ws-ms-it--shelved" : ""}`}
        onClick={() => pick(m)}
      >
        <Cover ms={m} size="row" titlePage={side} />
        <span className="ws-ms-tx">
          <b className="ws-ms-t">{m.title}</b>
          {meta && <span className="ws-ms-rm" data-ms="meta">{meta}</span>}
          <span className="ws-ms-rf" data-ms="facts">{switcherFacts(byMs(m.id))}</span>
        </span>
        {on && <Tick />}
      </button>
    );
  };

  return (
    <div className={`ws-ms${side ? " ws-ms--side" : ""}${open ? " is-open" : ""}`} data-shell="switcher" data-placement={placement} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="ws-ms-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Manuscript: ${active.title}`}
        title={`Switch manuscript (${shortcutLabel("switchManuscript")})`}
        aria-keyshortcuts={shortcutLabel("switchManuscript")}
        onClick={() => (open ? close(true) : openMenu())}
        onKeyDown={onBtnKey}
      >
        <Cover ms={active} size="tile" titlePage={side} />
        <span className="ws-ms-tx">
          <b className="ws-ms-t">{active.title}</b>
          {standing.status && (
            <small className="ws-ms-m" data-ms="standing">
              {standing.status}
              {standing.withYou !== null && <> · <em>{standing.withYou} with you</em></>}
            </small>
          )}
        </span>
        <span className="ws-ms-chev" aria-hidden="true">
          {side ? (
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 9 4-4 4 4M8 15l4 4 4-4" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8l4 4 4-4" /></svg>
          )}
        </span>
      </button>
      {(() => {
        const menu = (
      <div
        className={`ws-ms-menu${side ? " ws-ms-menu--port" : ""}`}
        role="menu" aria-label="Your manuscripts" ref={menuRef} onKeyDown={onMenuKey}
        data-open={open ? "true" : "false"}
        style={side && at ? { left: at.left, top: at.top } : undefined}
      >
        <p className="ws-ms-h">YOUR MANUSCRIPTS</p>
        {current.map(row)}
        {shelved.length > 0 && <p className="ws-ms-h ws-ms-h--shelved" data-ms="shelved-h">SHELVED</p>}
        {shelved.map(row)}
        <div className="ws-ms-sep" />
        <button type="button" role="menuitem" className="ws-ms-act" data-ms="open" onClick={() => { close(false); onOpenActive(); }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 4.5h10.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z" /><path d="M5 18a2 2 0 0 1 2-2h10.5" /></svg>
          Open this manuscript
        </button>
        <button type="button" role="menuitem" className="ws-ms-act ws-ms-add" data-ms="add" onClick={() => { close(false); onAdd(); }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Add a manuscript
        </button>
        <p className="ws-ms-hint">↑ ↓ TO MOVE · ↵ TO SWITCH · {shortcutLabel("switchManuscript")} TO OPEN THIS MENU</p>
      </div>
        );
        return side && typeof document !== "undefined" ? createPortal(menu, document.body) : menu;
      })()}
    </div>
  );
};
