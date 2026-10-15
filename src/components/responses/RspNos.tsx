/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 Part C — THE NOS: the blush banner, the hand-drawn tally, and every rejection and no-reply close in a
 * white list sheet under a navy row.
 *
 * ⚠️ THE ROWS ARE `listNos` (lib/responses): the kind (shared with the header card's rows), the search and the sort.
 *    Sorted by Answered, they group under month dividers (`monthGroups`); any other sort is one list.
 * ⚠️ THE NAVY ROW AND THE HEADING STRIP PIN TOGETHER at 12px under the sheet's lip, decided from a zero-height
 *    sentinel above the sheet with the Query Centre's hysteresis (`nextPinned`, copied), derived on every scroll and
 *    never from an observer; the month dividers stick under the pinned stack (`--rs-stack`, measured).
 * ⚠️ PAGE-LOCAL COPIES of v138's sheet, its top row, its search and its heading strip (packages v4 copies them too).
 * ⚠️ `gateSVG` IS THE REFERENCE'S, PORTED WHOLE: one gate per five nos, seeded so each gate's jitter never changes.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FAR_WORDS, listNos, monthGroups, monthYear, nextPinned, respDate, saidLine, tallyPlan, tallySince,
  type NoKind, type NoSort, type RespItem,
} from "../../lib/responses";
import type { QcRow } from "../../lib/qcSummary";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../lib/shortcuts";

type Item = RespItem<QcRow>;
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ── the tally's gates: the reference's `gateSVG` and its seeded jitter, unchanged ── */
function seeded(n: number): () => number { let t = n; return () => { t = (t * 1103515245 + 12345) % 2147483648; return t / 2147483648; }; }
export function gatePaths(n: number, ghost: boolean, seed: number): { ink: string[]; ghost: string[] } {
  const r = seeded(seed), j = () => (r() - 0.5) * 2.2;
  const ink: string[] = [], gh: string[] = [];
  for (let k = 0; k < 4; k++) {
    const x = 6 + k * 9;
    const d = `M${x + j()} ${4 + j()} Q ${x + j() * 1.5} 22 ${x + j()} ${40 + j()}`;
    if (k < n) ink.push(d); else if (ghost) gh.push(d);
  }
  const cross = `M${-1 + j()} ${30 + j()} L ${40 + j()} ${10 + j()}`;
  if (n === 5) ink.push(cross); else if (ghost) gh.push(cross);
  return { ink, ghost: gh };
}
const Gate: React.FC<{ n: number; ghost: boolean; seed: number; fresh?: boolean; opacity?: number }> = ({ n, ghost, seed, fresh, opacity }) => {
  const p = gatePaths(n, ghost, seed);
  return (
    <svg width="54" height="57" viewBox="0 0 42 44" className={fresh ? "is-new" : undefined} aria-hidden="true" data-rsp="gate" data-n={n}
      style={opacity != null ? { opacity } : undefined}>
      {p.ghost.length ? <g fill="none" stroke="#1c130f" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="2.5 3.5" opacity={0.34}>{p.ghost.map((d) => <path key={d} d={d} />)}</g> : null}
      {p.ink.length ? <g fill="none" stroke="#1c130f" strokeWidth={2.4} strokeLinecap="round" opacity={0.86} data-rsp="gate-ink">{p.ink.map((d) => <path key={d} d={d} />)}</g> : null}
    </svg>
  );
};

