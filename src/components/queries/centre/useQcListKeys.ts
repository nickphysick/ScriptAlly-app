/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE QUERY CENTRE LIST'S KEYS (v132 §4), read from the one registry (`lib/shortcuts`):
 *   /        focus Find
 *   J K      move the row ring (↓ ↑ too, once a row has it)
 *   Enter    open the ringed query
 *   L        run its action (the tray's pill)
 *   Esc      clear the search first, then the ring
 *
 * ⚠️ THEY STAND DOWN while typing (Esc excepted, in Find), while a modal, the query drawer or anything on
 * the escape stack is open (the Birds-eye drawer, a popover), and whenever this page is not the one on
 * screen — every workspace page stays mounted.
 *
 * ⚠️ THE ROWS ARE READ FROM THE PAGE IN THE ORDER THEY ARE DRAWN, so a folded band's rows are skipped
 * for free and the ring can never land on a row that is not there.
 */
import { useEffect, useState } from "react";
import { SHORTCUTS, matchesShortcut, isEditableTarget, modalOpen } from "../../../lib/shortcuts";
import { escapeDepth } from "../../../lib/escapeStack";

const ROWS = '.qcw-list [data-qcv="row"]';
const visibleRows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(ROWS)].filter((r) => r.getBoundingClientRect().height > 0);

export function useQcListKeys(opts: {
  active: boolean;
  find: string;
  onFind: (s: string) => void;
  findRef: React.RefObject<HTMLInputElement | null>;
  onOpen: (id: string) => void;
}): { ringId: string | null; clearRing: () => void } {
  const { active, find, onFind, findRef, onOpen } = opts;
  const [ringId, setRingId] = useState<string | null>(null);

  useEffect(() => {
    if (!active) { setRingId(null); return undefined; }
    const onKey = (e: KeyboardEvent) => {
      const rows = visibleRows();
      if (!rows.length && !find) return;
      const typing = isEditableTarget(e.target);
      const inFind = typing && e.target === findRef.current;
      /* Esc: the search first, then the ring — and it works from inside Find */
      if (matchesShortcut(SHORTCUTS.qcLetGo, e)) {
        if (modalOpen() || escapeDepth() > 0 || document.querySelector(".qad-root.is-open")) return;
        if (typing && !inFind) return;
        if (find) { e.preventDefault(); onFind(""); return; }
        if (inFind) { findRef.current?.blur(); return; }
        if (ringId) { e.preventDefault(); setRingId(null); }
        return;
      }
      if (typing || modalOpen() || escapeDepth() > 0 || document.querySelector(".qad-root.is-open")) return;
      if (matchesShortcut(SHORTCUTS.qcFind, e)) { e.preventDefault(); findRef.current?.focus(); return; }
      const at = ringId ? rows.findIndex((r) => r.dataset.qid === ringId) : -1;
      const isArrow = e.key === "ArrowDown" || e.key === "ArrowUp";
      const down = matchesShortcut(SHORTCUTS.qcDown, e), up = matchesShortcut(SHORTCUTS.qcUp, e);
      if (down || up) {
        /* the arrows move the ring only once a row has it; until then they scroll the page */
        if (isArrow && at < 0) return;
        e.preventDefault();
        const next = Math.max(0, Math.min(rows.length - 1, at + (down ? 1 : -1)));
        const row = rows[at < 0 ? 0 : next];
        setRingId(row.dataset.qid ?? null);
        row.scrollIntoView({ block: "nearest" });
        return;
      }
      if (at < 0) return;
      if (matchesShortcut(SHORTCUTS.qcOpen, e)) { e.preventDefault(); onOpen(ringId!); return; }
      if (matchesShortcut(SHORTCUTS.qcAct, e)) {
        const act = rows[at].querySelector<HTMLElement>('[data-qcv="row-act"]');
        if (act) { e.preventDefault(); act.click(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, find, onFind, findRef, onOpen, ringId]);

  return { ringId, clearRing: () => setRingId(null) };
}
