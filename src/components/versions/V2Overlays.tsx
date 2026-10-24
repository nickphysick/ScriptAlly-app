/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — everything that opens over the page: the version drawer (P8), the new / edit form (P9), "Which version
 * went?" (P10), the archive and delete confirms (S04, S05) and the explainer. Each is the ref's own markup.
 *
 * ⚠️ THEY PORTAL TO <body>, INSIDE A `.vv2` LAYER, because the page's stylesheet is scoped to `.vv2` and the ref's
 *    drawer and modals are children of its <body>. The layer carries the page's state attributes too.
 * ⚠️ ESCAPE IS THE APP'S ONE STACK: a modal over the drawer closes first (ESC_LEVEL.pageModal over pageDrawer).
 * ⚠️ NOTHING HERE WRITES. Every save is the page's, through lib/bookVersions and db.writeVersionChange, so its Undo is
 *    one snapshot.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Agent, Manuscript, Query } from "../../types";
import { QueryStatus } from "../../types";
import { useEscapeLayer, ESC_LEVEL } from "../../lib/escapeStack";
import {
  MAX_CHANGES, MAX_CHANGE_LEN, MAX_VERSION_NAME, changesProblem, cleanChanges, descendantsOf, nameProblem, type V2Version,
} from "../../lib/bookVersions";
import {
  MIN_SENT_FOR_RATE, VERSION_NOT_SURE, laterBy, pickerDefault, savedBy, type VersionFacts, type VersionsModel,
} from "../../lib/versionsV2";
import type { AnalyticsRow } from "../../lib/analytics";
import { DocMark, Chevron, Num, XMark, agentLine, commas, longDay, msDay, sentDay, shortDay, statusWord, versionLabel, Dot } from "./v2Bits";

const SCROLLS = "/images/versions/versions-scrolls-hawk.webp";
const EXPLAINER = "/images/versions/explainer-hawk.webp";

/* ══ the layer and the two shells ══════════════════════════════════════════════════════════════════════════ */

export const Layer: React.FC<{ attrs: Record<string, string>; children: React.ReactNode }> = ({ attrs, children }) =>
  /* no document while server-rendering (the render smoke): nothing over the page is open then anyway */
  typeof document === "undefined" ? null : createPortal(<div className="vv2" data-vv2="layer" {...attrs}>{children}</div>, document.body);

/** Focus the first `[data-first]` (else the close button) once open; give focus back to the opener on close. */
function useFocusLoop(open: boolean, root: React.RefObject<HTMLElement | null>, key: unknown) {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const f = root.current?.querySelector<HTMLElement>("[data-first]") ?? root.current?.querySelector<HTMLElement>(".cx-x");
      f?.focus();
    }, 60);
    return () => { window.clearTimeout(t); const o = opener.current; if (o && document.contains(o)) requestAnimationFrame(() => o.focus()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);
}

export const DrawerShell: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; kind: string; k?: unknown }> = ({ open, onClose, children, kind, k }) => {
  const ref = useRef<HTMLElement>(null);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageDrawer);
  useFocusLoop(open, ref, k);
  return (
    <>
      <div className={`cx-dim${open ? " on" : ""}`} id="cxDim" onClick={onClose} />
      <aside ref={ref} className={`cx-drw${open ? " on" : ""}`} id="cxDrw" role="dialog" aria-modal="true" aria-labelledby="cxDrwT" data-vv2="drawer" data-kind={kind} aria-hidden={!open}>
        {open ? children : null}
      </aside>
    </>
  );
};

export const ModalShell: React.FC<{ open: boolean; kind: "m" | "p"; onClose: () => void; children: React.ReactNode; vv?: string; k?: unknown }> = ({ open, kind, onClose, children, vv, k }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeLayer(open, onClose, ESC_LEVEL.pageModal);
  useFocusLoop(open, ref, k);
  return (
    <div className={`cx-mdim${open ? " on" : ""}`} id={kind === "m" ? "cxMdim" : "cxPdim"} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={kind === "m" ? "cx-modal sm" : "cx-pk"} id={kind === "m" ? "cxModal" : "cxPk"} role="dialog" aria-modal="true" aria-labelledby={kind === "p" ? "cxPkT" : undefined} data-vv2={vv}>
        {open ? children : null}
      </div>
    </div>
  );
};

/* ══ the lineage diagram (the ref's `lin`) ═════════════════════════════════════════════════════════════════ */

