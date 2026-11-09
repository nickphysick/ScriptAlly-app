/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add agent v1 Phase 1 (design-refs/add-agent-v1/add-agent-v1.html, scheme B; agent-card-edit-v1.html) — THE SHARED
 * CONTROLS, one implementation each, read by the add journey (`AddAgentJourney`) and by editing on the card
 * (`AgentCard262Edit`). Every choice is a pill: white with a hairline at rest, navy when chosen. No grey wells, no
 * checkbox squares, no boxes inside boxes. Labels sit ABOVE their controls in serif 600 15px (`AaField`).
 *
 *   Pill / PillRow           the one pill, and a wrapping row of them
 *   DoorPills                Open / Closed; Closed becomes "Closed · reopens [date] ×" over the app's `DateField`
 *   MethodPills              Email · Online form · QueryManager · Post · + Other (a typing pill, 40 characters)
 *   MaterialPills            Covering letter · Synopsis · Opening sample · Other — soft paper pills, not navy
 *   CountryPills             UK · Ireland · US · Elsewhere, each with its flag; Elsewhere opens `CountryCombobox`
 *   SocialField              one field: a pasted link is recognised by host, a bare @handle asks which platform
 *   GenreChips               chips, an in-flow list (never a clipped pop-up), suggestions with your book first
 *   WishlistArea             italic serif, 400 characters, the count shown past 300
 *   FitStars + InfoTip       Agent fit: five stars, a word for each, and the "i" drawn outside every clipper
 *   ResponseTime             the app's `WeekSlider` (navy), with the nudge line under it
 *
 * ⚠️ NOTHING HERE OWNS STATE BEYOND WHAT IS BEING TYPED. Values come in and go out; the draft is the caller's
 *    (`useAgentForm`), so the add journey and the card cannot disagree about what a control means.
 * ⚠️ NO GREEN AND NO BURGUNDY: navy #2a3a52, sand #d6bf9c / #9c7a4c, blush, powder, rust #a2452a for problems only.
 */
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SubmissionMethod } from "../../../types";
import { UNIT_CFG, type SampleUnit } from "../../../lib/agentMaterials";
import { floorCopy } from "../../../lib/createQty";
import { CREATE_QTY } from "../../../lib/createQty";
import { SOCIAL_PLATFORMS } from "../../../lib/agentOptions";
import { flagFor } from "../../../lib/territory";
import type { CardMats } from "../../../lib/cardDraft";
import { useFixedMenu } from "../../forms/useFixedMenu";
import { WeekSlider } from "../../forms/WeekSlider";
import { CountryCombobox } from "../../forms/CountryCombobox";
import { DateField } from "./cardInputs";
import "./agentPills.css";

/* ── the words ─────────────────────────────────────────────────────────────────────────────────── */

/** Agent fit's own words, star by star (the writer's choice, never a verdict of ours) */
export const FIT_WORDS = ["", "Poor fit", "Worth a try", "Good fit", "Great fit", "Dream agent"] as const;
export const fitWord = (n: number | null | undefined): string => (n && n >= 1 && n <= 5 ? FIT_WORDS[n] : "Not rated yet");
export const FIT_TIP_TITLE = "Agent fit";
/** the toast a star's save says: "Agent fit: great fit" */
export const fitToast = (n: number | null | undefined): string => (n ? `Agent fit: ${FIT_WORDS[n].toLowerCase()}` : "Agent fit cleared");

/** The method pills, in the order the writer reads them */
export const METHOD_PILLS: [SubmissionMethod, string][] = [
  [SubmissionMethod.EMAIL, "Email"], [SubmissionMethod.ONLINE_FORM, "Online form"],
  [SubmissionMethod.QUERY_MANAGER, "QueryManager"], [SubmissionMethod.POST, "Post"],
];
export const OTHER_MAX = 40;
export const SYN_MAX = 20;

/** the label over the submission link, by method — null: the field does not appear */
export function formLinkLabel(m: SubmissionMethod | null): string | null {
  if (m === SubmissionMethod.ONLINE_FORM) return "Submission form";
  if (m === SubmissionMethod.QUERY_MANAGER) return "QueryManager";
  if (m === SubmissionMethod.OTHER) return "Link, if there is one";
  return null;
}
export const formLinkPlaceholder = (m: SubmissionMethod | null): string =>
  m === SubmissionMethod.QUERY_MANAGER ? "querymanager.com/…" : m === SubmissionMethod.OTHER ? "Where you send it" : "Link to the agency’s form";

