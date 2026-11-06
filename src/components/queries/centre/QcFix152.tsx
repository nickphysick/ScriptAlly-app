/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 §4 (screens 17–24) — EDITING. The pencil opens "What needs changing?" with three ways in:
 *   Fix a mistake            the record corrected; nothing new on the timeline (§4.2)
 *   Something changed since  a new step (the §3 form, every option shown)
 *   Edit the query's details who it went to, how it went (§4.6)
 *
 * ⚠️ NOTHING WRITES UNTIL SAVE; each Save is one batched write with Undo (lib/qc152Write, through the page).
 * ⚠️ THE NINE CHECKS (lib/qcLogic152) decide what is disabled: a menu option names its reason, a calendar greys the
 *    days that would put the steps out of order, and removing a step others depend on warns first, naming them.
 */
import React, { useContext, useMemo, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { STATE_LABEL } from "../../../lib/queryState";
import { matLabel, type PkgPatch, type StepMaterial } from "../../../lib/qc152Write";
import { dayBlocked, dependents, knock, STEP_LABEL, validate, type LogStep, type StepType } from "../../../lib/qcLogic152";
import { dayLabel, tintOf } from "../../../lib/qcThread152";
import { StepGlyph } from "./QcBubble152";
import { CalendarField, MatChips, MenuField, PopCtx, Pop, fullDay, type MatEnv } from "./QcEdit152";
import { Stepper, TOLD_MAX, TOLD_MIN, bolded, type RecordOutcome } from "./QcRecord152";
import "./qcv152edit.css";

const DAY = 86_400_000;
const PEN = <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z" /></svg>;
const NUDGE = <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="#1c130f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M7 12.5h6l-.9-1.2V9a2.1 2.1 0 0 0-4.2 0v2.3zM9.2 14h1.6" /></svg>;

/* ── §4.1 What needs changing? ─────────────────────────────────────────────────────────────────────────────── */

export const QcFork152: React.FC<{ first: string; onBack: () => void; onFix: () => void; onChanged: () => void; onDetails: () => void }> = (p) => (
  <div className="qc152-act" data-qc152="fork">
    <div className="qc152-acth">
      <button type="button" className="qc152-back" data-qc152="back" onClick={p.onBack}>← Back to {p.first}’s query</button>
      <h2 className="qc152-h2">What needs changing?</h2>
    </div>
    <div className="qc152-actb">
      <div className="qc152-fork">
        <button type="button" className="qc152-fk" data-qc152="fork-fix" onClick={p.onFix}>
          <span className="qc152-fi">{PEN}</span>
          <span><b>Fix a mistake</b><em>Something was recorded wrong: a date, a step, or what you sent. Corrects the record; nothing new goes on the timeline.</em></span>
          <span className="qc152-ar">→</span>
        </button>
        <button type="button" className="qc152-fk" data-qc152="fork-changed" onClick={p.onChanged}>
          <span className="qc152-fi">{NUDGE}</span>
          <span><b>Something changed since</b><em>{p.first} replied, you sent something, or you nudged. Adds it to the timeline as a new step.</em></span>
          <span className="qc152-ar">→</span>
        </button>
        <button type="button" className="qc152-fk lite" data-qc152="fork-details" onClick={p.onDetails}>
          <span className="qc152-fi">⋯</span>
          <span><b>Edit the query’s details</b><em>Who it went to, and how you sent it.</em></span>
          <span className="qc152-ar">→</span>
        </button>
      </div>
    </div>
    <div className="qc152-ftA"><button type="button" className="qc152-ghost" data-qc152="cancel" onClick={p.onBack}>Cancel</button></div>
  </div>
);

/* ── §4.2 Fix a mistake ─────────────────────────────────────────────────────────────────────────────────────── */

export type FixKind = StepType;
export interface FixRow { id: string; t: StepType; d: number; mats: StepMaterial[]; isNew?: boolean; told?: { count: number; deadlineMs: number } | null }
export interface PkgChoice { id: string; name: string; edition: number; draft: boolean; madeMs: number; mats: StepMaterial[] }
export interface QcFix152Props {
  first: string;
  nowMs: number;
  rows: FixRow[];
  /** the step to open on (✎ Edit on a bubble) */
  focusId: string | null;
  env: MatEnv;
  /** Pro and founding: the packages for Query sent; the one on it now */
  packages: PkgChoice[] | null;
  pkgNow: { id: string; edition: number | null; name: string } | null;
  now: RecordOutcome;
  after: (rows: FixRow[]) => RecordOutcome;
  busy: boolean;
  onBack: () => void;
  onSave: (rows: FixRow[], removed: string[], pkg: PkgPatch | null) => Promise<boolean>;
}
const SIDE: Record<StepType, "them" | "me"> = { queried: "me", preq: "them", psent: "me", freq: "them", fsent: "me", rr: "them", offer: "them", nudge: "me", passed: "them", noresp: "me", withdrawn: "me", told: "me" };
const T_STATUS: Partial<Record<StepType, QueryStatus>> = {
  queried: QueryStatus.QUERIED, preq: QueryStatus.PARTIAL_REQUESTED, psent: QueryStatus.PARTIAL_SENT, freq: QueryStatus.FULL_REQUESTED, fsent: QueryStatus.FULL_SENT, rr: QueryStatus.REVISE_RESUBMIT,
  offer: QueryStatus.OFFER, passed: QueryStatus.REJECTED, noresp: QueryStatus.NO_RESPONSE, withdrawn: QueryStatus.WITHDRAWN,
};
void StatusDot;
/** v152.1 §2.2 the glyph is ink on nothing (grey for a pass and your closes), as in the thread */
const gl = (t: StepType) => (
  <span className={`qc152-g0${t === "passed" || t === "noresp" || t === "withdrawn" ? " grey" : ""}`}>
    {StepGlyph({ status: T_STATUS[t] ?? null, kind: t === "nudge" ? "nudge" : t === "told" ? "told" : null })}
  </span>
);
/** §2.9 the step's bubble colours: yours paper, theirs in their stage colour */
const tintFor = (t: StepType) => (SIDE[t] === "me" ? null : tintOf({ status: T_STATUS[t] ?? null, kind: null }));
const TYPES: StepType[] = ["queried", "preq", "psent", "freq", "fsent", "rr", "offer", "nudge", "passed", "noresp"];
const lab = (t: StepType, f: string) => (t === "nudge" ? `You nudged ${f}` : STEP_LABEL[t]);
const sameTold = (a: FixRow["told"], b: FixRow["told"]) => (a?.count ?? null) === (b?.count ?? null) && new Date(a?.deadlineMs ?? 0).toDateString() === new Date(b?.deadlineMs ?? 0).toDateString();
const sameMats = (a: StepMaterial[], b: StepMaterial[]) => JSON.stringify(a) === JSON.stringify(b);
/** the package check (Nick's ruling): letter, synopsis and version only — the sample's amount stays the step's */
const pkgKey = (ms: StepMaterial[]) => JSON.stringify({
  l: ms.find((m) => m.kind === "letter")?.name ?? null, s: ms.find((m) => m.kind === "synopsis")?.name ?? null,
  v: ms.find((m) => m.kind === "sample" || m.kind === "full")?.versionId ?? null,
});

export const QcFix152: React.FC<QcFix152Props> = (p) => {
  const api = useContext(PopCtx);
  const c = { nowMs: p.nowMs, first: p.first };
  const [rows, setRows] = useState<FixRow[]>(() => p.rows.map((r) => ({ ...r, mats: r.mats.map((m) => ({ ...m })) })));
  const [removed, setRemoved] = useState<string[]>([]);
  const [ask, setAsk] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(p.focusId);
  const [stage, setStage] = useState<"details" | "changes">("details");
  const [pkgId, setPkgId] = useState<string | null>(p.pkgNow?.id ?? null);
  const [insWhy, setInsWhy] = useState<string | null>(null);
  const live = rows.filter((r) => !removed.includes(r.id));
  const log: LogStep[] = live.map((r) => ({ id: r.id, t: r.t, d: r.d }));
  const V = useMemo(() => validate(log, c), [JSON.stringify(log)]); // eslint-disable-line react-hooks/exhaustive-deps
  const orig = new Map(p.rows.map((r) => [r.id, r]));
  const pkg = p.packages?.find((x) => x.id === pkgId) ?? null;
  const qs = live.find((r) => r.t === "queried");
  const offPkg = !!pkg && !!qs && pkgKey(qs.mats) !== pkgKey(pkg.mats);
  const pkgEffective = pkg && !offPkg ? pkg.id : null;
  const pkgChanged = (p.pkgNow?.id ?? null) !== pkgEffective;
  const changes = useMemo(() => {
    const out: { g: StepType; txt: string; was?: string; now?: string }[] = [];
    for (const r of live) {
      const o = orig.get(r.id);
      if (!o || r.isNew) { out.push({ g: r.t, txt: `**${lab(r.t, p.first)}**`, now: dayLabel(r.d, p.nowMs) }); continue; }
      if (o.t !== r.t) out.push({ g: r.t, txt: `${lab(o.t, p.first)} is now **${lab(r.t, p.first)}**` });
      if (new Date(o.d).toDateString() !== new Date(r.d).toDateString()) out.push({ g: r.t, txt: lab(r.t, p.first), was: dayLabel(o.d, p.nowMs), now: dayLabel(r.d, p.nowMs) });
      if (!sameMats(o.mats, r.mats)) out.push({ g: r.t, txt: `${lab(r.t, p.first)}: what went changed` });
      if (r.t === "told" && !sameTold(o.told, r.told)) out.push({ g: r.t, txt: `${lab(r.t, p.first)}: ${r.told?.count ?? 0} agents, deadline ${r.told ? dayLabel(r.told.deadlineMs, p.nowMs) : "none"}` });
    }
    for (const id of removed) { const o = orig.get(id); if (o) out.push({ g: o.t, txt: `Removed **${o.t === "nudge" ? "your nudge" : STEP_LABEL[o.t]}**`, was: dayLabel(o.d, p.nowMs) }); }
    if (pkgChanged && p.packages) out.push({ g: "queried", txt: "Package", was: p.pkgNow?.name ?? "None", now: pkg && !offPkg ? pkg.name : "None (a one-off)" });
    return out;
  }, [JSON.stringify(rows), removed, pkgEffective]); // eslint-disable-line react-hooks/exhaustive-deps
  const setRow = (id: string, patch: Partial<FixRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const sorted = [...live].sort((a, b) => a.d - b.d);

  if (stage === "changes") {
    const a = p.after(live);
    const lines: string[] = [];
    if (String(a.status) !== String(p.now.status)) lines.push(`Where it stands changes from **${STAGE_NAME[p.now.status as QueryStatus] ?? p.now.status}** to **${STAGE_NAME[a.status as QueryStatus] ?? a.status}**.`);
    lines.push(a.state !== p.now.state ? `It moves from **${STATE_LABEL[p.now.state]}** to **${STATE_LABEL[a.state]}**.` : `It stays **${STATE_LABEL[a.state]}**.`);
    if (pkgChanged && p.packages) lines.push(pkgEffective ? `This query now counts in **${pkg!.name}**’s results${p.pkgNow ? `, not ${p.pkgNow.name}’s` : ""}.${pkg!.draft ? ` ${pkg!.name} goes on query and locks.` : ""}` : `This query no longer counts in ${p.pkgNow?.name ?? "the package"}’s results. It’s a one-off.`);
    if (lines.length === 1) lines.push("Nothing else on the page moves.");
    return (
      <div className="qc152-act" data-qc152="fix" data-stage="changes">
        <div className="qc152-acth">
          <button type="button" className="qc152-back" data-qc152="back" onClick={() => setStage("details")}>← Back to the details</button>
          <h2 className="qc152-h2">Fix a mistake</h2>
          <Stepper on={2} first="The details" />
        </div>
        <div className="qc152-actb"><div className="qc152-diff">
          <h4>You changed</h4>
          {changes.map((x, i) => (
            <div key={i} className="qc152-dr" data-qc152="change"><span className="qc152-gd sm">{gl(x.g)}</span><span>{bolded(x.txt)}</span>
              {x.was ? <span className="qc152-was">{x.was}</span> : <span />}{x.was && x.now ? <span className="qc152-to">→</span> : <span />}{x.now ? <span className="qc152-now">{x.now}</span> : <span />}</div>
          ))}
          <h4>Which means</h4>
          <ul className="qc152-cons" data-qc152="consequences">{lines.map((l, i) => <li key={i}>{bolded(l)}</li>)}</ul>
          <p className="qc152-safe">This corrects the record. It doesn’t add a step. You can undo it straight after saving.</p>
        </div></div>
        <div className="qc152-ftA">
          <button type="button" className="qc152-ghost" onClick={() => setStage("details")}>Back</button>
          <button type="button" className="qc152-pbtn" data-qc152="save-fix" disabled={p.busy}
            onClick={() => { void p.onSave(live, removed, pkgChanged && p.packages ? { id: pkgEffective, name: pkg?.name ?? null, edition: pkg?.edition ?? null, was: p.pkgNow ? { id: p.pkgNow.id, edition: p.pkgNow.edition } : null } : null); }}>Save the fix</button>
        </div>
      </div>
    );
  }

  const insertBetween = (a: FixRow, b: FixRow) => {
    const d = a.d + Math.max(DAY, Math.floor((b.d - a.d) / 2));
    for (const t of TYPES) {
      if (t === "queried") continue;
      const id = `new-${Math.random().toString(36).slice(2, 8)}`;
      if (!knock(log, [...log, { id, t, d }], id, c)) {
        setRows((rs) => [...rs, { id, t, d, mats: [], isNew: true }]);
        setSel(id);
        return null;
      }
    }
    return "No step fits between these two dates.";
  };
  return (
    <div className="qc152-act" data-qc152="fix" data-stage="details">
      <div className="qc152-acth">
        <button type="button" className="qc152-back" data-qc152="back" onClick={p.onBack}>← What needs changing?</button>
        <h2 className="qc152-h2">Fix a mistake</h2>
        <Stepper on={1} first="The details" />
      </div>
      <div className="qc152-actb">
        <p className="qc152-lede">Change anything that was recorded wrong. Nothing is saved until you see what changes.</p>
        <ol className="qc152-fsteps" data-qc152="fix-steps">
          {sorted.map((r, i) => {
            const o = orig.get(r.id);
            const changed = !o || r.isNew || o.t !== r.t || new Date(o.d).toDateString() !== new Date(r.d).toDateString() || !sameMats(o.mats, r.mats) || (r.t === "told" && !sameTold(o.told, r.told));
            const tint = tintFor(r.t);
            const bad = V.err.get(r.id);
            const opts = TYPES.map((t) => ({ key: t, label: lab(t, p.first), glyph: gl(t), why: t === r.t ? "" : knock(log, log.map((x) => (x.id === r.id ? { ...x, t } : x)), r.id, c) }));
            const deps = ask === r.id ? dependents(log, r.id, c) : [];
            const next = sorted[i + 1];
            return (
              <React.Fragment key={r.id}>
                <li className={`qc152-fs ${SIDE[r.t]}${changed ? " ch" : ""}${bad ? " bad" : ""}${sel === r.id ? " sel" : ""}`} data-qc152="fix-step" data-id={r.id} data-t={r.t}
                  data-changed={changed ? "" : undefined} data-bad={bad ? "" : undefined} data-selected={sel === r.id ? "" : undefined} onFocusCapture={() => setSel(r.id)}
                  style={tint ? ({ ["--bt" as string]: tint.fill, ["--be" as string]: tint.edge } as React.CSSProperties) : undefined}>
                  <span className="qc152-gd">{gl(r.t)}</span>
                  <div className="qc152-fsb">
                    <div className="qc152-edr">
                      {r.t === "told" ? <span className="qc152-ftl" data-qc152="told-label">{lab(r.t, p.first)}</span>
                        : <MenuField id={`t:${r.id}`} value={r.t} label={lab(r.t, p.first)} options={opts} wide onPick={(k) => setRow(r.id, { t: k as StepType })} />}
                      <CalendarField id={`d:${r.id}`} valueMs={r.d} nowMs={p.nowMs}
                        blocked={(dm) => dayBlocked(dm, { nowMs: p.nowMs, check: (x) => knock(log, log.map((y) => (y.id === r.id ? { ...y, d: x + 12 * 3600_000 } : y)), r.id, c) ? "Out of order" : "" })}
                        onChange={(dm) => setRow(r.id, { d: dm + 12 * 3600_000 })} />
                      <button type="button" className="qc152-rm" data-qc152="remove" aria-label={`Remove ${lab(r.t, p.first)}`} disabled={r.t === "queried"} onClick={() => setAsk(ask === r.id ? null : r.id)}>✕</button>
                    </div>
                    {ask === r.id ? (
                      <div className="qc152-rmq" data-qc152="remove-ask">
                        <p><b>Remove “{lab(r.t, p.first)}” ({dayLabel(r.d, p.nowMs)})?</b>{deps.length ? <> {deps.map((d) => `“${lab(d.t, p.first)}” (${dayLabel(d.d, p.nowMs)})`).join(" and ")} {deps.length > 1 ? "depend" : "depends"} on it, so {deps.length > 1 ? "they’d" : "it’d"} go too.</> : null}</p>
                        <div>
                          <button type="button" className="qc152-dbtn" data-qc152="remove-yes" onClick={() => { setRemoved((x) => [...x, r.id, ...deps.map((d) => d.id)]); setAsk(null); }}>{deps.length ? `Remove ${deps.length + 1} steps` : "Remove"}</button>
                          <button type="button" className="qc152-ghost sm" data-qc152="remove-no" onClick={() => setAsk(null)}>Keep it</button>
                        </div>
                      </div>
                    ) : null}
                    {bad ? <div className="qc152-err" data-qc152="fix-why">{bad}</div> : o && !r.isNew && new Date(o.d).toDateString() !== new Date(r.d).toDateString() ? <div className="qc152-wasl">was {dayLabel(o.d, p.nowMs)}</div> : r.isNew ? <div className="qc152-wasl">added</div> : null}
                    {r.t === "queried" && p.packages ? <PkgRow choices={p.packages} pkgId={pkgId} stepMs={r.d} off={offPkg} onPick={(id) => {
                      setPkgId(id);
                      const k = p.packages!.find((x) => x.id === id);
                      if (k) setRow(r.id, { mats: fillFromPkg(r.mats, k) });
                    }} onBack={() => { if (pkg) setRow(r.id, { mats: fillFromPkg(r.mats, pkg) }); }} /> : null}
                    {r.t === "told" && r.told ? (
                      <div className="qc152-ftold" data-qc152="fix-told">
                        <span className="qc152-stp" role="group" aria-label="How many agents">
                          <button type="button" aria-label="Fewer" disabled={r.told.count <= TOLD_MIN} onClick={() => setRow(r.id, { told: { ...r.told!, count: Math.max(TOLD_MIN, r.told!.count - 1) } })}>−</button>
                          <b data-qc152="told-n">{r.told.count}</b>
                          <button type="button" aria-label="More" disabled={r.told.count >= TOLD_MAX} onClick={() => setRow(r.id, { told: { ...r.told!, count: Math.min(TOLD_MAX, r.told!.count + 1) } })}>+</button>
                        </span>
                        <span className="qc152-ftx">agents, deadline</span>
                        <CalendarField id={`tb:${r.id}`} valueMs={r.told.deadlineMs} nowMs={p.nowMs} future blocked={(dm) => (dm < new Date(r.d).setHours(0, 0, 0, 0) ? "Before the day you told them" : "")}
                          onChange={(dm) => setRow(r.id, { told: { ...r.told!, deadlineMs: dm } })} />
                      </div>
                    ) : null}
                    {r.t !== "nudge" && r.t !== "passed" && r.t !== "noresp" && r.t !== "withdrawn" && r.t !== "offer" && r.t !== "told" ? (
                      <MatChips id={`m:${r.id}`} mats={r.mats} env={p.env} stepMs={r.d} request={r.t === "preq" || r.t === "freq"} onChange={(m) => setRow(r.id, { mats: m })} />
                    ) : null}
                  </div>
                </li>
                {next ? (
                  <li className="qc152-w qc152-ins" data-qc152="fix-wait"><i /><span>{Math.max(0, Math.round((next.d - r.d) / DAY))} days</span>
                    <button type="button" data-qc152="insert" onClick={() => setInsWhy(insertBetween(r, next))}>+ Add a step I missed</button><i /></li>
                ) : null}
              </React.Fragment>
            );
          })}
        </ol>
        {insWhy ? <p className="qc152-gerr" data-qc152="insert-why">{insWhy}</p> : null}
        {removed.length ? (
          <p className="qc152-rmd" data-qc152="removing">Removing: {removed.map((id) => { const o = orig.get(id); return o ? <span key={id}>{lab(o.t, p.first)} ({dayLabel(o.d, p.nowMs)}) <button type="button" data-qc152="keep" onClick={() => setRemoved((x) => x.filter((y) => y !== id))}>Keep</button> </span> : null; })}</p>
        ) : null}
      </div>
      <div className="qc152-ftA">
        <button type="button" className="qc152-ghost" data-qc152="cancel" onClick={p.onBack}>Cancel</button>
        <span className="qc152-chg" data-qc152="fix-count">{!V.ok ? <><b>{V.err.size + V.glob.length} to fix</b> · </> : null}{changes.length ? `${changes.length} change${changes.length > 1 ? "s" : ""}` : "No changes yet"}</span>
        <button type="button" className="qc152-pbtn" data-qc152="see-changes" disabled={!changes.length || !V.ok} onClick={() => { api.setOpen(null); setStage("changes"); }}>See what changes →</button>
      </div>
    </div>
  );
};

/** a package fills the letter and synopsis chips and sets the sample's version; the amount stays the step's (Nick) */
function fillFromPkg(cur: StepMaterial[], k: PkgChoice): StepMaterial[] {
  const out: StepMaterial[] = [];
  const l = k.mats.find((m) => m.kind === "letter"), s = k.mats.find((m) => m.kind === "synopsis"), v = k.mats.find((m) => m.kind === "sample" || m.kind === "full")?.versionId ?? null;
  if (l) out.push({ ...l });
  if (s) out.push({ ...s });
  const sample = cur.find((m) => m.kind === "sample");
  if (sample || k.mats.some((m) => m.kind === "sample")) out.push({ ...(sample ?? k.mats.find((m) => m.kind === "sample")!), kind: "sample", versionId: v });
  for (const m of cur) if (m.kind === "other") out.push(m);
  return out;
}

const PkgRow: React.FC<{ choices: PkgChoice[]; pkgId: string | null; stepMs: number; off: boolean; onPick: (id: string) => void; onBack: () => void }> = ({ choices, pkgId, stepMs, off, onPick, onBack }) => {
  const api = useContext(PopCtx);
  const btn = React.useRef<HTMLButtonElement>(null);
  const open = api.open === "pkg";
  const cur = choices.find((x) => x.id === pkgId) ?? null;
  return (
    <>
      <div className="qc152-pkr" data-qc152="pkg-row"><span className="qc152-pkl0">Package</span>
        <span className="qc152-qsel">
          <button ref={btn} type="button" className={`qc152-pkb${cur ? " on" : ""}`} data-qc152="pkg-btn" data-pop-anchor="" onClick={() => api.setOpen(open ? null : "pkg")}>
            {cur ? <><b>{cur.name}</b><em>{cur.draft ? "draft" : "on query"}</em></> : <em>None · was this sent as a package?</em>}
          </button>
          {open ? (
            <Pop anchor={btn} className="qc152-menu" data="pkg-menu">
              <div className="qc152-mph"><b>Which package went?</b><em>Its letter, synopsis and sample fill in for you.</em></div>
              {choices.map((k) => {
                const late = k.madeMs > stepMs + DAY;
                return (
                  <button key={k.id} type="button" className={`qc152-qo${k.id === pkgId ? " sel" : ""}`} data-qc152="pkg-opt" data-id={k.id} onClick={() => { onPick(k.id); api.setOpen(null); }}>
                    <span><b>{k.name}</b><em>{k.mats.map((m) => matLabel(m)).join(" · ")}</em>
                      {k.draft ? <em>Still a draft. Picking it puts it on query and locks it.</em> : null}
                      {late ? <em data-qc152="pkg-late">Made {Math.round((k.madeMs - stepMs) / DAY)} days after you sent this. Are you sure?</em> : null}</span>
                    {k.id === pkgId ? <i>✓</i> : null}
                  </button>
                );
              })}
            </Pop>
          ) : null}
        </span>
      </div>
      {off && cur ? <div className="qc152-pkoff" data-qc152="pkg-off">These aren’t {cur.name}’s contents any more, so this query will count as a one-off, not in {cur.name}’s results. <button type="button" data-qc152="pkg-back" onClick={onBack}>Put {cur.name} back</button></div> : null}
    </>
  );
};

/* ── §4.6 Edit the query's details ──────────────────────────────────────────────────────────────────────────── */

export interface AgentChoice { id: string; name: string; agency: string; initials: string; queried: boolean; weeks: number | null }
export const SEND_BY = [["Email", "Email"], ["QueryManager", "QueryManager"], ["Online form", "Online form"], ["Post", "Post"]] as const;
export interface QcDetails152Props {
  first: string;
  nowMs: number;
  agentId: string;
  sendMethod: string;
  agents: AgentChoice[];
  whatWent: string[];
  pkgName: string | null;
  asks: string[];
  missing: string[];
  replyWeeks: number | null;
  /** the reply-expected date now, and under another agent's window */
  replyNow: number | null;
  replyFor: (agentId: string) => number | null;
  free: boolean;
  busy: boolean;
  onBack: () => void;
  onFixQuerySent: () => void;
  onAgentCard: () => void;
  onSave: (next: { agentId: string; sendMethod: string }) => Promise<boolean>;
}
export const QcDetails152: React.FC<QcDetails152Props> = (p) => {
  const api = useContext(PopCtx);
  const [agentId, setAgentId] = useState(p.agentId);
  const [via, setVia] = useState(p.sendMethod || "Email");
  const [find, setFind] = useState("");
  const btn = React.useRef<HTMLButtonElement>(null);
  const open = api.open === "agent";
  const cur = p.agents.find((a) => a.id === agentId);
  const was = p.agents.find((a) => a.id === p.agentId);
  const chg = [agentId !== p.agentId ? "agent" : null, via !== (p.sendMethod || "Email") ? "via" : null].filter(Boolean) as string[];
  const also: string[] = [];
  if (agentId !== p.agentId && cur) {
    also.push(`The query moves from ${was?.name ?? "the agent"}’s history to **${cur.name}**’s. Its timeline comes with it.`);
    const nd = p.replyFor(agentId);
    if (nd != null) also.push(`Reply expected follows ${cur.name.split(" ")[0]}’s reply time${cur.weeks ? ` (about ${cur.weeks} weeks)` : ""}: ${p.replyNow != null ? `${dayLabel(p.replyNow, p.nowMs)} → ` : ""}**${dayLabel(nd, p.nowMs)}**.`);
  }
  if (via !== (p.sendMethod || "Email")) also.push(`“Query sent” reads **by ${via === "Online form" ? "an online form" : via === "Post" ? "post" : via === "Email" ? "email" : via}**.`);
  const list = [...p.agents].sort((a, b) => Number(a.queried && a.id !== p.agentId) - Number(b.queried && b.id !== p.agentId) || a.name.localeCompare(b.name))
    .filter((a) => !find || `${a.name} ${a.agency}`.toLowerCase().includes(find.toLowerCase()));
  const row = (k: string, label: string, ctl: React.ReactNode, wasTxt?: string) => (
    <div className={`qc152-drow${chg.includes(k) ? " ch" : ""}`} data-qc152="detail-row" data-k={k}><span className="qc152-dl">{label}</span>
      <div className="qc152-dc">{ctl}{chg.includes(k) && wasTxt ? <div className="qc152-wasl">was {wasTxt}</div> : null}</div></div>
  );
  return (
    <div className="qc152-act" data-qc152="details">
      <div className="qc152-acth">
        <button type="button" className="qc152-back" data-qc152="back" onClick={p.onBack}>← What needs changing?</button>
        <h2 className="qc152-h2">Edit the query’s details</h2>
      </div>
      <div className="qc152-actb">
        <p className="qc152-lede">Who it went to and how you sent it. Dates and replies live on the timeline.</p>
        {row("agent", "Sent to", (
          <span className="qc152-qsel wide">
            <button ref={btn} type="button" className="qc152-qsb qc152-agb" data-qc152="agent-btn" data-pop-anchor="" onClick={() => api.setOpen(open ? null : "agent")}>
              <span className="qc152-ddisc">{cur?.initials ?? "?"}</span><span className="qc152-agn"><b>{cur?.name ?? "Choose an agent"}</b><em>{cur?.agency ?? ""}</em></span>
            </button>
            {open ? (
              <Pop anchor={btn} className="qc152-menu qc152-dm" data="agent-menu">
                <div className="qc152-dfind"><input data-qc152="agent-find" autoFocus placeholder="Find an agent or agency" value={find} onChange={(e) => setFind(e.target.value)} /></div>
                {list.map((a) => {
                  const taken = a.queried && a.id !== p.agentId;
                  return (
                    <button key={a.id} type="button" className={`qc152-qo${a.id === agentId ? " sel" : ""}${taken ? " dis" : ""}`} data-qc152="agent-opt" data-id={a.id} disabled={taken}
                      onClick={() => { setAgentId(a.id); api.setOpen(null); }}>
                      <span className="qc152-ddisc">{a.initials}</span>
                      <span><b>{a.name}</b><em>{a.agency}{taken ? " · already queried for this manuscript" : a.queried ? "" : " · not queried yet"}</em></span>
                      {a.id === agentId ? <i>✓</i> : null}
                    </button>
                  );
                })}
                {!list.length ? <p className="qc152-mpn">No agent by that name on your Contact list.</p> : null}
                <p className="qc152-mpn">Not on your list? Add them on the Contact list first.</p>
              </Pop>
            ) : null}
          </span>
        ), was?.name)}
        {row("via", "Sent by", (
          <span className="qc152-dseg2" role="radiogroup" aria-label="Sent by">
            {SEND_BY.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={via === k} data-qc152="via" data-v={k} onClick={() => setVia(k)}>{l}</button>)}
          </span>
        ), p.sendMethod)}
        {row("went", "What went", (
          <>
            <div className="qc152-mc">{!p.free && p.pkgName ? <span className="qc152-pkc">{p.pkgName}</span> : null}{p.whatWent.map((w) => <i key={w}>{w}</i>)}</div>
            {p.asks.length ? (p.missing.length
              ? <p className="qc152-dfit warn">{p.first} asks for {p.asks.join(", ").toLowerCase()}. This doesn’t include <b>{p.missing.join(", ").toLowerCase()}</b>.</p>
              : <p className="qc152-dfit ok">✓ Matches what {p.first} asks for.</p>) : null}
            <button type="button" className="qc152-dlink" data-qc152="fix-query-sent" onClick={p.onFixQuerySent}>✎ Change what went on the “Query sent” step</button>
          </>
        ))}
        {row("reply", "Reply time", (
          <>
            <p className="qc152-dtxt">{p.replyWeeks != null ? <>{p.first} replies in about <b>{p.replyWeeks} weeks</b>. It comes from {p.first}’s card, so it’s the same for every query you send them.</> : <>{p.first}’s reply time isn’t recorded.</>}</p>
            <button type="button" className="qc152-dlink" data-qc152="agent-card" onClick={p.onAgentCard}>✎ Change it on {p.first}’s card</button>
          </>
        ))}
        {also.length ? <div className="qc152-also" data-qc152="also"><b>This also changes</b><ul>{also.map((x, i) => <li key={i}>{bolded(x)}</li>)}</ul></div> : null}
      </div>
      <div className="qc152-ftA">
        <button type="button" className="qc152-ghost" data-qc152="cancel" onClick={p.onBack}>Cancel</button>
        <span className="qc152-chg">{chg.length ? `${chg.length} change${chg.length > 1 ? "s" : ""}${also.length ? ` · ${also.length} knock-on` : ""}` : "No changes yet"}</span>
        <button type="button" className="qc152-pbtn" data-qc152="save-details" disabled={!chg.length || p.busy} onClick={() => { void p.onSave({ agentId, sendMethod: via }); }}>Save details</button>
      </div>
    </div>
  );
};
void fullDay;