export const outcomeLine = (f: VersionFacts | null): string =>
  !f ? "" : f.n ? (f.early ? `${f.n} sent · too early to tell` : `${f.ratePct}% asked for more · ${f.n} sent`) : "Not sent yet";

interface CardSpec { v: Pick<V2Version, "original" | "num"> | null; name: string; sub: string; on?: boolean; child?: boolean; om?: boolean }
const LinCard: React.FC<CardSpec> = ({ v, name, sub, on, child, om }) => (
  <div className={`ln-v${child ? " ch" : ""}${om ? " om" : ""}`}>
    <div className="ln-vh"><span className={`vl-n${on ? " on" : ""}`}><Num v={v} /></span><b>{name}</b></div>
    <small>{sub}</small>
  </div>
);
export const Lineage: React.FC<{ parent: CardSpec; changes: readonly string[]; child: CardSpec }> = ({ parent, changes, child }) => (
  <div className="ln3">
    <div className="ln-col"><LinCard {...parent} /></div>
    <span className="ln-ar" aria-hidden="true" />
    <div className="ln-cs">
      {changes.length ? changes.map((c, i) => <div className="ln-c" key={i}><span>Change {i + 1}</span><p>{c}</p></div>)
        : <div className="ln-c e"><p>Add what changed and it shows here.</p></div>}
    </div>
    <span className="ln-ar" aria-hidden="true" />
    <div className="ln-col"><LinCard {...child} child /></div>
  </div>
);

/* ══ the funnel (the ref's `hfar`, case "c") ═══════════════════════════════════════════════════════════════ */

const nameList = (qs: Query[], agents: Map<string, Agent>) => qs.map((q) => agentLine(q, agents).name).join(", ");