/** "We'll suggest a nudge once n weeks have passed." */
export const weeksHint = (w: number | null): string =>
  w ? `We’ll suggest a nudge once ${w} week${w === 1 ? "" : "s"} have passed.` : "This sets when we suggest a nudge. Leave it as Unknown if you’re not sure.";

/** The social a typed value names: by host for a link, else null (a bare handle asks) */
const SOCIAL_HOSTS: [string, string][] = [["x.com", "X / Twitter"], ["twitter.com", "X / Twitter"], ["bsky", "Bluesky"], ["instagram.com", "Instagram"], ["tiktok.com", "TikTok"], ["querytracker", "QueryTracker"]];
export function socialFromHost(v: string): string | null {
  const t = v.trim().toLowerCase();
  if (!t) return null;
  return SOCIAL_HOSTS.find(([h]) => t.includes(h))?.[1] ?? null;
}

/** the floor a sample amount must reach — the create sheet's own (`CREATE_QTY`) */
export const sampleFloor = (u: SampleUnit): number => CREATE_QTY[u].min;
export const sampleBad = (m: CardMats): boolean => m.smp.on && (!m.smp.qty || m.smp.qty < sampleFloor(m.smp.unit));

/* ── the field: a label above its control ─────────────────────────────────────────────────────── */

export const AaField: React.FC<{ label?: React.ReactNode; small?: string; k: string; info?: React.ReactNode; children: React.ReactNode }> = ({ label, small, k, info, children }) => (
  <div className="aap-f" data-aap="field" data-f={k}>
    {label ? <span className="aap-l">{label}{small ? <small>{small}</small> : null}{info}</span> : null}
    <div className="aap-c">{children}</div>
  </div>
);

/* ── the pill ─────────────────────────────────────────────────────────────────────────────────── */

export const Pill: React.FC<{
  on: boolean; onClick: () => void; children: React.ReactNode; role?: "radio" | "button"; data?: Record<string, string | undefined>; label?: string;
}> = ({ on, onClick, children, role = "radio", data, label }) => (
  <button type="button" role={role} {...(role === "radio" ? { "aria-checked": on } : { "aria-pressed": on })}
    className={`aap-pill${on ? " on" : ""}`} aria-label={label} onClick={onClick} {...data}>{children}</button>
);
export const PillRow: React.FC<{ label?: string; children: React.ReactNode; data?: Record<string, string> }> = ({ label, children, data }) => (
  <div className="aap-pills" role={label ? "radiogroup" : undefined} aria-label={label} {...data}>{children}</div>
);

/* ── taking queries ───────────────────────────────────────────────────────────────────────────── */

export const DoorPills: React.FC<{
  door: "open" | "closed" | null; reopens: string; nowMs: number; first: string;
  onChange: (door: "open" | "closed" | null, reopens: string) => void;
}> = ({ door, reopens, nowMs, first, onChange }) => {
  const [cal, setCal] = useState(0);
  return (
    <PillRow label={`Is ${first} taking queries`} data={{ "data-aap": "door" }}>
      <Pill on={door === "open"} data={{ "data-door": "open" }} onClick={() => onChange(door === "open" ? null : "open", "")}>Open</Pill>
      {door === "closed" ? (
        <span className="aap-pill on amt" data-aap="door-closed" data-door-box="">
          Closed · reopens <DateField value={reopens} nowMs={nowMs} openSignal={cal} onPick={(v) => onChange("closed", v)} />
          <button type="button" className="aap-x" data-door="closed" aria-label="Clear closed" onClick={() => onChange(null, "")}>×</button>
        </span>
      ) : (
        <Pill on={false} data={{ "data-door": "closed" }} onClick={() => { onChange("closed", reopens); window.setTimeout(() => setCal((n) => n + 1), 40); }}>Closed</Pill>
      )}
    </PillRow>
  );
};

/* ── how they take them ───────────────────────────────────────────────────────────────────────── */

