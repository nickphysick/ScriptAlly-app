/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18 §F — HOUSEKEEPING, REBUILT. The floating tab and the dismissal are v17.1's; the drawer is new:
 *
 *   intro  shown once per account (`todoPrefs.contacts.hkIntroSeen`), the first time it opens with a gap
 *   home   Up next, then every gap by missing detail (slate-band cards, in points order) or by agent
 *   focus  one question at a time, in Housekeeping's own order; Skip moves a task to the end; Save writes through
 *          the page's existing save path (`onFix`) and floats "+n" in the top layer
 *
 * ⚠️ NOTHING HERE DECIDES A GAP OR WRITES A FIELD. The gaps and their order are `hkModel`'s; the score is
 *    `lib/listHealth`'s; every save is `onFix`, the path the old drawer used, with its Undo (7s, in the footer).
 * ⚠️ THE "+n" POPS ARE `position: fixed` IN A PORTAL AT THE END OF THE BODY, so they rise over the drawer's edge and
 *    the top bar and are never clipped by the drawer's own `overflow: hidden`.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Agent } from "../../../types";
import {
  GAP_LABEL, firstNameOf, gapCopy, genreChips, longDayLabel, reopenChips, wishlistCheckin,
  type GapKey, type HkBook, type HkItem, type HkModel, type Run,
} from "../../../lib/contactHousekeeping";
import type { WishlistEvery } from "../../../lib/contactPrefs";
import { POINTS, POINTS_LINE, POINTS_ORDER, agentPct, appliesTo, minutesFor, type Health } from "../../../lib/listHealth";
import { bookGenreHit } from "../../../lib/genreMatch";
import { matsOf, type CardMats } from "../../../lib/cardDraft";
import { agentInitials } from "../../../lib/agentDisplay";
import { isDoorClosed } from "../../../lib/agentList";
import { MaterialsField, Stepper } from "../card/cardInputs";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { FloatingTab, TabRing } from "../../shell/FloatingTab";
import { AgentPaperCard, type PaperCardData } from "../../shared/AgentPaperCard";
import { HK_HAWK, SessionModal, TabNote, type FixResult, type HkFix, type HkHandlers, type Session } from "./ContactHousekeeping";
import "./housekeeping.css";
import "./housekeepingV18.css";

export interface HousekeepingDrawerProps extends HkHandlers {
  model: HkModel;
  checkin: ReturnType<typeof wishlistCheckin>;
  every: WishlistEvery;
  book: HkBook;
  today: Date;
  agents: readonly Agent[];
  open: boolean;
  tabShown: boolean;
  onDismissTab: () => void;
  tabNote: { onUndo: () => void } | null;
  onOpen: () => void;
  onClose: () => void;
  view: "detail" | "agent";
  onView: (v: "detail" | "agent") => void;
  routeActive: boolean;
  keyHint?: string;
  /** v18 §F.1 — List health: the page ring, the tab and this drawer read the same object */
  health: Health;
  /** v18 §F.3 — the intro's flag, saved to the account */
  introSeen: boolean;
  onIntroSeen: () => void;
}

/* ── words ──────────────────────────────────────────────────────────────────────────────────── */

export const QUESTION: Record<GapKey, (first: string) => string> = {
  reply: (f) => `How long does ${f} take to reply?`,
  materials: (f) => `What does ${f} want you to send?`,
  genres: (f) => `Which genres does ${f} take?`,
  wishlist: (f) => `What is ${f} hoping to find?`,
  reopen: (f) => `When does ${f} reopen to queries?`,
};
export const UNLOCK: Record<GapKey, string> = {
  reply: "Due dates and follow-ups on every query you send.",
  materials: "The package, listed the moment you log a query.",
  genres: "Ticks the agents who take what you write, before you query.",
  wishlist: "Their own words, to judge fit and tailor your letter.",
  reopen: "A reminder on your to-do list when a closed agent reopens.",
};
const DETAIL_NAME: Record<GapKey, string> = { reply: "Reply time", materials: "What to send", genres: "Genres", wishlist: "Wishlist", reopen: "Reopening" };
export const HK_FOOT_V18 = "We only ask for details that make QueryHawk more useful to you.";
const nameOf = (a: Agent) => (a.name ?? "").trim() || (a.agency ?? "").trim();

