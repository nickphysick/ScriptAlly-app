/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card editor's inputs (Agent card v1 §5; the mock's "Inputs" table is normative). Every
 * control here offers the app's own list and hands back a VALUE from it — an ISO code, a label from
 * the genre list, a method from the enum — so nothing a writer types into a list is ever stored as
 * typed (decision 3). Prose (the wishlist, notes) and the genuinely open fields (name, city) are
 * the only typed text, plus "Other" materials, capped at 40 as typed.
 *
 * ⚠️ EVERY POPUP IS A LAYER ON THE APP'S ONE ESCAPE STACK (`ESC_LEVEL.cardPopup`), so Escape closes
 * the open list or calendar and nothing else — the editor's draft is never dropped by dismissing a
 * dropdown (§9; the old "+ Other" genre input's stopPropagation could never beat the card's capture
 * listener, so Escape there discarded the whole draft).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { COUNTRIES_ISO, QUICK_PICKS, countryName, flagFor, normaliseCountry } from "../../../lib/territory";
import { formatDate } from "../../../lib/dates";
import { MATERIAL_ROW_NAMES, SAMPLE_UNITS, UNIT_CFG, snapToUnit, stepAmount, type SampleUnit } from "../../../lib/agentMaterials";
import type { CardMats } from "../../../lib/cardDraft";

/* ── the combobox ────────────────────────────────────────────────────────────────────────── */

export type ComboItem =
  | { kind: "group"; label: string }
  | { kind: "opt"; value: string; label: string; meta?: string; hit?: boolean; isNew?: boolean }
  | { kind: "dis"; label: string };

/**
 * A text input over a list. Type to filter, ↑↓ to move, Enter to pick, Tab or a click away to
 * close. The parent builds the items from the query and decides what a pick means.
 */