export const MethodPills: React.FC<{
  method: SubmissionMethod | null; other: string; onChange: (m: SubmissionMethod | null, other: string) => void;
}> = ({ method, other, onChange }) => {
  const otherRef = useRef<HTMLInputElement>(null);
  const was = useRef(method);
  useEffect(() => { if (method === SubmissionMethod.OTHER && was.current !== method) otherRef.current?.focus({ preventScroll: true }); was.current = method; }, [method]);
  return (
    <PillRow label="How they take queries" data={{ "data-aap": "method" }}>
      {METHOD_PILLS.map(([v, l]) => (
        <Pill key={v} on={method === v} data={{ "data-method": v }} onClick={() => onChange(method === v ? null : v, other)}>{l}</Pill>
      ))}
      {method === SubmissionMethod.OTHER ? (
        <span className="aap-pill on amt" data-aap="method-other">
          Other:<input ref={otherRef} className="aap-pin" data-aap="method-other-input" maxLength={OTHER_MAX} value={other} placeholder="e.g. Agency portal"
            aria-label="Other way they take queries" onChange={(e) => onChange(SubmissionMethod.OTHER, e.target.value.slice(0, OTHER_MAX))} />
          <button type="button" className="aap-x" data-method="Other" aria-label="Clear other" onClick={() => onChange(null, other)}>×</button>
        </span>
      ) : (
        <Pill on={false} data={{ "data-method": SubmissionMethod.OTHER }} onClick={() => onChange(SubmissionMethod.OTHER, other)}><span className="aap-plus">+</span>Other</Pill>
      )}
    </PillRow>
  );
};

/* ── what to send: the soft material pills ────────────────────────────────────────────────────── */

const digits = (v: string) => v.replace(/[^0-9]/g, "").slice(0, 6);
const AmountBox: React.FC<{ value: number | null; placeholder?: string; label: string; onType: (n: number | null) => void; data: string }> = ({ value, placeholder, label, onType, data }) => (
  <input className="aap-qn" data-aap={data} inputMode="numeric" value={value ? String(value) : ""} placeholder={placeholder} aria-label={label}
    onFocus={(e) => e.currentTarget.select()}
    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); e.currentTarget.blur(); } }}
    onChange={(e) => { const d = digits(e.target.value); onType(d ? parseInt(d, 10) : null); }} />
);

