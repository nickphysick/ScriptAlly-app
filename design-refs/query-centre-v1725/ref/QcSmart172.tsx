/* MOCK ONLY (Query Centre v172 review build) — the Queries list's smart filter panel, built from the Contact list's
   v4.18 panel (navy head, quick picks, include pills, stars, pills + search, two-handle ranges, Any/Yes/No rows). */
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { QcRow } from "../../../lib/qcSummary";
import { EMPTY172, stageOn172, stageText172, resetPart172, dueText172, REPLY172, SENDBY172, dueDays172, dueOn172, sideOf172, method172, pass172, setSmart172, smartOn172, stageIdx172, useSmart172, whoOf172, STAND172, stand172, standText172, type Ctx172, type Smart172, type Stand172 } from "../../../smart172";
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

  /* the sent range in buckets sized to the campaign: weeks while it fits in about six months, then months, then quarters —
     never more than 26 bars, so a long campaign still draws (v172.3) */
  const buckets = useMemo(() => {
    const ms = rows.map((r) => r.sentMs).filter((x): x is number => x != null);
    if (!ms.length) return { unit: "week" as const, starts: [] as number[] };
    const end = ctx.nowMs, first = Math.min(...ms);
    const nWeeks = Math.ceil((end - first) / WEEK);
    if (nWeeks <= 26) { const out: number[] = []; for (let t = end - nWeeks * WEEK; t <= end; t += WEEK) out.push(t); return { unit: "week" as const, starts: out }; }
    const f = new Date(first), e = new Date(end);
    const months = (e.getFullYear() - f.getFullYear()) * 12 + e.getMonth() - f.getMonth() + 1;
    const step = months <= 26 ? 1 : 3;
    const s0 = new Date(f.getFullYear(), step === 3 ? Math.floor(f.getMonth() / 3) * 3 : f.getMonth(), 1);
    const out: number[] = [];
    for (let d = s0; d.getTime() <= end; d = new Date(d.getFullYear(), d.getMonth() + step, 1)) out.push(d.getTime());
    return { unit: step === 1 ? ("month" as const) : ("quarter" as const), starts: out };
  }, [rows, ctx.nowMs]);
  const weeks = buckets.starts;
  const bEnd = (i: number) => (i + 1 < weeks.length ? weeks[i + 1] : ctx.nowMs + 1);
  const W = weeks.length - 1;
  const lo = s.sent ? Math.max(0, weeks.findIndex((t, i) => bEnd(i) > s.sent![0])) : 0;
  const hi = s.sent ? Math.max(lo, weeks.findIndex((t, i) => bEnd(i) > s.sent![1])) : W;
  const sentBase = rows.filter((r) => pass172(r, s, ctx, "sent"));
  const hist = weeks.map((t, i) => sentBase.filter((r) => r.sentMs != null && r.sentMs >= t && r.sentMs < bEnd(i)).length);
  const hmax = Math.max(1, ...hist);
  const setSent = (a: number, b: number) => setSmart172({ sent: a <= 0 && b >= W ? null : [weeks[a], bEnd(b) - 1] });
  const yy = (d: Date) => `’${String(d.getFullYear()).slice(2)}`;
  const wkLabel = (i: number) => { const d = new Date(weeks[i]); return buckets.unit === "week" ? `${d.getDate()} ${MON[d.getMonth()]}` : buckets.unit === "month" ? `${MON[d.getMonth()]} ${yy(d)}` : `Q${Math.floor(d.getMonth() / 3) + 1} ${yy(d)}`; };
  const hiLabel = (i: number) => (buckets.unit === "week" ? wkLabel(i) : (() => { const d = new Date(bEnd(i) - 1); return buckets.unit === "month" ? `${MON[d.getMonth()]} ${yy(d)}` : `${MON[d.getMonth()]} ${yy(d)}`; })());
  /* the scale: months for weeks, else the start of each year with its year; never crowded */
  const months = (() => {
    const all = weeks.map((t, i) => ({ i, d: new Date(t) })).filter((x, i, a) => buckets.unit !== "week" && i === 0 ? true : i > 0 && (buckets.unit === "week" ? x.d.getMonth() !== a[i - 1].d.getMonth() : x.d.getFullYear() !== a[i - 1].d.getFullYear()));
    const out: typeof all = []; const gap = Math.max(1, W * 0.16);
    for (const m of all) if (!out.length || m.i - out[out.length - 1].i >= gap) out.push(m);
    return out;
  })();
  const scaleLabel = (d: Date) => (buckets.unit === "week" ? MON[d.getMonth()] : `${MON[d.getMonth()]} ${yy(d)}`);


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

  const stageBody = (
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
  );
  const sentBody = (
    <>
            <div className={`qs172-hist${mk.bars === "on" ? " is-click" : ""}${weeks.length > 18 ? " is-dense" : ""}`} aria-hidden={mk.bars !== "on" || undefined}>
              {hist.map((h, i) => mk.bars === "on"
                ? <button key={i} type="button" className={i >= lo && i <= hi ? "in" : ""} title={`${wkLabel(i)} · ${h}`} onClick={() => (s.sent && lo === i && hi === i ? setSmart172({ sent: null }) : setSent(i, i))}><i style={{ height: `${h ? 4 + (h / hmax) * 26 : 0}px` }} /></button>
                : <i key={i} className={i >= lo && i <= hi ? "in" : ""} style={{ height: `${h ? 4 + (h / hmax) * 26 : 0}px` }} />)}
            </div>
            <div className="qs172-dual" style={{ ["--lo" as string]: `${(lo / W) * 100}%`, ["--hi" as string]: `${(hi / W) * 100}%` }}>
              <i className="tr" /><i className="fl" />
              <input type="range" min={0} max={W} value={lo} aria-label="Sent from" onChange={(e) => setSent(Math.min(+e.target.value, hi), hi)} />
              <input type="range" min={0} max={W} value={hi} aria-label="Sent to" onChange={(e) => setSent(lo, Math.max(+e.target.value, lo))} />
            </div>
            <div className="qs172-scale">{months.map((m) => <span key={m.i} style={{ left: `${(m.i / W) * 100}%`, ...(buckets.unit !== "week" || m.i === 0 ? { transform: "none" } : {}) }}>{scaleLabel(m.d)}</span>)}</div>
    </>
  );
  /* v19.9 — the ring's counts, for the ring and the tucked strip */
  const rc: Record<string, number> = { ...Object.fromEntries(STAND172.map((x) => [x.k, n("hide", (r) => stand172(r, ctx.nowMs) === x.k)])), closed: closedN };
  const stagePills = (
    <div className="qs172-stp" role="group" aria-label="Stage">
      {STAGES.map((st) => {
        const isOn = s.stage.includes(st.k);
        return (
          <button key={st.k} type="button" className={`qs172-chip${isOn ? " on" : ""}`} aria-pressed={isOn}
            onClick={() => setSmart172({ stage: isOn ? s.stage.filter((x) => x !== st.k) : [...s.stage, st.k] })}>
            <svg viewBox="0 0 20 20" aria-hidden="true">{st.svg}</svg>{st.label}<em>{n("stage", (r) => stageIdx172(r) === st.k)}</em>
          </button>
        );
      })}
    </div>
  );
  /* v19.9 — where the panel sits: shrinks once the list has scrolled, or tucks away to a strip */
  const asideRef = useRef<HTMLElement>(null);
  const [mini, setMini] = useState(false);
  const [unmini, setUnmini] = useState(false);
  const tucked = useTuck172();
  useEffect(() => {
    if (mk.pos !== "shrink") { setMini(false); return undefined; }
    let el: HTMLElement | null = asideRef.current?.parentElement?.parentElement ?? null;
    while (el && !(/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight)) el = el.parentElement;
    const tgt: HTMLElement | Window = el ?? window;
    const read = () => { const y = el ? el.scrollTop : window.scrollY; setMini(y > 420); if (y <= 420) setUnmini(false); };
    tgt.addEventListener("scroll", read, { passive: true }); read();
    return () => tgt.removeEventListener("scroll", read);
  }, [mk.pos]);
  if (mk.pos === "tuck" && tucked) {
    const shownN = showing;
    return (
      <aside className="qs172 qs172-tuck" data-qc172="panel" aria-label="Filters (hidden)">
        <button type="button" onClick={() => setTuck172(false)} aria-label="Show filters">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M6 10h8M8.5 15h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <MiniRing172 c={rc} s={s} />
          <b>{shownN}</b>
          <span>{on ? "Filtered" : "Filters"}</span>
          {on ? <i className="qs172-dot" aria-hidden="true" /> : null}
        </button>
      </aside>
    );
  }
  const isMini = mk.pos === "shrink" && mini && !unmini;
  return (
    <aside ref={asideRef} className="qs172" data-qc172="panel" aria-label="Filter your queries" data-frame={mk.frame} data-mini={isMini ? "" : undefined}>
      <header className="qs172-h"><b>Filter</b>{mk.hdr === "none" ? null : <small>{mk.hdr === "live" ? `${showing} showing` : on ? `${showing} of ${total}` : `All ${total}`}</small>}{on ? <button type="button" onClick={reset}>Clear all</button> : null}
        {mk.pos === "tuck" ? <button type="button" className="qs172-hide" onClick={() => setTuck172(true)} aria-label="Hide filters" title="Hide filters"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 5 7.5 10l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button> : null}</header>

      {isMini ? <button type="button" className="qs172-allf" onClick={() => setUnmini(true)}>All filters<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></button> : null}
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

      {mk.top === "ring" ? <Ring172 s={s} ctx={ctx} n={n} closedN={closedN} total={total} extra={mk.stg === "ring" ? stagePills : null} /> : mk.top === "ws" ? <Stand172Section rows={rows} s={s} ctx={ctx} n={n} closedN={closedN} /> : (
      <div className="qs172-q">
        <div className="qs172-seg" role="group" aria-label="Where it stands">
          {([["you", "With you"], ["chase", "Needs chasing"], ["wait", "Waiting"]] as const).map(([k, label]) => {
            const c = n("who", (r) => whoOf172(r, ctx.nowMs) === k);
            return <button key={k} type="button" className={s.who === k ? "on" : ""} disabled={!c && s.who !== k} onClick={() => setSmart172({ who: s.who === k ? null : k })}><b>{c}</b><span>{label}</span></button>;
          })}
        </div>
        <div className="qs172-incs">
          <label className="qs172-ck qs172-ck--closed"><input type="checkbox" checked={s.closed} onChange={(e) => setSmart172({ closed: e.target.checked })} />Include closed <em>{closedN}</em></label>
        </div>
      </div>
      )}

      {mk.stg === "ring" && mk.top === "ring" ? null : <Sec172 id="stage" title="Stage reached" on={stageOn172(s)} text={stageText172(s.stage)} idle="any" part="stage">{stageBody}</Sec172>}

      {mk.when === "one" ? <When172 s={s} sentOn={!!s.sent} sentText={`${wkLabel(lo)} – ${hi >= W ? "now" : hiLabel(hi)}`} sentBody={W > 0 ? sentBody : null} rows={rows} ctx={ctx} /> : <>
      {W > 0 ? <Sec172 id="sent" title="Sent" on={!!s.sent} text={`${wkLabel(lo)} – ${hi >= W ? "now" : hiLabel(hi)}`} idle="any time" part="sent" spark={hist}>{sentBody}</Sec172> : null}

      <DueRange172 k="date" title="Agent’s reply date" side="agent" b={REPLY172} rows={rows} ctx={ctx} s={s} />
      <DueRange172 k="sendby" title="Your send-by date" side="you" b={SENDBY172} rows={rows} ctx={ctx} s={s} />
      </>}

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
        if (mk.fd === "on") return <Sec172 id="more" title="More filters" on={set > 0} text={`${set} set`} idle="none set" part="" bare>{body}</Sec172>;
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
const DueRange172: React.FC<{ k: "date" | "sendby"; title: string; side: "agent" | "you"; b: { min: number; max: number }; rows: readonly QcRow[]; ctx: Ctx172; s: Smart172; bare?: boolean }> = ({ k, title, side, b, rows, ctx, s, bare }) => {
  const mk = useMock169();
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
  const QP: [string, Partial<typeof d>][] = [["Any", { lo: b.min, hi: b.max, nd: true }], ["Overdue", { lo: b.min, hi: 0, nd: false }], ["This week", { lo: 0, hi: 7, nd: false }], ["Next 2 weeks", { lo: 0, hi: 14, nd: false }]];
  const body = (
    <>
      {mk.qp === "on" ? (
        <div className="qs172-qp" role="group" aria-label={`${title}: quick picks`}>
          {QP.map(([l, p]) => { const isOn = d.lo === p.lo && d.hi === p.hi && d.nd === p.nd; return <button key={l} type="button" className={`qs172-chip${isOn ? " on" : ""}`} aria-pressed={isOn} onClick={() => set(p)}>{l}</button>; })}
        </div>
      ) : null}
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
        <span style={{ left: "0%", transform: "none" }}>{Math.abs(b.min / 7)}w+ ago</span>
        <span style={{ left: `${today}%` }}>Today</span>
        <span style={{ left: "100%", transform: "translateX(-100%)" }}>{b.max / 7}w+ ahead</span>
      </div>
      <label className="qs172-ck"><input type="checkbox" checked={d.nd} onChange={(e) => set({ nd: e.target.checked })} />Not dated <em>{undated}</em></label>
    </>
  );
  if (bare) return body;
  return <Sec172 id={k} title={title} on={dueOn172(d, b)} text={dueText172(d, b)} idle="any" part={k} spark={hist}>{body}</Sec172>;
};

/* ── v19.9 · folding sections: which are open, for the visit (stage open; the dates and More folded to start) ── */
const FKEY = "qh.fold172";
let fold172: Record<string, boolean> = (() => { try { const v = sessionStorage.getItem(FKEY); if (v) return JSON.parse(v); } catch { /* */ } return { stage: true, sent: false, date: false, sendby: false, when: false, more: false }; })();
const fsubs = new Set<() => void>();
const useFold172 = () => useSyncExternalStore((f) => { fsubs.add(f); return () => fsubs.delete(f); }, () => fold172, () => fold172);
const setFold172 = (id: string, open: boolean, one: boolean) => {
  fold172 = one && open ? { ...Object.fromEntries(Object.keys(fold172).map((x) => [x, false])), [id]: true } : { ...fold172, [id]: open };
  try { sessionStorage.setItem(FKEY, JSON.stringify(fold172)); } catch { /* */ }
  fsubs.forEach((f) => f());
};
let tuck172 = (() => { try { return localStorage.getItem("qh.tuck172") === "1"; } catch { return false; } })();
const tsubs = new Set<() => void>();
const useTuck172 = () => useSyncExternalStore((f) => { tsubs.add(f); return () => tsubs.delete(f); }, () => tuck172, () => tuck172);
const setTuck172 = (v: boolean) => { tuck172 = v; try { localStorage.setItem("qh.tuck172", v ? "1" : "0"); } catch { /* */ } tsubs.forEach((f) => f()); };

const CHEV172 = <svg className="qs172-cv" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Spark172: React.FC<{ v: number[] }> = ({ v }) => {
  const m = Math.max(1, ...v), w = 3, g = 1.4;
  return <svg className="qs172-spark" width={v.length * (w + g)} height="14" aria-hidden="true">{v.map((h, i) => <rect key={i} x={i * (w + g)} y={14 - (h ? 2 + (h / m) * 12 : 1)} width={w} height={h ? 2 + (h / m) * 12 : 1} rx="1" />)}</svg>;
};
/** a section: as before when folding is off; with folding on, its title line opens and shuts it and shows what it's set to */
const Sec172: React.FC<{ id: string; title: string; on: boolean; text: string; idle: string; part: string; spark?: number[]; bare?: boolean; children: React.ReactNode }> = ({ id, title, on, text, idle, part, spark, bare, children }) => {
  const mk = useMock169();
  const f = useFold172();
  const open = f[id] ?? true;
  useEffect(() => { if (mk.fd === "on" && on && !open) setFold172(id, true, false); }, [mk.fd]); // eslint-disable-line react-hooks/exhaustive-deps
  if (mk.fd !== "on") return bare ? <>{children}</> : <section className="qs172-s"><Head172 title={title} on={on} text={text} idle={idle} part={part} />{children}</section>;
  return (
    <section className={`qs172-s qs172-fold${open ? "" : " is-shut"}`} data-fold={id}>
      <div className={`qs172-fh${on ? " is-on" : ""}`}>
        <button type="button" className="qs172-ft" aria-expanded={open} onClick={() => setFold172(id, !open, mk.one === "one")}>
          <b>{on ? <i className="qs172-dot" aria-hidden="true" /> : null}{title}</b>
          {!open && mk.spark === "on" && spark?.length ? <Spark172 v={spark} /> : null}
          <span className="qs172-fv">{on ? text : idle}</span>
          {CHEV172}
        </button>
        {on && open && part ? <button type="button" className="qs172-rs" onClick={() => setSmart172(resetPart172[part])}>Reset</button> : null}
      </div>
      <div className="qs172-fb" inert={!open || undefined}><div>{children}</div></div>
    </section>
  );
};
/** v19.9 — the three dates as one section with three tabs */
const When172: React.FC<{ s: Smart172; sentOn: boolean; sentText: string; sentBody: React.ReactNode; rows: readonly QcRow[]; ctx: Ctx172 }> = ({ s, sentOn, sentText, sentBody, rows, ctx }) => {
  const dOn = dueOn172(s.date, REPLY172), bOn = dueOn172(s.sendby, SENDBY172);
  const [tab, setTab] = useState<"sent" | "date" | "sendby">(dOn && !sentOn ? "date" : bOn && !sentOn && !dOn ? "sendby" : "sent");
  const parts = [sentOn ? `Sent ${sentText}` : "", dOn ? `Reply ${dueText172(s.date, REPLY172).toLowerCase()}` : "", bOn ? `Send-by ${dueText172(s.sendby, SENDBY172).toLowerCase()}` : ""].filter(Boolean);
  const T: [typeof tab, string, boolean][] = [["sent", "Sent", sentOn], ["date", "Reply due", dOn], ["sendby", "Send-by", bOn]];
  return (
    <Sec172 id="when" title="When" on={parts.length > 0} text={parts.join(" · ")} idle="any time" part="" >
      <div className="qs172-wt" role="tablist" aria-label="Which date">
        {T.map(([k, l, isSet]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}{isSet ? <i className="qs172-dot" aria-hidden="true" /> : null}</button>)}
      </div>
      {tab === "sent" ? sentBody
        : tab === "date" ? <DueRange172 k="date" title="Agent’s reply date" side="agent" b={REPLY172} rows={rows} ctx={ctx} s={s} bare />
        : <DueRange172 k="sendby" title="Your send-by date" side="you" b={SENDBY172} rows={rows} ctx={ctx} s={s} bare />}
      {parts.length ? <button type="button" className="qs172-wreset" onClick={() => setSmart172({ sent: null, date: EMPTY172.date, sendby: EMPTY172.sendby })}>Reset dates</button> : null}
    </Sec172>
  );
};
const MiniRing172: React.FC<{ c: Record<string, number>; s: Smart172 }> = ({ c, s }) => {
  const keys = [...STAND172.map((x) => x.k), "closed"];
  const sum = keys.reduce((a, k) => a + (c[k] ?? 0), 0) || 1, R = 13, C = 2 * Math.PI * R;
  let at = 0;
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true" className="qs172-mring">
      {keys.map((k) => { const len = ((c[k] ?? 0) / sum) * C; const off = at; at += len; const lit = k === "closed" ? s.closed : !s.hide.includes(k as Stand172);
        return len ? <circle key={k} cx="18" cy="18" r={R} fill="none" strokeWidth="6" style={{ stroke: SW172[k], opacity: lit ? 1 : 0.25 }} strokeDasharray={`${Math.max(0, len - 1)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 18 18)" /> : null; })}
    </svg>
  );
};

/* a section's title line: untouched, a quiet note; set, a navy dot by the title, what's picked and a ✕ that resets
   just this section */
/* v19.7 — Where it stands: the list's own groups as one checklist that adds up to the total. Needs action is the
   list's top group, split into its two halves; every row is shown by default; a row's name shows only that row. */
const SW172: Record<string, string> = { wait: "#dce1e8", offer: "#1c130f", req: "#2a3a52", nudge: "#5c6d88", nodate: "#7d8aa0", close: "#a3adbf", window: "#dce1e8", closed: "#efeae3" };
/* v19.8 — the ring: where all of them stand, as one donut. Everything shows to start; picking a part (on the ring or its
   key) narrows the list to it, picking more adds them, and picking the last one away shows everything again. */
const RING_LABEL: Record<string, string> = { ...Object.fromEntries(STAND172.map((x) => [x.k, x.label])), closed: "Closed" };
const ACT172 = ["offer", "req", "nudge", "nodate", "close"] as const;
const WAIT172 = ["window"] as const;
const Ring172: React.FC<{ s: Smart172; ctx: Ctx172; n: (skip: keyof Smart172, f: (r: QcRow) => boolean) => number; closedN: number; total: number; extra?: React.ReactNode }> = ({ s, ctx, n, closedN, total, extra }) => {
  const mk = useMock169();
  const [hov, setHov] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
    React.useEffect(() => { const t = window.setTimeout(() => setDrawn(true), 30); return () => window.clearTimeout(t); }, []);
  const c: Record<string, number> = { ...Object.fromEntries(STAND172.map((x) => [x.k, n("hide", (r) => stand172(r, ctx.nowMs) === x.k)])), closed: closedN };
  c.act = ACT172.reduce((t, k) => t + c[k], 0);
  c.wait = WAIT172.reduce((t, k) => t + c[k], 0);
  const lit1 = (k: string) => (k === "closed" ? s.closed : !s.hide.includes(k as Stand172));
  const grp = (k: string): readonly string[] => (k === "act" ? ACT172 : k === "wait" ? WAIT172 : [k]);
  const lit = (k: string) => grp(k).some(lit1);
  const all = s.hide.length === 0 && s.closed;
  /* picking: from "everything", a part (or a group) shows only that; after that, each pick adds or takes away; taking the
     last away shows everything again */
  const pick = (k: string) => {
    const ks = grp(k);
    const allK = [...STAND172.map((x) => x.k), "closed"];
    const shownNow = all ? new Set<string>() : new Set(allK.filter(lit1));
    const isAllOn = !all && ks.every((x) => shownNow.has(x));
    ks.forEach((x) => (isAllOn ? shownNow.delete(x) : shownNow.add(x)));
    if (!shownNow.size) { setSmart172({ hide: [], closed: true }); return; }
    setSmart172({ hide: STAND172.map((x) => x.k).filter((x) => !shownNow.has(x)), closed: shownNow.has("closed") });
  };
  const ringKeys = [...ACT172, ...(["wait"] as const), "closed"];
  const sum = ringKeys.reduce((t, k) => t + c[k], 0) || 1;
  const shown = [...ACT172, ...WAIT172, "closed"].filter(lit1).reduce((t, k) => t + c[k], 0);
  const R = 40, C = 2 * Math.PI * R, GAP = ringKeys.filter((k) => c[k]).length > 1 ? 2.2 : 0;
  let at = 0;
  const arcs = ringKeys.map((k) => { const len = (c[k] / sum) * C; const o = { k, off: at, len: Math.max(0, len - GAP) }; at += len; return o; }).filter((o) => c[o.k]);
  const on = !all;
  const LBL: Record<string, string> = { ...RING_LABEL, act: "Action needed", wait: "No action needed" };
  const text = !on ? "" : s.hide.length ? standText172(s) + (s.closed ? ", Closed" : "") : "Closed hidden";
  const target = hov ? c[hov] : on ? shown : mk.ctr === "need" ? c.act : total;
  const [up, setUp] = useState(() => (mk.cu === "on" ? 0 : -1));
  React.useEffect(() => {
    if (up < 0) return undefined;
    const t0 = performance.now(); let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 700); setUp(k >= 1 ? -1 : Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const centreBig = up >= 0 ? up : target;
  const SHORT: Record<string, string> = { act: "need you", offer: "offers", req: "requested", nudge: "to nudge", nodate: "need a date", close: "to close", wait: "no action", window: "no action", closed: "closed" };
  const centreSub = hov ? SHORT[hov] ?? "" : on ? `of ${total}` : mk.ctr === "need" ? "need you" : "queries";
  const row = (k: string, sub = false, tail?: React.ReactNode) => (
    <li key={k} className={`${sub ? "sub " : ""}${lit(k) ? "" : "off"}${hov === k ? " hov" : ""}${on && lit(k) ? " sel" : ""}`}>
      {tail}
      <button type="button" className="qs172-rb" disabled={!c[k]} aria-pressed={on && lit(k)} onMouseEnter={() => setHov(k)} onMouseLeave={() => setHov(null)} onClick={() => pick(k)}>
        {k === "act" || tail ? null : <i style={{ background: SW172[k] }} />}<span className="l">{LBL[k]}</span><em>{c[k]}</em>
      </button>
    </li>
  );
  return (
    <section className="qs172-s qs172-ring">
      <Head172 title="What’s next" on={on} text={text} idle="all" part="ws" />
      <div className="qs172-rg" data-key={mk.key}>
        <svg viewBox="0 0 100 100" className="qs172-rsvg" role="group" aria-label="What’s next">
          <circle cx="50" cy="50" r={R} className="bg" />
          {arcs.map((o) => (
            <circle key={o.k} cx="50" cy="50" r={mk.pop === "on" && on && lit(o.k) ? R + 3 : R} className={`arc${lit(o.k) ? "" : " off"}${hov === o.k || grp(hov ?? "").includes(o.k) ? " hov" : ""}`}
              tabIndex={0} role="button" aria-label={`${LBL[o.k]}: ${c[o.k]}`} aria-pressed={on && lit(o.k)}
              onFocus={() => setHov(o.k)} onBlur={() => setHov(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(o.k); return; }
                const sibs = [...(e.currentTarget.parentNode?.querySelectorAll("circle.arc") ?? [])] as SVGCircleElement[];
                const i = sibs.indexOf(e.currentTarget);
                if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); sibs[(i + 1) % sibs.length]?.focus(); }
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); sibs[(i - 1 + sibs.length) % sibs.length]?.focus(); }
              }}
              style={{ stroke: SW172[o.k], strokeDasharray: `${drawn ? o.len : 0} ${C}`, strokeDashoffset: -o.off }}
              onMouseEnter={() => setHov(o.k)} onMouseLeave={() => setHov(null)} onClick={() => pick(o.k)}>
              <title>{`${LBL[o.k]}: ${c[o.k]}`}</title>
            </circle>
          ))}
          <circle cx="50" cy="50" r={R - 9} className="hole" />
          <text x="50" y="48" className="big">{centreBig}</text>
          <text x="50" y="62" className="sub">{centreSub}</text>
        </svg>
        <ul className="qs172-rk qs172-rk2">
          {row("act")}
          {ACT172.filter((k) => (mk.empty === "hide" ? c[k] > 0 : k !== "offer" || c[k])).map((k) => row(k, true))}
          {mk.empty === "hide" && !c.wait ? null : row("wait")}
          {mk.empty === "hide" && !c.closed ? null : row("closed")}
        </ul>
      </div>
      {extra}
    </section>
  );
};

const Stand172Section: React.FC<{ rows: readonly QcRow[]; s: Smart172; ctx: Ctx172; n: (skip: keyof Smart172, f: (r: QcRow) => boolean) => number; closedN: number }> = ({ s, ctx, n, closedN }) => {
  const c = Object.fromEntries(STAND172.map((x) => [x.k, n("hide", (r) => stand172(r, ctx.nowMs) === x.k)])) as Record<Stand172, number>;
  const shown = (k: Stand172) => !s.hide.includes(k);
  return (
    <section className="qs172-s qs172-ws">
      <Head172 title="Where it stands" on={s.hide.length > 0 || !s.closed} text={standText172(s)} idle="all" part="ws" />
      <ul className="qs172-wl">
        {STAND172.map((x) => (
          <li key={x.k} className={shown(x.k) ? "" : "off"}>
            <label><input type="checkbox" checked={shown(x.k)} onChange={() => setSmart172({ hide: shown(x.k) ? [...s.hide, x.k] : s.hide.filter((y) => y !== x.k) })} /><i className="sw" style={{ background: SW172[x.k] }} />{x.label}</label><em>{c[x.k]}</em>
          </li>
        ))}
        <li className={s.closed ? "" : "off"}><label><input type="checkbox" checked={s.closed} onChange={() => setSmart172({ closed: !s.closed })} /><i className="sw" style={{ background: SW172.closed }} />Closed</label><em>{closedN}</em></li>
      </ul>
    </section>
  );
};

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
