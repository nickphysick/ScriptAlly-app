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
  GAP_DETAIL, GAP_LABEL, firstNameOf, gapCopy, genreChips, longDayLabel, reopenChips, wishlistCheckin,
  type GapKey, type HkBook, type HkItem, type HkModel, type Run,
} from "../../../lib/contactHousekeeping";
import type { WishlistEvery } from "../../../lib/contactPrefs";
import { POINTS, POINTS_LINE, POINTS_ORDER, agentPct, appliesTo, minutesFor, taskOrder, type Health } from "../../../lib/listHealth";
import { bookGenreHit } from "../../../lib/genreMatch";
import { encodeMats, matsOf, matsRows, type CardMats } from "../../../lib/cardDraft";
import { materialRowsFromAgent, summaryFromRows, validateMaterials } from "../../../lib/agentMaterials";
import { agentInitials } from "../../../lib/agentDisplay";
import { isDoorClosed } from "../../../lib/agentList";
import { panelLinks } from "../../../lib/agentPanel";
import { dayKey } from "../../../lib/contactPrefs";
import { MaterialsField, Stepper } from "../card/cardInputs";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { FloatingTab, TabRing } from "../../shell/FloatingTab";
import { AgentPaperCard, type PaperCardData } from "../../shared/AgentPaperCard";
import { HK_HAWK, SessionModal, TabNote, type FixResult, type HkFix, type HkHandlers, type Session } from "./ContactHousekeeping";
import "./housekeeping.css";
import "./housekeepingV18.css";
import "./housekeepingV182.css";
import "./housekeepingV183.css";

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
  /** v18.1 §B.4 — the agent panel's "Fill in": open in focus on a run of this agent's tasks only. `seq` makes a
      second ask for the same agent a new ask. */
  runAgent?: { id: string; seq: number } | null;
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
const DETAIL_NAME = GAP_DETAIL;
/** v18.2 §D.5 — "Saved {first}'s {detail}." */
const SAVED_WORD: Record<GapKey, string> = { reply: "reply time", materials: "materials", genres: "genres", wishlist: "wishlist", reopen: "reopening date" };
export const HK_FOOT_V18 = "We only ask for details that make QueryHawk more useful to you.";
const nameOf = (a: Agent) => (a.name ?? "").trim() || (a.agency ?? "").trim();
/** the agent's stored website as a link (the panel's own reading of the field), or null */
const webOf = (a: Agent): string | null => { const l = panelLinks(a).find((x) => x.key === "website"); return l && "href" in l ? l.href : null; };

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

/* ── v18.2 §D.4 · ONE "+n" FLIES FROM SAVE TO THE RING, in the top layer (a fixed element in a portal at the end of the
   body, so the drawer's own overflow never clips it): up 60 at the midpoint, scaling 1 → 1.25 → .6, fading at the end,
   900ms. The ring bumps as it lands. Under reduced motion nothing flies; the ring still updates. ── */