export const MaterialPills: React.FC<{ mats: CardMats; onMats: (m: CardMats) => void }> = ({ mats: m, onMats }) => {
  const u = UNIT_CFG[m.smp.unit];
  const floor = sampleFloor(m.smp.unit);
  const bad = sampleBad(m);
  const othRef = useRef<HTMLInputElement>(null);
  const wasOth = useRef(m.oth.on);
  useEffect(() => { if (m.oth.on && !wasOth.current) othRef.current?.focus({ preventScroll: true }); wasOth.current = m.oth.on; }, [m.oth.on]);
  const ck = <span className="aap-ck" aria-hidden="true">✓</span>;
  const plus = <span className="aap-plus" aria-hidden="true">+</span>;
  return (
    <>
      <div className="aap-pills aap-mats" data-mats="" data-aap="mats">
        <Pill role="button" on={m.ql} data={{ "data-mat": "ql" }} onClick={() => onMats({ ...m, ql: !m.ql })}>{m.ql ? ck : plus}Covering letter</Pill>
        {m.syn.on ? (
          <span className="aap-pill on amt" data-aap="mat-syn">
            {ck}Synopsis
            <button type="button" className="aap-mb" data-syn="-1" disabled={!m.syn.len} aria-label="Shorter"
              onClick={() => onMats({ ...m, syn: { on: true, len: m.syn.len && m.syn.len > 1 ? m.syn.len - 1 : null } })}>−</button>
            <AmountBox value={m.syn.len} placeholder="any" label="Synopsis length in pages" data="syn-qty"
              onType={(n) => onMats({ ...m, syn: { on: true, len: n ? Math.min(SYN_MAX, n) : null } })} />
            <button type="button" className="aap-mb" data-syn="1" disabled={(m.syn.len ?? 0) >= SYN_MAX} aria-label="Longer"
              onClick={() => onMats({ ...m, syn: { on: true, len: Math.min(SYN_MAX, (m.syn.len ?? 0) + 1) } })}>+</button>
            {m.syn.len ? (m.syn.len === 1 ? "page" : "pages") : "length"}
            <button type="button" className="aap-x" data-mat="syn" aria-label="Remove synopsis" onClick={() => onMats({ ...m, syn: { on: false, len: m.syn.len } })}>×</button>
          </span>
        ) : <Pill role="button" on={false} data={{ "data-mat": "syn" }} onClick={() => onMats({ ...m, syn: { ...m.syn, on: true } })}>{plus}Synopsis</Pill>}
        {m.smp.on ? (
          <span className={`aap-pill on amt wide${bad ? " bad" : ""}`} data-aap="mat-smp" data-bad={bad ? "" : undefined}>
            {ck}Opening sample<span className="aap-gap" />
            <button type="button" className="aap-x" data-mat="smp" aria-label="Remove opening sample" onClick={() => onMats({ ...m, smp: { ...m.smp, on: false } })}>×</button>
            <span className="aap-br" />First
            <button type="button" className="aap-mb" data-qty="-1" disabled={!!m.smp.qty && m.smp.qty <= floor} aria-label="Fewer"
              onClick={() => onMats({ ...m, smp: { ...m.smp, qty: Math.max(floor, Math.min(u.max, (m.smp.qty || u.def) - u.step)) } })}>−</button>
            <AmountBox value={m.smp.qty || null} label="How many" data="smp-qty" onType={(n) => onMats({ ...m, smp: { ...m.smp, qty: n ? Math.min(u.max, n) : 0 } })} />
            <button type="button" className="aap-mb" data-qty="1" disabled={m.smp.qty >= u.max} aria-label="More"
              onClick={() => onMats({ ...m, smp: { ...m.smp, qty: Math.min(u.max, Math.max(floor, (m.smp.qty || u.def - u.step) + u.step)) } })}>+</button>
            <span className="aap-useg" role="radiogroup" aria-label="Unit" data-aap="unit">
              {(["Chapters", "Pages", "Words"] as SampleUnit[]).map((x) => (
                <button key={x} type="button" role="radio" aria-checked={m.smp.unit === x} className={m.smp.unit === x ? "on" : undefined} data-unit={x}
                  onClick={() => { if (m.smp.unit !== x) onMats({ ...m, smp: { ...m.smp, unit: x, qty: UNIT_CFG[x].def } }); }}>{x.toLowerCase()}</button>
              ))}
            </span>
          </span>
        ) : <Pill role="button" on={false} data={{ "data-mat": "smp" }} onClick={() => onMats({ ...m, smp: { ...m.smp, on: true, qty: m.smp.qty || UNIT_CFG[m.smp.unit].def } })}>{plus}Opening sample</Pill>}
        {m.oth.on ? (
          <span className="aap-pill on amt" data-aap="mat-oth">
            {ck}<input ref={othRef} className="aap-pin" data-aap="mat-oth-input" maxLength={Math.max(OTHER_MAX, m.oth.text.length)} value={m.oth.text} placeholder="e.g. Author photo" aria-label="Other"
              onChange={(e) => { const v = e.target.value; onMats({ ...m, oth: { on: true, text: v.length > OTHER_MAX && v.length > m.oth.text.length ? m.oth.text : v } }); }} />
            <button type="button" className="aap-x" data-mat="oth" aria-label="Remove other" onClick={() => onMats({ ...m, oth: { on: false, text: m.oth.text } })}>×</button>
          </span>
        ) : <Pill role="button" on={false} data={{ "data-mat": "oth" }} onClick={() => onMats({ ...m, oth: { ...m.oth, on: true } })}>{plus}Other</Pill>}
      </div>
      {bad ? <span className="aap-hint bad" data-aap="floor">{floorCopy(m.smp.unit)} for the opening sample.</span> : null}
    </>
  );
};

/* ── based in ─────────────────────────────────────────────────────────────────────────────────── */

const NEAR: [string, string][] = [["GB", "UK"], ["IE", "Ireland"], ["US", "US"]];
const GLOBE = <svg className="aap-glb" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>;

