/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §3–§4 — THE CARD'S EDITING PARTS, shared by the record form (§3) and Fix a mistake (§4.2): the
 * app's own calendar (no browser date input), the app's own menus (no `<select>`), and the material chips with their
 * small editors (§4.4).
 *
 * ⚠️ MENUS AND CALENDARS SIT OVER THE CARD (§4.7): they portal into the card's root, outside its scroll area, open below
 *    their field or above it when there is no room, stay inside the card's edges and follow the field as it scrolls.
 * ⚠️ ONE OPEN AT A TIME, and the card's one Escape handler closes it before stepping back (`PopCtx.close`).
 */
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MONTHS_SHORT } from "../../../lib/dates";
import { KIND_LABEL, UNIT, matLabel, type MatKind, type SampleUnit, type StepMaterial } from "../../../lib/qc152Write";
import "./qcv152edit.css";

const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const fullDay = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; };
const DAY = 86_400_000;
const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ── the one open popover, over the card ──────────────────────────────────────────────────────────────────────── */

export interface PopApi { root: HTMLElement | null; open: string | null; setOpen: (k: string | null) => void }
export const PopCtx = createContext<PopApi>({ root: null, open: null, setOpen: () => {} });

/** a popover anchored to `anchor`, drawn in the card's root so its scroll area cannot clip it */
export const Pop: React.FC<{ anchor: React.RefObject<HTMLElement | null>; align?: "left" | "right"; children: React.ReactNode; className?: string; data?: string }> = ({ anchor, align = "left", children, className, data }) => {
  const { root } = useContext(PopCtx);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current, el = ref.current;
      if (!a || !el || !root) return;
      const r = root.getBoundingClientRect(), ar = a.getBoundingClientRect();
      const w = el.offsetWidth, h = el.offsetHeight;
      let left = (align === "right" ? ar.right - w : ar.left) - r.left;
      left = Math.max(8, Math.min(left, r.width - w - 8));
      const below = ar.bottom - r.top + 6;
      const above = ar.top - r.top - h - 6;
      const top = below + h > r.height - 8 && above >= 8 ? above : Math.min(below, Math.max(8, r.height - h - 8));
      setPos({ left, top });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); };
  }, [anchor, root, align]);
  if (!root) return null;
  return createPortal(
    <div ref={ref} className={`qc152-pop2${className ? ` ${className}` : ""}`} data-qc152={data ?? "pop"} role="dialog"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
      onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>{children}</div>,
    root,
  );
};

/** closes the open popover on a press outside it (inside the card) */
export function useOutsideClose(api: PopApi) {
  useEffect(() => {
    if (!api.open || !api.root) return undefined;
    const h = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest?.(".qc152-pop2") || t.closest?.("[data-pop-anchor]")) return;
      api.setOpen(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [api.open, api.root]); // eslint-disable-line react-hooks/exhaustive-deps
}

const CAL_ICON = <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></svg>;
const CHEV = <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>;

/* ── the calendar (§3.1 When, §4.2) ───────────────────────────────────────────────────────────────────────────── */

export const CalendarField: React.FC<{
  id: string;
  valueMs: number;
  nowMs: number;
  /** why a day is greyed, or "" */
  blocked: (dayMs: number) => string;
  onChange: (dayMs: number) => void;
  /** v152.1 §2.5 a deadline you gave others is ahead of today: let the calendar page forward */
  future?: boolean;
}> = ({ id, valueMs, nowMs, blocked, onChange, future }) => {
  const api = useContext(PopCtx);
  const open = api.open === `cal:${id}`;
  const btn = useRef<HTMLButtonElement>(null);
  const [month, setMonth] = useState(() => { const d = new Date(valueMs); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); });
  useEffect(() => { if (open) { const d = new Date(valueMs); setMonth(new Date(d.getFullYear(), d.getMonth(), 1).getTime()); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = new Date(month), y = m.getFullYear(), mo = m.getMonth();
  const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
  const dim = new Date(y, mo + 1, 0).getDate();
  const nextDisabled = !future && new Date(y, mo + 1, 1).getTime() > nowMs;
  const today = startOfDay(nowMs);
  const anyBlocked = Array.from({ length: dim }, (_, i) => new Date(y, mo, i + 1).getTime()).some((t) => t <= today && blocked(t));
  return (
    <span className="qc152-qsel">
      <button ref={btn} type="button" className="qc152-qdb" data-qc152="date-btn" data-pop-anchor="" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => api.setOpen(open ? null : `cal:${id}`)}>{fullDay(valueMs)}{CAL_ICON}</button>
      {open ? (
        <Pop anchor={btn} align="right" className="qc152-cal" data="calendar">
          <div className="qc152-calh">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(y, mo - 1, 1).getTime())}>‹</button>
            <b>{MON_LONG[mo]} {y}</b>
            <button type="button" aria-label="Next month" disabled={nextDisabled} onClick={() => setMonth(new Date(y, mo + 1, 1).getTime())}>›</button>
          </div>
          <div className="qc152-calw">{["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <span key={i}>{x}</span>)}</div>
          <div className="qc152-calg">
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: dim }, (_, i) => {
              const t = new Date(y, mo, i + 1).getTime();
              const why = blocked(t);
              return (
                <button key={t} type="button" className={`qc152-cd${startOfDay(valueMs) === t ? " sel" : ""}${t === today ? " td" : ""}`} data-qc152="day" data-day={new Date(t).toISOString().slice(0, 10)}
                  disabled={!!why} title={why || undefined} aria-label={`${fullDay(t)}${why ? `: ${why}` : ""}`}
                  onClick={() => { onChange(t); api.setOpen(null); }}>{i + 1}</button>
              );
            })}
          </div>
          {!blocked(today) ? <button type="button" className="qc152-calt" onClick={() => { onChange(today); api.setOpen(null); }}>Today</button> : null}
          {anyBlocked ? <p className="qc152-caln">Greyed days would put the steps out of order.</p> : null}
        </Pop>
      ) : null}
    </span>
  );
};
void DAY;

