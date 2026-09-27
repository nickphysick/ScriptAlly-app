/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The drawer's shared controls (design-refs/query-actions-v11.html §B): chips, the date field and
 * its calendar, toggles, notes, radios, the segmented control, the sample control, the plan track
 * and the agent card. Every journey composes these and nothing else, so one control never looks two
 * ways in two journeys.
 */
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addDays, dayDiff, fmt, fmtY, isWeekend, MONL, rel, sameDay, SHIFT_NOTE, up, type Anchor,
} from "../../lib/queryActions/dates";
import {
  bump, bumpFrom, defFromUnit, n0, sampleApprox, sampleName, setFromUnit, setSect, setUnit, unitSpec,
  type Book, type FromUnit, type Sample, type SampleUnit,
} from "../../lib/queryActions/sample";
import { layoutTrack, type TrackPoint } from "../../lib/queryActions/track";

/* ---------- the drawer context: today, and which calendar is open ---------- */

export interface DrawerCtx {
  today: Date;
  openCal: string | null;
  setOpenCal: (id: string | null) => void;
}
export const DrawerContext = createContext<DrawerCtx>({ today: new Date(), openCal: null, setOpenCal: () => {} });
export const useDrawer = () => useContext(DrawerContext);

/* ---------- small pieces ---------- */

export function Fl({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="qad-fl">{children}{right != null && right !== "" ? <span className="r">{right}</span> : null}</div>;
}

export function Chip({ on, onClick, children, small, testId }: { on?: boolean; onClick: () => void; children: React.ReactNode; small?: React.ReactNode; testId?: string }) {
  return (
    <button type="button" className={`qad-chip${on ? " on" : ""}`} onClick={onClick} data-qad-chip={testId}>
      {children}{small != null ? <> <small>{small}</small></> : null}
    </button>
  );
}

export function Chips<K extends string>({ options, value, onPick, name }: { options: [K, React.ReactNode, React.ReactNode?][]; value: K | null; onPick: (k: K) => void; name?: string }) {
  return (
    <div className="qad-chips" data-qad-chips={name}>
      {options.map(([k, label, small]) => (
        <Chip key={k} on={value === k} onClick={() => onPick(k)} small={small} testId={k}>{label}</Chip>
      ))}
    </div>
  );
}

export type NoteKind = "ok" | "warn" | "info";
export function Note({ kind, tag, children, style }: { kind: NoteKind; tag: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`qad-note ${kind}`} style={style} data-qad-note={tag}>
      <span className="ni">{tag}</span><span>{children}</span>
    </div>
  );
}
export function NoteLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className="lk" onClick={onClick}>{children}</button>;
}

export function Toggle({ on, onClick, children, small, style, testId }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: React.ReactNode; style?: React.CSSProperties; testId?: string }) {
  return (
    <button type="button" className={`qad-tgl${on ? " on" : ""}`} onClick={onClick} style={style} aria-pressed={on} data-qad-toggle={testId}>
      <span className="bx">{on ? "✓" : ""}</span><b>{children}</b>{small ? <small>{small}</small> : null}
    </button>
  );
}

export function Radios<K extends string>({ options, value, onPick }: { options: { k: K; title: React.ReactNode; sub: React.ReactNode; tag?: React.ReactNode; tagGo?: boolean }[]; value: K | null; onPick: (k: K) => void }) {
  return (
    <div className="qad-rads" role="radiogroup">
      {options.map((o) => (
        <button key={o.k} type="button" role="radio" aria-checked={value === o.k} className={`qad-rad${value === o.k ? " on" : ""}`} onClick={() => onPick(o.k)} data-qad-rad={o.k}>
          <i /><span><b>{o.title}</b><small>{o.sub}</small></span>
          {o.tag ? <em className={o.tagGo ? "go" : undefined}>{o.tag}</em> : null}
        </button>
      ))}
    </div>
  );
}

export function Seg<K extends string>({ options, value, onPick, wide, sm, style }: { options: [K, React.ReactNode][]; value: K; onPick: (k: K) => void; wide?: boolean; sm?: boolean; style?: React.CSSProperties }) {
  return (
    <span className={`qad-seg${wide ? " wide" : ""}${sm ? " sm" : ""}`} style={style}>
      {options.map(([k, l]) => (
        <button key={k} type="button" className={value === k ? "on" : ""} onClick={() => onPick(k)} aria-pressed={value === k}>{l}</button>
      ))}
    </span>
  );
}

export function TextBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea className="qad-fta" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

/** A value that animates up or down when it changes (`.qad-tick`). */
function useTick(v: number | null): string {
  const last = useRef<number | null | undefined>(undefined);
  const cls = useRef("");
  if (last.current !== undefined && last.current !== v && v != null && last.current != null) {
    cls.current = v > last.current ? "qad-tick" : "qad-tick dn";
  } else if (last.current !== v) cls.current = "";
  last.current = v;
  return cls.current;
}

