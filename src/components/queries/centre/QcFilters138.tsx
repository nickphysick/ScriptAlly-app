/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 §B — THE FILTER ROW, under the header's rule: the search box, then Stage ⌄ · Due this week ·
 * Offers · What you sent ⌄ · More filters ⌄. Contact list v17 §E's pills and panels, built here from the same
 * values because v17's are page-local (`agents/contact/ContactFilterStrip`): a lift candidate, named in the report.
 *
 * ⚠️ EVERY CONTROL READS THE FILTER'S REAL STATE (`filters`), never a copy: the More filters switches are drawn from
 *    `f.past` / `f.missing` / `f.overYear`, and the Stage pill's words are the glyph row's own set.
 * ⚠️ THE PANEL KEEPS THE `.lpop` CLASS: `usePopover`'s outside-press and scroll rules know a panel by it.
 * ⚠️ ONE LINE AT 1512 AND 1280: at compact widths the search is a fixed 220 (v17.1's fix).
 */
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PopoverState } from "../../shell/ListPills";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { StatusDot } from "../../StatusDot";
import {
  MORE_SWITCHES, SENT_NONE, STAGE_GROUPS, moreCount, qc138FilterGroups, stagePillLabel, type Qc138Filters,
} from "../../../lib/qc138";

export type Qc138Pop = "stage" | "sent" | "more";

export interface SentOption { key: string; name: string; line: string; n: number }

const Chevron: React.FC = () => (
  <svg className="qc138-chev" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" /></svg>
);
const Cross: React.FC = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 2l6 6M8 2 2 8" /></svg>
);

/** the drop-down: 10 under its pill (its left edge, or its right for More filters), scrolling inside */
const Panel: React.FC<{
  k: Qc138Pop; anchor: HTMLElement | null; id: string; title: string; note: string; align?: "left" | "right";
  showing: number; onClear?: () => void; onClose: () => void; children: React.ReactNode;
}> = ({ k, anchor, id, title, note, align = "left", showing, onClear, onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setPos(align === "right"
      ? { top: r.bottom + 10, right: Math.max(16, window.innerWidth - r.right) }
      : { top: r.bottom + 10, left: Math.max(16, Math.min(r.left, window.innerWidth - 300 - 16)) });
  }, [anchor, align]);
  useEffect(() => {
    if (!pos) return undefined;
    ref.current?.querySelector<HTMLElement>("[data-opt]")?.focus({ preventScroll: true });
    return () => { if (held.current && anchor?.isConnected) anchor.focus({ preventScroll: true }); };
  }, [pos, anchor]);
  if (!anchor || !pos) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const opts = [...(ref.current?.querySelectorAll<HTMLElement>("[data-opt]") ?? [])];
    if (!opts.length) return;
    e.preventDefault();
    const i = opts.indexOf(document.activeElement as HTMLElement);
    opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1) + (i < 0 && e.key === "ArrowUp" ? 1 : 0)) % opts.length].focus();
  };
  return createPortal(
    <div className="lpop qc138-pop" data-lpop={k} data-qc138="panel" id={id} role="dialog" aria-label={title} ref={ref} onKeyDown={onKey}
      onFocusCapture={() => { held.current = true; }}
      onBlurCapture={(e) => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) held.current = e.relatedTarget === null ? held.current : false; }}
      style={{ top: pos.top, left: pos.left, right: pos.right, maxHeight: `min(560px, calc(100vh - 220px), calc(100vh - ${Math.round(pos.top) + 16}px))` }}>
      <div className="qc138-pop-h"><b>{title}</b><span>{note}</span></div>
      <div className="qc138-pop-b">{children}</div>
      <div className="qc138-pop-f" data-qc138="panel-foot">
        {onClear ? <button type="button" className="qc138-pop-clear" data-qc138="panel-clear" onClick={onClear}>Clear</button> : <span />}
        <button type="button" className="qc138-pop-show" data-qc138="panel-show" onClick={() => { anchor.focus({ preventScroll: true }); onClose(); }}>
          Show {showing} {showing === 1 ? "query" : "queries"}
        </button>
      </div>
    </div>,
    document.body,
  );
};