/** the intro's example agent: fixed sample content, never stored and never counted */
export const INTRO_AGENT: PaperCardData = {
  status: "none", statusLabel: "Not yet queried", stars: 3, initials: "RC", name: "Rosa Calder", agency: "Penhallow Literary",
  city: "London", weeks: 6, website: "penhallowliterary.co.uk", email: "rosa@penhallowliterary.co.uk",
  genres: [{ label: "Literary fiction", hit: true }, { label: "Upmarket", hit: false }, { label: "Book club", hit: false }],
  wishlist: "Novels with a strong sense of place and a narrator worth following. Quiet family stories especially welcome.",
  materials: [{ label: "Query letter", kind: "doc" }, { label: "Synopsis 1pp", kind: "doc" }, { label: "First 10 pages", kind: "pages" }],
};
const INTRO_GHOST: PaperCardData = { ...INTRO_AGENT, statusLabel: "", stars: null };

const RunsText: React.FC<{ runs: Run[] }> = ({ runs }) => (
  <>{runs.map((r, i) => (typeof r === "string" ? <React.Fragment key={i}>{r}</React.Fragment> : "em" in r ? <em key={i}>{r.em}</em> : <b key={i}>{r.b}</b>))}</>
);

const Plus: React.FC<{ n: number; probe?: string }> = ({ n, probe }) => <span className="hk8-pts" data-hk8={probe ?? "pts"}>+{n}</span>;
const Dot: React.FC<{ a: Agent; size?: number }> = ({ a, size = 32 }) => (
  <span className="hk8-dot" style={{ width: size, height: size }} aria-hidden="true">{agentInitials(a).slice(0, 2)}</span>
);

/* ── the score: counts up, the ring bumps ──────────────────────────────────────────────────────── */

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useCountUp(target: number): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduced() || from.current === target) { from.current = target; setShown(target); return undefined; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (target - a) * e));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = target; };
  }, [target]);
  return shown;
}

const HeadRing: React.FC<{ pct: number; bump: number; ringRef: React.Ref<HTMLSpanElement> }> = ({ pct, bump, ringRef }) => {
  const r = 46, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return (
    <span key={bump} className={`hk8-ring${bump ? " is-bump" : ""}`} data-hk8="ring" ref={ringRef}>
      <svg viewBox="0 0 104 104" aria-hidden="true">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#d9734f" strokeWidth="8" />
        {p > 0 ? <circle cx="52" cy="52" r={r} fill="none" stroke="#f4eee5" strokeWidth="8" strokeLinecap="butt" strokeDasharray={`${(c * p) / 100} ${c}`} transform="rotate(-90 52 52)" /> : null}
      </svg>
      <span className="hk8-ring-h"><img src={`${HK_HAWK.src}?v=${HK_HAWK.version}`} alt="" /></span>
    </span>
  );
};

/* ── the pops, in the top layer ───────────────────────────────────────────────────────────────── */

type Pop = { id: number; x: number; y: number; n: number; big: boolean };
const Pops: React.FC<{ pops: Pop[] }> = ({ pops }) => (typeof document === "undefined" ? null : createPortal(
  <>{pops.map((p) => <span key={p.id} className={`hk8-pop${p.big ? " big" : ""}`} data-hk8="pop" style={{ left: p.x, top: p.y }}>+{p.n}</span>)}</>,
  document.body,
));

/* ── one question's field: the existing controls and option lists ─────────────────────────────── */

const matsOk = (m: CardMats) => (m.ql || m.syn.on || m.smp.on || m.oth.on) && !(m.oth.on && !m.oth.text.trim());