export const RspTally: React.FC<{ items: Item[] }> = ({ items }) => {
  const nos = items.filter((i) => i.group !== "more");
  const N = nos.length;
  const rej = nos.filter((i) => i.group === "passed").length;
  const since = tallySince(items);
  const box = useRef<HTMLDivElement | null>(null);
  const [perRow, setPerRow] = useState(13);
  useLayoutEffect(() => {
    const read = () => { const w = box.current?.clientWidth ?? 0; if (w > 0) setPerRow(Math.max(4, Math.floor((w + 26) / 80))); };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  /* the newest stroke draws in after a no is recorded on this visit (never on arrival) */
  const lastN = useRef(N);
  const fresh = N > lastN.current;
  useEffect(() => { lastN.current = N; }, [N]);
  const plan = tallyPlan(N, perRow);
  return (
    <section className="rsp-tallysec" data-rsp="tally" aria-label="Your tally">
      <div className="rsp-hrow">
        <h2 className="rsp-hrow-h">Your tally</h2>
        {since != null ? <span className="rsp-hrow-m" data-rsp="tally-since">ONE MARK FOR EACH NO, SINCE {monthYear(since).toUpperCase()}</span> : null}
      </div>
      <div className="rsp-tally" ref={box}>
        <div className="rsp-marks" role="img" aria-label={`${N} tally ${N === 1 ? "mark" : "marks"}, one for each no`} data-rsp="marks">
          {plan.gates.map((n, gi) => <Gate key={`g${gi}`} n={n} ghost={gi === plan.gates.length - 1} seed={N * 31 + gi} fresh={fresh && gi === plan.gates.length - 1} />)}
          {Array.from({ length: plan.ghosts }, (_, k) => {
            const gi = plan.gates.length + k;
            return <span key={`h${gi}`} data-rsp="ghost-gate"><Gate n={0} ghost seed={gi * 17 + 5} opacity={Math.max(0.15, 1 - (k / plan.ghosts) * 0.85)} /></span>;
          })}
        </div>
        <div className="rsp-tfoot">
          <span className="rsp-tcap" data-rsp="tally-cap">{rej} {rej === 1 ? "rejection" : "rejections"}{N - rej ? `, ${N - rej} no reply` : ""}</span>
          {N < 5 ? <span className="rsp-thint" data-rsp="tally-hint">Each no you record adds a mark here.</span> : null}
        </div>
      </div>
    </section>
  );
};

export const RspBanner: React.FC = () => (
  <div className="rsp-banner" data-rsp="banner">
    <span>Rejection is part of querying. Every no below is one most published writers have had too.</span>
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3v13M4.5 11 10 16.5 15.5 11" /></svg>
  </div>
);

/** v138.1's in-sheet search: `/` focuses it from anywhere outside a field (the registry's `respFind`); Escape clears it */
const SheetSearch: React.FC<{ value: string; onChange: (v: string) => void; active: boolean }> = ({ value, onChange, active }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    const key = (e: KeyboardEvent) => {
      if (!matchesShortcut(SHORTCUTS.respFind, e) || isEditableTarget(e.target)) return;
      if (!ref.current || ref.current.getClientRects().length === 0) return;
      e.preventDefault();
      ref.current.focus();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active]);
  return (
    <label className="rsp-search" data-rsp="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input ref={ref} value={value} placeholder="Find an agent" aria-label="Find an agent or agency" autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && value) { e.preventDefault(); e.stopPropagation(); onChange(""); } }} />
      <kbd aria-hidden="true">/</kbd>
    </label>
  );
};

const Hl: React.FC<{ text: string; find: string }> = ({ text, find }) => {
  const f = find.trim();
  const i = f ? text.toLowerCase().indexOf(f.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + f.length)}</mark>{text.slice(i + f.length)}</>;
};

const SORT_WORDS: Record<NoSort, [string, string]> = { date: ["newest", "oldest"], wait: ["longest wait", "shortest wait"], agent: ["agent, Z to A", "agent, A to Z"] };