export const QcFilters138: React.FC<{
  filters: Qc138Filters;
  onFilters: (f: Qc138Filters) => void;
  pop: PopoverState<Qc138Pop>;
  /** per status, over the manuscript's queries */
  stageCounts: ReadonlyMap<string, number>;
  dueWeekN: number;
  offersN: number;
  sentOptions: readonly SentOption[];
  moreN: Record<"past" | "missing" | "overYear", number>;
  /** the rows the list shows now: each panel's "Show {n} queries" */
  showing: number;
  msTitle: string | null;
  disabled?: boolean;
}> = ({ filters: f, onFilters, pop, stageCounts, dueWeekN, offersN, sentOptions, moreN, showing, msTitle, disabled = false }) => {
  const uid = useId();
  const set = (patch: Partial<Qc138Filters>) => onFilters({ ...f, ...patch });
  const mine = (k: Qc138Pop) => pop.open === k && pop.anchor?.closest('[data-qc138="fbar"]') != null;
  const pid = (k: Qc138Pop) => `${uid}-${k}`;
  const dd = (k: Qc138Pop, text: React.ReactNode, on: boolean, clear: () => void, chip?: React.ReactNode) => (
    <span className={`qc138-fpw${on ? " on" : ""}`} data-qc138="pill" data-k={k} data-on={on ? "" : undefined}>
      <button type="button" className="qc138-fp" data-lp={`qc138-${k}`} aria-haspopup="dialog" aria-expanded={mine(k)} disabled={disabled}
        aria-controls={mine(k) ? pid(k) : undefined} onClick={(e) => pop.toggle(k, e.currentTarget)}>
        <span className="qc138-fpl" data-qc138="pill-label">{text}</span>{chip}<Chevron />
      </button>
      {on ? <button type="button" className="qc138-fpx" data-qc138="pill-clear" aria-label={`Clear ${k === "more" ? "more filters" : k === "sent" ? "what you sent" : "stage"}`} onClick={clear}><Cross /></button> : null}
    </span>
  );
  const toggle = (k: "dueWeek" | "offers", text: string, n: number) => (
    <span className={`qc138-fpw${f[k] ? " on" : ""}`} data-qc138="pill" data-k={k} data-on={f[k] ? "" : undefined}>
      <button type="button" className="qc138-fp qc138-fp--tg" aria-pressed={f[k]} disabled={disabled} onClick={() => set({ [k]: !f[k] } as Partial<Qc138Filters>)}>
        <span className="qc138-fpl" data-qc138="pill-label">{text}</span><em className="qc138-fpn" data-qc138="pill-n">{n}</em>
      </button>
      {f[k] ? <button type="button" className="qc138-fpx" data-qc138="pill-clear" aria-label={`Clear ${text}`} onClick={() => set({ [k]: false } as Partial<Qc138Filters>)}><Cross /></button> : null}
    </span>
  );
  const onMore = moreCount(f);
  const sentLabel = f.sent.length === 0 ? "What you sent"
    : f.sent.length === 1 ? (sentOptions.find((o) => o.key === f.sent[0])?.name ?? "What you sent") : `${f.sent.length} kinds sent`;
  const toggleStage = (s: string) => set({ stages: (f.stages.includes(s as never) ? f.stages.filter((x) => x !== s) : [...f.stages, s]) as Qc138Filters["stages"] });
  const toggleSent = (k: string) => set({ sent: f.sent.includes(k) ? f.sent.filter((x) => x !== k) : [...f.sent, k] });
  return (
    <div className="qc138-fr" data-qc138="filters">
      {/* v138.1 §F — the search moved into the list sheet's navy row; the pills start at the row's left */}
      <div className="qc138-fbar" data-qc138="fbar">
        {dd("stage", stagePillLabel(f.stages), f.stages.length > 0, () => set({ stages: [] }))}
        {toggle("dueWeek", "Due this week", dueWeekN)}
        {toggle("offers", "Offers", offersN)}
        {dd("sent", sentLabel, f.sent.length > 0, () => set({ sent: [] }))}
        {dd("more", "More filters", onMore > 0, () => set({ past: false, missing: false, overYear: false }),
          <em className="qc138-fpn" data-qc138="more-count">{onMore ? `${onMore} on` : MORE_SWITCHES.length}</em>)}
      </div>

      {mine("stage") && (
        <Panel k="stage" id={pid("stage")} anchor={pop.anchor} title="Where it stands" note="Pick any number" showing={showing}
          onClear={f.stages.length ? () => set({ stages: [] }) : undefined} onClose={pop.close}>
          {STAGE_GROUPS.map((g) => (
            <div className="qc138-pop-g" key={g.title} data-qc138="panel-group">
              <h6>{g.title}</h6>
              {g.statuses.map(({ s, label }) => {
                const on = f.stages.includes(s), n = stageCounts.get(s) ?? 0;
                return (
                  <button key={s} type="button" className={`qc138-opt${on ? " on" : ""}${n === 0 ? " zero" : ""}`} data-opt={`stage:${s}`}
                    role="menuitemcheckbox" aria-checked={on} onClick={() => toggleStage(s)}>
                    <span className="qc138-bx" aria-hidden="true">{on ? "✓" : ""}</span>
                    <span className="qc138-dot" aria-hidden="true"><StatusDot status={s} overrideSize={12} /></span>
                    <span className="qc138-ol">{label}</span>
                    <small data-qc138="opt-count">{n}</small>
                  </button>
                );
              })}
            </div>
          ))}
        </Panel>
      )}
      {mine("sent") && (
        <Panel k="sent" id={pid("sent")} anchor={pop.anchor} title="What you sent" note={msTitle?.trim() || "Your book"} showing={showing}
          onClear={f.sent.length ? () => set({ sent: [] }) : undefined} onClose={pop.close}>
          {sentOptions.map((o) => {
            const on = f.sent.includes(o.key);
            return (
              <button key={o.key} type="button" className={`qc138-opt qc138-opt--2${on ? " on" : ""}${o.n === 0 ? " zero" : ""}`} data-opt={`sent:${o.key === SENT_NONE ? "none" : o.key}`}
                role="menuitemcheckbox" aria-checked={on} onClick={() => toggleSent(o.key)}>
                <span className="qc138-bx" aria-hidden="true">{on ? "✓" : ""}</span>
                <span className="qc138-ol">{o.name}<i>{o.line}</i></span>
                <small data-qc138="opt-count">{o.n}</small>
              </button>
            );
          })}
        </Panel>
      )}
      {mine("more") && (
        <Panel k="more" id={pid("more")} anchor={pop.anchor} align="right" title="More filters" note="Switch on any you need" showing={showing}
          onClear={onMore ? () => set({ past: false, missing: false, overYear: false }) : undefined} onClose={pop.close}>
          {MORE_SWITCHES.map((r) => (
            <button key={r.key} type="button" className={`qc138-opt qc138-opt--2 qc138-opt--sw${f[r.key] ? " on" : ""}`} data-opt={`more:${r.key}`}
              role="switch" aria-checked={f[r.key]} onClick={() => set({ [r.key]: !f[r.key] } as Partial<Qc138Filters>)}>
              <span className="qc138-ol">{r.label}<i>{r.line}</i></span>
              <small data-qc138="opt-count">{moreN[r.key]}</small>
              <span className="qc138-sw" data-qc138="switch" data-on={f[r.key] ? "" : undefined} aria-hidden="true"><i /></span>
            </button>
          ))}
        </Panel>
      )}
    </div>
  );
};