type Flight = { id: number; n: number; x0: number; y0: number; x1: number; y1: number };
const FLY_MS = 900;
const Fly: React.FC<{ f: Flight; onLand: (id: number) => void }> = ({ f, onLand }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") { onLand(f.id); return undefined; }
    const at = (x: number, y: number, s: number) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
    const mx = (f.x0 + f.x1) / 2, my = (f.y0 + f.y1) / 2 - 60;
    const a = el.animate([
      { transform: at(f.x0, f.y0, 1), opacity: 1, offset: 0 },
      { transform: at(mx, my, 1.25), opacity: 1, offset: 0.5 },
      { transform: at(f.x1, f.y1, 0.85), opacity: 1, offset: 0.85 },
      { transform: at(f.x1, f.y1, 0.6), opacity: 0, offset: 1 },
    ], { duration: FLY_MS, easing: "cubic-bezier(.4, .1, .3, 1)", fill: "forwards" });
    a.finished.then(() => onLand(f.id), () => onLand(f.id));
    return () => a.cancel();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="hk82-fly" data-hk8="fly" data-x1={f.x1} data-y1={f.y1}>+{f.n}</span>;
};
const Flights: React.FC<{ list: Flight[]; onLand: (id: number) => void }> = ({ list, onLand }) => (typeof document === "undefined" ? null : createPortal(
  <>{list.map((f) => <Fly key={f.id} f={f} onLand={onLand} />)}</>,
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
  const [pick, setPick] = useState(false);
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
    case "materials": {
      /* v18.1 §A — the app's own MaterialsField, dressed for the focus card by `.hk81-mats` (housekeepingV18.css);
         its state, steppers, names and save path are the agent card's. "On the card:" is the card's own summary of
         what would be stored; a refusal is the card's own validator's. */
      const refusal = validateMaterials(matsRows(mats))?.msg ?? null;
      const onCard = summaryFromRows(materialRowsFromAgent(encodeMats(mats)));
      const set = (m: CardMats) => { setMats(m); onAnswer(matsOk(m) && !validateMaterials(matsRows(m)) ? { kind: "mats", mats: m } : null); };
      return (
        <div className="hk8-field hk81-matsf" data-hk8="field" data-gap="materials"
          onFocusCapture={(e) => { if ((e.target as HTMLElement).dataset?.ae === "other" && !mats.oth.on) set({ ...mats, oth: { ...mats.oth, on: true } }); }}>
          <div className="hk81-mats" data-hk81="mats"><MaterialsField mats={mats} onMats={set} /></div>
          {onCard ? <p className="hk81-oncard" data-hk81="oncard">On the card: <b>{onCard}</b></p> : null}
          {refusal ? <p className="hk81-refuse" data-hk81="refusal" role="alert">{refusal}</p> : null}
        </div>
      );
    }
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
    case "reopen": {
      /* v18.2 §D.8 — after the chips, "Pick a date…": a chip of the same size with a dashed edge that becomes a native
         date input (today at the earliest). A picked date deselects the chips and saves through the same path. */
      const chipsNow = reopenChips(today);
      const picked = on !== null && !chipsNow.some((c) => c.value === on);
      return (
        <div className="hk8-field hk8-chips" data-hk8="field" data-gap="reopen">
          {chipsNow.map((c) => (
            <button key={c.label} type="button" className={`hk8-chip${on === c.value ? " on" : ""}`} aria-pressed={on === c.value} data-hk8="remind-chip"
              onClick={() => { setOn(c.value); setPick(false); onAnswer({ kind: "remind", on: c.value }); }}>{on === c.value ? "✓ " : ""}{c.label}</button>
          ))}
          {pick || picked ? (
            <input type="date" className="hk82-date" data-hk8="pick-date" aria-label={QUESTION.reopen(firstNameOf(a))} autoFocus
              min={dayKey(today)} value={picked ? on ?? "" : ""}
              onChange={(e) => { const v = e.target.value; if (v && v >= dayKey(today)) { setOn(v); onAnswer({ kind: "remind", on: v }); } else { setOn(null); onAnswer(null); } }} />
          ) : (
            <button type="button" className="hk8-chip hk82-pick" data-hk8="pick" onClick={() => setPick(true)}>Pick a date…</button>
          )}
        </div>
      );
    }
    default: {
      const unhandled: never = item.gap;
      return unhandled;
    }
  }
};

/* ── the drawer ─────────────────────────────────────────────────────────────────────────────────── */