export const Combo: React.FC<{
  value: string;
  onType: (v: string) => void;
  items: (query: string) => ComboItem[];
  onPick: (item: Extract<ComboItem, { kind: "opt" }>) => void;
  placeholder?: string;
  ae: string;
  inputRef?: React.Ref<HTMLInputElement>;
  /** keys the field handles before the list does (the genre field's Backspace) */
  onKeyDownFirst?: (e: React.KeyboardEvent<HTMLInputElement>) => boolean;
  className?: string;
  inline?: boolean;
}> = ({ value, onType, items, onPick, placeholder, ae, inputRef, onKeyDownFirst, className = "ac-in", inline = false }) => {
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const list = useMemo(() => (open ? items(value) : []), [open, items, value]);
  const picks = list.filter((x): x is Extract<ComboItem, { kind: "opt" }> => x.kind === "opt");
  const active = Math.min(act, Math.max(0, picks.length - 1));

  useEscapeLayer(open, () => setOpen(false), ESC_LEVEL.cardPopup);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open]);

  const pick = (x: Extract<ComboItem, { kind: "opt" }>) => { onPick(x); setAct(0); };
  let pi = -1;
  return (
    <div className={`ae-combo${inline ? " ae-combo--inline" : ""}`} ref={wrapRef}>
      <input
        ref={inputRef}
        className={className}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        data-ae={ae}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => { onType(e.target.value); setOpen(true); setAct(0); }}
        onKeyDown={(e) => {
          if (onKeyDownFirst?.(e)) return;
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
          if (!open) return;
          const n = picks.length;
          if (e.key === "ArrowDown") { e.preventDefault(); setAct((active + 1) % Math.max(1, n)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setAct((active - 1 + n) % Math.max(1, n)); }
          else if (e.key === "Enter") { e.preventDefault(); if (n) pick(picks[active]); }
          else if (e.key === "Tab") setOpen(false);
        }}
      />
      {open && (
        <div className="ae-cb" role="listbox" data-ae={`${ae}-list`} onMouseDown={(e) => e.preventDefault()}>
          {list.length === 0 && <div className="ae-cbe">Nothing matches</div>}
          {list.map((x, i) => {
            if (x.kind === "group") return <div key={`g${i}`} className="ae-cbg">{x.label}</div>;
            if (x.kind === "dis") return <div key={`d${i}`} className="ae-cbo dis">{x.label}</div>;
            pi += 1;
            const me = pi;
            return (
              <div
                key={`o${i}-${x.value}`}
                role="option"
                aria-selected={me === active}
                className={`ae-cbo${me === active ? " act" : ""}${x.hit ? " hit" : ""}${x.isNew ? " new" : ""}`}
                data-pick={me}
                onClick={() => pick(x)}
              >
                {x.label}{x.meta && <small>{x.meta}</small>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── the genre chip field ────────────────────────────────────────────────────────────────── */

/**
 * Chips over a fixed list (§5): the manuscript's genre (ticked), the list's, the writer's own, the
 * app's — type to filter, ↑↓ Enter to pick, Backspace removes the last chip, one-tap suggestions
 * underneath, and a NEW genre only by the deliberate "+ Add “…” as a new genre".
 */
export const GenreField: React.FC<{
  genres: string[];
  onGenres: (next: string[]) => void;
  /** the editor's order, already de-duplicated */
  options: { ms: string | null; pool: string[]; personal: string[]; all: string[] };
  isHit: (g: string) => boolean;
  /** a typed genre matching nothing — the caller registers it (addPersonalGenre) */
  onNew: (typed: string) => Promise<{ ok: true; label: string } | { ok: false; reason: string }>;
  inputRef?: React.Ref<HTMLInputElement>;
}> = ({ genres, onGenres, options, isHit, onNew, inputRef }) => {
  const [q, setQ] = useState("");
  const [refused, setRefused] = useState<string | null>(null);
  const taken = (g: string) => genres.some((x) => x.toLowerCase() === g.toLowerCase());
  const add = (g: string) => { if (!taken(g)) onGenres([...genres, g]); setQ(""); setRefused(null); };
  const known = useMemo(() => {
    const seen = new Set<string>();
    return [...(options.ms ? [options.ms] : []), ...options.pool, ...options.personal, ...options.all]
      .filter((g) => { const k = g.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [options]);
  const items = (raw: string): ComboItem[] => {
    const t = raw.trim().toLowerCase();
    const m = (g: string) => !t || g.toLowerCase().includes(t);
    const out: ComboItem[] = [];
    const group = (label: string, xs: string[]) => {
      const keep = xs.filter((x) => m(x) && !taken(x));
      if (!keep.length) return;
      out.push({ kind: "group", label });
      for (const x of keep) out.push({ kind: "opt", value: x, label: x, hit: isHit(x) });
    };
    const seen = new Set<string>();
    const fresh = (xs: string[]) => xs.filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    group("Your book", fresh(options.ms ? [options.ms] : []));
    group("On your list", fresh(options.pool));
    group("Your genres", fresh(options.personal));
    group("All genres", fresh(options.all));
    const exact = known.find((x) => x.toLowerCase() === t);
    if (t && !exact) out.push({ kind: "opt", value: raw.trim(), label: `+ Add “${raw.trim()}” as a new genre`, isNew: true });
    if (exact && taken(exact)) out.push({ kind: "dis", label: `${exact} is already added` });
    return out;
  };
  const sugg = [...(options.ms ? [options.ms] : []), ...options.pool]
    .filter((g, i, a) => a.findIndex((x) => x.toLowerCase() === g.toLowerCase()) === i && !taken(g)).slice(0, 6);

  return (
    <div className="ae-fl" data-ae="genres">
      <div className="ae-gp" onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus(); }}>
        {genres.map((g) => (
          <span key={g} className={`ae-chip${isHit(g) ? " hit" : ""}`}>
            {g}
            <button type="button" aria-label={`Remove ${g}`} onClick={() => onGenres(genres.filter((x) => x !== g))}>×</button>
          </span>
        ))}
        <Combo
          inline
          className="ae-gpin"
          ae="genre-input"
          inputRef={inputRef}
          value={q}
          onType={(v) => { setQ(v); setRefused(null); }}
          placeholder={genres.length ? "Add another…" : "Type to find a genre"}
          items={items}
          onKeyDownFirst={(e) => {
            if (e.key === "Backspace" && !q && genres.length) { onGenres(genres.slice(0, -1)); return true; }
            return false;
          }}
          onPick={async (x) => {
            if (!x.isNew) { add(x.value); return; }
            const r = await onNew(x.value);
            /* "in", not `r.ok`: with strictNullChecks off a boolean discriminant does not narrow */
            if ("reason" in r) setRefused(r.reason);
            else add(r.label);
          }}
        />
      </div>
      {refused && <span className="ae-vl bad" data-ae="genre-refused">{refused}</span>}
      {sugg.length > 0 && (
        <div className="ae-sug" data-ae="genre-sugg">
          {sugg.map((g) => (
            <button key={g} type="button" onClick={() => add(g)}>+ {g}{options.ms && g.toLowerCase() === options.ms.toLowerCase() ? " · your book" : ""}</button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── steppers and segments ───────────────────────────────────────────────────────────────── */

export const Stepper: React.FC<{
  text: string; dec: boolean; inc: boolean; onStep: (d: 1 | -1) => void; small?: boolean; ae: string;
}> = ({ text, dec, inc, onStep, small, ae }) => (
  <span className={`ae-step${small ? " sm" : ""}`} data-ae={ae}>
    <button type="button" aria-label="Fewer" disabled={!dec} data-d="-1" onClick={() => onStep(-1)}>−</button>
    <b>{text}</b>
    <button type="button" aria-label="More" disabled={!inc} data-d="1" onClick={() => onStep(1)}>+</button>
  </span>
);

export function Seg<T extends string>({ value, options, onPick, small, wrap, ae, label }: {
  value: T | null; options: [T, string][]; onPick: (v: T) => void; small?: boolean; wrap?: boolean; ae: string; label: string;
}) {
  return (
    <span className={`ae-seg${small ? " sm" : ""}${wrap ? " wrp" : ""}`} role="radiogroup" aria-label={label} data-ae={ae}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} data-v={v} className={value === v ? "on" : undefined} onClick={() => onPick(v)}>{l}</button>
      ))}
    </span>
  );
}

/* ── the materials (four rows) ───────────────────────────────────────────────────────────── */

export const MaterialsField: React.FC<{ mats: CardMats; onMats: (m: CardMats) => void; otherRef?: React.Ref<HTMLInputElement> }> = ({ mats, onMats, otherRef }) => {
  const m = mats;
  const cfg = UNIT_CFG[m.smp.unit];
  const row = (k: "ql" | "syn" | "smp" | "oth", on: boolean, label: string, extra: React.ReactNode) => (
    <div className={`ae-mtr${on ? "" : " off"}`} data-mt-row={k}>
      <button
        type="button" className={`ae-bx${on ? " on" : ""}`} aria-pressed={on} aria-label={label} data-mt={k}
        onClick={() => {
          if (k === "ql") onMats({ ...m, ql: !m.ql });
          else onMats({ ...m, [k]: { ...m[k], on: !m[k].on } });
        }}
      />
      <span>{label}</span>
      <span className="ae-mtx">{extra}</span>
    </div>
  );
  return (
    <div className="ae-mt" data-ae="materials">
      {/* the house's UK words for the query letter — the one display map, as on the quick view */}
      {row("ql", m.ql, MATERIAL_ROW_NAMES.queryLetter, null)}
      {row("syn", m.syn.on, "Synopsis",
        <Stepper
          small ae="syn-step"
          text={m.syn.len ? `${m.syn.len} page${m.syn.len > 1 ? "s" : ""}` : "Any length"}
          dec={!!m.syn.len} inc={!m.syn.len || m.syn.len < 10}
          onStep={(d) => {
            const len = m.syn.len ? (m.syn.len + d < 1 ? null : Math.min(10, m.syn.len + d)) : d > 0 ? 1 : null;
            onMats({ ...m, syn: { ...m.syn, len } });
          }}
        />)}
      {row("smp", m.smp.on, "Opening sample",
        <>
          <Seg<SampleUnit>
            small ae="unit" label="Unit"
            value={m.smp.unit}
            options={SAMPLE_UNITS.map((u) => [u, u])}
            /* switching unit SNAPS to that unit's default — never a fake conversion (§5) — through
               the encoder's own `snapToUnit`, so the card and the storage agree on what a default is */
            onPick={(u) => onMats({ ...m, smp: { ...m.smp, unit: u, qty: Number(snapToUnit(u)) } })}
          />
          <Stepper
            small ae="smp-step"
            text={`First ${m.smp.qty.toLocaleString("en-GB")}`}
            dec={m.smp.qty > cfg.min} inc={m.smp.qty < cfg.max}
            /* the shared stepper arithmetic: the unit's own step, floored and capped (`stepAmount`) */
            onStep={(d) => onMats({ ...m, smp: { ...m.smp, qty: Number(stepAmount(String(m.smp.qty), m.smp.unit, d)) } })}
          />
        </>)}
      {row("oth", m.oth.on, "Other",
        <input
          ref={otherRef}
          className="ac-in ae-mto"
          data-ae="other"
          /* ruling 8: the cap is on typing — a longer stored value is kept as it is */
          maxLength={Math.max(40, m.oth.text.length)}
          value={m.oth.text}
          placeholder="e.g. Author photo"
          onChange={(e) => {
            const v = e.target.value;
            onMats({ ...m, oth: { ...m.oth, text: v.length > 40 && v.length > m.oth.text.length ? m.oth.text : v } });
          }}
        />)}
    </div>
  );
};

/* ── the country: six quick picks and "Other…" ───────────────────────────────────────────── */

/**
 * ⚠️ THE RETIRED `AgentCountryPicker`'S CONTRACT, KEPT: it emits a canonical ISO code (through
 * `normaliseCountry`) or "" to clear — never typed text — because the rules validate the stored
 * value with `isKnownCountry`. The search box only FILTERS the list; nothing typed into it is kept.
 */
export const CountryField: React.FC<{ value: string; onPick: (iso: string) => void }> = ({ value, onPick: emit }) => {
  const onPick = (c: string) => emit(c ? normaliseCountry(c) || "" : "");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [act, setAct] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEscapeLayer(open, () => { setOpen(false); setQ(""); }, ESC_LEVEL.cardPopup);
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const down = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open]);
  const quick = QUICK_PICKS;
  const shortName = (c: string) => (c === "GB" ? "UK" : c === "US" ? "US" : countryName(c) ?? c);
  const t = q.trim().toLowerCase();
  const rest = COUNTRIES_ISO.filter((c) => !quick.includes(c.code) && (!t || c.name.toLowerCase().includes(t) || c.code.toLowerCase() === t));
  const btn = (c: string, label: string) => (
    <button key={c} type="button" data-cty={c} aria-pressed={value === c} className={value === c ? "on" : undefined}
      onClick={() => onPick(value === c ? "" : c)}>
      <span className={flagFor(c) ?? ""} aria-hidden="true" />{label}
    </button>
  );
  return (
    <div className="ae-fl" ref={wrapRef}>
      <div className="ae-cy" data-ae="country">
        {quick.map((c) => btn(c, shortName(c)))}
        {value && !quick.includes(value) && btn(value, countryName(value) ?? value)}
        <button type="button" data-cymore aria-expanded={open} onClick={() => setOpen((o) => !o)}>Other…</button>
      </div>
      {open && (
        <div className="ae-cb ae-cb--cty" role="listbox" data-ae="country-list">
          <input
            ref={searchRef} className="ac-in" placeholder="Search countries" aria-label="Search countries" value={q}
            data-ae="country-search" aria-expanded="true"
            onChange={(e) => { setQ(e.target.value); setAct(0); }}
            onKeyDown={(e) => {
              const n = Math.min(60, rest.length);
              if (e.key === "ArrowDown") { e.preventDefault(); setAct((a) => (a + 1) % Math.max(1, n)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => (a - 1 + n) % Math.max(1, n)); }
              /* Enter picks — and never falls through to the editor's Enter-saves */
              else if (e.key === "Enter") { e.preventDefault(); const c = rest[Math.min(act, n - 1)]; if (c) { onPick(c.code); setOpen(false); setQ(""); } }
            }}
          />
          <div className="ae-cbopts">
            {rest.length === 0 && <div className="ae-cbe">Nothing matches</div>}
            {rest.slice(0, 60).map((c, i) => (
              <div key={c.code} role="option" aria-selected={value === c.code} className={`ae-cbo${i === act ? " act" : ""}`} data-cty-opt={c.code}
                onClick={() => { onPick(c.code); setOpen(false); setQ(""); }}>
                <span className={flagFor(c.code) ?? ""} aria-hidden="true" /> {c.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── the reopening date: text with "Change", never a bare date box (decision 12) ─────────── */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayLabel = (s: string, now: Date) => {
  const d = new Date(`${s}T00:00:00`);
  return formatDate(d, d.getFullYear() === now.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
};

export const DateField: React.FC<{
  value: string; onPick: (isoDate: string) => void; nowMs: number; openSignal?: number;
}> = ({ value, onPick, nowMs, openSignal = 0 }) => {
  const today = useMemo(() => { const d = new Date(nowMs); d.setHours(0, 0, 0, 0); return d; }, [nowMs]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => {
    const sel = value ? new Date(`${value}T00:00:00`) : null;
    return sel ? new Date(sel.getFullYear(), sel.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth() + 1, 1);
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  useEscapeLayer(open, () => setOpen(false), ESC_LEVEL.cardPopup);
  useEffect(() => { if (openSignal) setOpen(true); }, [openSignal]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open]);
  const y = month.getFullYear(), mo = month.getMonth();
  const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
  const days = new Date(y, mo + 1, 0).getDate();
  return (
    <div className="ae-fl" ref={wrapRef}>
      <div className="ae-dt" data-ae="reopens">
        {value
          ? <><span data-ae="reopens-date">{dayLabel(value, today)}</span><button type="button" className="ae-lnk" data-cal onClick={() => setOpen((o) => !o)}>Change</button></>
          : <><span className="unk">Not announced</span><button type="button" className="ae-lnk" data-cal onClick={() => setOpen((o) => !o)}>Set a date</button></>}
      </div>
      {open && (
        <div className="ae-cal" data-ae="calendar">
          <div className="ae-calh">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(y, mo - 1, 1))}>‹</button>
            <span>{formatDate(month, { month: "long", year: "numeric" })}</span>
            <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(y, mo + 1, 1))}>›</button>
          </div>
          <div className="ae-calg">
            {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <i key={i}>{x}</i>)}
            {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const dt = new Date(y, mo, i + 1);
              const past = dt < today;
              const k = iso(dt);
              return (
                <button
                  key={k} type="button" data-day={k} disabled={past}
                  className={`${past ? "past" : ""}${value === k ? " on" : ""}${k === iso(today) ? " today" : ""}`.trim() || undefined}
                  onClick={() => { onPick(k); setOpen(false); }}
                >{i + 1}</button>
              );
            })}
          </div>
          <div className="ae-calf">
            <button type="button" className="ac-mini" data-na onClick={() => { onPick(""); setOpen(false); }}>Not announced yet</button>
            <button type="button" className="ac-mini" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};
