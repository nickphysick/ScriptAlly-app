/* MOCK ONLY (Query Centre v172 review build) — the Queries list's smart filter panel, built from the Contact list's
   v4.18 panel (navy head, quick picks, include pills, stars, pills + search, two-handle ranges, Any/Yes/No rows). */
import React, { useMemo, useState } from "react";
import type { QcRow } from "../../../lib/qcSummary";
import { EMPTY172, stageOn172, stageText172, resetPart172, dueText172, REPLY172, SENDBY172, dueDays172, dueOn172, sideOf172, method172, pass172, setSmart172, smartOn172, stageIdx172, useSmart172, whoOf172, type Ctx172, type Smart172 } from "../../../smart172";
import { METHOD_ICON } from "./QcRow170";
import { useMock169 } from "../../../mock169";
import "./qcv172.css";

const DAY = 86400000;
const WEEK = 7 * DAY;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const flag = (cc: string) => (cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : "🏳");
const COUNTRY: Record<string, string> = { GB: "United Kingdom", US: "United States", IE: "Ireland", AU: "Australia", CA: "Canada", DE: "Germany", NZ: "New Zealand" };
const METHODS: { k: string; label: string }[] = [
  { k: "email", label: "Email" }, { k: "query manager", label: "QueryManager" }, { k: "online form", label: "Online form" }, { k: "post", label: "Post" },
];
const STAGES = [
  { k: 0, label: "Queried", svg: <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /> },
  { k: 1, label: "Partial", svg: <><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10 3.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" /></> },
  { k: 2, label: "Full", svg: <><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="10" cy="10" r="3.6" fill="currentColor" /></> },
  { k: 3, label: "Offer", svg: <path d="M10 2.5l1.9 4.6 4.9.4-3.7 3.2 1.1 4.8L10 13l-4.2 2.5 1.1-4.8-3.7-3.2 4.9-.4z" fill="currentColor" /> },
];

export interface QcSmart172Props { rows: readonly QcRow[]; ctx: Ctx172; showing: number; total: number; onReset: () => void }

export const QcSmart172: React.FC<QcSmart172Props> = ({ rows, ctx, showing, total, onReset }) => {
  const s = useSmart172();
  const [find, setFind] = useState("");
  const mk = useMock169();
  const [moreOpen, setMoreOpen] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [views, setViews] = useState<View172[]>(readViews172);
  const [locOpen, setLocOpen] = useState(false);
  const on = smartOn172(s);
  const n = (skip: keyof Smart172, extra: (r: QcRow) => boolean) => rows.filter((r) => pass172(r, s, ctx, skip) && extra(r)).length;

  /* the sent range: whole weeks from the first send to this week */
  const weeks = useMemo(() => {
    const ms = rows.map((r) => r.sentMs).filter((x): x is number => x != null);
    if (!ms.length) return [] as number[];
    const end = ctx.nowMs, start = Math.min(...ms);
    const out: number[] = [];
    for (let t = end - Math.ceil((end - start) / WEEK) * WEEK; t <= end; t += WEEK) out.push(t);
    return out;
  }, [rows, ctx.nowMs]);
  const W = weeks.length - 1;
  const lo = s.sent ? Math.max(0, weeks.findIndex((t) => t >= s.sent![0])) : 0;
  const hi = s.sent ? Math.max(lo, weeks.findIndex((t) => t + WEEK > s.sent![1])) : W;
  const sentBase = rows.filter((r) => pass172(r, s, ctx, "sent"));
  const hist = weeks.map((t) => sentBase.filter((r) => r.sentMs != null && r.sentMs >= t && r.sentMs < t + WEEK).length);
  const hmax = Math.max(1, ...hist);
  const setSent = (a: number, b: number) => setSmart172({ sent: a <= 0 && b >= W ? null : [weeks[a], weeks[b] + WEEK - 1] });
  const wkLabel = (i: number) => { const d = new Date(weeks[i]); return `${d.getDate()} ${MON[d.getMonth()]}`; };
  const months = (() => {
    const all = weeks.map((t, i) => ({ i, d: new Date(t) })).filter((x, i, a) => i > 0 && x.d.getMonth() !== a[i - 1].d.getMonth());
    const out: typeof all = []; const gap = Math.max(1, W * 0.13);
    for (const m of all) if (!out.length || m.i - out[out.length - 1].i >= gap) out.push(m);
    return out;
  })();


  /* what you sent: packages by count */
  const pkgs = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) { const k = ctx.pkg(r); m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => (a[0] === "Nothing recorded" ? 1 : b[0] === "Nothing recorded" ? -1 : b[1] - a[1])).map(([k]) => k);
  }, [rows, ctx]);
  const quick = pkgs.filter((k) => k !== "Nothing recorded").slice(0, 3);
  const sugs = find.trim() ? pkgs.filter((k) => k.toLowerCase().includes(find.trim().toLowerCase())) : [];
  const togglePkg = (k: string) => setSmart172({ pkgs: s.pkgs.includes(k) ? s.pkgs.filter((x) => x !== k) : [...s.pkgs, k] });

  const countries = useMemo(() => [...new Set(rows.map((r) => ctx.country(r)).filter(Boolean))].sort((a, b) => (COUNTRY[a] ?? a).localeCompare(COUNTRY[b] ?? b)), [rows, ctx]);

  const reset = () => { setSmart172(EMPTY172); setFind(""); onReset(); };
  const closedN = n("closed", (r) => whoOf172(r, ctx.nowMs) === "closed");

  return (
    <aside className="qs172" data-qc172="panel" aria-label="Filter your queries">
      <header className="qs172-h"><b>Filter</b><small>{on ? `${showing} of ${total}` : `All ${total}`}</small>{on ? <button type="button" onClick={reset}>Clear all</button> : null}</header>

      {mk.views === "on" ? (
        <div className="qs172-views">
          {views.map((v) => {
            const cur = JSON.stringify(v.s) === JSON.stringify(s);
            return <button key={v.name} type="button" className={`qs172-chip${cur ? " on" : ""}`} onClick={() => setSmart172(cur ? EMPTY172 : v.s)}>{v.name}</button>;
          })}
          {naming != null ? (
            <form className="qs172-name" onSubmit={(e) => { e.preventDefault(); const nm = naming.trim(); if (!nm) return; const next = [...views.filter((v) => v.name !== nm), { name: nm, s }]; setViews(next); writeViews172(next); setNaming(null); }}>
              <input autoFocus value={naming} onChange={(e) => setNaming(e.target.value)} placeholder="Name this view" />
              <button type="submit">Save</button>
            </form>
          ) : on ? <button type="button" className="qs172-save" onClick={() => setNaming("")}>+ Save this view</button> : null}
        </div>
      ) : null}

      <div className="qs172-q">
        <div className="qs172-seg" role="group" aria-label="Where it stands">
          {([["you", "With you"], ["chase", "Needs chasing"], ["wait", "Waiting"]] as const).map(([k, label]) => {
            const c = n("who", (r) => whoOf172(r, ctx.nowMs) === k);
            return <button key={k} type="button" className={s.who === k ? "on" : ""} disabled={!c && s.who !== k} onClick={() => setSmart172({ who: s.who === k ? null : k })}><b>{c}</b><span>{label}</span></button>;
          })}
        </div>
        <div className="qs172-incs">
          <button type="button" className={`qs172-inc${s.closed ? " on" : ""}`} aria-pressed={s.closed} onClick={() => setSmart172({ closed: !s.closed })}>Include closed <em>{closedN}</em></button>
        </div>
      </div>

      <section className="qs172-s">
        <Head172 title="Stage" on={stageOn172(s)} text={stageText172(s.stage)} idle="any" part="stage" />
        <div className="qs172-stg" role="group" aria-label="Stage">
          {STAGES.map((st, i) => {
            const isOn = s.stage.includes(st.k);
            return (
              <React.Fragment key={st.k}>
                {i ? <i className="qs172-ln" aria-hidden="true" /> : null}
                <button type="button" className={isOn ? "on pick" : ""} aria-pressed={isOn} title={st.label}
                  onClick={() => setSmart172({ stage: isOn ? s.stage.filter((x) => x !== st.k) : [...s.stage, st.k] })}>
                  <svg viewBox="0 0 20 20" aria-hidden="true">{st.svg}</svg>
                  <span>{st.label}</span><em>{n("stage", (r) => stageIdx172(r) === st.k)}</em>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {W > 0 ? (
        <section className="qs172-s">
          <Head172 title="Sent" on={!!s.sent} text={`${wkLabel(lo)} – ${hi >= W ? "now" : wkLabel(hi)}`} idle="any time" part="sent" />
          <div className={`qs172-hist${mk.bars === "on" ? " is-click" : ""}`} aria-hidden={mk.bars !== "on" || undefined}>
            {hist.map((h, i) => mk.bars === "on"
              ? <button key={i} type="button" className={i >= lo && i <= hi ? "in" : ""} title={`Sent the week of ${wkLabel(i)} · ${h}`} onClick={() => (s.sent && lo === i && hi === i ? setSmart172({ sent: null }) : setSent(i, i))}><i style={{ height: `${h ? 4 + (h / hmax) * 26 : 0}px` }} /></button>
              : <i key={i} className={i >= lo && i <= hi ? "in" : ""} style={{ height: `${h ? 4 + (h / hmax) * 26 : 0}px` }} />)}
          </div>
          <div className="qs172-dual" style={{ ["--lo" as string]: `${(lo / W) * 100}%`, ["--hi" as string]: `${(hi / W) * 100}%` }}>
            <i className="tr" /><i className="fl" />
            <input type="range" min={0} max={W} value={lo} aria-label="Sent from" onChange={(e) => setSent(Math.min(+e.target.value, hi), hi)} />
            <input type="range" min={0} max={W} value={hi} aria-label="Sent to" onChange={(e) => setSent(lo, Math.max(+e.target.value, lo))} />
          </div>
          <div className="qs172-scale">{months.map((m) => <span key={m.i} style={{ left: `${(m.i / W) * 100}%` }}>{MON[m.d.getMonth()]}</span>)}</div>
        </section>
      ) : null}

      <DueRange172 k="date" title="Agent’s reply date" side="agent" b={REPLY172} rows={rows} ctx={ctx} s={s} />
      <DueRange172 k="sendby" title="Your send-by date" side="you" b={SENDBY172} rows={rows} ctx={ctx} s={s} />

      {(() => {
        /* 2 · the rarer five fold under More filters, open while any of them is set */
        const set = (s.pkgs.length ? 1 : 0) + (s.methods.length ? 1 : 0) + (s.fit ? 1 : 0) + (s.countries.length ? 1 : 0) + (s.mats !== "any" ? 1 : 0);
        const body = <>
      <section className="qs172-s">
        <Head172 title="What you sent" on={s.pkgs.length > 0} text={`${s.pkgs.length} picked`} idle="any" part="pkgs" />
        <div className="qs172-pills">
          {[...new Set([...quick, ...s.pkgs])].map((k) => (
            <button key={k} type="button" className={`qs172-chip${s.pkgs.includes(k) ? " on" : ""}`} onClick={() => togglePkg(k)}>{k}<em>{n("pkgs", (r) => ctx.pkg(r) === k)}</em></button>
          ))}
        </div>
        <label className="qs172-find">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M12.5 12.5l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={`Find a package (${pkgs.length})`} />
        </label>
        {find.trim() ? (
          <div className="qs172-sugs">
            {sugs.length ? sugs.map((k) => (
              <button key={k} type="button" className="qs172-sug" onClick={() => { togglePkg(k); setFind(""); }}>
                {s.pkgs.includes(k) ? <i>✓</i> : null}<span>{k}</span><em>{n("pkgs", (r) => ctx.pkg(r) === k)}</em>
              </button>
            )) : <p>No package called that.</p>}
          </div>
        ) : null}
      </section>

      <section className="qs172-s">
        <Head172 title="Sent by" on={s.methods.length > 0} text={`${s.methods.length} picked`} idle="any way" part="methods" />
        <div className={mk.mpills === "on" ? "qs172-pills qs172-mpills" : "qs172-meth"}>
          {METHODS.map((m) => {
            const c = n("methods", (r) => method172(r) === m.k), isOn = s.methods.includes(m.k);
            return (
              <button key={m.k} type="button" className={mk.mpills === "on" ? `qs172-chip${isOn ? " on" : ""}` : isOn ? "on" : ""} disabled={!c && !isOn} onClick={() => setSmart172({ methods: isOn ? s.methods.filter((x) => x !== m.k) : [...s.methods, m.k] })}>
                {METHOD_ICON[m.k]}<span>{m.label}</span><em>{c}</em>
              </button>
            );
          })}
        </div>
      </section>

      <section className="qs172-s">
        <Head172 title="Agent fit" on={!!s.fit} text={`${s.fit}★ or more`} idle="any" part="fit" />
        <div className="qs172-fit">
          <span className="qs172-stars" role="group" aria-label="Minimum fit">
            {[1, 2, 3, 4, 5].map((k) => <button key={k} type="button" className={k <= s.fit ? "on" : ""} aria-label={`${k} or more`} onClick={() => setSmart172({ fit: s.fit === k ? 0 : k })}>★</button>)}
          </span>
          <em>{n("fit", (r) => ctx.stars(r) >= (s.fit || 1))} rated</em>
        </div>
      </section>

      <section className="qs172-s">
        <Head172 title="Where the agent is" on={s.countries.length > 0} text={`${s.countries.length} picked`} idle="anywhere" part="countries" />
        <button type="button" className={`qs172-dd${locOpen ? " open" : ""}`} aria-expanded={locOpen} onClick={() => setLocOpen(!locOpen)}>
          {s.countries.length ? s.countries.map((c) => <span key={c}>{flag(c)} {COUNTRY[c] ?? c}</span>) : <span className="any">Any country</span>}
          <i aria-hidden="true">▾</i>
        </button>
        {locOpen ? (
          <div className="qs172-loc">
            {countries.map((c) => {
              const isOn = s.countries.includes(c);
              return (
                <button key={c} type="button" className={isOn ? "on" : ""} onClick={() => setSmart172({ countries: isOn ? s.countries.filter((x) => x !== c) : [...s.countries, c] })}>
                  <i aria-hidden="true">{isOn ? "✓" : ""}</i><span className="fl">{flag(c)}</span><span>{COUNTRY[c] ?? c}</span><em>{n("countries", (r) => ctx.country(r) === c)}</em>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {([
        ["mats", "Materials", [["any", "Any"], ["yes", "Recorded"], ["no", "Missing"]], (k: string) => (k === "yes" ? (r: QcRow) => r.materialsRecorded : (r: QcRow) => !r.materialsRecorded)],
      ] as const).map(([key, label, opts, test]) => (
        <div key={key} className="qs172-l">
          <Head172 title={label} on={s[key] !== "any"} text={s[key] === "yes" ? "recorded" : "missing"} idle="" part={key} />
          <span className="qs172-tri">
            {opts.map(([k, l]) => (
              <button key={k} type="button" className={s[key] === k ? "on" : ""} onClick={() => setSmart172({ [key]: k } as Partial<Smart172>)}>
                {l}{k !== "any" ? <em> {n(key, test(k))}</em> : null}
              </button>
            ))}
          </span>
        </div>
      ))}

        </>;
        if (mk.fold !== "on") return body;
        const open = moreOpen || set > 0;
        return (
          <>
            <button type="button" className={`qs172-more${open ? " open" : ""}`} aria-expanded={open} onClick={() => setMoreOpen(!open)} disabled={set > 0 && open}>
              <b>More filters</b><span>{set ? `${set} set` : "package, method, fit, location, materials"}</span><i aria-hidden="true">{open ? "▴" : "▾"}</i>
            </button>
            {open ? body : null}
          </>
        );
      })()}

      <footer className="qs172-f">{on ? `Showing ${showing} of ${total} queries.` : `All ${total} queries.`}</footer>
    </aside>
  );
};




/* a due date as a two-handle range in weeks around today (past it to the left), its spread drawn above it, and a
   "Not dated" tick like the Contact list's include boxes */
const DueRange172: React.FC<{ k: "date" | "sendby"; title: string; side: "agent" | "you"; b: { min: number; max: number }; rows: readonly QcRow[]; ctx: Ctx172; s: Smart172 }> = ({ k, title, side, b, rows, ctx, s }) => {
  const d = s[k];
  const click = useMock169().bars === "on";
  const mine = rows.filter((r) => sideOf172(r, ctx.nowMs) === side && pass172(r, s, ctx, k));
  const days = mine.map((r) => dueDays172(r, ctx.nowMs));
  const undated = days.filter((x) => x == null).length;
  const span = b.max - b.min, cols = span / 7;
  const hist = Array.from({ length: cols }, (_, i) => days.filter((x) => x != null && Math.min(b.max - 1, Math.max(b.min, x)) >= b.min + i * 7 && Math.min(b.max - 1, Math.max(b.min, x)) < b.min + (i + 1) * 7).length);
  const hmax = Math.max(1, ...hist);
  const pos = (x: number) => ((x - b.min) / span) * 100;
  const set = (p: Partial<typeof d>) => setSmart172({ [k]: { ...d, ...p } } as Partial<Smart172>);
  const today = pos(0);
  return (
    <section className="qs172-s">
      <Head172 title={title} on={dueOn172(d, b)} text={dueText172(d, b)} idle="any" part={k} />
      <div className={`qs172-hist qs172-hist--due${click ? " is-click" : ""}`} style={{ ["--t" as string]: `${today}%` }}>
        {hist.map((h, i) => { const a = b.min + i * 7; const inR = (d.lo <= b.min || a + 7 > d.lo) && (d.hi >= b.max || a <= d.hi);
          const cls = `${inR ? "in" : ""}${a < 0 ? " past" : ""}`;
          return click ? (
            <button key={i} type="button" className={cls} title={`${h} due ${a < 0 ? `${Math.abs(a) / 7}w ago` : a === 0 ? "this week" : `in ${a / 7}w`}`}
              onClick={() => (d.lo === a && d.hi === a + 7 && !d.nd ? set({ lo: b.min, hi: b.max, nd: true }) : set({ lo: a, hi: Math.min(b.max, a + 7), nd: false }))}><i style={{ height: `${h ? 4 + (h / hmax) * 22 : 0}px` }} /></button>
          ) : <i key={i} className={cls} style={{ height: `${h ? 4 + (h / hmax) * 22 : 0}px` }} />; })}
      </div>
      <div className="qs172-dual" style={{ ["--lo" as string]: `${pos(d.lo)}%`, ["--hi" as string]: `${pos(d.hi)}%` }}>
        <i className="tr" /><i className="fl" /><i className="qs172-now" style={{ left: `${today}%` }} />
        <input type="range" min={b.min} max={b.max} step={7} value={d.lo} aria-label={`${title} from`} onChange={(e) => set({ lo: Math.min(+e.target.value, d.hi) })} />
        <input type="range" min={b.min} max={b.max} step={7} value={d.hi} aria-label={`${title} to`} onChange={(e) => set({ hi: Math.max(+e.target.value, d.lo) })} />
      </div>
      <div className="qs172-scale">
        <span style={{ left: "0%", transform: "none" }}>{Math.abs(b.min / 7)}w ago</span>
        <span style={{ left: `${today}%` }}>Today</span>
        <span style={{ left: "100%", transform: "translateX(-100%)" }}>{b.max / 7}w ahead</span>
      </div>
      <label className="qs172-ck"><input type="checkbox" checked={d.nd} onChange={(e) => set({ nd: e.target.checked })} />Not dated <em>{undated}</em></label>
    </section>
  );
};

/* a section's title line: untouched, a quiet note; set, a navy dot by the title, what's picked and a ✕ that resets
   just this section */
const Head172: React.FC<{ title: string; on: boolean; text: string; idle: string; part: string }> = ({ title, on, text, idle, part }) => (
  <div className={`qs172-sh${on ? " is-on" : ""}`}>
    <b>{on ? <i className="qs172-dot" aria-hidden="true" /> : null}{title}</b>
    {on ? <button type="button" className="qs172-rs" onClick={() => setSmart172(resetPart172[part])}>Reset</button> : idle ? <span>{idle}</span> : null}
    {on && text ? <small className="qs172-now2">{text}</small> : null}
  </div>
);

/* 5 · saved views: a name and the panel's choices, kept in this browser (the review build seeds two) */
interface View172 { name: string; s: Smart172 }
const VKEY = "qh.views172";
function readViews172(): View172[] {
  try { const v = localStorage.getItem(VKEY); if (v) return JSON.parse(v); } catch { /* */ }
  return [
    { name: "Chase these", s: { ...EMPTY172, who: "chase" } },
    { name: "Fulls out", s: { ...EMPTY172, who: "wait", stage: [2] } },
    { name: "Owe a reply", s: { ...EMPTY172, who: "you" } },
  ];
}
function writeViews172(v: View172[]) { try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch { /* */ } }