const FocusField: React.FC<{ item: HkItem; book: HkBook; today: Date; agents: readonly Agent[]; onAnswer: (fix: HkFix | null) => void }> = ({ item, book, today, agents, onAnswer }) => {
  const a = item.agent;
  const [weeks, setWeeks] = useState<number | null>(null);
  const [mats, setMats] = useState<CardMats>(() => matsOf([]));
  const [picked, setPicked] = useState<string[]>([]);
  const [wish, setWish] = useState("");
  const [on, setOn] = useState<string | null>(null);
  const chips = useMemo(() => genreChips(book.genre, agents.flatMap((x) => x.genres ?? [])), [book.genre, agents]);
  const peer = useMemo(() => {
    const k = (a.agency ?? "").trim().toLowerCase();
    const ws = k ? agents.filter((x) => x.id !== a.id && (x.agency ?? "").trim().toLowerCase() === k).map((x) => x.responseTimeWeeks).filter((w): w is number => typeof w === "number" && w > 0) : [];
    return ws.length ? Math.round(ws.reduce((s, w) => s + w, 0) / ws.length) : null;
  }, [a, agents]);
  switch (item.gap) {
    case "reply":
      return (
        <div className="hk8-field" data-hk8="field" data-gap="reply">
          <Stepper ae="hk8-weeks" text={weeks === null ? "Not set" : `${weeks} week${weeks === 1 ? "" : "s"}`} dec={weeks === null || weeks > 1} inc={weeks === null || weeks < 26}
            onStep={(d) => { const n = weeks === null ? (peer ?? 6) : Math.max(1, Math.min(26, weeks + d)); setWeeks(n); onAnswer({ kind: "weeks", weeks: n }); }} />
          <button type="button" className={`hk8-chip${weeks === -1 ? " on" : ""}`} data-hk8="not-stated" aria-pressed={weeks === -1}
            onClick={() => { setWeeks(-1); onAnswer({ kind: "settled" }); }}>{weeks === -1 ? "✓ " : ""}They don’t say</button>
        </div>
      );
    case "materials":
      return (
        <div className="hk8-field" data-hk8="field" data-gap="materials">
          <MaterialsField mats={mats} onMats={(m) => { setMats(m); onAnswer(matsOk(m) ? { kind: "mats", mats: m } : null); }} />
        </div>
      );
    case "genres": {
      const hit = bookGenreHit(book.genres.length ? book.genres : book.genre ? [book.genre] : []);
      return (
        <div className="hk8-field hk8-chips" data-hk8="field" data-gap="genres">
          {chips.map((g) => {
            const sel = picked.includes(g);
            return (
              <button key={g} type="button" className={`hk8-chip${sel ? " on" : ""}`} aria-pressed={sel} data-hk8="genre-chip"
                onClick={() => { const next = sel ? picked.filter((x) => x !== g) : [...picked, g]; setPicked(next); onAnswer(next.length ? { kind: "genres", genres: next } : null); }}>
                {sel ? "✓ " : ""}{g}{hit(g) ? " · your book" : ""}
              </button>
            );
          })}
        </div>
      );
    }
    case "wishlist":
      return (
        <div className="hk8-field" data-hk8="field" data-gap="wishlist">
          <textarea className="hk8-ta" data-hk8="wish" maxLength={400} value={wish} aria-label={QUESTION.wishlist(firstNameOf(a))}
            placeholder="e.g. Twisty thrillers set outside London; strong women at the centre."
            onChange={(e) => { setWish(e.target.value); onAnswer(e.target.value.trim() ? { kind: "wishlist", text: e.target.value.trim() } : null); }} />
        </div>
      );
    case "reopen":
      return (
        <div className="hk8-field hk8-chips" data-hk8="field" data-gap="reopen">
          {reopenChips(today).map((c) => (
            <button key={c.label} type="button" className={`hk8-chip${on === c.value ? " on" : ""}`} aria-pressed={on === c.value} data-hk8="remind-chip"
              onClick={() => { setOn(c.value); onAnswer({ kind: "remind", on: c.value }); }}>{on === c.value ? "✓ " : ""}{c.label}</button>
          ))}
        </div>
      );
    default: {
      const unhandled: never = item.gap;
      return unhandled;
    }
  }
};

/* ── the drawer ─────────────────────────────────────────────────────────────────────────────────── */

type Mode = "intro" | "home" | "focus";
type Run8 = { keys: string[]; name: string | null; total: number };