export const RspList: React.FC<{
  items: Item[];
  nowMs: number;
  kind: NoKind | null;
  onKind: (k: NoKind | null) => void;
  selectedId: string | null;
  onOpen: (i: Item) => void;
  active: boolean;
  /** the rows the panel's ↑ ↓ walk: the list as it is shown */
  onVisible?: (ids: string[]) => void;
}> = ({ items, nowMs, kind, onKind, selectedId, onOpen, active, onVisible }) => {
  const [find, setFind] = useState("");
  const [sort, setSort] = useState<NoSort>("date");
  const [desc, setDesc] = useState(true);
  const all = items.filter((i) => i.group !== "more");
  const N = all.length;
  const nr = all.filter((i) => i.group === "passed").length;
  const nq = N - nr;
  const list = listNos(items, { kind, find, sort, desc });
  const filtered = !!kind || !!find.trim();
  const visKey = list.map((i) => i.id).join("|");
  useEffect(() => { onVisible?.(list.map((i) => i.id)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [visKey]);

  const pressSort = (k: NoSort) => {
    if (sort === k) setDesc((d) => !d);
    else { setSort(k); setDesc(k !== "agent"); }
  };
  const clear = () => { onKind(null); setFind(""); };

  /* ── the pin: a sentinel above the sheet, read on every scroll of the page's scroller ── */
  const sheet = useRef<HTMLElement | null>(null);
  const sentinel = useRef<HTMLElement | null>(null);
  const pinwrap = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);
  useLayoutEffect(() => {
    const el = sheet.current, sn = sentinel.current, pw = pinwrap.current;
    const sc = el?.closest<HTMLElement>(".wpg-scroll");
    if (!el || !sn || !pw || !sc) return undefined;
    let was = false;
    const measure = () => {
      const h = pw.offsetHeight;
      el.style.setProperty("--rs-stack", `${12 + h}px`);
      /* a row brought into view by the keyboard lands below the pinned stack, not under it */
      sc.style.setProperty("--wpg-scroll-pad", `${12 + h + 8}px`);
    };
    const read = () => {
      const top = sc.getBoundingClientRect().top;
      const next = nextPinned(was, sn.getBoundingClientRect().top - top, el.getBoundingClientRect().bottom - top);
      if (next !== was) { was = next; setPinned(next); }
    };
    measure();
    read();
    sc.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(pw);
    return () => { sc.removeEventListener("scroll", read); window.removeEventListener("resize", read); ro?.disconnect(); sc.style.removeProperty("--wpg-scroll-pad"); };
  }, []);

  const toTop = () => {
    const sc = sheet.current?.closest<HTMLElement>(".wpg-scroll");
    sc?.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
    document.querySelector<HTMLElement>('[data-rsp="title"]')?.focus({ preventScroll: true });
  };

  const sortTxt = SORT_WORDS[sort][desc ? 0 : 1];
  const head = (k: NoSort | null, label: string, cls = "") => {
    if (!k) return <span className={`rsp-hl ${cls}`}>{label}</span>;
    const on = sort === k;
    return (
      <button type="button" className={`rsp-hl ${cls}${on ? " is-on" : ""}`} data-rsp="sort" data-sort={k}
        aria-sort={on ? (desc ? "descending" : "ascending") : "none"} onClick={() => pressSort(k)}>
        {label}{on ? <i aria-hidden="true">{desc ? " ↓" : " ↑"}</i> : null}
      </button>
    );
  };
  const row = (i: Item) => {
    const said = saidLine(i);
    return (
      <button key={i.id} type="button" className="rsp-row rsp-gr" data-rsp="row" data-id={i.id} data-kind={i.group}
        data-ans={i.answerMs ?? undefined} data-wait={i.waitDays ?? undefined} data-surname={i.row.agentName.trim().split(/\s+/).pop()?.toLowerCase()}
        aria-current={selectedId === i.id ? "true" : undefined} onClick={() => onOpen(i)}
        aria-label={`${i.row.agentName}, ${i.group === "passed" ? "passed" : "no reply"}${i.answerMs != null ? `, ${respDate(i.answerMs, nowMs)}` : ""}. Open.`}>
        <span className="rsp-ag">
          <span className={`rsp-dsc rsp-dsc--${i.group}`} aria-hidden="true">{i.row.initials}</span>
          <span className="rsp-agt"><b><Hl text={i.row.agentName} find={find} /></b><i><Hl text={i.row.agency} find={find} /></i></span>
        </span>
        <span className="rsp-said">
          <span className={`rsp-tag rsp-tag--${i.group}`} data-rsp="tag">{i.group === "passed" ? "Passed" : "No reply"}</span>
          {said.quote ? <small data-rsp="said"><q>{said.quote}</q></small> : said.text ? <small data-rsp="said">{said.text}</small> : null}
        </span>
        <span className="rsp-dt rsp-c-q">{i.queriedMs != null ? respDate(i.queriedMs, nowMs) : ""}</span>
        <span className="rsp-dt rsp-c-a">{i.answerMs != null ? respDate(i.answerMs, nowMs) : ""}</span>
        <span className="rsp-wt">{i.waitDays != null ? <>{i.waitDays}<small>{i.waitDays === 1 ? "day" : "days"}</small></> : null}</span>
        <span className="rsp-far rsp-c-n">{FAR_WORDS[i.furthest]}</span>
      </button>
    );
  };

  return (
    <>
      <i className="rsp-sentinel" ref={sentinel as React.Ref<HTMLElement>} aria-hidden="true" data-rsp="pin-sentinel" />
      <section className="rsp-ws rsp-list" ref={sheet} data-rsp="list" aria-label="Every no" data-pinned={pinned ? "true" : undefined}>
        <div className="rsp-pinwrap" ref={pinwrap} data-rsp="pinwrap">
          <div className="rsp-wsh" data-rsp="list-top">
            <p className="rsp-say" data-rsp="list-say">
              {filtered
                ? <>Showing <b data-rsp="shown">{list.length}</b> <span className="rsp-dim">of</span> {N} <span className="rsp-dim">nos, sorted by</span> <u>{sortTxt}</u>
                    <button type="button" className="rsp-clear" data-rsp="clear" onClick={clear}>Clear</button></>
                : <>The nos<span className="rsp-dim">, all</span> {N}<span className="rsp-dim">, sorted by</span> <u>{sortTxt}</u></>}
            </p>
            <div className="rsp-seg" role="group" aria-label="Show" data-rsp="seg">
              {([[null, "All", N], ["passed", "Passed", nr], ["noReply", "No reply", nq]] as [NoKind | null, string, number][]).map(([k, l, c]) => (
                <button key={l} type="button" data-rsp="seg-btn" data-k={k ?? "all"} aria-pressed={kind === k} onClick={() => onKind(k)}>{l} <small>{c}</small></button>
              ))}
            </div>
            {pinned ? <button type="button" className="rsp-sumbtn" data-rsp="summary" onClick={toTop}>{"↑"} Summary</button> : null}
            <SheetSearch value={find} onChange={setFind} active={active} />
          </div>
          <div className="rsp-heads rsp-gr" data-rsp="heads">
            {head("agent", "Agent")}
            {head(null, "What they said")}
            {head(null, "Queried", "rsp-c-q")}
            {head("date", "Answered", "rsp-c-a")}
            {head("wait", "Wait", "rsp-r")}
            {head(null, "Got as far as", "rsp-c-n")}
          </div>
        </div>
        <div className="rsp-lbody" data-rsp="list-body">
          {list.length === 0 ? (
            <div className="rsp-dead" data-rsp="no-match">
              <b>Nothing matches {"“"}{find.trim()}{"”"}</b>
              <p>Try the agency{"’"}s name, or part of the agent{"’"}s surname.</p>
              <button type="button" className="rsp-btn rsp-btn--wht rsp-btn--sm" onClick={clear}>Clear</button>
            </div>
          ) : sort === "date" ? (
            monthGroups(list).map((g) => (
              <div key={g.key} className="rsp-grp" data-rsp="month">
                <div className="rsp-mband" data-rsp="month-band"><b>{g.label}</b><span>{g.items.length} {g.items.length === 1 ? "NO" : "NOS"}</span></div>
                <div className="rsp-rows">{g.items.map(row)}</div>
              </div>
            ))
          ) : <div className="rsp-rows">{list.map(row)}</div>}
          <div className="rsp-lpad" aria-hidden="true" />
        </div>
        <div className="rsp-lfoot" data-rsp="list-foot">
          <span className="rsp-key"><span><u className="rsp-sw--passed" />Passed</span><span><u className="rsp-sw--noReply" />No reply</span></span>
          <p>A query you close after its reply time counts as no reply.</p>
        </div>
      </section>
    </>
  );
};