/* ── a menu (the app's own dropdown) ──────────────────────────────────────────────────────────────────────────── */

export interface MenuOpt { key: string; label: string; why?: string; glyph?: React.ReactNode; sub?: string }
export const MenuField: React.FC<{ id: string; value: string; label: React.ReactNode; options: MenuOpt[]; onPick: (k: string) => void; wide?: boolean }> = ({ id, value, label, options, onPick, wide }) => {
  const api = useContext(PopCtx);
  const open = api.open === `menu:${id}`;
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <span className={`qc152-qsel${wide ? " wide" : ""}`}>
      <button ref={btn} type="button" className="qc152-qsb" data-qc152="menu-btn" data-pop-anchor="" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => api.setOpen(open ? null : `menu:${id}`)}>{label}{CHEV}</button>
      {open ? (
        <Pop anchor={btn} className="qc152-menu" data="menu">
          <div role="listbox">
            {options.map((o) => (
              <button key={o.key} type="button" role="option" aria-selected={o.key === value} className={`qc152-qo${o.key === value ? " sel" : ""}${o.why ? " dis" : ""}`}
                data-qc152="menu-opt" data-k={o.key} disabled={!!o.why && o.key !== value}
                onClick={() => { onPick(o.key); api.setOpen(null); }}>
                {o.glyph ? <span className="qc152-qg">{o.glyph}</span> : null}
                <span><b>{o.label}</b>{o.sub ? <em>{o.sub}</em> : null}{o.why && o.key !== value ? <em data-qc152="why">{o.why}</em> : null}</span>
                {o.key === value ? <i>✓</i> : null}
              </button>
            ))}
          </div>
        </Pop>
      ) : null}
    </span>
  );
};

/* ── the material chips and their editors (§4.4) ─────────────────────────────────────────────────────────────── */

export interface MatEnv {
  free: boolean;
  /** the book's versions, oldest first (Pro) */
  versions: { id: string; name: string; madeMs: number }[];
  letters: { name: string; sub?: string }[];
  synopses: { name: string }[];
  /** the version in use (the default for a new sample or full) */
  inUseVersionId: string | null;
}