export const CountryPills: React.FC<{ country: string; onCountry: (iso: string) => void }> = ({ country, onCountry }) => {
  const near = NEAR.some(([c]) => c === country);
  /* Elsewhere is chosen when the country is not one of the three — an empty one included, once the writer has said so */
  const [elsewhere, setElsewhere] = useState(!near && !!country);
  useEffect(() => { if (near) setElsewhere(false); else if (country) setElsewhere(true); }, [near, country]);
  return (
    <>
      <PillRow label="Country" data={{ "data-aap": "country" }}>
        {NEAR.map(([c, l]) => (
          <Pill key={c} on={country === c} data={{ "data-country": c }} onClick={() => { setElsewhere(false); onCountry(country === c ? "" : c); }}>
            <span className={flagFor(c) ?? ""} aria-hidden="true" />{l}
          </Pill>
        ))}
        <Pill on={elsewhere} data={{ "data-country": "elsewhere" }} onClick={() => { if (elsewhere) { setElsewhere(false); if (!near) onCountry(""); } else { setElsewhere(true); if (near) onCountry(""); } }}>
          {!near && country && flagFor(country) ? <span className={flagFor(country)!} aria-hidden="true" /> : GLOBE}Elsewhere
        </Pill>
      </PillRow>
      {elsewhere ? (
        <div className="aap-cty" data-aap="country-more">
          <CountryCombobox value={near ? "" : country} onChange={(c) => onCountry(c)} placeholder="Type a country" />
        </div>
      ) : null}
    </>
  );
};

/* ── social ───────────────────────────────────────────────────────────────────────────────────── */

export const SocialField: React.FC<{
  social: { platform: string; handle: string }; onSocial: (s: { platform: string; handle: string }) => void;
}> = ({ social, onSocial }) => {
  const v = social.handle;
  const byHost = socialFromHost(v);
  const handleOnly = !!v.trim() && !byHost;
  return (
    <>
      <input className="aap-inp" data-aap="social" value={v} placeholder="Paste a profile link, or type an @handle" autoComplete="off" aria-label="Social"
        onChange={(e) => { const t = e.target.value; const h = socialFromHost(t); onSocial({ platform: h ?? (t.trim() ? (socialFromHost(v) ? "" : social.platform) : ""), handle: t }); }} />
      {byHost ? <span className="aap-note ok" data-aap="social-ok">✓ {byHost}</span> : null}
      {handleOnly ? (
        <>
          <span className="aap-note" data-aap="social-ask">Which one is it on?</span>
          <PillRow label="Platform" data={{ "data-aap": "platforms" }}>
            {SOCIAL_PLATFORMS.filter((p) => p !== "QueryTracker").map((p) => (
              <Pill key={p} on={social.platform === p} data={{ "data-plat": p }} onClick={() => onSocial({ platform: p, handle: v })}>{p}</Pill>
            ))}
          </PillRow>
        </>
      ) : null}
    </>
  );
};

/* ── genres: chips, an in-flow list, suggestions ──────────────────────────────────────────────── */