/* ---------- the date field ---------- */

export type DateDir = "past" | "future";

export function DateField({ id, label, right, value, anchors, dir, onPick, forceKey, shift }: {
  id: string;
  label?: React.ReactNode;
  right?: React.ReactNode;
  value: Date | null;
  anchors: Anchor[];
  dir: DateDir;
  /** Called with the day and the key of the chip that picked it (`"custom"` from the calendar). */
  onPick: (d: Date | null, key: string) => void;
  forceKey?: string | null;
  /** Show MOVED OFF THE WEEKEND beside the result. */
  shift?: boolean;
}) {
  const { today, openCal, setOpenCal } = useDrawer();
  const hit = forceKey ? anchors.find((x) => x.k === forceKey) : anchors.find((x) => x.d && sameDay(x.d, value));
  const custom = !hit && !!value;
  const tick = useTick(value ? value.getTime() : null);
  const open = openCal === id;
  return (
    <>
      {label ? <Fl right={right}>{label}</Fl> : null}
      <div className="qad-dfield" data-qad-date={id}>
        <div className="qad-chips">
          {anchors.map((x) => (
            <Chip key={x.k} on={!!hit && hit.k === x.k} small={x.sub} testId={x.k} onClick={() => { setOpenCal(null); onPick(x.d ? new Date(x.d) : null, x.k); }}>{x.label}</Chip>
          ))}
          <button type="button" className={`qad-chip ghost${custom ? " on" : ""}`} data-qad-cal-toggle onClick={() => setOpenCal(open ? null : id)}>
            <span className="ic">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" /></svg>
            </span>
            {custom && value ? fmt(value) : "Pick a date"}
          </button>
        </div>
        {value ? (
          <div className="qad-dres">
            <b className={tick} key={value.getTime()}>{fmtY(value)}</b>
            <span>{rel(value, today).toUpperCase()}</span>
            {shift ? <span className="shift">{SHIFT_NOTE}</span> : null}
          </div>
        ) : null}
        {open ? <Calendar value={value} dir={dir} onPick={(d) => { setOpenCal(null); onPick(d, "custom"); }} /> : null}
      </div>
    </>
  );
}