export const MatChips: React.FC<{
  id: string;
  mats: StepMaterial[];
  onChange: (m: StepMaterial[]) => void;
  env: MatEnv;
  /** the step's day (a version saved after it asks "Are you sure?") */
  stepMs: number;
  /** a request's chips take no version (§4.4) */
  request: boolean;
}> = ({ id, mats, onChange, env, stepMs, request }) => {
  const api = useContext(PopCtx);
  const vName = (vid: string) => env.versions.find((v) => v.id === vid)?.name ?? null;
  const originalId = env.versions[0]?.id ?? null;
  const label = (m: StepMaterial) => matLabel(m, { free: env.free, versionName: vName, originalId });
  const put = (i: number, patch: Partial<StepMaterial>) => onChange(mats.map((m, k) => (k === i ? { ...m, ...patch } : m)));
  const drop = (i: number) => onChange(mats.filter((_, k) => k !== i));
  const have = new Set(mats.map((m) => m.kind));
  const addable: MatKind[] = (["letter", "synopsis", "sample", "full", "other"] as MatKind[]).filter((k) => k === "other" || !have.has(k));
  const verFor = () => {
    const ok = env.versions.filter((v) => v.madeMs <= stepMs + DAY);
    return env.inUseVersionId && env.versions.find((v) => v.id === env.inUseVersionId && v.madeMs <= stepMs + DAY) ? env.inUseVersionId : ok[ok.length - 1]?.id ?? null;
  };
  const add = (k: MatKind) => {
    const n: StepMaterial = k === "letter" ? { kind: k, name: env.free ? null : env.letters[0]?.name ?? null }
      : k === "synopsis" ? { kind: k, name: env.free ? null : env.synopses[0]?.name ?? null }
      : k === "sample" ? { kind: k, unit: "chapters", n: UNIT.chapters.def, versionId: env.free || request ? null : verFor() }
      : k === "full" ? { kind: k, versionId: env.free || request ? null : verFor() }
      : { kind: k, text: "" };
    onChange([...mats, n]);
    api.setOpen(`mat:${id}:${mats.length}`);
  };
  return (
    <div className="qc152-mats" data-qc152="mats">
      {mats.map((m, i) => (
        <MatChip key={i} chipId={`mat:${id}:${i}`} m={m} label={label(m)} env={env} stepMs={stepMs} request={request}
          onPut={(p) => put(i, p)} onDrop={() => drop(i)}
          onDone={() => { if (m.kind === "other" && !(m.text ?? "").trim()) drop(i); api.setOpen(null); }} />
      ))}
      <AddMat id={`mat:${id}:add`} kinds={addable} onAdd={add} />
    </div>
  );
};

const AddMat: React.FC<{ id: string; kinds: MatKind[]; onAdd: (k: MatKind) => void }> = ({ id, kinds, onAdd }) => {
  const api = useContext(PopCtx);
  const btn = useRef<HTMLButtonElement>(null);
  const open = api.open === id;
  return (
    <span className="qc152-mpw plus">
      <button ref={btn} type="button" className="qc152-mp" data-qc152="mat-add" data-pop-anchor="" onClick={() => api.setOpen(open ? null : id)}>+ Material</button>
      {open ? (
        <Pop anchor={btn} className="qc152-menu" data="mat-add-menu">
          <div className="qc152-mph"><b>Add a material</b><em>One of each kind per step.</em></div>
          {kinds.map((k) => <button key={k} type="button" className="qc152-qo" data-qc152="mat-kind" data-k={k} onClick={() => onAdd(k)}><span><b>{KIND_LABEL[k]}</b></span></button>)}
        </Pop>
      ) : null}
    </span>
  );
};