export const GenreChips: React.FC<{
  genres: string[]; onGenres: (g: string[]) => void;
  options: { ms: string | null; pool: string[]; personal: string[]; all: readonly string[] };
  onNew: (typed: string) => Promise<{ ok: true; label: string } | { ok: false; reason: string }>;
  inputRef?: React.Ref<HTMLInputElement>;
}> = ({ genres, onGenres, options, onNew, inputRef }) => {
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const taken = (g: string) => genres.some((x) => x.toLowerCase() === g.toLowerCase());
  const known = useMemo(() => {
    const seen = new Set<string>();
    return [...(options.ms ? [options.ms] : []), ...options.pool, ...options.personal, ...options.all]
      .filter((g) => { const k = g.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  }, [options]);
  const t = q.trim().toLowerCase();
  const items = useMemo(() => {
    if (!t) return [] as { v: string; l: string; s?: string; isNew?: boolean }[];
    const list = known.filter((g) => !taken(g) && g.toLowerCase().includes(t)).slice(0, 12)
      .map((g) => ({ v: g, l: g, s: options.ms && g.toLowerCase() === options.ms.toLowerCase() ? "your book" : undefined }));
    const exact = known.some((g) => g.toLowerCase() === t);
    return exact ? list : [...list, { v: q.trim(), l: `Add “${q.trim()}” as a new genre`, isNew: true }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, known, genres]);
  const sugs = [...(options.ms ? [options.ms] : []), ...options.pool].filter((g, i, a) => a.findIndex((x) => x.toLowerCase() === g.toLowerCase()) === i && !taken(g)).slice(0, 4);
  const add = async (it: { v: string; isNew?: boolean }) => {
    let label = it.v;
    if (it.isNew) {
      const r = await onNew(it.v);
      if ("reason" in r) { setRefused(r.reason); return; }
      label = r.label;
    }
    if (!taken(label)) onGenres([...genres, label]);
    setQ(""); setHi(0); setRefused(null);
  };
  return (
    <>
      <div className="aap-gp" data-aap="genres" onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus(); }}>
        {genres.map((g) => (
          <span key={g} className="aap-chip" data-aap="genre-chip" data-g={g}>{g}
            <button type="button" aria-label={`Remove ${g}`} onClick={() => onGenres(genres.filter((x) => x !== g))}>×</button></span>
        ))}
        <input ref={inputRef} data-aap="genre-input" value={q} placeholder={genres.length ? "Add another" : "Type to find a genre"} autoComplete="off"
          aria-expanded={items.length > 0}
          onChange={(e) => { setQ(e.target.value); setHi(0); setRefused(null); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && items.length) { e.preventDefault(); setHi((h) => Math.min(h + 1, items.length - 1)); }
            else if (e.key === "ArrowUp" && items.length) { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (items.length) void add(items[Math.min(hi, items.length - 1)]); }
            else if (e.key === "Escape" && q) { e.preventDefault(); e.stopPropagation(); setQ(""); }
            else if (e.key === "Backspace" && !q && genres.length) onGenres(genres.slice(0, -1));
          }} />
      </div>
      {items.length ? (
        <div className="aap-glist" role="listbox" data-aap="genre-list">
          {items.map((it, i) => (
            <button key={`${it.v}-${i}`} type="button" role="option" aria-selected={i === hi} className={i === hi ? "hi" : undefined} data-addg={it.v}
              onMouseDown={(e) => { e.preventDefault(); void add(it); }}>{it.l}{it.s ? <small>{it.s}</small> : null}</button>
          ))}
        </div>
      ) : null}
      {!t && sugs.length ? (
        <div className="aap-sug" data-aap="genre-sugg">
          {sugs.map((g) => (
            <button key={g} type="button" data-addg={g} onClick={() => void add({ v: g })}>+ {g}{options.ms && g.toLowerCase() === options.ms.toLowerCase() ? <em> · your book</em> : null}</button>
          ))}
        </div>
      ) : null}
      {refused ? <span className="aap-hint bad" data-aap="genre-refused">{refused}</span> : null}
    </>
  );
};

/* ── wishlist ─────────────────────────────────────────────────────────────────────────────────── */

export const WishlistArea: React.FC<{ value: string; onValue: (v: string) => void; inputRef?: React.Ref<HTMLTextAreaElement> }> = ({ value, onValue, inputRef }) => (
  <>
    <textarea ref={inputRef} className="aap-inp aap-ta" data-aap="wishlist" value={value} maxLength={Math.max(400, value.length)}
      placeholder="In their words: paste from their MSWL or agency page" aria-label="Wishlist"
      onChange={(e) => { const v = e.target.value; onValue(v.length > 400 && v.length > value.length ? value : v); }} />
    {value.length > 300 ? <span className="aap-note" data-aap="wish-count">{value.length} / 400</span> : null}
  </>
);

/* ── response time: the app's WeekSlider ──────────────────────────────────────────────────────── */

export const ResponseTime: React.FC<{ weeks: number | null; onWeeks: (w: number | null) => void }> = ({ weeks, onWeeks }) => (
  <div className="aap-wk" data-aap="weeks">
    <WeekSlider value={weeks} onChange={(w) => onWeeks(w)} onUnknown={() => onWeeks(null)} label="Response time" hideLabel />
    <span className="aap-hint" data-aap="weeks-hint">{weeksHint(weeks)}</span>
  </div>
);

/* ── the reply policy ─────────────────────────────────────────────────────────────────────────── */

export const PolicyPills: React.FC<{ nrn: boolean | null; onNrn: (v: boolean | null) => void }> = ({ nrn, onNrn }) => (
  <PillRow label="If they don’t reply" data={{ "data-aap": "nrn" }}>
    <Pill on={nrn === false} data={{ "data-nrn": "no" }} onClick={() => onNrn(nrn === false ? null : false)}>They always reply</Pill>
    <Pill on={nrn === true} data={{ "data-nrn": "yes" }} onClick={() => onNrn(nrn === true ? null : true)}>No response means no</Pill>
  </PillRow>
);