export const Funnel: React.FC<{ f: VersionFacts; agents: Map<string, Agent> }> = ({ f, agents }) => {
  const S2 = f.n, R = f.replied.length, M = f.more.length, O = f.offers.length;
  const steps: [string, number][] = [["Sent", S2], ["Replied", R], ["Asked for more", M], ["Offer", O]];
  const W = 460, H = 54, g = 3, HT = steps.length * H, cols = ["#d9d0c3", "#2a3a52", "#a2452a", "#6e2a18"];
  const w = (c: number) => (0.2 + 0.8 * Math.min(1, c / Math.max(1, S2))) * W;
  const mid = steps.map((s) => w(s[1]));
  const P = [[mid[0] * 1.03, 0], ...mid.map((m, i) => [m, (i + 0.5) * H]), [Math.max(mid[3] * 0.82, W * 0.14), HT]].map(([wd, y]) => [W / 2 + wd / 2, y]);
  const cr = (Q: number[][]) => { let o = ""; for (let i = 0; i < Q.length - 1; i++) { const p0 = Q[Math.max(0, i - 1)], p1 = Q[i], p2 = Q[i + 1], p3 = Q[Math.min(Q.length - 1, i + 2)]; o += `C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; } return o; };
  const L = P.map(([x, y]) => [W - x, y]).reverse();
  const sil = `M${P[0][0]} 0` + cr(P) + `L${L[0][0]} ${L[0][1]}` + cr(L) + "Z";
  const pc = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const rated = S2 >= MIN_SENT_FOR_RATE;
  const sd = f.qs;
  const ad = f.avgReply;
  const TIPS: [string, string, string][] = [
    [`${S2} ${S2 === 1 ? "query" : "queries"} sent`, S2 ? `First on ${shortDay(msDay(f.firstMs))}, latest ${shortDay(msDay(f.lastMs))}` : "", nameList(sd, agents)],
    [`${R} of ${S2} replied${rated ? ` · ${pc(R, S2)}%` : ""}`, [ad != null ? `Average reply ${ad} days` : "", S2 - R ? `${S2 - R} still to hear back` : ""].filter(Boolean).join(" · "), nameList(f.replied, agents)],
    [`${M} of the ${R} who replied asked for more${rated ? ` · ${pc(M, R)}%` : ""}`, [f.partial ? `${f.partial} partial` : "", f.full ? `${f.full} full` : ""].filter(Boolean).join(", "), nameList(f.more, agents)],
    [O ? `${O} ${O === 1 ? "offer" : "offers"}` : "No offers yet", M - O > 0 ? `${M - O} ${M - O === 1 ? "agent is" : "agents are"} still reading` : "", nameList(f.offers, agents)],
  ];
  const wrap = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [hov, setHov] = useState<{ i: number; x: number; y: number } | null>(null);
  const place = (i: number, cx: number, cy: number) => {
    const wb = wrap.current!.getBoundingClientRect();
    const tw = tipRef.current?.offsetWidth ?? 240;
    let x = cx - wb.left + 16; const y = cy - wb.top + 16;
    if (x + tw > wb.width - 8) x = cx - wb.left - tw - 16;
    setHov({ i, x, y });
  };
  return (
    <div ref={wrap} className={`hfC-w${hov ? " hv" : ""}`} data-vv2="funnel" onMouseLeave={() => setHov(null)}>
      <svg className="hfC" viewBox={`0 0 ${W} ${HT}`} role="img" aria-label={steps.map((s) => `${s[1]} ${s[0]}`).join(", ")}>
        <defs><clipPath id="vv2hfCl"><path d={sil} /></clipPath></defs>
        <g clipPath="url(#vv2hfCl)">
          {steps.map(([l, c], i) => (
            <rect key={l} className={`hfC-b${hov?.i === i ? " on" : ""}`} data-b={i} tabIndex={0} aria-label={TIPS[i][0]}
              x={0} y={i * H + (i ? g / 2 : 0)} width={W} height={H - (i ? g / 2 : 0) - (i < 3 ? g / 2 : 0)} fill={c ? cols[i] : "#ece6dc"}
              onMouseMove={(e) => place(i, e.clientX, e.clientY)}
              onFocus={(e) => { const r = (e.target as SVGRectElement).getBoundingClientRect(); place(i, r.left + r.width / 2, r.top + r.height / 2); }}
              onBlur={() => setHov(null)} />
          ))}
        </g>
        <g className="hfC-lb">
          {steps.map(([l, c], i) => (
            <text key={l} x={W / 2} y={i * H + H / 2 + 6} textAnchor="middle" className={`hfC-t${i && c ? " lt" : ""}`}>{c}<tspan dx={7}>{l.toLowerCase()}</tspan></text>
          ))}
        </g>
      </svg>
      {TIPS.map((t, i) => (
        <div key={i} ref={hov?.i === i ? tipRef : undefined} className="hfC-tip" data-tip={i} hidden={hov?.i !== i} role="tooltip"
          style={hov?.i === i ? { left: `${hov.x}px`, top: `${hov.y}px` } : undefined}>
          <b>{t[0]}</b>{t[1] ? <span>{t[1]}</span> : null}{t[2] ? <em>{t[2]}</em> : null}
        </div>
      ))}
    </div>
  );
};

/* ══ the version drawer (P8; the ref's `results`) ═════════════════════════════════════════════════════════ */

export interface VersionDrawerProps {
  m: VersionsModel; v: V2Version; rows: Map<string, AnalyticsRow>; agents: Map<string, Agent>;
  onClose: () => void; onEdit: (id: string) => void; onChange: (q: Query) => void; onPackage: (id: string) => void; locked: boolean;
}

export const VersionDrawer: React.FC<VersionDrawerProps> = ({ m, v, rows, agents, onClose, onEdit, onChange, onPackage, locked }) => {
  const f = m.facts.get(v.id)!;
  const use = v.id === m.inUse;
  const from = v.parentId ? m.versions.find((x) => x.id === v.parentId) ?? null : null;
  const fromF = from ? m.facts.get(from.id) ?? null : null;
  const reps = f.replied.length;
  const many = m.live.length > 1;
  return (
    <>
      <div className="dh vdh">
        <img className="vdh-art" src={SCROLLS} alt="" aria-hidden="true" />
        <div className="tx">
          <h3 id="cxDrwT">{v.name}</h3>
          <small>{v.original ? `Your original manuscript, as it went out before ${shortDay(v.createdDate)}` : `${versionLabel(v)} · saved ${longDay(v.createdDate)}`}{use ? " · in use" : ""}</small>
        </div>
        <button type="button" className="cx-x" aria-label="Close" onClick={onClose}><XMark /></button>
      </div>
      <div className="db vi">
        {v.original ? <p className="vi-orig"><b>Your original manuscript.</b> Every query sent before {shortDay(v.createdDate)} counts here. If one went out differently, change it below.</p> : null}
        <div className="vk2" data-vv2="stats">
          <div className="k0"><span>Sent</span><b>{f.n}</b><i>{f.n ? `since ${shortDay(msDay(f.firstMs))}` : "Not sent yet"}</i></div>
          <div className="k1"><span>Replied</span><b>{!f.n ? "–" : f.early ? reps : <>{f.repliedPct}<small>%</small></>}</b><i>{f.early && f.n ? `of ${f.n} · too early for a %` : `${reps} of ${f.n}`}</i></div>
          <div className="k2"><span>Asked for more</span><b>{!f.n ? "–" : f.early ? f.more.length : <>{f.ratePct}<small>%</small></>}</b><i>{f.early && f.n ? `of ${f.n} · too early for a %` : `${f.more.length} of ${f.n}`}</i></div>
          <div className="k3"><span>Average reply</span><b>{f.avgReply != null ? <>{f.avgReply}<small> days</small></> : "–"}</b><i>{f.replyN ? `from ${f.replyN} ${f.replyN === 1 ? "reply" : "replies"}` : "No replies yet"}</i></div>
        </div>
        {f.n ? <><div className="hf-hd"><h5>How far this version gets</h5></div><Funnel f={f} agents={agents} /></> : null}
        {v.original
          ? <><h5>Details</h5><p className="vi-m">From your manuscript details · {v.wordCount ? commas(v.wordCount) : "No word count"} words</p></>
          : from
            ? <><h5>What changed from {from.original ? "Original" : from.name}</h5>
                <Lineage parent={{ v: from, name: from.name, sub: outcomeLine(fromF), on: from.id === m.inUse, om: from.original }} changes={v.changes}
                  child={{ v, name: v.name, sub: outcomeLine(f), on: use }} /></>
            : <><h5>What changed</h5><Lineage parent={{ v: null, name: "Before this version", sub: "" }} changes={v.changes} child={{ v, name: v.name, sub: outcomeLine(f), on: use }} /></>}
        <h5>This version’s queries and where they stand</h5>
        {f.all.length ? (
          <div className="vi-q" data-vv2="queries">
            {f.all.map((q) => {
              const a = agentLine(q, agents);
              const days = rows.get(q.id)?.replyDays;
              return (
                <div className="cx-q" key={q.id}>
                  <span className="av">{a.initials}</span>
                  <div><b>{a.name}</b><small>{a.agency ? `${a.agency} · ` : ""}sent {shortDay(sentDay(q))}{typeof days === "number" ? ` · replied in ${days}d` : ""}{q.status === QueryStatus.WITHDRAWN ? " · not counted" : ""}</small></div>
                  <span className={`stt${f.more.includes(q) ? " hot" : ""}`}><Dot status={q.status} size={15} />{statusWord(q)}</span>
                  {many && !locked ? <button type="button" className="chg" data-vv2="change" onClick={() => onChange(q)}>Change</button> : null}
                </div>
              );
            })}
          </div>
        ) : <div className="cx-empq">Nothing has gone out with this version yet.</div>}
      </div>
      <div className="df">
        <span>{f.n ? null : <button type="button" className="cx-lnk" onClick={() => onPackage(v.id)}>Add to a package</button>}</span>
        <div className="bt">
          <button type="button" className="cx-b g" disabled={locked} onClick={() => onEdit(v.id)}>Edit</button>
          <button type="button" className="cx-b p" data-first onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  );
};

/* ══ the form (P9; the ref's `vform`) ════════════════════════════════════════════════════════════════════ */

export interface FormSave { name: string; changes: string[]; wordCount: number | null; parentId: string | null }
export interface VersionFormProps {
  ms: Manuscript; m: VersionsModel; edit: V2Version | null; earlier: number;
  onClose: () => void; onSave: (s: FormSave) => void; onDetails: () => void;
}

export const VersionForm: React.FC<VersionFormProps> = ({ ms, m, edit, earlier, onClose, onSave, onDetails }) => {
  const v = edit;
  const first = !v && !m.versions.length;
  const root = !!v && (v.original || !v.parentId);
  const sent = !!v && (m.facts.get(v.id)?.all.length ?? 0) > 0;
  const nSent = v ? m.facts.get(v.id)?.n ?? 0 : 0;
  const desc = useMemo(() => (v ? descendantsOf(m.versions, v.id) : new Set<string>()), [v, m.versions]);
  const opts = m.live.filter((x) => (!v || x.id !== v.id) && !desc.has(x.id));
  const [from, setFrom] = useState<string | null>(v ? v.parentId : first ? null : m.inUse ?? m.live[m.live.length - 1]?.id ?? null);
  const [name, setName] = useState(v ? v.name : "");
  const [list, setList] = useState<string[]>(v ? [...v.changes] : []);
  const [draft, setDraft] = useState("");
  const [words, setWords] = useState(v && !v.original && v.wordCount ? commas(v.wordCount) : "");
  const inp = useRef<HTMLInputElement>(null);
  const nm = name.trim();
  const dup = !root && !!nm && nameProblem(nm, m.versions, v?.id ?? null) === "taken";
  const full = list.length >= MAX_CHANGES;
  const ok = !!nm && !dup && (root || !changesProblem(list));
  const ready = dup ? "Choose a different name." : !nm ? "Give it a name." : !root && !list.length ? "Add at least one change." : first ? `Ready. Original is saved too, with your ${earlier} queries.` : "Ready to save.";
  const add = () => { const t = draft.trim(); if (!t || list.length >= MAX_CHANGES) return; setList([...list, t.slice(0, MAX_CHANGE_LEN)]); setDraft(""); inp.current?.focus(); };
  const p = first ? null : from ? m.versions.find((x) => x.id === from) ?? null : null;
  const pf = p ? m.facts.get(p.id) ?? null : null;
  const nextNum = v ? v.num : first ? 1 : Math.max(0, ...m.versions.map((x) => x.num)) + 1;
  const save = () => {
    if (!ok) return;
    const n = parseInt(words.replace(/\D/g, ""), 10);
    onSave({ name: nm, changes: cleanChanges(list), wordCount: Number.isFinite(n) && n > 0 ? n : null, parentId: first ? null : from });
  };
  return (
    <>
      <div className="dh vdh">
        <img className="vdh-art" src={SCROLLS} alt="" aria-hidden="true" />
        <div className="tx"><h3 id="cxDrwT">{v ? `Edit ${v.name}` : "Save a new version"}</h3><small>{ms.title}</small></div>
        <button type="button" className="cx-x" aria-label="Close" onClick={onClose}><XMark /></button>
      </div>
      <div className="db" data-vv2="form">
        {v && root
          ? <div className="fv-note"><span className="ic">i</span><p><b>Original is your manuscript as you first sent it.</b> Its name stays Original, and its word count comes from your <button type="button" className="cx-lnk" onClick={onDetails}>manuscript details</button>.</p></div>
          : sent ? <div className="fv-note"><span className="ic">i</span><p><b>Sent with {nSent} {nSent === 1 ? "query" : "queries"}.</b> Edits update its record here, not what agents received.</p></div> : null}
        {first && earlier ? <div className="fv-note" data-vv2="first-note"><span className="ic">i</span><p>You already have <b>{earlier} queries</b> out. We’ll assume the materials that went with them were part of your <em>original manuscript</em>. Don’t worry: if that’s not the case, it’s easy to update.</p></div> : null}
        {root ? null : (
          <div className="cx-sect"><h4><span className="n">1</span>Starts from</h4>
            {first
              ? <div className="vfrom"><button type="button" role="radio" aria-checked="true" disabled><i className="rd" /><b>Original</b><small>Your original manuscript</small></button></div>
              : <div className="vfrom" role="radiogroup" data-vv2="from">
                  {opts.map((x) => (
                    <button type="button" key={x.id} role="radio" aria-checked={from === x.id} disabled={sent} onClick={() => setFrom(x.id)}>
                      <i className="rd" /><b>{x.name}</b><small>{versionLabel(x)}{x.id === m.inUse ? " · in use" : ""}</small>
                    </button>
                  ))}
                </div>}
            <p className="fv-h">{first ? "Your new version is a change to it." : sent ? "This version has gone out, so where it started is fixed." : "Usually the one you’re sending now. Pick another to try a different direction from it."}</p>
          </div>
        )}
        <div className="cx-sect"><h4><span className="n">{root ? 1 : 2}</span>Name it</h4>
          <label className="cx-fld"><span>Version name <i className="req">*</i></span>
            <input className={`big${dup ? " bad" : ""}`} id="vName" data-first value={name} placeholder="e.g. Prologue cut" autoComplete="off" maxLength={MAX_VERSION_NAME} disabled={root} onChange={(e) => setName(e.target.value)} data-vv2="name" />
            <small className="fv-err" id="vErr" hidden={!dup}>{dup ? "You already have a version called this." : ""}</small>
          </label>
        </div>
        {root ? null : (
          <div className="cx-sect"><h4><span className="n">3</span>What changed?</h4>
            <p className="fv-h" style={{ marginTop: 0 }}>One change at a time, up to 8.</p>
            <div className="cg-in">
              <input id="cgIn" ref={inp} value={draft} placeholder={full ? "That’s the most one version can hold" : "e.g. Added a prologue"} autoComplete="off" maxLength={MAX_CHANGE_LEN} disabled={full}
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} data-vv2="change-in" />
              <button className="cx-b g" id="cgAdd" type="button" disabled={full} onClick={add}>Add</button>
            </div>
            <div className="cg-l" id="cgL">
              {list.map((c, i) => <span className="cg-c" key={i}><i>{i + 1}</i>{c}<button type="button" aria-label={`Remove ${c}`} onClick={() => setList(list.filter((_, k) => k !== i))}><XMark /></button></span>)}
            </div>
          </div>
        )}
        <div className="cx-sect">
          <label className="cx-fld" style={{ maxWidth: 220 }}><span>Word count<em style={{ fontStyle: "normal", color: "var(--cx-i45)" }}> · {root ? "from manuscript details" : "optional"}</em></span>
            <input id="vWords" inputMode="numeric" value={root ? (ms.wordCount ? commas(ms.wordCount) : "") : words} placeholder={ms.wordCount ? commas(ms.wordCount) : ""} disabled={root} onChange={(e) => setWords(e.target.value)} />
          </label>
        </div>
        {root ? null : (
          <>
            <h5>How it will look</h5>
            <div id="cgPv">
              <Lineage
                parent={first ? { v: { original: true, num: 0 }, name: "Original", sub: `Your original manuscript · ${earlier} queries`, om: true }
                  : { v: p, name: p ? p.name : "", sub: outcomeLine(pf), on: !!p && p.id === m.inUse, om: !!p?.original }}
                changes={list}
                child={{ v: { original: false, num: nextNum }, name: nm || "Your new version", sub: v ? outcomeLine(m.facts.get(v.id) ?? null) : "Used for new queries once it’s in a package" }} />
            </div>
          </>
        )}
      </div>
      <div className="df">
        <span id="vReady">{ready}</span>
        <div className="bt">
          <button type="button" className="cx-b g" onClick={onClose}>Cancel</button>
          <button type="button" className="cx-b p" id="vSave" disabled={!ok} onClick={save} data-vv2="save">{v ? "Save changes" : "Save version"}</button>
        </div>
      </div>
    </>
  );
};

/* ══ "Which version went?" (P10; the ref's `vpRow`, `fill` and `moveQ`) ══════════════════════════════════════ */

const PickRow: React.FC<{ i: number; q: Query; m: VersionsModel; agents: Map<string, Agent>; cur: string | null; open: boolean; onToggle: () => void; onPick: (id: string | null) => void }> = ({ i, q, m, agents, cur, open, onToggle, onPick }) => {
  const v = cur ? m.versions.find((x) => x.id === cur) ?? null : null;
  const sd = sentDay(q);
  const a = agentLine(q, agents);
  const list = [...m.live].sort((x, y) => y.num - x.num);
  const arch = [...m.archived].sort((x, y) => y.num - x.num);
  const yes = list.filter((x) => savedBy(x, sd)), no = list.filter((x) => !savedBy(x, sd));
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) (menu.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? menu.current?.querySelector<HTMLElement>(".vp-o"))?.focus(); }, [open]);
  const opt = (x: V2Version, ok: boolean) => (
    <button type="button" key={x.id} role="option" className="vp-o" aria-selected={x.id === cur} data-late={ok ? undefined : "1"} data-vv2="pick" onClick={() => onPick(x.id)}>
      <span className={`vl-n${x.id === m.inUse ? " on" : ""}`}><Num v={x} /></span>
      <span className="vp-ot"><b>{x.name}</b><small>{x.original ? "Your original manuscript" : `Saved ${shortDay(x.createdDate)}${ok || !sd ? "" : ` · ${laterBy(x.createdDate, sd)} later`}`}</small></span>
      {x.id === cur ? <i>✓</i> : null}
    </button>
  );
  return (
    <div className={`vp-row${open ? " open" : ""}`} data-vv2="pick-row">
      <span className="av">{a.initials}</span>
      <div className="vp-who"><b>{a.name}</b><small>{a.agency ? `${a.agency} · ` : ""}sent {shortDay(sd)}</small></div>
      <button type="button" className={`vp-b${v ? "" : " none"}`} data-vp={i} aria-haspopup="listbox" aria-expanded={open} onClick={onToggle} data-vv2="pick-trigger">
        {v ? <><span className={`vl-n${v.id === m.inUse ? " on" : ""}`}><Num v={v} /></span><span className="vp-t">{v.name}</span></> : <span className="vp-t">Not sure yet</span>}
        <Chevron />
      </button>
      {v && sd && !savedBy(v, sd) ? <p className="vp-w" role="status" data-vv2="late"><b>Are you sure?</b> {v.name} was saved {laterBy(v.createdDate, sd)} after you sent the query to {a.name}.</p> : null}
      {open ? (
        <div className="vp-m" role="listbox" aria-label={`Version sent to ${a.name}`} ref={menu}>
          {yes.map((x) => opt(x, true))}
          <button type="button" role="option" className="vp-o ns" aria-selected={!cur} onClick={() => onPick(null)}>
            <span className="vl-n">?</span><span className="vp-ot"><b>Not sure yet</b><small>Left out of the comparison for now</small></span>{!cur ? <i>✓</i> : null}
          </button>
          {no.length ? <><p className="vp-k">Saved after you sent this query</p>{no.map((x) => opt(x, false))}</> : null}
          {arch.length ? <><p className="vp-k">Archived</p>{arch.map((x) => opt(x, savedBy(x, sd)))}</> : null}
        </div>
      ) : null}
    </div>
  );
};

export type PickerMode = { kind: "assign" } | { kind: "change"; q: Query };
export const Picker: React.FC<{ mode: PickerMode; m: VersionsModel; agents: Map<string, Agent>; onClose: () => void; onSave: (picks: Map<string, string | null>) => void }> = ({ mode, m, agents, onClose, onSave }) => {
  const qs = mode.kind === "assign" ? m.unrecorded : [mode.q];
  const startOf = (q: Query) => (mode.kind === "change" ? m.resolved.get(q.id) ?? null : pickerDefault(q, m));
  const [ch, setCh] = useState<Map<string, string | null>>(() => new Map(qs.map((q) => [q.id, startOf(q)])));
  const [open, setOpen] = useState(mode.kind === "change" ? 0 : -1);
  if (mode.kind === "change") {
    const q = mode.q, was = m.resolved.get(q.id) ?? null, cur = ch.get(q.id) ?? null;
    const wasV = was ? m.versions.find((x) => x.id === was) : null;
    const who = agentLine(q, agents).name;
    const same = cur === was;
    return (
      <>
        <div className="cx-ph"><div className="tx"><h3 id="cxPkT">Which version went to {who}?</h3><small>Now counted under {wasV ? (wasV.original ? "the original" : wasV.name) : "no version"}</small></div><button type="button" className="cx-x" aria-label="Close" onClick={onClose}><XMark /></button></div>
        <div className="vp-list"><PickRow i={0} q={q} m={m} agents={agents} cur={cur} open={open === 0} onToggle={() => setOpen(open === 0 ? -1 : 0)} onPick={(id) => { setCh(new Map([[q.id, id]])); setOpen(-1); }} /></div>
        <div className="cx-pf">
          <span className="cx-nt" id="mvN">{same ? "Pick the version that went." : cur ? `Moves to ${m.versions.find((x) => x.id === cur)?.name}.` : "It will stay out of the comparison."}</span>
          <button type="button" className="cx-b g" onClick={onClose}>Cancel</button>
          <button type="button" className="cx-b p" id="mvS" disabled={same} onClick={() => onSave(ch)} data-vv2="pick-save">Save</button>
        </div>
      </>
    );
  }
  const n = [...ch.values()].filter(Boolean).length;
  return (
    <>
      <div className="cx-ph"><div className="tx"><h3 id="cxPkT">Which version went?</h3><small>{qs.length} {qs.length === 1 ? "query was" : "queries were"} sent without a version recorded.</small></div><button type="button" className="cx-x" aria-label="Close" onClick={onClose}><XMark /></button></div>
      <p className="cx-tip">Where only one version had been saved by the send date, we’ve picked it for you.</p>
      <div className="vp-list">
        {qs.map((q, i) => <PickRow key={q.id} i={i} q={q} m={m} agents={agents} cur={ch.get(q.id) ?? null} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)}
          onPick={(id) => { const next = new Map(ch); next.set(q.id, id); setCh(next); setOpen(-1); }} />)}
      </div>
      <div className="cx-pf">
        <span className="cx-nt" id="fiN">{n ? `${n} of ${qs.length} will be recorded` : "Nothing chosen yet"}</span>
        <button type="button" className="cx-b g" onClick={onClose}>Cancel</button>
        <button type="button" className="cx-b p" id="fiS" disabled={!n} onClick={() => onSave(new Map([...ch].filter(([, v]) => !!v)))} data-vv2="pick-save">Save</button>
      </div>
    </>
  );
};
export { VERSION_NOT_SURE };

/* ══ archive / delete (S04, S05; the ref's `archAsk`) ═════════════════════════════════════════════════════ */

export const ArchiveConfirm: React.FC<{ m: VersionsModel; v: V2Version; packageNames: string[]; onKeep: () => void; onGo: () => void }> = ({ m, v, packageNames, onKeep, onGo }) => {
  const f = m.facts.get(v.id)!;
  const q = f.all.length;
  const kids = m.versions.filter((x) => x.parentId === v.id);
  const par = v.parentId ? m.versions.find((x) => x.id === v.parentId) ?? null : null;
  const parName = par ? (par.original ? "Original" : par.name) : "Original";
  return (
    <>
      <div className="cx-ph"><div className="tx"><h3 id="cxPkT">{q ? "Archive" : "Delete"} {v.name}?</h3><small>{q ? `Sent with ${q} ${q === 1 ? "query" : "queries"}` : "Not sent yet"}</small></div><button type="button" className="cx-x" aria-label="Close" onClick={onKeep}><XMark /></button></div>
      <div className="ar-b" data-vv2="confirm-body">
        {q ? (
          <>
            <p>Archiving takes it off your list and out of the comparisons, so it stops competing with the versions you’re still sending.</p>
            <ul>
              <li><b>Its {q} {q === 1 ? "query keeps" : "queries keep"} their version.</b> Nothing about them changes.</li>
              <li><b>It still counts in your totals.</b></li>
              <li><b>You can bring it back</b> any time from Archived, at the foot of your list.</li>
            </ul>
          </>
        ) : (
          <>
            <p>It hasn’t gone out with any queries, so deleting it loses nothing you’ve tracked.</p>
            <ul>
              {kids.length
                ? <li><b>{kids.length === 1 ? `${kids[0].name} started` : `${kids.length} versions started`} from it.</b> {kids.length === 1 ? "It" : "They"}’ll start from {parName} instead.</li>
                : <li>It leaves the family tree too.</li>}
              {packageNames.length ? <li><b>It’s in {packageNames.join(", ")}.</b> {packageNames.length === 1 ? "That package" : "Those packages"} will have no version until you pick one.</li> : null}
              <li>You’ll have a few seconds to undo.</li>
            </ul>
          </>
        )}
      </div>
      <div className="cx-pf">
        <span className="cx-nt" />
        <button type="button" className="cx-b g" data-first onClick={onKeep}>Keep it</button>
        <button type="button" className="cx-b p ar-go" onClick={onGo} data-vv2="confirm-go">{q ? "Archive" : "Delete"}</button>
      </div>
    </>
  );
};

/* ══ the explainer (the ref's `how`) ═══════════════════════════════════════════════════════════════════════ */

export const Explainer: React.FC<{ onClose: () => void; onNew: () => void }> = ({ onClose, onNew }) => (
  <>
    <button type="button" className="cx-x lt" aria-label="Close" onClick={onClose}><XMark /></button>
    <div className="cx-explain">
      <div className="cx-xart"><img alt="" src={EXPLAINER} /></div>
      <div>
        <h4>How version tracking works</h4>
        <p>Prologue first? Fast-paced opening? A version is the same story told a different way. Save one each time the opening changes, and QueryHawk tracks which one goes out with each query.</p>
        <ul>
          <li><i>1</i><span><b>Save a version</b> when you cut a prologue, reorder chapters or rewrite pages.</span></li>
          <li><i>2</i><span><b>Put it in a package</b> on Submission packages. New queries send what that package holds.</span></li>
          <li><i>3</i><span><b>See what’s landing.</b> Each version shows how often agents asked to read more.</span></li>
        </ul>
      </div>
      <div className="cx-xf">Once a version has gone out, its record is fixed. You can still rename it.<button type="button" className="cx-lnk" onClick={onNew}>Save a version</button></div>
    </div>
  </>
);

export { DocMark };