export const HousekeepingDrawer: React.FC<HousekeepingDrawerProps> = (p) => {
  const { model, book, today, agents, open, health } = p;
  const items = model.items;
  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);

  const [mode, setMode] = useState<Mode>("home");
  const [run, setRun] = useState<Run8 | null>(null);
  const [answer, setAnswer] = useState<HkFix | null>(null);
  const [whereOpen, setWhereOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ key: string; label: string; n: number }[]>([]);
  const [pips, setPips] = useState<string[]>([]);
  const [pulse, setPulse] = useState<string | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [bump, setBump] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [foot, setFoot] = useState<{ text: string; undo?: () => Promise<boolean> } | null>(null);
  const [how, setHow] = useState(false);
  const [ses, setSes] = useState<Session | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const saveRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  /* on open: the intro once, with a gap; home every other time. The pips are the gaps at the time of opening. */
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      setMode(!p.introSeen && items.length > 0 ? "intro" : "home");
      setRun(null); setDone([]); setPips(items.map((i) => i.key)); setFoot(null); setBanner(null);
    }
    if (!open && wasOpen.current) { setSes(null); setHow(false); }
    wasOpen.current = open;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const held = useCountUp(health.held);
  const pct = health.possible > 0 ? Math.round((100 * held) / health.possible) : 0;

  /* the queue: the run's keys still open, in order; the current task is its first */
  const pending = run ? run.keys.filter((k) => byKey.has(k)) : [];
  const cur = pending.length ? byKey.get(pending[0]) ?? null : null;
  useEffect(() => { setAnswer(null); setWhereOpen(false); }, [cur?.key]);
  /* a run that has run out: home, or the complete screen when nothing is left at all */
  useEffect(() => { if (mode === "focus" && run && pending.length === 0 && items.length > 0) { setRun(null); setMode("home"); } }, [mode, run, pending.length, items.length]);

  const startFocus = (keys: string[], name: string | null, first?: string) => {
    const ordered = first ? [first, ...keys.filter((k) => k !== first)] : keys;
    setRun({ keys: ordered, name, total: ordered.length });
    setMode("focus");
  };
  const wholeQueue = (first?: string) => startFocus(items.map((i) => i.key), null, first);
  const skip = () => { if (!run || !cur) return; setRun({ ...run, keys: [...run.keys.filter((k) => k !== cur.key), cur.key] }); };

  const sayFoot = (text: string, undo?: () => Promise<boolean>) => {
    setFoot({ text, undo });
    later(() => setFoot((f) => (f && f.text === text ? null : f)), 7000);
  };

  const pop = (el: Element | null, n: number, big: boolean, dy: number) => {
    if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setPops((ps) => [...ps, { id, x: r.left + r.width / 2, y: r.top - dy, n, big }]);
    later(() => setPops((ps) => ps.filter((x) => x.id !== id)), 1300);
  };

  const save = async () => {
    if (!cur || !answer || busy) return;
    const item = cur, n = POINTS[item.gap];
    setBusy(true);
    const r: FixResult = await p.onFix(item, answer);
    setBusy(false);
    if ("error" in r) { sayFoot(`Couldn’t save that: ${r.error}`); return; }
    sayFoot(r.line, r.undo);
    pop(saveRef.current, n, false, 30);
    pop(ringRef.current, n, true, 20);
    setBump((b) => b + 1);
    setPulse(item.key); later(() => setPulse((k) => (k === item.key ? null : k)), 600);
    setDone((d) => [...d, { key: item.key, label: `${DETAIL_NAME[item.gap]} for ${firstNameOf(item.agent)}`, n }]);
    const others = (model.gapsById.get(item.agent.id) ?? []).filter((g) => g !== item.gap);
    if (others.length === 0) { const t = `✓ ${firstNameOf(item.agent)}’s profile is complete`; setBanner(t); later(() => setBanner((b) => (b === t ? null : b)), 2200); }
    if (!reduced()) { setLeaving(true); later(() => setLeaving(false), 320); }
  };

  /* ── the header ── */
  const gapsLeft = items.length;
  const head = (
    <div className="hk8-head" data-hk8="head">
      <HeadRing pct={pct} bump={bump} ringRef={ringRef} />
      <div className="hk8-score" data-hk8="score">
        <span className="hk8-lh">List health</span>
        <b className="hk8-n" data-hk8="pct">{health.pct === null ? "" : <>{pct}<i>%</i></>}</b>
        <p className="hk8-pl" data-hk8="points">
          {gapsLeft > 0
            ? <><b>{held}</b> of {health.possible} points · <b>{gapsLeft}</b> {gapsLeft === 1 ? "gap" : "gaps"} left · about {minutesFor(gapsLeft)} min</>
            : "every detail filled in"}
        </p>
        <button type="button" className="hk8-how" data-hk8="how" aria-expanded={how} onClick={() => setHow((v) => !v)}>How points work</button>
        {how ? (
          <div className="hk8-howpop" data-hk8="how-pop" role="dialog" aria-label="How points work">
            <table><tbody>
              {POINTS_ORDER.map((g) => <tr key={g}><td>{DETAIL_NAME[g]}{g === "reopen" ? " (closed agents)" : ""}</td><td>{POINTS[g]}</td></tr>)}
            </tbody></table>
            <p>{POINTS_LINE}</p>
          </div>
        ) : null}
      </div>
      {done.length ? <span className="hk8-today" data-hk8="today">{done.length} done today</span> : <span />}
      <button type="button" className="hk8-x" data-hk8="close" aria-label="Close Housekeeping" onClick={p.onClose}>✕</button>
      {pips.length ? (
        <div className="hk8-pips" data-hk8="pips" aria-hidden="true">
          {pips.map((k) => <i key={k} data-done={!byKey.has(k) || done.some((d) => d.key === k) ? "" : undefined} data-pulse={pulse === k ? "" : undefined} />)}
        </div>
      ) : null}
    </div>
  );

  /* ── intro ── */
  const intro = (
    <div className="hk8-intro" data-hk8="intro">
      <h3 className="hk8-ih">In smart querying, <br />data is <em>everything.</em></h3>
      <div className="hk8-icols">
        <div className="hk8-icol">
          <b className="hk8-ipct dim">33%</b>
          <p>With gaps, QueryHawk can only tell you who they are.</p>
          <AgentPaperCard variant="ghost" data={INTRO_GHOST} className="hk8-tilt" />
        </div>
        <div className="hk8-icol">
          <b className="hk8-ipct">100%</b>
          <p>Complete, it tracks fit, packages, reply dates and your next move.</p>
          <AgentPaperCard variant="framed" data={INTRO_AGENT} />
        </div>
      </div>
      <div className="hk8-iacts">
        <button type="button" className="hk8-ln" data-hk8="not-now" onClick={() => { p.onIntroSeen(); p.onClose(); }}>Not now</button>
        <button type="button" className="hk8-go" data-hk8="intro-start" onClick={() => { p.onIntroSeen(); wholeQueue(); }}>Start with the most useful gap →</button>
      </div>
    </div>
  );

  /* ── home ── */
  const first = items[0] ?? null;
  const upNext = first ? (
    <div className="hk8-up" data-hk8="up-next">
      <span className="hk8-k">Up next</span>
      <div className="hk8-uprow">
        <Dot a={first.agent} />
        <span className="hk8-upq">
          <b>{QUESTION[first.gap](firstNameOf(first.agent))}</b>
          <i>{(first.agent.agency ?? "").trim()}{first.live ? <em> · you’ve queried them</em> : null}</i>
        </span>
        <Plus n={POINTS[first.gap]} />
        <button type="button" className="hk8-go sm" data-hk8="up-start" onClick={() => wholeQueue(first.key)}>Start →</button>
      </div>
      <div className="hk8-upf">
        <span><b>{items.length} {items.length === 1 ? "gap" : "gaps"}</b> in all · about {minutesFor(items.length)} min</span>
        <button type="button" className="hk8-lnk" data-hk8="fill-all" onClick={() => wholeQueue()}>Fill them all in, one at a time →</button>
      </div>
    </div>
  ) : (
    <div className="hk8-up done" data-hk8="up-done">
      <p><b>Every profile is complete.</b> QueryHawk can show reply dates, what to send and who fits your book for every agent on your list.</p>
    </div>
  );

  const detailCards = POINTS_ORDER.map((g) => {
    const base = agents.filter((a) => appliesTo(g, a)).length;
    if (base === 0) return null;
    const missing = agents.filter((a) => (model.gapsById.get(a.id) ?? []).includes(g)).length;
    const rows = items.filter((i) => i.gap === g);
    const complete = missing === 0;
    return (
      <div key={g} className={`hk8-dc${complete ? " complete" : ""}`} data-hk8="detail" data-gap={g} data-have={base - missing} data-base={base}>
        <div className="hk8-dband">
          <span className="hk8-dchip">{DETAIL_NAME[g]}</span>
          <span className="hk8-each">+{POINTS[g]} each</span>
          <span className="hk8-have">{base - missing} of {base} <em>have it</em></span>
        </div>
        <div className="hk8-dbody">
          <p className="hk8-unlock">{UNLOCK[g]}</p>
          {complete ? <p className="hk8-every">Every agent has this.</p> : rows.map((it) => (
            <button key={it.key} type="button" className="hk8-lr" data-hk8="ledger-row" data-key={it.key} onClick={() => wholeQueue(it.key)}>
              <Dot a={it.agent} size={28} />
              <span className="hk8-lrn"><b>{nameOf(it.agent)}</b><i>{(it.agent.agency ?? "").trim()}{it.live ? <em> · you’ve queried them</em> : null}</i></span>
              <span className="hk8-addit">Add it <i>→</i></span>
            </button>
          ))}
        </div>
        {rows.length > 1 ? (
          <div className="hk8-dfoot">
            <span>{rows.length} agents · about {minutesFor(rows.length)} min</span>
            <button type="button" className="hk8-go sm" data-hk8="fill-detail" onClick={() => startFocus(rows.map((r) => r.key), DETAIL_NAME[g])}>
              Fill in all {rows.length} → <Plus n={POINTS[g] * rows.length} probe="fill-sum" />
            </button>
          </div>
        ) : null}
      </div>
    );
  });

  const agentRows = (() => {
    const rows = model.byAgent.map((r) => ({ r, sum: r.items.reduce((s, i) => s + POINTS[i.gap], 0), queried: r.items.some((i) => i.live) }));
    const order = (x: typeof rows[number], y: typeof rows[number]) => y.sum - x.sum || nameOf(x.r.agent).localeCompare(nameOf(y.r.agent));
    const group = (title: string, list: typeof rows, k: string) => (list.length ? (
      <div className="hk8-ag" data-hk8="agent-group" data-k={k} key={k}>
        <h6>{title}</h6>
        {list.sort(order).map(({ r, sum }) => {
          const ap = agentPct(r.agent, model.gapsById.get(r.agent.id) ?? []);
          const C = 2 * Math.PI * 17;
          return (
            <div key={r.agent.id} className="hk8-ar" data-hk8="agent-row" data-agent={r.agent.id}>
              <span className="hk8-mr" aria-label={`${ap}% filled in`}>
                <svg viewBox="0 0 44 44" aria-hidden="true">
                  <circle cx="22" cy="22" r="17" fill="none" stroke="#a2452a" strokeOpacity="0.85" strokeWidth="4" />
                  {ap > 0 ? <circle cx="22" cy="22" r="17" fill="none" stroke="#2a3a52" strokeWidth="4" strokeDasharray={`${(C * ap) / 100} ${C}`} transform="rotate(-90 22 22)" /> : null}
                </svg>
                <span>{ap}</span>
              </span>
              <span className="hk8-lrn"><b>{nameOf(r.agent)}</b><i>{(r.agent.agency ?? "").trim()}{r.items.some((i) => i.live) ? <em> · you’ve queried them</em> : null}</i>
                <span className="hk8-gchips">
                  {r.items.map((it) => (
                    <button key={it.key} type="button" className="hk8-gch" data-hk8="gap-chip" data-key={it.key} onClick={() => wholeQueue(it.key)}>{GAP_LABEL[it.gap]} <b>+{POINTS[it.gap]}</b></button>
                  ))}
                </span>
              </span>
              <button type="button" className="hk8-go sm" data-hk8="fill-agent" onClick={() => startFocus(r.items.map((i) => i.key), `${firstNameOf(r.agent)}’s profile`)}>
                Fill in → <Plus n={sum} probe="fill-sum" />
              </button>
            </div>
          );
        })}
      </div>
    ) : null);
    return <>{group("You’ve queried these agents. Their gaps matter most.", rows.filter((x) => x.queried), "queried")}{group("Everyone else", rows.filter((x) => !x.queried), "rest")}</>;
  })();

  const ci = p.checkin;
  const home = (
    <div className="hk8-home" data-hk8="home">
      {upNext}
      {ci.show ? (
        <div className="hk8-ci" data-hkv="checkin">
          <b>Time for a wishlist check-in</b>
          <p>Agents update what they’re looking for a few times a year. {ci.due.length} of the agents you might query haven’t been looked at in over {p.every} months.</p>
          <span>
            <button type="button" className="hk8-go sm" data-hkv="checkin-go" onClick={() => setSes({ mode: "wl", list: ci.due, i: 0, done: 0 })}>Check {ci.due.length} wishlist{ci.due.length === 1 ? "" : "s"}</button>
            <button type="button" className="hk8-ln" data-hkv="checkin-next" onClick={() => void p.onCheckinNext()}>Next time</button>
          </span>
        </div>
      ) : null}
      {model.hidden.length ? (
        <p className="hk8-later" data-hkv="foot">{model.hidden.length} put off until {model.laterUntil ? longDayLabel(model.laterUntil).replace(/ \d{4}$/, "") : "later"}.{" "}
          <button type="button" className="hk8-lnk" data-hkv="show-all" onClick={() => void p.onShowAll()}>Show them now</button></p>
      ) : null}
      {items.length ? (
        <>
          <div className="hk8-allh">
            <b>All gaps</b>
            <span className="hk8-seg" role="radiogroup" aria-label="Show">
              <button type="button" role="radio" aria-checked={p.view === "detail"} data-hkv="view" data-v="detail" onClick={() => p.onView("detail")}>By missing detail</button>
              <button type="button" role="radio" aria-checked={p.view === "agent"} data-hkv="view" data-v="agent" onClick={() => p.onView("agent")}>By agent</button>
            </span>
          </div>
          <div className="hk8-all" data-hk8="all" data-view={p.view}>{p.view === "detail" ? detailCards : agentRows}</div>
        </>
      ) : null}
    </div>
  );

  /* ── focus ── */
  const coming = pending.slice(1, 6).map((k) => byKey.get(k)).filter((x): x is HkItem => !!x);
  const counter = run ? `${run.total - pending.length + 1} of ${run.total}` : "";
  const focus = cur && run ? (
    <div className="hk8-focus" data-hk8="focus">
      <div className="hk8-ftop">
        <button type="button" className="hk8-back" data-hk8="back" onClick={() => { setRun(null); setMode("home"); }}>← All gaps</button>
        <span className="hk8-fk">Up next{run.name ? <em data-hk8="run-name"> · {run.name}</em> : null}</span>
        <i className="hk8-fc" data-hk8="counter">{counter}</i>
      </div>
      {banner ? <div className="hk8-banner" data-hk8="banner" role="status">{banner}</div> : null}
      <div key={cur.key} className={`hk8-card${leaving ? " is-leaving" : ""}`} data-hk8="card" data-key={cur.key} data-gap={cur.gap}>
        <div className="hk8-cwho">
          <Dot a={cur.agent} size={40} />
          <span className="hk8-lrn"><b>{nameOf(cur.agent)}</b><i>{(cur.agent.agency ?? "").trim()}</i>{cur.live ? <em className="hk8-q">You’ve queried them</em> : null}</span>
          <Plus n={POINTS[cur.gap]} />
        </div>
        <h4 className="hk8-qh" data-hk8="question">{QUESTION[cur.gap](firstNameOf(cur.agent))}</h4>
        <p className="hk8-why"><RunsText runs={gapCopy(cur, book).why} /></p>
        <FocusField key={cur.key} item={cur} book={book} today={today} agents={agents} onAnswer={setAnswer} />
        <button type="button" className={`hk8-where${whereOpen ? " open" : ""}`} data-hk8="where" aria-expanded={whereOpen} onClick={() => setWhereOpen((v) => !v)}>
          {whereOpen ? "− Where to find it" : "+ Where to find it"}
          {whereOpen ? <span className="hk8-wtx">{gapCopy(cur, book).where}</span> : null}
        </button>
        <div className="hk8-cacts">
          <button type="button" className="hk8-ln" data-hk8="skip" onClick={skip}>Skip for now</button>
          <button type="button" className="hk8-save" data-hk8="save" ref={saveRef} disabled={!answer || busy} onClick={() => void save()}>
            Save <Plus n={POINTS[cur.gap]} probe="save-pts" />
          </button>
        </div>
      </div>
      {coming.length ? (
        <div className="hk8-list" data-hk8="coming">
          <h6>Coming up</h6>
          {coming.map((it) => (
            <button key={it.key} type="button" className="hk8-li" data-key={it.key} onClick={() => setRun({ ...run, keys: [it.key, ...run.keys.filter((k) => k !== it.key)] })}>
              <Dot a={it.agent} size={20} /><span className="hk8-lt">{DETAIL_NAME[it.gap]} <i>for</i> {nameOf(it.agent)}</span><Plus n={POINTS[it.gap]} />
            </button>
          ))}
        </div>
      ) : null}
      {done.length ? (
        <div className="hk8-list" data-hk8="done-list">
          <h6>Done this session</h6>
          {done.slice(-4).reverse().map((d) => <span key={d.key} className="hk8-li done"><b className="hk8-tick">✓</b><span className="hk8-lt">{d.label}</span><Plus n={d.n} /></span>)}
        </div>
      ) : null}
    </div>
  ) : null;

  const complete = (
    <div className="hk8-complete" data-hk8="complete">
      <img src={`${HK_HAWK.src}?v=${HK_HAWK.version}`} alt="" aria-hidden="true" />
      <h4>Every profile is complete</h4>
      <p>QueryHawk can now show reply dates, what to send and who fits your book for every agent on your list.</p>
      <button type="button" className="hk8-go" data-hk8="back-to-list" onClick={p.onClose}>Back to the list</button>
    </div>
  );

  const body = mode === "intro" ? intro : mode === "focus" ? (items.length === 0 ? complete : focus ?? home) : home;

  const footNode = (
    <div className="hk8-foot" data-hkv="foot">
      {foot ? (
        <>
          <span data-hkv="foot-text">{foot.text}</span>
          {foot.undo ? (
            <button type="button" className="hk8-lnk" data-hkv="undo" onClick={async () => {
              const u = foot.undo!; setFoot(null);
              const ok = await u();
              if (!ok) sayFoot("Couldn’t undo that.");
            }}>Undo</button>
          ) : null}
        </>
      ) : (
        <>
          <i>{HK_FOOT_V18}</i>
          {mode !== "home" ? <button type="button" className="hk8-lnk" data-hk8="foot-all" onClick={() => { setRun(null); setMode("home"); }}>All gaps</button> : null}
        </>
      )}
    </div>
  );

  const tabLine = `${gapsLeft} ${gapsLeft === 1 ? "gap" : "gaps"} · ${health.pct ?? 0}% list health`;
  return (
    <>
      {p.tabShown ? (
        <FloatingTab probe="housekeeping" hidden={open} routeActive={p.routeActive} onOpen={p.onOpen}
          dismiss={{ label: "Hide the Housekeeping tab", onDismiss: p.onDismissTab }}
          label={`Housekeeping: ${tabLine}. Press H to open.`}>
          <span className="hkv-hh" aria-hidden="true"><img src={`${HK_HAWK.src}?v=${HK_HAWK.version}`} alt="" /></span>
          <span className="hkv-tt">
            <b>Housekeeping{p.keyHint && <kbd className="hkv-kbd" data-hkv="key">{p.keyHint}</kbd>}</b>
            <small data-hkv="tab-counts">{tabLine}</small>
          </span>
          <TabRing share={(health.pct ?? 0) / 100} tone="gaps" />
        </FloatingTab>
      ) : null}
      {p.tabNote && p.routeActive ? <TabNote onUndo={p.tabNote.onUndo} /> : null}
      <HalfDrawer probe="housekeeping" open={open} onClose={p.onClose} label="Housekeeping" width="var(--hk8-w)"
        head={head} foot={footNode}
        over={ses ? (
          <SessionModal ses={ses} onClose={() => setSes(null)} model={model} book={book} today={today} agents={agents} h={p}
            nextOn={p.checkin.nextOn}
            saveFix={async (item, fix) => { const r = await p.onFix(item, fix); if ("error" in r) return false; sayFoot(r.line, r.undo); return true; }}
            later={p.onLater}
            onNext={(filled) => setSes((s) => {
              if (!s) return s;
              const n = { ...s, i: s.i + 1, done: s.done + (filled ? 1 : 0) } as Session;
              if (s.mode === "wl" && n.i >= n.list.length) void p.onCheckinNext();
              return n;
            })} />
        ) : null}>
        <div className="hk8-db" data-hkv="body-wrap" data-hk8-mode={mode}>{body}</div>
      </HalfDrawer>
      <Pops pops={pops} />
    </>
  );
};

/** closed agents count toward the reopening detail; exported for the locks */
export const closedCount = (agents: readonly Agent[]) => agents.filter((a) => isDoorClosed(a)).length;