/* ── Agent fit: the "i", drawn outside every clipper ─────────────────────────────────────────── */

export const FIT_TIP: React.ReactNode = (
  <><b>Agent fit</b>QueryHawk is about finding the <i>right</i> agent, not just any agent. Rate how well they fit you and your book, and your Contact list and query suggestions put your best fits first.</>
);

/**
 * The little "i". ⚠️ THE TIP IS PORTALLED TO `document.body` AND PLACED BY THE APP'S `useFixedMenu` (as
 *    `QueryLogSheet`'s pop-ups are), so no card, panel or scroller can clip it: below the "i", or above it where there
 *    is no room, and clamped inside the window. Escape or any scroll hides it.
 */
export const InfoTip: React.FC<{ label?: string; tone?: "ink" | "light"; children: React.ReactNode }> = ({ label = "About agent fit", tone = "ink", children }) => {
  const [open, setOpen] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const { triggerRef, menuStyle } = useFixedMenu<HTMLSpanElement>(open, { placement: "auto", menuRef: tipRef, align: "auto" });
  /* the measured box, clamped inside the window (12px), once the tip has laid out */
  const [clamp, setClamp] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    if (!open) { setClamp({}); return; }
    const el = tipRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const m = 12;
    const next: React.CSSProperties = {};
    if (r.right > window.innerWidth - m) { next.left = Math.max(m, window.innerWidth - m - r.width); next.right = "auto"; }
    if (r.left < m) { next.left = m; next.right = "auto"; }
    if (r.top < m) { next.top = m; next.bottom = "auto"; }
    if (r.bottom > window.innerHeight - m) { next.top = Math.max(m, window.innerHeight - m - r.height); next.bottom = "auto"; }
    if (Object.keys(next).length) setClamp(next);
  }, [open, menuStyle]);
  useEffect(() => {
    if (!open) return undefined;
    const hide = () => setOpen(false);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    window.addEventListener("scroll", hide, true);
    window.addEventListener("keydown", key, true);
    return () => { window.removeEventListener("scroll", hide, true); window.removeEventListener("keydown", key, true); };
  }, [open]);
  return (
    <>
      <span ref={triggerRef} className={`aap-info${tone === "light" ? " light" : ""}`} tabIndex={0} role="button" aria-label={label} data-aap="info"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>i</span>
      {open ? createPortal(
        <div ref={tipRef} id={id} role="tooltip" className="aap-tip" data-aap="tip" style={{ ...menuStyle, minWidth: undefined, ...clamp }}>{children}</div>,
        document.body,
      ) : null}
    </>
  );
};

/**
 * Five stars, each with its own words: navy when on, a lighter navy previewing on hover; the chosen star pressed again
 * clears it. `variant="band"` is the card band's (cream on slate), `"field"` the form's.
 */
export const FitStars: React.FC<{
  value: number | null; onPick: (n: number | null) => void; variant?: "field" | "band"; words?: boolean;
}> = ({ value, onPick, variant = "field", words = true }) => {
  const [pv, setPv] = useState(0);
  const v = value ?? 0;
  const word = pv ? FIT_WORDS[pv] : v ? FIT_WORDS[v] : "Not rated yet";
  return (
    <span className={`aap-fit aap-fit--${variant}${pv ? " pv" : ""}`} data-aap="fit" data-value={v || undefined} onMouseLeave={() => setPv(0)}>
      {variant === "band" && words ? <small className="aap-fitw" data-aap="fit-word">{pv ? FIT_WORDS[pv] : v ? FIT_WORDS[v] : "Agent fit"}</small> : null}
      <span className="aap-stars" role="radiogroup" aria-label="Agent fit">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={v === n} aria-label={`${n} of 5 · ${FIT_WORDS[n]}`} data-star={n}
            className={`${!pv && n <= v ? "on" : ""}${pv && n <= pv ? " pv" : ""}`.trim() || undefined}
            onMouseEnter={() => setPv(n)} onFocus={() => setPv(n)} onBlur={() => setPv(0)}
            onClick={() => { setPv(0); onPick(v === n ? null : n); }}>★</button>
        ))}
      </span>
      {variant === "field" && words ? <span className="aap-fitw" data-aap="fit-word">{word}</span> : null}
    </span>
  );
};
