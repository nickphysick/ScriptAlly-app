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

/* v138.1: the v138 list sheet's rows too. v138 renamed the list and this selector was missed, so every list key
   (/, J, K, Enter, L, Esc) had stopped answering on the desktop; found by v138.1 F1. */
/* v142.1 A4 — and the Cards view's cards (`data-qid` too), in reading order: the grid fills row by row in DOM order */
const ROWS = '.qcw-list [data-qcv="row"], .qc138-sheet [data-qcv="row"], .qc138-sheet [data-qc142="card"]';
const visibleRows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(ROWS)].filter((r) => r.getBoundingClientRect().height > 0);

export function useQcListKeys(opts: {
  active: boolean;
  find: string;
  onFind: (s: string) => void;
  findRef: React.RefObject<HTMLInputElement | null>;
  onOpen: (id: string) => void;
  /** Query panel v1 — the query open in the side panel from this page: ↑ ↓ (and J K) then walk the visible rows */
  panelId?: string | null;
}): { ringId: string | null; clearRing: () => void } {
  const { active, find, onFind, findRef, onOpen, panelId = null } = opts;
  const [ringId, setRingId] = useState<string | null>(null);

  useEffect(() => {
    if (!active) { setRingId(null); return undefined; }
    const onKey = (e: KeyboardEvent) => {
      /* Query panel v1 — WHILE A QUERY IS OPEN IN THE SIDE PANEL the keys walk the list: the previous or next
         VISIBLE row (a folded group's rows are not drawn, so they are skipped), brought into view with
         `nearest`. Escape is the panel's own layer. Nothing here runs while a field has the caret. */
      if (panelId) {
        if (isEditableTarget(e.target) || modalOpen() || e.altKey || e.metaKey || e.ctrlKey) return;
        const dn = matchesShortcut(SHORTCUTS.qcDown, e), upk = matchesShortcut(SHORTCUTS.qcUp, e);
        if (!dn && !upk) return;
        const all = visibleRows();
        const i = all.findIndex((r) => r.dataset.qid === panelId);
        const to = all[i < 0 ? 0 : Math.max(0, Math.min(all.length - 1, i + (dn ? 1 : -1)))];
        e.preventDefault();
        if (to && to.dataset.qid && to.dataset.qid !== panelId) { onOpen(to.dataset.qid); to.scrollIntoView({ block: "nearest" }); }
        return;
      }
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
  }, [active, find, onFind, findRef, onOpen, ringId, panelId]);
  /* the ring and the open row are never both marked */
  useEffect(() => { if (panelId) setRingId(null); }, [panelId]);

  return { ringId, clearRing: () => setRingId(null) };
}