type Mode = "intro" | "home" | "focus";
/* v18.2 §D.2 — a run counts itself: `done` is saves in this run (Skip does not add one, Undo takes one back) */
type Run8 = { keys: string[]; name: string | null; total: number; done: number };

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
  /* v18.2 §D.9 — this opening's tally: points and gaps filled since the drawer opened */
  const [tally, setTally] = useState<{ pts: number; n: number }>({ pts: 0, n: 0 });
  /* v18.2 §C — "3 ways to fill the gaps", shown once, straight after the intro's "Get started" */
  const [ways, setWays] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bump, setBump] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [foot, setFoot] = useState<{ text: string; undo?: () => Promise<boolean>; saved?: boolean } | null>(null);
  const [how, setHow] = useState(false);
  const [ses, setSes] = useState<Session | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const saveRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const ptsRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  /* v18.2 §C — the points key closes on a click outside it (the link and the points tile are its own), and on Escape
     WITHOUT closing the drawer: its layer is above the drawer's */
  useEffect(() => {
    if (!how) return undefined;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || ptsRef.current?.contains(t)) return;
      setHow(false);
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [how]);
  useEscapeLayer(open && how, () => setHow(false), ESC_LEVEL.pageModal);
  /* scroll a part of home into view once it has rendered (after a mode change) */
  const scrollTo = (sel: string, then?: (el: HTMLElement) => void) => {
    let tries = 0;
    const go = () => {
      const el = bodyRef.current?.querySelector<HTMLElement>(sel);
      if (!el) { if (tries++ < 10) requestAnimationFrame(go); return; }
      el.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
      then?.(el);
    };
    requestAnimationFrame(go);
  };

  /* on open: the intro once, with a gap; home every other time. The pips are the gaps at the time of opening. */
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      setMode(!p.introSeen && items.length > 0 ? "intro" : "home");
      setRun(null); setDone([]); setTally({ pts: 0, n: 0 }); setWays(false); setFoot(null); setBanner(null);
    }
    if (!open && wasOpen.current) { setSes(null); setHow(false); setTally({ pts: 0, n: 0 }); setWays(false); }
    wasOpen.current = open;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* v18.2 §D.3 — the drawer reads the one List health figure as it is, with no count-up, so it changes in the same
     frame as the page ring and the tab (on save and on Undo, never on close) */
  const held = health.held;
  const pct = health.pct ?? 0;

  /* the queue: the run's keys still open, in order; the current task is its first */
  const pending = run ? run.keys.filter((k) => byKey.has(k)) : [];
  const cur = pending.length ? byKey.get(pending[0]) ?? null : null;
  useEffect(() => { setAnswer(null); setWhereOpen(false); }, [cur?.key]);
  /* a run that has run out: home, or the complete screen when nothing is left at all */
  useEffect(() => { if (mode === "focus" && run && pending.length === 0 && items.length > 0) { setRun(null); setMode("home"); } }, [mode, run, pending.length, items.length]);

  const startFocus = (keys: string[], name: string | null, first?: string) => {
    const ordered = first ? [first, ...keys.filter((k) => k !== first)] : keys;
    setRun({ keys: ordered, name, total: ordered.length, done: 0 });
    setMode("focus");
  };
  /* v18.1 §B.4 — a run over one agent, asked for from the agent panel; after the open effect, so it wins over home */
  useEffect(() => {
    const ask = p.runAgent;
    if (!open || !ask) return;
    const row = model.byAgent.find((r) => r.agent.id === ask.id);
    if (!row || row.items.length === 0) return;
    startFocus(row.items.map((i) => i.key), `${firstNameOf(row.agent)}’s profile`);
  }, [open, p.runAgent?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const wholeQueue = (first?: string) => startFocus(items.map((i) => i.key), null, first);
  /* v18.2 §C — the gaps tile: All gaps into view (home first, from focus); §D.11 the minutes tile: Up next into view,
     with one rust ring flash (none under reduced motion) */
  const goHome = () => { setRun(null); setMode("home"); setWays(false); setHow(false); };
  const toAllGaps = () => { goHome(); scrollTo('[data-hk8="all-head"]'); };
  const toUpNext = () => {
    goHome();
    scrollTo('[data-hk8="up-next"], [data-hk8="up-done"]', (el) => {
      if (reduced() || typeof el.animate !== "function") return;
      el.setAttribute("data-flash", "");
      /* the ring is ADDED to the card's own shadow (read off the element), never painted over it */
      const base = getComputedStyle(el).boxShadow;
      const own = base && base !== "none" ? `${base}, ` : "";
      el.animate([{ boxShadow: `${own}0 0 0 0 rgba(162, 69, 42, 0.55)` }, { boxShadow: `${own}0 0 0 14px rgba(162, 69, 42, 0)` }], { duration: 1100, easing: "ease-out" })
        .finished.then(() => el.removeAttribute("data-flash"), () => el.removeAttribute("data-flash"));
    });
  };
  const skip = () => { if (!run || !cur) return; setRun({ ...run, keys: [...run.keys.filter((k) => k !== cur.key), cur.key] }); };

  const sayFoot = (text: string, undo?: () => Promise<boolean>, saved = false) => {
    setFoot({ text, undo, saved });
    later(() => setFoot((f) => (f && f.text === text ? null : f)), 7000);
  };

  const fly = (n: number): number | null => {
    const from = saveRef.current?.getBoundingClientRect(), to = ringRef.current?.getBoundingClientRect();
    if (reduced() || !from || !to) { setBump((b) => b + 1); return null; }
    const id = Date.now() + Math.random();
    setFlights((fs) => [...fs, { id, n, x0: from.left + from.width / 2, y0: from.top + from.height / 2, x1: to.left + to.width / 2, y1: to.top + to.height / 2 }]);
    return id;
  };
  const landed = (id: number) => { setFlights((fs) => fs.filter((f) => f.id !== id)); setBump((b) => b + 1); };

  const save = async () => {
    if (!cur || !answer || busy) return;
    const item = cur, n = POINTS[item.gap];
    setBusy(true);
    /* the "+n" leaves on the press, not when the write returns (a Firestore round trip can take longer than the
       flight); a refused save takes it back */
    const flight = fly(n);
    const r: FixResult = await p.onFix(item, answer);
    setBusy(false);
    if ("error" in r) { if (flight != null) setFlights((fs) => fs.filter((f) => f.id !== flight)); sayFoot(`Couldn’t save that: ${r.error}`); return; }
    setRun((x) => (x ? { ...x, done: x.done + 1 } : x));
    setTally((t) => ({ pts: t.pts + n, n: t.n + 1 }));
    /* v18.2 §D.5 — Undo in the footer for 7s: restores everything the save wrote (the page's own Undo, reply-time
       deadlines and reminders included), puts the task back at the front of the run, and steps back the counter and
       the tally. The figures follow the data. */
    const undo = r.undo ? async () => {
      const ok = await r.undo!();
      if (ok) {
        setRun((x) => (x ? { ...x, done: Math.max(0, x.done - 1), keys: [item.key, ...x.keys.filter((k) => k !== item.key)] } : x));
        setTally((t) => ({ pts: Math.max(0, t.pts - n), n: Math.max(0, t.n - 1) }));
      }
      return ok;
    } : undefined;
    sayFoot(`Saved ${firstNameOf(item.agent)}’s ${SAVED_WORD[item.gap]}.`, undo, true);
    setDone((d) => [...d, { key: item.key, label: `${DETAIL_NAME[item.gap]} for ${firstNameOf(item.agent)}`, n }]);
    const others = (model.gapsById.get(item.agent.id) ?? []).filter((g) => g !== item.gap);
    if (others.length === 0) { const t = `✓ ${firstNameOf(item.agent)}’s profile is complete`; setBanner(t); later(() => setBanner((b) => (b === t ? null : b)), 2200); }
    if (!reduced()) { setLeaving(true); later(() => setLeaving(false), 320); }
  };

  /* ── the header (v18.2 §C, layout B): on ink, the ring spanning its rows on the left; a title row (the score,
     "List health", "How points work", ✕); three tiles that are buttons (points → the key, gaps → All gaps, minutes →
     Up next); a 6px bar; and, after the first save, the session's tally. While the intro shows it steps down to its
     first row. The points line, the pips and the "done today" chip are retired. ── */
  const gapsLeft = items.length;
  const introing = mode === "intro";
  const head = (
    <div className="hk8-head hk82" data-hk8="head" data-introing={introing ? "" : undefined}>
      <HeadRing pct={pct} bump={bump} ringRef={ringRef} />
      <div className="hk82-tr" data-hk8="title-row">
        <b className="hk8-n" data-hk8="pct">{health.pct === null ? "" : <>{pct}<i>%</i></>}</b>
        <span className="hk82-lh" data-hk8="label">List health</span>
      </div>
      {/* v18.3 §A — "How points work" is gone: the points tile is the only way to the key */}
      <button type="button" className="hk8-x" data-hk8="close" aria-label="Close Housekeeping" onClick={p.onClose}>✕</button>
      {!introing ? (
        <>
          <div className="hk82-tiles" data-hk8="tiles">
            {/* v18.3 §A — the key opens UNDER the points tile: the tile and its key share a positioned wrapper */}
            <span className="hk83-ptw" data-hk8="points-wrap">
              <button type="button" className="hk82-tile" data-hk8="tile" data-k="points" ref={ptsRef} aria-expanded={how} aria-haspopup="dialog" onClick={() => setHow((v) => !v)}>
                <b>{held}</b><small>of {health.possible} pts</small>
              </button>
              {how ? (
                <div className="hk8-howpop hk83-key" data-hk8="how-pop" ref={popRef} role="dialog" aria-label="How points work">
                  <table><tbody>
                    {POINTS_ORDER.map((g) => <tr key={g}><td>{DETAIL_NAME[g]}{g === "reopen" ? " (closed agents)" : ""}</td><td>{POINTS[g]}</td></tr>)}
                  </tbody></table>
                  <p>{POINTS_LINE}</p>
                </div>
              ) : null}
            </span>
            <button type="button" className="hk82-tile" data-hk8="tile" data-k="gaps" onClick={toAllGaps}>
              <b>{gapsLeft}</b><small>{gapsLeft === 1 ? "gap" : "gaps"}</small>
            </button>
            <button type="button" className="hk82-tile" data-hk8="tile" data-k="minutes" onClick={toUpNext}>
              <b>~{minutesFor(gapsLeft)}</b><small>min to fill</small>
            </button>
          </div>
          <span className="hk82-bar" data-hk8="bar" aria-hidden="true"><i style={{ width: `${health.possible > 0 ? Math.max(0, Math.min(100, (100 * held) / health.possible)) : 0}%` }} /></span>
          {tally.n > 0 ? (
            <p className="hk82-tally" data-hk8="tally"><b>+{tally.pts}</b> this session · {tally.n} filled</p>
          ) : null}
        </>
      ) : null}
    </div>
  );

  /* ── intro (v18.2 §C): two set lines, left-aligned with the columns; the actions row is pinned to the drawer's foot,
     so "Get started →" is in view without scrolling. It leads to the three ways, shown once. ── */
  const intro = (
    <div className="hk8-intro hk82-intro" data-hk8="intro">
      <h3 className="hk8-ih hk82-ih" data-hk8="intro-head">
        <span className="hk82-ihl" data-hk8="intro-line">When it comes to smart querying,</span>
        <span className="hk82-ihl" data-hk8="intro-line">data is <em>everything.</em></span>
      </h3>
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
      <div className="hk8-iacts hk82-iacts" data-hk8="intro-acts">
        <button type="button" className="hk8-ln" data-hk8="not-now" onClick={() => { p.onIntroSeen(); p.onClose(); }}>Not now</button>
        <button type="button" className="hk8-go" data-hk8="intro-start" onClick={() => { p.onIntroSeen(); setMode("home"); setWays(true); }}>Get started →</button>
      </div>
    </div>
  );

  /* ── "3 ways to fill the gaps" (v18.2 §C): the home area to itself until a choice is made ── */
  const WAY_ICON: Record<"run" | "detail" | "agent", React.ReactNode> = {
    run: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 4.5l11 6.5-11 6.5z" /></svg>,
    detail: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 6h14M4 11h14M4 16h9" /></svg>,
    agent: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="8" r="3.5" /><path d="M4.5 18c1-3.4 3.6-5 6.5-5s5.5 1.6 6.5 5" /></svg>,
  };
  const chooseView = (v: "detail" | "agent") => { setWays(false); p.onView(v); scrollTo('[data-hk8="all-head"]'); };
  const waysCard = (
    <div className="hk82-ways" data-hk8="ways" role="group" aria-labelledby="hk82-ways-h">
      <div className="hk82-wh">
        <b id="hk82-ways-h">3 ways to fill the gaps</b>
        <small>Choose one. You can switch at any time.</small>
      </div>
      {([
        { k: "run" as const, name: "One at a time", line: "We’ll ask the question worth the most points first, then the next.", act: "Start →", run: () => { setWays(false); wholeQueue(); } },
        { k: "detail" as const, name: "By missing detail", line: "Every reply time, then every wishlist, and so on.", act: "See them ↓", run: () => chooseView("detail") },
        { k: "agent" as const, name: "By agent", line: "Finish one agent’s profile before moving on.", act: "See them ↓", run: () => chooseView("agent") },
      ]).map((w) => (
        <button key={w.k} type="button" className="hk82-w" data-hk8="way" data-w={w.k} onClick={w.run}>
          <span className="hk82-wi">{WAY_ICON[w.k]}</span>
          <span className="hk82-wt"><b>{w.name}</b><small>{w.line}</small></span>
          <i className="hk82-wa">{w.act}</i>
        </button>
      ))}
      <button type="button" className="hk82-wx" data-hk8="ways-all" onClick={() => setWays(false)}>Just show me everything</button>
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
    /* v18.3 §A.5 — a detail every agent already has is not shown; it returns the moment a gap of that kind exists */
    if (complete) return null;
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
    /* v18.2 §D.1 — the model's own order (each agent at its first task under listHealth.taskOrder); never re-sorted */
    const order = (x: typeof rows[number], y: typeof rows[number]) => taskOrder(x.r.items[0], y.r.items[0]);
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
  const home = ways && items.length > 0 ? (
    <div className="hk8-home hk82-choosing" data-hk8="home">{waysCard}</div>
  ) : (
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
          <div className="hk8-allh" data-hk8="all-head">
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
  const counter = run ? `${Math.min(run.done + 1, run.total)} of ${run.total}` : "";
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
        {/* v18.2 §D.7 — the agent's stored website, where the answer usually is; absent when none is stored */}
        {webOf(cur.agent) ? (
          <a className="hk82-web" data-hk8="website" href={webOf(cur.agent)!} target="_blank" rel="noopener noreferrer">Open {firstNameOf(cur.agent)}’s website ↗</a>
        ) : null}
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
    <div className={`hk8-foot${foot?.saved ? " hk82-foot--undo" : ""}`} data-hkv="foot" data-saved={foot?.saved ? "" : undefined}>
      {foot ? (
        <>
          <span data-hkv="foot-text">{foot.text}</span>
          {foot.undo ? (
            <button type="button" className="hk8-lnk hk82-undo" data-hkv="undo" onClick={async () => {
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
            {/* v18.2 §C — no keycap: the H key still opens it */}
            <b>Housekeeping</b>
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
        <div className="hk8-db" data-hkv="body-wrap" data-hk8-mode={mode} ref={bodyRef}>{body}</div>
      </HalfDrawer>
      <Flights list={flights} onLand={landed} />
    </>
  );
};

/** closed agents count toward the reopening detail; exported for the locks */
export const closedCount = (agents: readonly Agent[]) => agents.filter((a) => isDoorClosed(a)).length;