function Calendar({ value, dir, onPick }: { value: Date | null; dir: DateDir; onPick: (d: Date) => void }) {
  const { today, setOpenCal } = useDrawer();
  const start0 = value || today;
  const [view, setView] = useState(new Date(start0.getFullYear(), start0.getMonth(), 1));
  const ref = useRef<HTMLDivElement>(null);
  /* Closes on an outside press, in the CAPTURE phase, so the press that closes it is not also a
     click on whatever lies beneath. The toggle counts as inside, or it would close and reopen. */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (ref.current && t && !ref.current.contains(t) && !t.closest?.("[data-qad-cal-toggle]")) setOpenCal(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [setOpenCal]);
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < lead; i++) {
    const d = new Date(view.getFullYear(), view.getMonth(), i - lead + 1);
    cells.push(<button type="button" key={`m${i}`} className="mut" tabIndex={-1} disabled>{d.getDate()}</button>);
  }
  for (let d = 1; d <= dim; d++) {
    const dd = new Date(view.getFullYear(), view.getMonth(), d);
    const bad = (dir === "past" && dayDiff(dd, today) > 0) || (dir === "future" && dayDiff(dd, today) < 0);
    const cls = [bad ? "no" : "", sameDay(dd, today) ? "td" : "", sameDay(dd, value) ? "sel" : "", dir === "future" && isWeekend(dd) && !bad ? "wk" : ""].filter(Boolean).join(" ");
    cells.push(<button type="button" key={d} className={cls} data-qad-day={`${dd.getFullYear()}-${dd.getMonth() + 1}-${d}`} disabled={bad} onClick={() => onPick(dd)}>{d}</button>);
  }
  return (
    <div className="qad-cal" ref={ref} role="dialog" aria-label="Pick a date">
      <div className="mh">
        <button type="button" aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>‹</button>
        <b>{MONL[view.getMonth()]} {view.getFullYear()}</b>
        <button type="button" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="dow">{["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <span key={i}>{x}</span>)}</div>
      <div className="grid">{cells}</div>
      <div className="cf">
        <span>{dir === "past" ? "NO FUTURE DATES" : "• WEEKEND"}</span>
        <button type="button" onClick={() => onPick(today)}>Today</button>
      </div>
    </div>
  );
}

/* ---------- the sample control ---------- */

export function SampleControl({ sample, onChange, book, allowNone, name }: { sample: Sample; onChange: (s: Sample) => void; book: Book; allowNone?: boolean; name?: string }) {
  const units: SampleUnit[] = ["pages", "words", "chapters", ...(allowNone ? (["none"] as SampleUnit[]) : [])];
  const s = sample;
  const tick = useTick(s.unit === "none" ? null : s.amt);
  const U = s.unit !== "none" ? unitSpec(s.unit, book) : null;
  const fu: FromUnit = s.fu || defFromUnit(s.unit);
  return (
    <div className={`qad-samp${s.unit === "none" ? " off" : ""}`} data-qad-sample={name}>
      <div className="qad-srow">
        <b>Sample</b>
        <Seg style={{ marginLeft: "auto" }} value={s.unit} onPick={(u) => onChange(setUnit(s, u, book))}
          options={units.map((u) => [u, u === "none" ? "None" : u[0].toUpperCase() + u.slice(1)] as [SampleUnit, string])} />
      </div>
      {U ? (
        <>
          <div className="qad-amt">
            <span className="qad-step">
              <button type="button" aria-label="Less" onClick={() => onChange(bump(s, -1, book))}>−</button>
              <b data-qad-amount><span className={tick} key={s.amt}>{n0(s.amt)}</span></b>
              <button type="button" aria-label="More" onClick={() => onChange(bump(s, 1, book))}>+</button>
            </span>
            <span className="qad-unitl">{s.amt === 1 ? U.one : U.many}</span>
          </div>
          <div className="qad-presets">
            {U.pre.map((p) => <Chip key={p} on={s.amt === p} onClick={() => onChange({ ...s, amt: p })}>{n0(p)}</Chip>)}
          </div>
          <div className="qad-from">
            <Seg wide value={s.sect ? "sect" : "open"} onPick={(k) => onChange(setSect(s, k === "sect", book))}
              options={[["open", "From the opening"], ["sect", "A specific section"]]} />
            {s.sect ? (
              <div className="qad-sectline">
                Starting at
                <Seg value={fu} onPick={(u) => onChange(setFromUnit(s, u, book))} options={[["chapter", "Chapter"], ["page", "Page"], ["word", "Word"]]} />
                <span className="qad-step sm">
                  <button type="button" aria-label="Earlier" onClick={() => onChange(bumpFrom(s, -1, book))}>−</button>
                  <b>{n0(s.from)}</b>
                  <button type="button" aria-label="Later" onClick={() => onChange(bumpFrom(s, 1, book))}>+</button>
                </span>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function SampleLine({ label, sample, book }: { label: React.ReactNode; sample: Sample; book: Book }) {
  return <div className="qad-sline"><b>{label}</b><span>{sample.unit !== "none" ? sampleApprox(sample, book) : ""}</span></div>;
}
export { sampleName };

/* ---------- the plan track ---------- */

export interface PlanSpec { title: "THE PLAN" | "THE RECORD" | "WHAT'S AHEAD" | "SO FAR"; points: TrackPoint[] }

export function PlanTrack({ plan, review, className }: { plan: PlanSpec; review?: boolean; className?: string }) {
  const { today } = useDrawer();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(408);
  useLayoutEffect(() => {
    const w = ref.current?.clientWidth;
    if (w && w > 0 && Math.abs(w - width) > 1) setWidth(w);
  });
  const L = layoutTrack(plan.points, today, width);
  const tf = (a: string) => (a === "start" ? "translateX(-14%)" : a === "end" ? "translateX(-86%)" : "translateX(-50%)");
  return (
    <div className={`qad-plan${review ? " rv" : ""}${className ? ` ${className}` : ""}`} data-qad-plan={plan.title}>
      <h5>{plan.title}{plan.title !== "SO FAR" ? <span className="tk">┆ TODAY</span> : null}</h5>
      <div className={`qad-track${L.deep ? " deep" : ""}`} ref={ref}>
        <div className="ln" />
        {L.today !== null ? <div className="tdy" style={{ left: `${L.today}%` }} /> : null}
        {L.points.map((p, k) => {
          const delay = review ? { animationDelay: `calc(var(--qad-t2) + ${k * 90}ms * var(--qad-k))` } : undefined;
          return (
            <React.Fragment key={`${p.l}-${k}`}>
              <div className={`pt ${p.c || ""}`} style={{ left: `${p.x}%`, ...delay }} />
              <div className={`lab ${p.row}`} style={{ left: `${p.x}%`, transform: tf(p.anchor), ...delay }}>
                <b>{p.l}</b><span>{up(p.d)}{p.s ? ` · ${p.s}` : ""}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- the agent card ---------- */

export const initialsOf = (name: string): string =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export function Who({ name, sub, nrmn, extra }: { name: string; sub: string; nrmn?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="qad-who" data-qad-who>
      <span className="qad-av">{initialsOf(name)}</span>
      <span><b>{name}</b><small>{sub}</small></span>
      <span className="qad-tags">
        {nrmn ? <span className="qad-tag dark">NO REPLY MEANS NO</span> : null}
        {extra}
      </span>
    </div>
  );
}

export { addDays, dayDiff, fmt, fmtY, rel, up };