const MatChip: React.FC<{
  chipId: string; m: StepMaterial; label: string; env: MatEnv; stepMs: number; request: boolean;
  onPut: (p: Partial<StepMaterial>) => void; onDrop: () => void; onDone: () => void;
}> = ({ chipId, m, label, env, stepMs, request, onPut, onDrop, onDone }) => {
  const api = useContext(PopCtx);
  const btn = useRef<HTMLButtonElement>(null);
  const open = api.open === chipId;
  const pro = !env.free;
  const radio = (on: boolean, l: string, sub: string | undefined, act: () => void, key: string) => (
    <button key={key} type="button" role="radio" aria-checked={on} className={`qc152-mro${on ? " on" : ""}`} onClick={act}><i className="qc152-rd" /><span><b>{l}</b>{sub ? <em>{sub}</em> : null}</span></button>
  );
  let body: React.ReactNode = null;
  if (m.kind === "letter") {
    body = pro ? <>{env.letters.map((L) => radio(m.name === L.name, L.name, L.sub, () => onPut({ name: L.name }), L.name))}
      {radio(!m.name, "A letter not in QueryHawk", "Counts as a plain letter in your results", () => onPut({ name: null }), "none")}</>
      : <p className="qc152-mpn">Recorded as your query letter.</p>;
  } else if (m.kind === "synopsis") {
    body = pro ? <>{env.synopses.map((S) => radio(m.name === S.name, S.name, undefined, () => onPut({ name: S.name }), S.name))}
      {radio(!m.name, "A synopsis not in QueryHawk", undefined, () => onPut({ name: null }), "none")}</>
      : (
        <div className="qc152-mrow"><span className="qc152-ml">Length</span>
          <span className="qc152-stp" data-qc152="stepper">
            <button type="button" aria-label="Shorter" disabled={!m.pages} onClick={() => { const p = (m.pages ?? 0) - 1; onPut({ pages: p > 0 ? p : null }); }}>−</button>
            <span className="qc152-sv" data-qc152="amount">{m.pages ? `${m.pages} page${m.pages > 1 ? "s" : ""}` : "Any length"}</span>
            <button type="button" aria-label="Longer" disabled={(m.pages ?? 0) >= 10} onClick={() => onPut({ pages: Math.min(10, (m.pages ?? 0) + 1) })}>+</button>
          </span></div>
      );
  } else if (m.kind === "sample") {
    const u = UNIT[m.unit ?? "chapters"];
    const n = m.n ?? u.def;
    body = <>
      <div className="qc152-mrow"><span className="qc152-ml">Sent as</span>
        <span className="qc152-dseg" role="radiogroup" aria-label="Sent as">
          {(Object.keys(UNIT) as SampleUnit[]).map((k) => <button key={k} type="button" role="radio" aria-checked={(m.unit ?? "chapters") === k} data-qc152="unit" data-unit={k} onClick={() => onPut({ unit: k, n: UNIT[k].def })}>{UNIT[k].label}</button>)}
        </span></div>
      <div className="qc152-mrow"><span className="qc152-ml">How much</span>
        <span className="qc152-stp" data-qc152="stepper">
          <button type="button" aria-label="Less" data-qc152="less" disabled={n <= u.min} onClick={() => onPut({ n: Math.max(u.min, n - u.step) })}>−</button>
          <span className="qc152-sv" data-qc152="amount">{(m.unit ?? "chapters") === "chapters" ? `First ${n}` : n.toLocaleString("en-GB")}</span>
          <button type="button" aria-label="More" data-qc152="more" disabled={n >= u.max} onClick={() => onPut({ n: Math.min(u.max, n + u.step) })}>+</button>
        </span></div>
    </>;
  } else if (m.kind === "full") {
    body = pro ? null : <p className="qc152-mpn">The whole manuscript.</p>;
  } else {
    body = <><input className="qc152-mtx" data-qc152="other-text" maxLength={40} placeholder="e.g. Author bio" value={m.text ?? ""} autoFocus
      onChange={(e) => onPut({ text: e.target.value.slice(0, 40) })} /><p className="qc152-mpn">Up to 40 characters.</p></>;
  }
  const ver = pro && !request && (m.kind === "sample" || m.kind === "full") && env.versions.length ? (() => {
    const v = env.versions.find((x) => x.id === m.versionId) ?? env.versions[0];
    const late = v && v.madeMs > stepMs + DAY;
    return <>
      <div className="qc152-mrow"><span className="qc152-ml">Version</span>
        <span className="qc152-dseg" role="radiogroup" aria-label="Version" data-qc152="versions">
          {env.versions.map((x) => <button key={x.id} type="button" role="radio" aria-checked={(m.versionId ?? env.versions[0].id) === x.id} data-qc152="version" onClick={() => onPut({ versionId: x.id })}>{x.name}</button>)}
        </span></div>
      {late ? <p className="qc152-mpw2" data-qc152="version-late">Are you sure? {v.name} was saved {Math.round((v.madeMs - stepMs) / DAY)} days after this went.</p> : null}
    </>;
  })() : null;
  return (
    <span className={`qc152-mpw${open ? " open" : ""}`}>
      <button ref={btn} type="button" className="qc152-mp" data-qc152="mat-chip" data-kind={m.kind} data-pop-anchor="" title="Change this" onClick={() => api.setOpen(open ? null : chipId)}>{label}</button>
      <button type="button" className="qc152-mx" data-qc152="mat-x" aria-label={`Remove ${label}`} onClick={() => { onDrop(); api.setOpen(null); }}>✕</button>
      {open ? (
        <Pop anchor={btn} className="qc152-menu qc152-mpop" data="mat-editor">
          <div className="qc152-mph"><b>{KIND_LABEL[m.kind]}</b></div>
          {body}{ver}
          <div className="qc152-mpf">
            <button type="button" className="qc152-mrm" data-qc152="mat-remove" onClick={() => { onDrop(); api.setOpen(null); }}>Remove from this step</button>
            <button type="button" className="qc152-mdone" data-qc152="mat-done" onClick={onDone}>Done</button>
          </div>
        </Pop>
      ) : null}
    </span>
  );
};