/**
 * v138.5 §E — THE FILTERS BUTTON, in the navy list header, and its panel: the filter row that sat under the header,
 * moved behind one button. The panel holds the same `QcFilters138` (the same pills, the same dropdowns, the one
 * filter state), so nothing is copied.
 *
 * ⚠️ THE BADGE COUNTS GROUPS (`qc138FilterGroups`), not switches: More filters is one group however many are on.
 * ⚠️ THE PANEL CLOSES ON AN OUTSIDE PRESS OR ESCAPE, AND FOCUS GOES BACK TO THE BUTTON. A pill's own dropdown is
 *    portalled to the body, so a press inside it (`.lpop`) is not "outside". Escape is one stack: the dropdown,
 *    opened later at the same level, takes the key first; the next Escape closes the panel.
 * ⚠️ IT IS FIXED, 10 UNDER THE BUTTON AND RIGHT-ALIGNED TO IT, kept within the viewport; a page scroll closes it,
 *    as it closes the pills' own dropdowns, because a fixed panel cannot follow its button.
 */
export const QcFiltersButton138: React.FC<{
  filters: Qc138Filters;
  onClearAll: () => void;
  disabled?: boolean;
  /** the pills: a `QcFilters138` */
  children: React.ReactNode;
}> = ({ filters, onClearAll, disabled = false, children }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const n = qc138FilterGroups(filters);
  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus({ preventScroll: true });
  }, []);
  useEscapeLayer(open, close, ESC_LEVEL.page);
  useLayoutEffect(() => {
    if (!open || !btn.current) { setPos(null); return; }
    const r = btn.current.getBoundingClientRect();
    setPos({ top: r.bottom + 10, right: Math.max(16, window.innerWidth - r.right) });
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || panel.current?.contains(t)) return;
      if (t instanceof Element && t.closest(".lpop")) return;
      close(false);
    };
    const scroll = (e: Event) => {
      const t = e.target as Node;
      if (t instanceof Element && (t.closest(".lpop") || panel.current?.contains(t))) return;
      close(false);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("scroll", scroll, true);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("scroll", scroll, true); };
  }, [open, close]);
  return (
    <>
      <button type="button" ref={btn} className="qc138-fb" data-qc138="filters-btn" aria-haspopup="dialog" aria-expanded={open}
        disabled={disabled} onClick={() => (open ? close() : setOpen(true))}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 4h12M4.5 8h7M7 12h2" /></svg>
        <span>Filters</span>
        {n > 0 ? <b className="qc138-fbn" data-qc138="filters-badge" aria-label={`${n} set`}>{n}</b> : null}
      </button>
      {open && pos ? createPortal(
        <div className="qc138-fpanel" data-qc138="filters-panel" role="dialog" aria-label="Filter queries" ref={panel}
          style={{ top: pos.top, right: pos.right }}>
          <div className="qc138-fph">
            <b>Filter queries</b>
            <button type="button" className="qc138-fpc" data-qc138="filters-clear" onClick={onClearAll}>Clear all</button>
          </div>
          {children}
        </div>,
        document.body,
      ) : null}
    </>
  );
};
